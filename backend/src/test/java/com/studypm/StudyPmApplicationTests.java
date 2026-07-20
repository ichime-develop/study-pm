package com.studypm;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * バックエンド起動クラスの最小テスト。
 * DB接続やSpring Context起動確認は、環境整備後の統合テストで扱う。
 */
class StudyPmApplicationTests {

    @Test
    void applicationClassExists() {
        assertThat(StudyPmApplication.class).isNotNull();
    }
}
