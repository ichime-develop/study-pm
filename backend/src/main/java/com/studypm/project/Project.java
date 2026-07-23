package com.studypm.project;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.studypm.account.Account;
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
 * 学習期間と状態を持つ学習プロジェクトを表す。
 */
@Entity
@Table(name = "projects")
public class Project {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 5000)
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_end_date", nullable = false)
    private LocalDate targetEndDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Project() {
    }

    private Project(
            UUID id,
            Account account,
            String name,
            String description,
            LocalDate startDate,
            LocalDate targetEndDate,
            Instant now
    ) {
        this.id = id;
        this.account = account;
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.targetEndDate = targetEndDate;
        this.status = ProjectStatus.NOT_STARTED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static Project create(
            Account account,
            String name,
            String description,
            LocalDate startDate,
            LocalDate targetEndDate,
            Instant now
    ) {
        return new Project(UUID.randomUUID(), account, name, description, startDate, targetEndDate, now);
    }

    public void update(
            String name,
            String description,
            LocalDate startDate,
            LocalDate targetEndDate,
            ProjectStatus status,
            Instant now
    ) {
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.targetEndDate = targetEndDate;
        this.status = status;
        this.updatedAt = now;
    }

    public UUID id() {
        return id;
    }

    public Account account() {
        return account;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public LocalDate startDate() {
        return startDate;
    }

    public LocalDate targetEndDate() {
        return targetEndDate;
    }

    public ProjectStatus status() {
        return status;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
