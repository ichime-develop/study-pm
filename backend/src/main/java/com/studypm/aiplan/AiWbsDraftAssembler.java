package com.studypm.aiplan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

/**
 * OpenAIの任意階層アウトラインを既存の2階層WBSへ変換し、学習条件に沿って予定日を割り当てる。
 * 手動WBSと学習記録の工数ルールは扱わない。
 */
@Component
public class AiWbsDraftAssembler {

    private static final BigDecimal HOURS_PER_DAY = BigDecimal.valueOf(24);
    private static final BigDecimal MAXIMUM_TOTAL_PLANNED_HOURS = BigDecimal.valueOf(1_000);
    private static final int MAXIMUM_NAME_LENGTH = 100;
    private static final int MAXIMUM_DESCRIPTION_LENGTH = 5000;
    private static final String ABBREVIATION_PREFIX = "… / ";

    public AiWbsDraftAssembly assemble(
            AiWbsGenerationInput input,
            boolean isDeadlinePriority,
            AiWbsGenerationProposal generationProposal
    ) {
        validateProject(generationProposal);
        validateSplitUnit(input, generationProposal);
        ValidatedOutline outline = validateOutline(input, generationProposal.outlineNodes());
        FlattenedDraft flattened = flatten(generationProposal, outline);
        ScheduledDraft scheduled = schedule(input, isDeadlinePriority, flattened.tasks());
        List<AiWbsDraftIssue> warnings = new ArrayList<>(flattened.warnings());
        warnings.addAll(scheduled.warnings());
        return new AiWbsDraftAssembly(
                new AiWbsDraftProposal(
                        new AiWbsDraftProject(
                                generationProposal.project().name().trim(),
                                generationProposal.project().description(),
                                input.startDate(),
                                input.targetEndDate()
                        ),
                        scheduled.tasks(),
                        generationProposal.wbsSplitUnit()
                ),
                warnings,
                scheduled.dailyPlannedHours()
        );
    }

    private void validateProject(AiWbsGenerationProposal proposal) {
        if (proposal == null || proposal.project() == null) {
            throw structureError("PROJECT_MISSING", "projectは必須です。");
        }
        requireText(proposal.project().name(), MAXIMUM_NAME_LENGTH, "project.name");
        if (proposal.project().description() == null
                || codePointCount(proposal.project().description()) > MAXIMUM_DESCRIPTION_LENGTH) {
            throw structureError("PROJECT_DESCRIPTION_INVALID", "project.descriptionは5,000文字以下で必須です。");
        }
    }

    private void validateSplitUnit(AiWbsGenerationInput input, AiWbsGenerationProposal proposal) {
        WbsSplitUnit expected;
        try {
            expected = WbsSplitUnit.valueOf(input.constraints().path("wbsSplitUnit").asText("SECTION"));
        } catch (IllegalArgumentException exception) {
            throw structureError("REQUEST_SPLIT_UNIT_INVALID", "生成依頼のwbsSplitUnitが正しくありません。");
        }
        if (proposal.wbsSplitUnit() != expected) {
            throw structureError("SPLIT_UNIT_MISMATCH", "wbsSplitUnitは生成依頼の指定値と一致させてください。");
        }
    }

