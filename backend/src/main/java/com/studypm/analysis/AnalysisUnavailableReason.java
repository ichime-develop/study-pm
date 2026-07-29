package com.studypm.analysis;

/**
 * EVMとバーンダウンを算出できない業務上の理由を表す。
 */
public enum AnalysisUnavailableReason {
    NO_LEAF_TASKS,
    MISSING_SCHEDULE,
    ZERO_PLANNED_HOURS,
    ZERO_PLANNED_VALUE,
    ZERO_ACTUAL_HOURS
}
