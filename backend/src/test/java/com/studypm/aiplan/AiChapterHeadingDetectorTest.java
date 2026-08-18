package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

/**
 * 合成目次fixtureを使って章見出しの概数検出を検証する。
 */
class AiChapterHeadingDetectorTest {

    private final AiChapterHeadingDetector detector = new AiChapterHeadingDetector();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void detectsAllChaptersInTheSyntheticLongTableOfContents() throws IOException {
        JsonNode fixture;
        try (InputStream input = getClass().getResourceAsStream(
                "/fixtures/wbs-generation/eight-chapter-toc-v1.json"
        )) {
            fixture = objectMapper.readTree(input);
        }
        AiWbsGenerationSource source = new AiWbsGenerationSource(
                "source-1",
                AiPlanSourceType.PASTED_TOC,
                0,
                "架空教材の目次",
                fixture.path("textContent").asText()
        );

        assertThat(detector.count(List.of(source))).isEqualTo(8);
        assertThat(fixture.path("expectedLearningScopes")).hasSize(8);
    }

    @Test
    void detectsJapaneseAndFullWidthChapterNumbersWithoutCountingSections() {
        AiWbsGenerationSource source = new AiWbsGenerationSource(
                "source-1",
                AiPlanSourceType.PASTED_TOC,
                0,
                "目次",
                "第１章 基礎\n01 はじめに\n2章 実践\n02 応用"
        );

        assertThat(detector.count(List.of(source))).isEqualTo(2);
    }

    @Test
    void countsTheSameChapterNumberSeparatelyForDifferentSources() {
        AiWbsGenerationSource first = new AiWbsGenerationSource(
                "source-1", AiPlanSourceType.PASTED_TOC, 0, "教材A", "Chapter 1 基礎"
        );
        AiWbsGenerationSource second = new AiWbsGenerationSource(
                "source-2", AiPlanSourceType.PASTED_TOC, 1, "教材B", "Chapter 1 実践"
        );

        assertThat(detector.count(List.of(first, second))).isEqualTo(2);
    }
}
