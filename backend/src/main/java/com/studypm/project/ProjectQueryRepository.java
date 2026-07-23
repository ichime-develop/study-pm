package com.studypm.project;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Project CRUDに必要なWBS・学習記録の集計と削除をSQLで担当する。
 */
@Repository
public class ProjectQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ProjectQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ProjectAggregate aggregateFor(UUID projectId, LocalDate baseDate) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("projectId", projectId)
                .addValue("baseDate", baseDate);
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select
                    (select count(*)
                       from wbs_tasks
                      where project_id = :projectId
                        and task_type = 'LEAF') as leaf_count,
                    (select sum(planned_hours)
                       from wbs_tasks
                      where project_id = :projectId
                        and task_type = 'LEAF') as planned_hours,
                    (select sum(planned_hours * progress_rate)
                       from wbs_tasks
                      where project_id = :projectId
                        and task_type = 'LEAF') as weighted_progress,
                    (select coalesce(sum(study_hours), 0)
                       from study_logs
                      where project_id = :projectId) as actual_hours,
                    exists(
                        select 1
                          from wbs_tasks
                         where project_id = :projectId
                           and task_type = 'LEAF'
                           and planned_end_date < :baseDate
                           and progress_rate < 100
                    ) as has_delay
                """, parameters);
        long leafCount = number(row.get("leaf_count")).longValue();
        BigDecimal actualHours = decimal(row.get("actual_hours"));
        if (leafCount == 0) {
            return new ProjectAggregate(0, null, actualHours, BigDecimal.ZERO, null, false);
        }
        BigDecimal plannedHours = decimal(row.get("planned_hours"));
        BigDecimal weightedProgress = decimal(row.get("weighted_progress"));
        BigDecimal earnedValue = weightedProgress.divide(new BigDecimal("100"));
        BigDecimal progressRate = weightedProgress.divide(plannedHours, 4, RoundingMode.HALF_UP);
        boolean hasDelay = Boolean.TRUE.equals(row.get("has_delay"));
        return new ProjectAggregate(leafCount, plannedHours, actualHours, earnedValue, progressRate, hasDelay);
    }

    public ProjectCompletionStats completionStats(UUID projectId) {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                select
                    count(*) as leaf_count,
                    coalesce(sum(case when progress_rate = 100 then 1 else 0 end), 0) as completed_leaf_count
                  from wbs_tasks
                 where project_id = :projectId
                   and task_type = 'LEAF'
                """, new MapSqlParameterSource("projectId", projectId));
        return new ProjectCompletionStats(
                number(row.get("leaf_count")).longValue(),
                number(row.get("completed_leaf_count")).longValue()
        );
    }

    public List<LocalDate> distinctStudyDatesForProject(UUID projectId) {
        return jdbcTemplate.query("""
                select distinct study_date
                  from study_logs
                 where project_id = :projectId
                 order by study_date desc
                """,
                new MapSqlParameterSource("projectId", projectId),
                (resultSet, rowNumber) -> resultSet.getObject("study_date", LocalDate.class)
        );
    }

    public List<ProjectOverviewTaskRow> incompleteTasksForOverview(UUID projectId, LocalDate baseDate) {
        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("projectId", projectId)
                .addValue("baseDate", baseDate);
        return jdbcTemplate.query("""
                select
                    id,
                    name,
                    planned_end_date,
                    progress_rate,
                    (planned_end_date is not null
                        and planned_end_date < :baseDate
                        and progress_rate < 100) as has_delay
                  from wbs_tasks
                 where project_id = :projectId
                   and task_type = 'LEAF'
                   and progress_rate < 100
                 order by
                    case
                        when planned_end_date is not null
                         and planned_end_date < :baseDate then 0
                        else 1
                    end,
                    case when planned_end_date is null then 1 else 0 end,
                    planned_end_date asc,
                    created_at asc,
                    id asc
                """,
                parameters,
                (resultSet, rowNumber) -> new ProjectOverviewTaskRow(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("name"),
                        resultSet.getObject("planned_end_date", LocalDate.class),
                        resultSet.getInt("progress_rate"),
                        resultSet.getBoolean("has_delay")
                )
        );
    }

    public void deleteProjectData(UUID projectId) {
        MapSqlParameterSource parameters = new MapSqlParameterSource("projectId", projectId);
        jdbcTemplate.update("delete from study_logs where project_id = :projectId", parameters);
        jdbcTemplate.update("delete from wbs_task_plan_history where project_id = :projectId", parameters);
        jdbcTemplate.update("delete from wbs_task_progress_history where project_id = :projectId", parameters);
        jdbcTemplate.update("""
                delete from wbs_tasks
                 where project_id = :projectId
                   and task_type = 'LEAF'
                """, parameters);
        jdbcTemplate.update("""
                delete from wbs_tasks
                 where project_id = :projectId
                   and task_type = 'PARENT'
                """, parameters);
        jdbcTemplate.update("delete from project_period_history where project_id = :projectId", parameters);
    }

    private Number number(Object value) {
        return (Number) value;
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        return new BigDecimal(value.toString());
    }
}