    private ValidatedOutline validateOutline(AiWbsGenerationInput input, List<AiWbsOutlineNode> nodes) {
        if (nodes == null || nodes.isEmpty()) {
            throw structureError("OUTLINE_EMPTY", "outlineNodesには1件以上の学習項目が必要です。");
        }
        Map<String, AiWbsOutlineNode> nodesByKey = new LinkedHashMap<>();
        Map<String, Integer> positions = new HashMap<>();
        for (int index = 0; index < nodes.size(); index++) {
            AiWbsOutlineNode node = nodes.get(index);
            if (node == null) {
                throw structureError("OUTLINE_NODE_MISSING", "outlineNodesにnullは指定できません。");
            }
            requireText(node.temporaryKey(), MAXIMUM_NAME_LENGTH, "outlineNode.temporaryKey");
            requireText(node.name(), MAXIMUM_NAME_LENGTH, "outlineNode.name");
            if (node.description() == null || codePointCount(node.description()) > MAXIMUM_DESCRIPTION_LENGTH) {
                throw structureError(
                        "OUTLINE_DESCRIPTION_INVALID",
                        "outlineNode.descriptionは5,000文字以下で必須です。"
                );
            }
            if (nodesByKey.putIfAbsent(node.temporaryKey(), node) != null) {
                throw structureError("OUTLINE_KEY_DUPLICATE", "outlineNode.temporaryKeyは重複できません。");
            }
            positions.put(node.temporaryKey(), index);
        }

        Map<String, List<AiWbsOutlineNode>> childrenByParent = new LinkedHashMap<>();
        for (AiWbsOutlineNode node : nodes) {
            String parentKey = node.parentTemporaryKey();
            if (parentKey == null) {
                continue;
            }
            if (parentKey.equals(node.temporaryKey())) {
                throw structureError("OUTLINE_SELF_REFERENCE", "outlineNodeは自分自身を親にできません。");
            }
            if (!nodesByKey.containsKey(parentKey)) {
                throw structureError("OUTLINE_PARENT_MISSING", "outlineNodeの親参照が存在しません。");
            }
            childrenByParent.computeIfAbsent(parentKey, ignored -> new ArrayList<>()).add(node);
        }
        rejectCycles(nodesByKey);
        for (AiWbsOutlineNode node : nodes) {
            if (node.parentTemporaryKey() != null
                    && positions.get(node.parentTemporaryKey()) >= positions.get(node.temporaryKey())) {
                throw structureError("OUTLINE_PARENT_ORDER_INVALID", "親outlineNodeは子より前に配置してください。");
            }
        }

        Set<String> sourceKeys = input.sources().stream()
                .map(AiWbsGenerationSource::temporaryKey)
                .collect(java.util.stream.Collectors.toSet());
        int terminalCount = 0;
        for (AiWbsOutlineNode node : nodes) {
            if (node.sourceTemporaryKeys() == null) {
                throw structureError("OUTLINE_SOURCE_KEYS_MISSING", "sourceTemporaryKeysは配列で必須です。");
            }
            boolean hasChildren = childrenByParent.containsKey(node.temporaryKey());
            if (hasChildren) {
                if (node.plannedEffortHundredths() != null || !node.sourceTemporaryKeys().isEmpty()) {
                    throw structureError(
                            "OUTLINE_GROUP_FIELDS_INVALID",
                            "子を持つoutlineNodeのplannedEffortHundredthsはnull、sourceTemporaryKeysは空配列にしてください。"
                    );
                }
                continue;
            }
            AiPlannedEffortConverter.hundredthsToHours(node.plannedEffortHundredths());
            validateSourceKeys(node, sourceKeys);
            terminalCount++;
        }
        if (terminalCount == 0) {
            throw structureError("OUTLINE_TERMINAL_MISSING", "終端の学習項目が1件以上必要です。");
        }
        return new ValidatedOutline(nodesByKey, childrenByParent);
    }

    private void rejectCycles(Map<String, AiWbsOutlineNode> nodesByKey) {
        for (AiWbsOutlineNode node : nodesByKey.values()) {
            Set<String> ancestors = new HashSet<>();
            AiWbsOutlineNode current = node;
            while (current.parentTemporaryKey() != null) {
                if (!ancestors.add(current.temporaryKey())) {
                    throw structureError("OUTLINE_CYCLE", "outlineNodesの親参照に循環があります。");
                }
                current = nodesByKey.get(current.parentTemporaryKey());
                if (current == null) {
                    break;
                }
            }
        }
    }

    private void validateSourceKeys(AiWbsOutlineNode node, Set<String> validSourceKeys) {
        if (node.sourceTemporaryKeys().isEmpty()) {
            throw structureError("OUTLINE_SOURCE_KEYS_EMPTY", "終端の学習項目には入力元参照が必要です。");
        }
        Set<String> uniqueKeys = new HashSet<>();
        for (String sourceKey : node.sourceTemporaryKeys()) {
            if (sourceKey == null || !uniqueKeys.add(sourceKey) || !validSourceKeys.contains(sourceKey)) {
                throw structureError("OUTLINE_SOURCE_REFERENCE_INVALID", "入力元参照が存在しないか重複しています。");
            }
        }
    }

    private FlattenedDraft flatten(AiWbsGenerationProposal proposal, ValidatedOutline outline) {
        List<AiWbsDraftTask> result = new ArrayList<>();
        List<AiWbsDraftIssue> warnings = new ArrayList<>();
        String generatedParentKey = unusedGeneratedParentKey(outline.nodesByKey());
        boolean hasGeneratedParent = false;
        for (AiWbsOutlineNode root : outline.nodesByKey().values()) {
            if (root.parentTemporaryKey() != null) {
                continue;
            }
            List<AiWbsOutlineNode> children = outline.childrenByParent().get(root.temporaryKey());
            if (children == null || children.isEmpty()) {
                if (!hasGeneratedParent) {
                    result.add(parentTask(
                            generatedParentKey,
                            proposal.project().name().trim(),
                            "入力直下の学習項目"
                    ));
                    hasGeneratedParent = true;
                }
                result.add(leafTask(root, generatedParentKey, List.of(root.name()), warnings));
                continue;
            }
            result.add(parentTask(root.temporaryKey(), root.name().trim(), root.description()));
            for (AiWbsOutlineNode child : children) {
                appendTerminalTasks(
                        child,
                        root.temporaryKey(),
                        List.of(child.name()),
                        outline.childrenByParent(),
                        result,
                        warnings
                );
            }
        }
        return new FlattenedDraft(List.copyOf(result), List.copyOf(warnings));
    }

