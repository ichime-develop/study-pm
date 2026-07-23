package com.studypm.project;

/**
 * プロジェクトを完了へ変更できるかを判断するLEAF集計を表す。
 */
public record ProjectCompletionStats(
        long leafCount,
        long completedLeafCount
) {
    public boolean canComplete() {
        return leafCount > 0 && leafCount == completedLeafCount;
    }
}
