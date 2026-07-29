package com.studypm.analysis;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * EVM、バーンダウン、計画不整合の集計用読み取りをSQLで担当する。
 */
@Repository
public class AnalysisQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public AnalysisQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<AnalysisTaskRow> leafTasksFor(UUID projectId) {
        return jdbcTemplate.query("""
                select id, name, planned_start_date, planned_end_date, planned_hours, progress_rate
                  from wbs_tasks
                 where project_id = :projectId
                   and task_type = 'LEAF'
                 order by id
                """, new MapSqlParameterSource("projectId", projectId), (resultSet, rowNum) -> new AnalysisTaskRow(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("name"),
                resultSet.getObject("planned_start_date", LocalDate.class),
                resultSet.getObject("planned_end_date", LocalDate.class),
                resultSet.getBigDecimal("planned_hours"),
                resultSet.getInt("progress_rate")
        ));
    }

    public BigDecimal actualHoursThrough(UUID projectId, LocalDate baseDate) {
        BigDecimal actualHours = jdbcTemplate.queryForObject("""
                select coalesce(sum(study_hours), 0)
                  from study_logs
                 where project_id = :projectId
                   and study_date <= :baseDate
                """, new MapSqlParameterSource()
                .addValue("projectId", projectId)
                .addValue("baseDate", baseDate), BigDecimal.class);
        return actualHours == null ? BigDecimal.ZERO : actualHours;
    }

    public List<ProgressHistoryRow> progressHistoryFor(UUID projectId) {
        return jdbcTemplate.query("""
                select wbs_task_id, progress_rate, changed_at
                  from wbs_task_progress_history
                 where project_id = :projectId
                   and wbs_task_id is not null
                 order by wbs_task_id, changed_at, id
                """, new MapSqlParameterSource("projectId", projectId), (resultSet, rowNum) -> new ProgressHistoryRow(
                resultSet.getObject("wbs_task_id", UUID.class),
                resultSet.getInt("progress_rate"),
                resultSet.getTimestamp("changed_at").toInstant()
        ));
    }
}
