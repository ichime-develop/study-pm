package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.studypm.account.Account;
import com.studypm.account.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

/**
 * AI生成依頼の入力検証と入力元置換の永続化順序を検証する。
 */
class AiPlanRequestServiceTest {

    private final AiPlanGenerationRequestRepository requestRepository = mock(AiPlanGenerationRequestRepository.class);
    private final AiPlanSourceRepository sourceRepository = mock(AiPlanSourceRepository.class);
    private final AccountRepository accountRepository = mock(AccountRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-07-30T00:00:00Z"), ZoneOffset.UTC);

    private AiPlanRequestService service;
    private Account account;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        service = new AiPlanRequestService(requestRepository, sourceRepository, accountRepository, clock, 30);
        account = Account.create("user@example.com", "encoded", "User", clock.instant());
        accountId = account.id();
        when(accountRepository.getReferenceById(accountId)).thenReturn(account);
        when(requestRepository.save(any(AiPlanGenerationRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sourceRepository.findAllByGenerationRequest_IdOrderBySourceOrderAsc(any())).thenReturn(List.of());
    }

    @Test
    void createAppliesDefaultAvailabilityWhenConstraintsOmitHours() {
        // 平日・土日の時間を未指定にすると既定値が補完されるため、利用可能時間0の矛盾として拒否されない。
        assertThatCode(() -> service.create(accountId, command(JsonNodeFactory.instance.objectNode())))
                .doesNotThrowAnyException();
    }

    @Test
    void createAllowsDailyQuantityGreaterThanTwentyFourWhenUnitIsPage() {
        ObjectNode constraints = JsonNodeFactory.instance.objectNode();
        constraints.put("wbsSplitUnit", "PAGE");
        constraints.putObject("quantityCondition")
                .put("totalAmount", 30)
                .put("dailyAmount", 30)
                .put("unit", "ページ");

        // 1日量は時間ではなく数量なので、24を超えても入力矛盾として拒否しない。
        assertThatCode(() -> service.create(accountId, command(constraints))).doesNotThrowAnyException();
    }

    @Test
    void updateFlushesDeletedSourcesBeforeSavingSameTemporaryKey() {
        AiPlanGenerationRequest request = AiPlanGenerationRequest.create(
                account,
                command(JsonNodeFactory.instance.objectNode()),
                clock.instant().plusSeconds(60),
                clock.instant()
        );
        when(requestRepository.findByIdAndAccount_Id(request.id(), accountId)).thenReturn(Optional.of(request));

        service.update(accountId, request.id(), command(JsonNodeFactory.instance.objectNode()));

        InOrder order = inOrder(sourceRepository);
        order.verify(sourceRepository).deleteAllByGenerationRequest_Id(request.id());
        order.verify(sourceRepository).flush();
        order.verify(sourceRepository).saveAll(any());
    }

    private AiPlanRequestCommand command(ObjectNode constraints) {
        return new AiPlanRequestCommand(
                AiPlanRequestSourceType.OVERVIEW,
                "Javaを学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                constraints,
                List.of(new AiPlanSourceCommand("overview", AiPlanSourceType.OVERVIEW, 0, null, "概要"))
        );
    }
}
