package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.project.Project;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * LEAFタスクの親・予定日・予定工数の変更履歴を保持する。
 */
@Entity
@Table(name = "wbs_task_plan_history")
public class WbsTaskPlanHistory {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wbs_task_id")
    private WbsTask wbsTask;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "task_name_snapshot", nullable = false, length = 100)
    private String taskNameSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_parent_wbs_task_id")
    private WbsTask oldParentWbsTask;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_parent_wbs_task_id")
    private WbsTask newParentWbsTask;

    @Column(name = "old_planned_start_date")
    private LocalDate oldPlannedStartDate;

    @Column(name = "new_planned_start_date")
    private LocalDate newPlannedStartDate;

    @Column(name = "old_planned_end_date")
    private LocalDate oldPlannedEndDate;

    @Column(name = "new_planned_end_date")
    private LocalDate newPlannedEndDate;

    @Column(name = "old_planned_hours", precision = 6, scale = 2)
    private BigDecimal oldPlannedHours;

    @Column(name = "new_planned_hours", precision = 6, scale = 2)
    private BigDecimal newPlannedHours;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_account_id", nullable = false)
    private Account changedByAccount;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected WbsTaskPlanHistory() {
    }

    private WbsTaskPlanHistory(
            WbsTask wbsTask,
            WbsTask oldParentWbsTask,
            WbsTask newParentWbsTask,
            LocalDate oldPlannedStartDate,
            LocalDate newPlannedStartDate,
            LocalDate oldPlannedEndDate,
            LocalDate newPlannedEndDate,
            BigDecimal oldPlannedHours,
            BigDecimal newPlannedHours,
            Account changedByAccount,
            Instant changedAt
    ) {
        this.id = UUID.randomUUID();
        this.wbsTask = wbsTask;
        this.project = wbsTask.project();
        this.taskNameSnapshot = wbsTask.name();
        this.oldParentWbsTask = oldParentWbsTask;
        this.newParentWbsTask = newParentWbsTask;
        this.oldPlannedStartDate = oldPlannedStartDate;
        this.newPlannedStartDate = newPlannedStartDate;
        this.oldPlannedEndDate = oldPlannedEndDate;
        this.newPlannedEndDate = newPlannedEndDate;
        this.oldPlannedHours = oldPlannedHours;
        this.newPlannedHours = newPlannedHours;
        this.changedByAccount = changedByAccount;
        this.changedAt = changedAt;
    }

    public static WbsTaskPlanHistory record(
            WbsTask wbsTask,
            WbsTask oldParentWbsTask,
            WbsTask newParentWbsTask,
            LocalDate oldPlannedStartDate,
            LocalDate newPlannedStartDate,
            LocalDate oldPlannedEndDate,
            LocalDate newPlannedEndDate,
            BigDecimal oldPlannedHours,
            BigDecimal newPlannedHours,
            Account changedByAccount,
            Instant changedAt
    ) {
        return new WbsTaskPlanHistory(
                wbsTask,
                oldParentWbsTask,
                newParentWbsTask,
                oldPlannedStartDate,
                newPlannedStartDate,
                oldPlannedEndDate,
                newPlannedEndDate,
                oldPlannedHours,
                newPlannedHours,
                changedByAccount,
                changedAt
        );
    }
}
