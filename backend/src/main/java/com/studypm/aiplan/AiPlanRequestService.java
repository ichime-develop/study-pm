package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.studypm.account.AccountRepository;
import com.studypm.common.error.BusinessConflictException;
import com.studypm.common.error.InvalidRequestException;
import com.studypm.common.error.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI計画の入力保存、入力元更新、生成前の決定的矛盾検証を担当する。
 */
@Service
public class AiPlanRequestService {

    private static final int MAX_OPENAI_TEXT_LENGTH = 30000;
    private static final List<AiGenerationJobStatus> ACTIVE_JOB_STATUSES = List.of(
            AiGenerationJobStatus.QUEUED,
            AiGenerationJobStatus.PROCESSING,
            AiGenerationJobStatus.CANCEL_REQUESTED
    );
    private final AiPlanGenerationRequestRepository requestRepository;
    private final AiPlanSourceRepository sourceRepository;
    private final AiGenerationJobRepository jobRepository;
    private final AccountRepository accountRepository;
    private final Clock clock;
    private final int retentionDays;

    public AiPlanRequestService(
            AiPlanGenerationRequestRepository requestRepository,
            AiPlanSourceRepository sourceRepository,
            AiGenerationJobRepository jobRepository,
            AccountRepository accountRepository,
            Clock clock,
            @Value("${app.ai.retention-days:30}") int retentionDays
    ) {
        this.requestRepository = requestRepository;
        this.sourceRepository = sourceRepository;
        this.jobRepository = jobRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
        this.retentionDays = retentionDays;
    }

    @Transactional
    public AiPlanRequestResponse create(UUID accountId, AiPlanRequestCommand command) {
        validate(command);
        Instant now = clock.instant();
        AiPlanGenerationRequest request = requestRepository.save(AiPlanGenerationRequest.create(
                accountRepository.getReferenceById(accountId), command, now.plus(retentionDays, ChronoUnit.DAYS), now
        ));
        saveSources(request, command.sources(), now);
        return responseFor(request);
    }

    @Transactional
    public AiPlanRequestResponse update(UUID accountId, UUID requestId, AiPlanRequestCommand command) {
        validate(command);
        AiPlanGenerationRequest request = findOwned(accountId, requestId);
        if (jobRepository.existsByGenerationRequest_IdAndStatusIn(request.id(), ACTIVE_JOB_STATUSES)) {
            throw new BusinessConflictException(
                    "AI_JOB_ALREADY_ACTIVE", "生成中の下書きがあるため、入力を変更できません。"
            );
        }
        Instant now = clock.instant();
        request.update(command, now.plus(retentionDays, ChronoUnit.DAYS), now);
        sourceRepository.deleteAllByGenerationRequest_Id(request.id());
        // HibernateはINSERTをDELETEより先に実行するため、同じtemporaryKeyを再登録する前に削除をDBへ反映する。
        sourceRepository.flush();
        saveSources(request, command.sources(), now);
        return responseFor(request);
    }

    @Transactional(readOnly = true)
    public AiPlanRequestResponse get(UUID accountId, UUID requestId) {
        return responseFor(findOwned(accountId, requestId));
    }

    private void saveSources(AiPlanGenerationRequest request, List<AiPlanSourceCommand> sources, Instant now) {
        sourceRepository.saveAll(sources.stream().map(source -> AiPlanSource.create(request, source, now)).toList());
    }

    private AiPlanGenerationRequest findOwned(UUID accountId, UUID requestId) {
        return requestRepository.findByIdAndAccount_Id(requestId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("AI_PLAN_NOT_FOUND", "対象のAI計画は見つかりません。"));
    }

    private AiPlanRequestResponse responseFor(AiPlanGenerationRequest request) {
        List<AiPlanSourceResponse> sources = sourceRepository.findAllByGenerationRequest_IdOrderBySourceOrderAsc(request.id()).stream()
                .map(source -> new AiPlanSourceResponse(
                        source.temporaryKey(), source.sourceType(), source.sourceOrder(), source.label(), source.textContent()
                ))
                .toList();
        return new AiPlanRequestResponse(
                request.id(), request.sourceType(), request.learningGoal(), request.startDate(), request.targetEndDate(),
                request.constraints(), sources
        );
    }

