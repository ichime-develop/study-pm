package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

/**
 * 明示実行時だけOpenAI実サービスがStructured Outputsスキーマを受理することを確認する。
 */
class OpenAiWbsGenerationProviderSmokeTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_OPENAI_SMOKE_TEST", matches = "true")
    void generatesASmallDraftWithTheConfiguredKey() {
        String apiKey = System.getenv("OPENAI_API_KEY");
        assumeTrue(apiKey != null && !apiKey.isBlank(), "OPENAI_API_KEY is required.");
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        OpenAiWbsGenerationProvider provider = new OpenAiWbsGenerationProvider(
                objectMapper,
                RestClient.builder(),
                apiKey,
                "https://api.openai.com",
                Duration.ofSeconds(60),
                4000
        );
        ObjectNode constraints = objectMapper.createObjectNode();
        constraints.put("wbsSplitUnit", "SECTION");
        AiWbsGenerationInput input = new AiWbsGenerationInput(
                AiPlanRequestSourceType.OVERVIEW,
                "Javaの変数を学ぶ",
                LocalDate.parse("2026-08-01"),
                LocalDate.parse("2026-08-03"),
                constraints,
                null,
                List.of(new AiWbsGenerationSource(
                        "source-1",
                        AiPlanSourceType.OVERVIEW,
                        0,
                        "概要",
                        "Javaの変数とデータ型を学ぶ"
                ))
        );
        AiWbsGenerationWork work = new AiWbsGenerationWork(
                UUID.randomUUID(),
                System.getenv().getOrDefault("OPENAI_MODEL", "gpt-4.1-mini"),
                "smoke",
                "smoke",
                "smoke",
                Instant.now().plusSeconds(120),
                false,
                input
        );

        AiWbsGenerationProviderResult result = provider.generate(work, null);

        assertThat(result.proposal().tasks()).isNotEmpty();
        assertThat(result.providerRequestId()).isNotBlank();
    }
}
