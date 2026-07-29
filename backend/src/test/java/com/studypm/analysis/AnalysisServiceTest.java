package com.studypm.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.studypm.project.Project;
import com.studypm.project.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * AnalysisServiceのEVM、バーンダウン、算出不可条件を検証する。
 */
class AnalysisServiceTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final AnalysisQueryRepository queryRepository = mock(AnalysisQueryRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-08-10T03:00:00Z"), ZoneOffset.UTC);
    private final UUID accountId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final Project project = mock(Project.class);

    private AnalysisService service;

    @BeforeEach
    void setUp() {
        service = new AnalysisService(projectRepository, queryRepository, clock);
        when(projectRepository.findByIdAndAccount_Id(projectId, accountId)).thenReturn(Optional.of(project));
        when(project.id()).thenReturn(projectId);
        when(project.startDate()).thenReturn(LocalDate.parse("2026-08-01"));
        when(project.targetEndDate()).thenReturn(LocalDate.parse("2026-08-20"));
    }

    @Test
    void evmReturnsMetricsAndOnlyMakesCpiUnavailableWhenActualHoursAreZero() {
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of(
                task("2026-08-01", "2026-08-10", "10.00", 50),
                task("2026-08-11", "2026-08-20", "10.00", 0)
        ));
        when(queryRepository.actualHoursThrough(projectId, LocalDate.parse("2026-08-10"))).thenReturn(BigDecimal.ZERO);

        EvmAnalysisResponse response = service.evm(accountId, projectId);

        assertThat(response.isCalculable()).isTrue();
        assertThat(response.bac()).isEqualByComparingTo("20.00");
        assertThat(response.pv()).isEqualByComparingTo("10.00");
        assertThat(response.ev()).isEqualByComparingTo("5.00");
        assertThat(response.ac()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.sv()).isEqualByComparingTo("-5.00");
        assertThat(response.cv()).isEqualByComparingTo("5.00");
        assertThat(response.spi()).isEqualByComparingTo("0.50");
        assertThat(response.cpi()).isNull();
        assertThat(response.unavailableReasons()).containsExactly(AnalysisUnavailableReason.ZERO_ACTUAL_HOURS);
    }

    @Test
    void evmReturnsWholeUnavailableStateWhenAnyLeafDoesNotHaveSchedule() {
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of(
                task(null, null, "10.00", 0)
        ));

        EvmAnalysisResponse response = service.evm(accountId, projectId);

        assertThat(response.isCalculable()).isFalse();
        assertThat(response.unavailableReasons()).containsExactly(AnalysisUnavailableReason.MISSING_SCHEDULE);
        assertThat(response.bac()).isNull();
        assertThat(response.spi()).isNull();
    }

    @Test
    void evmReturnsWholeUnavailableStateWhenThereAreNoLeafTasks() {
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of());

        EvmAnalysisResponse response = service.evm(accountId, projectId);

        assertThat(response.isCalculable()).isFalse();
        assertThat(response.unavailableReasons()).containsExactlyInAnyOrder(
                AnalysisUnavailableReason.NO_LEAF_TASKS,
                AnalysisUnavailableReason.ZERO_PLANNED_HOURS
        );
    }

    @Test
    void burndownUsesEndOfDayProgressHistoryForActualLine() {
        UUID taskId = UUID.randomUUID();
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of(new AnalysisTaskRow(
                taskId,
                "Task",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-20"),
                new BigDecimal("20.00"),
                50
        )));
        when(queryRepository.progressHistoryFor(projectId)).thenReturn(List.of(
                new ProgressHistoryRow(taskId, 25, Instant.parse("2026-08-05T10:00:00Z")),
                new ProgressHistoryRow(taskId, 50, Instant.parse("2026-08-10T01:00:00Z"))
        ));

        BurndownAnalysisResponse response = service.burndown(accountId, projectId);

        assertThat(response.isCalculable()).isTrue();
        assertThat(response.idealPoints()).hasSize(20);
        assertThat(response.actualPoints()).hasSize(10);
        assertThat(response.actualPoints().get(4).remainingHours()).isEqualByComparingTo("15.00");
        assertThat(response.actualPoints().get(9).remainingHours()).isEqualByComparingTo("10.00");
    }

    @Test
    void burndownSummaryUsesTheSameIdealRemainingValueAsTheChartAtProjectBoundaries() {
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of(
                task("2026-08-01", "2026-08-20", "20.00", 0)
        ));
        when(queryRepository.progressHistoryFor(projectId)).thenReturn(List.of());

        service = new AnalysisService(
                projectRepository,
                queryRepository,
                Clock.fixed(Instant.parse("2026-08-01T03:00:00Z"), ZoneOffset.UTC)
        );
        BurndownAnalysisResponse startResponse = service.burndown(accountId, projectId);

        assertThat(startResponse.idealRemainingHours()).isEqualByComparingTo("20.00");
        assertThat(startResponse.idealPoints().getFirst().remainingHours()).isEqualByComparingTo(
                startResponse.idealRemainingHours()
        );

        service = new AnalysisService(
                projectRepository,
                queryRepository,
                Clock.fixed(Instant.parse("2026-08-20T03:00:00Z"), ZoneOffset.UTC)
        );
        BurndownAnalysisResponse endResponse = service.burndown(accountId, projectId);

        assertThat(endResponse.idealRemainingHours()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(endResponse.idealPoints().getLast().remainingHours()).isEqualByComparingTo(
                endResponse.idealRemainingHours()
        );
    }

    @Test
    void planWarningsReturnsBothKindsForAProjectOutsideTask() {
        when(queryRepository.leafTasksFor(projectId)).thenReturn(List.of(
                task("2026-07-31", "2026-08-21", "10.00", 0)
        ));

        PlanWarningsResponse response = service.planWarnings(accountId, projectId);

        assertThat(response.warnings()).extracting(PlanWarningResponse::type).containsExactly(
                PlanWarningType.STARTS_BEFORE_PROJECT,
                PlanWarningType.ENDS_AFTER_PROJECT
        );
    }

    private AnalysisTaskRow task(String startDate, String endDate, String plannedHours, int progressRate) {
        return new AnalysisTaskRow(
                UUID.randomUUID(),
                "Task",
                startDate == null ? null : LocalDate.parse(startDate),
                endDate == null ? null : LocalDate.parse(endDate),
                new BigDecimal(plannedHours),
                progressRate
        );
    }
}
