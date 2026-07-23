package com.studypm.wbs;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * WBS CRUDに必要な学習記録集計と削除可否判定をSQLで担当する。
 */
@Repository
public class WbsQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public WbsQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<UUID, WbsTaskMetrics> metricsFor(List<UUID> taskIds) {
        if (taskIds.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource("taskIds", taskIds);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                select wbs_task_id,
                       coalesce(sum(study_hours), 0) as actual_hours,
                       count(*) > 0 as has_study_logs
                  from study_logs
                 where wbs_task_id in (:taskIds)
                 group by wbs_task_id
                """, parameters);
        Map<UUID, WbsTaskMetrics> metrics = new HashMap<>();
        for (Map<String, Object> row : rows) {
            UUID taskId = (UUID) row.get("wbs_task_id");
            BigDecimal actualHours = (BigDecimal) row.get("actual_hours");
            boolean hasStudyLogs = Boolean.TRUE.equals(row.get("has_study_logs"));
            metrics.put(taskId, new WbsTaskMetrics(actualHours, hasStudyLogs));
        }
        return metrics;
    }

    public boolean hasStudyLogs(UUID taskId) {
        Boolean result = jdbcTemplate.queryForObject("""
                select exists(
                    select 1
                      from study_logs
                     where wbs_task_id = :taskId
                )
                """, new MapSqlParameterSource("taskId", taskId), Boolean.class);
        return Boolean.TRUE.equals(result);
    }

    public boolean hasStudyLogsUnderParent(UUID parentTaskId) {
        Boolean result = jdbcTemplate.queryForObject("""
                select exists(
                    select 1
                      from study_logs sl
                      join wbs_tasks wt on wt.id = sl.wbs_task_id
                     where wt.parent_wbs_task_id = :parentTaskId
                )
                """, new MapSqlParameterSource("parentTaskId", parentTaskId), Boolean.class);
        return Boolean.TRUE.equals(result);
    }
}
