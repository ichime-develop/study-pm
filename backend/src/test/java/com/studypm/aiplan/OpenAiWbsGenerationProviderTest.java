package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/**
 * Responses APIへ送るStructured Outputs契約と送信範囲を検証する。
 */
class OpenAiWbsGenerationProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void buildsAStrictJsonSchemaRequestWithoutInternalIds() throws Exception {
        AiWbsGenerationWork work = work();
        OpenAiWbsGenerationProvider provider = new OpenAiWbsGenerationProvider(
                objectMapper,
                RestClient.builder(),
                "test-key",
                "https://example.invalid",
                Duration.ofSeconds(1),
                24000
        );
        ObjectNode request = provider.requestBodyFor(work, null);

        assertThat(request.path("store").asBoolean()).isFalse();
        assertThat(request.path("max_output_tokens").asInt()).isEqualTo(24000);
        assertThat(request.at("/text/format/type").asText()).isEqualTo("json_schema");
        assertThat(request.at("/text/format/strict").asBoolean()).isTrue();
        assertThat(request.at("/text/format/schema/additionalProperties").asBoolean()).isFalse();
        assertThat(request.at("/text/format/schema/properties/tasks/minItems").asInt()).isEqualTo(1);
        assertThat(request.at("/text/format/schema/properties/tasks/items/properties/plannedHours/minimum").decimalValue())
                .isEqualByComparingTo("0.25");
        assertThat(request.at("/text/format/schema/properties/tasks/items/properties/plannedHours/multipleOf").decimalValue())
                .isEqualByComparingTo("0.25");
        assertThat(request.toString()).doesNotContain("minLength", "maxLength");
        assertThat(request.toString()).doesNotContain(work.jobId().toString());
        assertThat(request.toString()).doesNotContain("promptVersion", "schemaVersion", "strategyVersion");
        assertThat(request.toString()).contains("source-1");
        assertThat(objectMapper.readTree(request.at("/input/1/content").asText()).path("requiredDays").asInt())
                .isEqualTo(4);
    }

    @Test
    void reportsOutputLimitWhenTheResponseIsIncomplete() throws Exception {
        ObjectNode response = (ObjectNode) objectMapper.readTree("""
                {
                  "status": "incomplete",
                  "incomplete_details": { "reason": "max_output_tokens" }
                }
                """);

        assertThatThrownBy(() -> provider(RestClient.builder()).resultFromResponse(response))
                .isInstanceOf(AiProviderException.class)
                .extracting(exception -> ((AiProviderException) exception).errorCode())
                .isEqualTo("AI_OUTPUT_TOO_LARGE");
    }

    @Test
    void rejectsAResponseWhoseStatusIsMissing() {
        assertThatThrownBy(() -> provider(RestClient.builder()).resultFromResponse(objectMapper.createObjectNode()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("status=missing");
    }

    @Test
    void classifiesRateLimitAsUnavailableWithoutRetry() {
        AiProviderException exception = provider(RestClient.builder()).providerFailure(429, null);

        assertThat(exception.errorCode()).isEqualTo("AI_GENERATION_UNAVAILABLE");
        assertThat(exception.isRetryable()).isFalse();
        assertThat(exception.getMessage()).doesNotContain("credit", "quota", "billing");
    }

    @Test
    void rejectsARefusalWithoutTryingToParseItAsAWbsDraft() throws Exception {
        ObjectNode response = (ObjectNode) objectMapper.readTree("""
                {
                  "status": "completed",
                  "output": [{
                    "content": [{
                      "type": "refusal",
                      "refusal": "unable to comply"
                    }]
                  }]
                }
                """);

        assertThatThrownBy(() -> provider(RestClient.builder()).resultFromResponse(response))
                .isInstanceOf(AiProviderException.class)
                .matches(exception -> !((AiProviderException) exception).isRetryable());
    }

    private OpenAiWbsGenerationProvider provider(RestClient.Builder builder) {
        return new OpenAiWbsGenerationProvider(
                objectMapper,
                builder,
                "test-key",
                "https://example.invalid",
                Duration.ofSeconds(1),
                24000
        );
    }

    private AiWbsGenerationWork work() {
        ObjectNode constraints = objectMapper.createObjectNode();
        constraints.put("wbsSplitUnit", "SECTION");
        ObjectNode quantity = constraints.putObject("quantityCondition");
        quantity.put("unit", "ページ");
        quantity.put("totalAmount", 40);
        quantity.put("dailyAmount", 10);
        AiWbsGenerationInput input = new AiWbsGenerationInput(
                AiPlanRequestSourceType.OVERVIEW,
                "Javaを学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-31"),
                constraints,
                4,
                List.of(new AiWbsGenerationSource("source-1", AiPlanSourceType.OVERVIEW, 0, "概要", "Javaの基本"))
        );
        return new AiWbsGenerationWork(
                UUID.randomUUID(), "test-model", "v1", "v1", "v1",
                Instant.parse("2026-07-30T00:05:00Z"), false, input
        );
    }
}
