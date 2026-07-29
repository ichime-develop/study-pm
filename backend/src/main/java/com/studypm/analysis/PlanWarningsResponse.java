package com.studypm.analysis;

import java.util.List;

/**
 * プロジェクト内の計画不整合一覧を返すAPI応答を表す。
 */
public record PlanWarningsResponse(List<PlanWarningResponse> warnings) {
}