    private void appendTerminalTasks(
            AiWbsOutlineNode node,
            String parentKey,
            List<String> path,
            Map<String, List<AiWbsOutlineNode>> childrenByParent,
            List<AiWbsDraftTask> tasks,
            List<AiWbsDraftIssue> warnings
    ) {
        List<AiWbsOutlineNode> children = childrenByParent.get(node.temporaryKey());
        if (children == null || children.isEmpty()) {
            tasks.add(leafTask(node, parentKey, path, warnings));
            return;
        }
        for (AiWbsOutlineNode child : children) {
            List<String> childPath = new ArrayList<>(path);
            childPath.add(child.name());
            appendTerminalTasks(child, parentKey, childPath, childrenByParent, tasks, warnings);
        }
    }

    private AiWbsDraftTask parentTask(String key, String name, String description) {
        return new AiWbsDraftTask(
                key, AiDraftTaskType.PARENT, null, name, description,
                null, null, null, List.of()
        );
    }

    private AiWbsDraftTask leafTask(
            AiWbsOutlineNode node,
            String parentKey,
            List<String> path,
            List<AiWbsDraftIssue> warnings
    ) {
        String fullPath = String.join(" / ", path).trim();
        String name = fullPath;
        String description = node.description();
        boolean isAbbreviated = codePointCount(fullPath) > MAXIMUM_NAME_LENGTH;
        if (isAbbreviated) {
            name = abbreviateFromEnd(fullPath, MAXIMUM_NAME_LENGTH);
            description = descriptionWithPath(fullPath, description);
            warnings.add(new AiWbsDraftIssue(
                    "OUTLINE_PATH_ABBREVIATED",
                    "階層を結合したタスク名が100文字を超えたため、名称を省略しました。完全な階層は概要で確認できます。",
                    node.temporaryKey()
            ));
        }
        return new AiWbsDraftTask(
                node.temporaryKey(),
                AiDraftTaskType.LEAF,
                parentKey,
                name,
                description,
                null,
                null,
                AiPlannedEffortConverter.hundredthsToHours(node.plannedEffortHundredths()),
                node.sourceTemporaryKeys()
        );
    }

    private String descriptionWithPath(String fullPath, String originalDescription) {
        String prefix = "階層: " + fullPath;
        if (codePointCount(prefix) > MAXIMUM_DESCRIPTION_LENGTH) {
            throw structureError("OUTLINE_PATH_TOO_LONG", "outlineNodeの階層パスが長すぎます。");
        }
        if (originalDescription.isEmpty()) {
            return prefix;
        }
        int remaining = MAXIMUM_DESCRIPTION_LENGTH - codePointCount(prefix) - 1;
        if (remaining < 0) {
            return prefix;
        }
        return prefix + "\n" + truncateByCodePoints(originalDescription, Math.max(0, remaining));
    }

