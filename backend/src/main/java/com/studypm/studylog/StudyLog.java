package com.studypm.studylog;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.studypm.account.Account;
import com.studypm.project.Project;
import com.studypm.wbs.WbsTask;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 学習日、対象LEAFタスク、学習時間、任意メモを持つ学習実績を表す。
 */
@Entity
@Table(name = "study_logs")
public class StudyLog {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wbs_task_id", nullable = false)
    private WbsTask wbsTask;

    @Column(name = "study_date", nullable = false)
    private LocalDate studyDate;

    @Column(name = "study_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal studyHours;

    @Column(length = 5000)
    private String memo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected StudyLog() {
    }

    private StudyLog(
            UUID id,
            Account account,
            Project project,
            WbsTask wbsTask,
            LocalDate studyDate,
            BigDecimal studyHours,
            String memo,
            Instant now
    ) {
        this.id = id;
        this.account = account;
        this.project = project;
        this.wbsTask = wbsTask;
        this.studyDate = studyDate;
        this.studyHours = studyHours;
        this.memo = memo;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static StudyLog record(
            Account account,
            Project project,
            WbsTask wbsTask,
            LocalDate studyDate,
            BigDecimal studyHours,
            String memo,
            Instant now
    ) {
        return new StudyLog(UUID.randomUUID(), account, project, wbsTask, studyDate, studyHours, memo, now);
    }

    public void update(WbsTask wbsTask, LocalDate studyDate, BigDecimal studyHours, String memo, Instant now) {
        this.wbsTask = wbsTask;
        this.studyDate = studyDate;
        this.studyHours = studyHours;
        this.memo = memo;
        this.updatedAt = now;
    }

    public UUID id() {
        return id;
    }

    public Account account() {
        return account;
    }

    public Project project() {
        return project;
    }

    public WbsTask wbsTask() {
        return wbsTask;
    }

    public LocalDate studyDate() {
        return studyDate;
    }

    public BigDecimal studyHours() {
        return studyHours;
    }

    public String memo() {
        return memo;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
