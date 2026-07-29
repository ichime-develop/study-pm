package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.studypm.account.AccountRepository;
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

    private static final BigDecimal QUARTER_HOUR = new BigDecimal("0.25");
    private static final BigDecimal DEFAULT_WEEKDAY_AVAILABLE_HOURS = BigDecimal.ONE;
    private static final BigDecimal DEFAULT_WEEKEND_AVAILABLE_HOURS = BigDecimal.valueOf(2);
    private final AiPlanGenerationRequestRepository requestRepository;
    private final AiPlanSourceRepository sourceRepository;
    private final AccountRepository accountRepository;
    private final Clock clock;
    private final int retentionDays;

    public AiPlanRequestService(
            AiPlanGenerationRequestRepository requestRepository,
            AiPlanSourceRepository sourceRepository,
            AccountRepository accountRepository,
            Clock clock,
            @Value("${app.ai.retention-days:30}") int retentionDays
    ) {
        this.requestRepository = requestRepository;
        this.sourceRepository = sourceRepository;
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
        BigDecimal weekdayHours = decimal(constraints, "weekdayAvailableHours", DEFAULT_WEEKDAY_AVAILABLE_HOURS);
        BigDecimal weekendHours = decimal(constraints, "weekendAvailableHours", DEFAULT_WEEKEND_AVAILABLE_HOURS);
        validateQuarterHours(weekdayHours, "平日の学習可能時間");
        validateQuarterHours(weekendHours, "土日の学習可能時間");
        Set<DayOfWeek> unavailable = unavailableWeekdays(constraints);
        long availableDays = countAvailableDays(command.startDate(), command.targetEndDate(), weekdayHours, weekendHours, unavailable);
        if (availableDays == 0) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "期間内に学習可能な時間がありません。");
        }
        validatePageSplit(constraints);
        JsonNode quantity = constraints.path("quantityCondition");
        if (quantity.isObject() && quantity.hasNonNull("totalAmount") && quantity.hasNonNull("dailyAmount")) {
            BigDecimal total = quantity.path("totalAmount").decimalValue();
            BigDecimal daily = quantity.path("dailyAmount").decimalValue();
            if (total.signum() <= 0 || daily.signum() <= 0) {
                throw new InvalidRequestException("AI_INPUT_CONFLICT", "数量条件の総量と1日量を確認してください。");
            }
            long neededDays = total.divide(daily, 0, java.math.RoundingMode.CEILING).longValueExact();
            if (neededDays > availableDays) {
                throw new InvalidRequestException("AI_INPUT_CONFLICT", "期限内の学習可能日数に対して、入力した学習量が多すぎます。");
            }
        }
    }

    private void validatePageSplit(JsonNode constraints) {
        String splitUnit = constraints.path("wbsSplitUnit").asText("SECTION");
        try {
            WbsSplitUnit unit = WbsSplitUnit.valueOf(splitUnit);
            if (unit == WbsSplitUnit.PAGE) {
                JsonNode quantity = constraints.path("quantityCondition");
                if (!quantity.isObject() || !"ページ".equals(quantity.path("unit").asText())
                        || !quantity.hasNonNull("totalAmount") || !quantity.hasNonNull("dailyAmount")) {
                    throw new InvalidRequestException("AI_INPUT_CONFLICT", "ページ数で分割する場合は、ページ単位の総量と1日量を入力してください。");
                }
            }
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", "WBS分割単位が正しくありません。");
        }
    }

    private BigDecimal decimal(JsonNode constraints, String fieldName, BigDecimal defaultValue) {
        JsonNode value = constraints.get(fieldName);
        if (value == null || value.isNull()) {
            return defaultValue;
        }
        if (!value.isNumber()) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", fieldName + "は数値で入力してください。");
        }
        return value.decimalValue();
    }

    private void validateQuarterHours(BigDecimal hours, String label) {
        if (hours.signum() < 0 || hours.remainder(QUARTER_HOUR).signum() != 0) {
            throw new InvalidRequestException("AI_INPUT_CONFLICT", label + "は0.25時間単位の0以上で入力してください。");
        }
    }

    private Set<DayOfWeek> unavailableWeekdays(JsonNode constraints) {
        Set<DayOfWeek> result = new HashSet<>();
        for (JsonNode day : constraints.path("unavailableWeekdays")) {
            try {
                result.add(DayOfWeek.valueOf(day.asText()));
            } catch (IllegalArgumentException exception) {
                throw new InvalidRequestException("AI_INPUT_CONFLICT", "学習できない曜日が正しくありません。");
            }
        }
        return result;
    }

    private long countAvailableDays(
            LocalDate startDate, LocalDate endDate, BigDecimal weekdayHours, BigDecimal weekendHours, Set<DayOfWeek> unavailable
    ) {
        long count = 0;
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            if (unavailable.contains(date.getDayOfWeek())) {
                continue;
            }
            BigDecimal hours = date.getDayOfWeek().getValue() <= DayOfWeek.FRIDAY.getValue() ? weekdayHours : weekendHours;
            if (hours.signum() > 0) {
                count++;
            }
        }
        return count;
    }
}
