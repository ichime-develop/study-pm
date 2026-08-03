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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

/**
 * AI出力を通常WBSへ保存可能な2階層下書きへ限定し、計画警告を算出する。
 */
@Component
public class AiWbsDraftValidator {

    private static final BigDecimal QUARTER_HOUR = new BigDecimal("0.25");
    private static final BigDecimal HOURS_PER_DAY = BigDecimal.valueOf(24);
    private final ObjectMapper objectMapper;

    public AiWbsDraftValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public AiValidatedWbsDraft validate(AiWbsGenerationInput input, AiWbsDraftProposal proposal) {
        validateProject(input, proposal);
        Map<String, AiWbsDraftTask> tasksByKey = validateTaskFields(proposal.tasks());
        Set<String> sourceKeys = input.sources().stream()
                .map(AiWbsGenerationSource::temporaryKey)
                .collect(java.util.stream.Collectors.toSet());
        validateReferences(proposal.tasks(), tasksByKey, sourceKeys);
        validateSplitUnit(input.constraints(), proposal.wbsSplitUnit());

        AiStudySchedule schedule = studySchedule(input.constraints());
        ArrayNode warnings = objectMapper.createArrayNode();
        DailyAllocation allocation = allocateDailyPlannedHours(input, proposal.tasks(), schedule);
        warnings.addAll(allocation.warnings());
        Map<LocalDate, BigDecimal> dailyPlannedHours = allocation.dailyHours();
        validateDailyMaximum(dailyPlannedHours);
        addAvailableHoursWarnings(dailyPlannedHours, schedule, warnings);
        ArrayNode relaxationOptions = relaxationOptions(input, proposal.tasks(), dailyPlannedHours, schedule, warnings);
        AiPlanDraftValidationStatus status = warnings.isEmpty()
                ? AiPlanDraftValidationStatus.VALID
                : AiPlanDraftValidationStatus.WARNING;
        return new AiValidatedWbsDraft(
                proposal,
                objectMapper.valueToTree(proposal.tasks()),
                status,
                warnings,
                relaxationOptions
        );
    }

    private void validateProject(AiWbsGenerationInput input, AiWbsDraftProposal proposal) {
        if (proposal == null || proposal.project() == null) {
            throw structureError("projectは必須です。");
        }
        AiWbsDraftProject project = proposal.project();
        requireText(project.name(), 100, "project.name");
        if (project.description() == null || project.description().length() > 5000) {
            throw structureError("project.descriptionは5,000文字以下で必須です。");
        }
        if (project.startDate() == null || project.targetEndDate() == null
                || project.startDate().isAfter(project.targetEndDate())) {
            throw structureError("projectの期間が正しくありません。");
        }
        if (!project.startDate().equals(input.startDate()) || !project.targetEndDate().equals(input.targetEndDate())) {
            throw structureError("projectの期間は生成依頼の期間と一致させてください。");
        }
    }

    private Map<String, AiWbsDraftTask> validateTaskFields(List<AiWbsDraftTask> tasks) {
        if (tasks == null || tasks.isEmpty()) {
            throw structureError("tasksには1件以上のタスクが必要です。");
        }
        Map<String, AiWbsDraftTask> tasksByKey = new HashMap<>();
        int leafCount = 0;
        for (AiWbsDraftTask task : tasks) {
            if (task == null || task.taskType() == null) {
                throw structureError("各taskのtaskTypeは必須です。");
            }
            requireText(task.temporaryKey(), 100, "task.temporaryKey");
            requireText(task.name(), 100, "task.name");
            if (task.description() == null || task.description().length() > 5000) {
                throw structureError("task.descriptionは5,000文字以下で必須です。");
            }
            if (tasksByKey.putIfAbsent(task.temporaryKey(), task) != null) {
                throw structureError("task.temporaryKeyは重複できません。");
            }
            if (task.taskType() == AiDraftTaskType.PARENT) {
                validateParent(task);
            } else {
                validateLeaf(task);
                leafCount++;
            }
        }
        if (leafCount == 0) {
            throw structureError("LEAFタスクが1件以上必要です。");
        }
        return tasksByKey;
    }

    private void validateParent(AiWbsDraftTask task) {
        if (task.parentTemporaryKey() != null
                || task.plannedStartDate() != null
                || task.plannedEndDate() != null
                || task.plannedHours() != null
                || !task.sourceTemporaryKeys().isEmpty()) {
            throw structureError("PARENTは親参照、予定日、予定工数、入力元参照を持てません。");
        }
    }