    private void validate(AiPlanRequestCommand command) {
        if (command.startDate().isAfter(command.targetEndDate())) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "学習開始日は目標終了日以前にしてください。");
        }
        validateSources(command.sources());
        validateConstraints(command);
        validateOpenAiTextLength(command);
    }

    private void validateOpenAiTextLength(AiPlanRequestCommand command) {
        int length = command.learningGoal().length();
        for (AiPlanSourceCommand source : command.sources()) {
            length += source.textContent().length();
        }
        length += textualLength(command.constraints());
        if (length > MAX_OPENAI_TEXT_LENGTH) {
            throw new InvalidRequestException("AI_INPUT_LIMIT_EXCEEDED", "OpenAIへ送信するテキストは合計30,000文字以下にしてください。");
        }
    }

    private int textualLength(JsonNode node) {
        if (node == null || node.isNull()) {
            return 0;
        }
        if (node.isTextual()) {
            return node.asText().length();
        }
        int result = 0;
        for (JsonNode child : node) {
            result += textualLength(child);
        }
        return result;
    }

    private void validateSources(List<AiPlanSourceCommand> sources) {
        Set<String> temporaryKeys = new HashSet<>();
        int tocLength = 0;
        int ocrCount = 0;
        for (AiPlanSourceCommand source : sources) {
            if (!temporaryKeys.add(source.temporaryKey())) {
                throw new InvalidRequestException("AI_INPUT_CONFLICT", "入力元の識別子が重複しています。");
            }
            if (source.sourceType() == AiPlanSourceType.OVERVIEW && source.textContent().length() > 5000) {
                throw new InvalidRequestException("AI_INPUT_LIMIT_EXCEEDED", "学習内容の概要は5,000文字以下にしてください。");
            }
            if (source.sourceType() != AiPlanSourceType.OVERVIEW) {
                tocLength += source.textContent().length();
            }
            if (source.sourceType() == AiPlanSourceType.OCR_TEXT) {
                ocrCount++;
            }
        }
        if (tocLength > 20000 || ocrCount > 10) {
            throw new InvalidRequestException("AI_INPUT_LIMIT_EXCEEDED", "目次とOCR結果は20,000文字以内、OCR入力は10件以内にしてください。");
        }
    }

    private void validateConstraints(AiPlanRequestCommand command) {
        JsonNode constraints = command.constraints();
        if (!constraints.isObject()) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "こだわり条件の形式が正しくありません。");
        }
        AiStudySchedule schedule;
        try {
            schedule = AiStudySchedule.from(constraints);
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "学習可能時間または学習できない曜日が正しくありません。");
        }
        long availableDays = schedule.countAvailableDays(command.startDate(), command.targetEndDate());
        if (availableDays == 0) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "期間内に学習可能な時間がありません。");
        }
        validatePageSplit(constraints);
        try {
            if (AiQuantityCondition.from(constraints)
                    .filter(quantity -> quantity.requiredDays() > availableDays)
                    .isPresent()) {
                throw new InvalidRequestException("AI_INPUT_CONFLICT", "期限内の学習可能日数に対して、入力した学習量が多すぎます。");
            }
        } catch (IllegalArgumentException | ArithmeticException exception) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "数量条件の総量と1日量を確認してください。");
        }
    }

    private void validatePageSplit(JsonNode constraints) {
        String splitUnit = constraints.path("wbsSplitUnit").asText("SECTION");
        try {
            WbsSplitUnit unit = WbsSplitUnit.valueOf(splitUnit);
            if (unit == WbsSplitUnit.PAGE) {
                AiQuantityCondition quantity = AiQuantityCondition.from(constraints).orElse(null);
                if (quantity == null || !"ページ".equals(quantity.unit())) {
                    throw new InvalidRequestException("AI_INPUT_CONFLICT", "ページ数で分割する場合は、ページ単位の総量と1日量を入力してください。");
                }
            }
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "WBS分割単位が正しくありません。");
        }
    }

}
