package com.studypm.analysis;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.studypm.common.error.ResourceNotFoundException;
import com.studypm.project.Project;
import com.studypm.project.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 現在のWBS、学習記録、進捗履歴からMVP2のEVMとバーンダウンを都度集計する。
 */
@Service
public class AnalysisService {

    private static final ZoneId JST = ZoneId.of("Asia/Tokyo");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final int CALCULATION_SCALE = 12;

    private final ProjectRepository projectRepository;
    private final AnalysisQueryRepository analysisQueryRepository;
    private final Clock clock;

    public AnalysisService(
            ProjectRepository projectRepository,
            AnalysisQueryRepository analysisQueryRepository,
            Clock clock
    ) {
        this.projectRepository = projectRepository;
        this.analysisQueryRepository = analysisQueryRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public EvmAnalysisResponse evm(UUID accountId, UUID projectId) {
        Project project = findOwnedProject(accountId, projectId);
        LocalDate baseDate = baseDate();
        AnalysisInputs inputs = analysisInputs(project);
        if (!inputs.isCalculable()) {
            return EvmAnalysisResponse.unavailable(baseDate, inputs.unavailableReasons());
        }

        BigDecimal pv = plannedValue(inputs.tasks(), baseDate);
        BigDecimal ev = earnedValue(inputs.tasks());
        BigDecimal ac = analysisQueryRepository.actualHoursThrough(project.id(), baseDate);
        List<AnalysisUnavailableReason> reasons = new ArrayList<>();
        BigDecimal spi = null;
        BigDecimal cpi = null;
        if (pv.compareTo(BigDecimal.ZERO) == 0) {
            reasons.add(AnalysisUnavailableReason.ZERO_PLANNED_VALUE);
        } else {
            spi = ev.divide(pv, CALCULATION_SCALE, RoundingMode.HALF_UP);
        }
        if (ac.compareTo(BigDecimal.ZERO) == 0) {
            reasons.add(AnalysisUnavailableReason.ZERO_ACTUAL_HOURS);
        } else {
            cpi = ev.divide(ac, CALCULATION_SCALE, RoundingMode.HALF_UP);
        }
        return new EvmAnalysisResponse(
                baseDate,
                true,
                List.copyOf(reasons),
                inputs.bac(),
                pv,
                ev,
                ac,
                ev.subtract(pv),
                ev.subtract(ac),
                spi,
                cpi
        );
    }

    @Transactional(readOnly = true)
    public BurndownAnalysisResponse burndown(UUID accountId, UUID projectId) {
        Project project = findOwnedProject(accountId, projectId);
        LocalDate baseDate = baseDate();
        AnalysisInputs inputs = analysisInputs(project);
        if (!inputs.isCalculable()) {
            return BurndownAnalysisResponse.unavailable(baseDate, inputs.unavailableReasons());
        }

        List<BurndownPointResponse> idealPoints = idealPoints(project, inputs.bac());
        List<BurndownPointResponse> actualPoints = actualPoints(project, inputs.tasks(), baseDate, inputs.bac());
        BigDecimal idealRemainingHours = idealRemainingHours(project, inputs.bac(), baseDate);
        BigDecimal actualRemainingHours = inputs.bac().subtract(earnedValue(inputs.tasks())).max(BigDecimal.ZERO);
        BigDecimal workDifferenceHours = actualRemainingHours.subtract(idealRemainingHours);
        // analysisInputsでBACが正数であることを確認した後だけ、この除算に到達する。
        BigDecimal dailyPlannedHours = inputs.bac().divide(
                BigDecimal.valueOf(inclusiveDays(project.startDate(), project.targetEndDate())),
                CALCULATION_SCALE,
                RoundingMode.HALF_UP
        );
        BigDecimal dayDifference = workDifferenceHours.divide(dailyPlannedHours, CALCULATION_SCALE, RoundingMode.HALF_UP);
        return new BurndownAnalysisResponse(
                baseDate,
                true,
                List.of(),
                idealPoints,
                actualPoints,
                idealRemainingHours,
                actualRemainingHours,
                workDifferenceHours,
                dayDifference
        );
    }

    @Transactional(readOnly = true)
    public PlanWarningsResponse planWarnings(UUID accountId, UUID projectId) {
        Project project = findOwnedProject(accountId, projectId);
        List<PlanWarningResponse> warnings = new ArrayList<>();
        for (AnalysisTaskRow task : analysisQueryRepository.leafTasksFor(project.id())) {
            if (task.plannedStartDate() != null && task.plannedStartDate().isBefore(project.startDate())) {
                warnings.add(new PlanWarningResponse(
                        task.taskId(),
                        task.name(),
                        PlanWarningType.STARTS_BEFORE_PROJECT,
                        task.plannedStartDate(),
                        task.plannedEndDate(),
                        "予定開始日がプロジェクト開始日より前です。"
                ));
            }
            if (task.plannedEndDate() != null && task.plannedEndDate().isAfter(project.targetEndDate())) {
                warnings.add(new PlanWarningResponse(
                        task.taskId(),
                        task.name(),
                        PlanWarningType.ENDS_AFTER_PROJECT,
                        task.plannedStartDate(),
                        task.plannedEndDate(),
                        "予定終了日がプロジェクト目標終了日より後です。"
                ));
            }
        }
        warnings.sort(Comparator.comparing(PlanWarningResponse::taskName).thenComparing(PlanWarningResponse::type));
        return new PlanWarningsResponse(List.copyOf(warnings));
    }

    private AnalysisInputs analysisInputs(Project project) {
        List<AnalysisTaskRow> tasks = analysisQueryRepository.leafTasksFor(project.id());
        EnumSet<AnalysisUnavailableReason> reasons = EnumSet.noneOf(AnalysisUnavailableReason.class);
        if (tasks.isEmpty()) {
            reasons.add(AnalysisUnavailableReason.NO_LEAF_TASKS);
        }
        if (tasks.stream().anyMatch(task -> !task.hasSchedule())) {
            reasons.add(AnalysisUnavailableReason.MISSING_SCHEDULE);
        }
        BigDecimal bac = tasks.stream()
                .map(AnalysisTaskRow::plannedHours)
                .filter(hours -> hours != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (bac.compareTo(BigDecimal.ZERO) == 0) {
            reasons.add(AnalysisUnavailableReason.ZERO_PLANNED_HOURS);
        }
        return new AnalysisInputs(List.copyOf(tasks), bac, List.copyOf(reasons));
    }

    private BigDecimal plannedValue(List<AnalysisTaskRow> tasks, LocalDate baseDate) {
        return tasks.stream()
                .map(task -> plannedValueFor(task, baseDate))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal plannedValueFor(AnalysisTaskRow task, LocalDate baseDate) {
        if (baseDate.isBefore(task.plannedStartDate())) {
            return BigDecimal.ZERO;
        }
        if (!baseDate.isBefore(task.plannedEndDate())) {
            return task.plannedHours();
        }
        long elapsedDays = inclusiveDays(task.plannedStartDate(), baseDate);
        long plannedDays = inclusiveDays(task.plannedStartDate(), task.plannedEndDate());
        return task.plannedHours()
                .multiply(BigDecimal.valueOf(elapsedDays))
                .divide(BigDecimal.valueOf(plannedDays), CALCULATION_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal earnedValue(List<AnalysisTaskRow> tasks) {
        return tasks.stream()
                .map(task -> task.plannedHours()
                        .multiply(BigDecimal.valueOf(task.progressRate()))
                        .divide(ONE_HUNDRED, CALCULATION_SCALE, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<BurndownPointResponse> idealPoints(Project project, BigDecimal bac) {
        long totalDays = inclusiveDays(project.startDate(), project.targetEndDate());
        if (totalDays == 1) {
            return List.of(new BurndownPointResponse(project.startDate(), BigDecimal.ZERO));
        }
        List<BurndownPointResponse> points = new ArrayList<>();
        for (LocalDate date = project.startDate(); !date.isAfter(project.targetEndDate()); date = date.plusDays(1)) {
            points.add(new BurndownPointResponse(date, idealRemainingHours(project, bac, date)));
        }
        return List.copyOf(points);
    }

    private List<BurndownPointResponse> actualPoints(
            Project project,
            List<AnalysisTaskRow> tasks,
            LocalDate baseDate,
            BigDecimal bac
    ) {
        LocalDate endDate = baseDate.isBefore(project.startDate())
                ? project.startDate().minusDays(1)
                : baseDate.isAfter(project.targetEndDate()) ? project.targetEndDate() : baseDate;
        if (endDate.isBefore(project.startDate())) {
            return List.of();
        }
        Map<UUID, List<ProgressHistoryRow>> histories = historiesByTask(project.id());
        List<BurndownPointResponse> points = new ArrayList<>();
        for (LocalDate date = project.startDate(); !date.isAfter(endDate); date = date.plusDays(1)) {
            BigDecimal dailyEv = dailyEarnedValue(tasks, histories, date);
            points.add(new BurndownPointResponse(date, bac.subtract(dailyEv).max(BigDecimal.ZERO)));
        }
        return List.copyOf(points);
    }

    private Map<UUID, List<ProgressHistoryRow>> historiesByTask(UUID projectId) {
        Map<UUID, List<ProgressHistoryRow>> histories = new HashMap<>();
        for (ProgressHistoryRow history : analysisQueryRepository.progressHistoryFor(projectId)) {
            histories.computeIfAbsent(history.taskId(), ignored -> new ArrayList<>()).add(history);
        }
        return histories;
    }

    private BigDecimal dailyEarnedValue(
            List<AnalysisTaskRow> tasks,
            Map<UUID, List<ProgressHistoryRow>> histories,
            LocalDate date
    ) {
        Instant endOfDay = date.plusDays(1).atStartOfDay(JST).toInstant().minusNanos(1);
        return tasks.stream()
                .map(task -> task.plannedHours()
                        .multiply(BigDecimal.valueOf(progressRateAtEndOfDay(histories.get(task.taskId()), endOfDay)))
                        .divide(ONE_HUNDRED, CALCULATION_SCALE, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private int progressRateAtEndOfDay(List<ProgressHistoryRow> histories, Instant endOfDay) {
        if (histories == null) {
            return 0;
        }
        int progressRate = 0;
        for (ProgressHistoryRow history : histories) {
            if (history.changedAt().isAfter(endOfDay)) {
                break;
            }
            progressRate = history.progressRate();
        }
        return progressRate;
    }

    private BigDecimal idealRemainingHours(Project project, BigDecimal bac, LocalDate baseDate) {
        long totalDays = inclusiveDays(project.startDate(), project.targetEndDate());
        if (totalDays == 1) {
            return BigDecimal.ZERO;
        }
        long elapsedDays = Math.clamp(
                java.time.temporal.ChronoUnit.DAYS.between(project.startDate(), baseDate),
                0,
                totalDays - 1
        );
        BigDecimal progress = BigDecimal.valueOf(elapsedDays)
                .divide(BigDecimal.valueOf(totalDays - 1), CALCULATION_SCALE, RoundingMode.HALF_UP);
        return bac.multiply(BigDecimal.ONE.subtract(progress)).max(BigDecimal.ZERO);
    }

    private long inclusiveDays(LocalDate startDate, LocalDate endDate) {
        return java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }

    private LocalDate baseDate() {
        return LocalDate.now(clock.withZone(JST));
    }

    private Project findOwnedProject(UUID accountId, UUID projectId) {
        return projectRepository.findByIdAndAccount_Id(projectId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "PROJECT_NOT_FOUND",
                        "対象のプロジェクトが見つかりません。"
                ));
    }

    private record AnalysisInputs(
            List<AnalysisTaskRow> tasks,
            BigDecimal bac,
            List<AnalysisUnavailableReason> unavailableReasons
    ) {
        boolean isCalculable() {
            return unavailableReasons.isEmpty();
        }
    }
}