    private void validateLeaf(AiWbsDraftTask task) {
        if (task.parentTemporaryKey() == null || task.parentTemporaryKey().isBlank()) {
            throw structureError("LEAFのparentTemporaryKeyは必須です。");
        }
        if (task.plannedStartDate() == null || task.plannedEndDate() == null
                || task.plannedStartDate().isAfter(task.plannedEndDate())) {
            throw structureError("LEAFの予定開始日と予定終了日を正しく設定してください。");
        }
        BigDecimal hours = task.plannedHours();
        if (hours == null || hours.compareTo(QUARTER_HOUR) < 0 || hours.remainder(QUARTER_HOUR).signum() != 0) {
            throw structureError("LEAFの予定工数は0.25時間以上かつ0.25時間単位にしてください。");
        }
        if (task.sourceTemporaryKeys().isEmpty()) {
            throw structureError("LEAFには1件以上のsourceTemporaryKeysが必要です。");
        }
    }

    private void validateReferences(
            List<AiWbsDraftTask> tasks,
            Map<String, AiWbsDraftTask> tasksByKey,
            Set<String> sourceKeys
    ) {
        for (AiWbsDraftTask task : tasks) {
            if (task.taskType() != AiDraftTaskType.LEAF) {
                continue;
            }
            AiWbsDraftTask parent = tasksByKey.get(task.parentTemporaryKey());
            if (parent == null || parent.taskType() != AiDraftTaskType.PARENT) {
                throw structureError("LEAFの親参照は同じ下書き内のPARENTを指定してください。");
            }
            Set<String> uniqueSourceKeys = new HashSet<>();
            for (String sourceKey : task.sourceTemporaryKeys()) {
                if (sourceKey == null || !uniqueSourceKeys.add(sourceKey) || !sourceKeys.contains(sourceKey)) {
                    throw structureError("LEAFの入力元参照が存在しないか重複しています。");
                }
            }
        }
    }

    private void validateSplitUnit(JsonNode constraints, WbsSplitUnit actualUnit) {
        WbsSplitUnit expectedUnit;
        try {
            expectedUnit = WbsSplitUnit.valueOf(constraints.path("wbsSplitUnit").asText("SECTION"));
        } catch (IllegalArgumentException exception) {
            throw structureError("生成依頼のwbsSplitUnitが正しくありません。");
        }
        if (actualUnit != expectedUnit) {
            throw structureError("wbsSplitUnitは生成依頼の指定値と一致させてください。");
        }
        if (actualUnit == WbsSplitUnit.PAGE) {
            AiQuantityCondition quantity;
            try {
                quantity = AiQuantityCondition.from(constraints).orElse(null);
            } catch (IllegalArgumentException exception) {
                throw structureError("PAGE分割の数量条件が正しくありません。");
            }
            if (quantity == null || !"ページ".equals(quantity.unit())) {
                throw structureError("PAGE分割にはページ単位の数量条件が必要です。");
            }
        }
    }

    private DailyAllocation allocateDailyPlannedHours(
            AiWbsGenerationInput input,
            List<AiWbsDraftTask> tasks,
            AiStudySchedule schedule
    ) {
        Map<LocalDate, BigDecimal> result = new HashMap<>();
        List<ObjectNode> warnings = new ArrayList<>();
        for (AiWbsDraftTask task : tasks) {
            if (task.taskType() != AiDraftTaskType.LEAF) {
                continue;
            }
            if (task.plannedStartDate().isBefore(input.startDate()) || task.plannedEndDate().isAfter(input.targetEndDate())) {
                warnings.add(issue(
                        "TASK_OUTSIDE_PROJECT_PERIOD",
                        "プロジェクト期間外の予定を持つタスクがあります。",
                        task.temporaryKey()
                ));
            }
            List<LocalDate> availableDates = task.plannedStartDate().datesUntil(task.plannedEndDate().plusDays(1))
                    .filter(date -> schedule.availableHours(date).signum() > 0)
                    .toList();
            if (availableDates.isEmpty()) {
                throw new AiDraftBusinessValidationException("利用可能日がないLEAFタスクは保存できません。");
            }
            BigDecimal dailyHours = task.plannedHours().divide(
                    BigDecimal.valueOf(availableDates.size()),
                    12,
                    java.math.RoundingMode.HALF_UP
            );
            for (LocalDate date : availableDates) {
                result.merge(date, dailyHours, BigDecimal::add);
            }
        }
        return new DailyAllocation(Map.copyOf(result), List.copyOf(warnings));
    }

