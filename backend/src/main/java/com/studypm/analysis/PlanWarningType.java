package com.studypm.analysis;

/**
 * プロジェクト期間に対するLEAFタスク計画の不整合種別を表す。
 */
public enum PlanWarningType {
    STARTS_BEFORE_PROJECT,
    ENDS_AFTER_PROJECT
}
