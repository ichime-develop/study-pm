package com.studypm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * study-pmバックエンドAPIのSpring Boot起動クラス。
 * 業務ロジックやAPIエンドポイントの責務は各パッケージへ分離する。
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class StudyPmApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyPmApplication.class, args);
    }
}