    private void validateDailyMaximum(Map<LocalDate, BigDecimal> dailyPlannedHours) {
        if (dailyPlannedHours.values().stream().anyMatch(hours -> hours.compareTo(HOURS_PER_DAY) > 0)) {
            throw new AiDraftBusinessValidationException(
                    "AI_DRAFT_DAILY_LIMIT_EXCEEDED",
                    "1日の予定工数が24時間を超える下書きは保存できません。"
            );
        }
    }

    private void addAvailableHoursWarnings(
            Map<LocalDate, BigDecimal> dailyPlannedHours,
            AiStudySchedule schedule,
            ArrayNode warnings
    ) {
        for (Map.Entry<LocalDate, BigDecimal> entry : dailyPlannedHours.entrySet()) {
            BigDecimal available = schedule.availableHours(entry.getKey());
            if (entry.getValue().compareTo(available) > 0) {
                warnings.add(issue(
                        "DAILY_AVAILABLE_HOURS_EXCEEDED",
                        "希望する1日あたり学習時間を超える日があります。",
                        entry.getKey().toString()
                ));
            }
        }
    }

    private ArrayNode relaxationOptions(
            AiWbsGenerationInput input,
            List<AiWbsDraftTask> tasks,
            Map<LocalDate, BigDecimal> dailyPlannedHours,
            AiStudySchedule schedule,
            ArrayNode warnings
    ) {
        ArrayNode options = objectMapper.createArrayNode();
        if (warnings.isEmpty()) {
            return options;
        }
        Set<String> warningCodes = warningCodes(warnings);
        Map<String, ObjectNode> optionsByCode = new LinkedHashMap<>();
        if (warningCodes.contains("TASK_OUTSIDE_PROJECT_PERIOD")) {
            optionsByCode.put(
                    "ADJUST_PROJECT_PERIOD",
                    option("ADJUST_PROJECT_PERIOD", "プロジェクト期間をタスクの予定期間に合わせて広げる")
            );
        }
        if (!warningCodes.contains("DAILY_AVAILABLE_HOURS_EXCEEDED")) {
            optionsByCode.values().stream().limit(3).forEach(options::add);
            return options;
        }
        BigDecimal maximumDailyHours = dailyPlannedHours.values().stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        optionsByCode.put("INCREASE_AVAILABLE_HOURS", option(
                "INCREASE_AVAILABLE_HOURS",
                "平日または土日の学習可能時間を最大" + displayHours(maximumDailyHours) + "時間まで増やす"
        ));
        optionsByCode.put(
                "EXTEND_TARGET_END_DATE",
                option("EXTEND_TARGET_END_DATE", "目標終了日を延長して学習可能日を増やす")
        );
        BigDecimal totalPlannedHours = tasks.stream()
                .filter(task -> task.taskType() == AiDraftTaskType.LEAF)
                .map(AiWbsDraftTask::plannedHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal availableCapacity = input.startDate().datesUntil(input.targetEndDate().plusDays(1))
                .map(schedule::availableHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal reduction = totalPlannedHours.subtract(availableCapacity).max(BigDecimal.ZERO);
        optionsByCode.put("REDUCE_SCOPE", option(
                "REDUCE_SCOPE",
                reduction.signum() > 0
                        ? "学習範囲を減らし、予定工数を少なくとも" + displayHours(reduction) + "時間減らす"
                        : "学習範囲を減らして1日あたりの負荷を下げる"
        ));
        optionsByCode.values().stream().limit(3).forEach(options::add);
        return options;
    }

    private Set<String> warningCodes(ArrayNode warnings) {
        Set<String> result = new HashSet<>();
        warnings.forEach(warning -> result.add(warning.path("code").asText()));
        return result;
    }

    private ObjectNode issue(String code, String message, String target) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("code", code);
        result.put("message", message);
        result.put("target", target);
        return result;
    }

    private ObjectNode option(String code, String message) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("code", code);
        result.put("message", message);
        return result;
    }

    private AiStudySchedule studySchedule(JsonNode constraints) {
        try {
            return AiStudySchedule.from(constraints);
        } catch (IllegalArgumentException exception) {
            throw structureError("学習可能時間または学習できない曜日が正しくありません。");
        }
    }

    private void requireText(String value, int maximumLength, String fieldName) {
        if (value == null || value.isBlank() || value.length() > maximumLength) {
            throw structureError(fieldName + "は1〜" + maximumLength + "文字で必須です。");
        }
    }

    private String displayHours(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private AiStructuredOutputException structureError(String message) {
        return new AiStructuredOutputException(message);
    }

    private record DailyAllocation(Map<LocalDate, BigDecimal> dailyHours, List<ObjectNode> warnings) {
    }
}