    private ScheduledDraft schedule(
            AiWbsGenerationInput input,
            boolean isDeadlinePriority,
            List<AiWbsDraftTask> tasks
    ) {
        AiStudySchedule schedule;
        try {
            schedule = AiStudySchedule.from(input.constraints());
        } catch (IllegalArgumentException exception) {
            throw structureError("STUDY_SCHEDULE_INVALID", "学習可能時間または学習できない曜日が正しくありません。");
        }
        BigDecimal totalHours = tasks.stream()
                .filter(task -> task.taskType() == AiDraftTaskType.LEAF)
                .map(AiWbsDraftTask::plannedHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalHours.compareTo(MAXIMUM_TOTAL_PLANNED_HOURS) > 0) {
            throw structureError(
                    "OUTLINE_TOTAL_EFFORT_EXCEEDED",
                    "WBS下書きの総予定工数は" + MAXIMUM_TOTAL_PLANNED_HOURS.toPlainString() + "時間以下にしてください。"
            );
        }
        LinkedHashMap<LocalDate, BigDecimal> capacities = capacitiesWithinPeriod(input, schedule);
        if (capacities.isEmpty()) {
            throw new AiDraftBusinessValidationException("利用可能日がないWBS下書きは保存できません。");
        }
        if (isDeadlinePriority) {
            increaseCapacitiesForDeadline(totalHours, capacities);
        }
        extendCapacitiesAfterTarget(totalHours, capacities, input.targetEndDate(), schedule);

        List<LocalDate> dates = new ArrayList<>(capacities.keySet());
        Map<LocalDate, BigDecimal> usedHours = new LinkedHashMap<>();
        Map<String, AiWbsDraftTask> scheduledByKey = new HashMap<>();
        int dateIndex = 0;
        for (AiWbsDraftTask task : tasks) {
            if (task.taskType() != AiDraftTaskType.LEAF) {
                continue;
            }
            BigDecimal remaining = task.plannedHours();
            LocalDate firstDate = null;
            LocalDate lastDate = null;
            while (remaining.signum() > 0) {
                LocalDate date = dates.get(dateIndex);
                BigDecimal used = usedHours.getOrDefault(date, BigDecimal.ZERO);
                BigDecimal available = capacities.get(date).subtract(used);
                if (available.signum() <= 0) {
                    dateIndex++;
                    continue;
                }
                BigDecimal assigned = remaining.min(available);
                usedHours.put(date, used.add(assigned));
                remaining = remaining.subtract(assigned);
                firstDate = firstDate == null ? date : firstDate;
                lastDate = date;
            }
            scheduledByKey.put(task.temporaryKey(), new AiWbsDraftTask(
                    task.temporaryKey(), task.taskType(), task.parentTemporaryKey(), task.name(), task.description(),
                    firstDate, lastDate, task.plannedHours(), task.sourceTemporaryKeys()
            ));
        }

        List<AiWbsDraftIssue> warnings = scheduleWarnings(input, schedule, usedHours, scheduledByKey);
        List<AiWbsDraftTask> scheduledTasks = tasks.stream()
                .map(task -> task.taskType() == AiDraftTaskType.LEAF
                        ? scheduledByKey.get(task.temporaryKey())
                        : task)
                .toList();
        return new ScheduledDraft(scheduledTasks, warnings, Map.copyOf(usedHours));
    }

    private LinkedHashMap<LocalDate, BigDecimal> capacitiesWithinPeriod(
            AiWbsGenerationInput input,
            AiStudySchedule schedule
    ) {
        LinkedHashMap<LocalDate, BigDecimal> result = new LinkedHashMap<>();
        input.startDate().datesUntil(input.targetEndDate().plusDays(1))
                .forEach(date -> {
                    BigDecimal available = preferredDailyCapacity(schedule, date);
                    if (available.signum() > 0) {
                        result.put(date, available);
                    }
                });
        return result;
    }

    private void increaseCapacitiesForDeadline(
            BigDecimal totalHours,
            LinkedHashMap<LocalDate, BigDecimal> capacities
    ) {
        BigDecimal preferredTotal = capacities.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingOverflow = totalHours.subtract(preferredTotal).max(BigDecimal.ZERO);
        if (remainingOverflow.signum() == 0) {
            return;
        }
        while (remainingOverflow.signum() > 0) {
            BigDecimal minimumCapacity = capacities.values().stream().min(BigDecimal::compareTo)
                    .orElse(BigDecimal.ZERO);
            if (minimumCapacity.compareTo(HOURS_PER_DAY) >= 0) {
                return;
            }
            List<Map.Entry<LocalDate, BigDecimal>> leastLoadedDays = capacities.entrySet().stream()
                    .filter(entry -> entry.getValue().compareTo(minimumCapacity) == 0)
                    .toList();
            BigDecimal nextCapacity = capacities.values().stream()
                    .filter(capacity -> capacity.compareTo(minimumCapacity) > 0)
                    .min(BigDecimal::compareTo)
                    .orElse(HOURS_PER_DAY)
                    .min(HOURS_PER_DAY);
            BigDecimal increaseToNextLevel = nextCapacity.subtract(minimumCapacity)
                    .multiply(BigDecimal.valueOf(leastLoadedDays.size()));
            if (increaseToNextLevel.compareTo(remainingOverflow) <= 0) {
                leastLoadedDays.forEach(entry -> entry.setValue(nextCapacity));
                remainingOverflow = remainingOverflow.subtract(increaseToNextLevel);
                continue;
            }
            distributeOverflowEvenly(leastLoadedDays, remainingOverflow);
            return;
        }
    }

