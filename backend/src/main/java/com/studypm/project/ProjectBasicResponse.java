package com.studypm.project;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * プロジェクト基本情報APIが返すレスポンスを表す。
 */
public record ProjectBasicResponse(
        UUID projectId,
        String name,
        String description,
        LocalDate startDate,
        LocalDate targetEndDate,
        ProjectStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectBasicResponse from(Project project) {
        return new ProjectBasicResponse(
                project.id(),
                project.name(),
                project.description(),
                project.startDate(),
                project.targetEndDate(),
                project.status(),
                project.createdAt(),
                project.updatedAt()
        );
    }
}
