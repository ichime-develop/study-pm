package com.studypm.project;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * プロジェクト作成APIのリクエストボディを表す。
 */
public record ProjectCreateRequest(
        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 5000)
        String description,

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate targetEndDate
) {
    ProjectCreateCommand toCommand() {
        return new ProjectCreateCommand(name, description, startDate, targetEndDate);
    }
}