    private void distributeOverflowEvenly(
            List<Map.Entry<LocalDate, BigDecimal>> leastLoadedDays,
            BigDecimal remainingOverflow
    ) {
        BigDecimal perDay = remainingOverflow.divide(
                BigDecimal.valueOf(leastLoadedDays.size()), 12, java.math.RoundingMode.DOWN
        );
        BigDecimal assigned = BigDecimal.ZERO;
        for (int index = 0; index < leastLoadedDays.size(); index++) {
            BigDecimal additional = index == leastLoadedDays.size() - 1
                    ? remainingOverflow.subtract(assigned)
                    : perDay;
            Map.Entry<LocalDate, BigDecimal> entry = leastLoadedDays.get(index);
            entry.setValue(entry.getValue().add(additional));
            assigned = assigned.add(additional);
        }
    }

    private void extendCapacitiesAfterTarget(
            BigDecimal totalHours,
            LinkedHashMap<LocalDate, BigDecimal> capacities,
            LocalDate targetEndDate,
            AiStudySchedule schedule
    ) {
        BigDecimal capacity = capacities.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate date = targetEndDate.plusDays(1);
        while (capacity.compareTo(totalHours) < 0) {
            BigDecimal available = preferredDailyCapacity(schedule, date);
            if (available.signum() > 0) {
                capacities.put(date, available);
                capacity = capacity.add(available);
            }
            date = date.plusDays(1);
        }
    }

    private List<AiWbsDraftIssue> scheduleWarnings(
            AiWbsGenerationInput input,
            AiStudySchedule schedule,
            Map<LocalDate, BigDecimal> usedHours,
            Map<String, AiWbsDraftTask> tasksByKey
    ) {
        List<AiWbsDraftIssue> warnings = new ArrayList<>();
        usedHours.forEach((date, hours) -> {
            if (hours.compareTo(schedule.availableHours(date)) > 0) {
                warnings.add(new AiWbsDraftIssue(
                        "DAILY_AVAILABLE_HOURS_EXCEEDED",
                        "希望する1日あたり学習時間を超える日があります。",
                        date.toString()
                ));
            }
        });
        tasksByKey.values().stream()
                .filter(task -> task.plannedEndDate().isAfter(input.targetEndDate()))
                .forEach(task -> warnings.add(new AiWbsDraftIssue(
                        "TASK_OUTSIDE_PROJECT_PERIOD",
                        "プロジェクト期間外の予定を持つタスクがあります。",
                        task.temporaryKey()
                )));
        return List.copyOf(warnings);
    }

    private BigDecimal preferredDailyCapacity(AiStudySchedule schedule, LocalDate date) {
        return schedule.availableHours(date).min(HOURS_PER_DAY).max(BigDecimal.ZERO);
    }

    private String unusedGeneratedParentKey(Map<String, AiWbsOutlineNode> nodesByKey) {
        String candidate = "generated-parent";
        int suffix = 2;
        while (nodesByKey.containsKey(candidate)) {
            candidate = "generated-parent-" + suffix++;
        }
        return candidate;
    }

    private String abbreviateFromEnd(String value, int maximumLength) {
        int suffixLength = maximumLength - codePointCount(ABBREVIATION_PREFIX);
        int[] codePoints = value.codePoints().toArray();
        String suffix = new String(codePoints, codePoints.length - suffixLength, suffixLength);
        return ABBREVIATION_PREFIX + suffix;
    }

    private String truncateByCodePoints(String value, int maximumLength) {
        if (codePointCount(value) <= maximumLength) {
            return value;
        }
        int endIndex = value.offsetByCodePoints(0, maximumLength);
        return value.substring(0, endIndex);
    }

    private void requireText(String value, int maximumLength, String fieldName) {
        if (value == null || value.isBlank() || codePointCount(value) > maximumLength) {
            throw structureError("TEXT_FIELD_INVALID", fieldName + "は1〜" + maximumLength + "文字で必須です。");
        }
    }

    private int codePointCount(String value) {
        return value.codePointCount(0, value.length());
    }

    private AiStructuredOutputException structureError(String reasonCode, String message) {
        return new AiStructuredOutputException(reasonCode, message);
    }

    private record ValidatedOutline(
            Map<String, AiWbsOutlineNode> nodesByKey,
            Map<String, List<AiWbsOutlineNode>> childrenByParent
    ) {
    }

    private record FlattenedDraft(
            List<AiWbsDraftTask> tasks,
            List<AiWbsDraftIssue> warnings
    ) {
    }

    private record ScheduledDraft(
            List<AiWbsDraftTask> tasks,
            List<AiWbsDraftIssue> warnings,
            Map<LocalDate, BigDecimal> dailyPlannedHours
    ) {
    }
}
