package com.studypm.wbs;

import java.time.Instant;
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
 * LEAFタスク作成時と進捗率変更時の進捗履歴を保持する。
 */
@Entity
@Table(name = "wbs_task_progress_history")
public class WbsTaskProgressHistory {

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

    @Column(name = "progress_rate", nullable = false)
    private short progressRate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by_account_id", nullable = false)
    private Account changedByAccount;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    protected WbsTaskProgressHistory() {
    }

    private WbsTaskProgressHistory(WbsTask wbsTask, int progressRate, Account changedByAccount, Instant changedAt) {
        this.id = UUID.randomUUID();
        this.wbsTask = wbsTask;
        this.project = wbsTask.project();
        this.taskNameSnapshot = wbsTask.name();
        this.progressRate = (short) progressRate;
        this.changedByAccount = changedByAccount;
        this.changedAt = changedAt;
    }

    public static WbsTaskProgressHistory record(WbsTask wbsTask, int progressRate, Account changedByAccount, Instant changedAt) {
        return new WbsTaskProgressHistory(wbsTask, progressRate, changedByAccount, changedAt);
    }
}
