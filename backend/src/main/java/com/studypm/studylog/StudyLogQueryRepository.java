package com.studypm.studylog;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * 学習記録CRUDの再計算サマリーをSQLで取得する。
 */
@Repository
public class StudyLogQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public StudyLogQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public BigDecimal actualHoursForProject(UUID projectId) {
        return jdbcTemplate.queryForObject("""
                select coalesce(sum(study_hours), 0)
                  from study_logs
                 where project_id = :projectId
                """, new MapSqlParameterSource("projectId", projectId), BigDecimal.class);
    }

    public BigDecimal actualHoursForTask(UUID wbsTaskId) {
        return jdbcTemplate.queryForObject("""
                select coalesce(sum(study_hours), 0)
                  from study_logs
                 where wbs_task_id = :wbsTaskId
                """, new MapSqlParameterSource("wbsTaskId", wbsTaskId), BigDecimal.class);
    }

    public BigDecimal totalStudyHours(UUID projectId, UUID wbsTaskId) {
        if (wbsTaskId == null) {
            return actualHoursForProject(projectId);
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("projectId", projectId)
                .addValue("wbsTaskId", wbsTaskId);
        return jdbcTemplate.queryForObject("""
                select coalesce(sum(study_hours), 0)
                  from study_logs
                 where project_id = :projectId
                   and wbs_task_id = :wbsTaskId
                """, parameters, BigDecimal.class);
    }
}
