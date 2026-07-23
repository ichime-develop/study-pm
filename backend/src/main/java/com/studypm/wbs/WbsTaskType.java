package com.studypm.wbs;

import com.studypm.common.error.InvalidRequestException;

/**
 * WBSタスクが親タスクか学習対象タスクかを表す。
 */
public enum WbsTaskType {
    PARENT,
    LEAF;

    public static WbsTaskType parse(String rawType) {
        try {
            return WbsTaskType.valueOf(rawType);
        } catch (RuntimeException e) {
            throw new InvalidRequestException(
                    "INVALID_WBS_TASK_TYPE",
                    "WBSタスク種別の指定が正しくありません。"
            );
        }
    }
}
