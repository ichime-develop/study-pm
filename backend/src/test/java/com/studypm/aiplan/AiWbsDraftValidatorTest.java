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
    private final AiWbsDraftValidator validator = new AiWbsDraftValidator(
            objectMapper,
            new AiChapterHeadingDetector()
    );

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
    void identifiesAParentTemporaryKeyViolation() {
        AiWbsDraftTask invalidParent = new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, "another-parent", "基礎", "",
                null, null, null, List.of()
        );

        assertParentViolation(
                invalidParent,
                "PARENT_PARENT_KEY_NOT_NULL",
                "PARENTのparentTemporaryKeyはnullにしてください。"
        );
    }

    @Test
    void identifiesAParentStartDateViolation() {
        AiWbsDraftTask invalidParent = new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                LocalDate.parse("2026-08-01"), null, null, List.of()
        );

        assertParentViolation(
                invalidParent,
                "PARENT_START_DATE_NOT_NULL",
                "PARENTのplannedStartDateはnullにしてください。"
        );
    }

    @Test
    void identifiesAParentEndDateViolation() {
        AiWbsDraftTask invalidParent = new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                null, LocalDate.parse("2026-08-31"), null, List.of()
        );

        assertParentViolation(
                invalidParent,
                "PARENT_END_DATE_NOT_NULL",
                "PARENTのplannedEndDateはnullにしてください。"
        );
    }

    @Test
    void identifiesAParentPlannedHoursViolation() {
        AiWbsDraftTask invalidParent = new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                null, null, BigDecimal.ONE, List.of()
        );

        assertParentViolation(
                invalidParent,
                "PARENT_HOURS_NOT_NULL",
                "PARENTのplannedHoursはnullにしてください。"
        );
    }

    @Test
    void identifiesAParentSourceKeysViolation() {
        AiWbsDraftTask invalidParent = new AiWbsDraftTask(
                "parent-1", AiDraftTaskType.PARENT, null, "基礎", "",
                null, null, null, List.of("source-1")
        );

        assertParentViolation(
                invalidParent,
                "PARENT_SOURCE_KEYS_NOT_EMPTY",
                "PARENTのsourceTemporaryKeysは空配列にしてください。"
        );
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

    @Test
    void keepsTheScopeReductionOptionWhenPeriodAndDailyHoursWarningsCoexist() {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                project(),
                List.of(
                        parent(),
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "学ぶ", "",
                                LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-01"),
                                BigDecimal.valueOf(2), List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );

        AiValidatedWbsDraft result = validator.validate(input(BigDecimal.ONE), proposal);

        assertThat(result.relaxationOptions()).extracting(node -> node.path("code").asText())
                .containsExactly("INCREASE_AVAILABLE_HOURS", "EXTEND_TARGET_END_DATE", "REDUCE_SCOPE");
    }

    @Test
    void warnsWhenASectionDraftHasFewerLeavesThanDetectedChapters() {
        AiWbsGenerationInput input = tableOfContentsInput("""
                Chapter 1 基礎
                Chapter 2 文法
                Chapter 3 API
                Chapter 4 テスト
                """);

        AiValidatedWbsDraft result = validator.validate(input, proposal(BigDecimal.ONE));

        assertThat(result.validationStatus()).isEqualTo(AiPlanDraftValidationStatus.WARNING);
        assertThat(result.warnings()).extracting(node -> node.path("code").asText())
                .containsExactly("SOURCE_COVERAGE_MAY_BE_INCOMPLETE");
        assertThat(result.warnings().get(0).path("message").asText())
                .isEqualTo("入力から4件の章見出しを検出しましたが、下書きの実行タスクは1件です。"
                        + "学習範囲が不足していないか確認してください。");
    }

    @Test
    void doesNotWarnWhenAFlatDraftHasOneLeafForEachDetectedChapter() {
        AiWbsGenerationInput input = tableOfContentsInput("""
                Chapter 1 基礎
                Chapter 2 文法
                Chapter 3 API
                Chapter 4 テスト
                """);
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                project(),
                List.of(
                        parent(),
                        leaf("leaf-1", "第1章"),
                        leaf("leaf-2", "第2章"),
                        leaf("leaf-3", "第3章"),
                        leaf("leaf-4", "第4章")
                ),
                WbsSplitUnit.SECTION
        );

        AiValidatedWbsDraft result = validator.validate(input, proposal);

        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void doesNotWarnAboutChapterCoverageForAnOverviewRequest() {
        AiWbsGenerationInput input = input(BigDecimal.ONE, "Chapter 1 基礎\nChapter 2 文法");

        AiValidatedWbsDraft result = validator.validate(input, proposal(BigDecimal.ONE));

        assertThat(result.validationStatus()).isEqualTo(AiPlanDraftValidationStatus.VALID);
        assertThat(result.warnings()).isEmpty();
    }

    private AiWbsGenerationInput input(BigDecimal weekdayHours) {
        return input(weekdayHours, "Javaの基本");
    }

    private AiWbsGenerationInput input(BigDecimal weekdayHours, String sourceText) {
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
                List.of(new AiWbsGenerationSource("source-1", AiPlanSourceType.OVERVIEW, 0, "概要", sourceText))
        );
    }

    private AiWbsGenerationInput tableOfContentsInput(String sourceText) {
        ObjectNode constraints = JsonNodeFactory.instance.objectNode();
        constraints.put("weekdayAvailableHours", 8);
        constraints.put("weekendAvailableHours", 8);
        constraints.put("wbsSplitUnit", "SECTION");
        constraints.putArray("unavailableWeekdays");
        return new AiWbsGenerationInput(
                AiPlanRequestSourceType.TABLE_OF_CONTENTS,
                "Javaを学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                constraints,
                null,
                List.of(new AiWbsGenerationSource(
                        "source-1", AiPlanSourceType.PASTED_TOC, 0, "目次", sourceText
                ))
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

    private AiWbsDraftTask leaf(String temporaryKey, String name) {
        return new AiWbsDraftTask(
                temporaryKey, AiDraftTaskType.LEAF, "parent-1", name, "",
                LocalDate.parse("2026-08-03"), LocalDate.parse("2026-08-03"),
                BigDecimal.ONE, List.of("source-1")
        );
    }

    private void assertParentViolation(AiWbsDraftTask invalidParent, String reasonCode, String message) {
        AiWbsDraftProposal proposal = new AiWbsDraftProposal(
                project(),
                List.of(
                        invalidParent,
                        new AiWbsDraftTask(
                                "leaf-1", AiDraftTaskType.LEAF, "parent-1", "学ぶ", "",
                                LocalDate.parse("2026-08-03"), LocalDate.parse("2026-08-03"),
                                BigDecimal.ONE, List.of("source-1")
                        )
                ),
                WbsSplitUnit.SECTION
        );

        assertThatThrownBy(() -> validator.validate(input(BigDecimal.ONE), proposal))
                .isInstanceOfSatisfying(AiStructuredOutputException.class, exception -> {
                    assertThat(exception.reasonCode()).isEqualTo(reasonCode);
                    assertThat(exception).hasMessage(message);
                });
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
