package com.studypm.analysis;

import java.time.Instant;
import java.util.UUID;

/**
 * 日別EVの算出に使う進捗履歴の読み取り値を表す。
 */
public record ProgressHistoryRow(UUID taskId, int progressRate, Instant changedAt) {
}
