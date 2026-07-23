package com.studypm.project;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * プロジェクト一覧の1行に表示する基本情報と集計値を表す。
 */
public record ProjectListItemResponse(
        UUID projectId,
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate,
        ProjectStatus status,
        BigDecimal plannedHours,
        BigDecimal actualHours,
        BigDecimal progressRate,
        boolean hasDelay,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectListItemResponse from(Project project, ProjectAggregate aggregate) {
        return new ProjectListItemResponse(
                project.id(),
                project.name(),
                project.description(),
                project.startDate(),
                project.targetEndDate(),
                project.status(),
                aggregate.plannedHours(),
                aggregate.actualHours(),
                aggregate.progressRate(),
                aggregate.hasDelay(),
                project.createdAt(),
                project.updatedAt()
        );
    }
}
