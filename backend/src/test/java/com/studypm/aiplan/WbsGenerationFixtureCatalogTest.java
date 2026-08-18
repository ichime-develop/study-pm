package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

/** WBS生成評価fixtureと比較対象の版情報が欠けていないことを検証する。 */
class WbsGenerationFixtureCatalogTest {

    private static final String DIRECTORY = "/fixtures/wbs-generation/";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void containsSyntheticFixturesAndVersionedEvaluationMetrics() throws Exception {
        JsonNode dataset = resource("dataset-v2.json");

        assertThat(dataset.path("datasetVersion").asText()).isEqualTo("v2");
        assertThat(dataset.at("/baseline/promptVersion").asText()).isEqualTo("v4");
        assertThat(dataset.at("/baseline/schemaVersion").asText()).isEqualTo("v1");
        assertThat(dataset.at("/baseline/strategyVersion").asText()).isEqualTo("v1");
        assertThat(dataset.at("/candidate/promptVersion").asText()).isEqualTo("v7");
        assertThat(dataset.at("/candidate/schemaVersion").asText()).isEqualTo("v4");
        assertThat(dataset.at("/candidate/strategyVersion").asText()).isEqualTo("v3");
        assertThat(dataset.path("metrics")).hasSize(8);
        assertThat(dataset.path("fixtureFiles")).hasSizeGreaterThanOrEqualTo(7);

        Set<String> fixtureIds = new HashSet<>();
        for (JsonNode file : dataset.path("fixtureFiles")) {
            JsonNode fixture = resource(file.asText());
            assertThat(fixture.path("textContent").asText()).isNotBlank();
            assertThat(fixture.path("expectedLearningScopes").isArray()).isTrue();
            assertThat(fixture.path("expectedLearningScopes")).isNotEmpty();
            assertThat(fixtureIds.add(fixture.path("fixtureId").asText())).isTrue();
            if ("v2".equals(fixture.path("datasetVersion").asText())) {
                assertThat(fixture.path("recommendedRuns").asInt()).isIn(1, 3);
                assertThat(fixture.path("expectedOutlineDepth").asInt()).isBetween(2, 4);
            }
        }
    }

    private JsonNode resource(String fileName) throws Exception {
        try (InputStream input = getClass().getResourceAsStream(DIRECTORY + fileName)) {
            assertThat(input).as(fileName).isNotNull();
            return objectMapper.readTree(input);
        }
    }
}
