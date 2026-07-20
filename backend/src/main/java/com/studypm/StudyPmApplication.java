package com.studypm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class StudyPmApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyPmApplication.class, args);
    }
}
