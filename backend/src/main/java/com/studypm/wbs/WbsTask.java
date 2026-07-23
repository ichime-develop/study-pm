package com.studypm.wbs;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.studypm.project.Project;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 親タスクとLEAFタスクを単一テーブルで表すWBSの構成要素。
 */
@Entity
@Table(name = "wbs_tasks")
public class WbsTask {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_wbs_task_id")
    private WbsTask parentWbsTask;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 10)
    private WbsTaskType taskType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 5000)
    private String description;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @Column(name = "planned_hours", precision = 6, scale = 2)
    private BigDecimal plannedHours;

    @Column(name = "progress_rate")
    private Short progressRate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WbsTask() {
    }

    private WbsTask(
            UUID id,
            Project project,
            WbsTask parentWbsTask,
            WbsTaskType taskType,
            String name,
            String description,
            LocalDate plannedStartDate,
            LocalDate plannedEndDate,
            BigDecimal plannedHours,
            Short progressRate,
            Instant now
    ) {
        this.id = id;
        this.project = project;
        this.parentWbsTask = parentWbsTask;
        this.taskType = taskType;
        this.name = name;
        this.description = description;
        this.plannedStartDate = plannedStartDate;
        this.plannedEndDate = plannedEndDate;
        this.plannedHours = plannedHours;
        this.progressRate = progressRate;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static WbsTask createParent(Project project, String name, String description, Instant now) {
        return new WbsTask(
                UUID.randomUUID(),
                project,
                null,
                WbsTaskType.PARENT,
                name,
                description,
                null,
                null,
                null,
                null,
                now
        );
    }

    public static WbsTask createLeaf(
            Project project,
            WbsTask parentWbsTask,
            String name,
            String description,
            LocalDate plannedStartDate,
            LocalDate plannedEndDate,
            BigDecimal plannedHours,
            Instant now
    ) {
        return new WbsTask(
                UUID.randomUUID(),
                project,
                parentWbsTask,
                WbsTaskType.LEAF,
                name,
                description,
                plannedStartDate,
                plannedEndDate,
                plannedHours,
                (short) 0,
                now
        );
    }

    public void updateParent(String name, String description, Instant now) {
        this.name = name;
        this.description = description;
        this.updatedAt = now;
    }

    public void updateLeaf(
            WbsTask parentWbsTask,
            String name,
            String description,
            LocalDate plannedStartDate,
            LocalDate plannedEndDate,
            BigDecimal plannedHours,
            Instant now
    ) {
        this.parentWbsTask = parentWbsTask;
        this.name = name;
        this.description = description;
        this.plannedStartDate = plannedStartDate;
        this.plannedEndDate = plannedEndDate;
        this.plannedHours = plannedHours;
        this.updatedAt = now;
    }

    public void updateProgress(int progressRate, Instant now) {
        this.progressRate = (short) progressRate;
        this.updatedAt = now;
    }

    public UUID id() {
        return id;
    }

    public Project project() {
        return project;
    }

    public WbsTask parentWbsTask() {
        return parentWbsTask;
    }

    public UUID parentTaskId() {
        return parentWbsTask == null ? null : parentWbsTask.id();
    }

    public WbsTaskType taskType() {
        return taskType;
    }

    public boolean isParent() {
        return taskType == WbsTaskType.PARENT;
    }

    public boolean isLeaf() {
        return taskType == WbsTaskType.LEAF;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public LocalDate plannedStartDate() {
        return plannedStartDate;
    }

    public LocalDate plannedEndDate() {
        return plannedEndDate;
    }

    public BigDecimal plannedHours() {
        return plannedHours;
    }

    public Integer progressRate() {
        return progressRate == null ? null : progressRate.intValue();
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
