package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

/**
 * AI WBS下書きの構造制約と計画警告を検証する。
 */
class AiWbsDraftValidatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final AiWbsDraftValidator validator = new AiWbsDraftValidator(objectMapper);

    @Test
    void acceptsAValidTwoLevelDraft() {
        AiValidatedWbsDraft result = validator.validate(input(BigDecimal.ONE), proposal(BigDecimal.ONE));

        assertThat(result.validationStatus()).isEqualTo(AiPlanDraftValidationStatus.VALID);
        assertThat(result.warnings()).isEmpty();
        assertThat(result.tasksJson()).hasSize(2);
    }

    @Test
    void rejectsALeafWhoseSourceDoesNotExist() {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                project(),
                List.of(
                        parent(),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "学ぶ", "",
                                LocalDate.parse("2026-08-03"), LocalDate.parse("2026-08-03"),
                                BigDecimal.ONE, List.of("missing-source")
                        )
                ),
                WbsSplitUnit.SECTION
        );

        assertThatThrownBy(() -> validator.validate(input(BigDecimal.ONE), proposal))
                .isInstanceOf(AiStructuredOutputException.class)
                .hasMessageContaining("入力元参照");
    }

    @Test
    void rejectsMoreThanTwentyFourHoursOnOneDay() {
        assertThatThrownBy(() -> validator.validate(input(BigDecimal.ONE), proposal(BigDecimal.valueOf(24.25))))
                .isInstanceOf(AiDraftBusinessValidationException.class)
                .hasMessageContaining("24時間")
                .extracting(exception -> ((AiDraftBusinessValidationException) exception).errorCode())
                .isEqualTo("AI_DRAFT_DAILY_LIMIT_EXCEEDED");
    }

    @Test
    void returnsWarningsAndThreeSingleConditionOptionsWhenDesiredHoursAreExceeded() {
        AiValidatedWbsDraft result = validator.validate(input(BigDecimal.ONE), proposal(BigDecimal.valueOf(2)));

        assertThat(result.validationStatus()).isEqualTo(AiPlanDraftValidationStatus.WARNING);
        assertThat(result.warnings()).hasSize(1);
        assertThat(result.relaxationOptions()).hasSize(3);
    }

    @Test
    void returnsOnlyTheRelevantOptionForAnOutOfPeriodTask() {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                project(),
                List.of(
                        parent(),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "学ぶ", "",
                                LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-02"),
                                BigDecimal.ONE, List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );

        AiValidatedWbsDraft result = validator.validate(input(BigDecimal.valueOf(8)), proposal);

        assertThat(result.warnings()).extracting(node -> node.path("code").asText())
                .containsExactly("TASK_OUTSIDE_PROJECT_PERIOD");
        assertThat(result.relaxationOptions()).extracting(node -> node.path("code").asText())
                .containsExactly("ADJUST_PROJECT_PERIOD");
    }

    private AiWbsGenerationInput input(BigDecimal weekdayHours) {
        ObjectNode constraints = JsonNodeFactory.instance.objectNode();
        constraints.put("weekdayAvailableHours", weekdayHours);
        constraints.put("weekendAvailableHours", 2);
        constraints.put("wbsSplitUnit", "SECTION");
        constraints.putArray("unavailableWeekdays");
        return new AiWbsGenerationInput(
                AiPlanRequestSourceType.OVERVIEW,
                "Javaを学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                constraints,
                null,
                List.of(new AiWbsGenerationSource("source-1", AiPlanSourceType.OVERVIEW, 0, "概要", "Javaの基本"))
        );
    }

    private AiWbsDraftProposal proposal(BigDecimal plannedHours) {
        return new AiWbsDraftProposal(
                project(),
                List.of(
                        parent(),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "学ぶ", "",
                                LocalDate.parse("2026-08-03"), LocalDate.parse("2026-08-03"),
                                plannedHours, List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );
    }

    private AiWbsDraftProject project() {
        return new AiWbsDraftProject(
                "Java学習", "", LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-31")
        );
    }

    private AiWbsDraftTask parent() {
        return new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                null, null, null, List.of()
        );
    }
}
