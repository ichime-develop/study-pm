package com.studypm.project;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * プロジェクト更新APIのリクエストボディを表す。
 */
public record ProjectUpdateRequest(
        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 5000)
        String description,

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate targetEndDate,

        @NotBlank
        String status
) {
    ProjectUpdateCommand toCommand() {
        return new ProjectUpdateCommand(name, description, startDate, targetEndDate, status);
    }
}
