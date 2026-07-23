package com.studypm.summary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * ユーザー単位の学習時間、学習日、進行中プロジェクト件数をSQLで取得する。
 */
@Repository
public class StudySummaryQueryRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public StudySummaryQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public BigDecimal totalStudyHours(UUID accountId) {
        return jdbcTemplate.queryForObject("""
                select coalesce(sum(study_hours), 0)
                  from study_logs
                 where account_id = :accountId
                """, new MapSqlParameterSource("accountId", accountId), BigDecimal.class);
    }

    public List<LocalDate> distinctStudyDates(UUID accountId) {
        return jdbcTemplate.query("""
                select distinct study_date
                  from study_logs
                 where account_id = :accountId
                 order by study_date desc
                """,
                new MapSqlParameterSource("accountId", accountId),
                (resultSet, rowNumber) -> resultSet.getObject("study_date", LocalDate.class)
        );
    }

    public long inProgressProjectCount(UUID accountId) {
        Number count = jdbcTemplate.queryForObject("""
                select count(*)
                  from projects
                 where account_id = :accountId
                   and status = 'IN_PROGRESS'
                """, new MapSqlParameterSource("accountId", accountId), Number.class);
        return count.longValue();
    }
}
