package com.studypm.project;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.studypm.account.Account;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * プロジェクト開始日と目標終了日の変更履歴を表す。
 */
@Entity
@Table(name = "project_period_history")
public class ProjectPeriodHistory {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(name = "old_start_date", nullable = false)
    private LocalDate oldStartDate;

    @Column(name = "new_start_date", nullable = false)
    private LocalDate newStartDate;

    @Column(name = "old_target_end_date", nullable = false)
    private LocalDate oldTargetEndDate;

    @Column(name = "new_target_end_date", nullable = false)
    private LocalDate newTargetEndDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_account_id", nullable = false)
    private Account changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected ProjectPeriodHistory() {
    }

    private ProjectPeriodHistory(
            UUID id,
            Project project,
            LocalDate oldStartDate,
            LocalDate newStartDate,
            LocalDate oldTargetEndDate,
            LocalDate newTargetEndDate,
            Account changedBy,
            Instant changedAt
    ) {
        this.id = id;
        this.project = project;
        this.oldStartDate = oldStartDate;
        this.newStartDate = newStartDate;
        this.oldTargetEndDate = oldTargetEndDate;
        this.newTargetEndDate = newTargetEndDate;
        this.changedBy = changedBy;
        this.changedAt = changedAt;
    }

    public static ProjectPeriodHistory record(
            Project project,
            LocalDate oldStartDate,
            LocalDate newStartDate,
            LocalDate oldTargetEndDate,
            LocalDate newTargetEndDate,
            Account changedBy,
            Instant changedAt
    ) {
        return new ProjectPeriodHistory(
                UUID.randomUUID(),
                project,
                oldStartDate,
                newStartDate,
                oldTargetEndDate,
                newTargetEndDate,
                changedBy,
                changedAt
        );
    }

    public UUID id() {
        return id;
    }

    public Project project() {
        return project;
    }

    public LocalDate oldStartDate() {
        return oldStartDate;
    }

    public LocalDate newStartDate() {
        return newStartDate;
    }

    public LocalDate oldTargetEndDate() {
        return oldTargetEndDate;
    }

    public LocalDate newTargetEndDate() {
        return newTargetEndDate;
    }

    public Account changedBy() {
        return changedBy;
    }

    public Instant changedAt() {
        return changedAt;
    }
}
