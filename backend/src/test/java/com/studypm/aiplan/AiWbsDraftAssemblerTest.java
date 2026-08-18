package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

/** 任意階層の2階層化、名称省略、サーバー日程配置を検証する。 */
class AiWbsDraftAssemblerTest {

    private final AiWbsDraftAssembler assembler = new AiWbsDraftAssembler();

    @Test
    void flattensFourLevelsAndSchedulesLeavesInOrder() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-07", 1, 1),
                false,
                proposal(List.of(
                        group("root", null, "大分類"),
                        group("middle", "root", "中分類"),
                        group("small", "middle", "小分類"),
                        leaf("leaf", "small", "学習項目", 125)
                ))
        );

        assertThat(result.proposal().tasks()).hasSize(2);
        AiWbsDraftTask parent = result.proposal().tasks().get(0);
        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(parent.name()).isEqualTo("大分類");
        assertThat(leaf.name()).isEqualTo("中分類 / 小分類 / 学習項目");
        assertThat(leaf.parentTemporaryKey()).isEqualTo("root");
        assertThat(leaf.plannedHours()).isEqualByComparingTo("1.25");
        assertThat(leaf.plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(leaf.plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-04"));
    }

    @Test
    void createsOneSyntheticParentForTopLevelTerminalNodes() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-07", 2, 2),
                false,
                proposal(List.of(
                        leaf("leaf-1", null, "基礎", 25),
                        leaf("leaf-2", null, "応用", 25)
                ))
        );

        assertThat(result.proposal().tasks()).extracting(AiWbsDraftTask::taskType)
                .containsExactly(AiDraftTaskType.PARENT, AiDraftTaskType.LEAF, AiDraftTaskType.LEAF);
        assertThat(result.proposal().tasks().get(0).name()).isEqualTo("Java学習");
        assertThat(result.proposal().tasks().get(1).parentTemporaryKey()).isEqualTo("generated-parent");
        assertThat(result.proposal().tasks().get(2).parentTemporaryKey()).isEqualTo("generated-parent");
    }

    @Test
    void flattensOneToThreeLevelsUnderMultipleTopLevelGroups() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-07", 2, 2),
                false,
                proposal(List.of(
                        group("root-1", null, "第1章"),
                        leaf("leaf-1", "root-1", "節", 25),
                        group("root-2", null, "第2章"),
                        group("middle", "root-2", "大分類"),
                        leaf("leaf-2", "middle", "小分類", 25)
                ))
        );

        assertThat(result.proposal().tasks()).extracting(AiWbsDraftTask::name)
                .containsExactly("第1章", "節", "第2章", "大分類 / 小分類");
    }

    @Test
    void continuesAfterTheProjectPeriodAndWarnsInNormalMode() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 200)))
        );

        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(leaf.plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(leaf.plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-04"));
        assertThat(result.warnings()).extracting(AiWbsDraftIssue::code)
                .containsExactly("TASK_OUTSIDE_PROJECT_PERIOD");
    }

    @Test
    void appliesWeekdayWeekendAndUnavailableWeekdayCapacities() {
        AiWbsGenerationInput input = input("2026-08-07", "2026-08-09", 1, 2);
        ((ObjectNode) input.constraints()).putArray("unavailableWeekdays").add("SATURDAY");

        AiWbsDraftAssembly result = assembler.assemble(
                input,
                false,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 300)))
        );

        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(leaf.plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-07"));
        assertThat(leaf.plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-09"));
        assertThat(result.dailyPlannedHours()).containsOnlyKeys(
                LocalDate.parse("2026-08-07"), LocalDate.parse("2026-08-09")
        );
    }

    @Test
    void finishesOnTheTargetEndDateWithoutAnOutsidePeriodWarning() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-04", 1, 1),
                false,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 200)))
        );

        assertThat(result.proposal().tasks().get(1).plannedEndDate())
                .isEqualTo(LocalDate.parse("2026-08-04"));
        assertThat(result.warnings()).extracting(AiWbsDraftIssue::code)
                .doesNotContain("TASK_OUTSIDE_PROJECT_PERIOD");
    }

    @Test
    void usesUpToTwentyFourHoursInsideThePeriodInDeadlineMode() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                true,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 200)))
        );

        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(leaf.plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(leaf.plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(result.warnings()).extracting(AiWbsDraftIssue::code)
                .containsExactly("DAILY_AVAILABLE_HOURS_EXCEEDED");
    }

    @Test
    void distributesDeadlineOverflowAcrossTheLeastLoadedAvailableDays() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-05", 1, 1),
                true,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 600)))
        );

        assertThat(result.dailyPlannedHours().values()).allSatisfy(hours ->
                assertThat(hours).isEqualByComparingTo("2")
        );
    }

    @Test
    void continuesAfterThePeriodWhenDeadlineCapacityIsStillInsufficient() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                true,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 2500)))
        );

        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(leaf.plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-04"));
        assertThat(result.warnings()).extracting(AiWbsDraftIssue::code)
                .containsExactlyInAnyOrder("DAILY_AVAILABLE_HOURS_EXCEEDED", "TASK_OUTSIDE_PROJECT_PERIOD");
    }

    @Test
    void acceptsExactlyTwentyFourHoursOnOneDay() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                true,
                proposal(List.of(group("root", null, "基礎"), leaf("leaf", "root", "学ぶ", 2400)))
        );

        assertThat(result.dailyPlannedHours().get(LocalDate.parse("2026-08-03")))
                .isEqualByComparingTo("24");
        assertThat(result.proposal().tasks().get(1).plannedEndDate())
                .isEqualTo(LocalDate.parse("2026-08-03"));
    }

    @Test
    void reusesRemainingCapacityForTheNextLeaf() {
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(
                        group("root", null, "基礎"),
                        leaf("leaf-1", "root", "変数", 25),
                        leaf("leaf-2", "root", "制御構文", 75)
                ))
        );

        assertThat(result.proposal().tasks().get(1).plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(result.proposal().tasks().get(2).plannedStartDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(result.proposal().tasks().get(2).plannedEndDate()).isEqualTo(LocalDate.parse("2026-08-03"));
    }

    @Test
    void abbreviatesACombinedNameByCodePointAndKeepsTheFullPathInDescription() {
        String middle = "中".repeat(60);
        String terminal = "小".repeat(60);
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(
                        group("root", null, "大分類"),
                        group("middle", "root", middle),
                        leaf("leaf", "middle", terminal, 25)
                ))
        );

        AiWbsDraftTask leaf = result.proposal().tasks().get(1);
        assertThat(leaf.name().codePointCount(0, leaf.name().length())).isEqualTo(100);
        assertThat(leaf.name()).startsWith("… / ").endsWith(terminal);
        assertThat(leaf.description()).startsWith("階層: " + middle + " / " + terminal);
        assertThat(result.warnings()).extracting(AiWbsDraftIssue::code)
                .containsExactly("OUTLINE_PATH_ABBREVIATED");
    }

    @Test
    void keepsDescriptionWithinFiveThousandCodePointsWhenPathIsAdded() {
        String middle = "中".repeat(60);
        String terminal = "小".repeat(60);
        AiWbsOutlineNode leaf = new AiWbsOutlineNode(
                "leaf", "middle", terminal, "説明".repeat(2500), 25, List.of("source-1")
        );
        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(group("root", null, "大分類"), group("middle", "root", middle), leaf))
        );

        String description = result.proposal().tasks().get(1).description();
        assertThat(description.codePointCount(0, description.length())).isEqualTo(5000);
        assertThat(description).startsWith("階層: ");
    }

    @Test
    void omitsTheSeparatorWhenTheHierarchyPathAloneFillsTheDescriptionLimit() {
        List<AiWbsOutlineNode> nodes = new ArrayList<>();
        nodes.add(group("root", null, "章"));
        String parentKey = "root";
        for (int index = 0; index < 48; index++) {
            String key = "group-" + index;
            nodes.add(group(key, parentKey, "中".repeat(100)));
            parentKey = key;
        }
        nodes.add(new AiWbsOutlineNode(
                "leaf", parentKey, "小".repeat(52), "説明", 25, List.of("source-1")
        ));

        AiWbsDraftAssembly result = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(nodes)
        );

        String description = result.proposal().tasks().get(1).description();
        assertThat(description.codePointCount(0, description.length())).isEqualTo(5000);
        assertThat(description).doesNotEndWith("\n");
    }

    @Test
    void abbreviatesOnlyAfterTheCombinedNameExceedsOneHundredCodePoints() {
        String middleName = "中".repeat(48);
        String exactLeafName = "小".repeat(49);
        AiWbsDraftAssembly exact = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(
                        group("root", null, "章"),
                        group("middle", "root", middleName),
                        leaf("exact", "middle", exactLeafName, 25)
                ))
        );
        AiWbsDraftAssembly over = assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1),
                false,
                proposal(List.of(
                        group("root", null, "章"),
                        group("middle", "root", middleName),
                        leaf("over", "middle", exactLeafName + "追", 25)
                ))
        );

        assertThat(exact.proposal().tasks().get(1).name())
                .isEqualTo(middleName + " / " + exactLeafName);
        assertThat(exact.warnings()).isEmpty();
        assertThat(over.proposal().tasks().get(1).name()).startsWith("… / ");
        assertThat(over.warnings()).extracting(AiWbsDraftIssue::code)
                .containsExactly("OUTLINE_PATH_ABBREVIATED");
    }

    @Test
    void validatesTheExactDailyAllocationWhenLeavesShareDates() {
        AiWbsGenerationInput input = input("2026-08-03", "2026-08-04", 1, 1);
        AiWbsDraftAssembly result = assembler.assemble(
                input,
                true,
                proposal(List.of(
                        group("root", null, "基礎"),
                        leaf("leaf-1", "root", "前半", 2425),
                        leaf("leaf-2", "root", "後半", 2375)
                ))
        );
        AiWbsDraftValidator validator = new AiWbsDraftValidator(
                new ObjectMapper().findAndRegisterModules(),
                new AiChapterHeadingDetector()
        );

        AiValidatedWbsDraft validated = validator.validate(
                input, result.proposal(), result.warnings(), result.dailyPlannedHours()
        );

        assertThat(validated.validationStatus()).isEqualTo(AiPlanDraftValidationStatus.WARNING);
        assertThat(result.dailyPlannedHours().values()).allMatch(hours -> hours.intValueExact() == 24);
    }

    @Test
    void rejectsAnOutlineWhoseTotalEffortExceedsTheSchedulingSafetyLimit() {
        List<AiWbsOutlineNode> nodes = new ArrayList<>();
        nodes.add(group("root", null, "基礎"));
        for (int index = 1; index <= 5; index++) {
            nodes.add(leaf("leaf-" + index, "root", "項目" + index, 25_000));
        }

        assertThatThrownBy(() -> assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1), false, proposal(nodes)
        )).isInstanceOfSatisfying(AiStructuredOutputException.class, exception ->
                assertThat(exception.reasonCode()).isEqualTo("OUTLINE_TOTAL_EFFORT_EXCEEDED"));
    }

    @Test
    void rejectsDuplicateMissingSelfCyclicAndOutOfOrderParents() {
        assertReason(
                List.of(group("same", null, "A"), leaf("same", null, "B", 25)),
                "OUTLINE_KEY_DUPLICATE"
        );
        assertReason(List.of(leaf("leaf", "missing", "A", 25)), "OUTLINE_PARENT_MISSING");
        assertReason(List.of(leaf("leaf", "leaf", "A", 25)), "OUTLINE_SELF_REFERENCE");
        assertReason(
                List.of(group("a", "b", "A"), group("b", "a", "B"), leaf("leaf", "a", "C", 25)),
                "OUTLINE_CYCLE"
        );
        assertReason(
                List.of(leaf("leaf", "parent", "A", 25), group("parent", null, "P")),
                "OUTLINE_PARENT_ORDER_INVALID"
        );
    }

    private void assertReason(List<AiWbsOutlineNode> nodes, String reasonCode) {
        assertThatThrownBy(() -> assembler.assemble(
                input("2026-08-03", "2026-08-03", 1, 1), false, proposal(nodes)
        )).isInstanceOfSatisfying(AiStructuredOutputException.class, exception ->
                assertThat(exception.reasonCode()).isEqualTo(reasonCode));
    }

    private AiWbsGenerationProposal proposal(List<AiWbsOutlineNode> nodes) {
        return new AiWbsGenerationProposal(
                new AiWbsGenerationProject("Java学習", "Javaを学ぶ"),
                nodes,
                WbsSplitUnit.SECTION
        );
    }

    private AiWbsOutlineNode group(String key, String parentKey, String name) {
        return new AiWbsOutlineNode(key, parentKey, name, "", null, List.of());
    }

    private AiWbsOutlineNode leaf(String key, String parentKey, String name, int effortHundredths) {
        return new AiWbsOutlineNode(
                key, parentKey, name, "説明", effortHundredths, List.of("source-1")
        );
    }

    private AiWbsGenerationInput input(
            String startDate,
            String targetEndDate,
            int weekdayHours,
            int weekendHours
    ) {
        ObjectNode constraints = JsonNodeFactory.instance.objectNode();
        constraints.put("weekdayAvailableHours", weekdayHours);
        constraints.put("weekendAvailableHours", weekendHours);
        constraints.put("wbsSplitUnit", "SECTION");
        constraints.putArray("unavailableWeekdays");
        return new AiWbsGenerationInput(
                AiPlanRequestSourceType.TABLE_OF_CONTENTS,
                "Javaを学ぶ",
                LocalDate.parse(startDate),
                LocalDate.parse(targetEndDate),
                constraints,
                null,
                List.of(new AiWbsGenerationSource(
                        "source-1", AiPlanSourceType.PASTED_TOC, 0, "目次", "架空教材の目次"
                ))
        );
    }
}
