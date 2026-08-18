package com.studypm.aiplan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

/** 明示実行時だけdataset v2を実APIで評価し、比較用の指標をJSONへ記録する。 */
class OpenAiWbsGenerationEvaluationTest {

    private static final String DIRECTORY = "/fixtures/wbs-generation/";
    private static final String REGENERATION_INSTRUCTION =
            "元の入力条件と学習範囲を省略せず、指摘された構造上の問題だけを修正して、WBS全体を再生成してください。";
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_OPENAI_WBS_EVALUATION", matches = "true")
    void evaluatesDatasetV2AndWritesMetrics() throws Exception {
        String apiKey = System.getenv("OPENAI_API_KEY");
        assumeTrue(apiKey != null && !apiKey.isBlank(), "OPENAI_API_KEY is required.");
        JsonNode dataset = resource("dataset-v2.json");
        String modelName = System.getenv().getOrDefault("OPENAI_MODEL", "gpt-4.1-mini");
        JsonNode candidate = dataset.path("candidate");
        OpenAiWbsGenerationProvider provider = provider(apiKey);
        AiWbsDraftAssembler assembler = new AiWbsDraftAssembler();
        AiWbsDraftValidator validator = new AiWbsDraftValidator(
                objectMapper,
                new AiChapterHeadingDetector()
        );
        ObjectNode report = reportHeader(dataset, modelName, candidate);
        ArrayNode results = report.putArray("results");

        for (JsonNode file : dataset.path("fixtureFiles")) {
            JsonNode fixture = resource(file.asText());
            int runs = fixture.path("recommendedRuns").asInt(1);
            for (int run = 1; run <= runs; run++) {
                results.add(evaluate(
                        fixture, run, modelName, candidate, provider, assembler, validator
                ));
            }
        }
        addSummary(report, results);
        Path output = outputPath();
        Files.createDirectories(output.getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), report);

        assertThat(results).allSatisfy(result ->
                assertThat(result.path("structuralPass").asBoolean())
                        .as(result.path("fixtureId").asText() + " run=" + result.path("run").asInt())
                        .isTrue());
    }

    private ObjectNode evaluate(
            JsonNode fixture,
            int run,
            String modelName,
            JsonNode candidate,
            OpenAiWbsGenerationProvider provider,
            AiWbsDraftAssembler assembler,
            AiWbsDraftValidator validator
    ) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("fixtureId", fixture.path("fixtureId").asText());
        result.put("run", run);
        boolean regenerated = false;
        String feedback = null;
        Integer totalInputTokens = null;
        Integer totalOutputTokens = null;
        try {
            AiWbsGenerationInput input = inputFrom(fixture);
            AiWbsGenerationWork work = new AiWbsGenerationWork(
                    UUID.randomUUID(),
                    modelName,
                    candidate.path("promptVersion").asText(),
                    candidate.path("schemaVersion").asText(),
                    candidate.path("strategyVersion").asText(),
                    Instant.now().plusSeconds(240),
                    false,
                    input
            );
            for (int generation = 0; generation < 2; generation++) {
                AiWbsGenerationProviderResult providerResult = provider.generate(work, feedback);
                totalInputTokens = addTokens(totalInputTokens, providerResult.inputTokens());
                totalOutputTokens = addTokens(totalOutputTokens, providerResult.outputTokens());
                try {
                    AiWbsDraftAssembly assembly = assembler.assemble(
                            input, work.deadlinePriority(), providerResult.proposal()
                    );
                    AiValidatedWbsDraft validated = validator.validate(
                            input,
                            assembly.proposal(),
                            assembly.warnings(),
                            assembly.dailyPlannedHours()
                    );
                    addSuccessMetrics(
                            result,
                            fixture,
                            validated,
                            regenerated,
                            totalInputTokens,
                            totalOutputTokens
                    );
                    return result;
                } catch (AiStructuredOutputException exception) {
                    if (generation == 1) {
                        throw exception;
                    }
                    regenerated = true;
                    feedback = feedbackFor(exception);
                }
            }
        } catch (RuntimeException exception) {
            result.put("structuralPass", false);
            result.put("schemaRegenerated", regenerated);
            result.put("failureType", exception.getClass().getSimpleName());
            result.put("failureMessage", safeMessage(exception.getMessage()));
            putNullable(result, "inputTokens", totalInputTokens);
            putNullable(result, "outputTokens", totalOutputTokens);
        }
        return result;
    }

    private void addSuccessMetrics(
            ObjectNode result,
            JsonNode fixture,
            AiValidatedWbsDraft validated,
            boolean regenerated,
            Integer totalInputTokens,
            Integer totalOutputTokens
    ) {
        List<AiWbsDraftTask> tasks = validated.proposal().tasks();
        long parentCount = tasks.stream().filter(task -> task.taskType() == AiDraftTaskType.PARENT).count();
        long leafCount = tasks.stream().filter(task -> task.taskType() == AiDraftTaskType.LEAF).count();
        BigDecimal totalHours = tasks.stream()
                .filter(task -> task.taskType() == AiDraftTaskType.LEAF)
                .map(AiWbsDraftTask::plannedHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        result.put("structuralPass", true);
        result.put("scopeCoverage", scopeCoverage(fixture, tasks));
        result.put("parentCount", parentCount);
        result.put("leafCount", leafCount);
        result.put("totalPlannedHours", totalHours);
        result.put("schemaRegenerated", regenerated);
        putNullable(result, "inputTokens", totalInputTokens);
        putNullable(result, "outputTokens", totalOutputTokens);
        result.put("validationStatus", validated.validationStatus().name());
        result.put("warningCount", validated.warnings().size());
    }

    private double scopeCoverage(JsonNode fixture, List<AiWbsDraftTask> tasks) {
        List<String> taskTexts = tasks.stream()
                .map(task -> normalize(task.name() + " " + task.description()))
                .toList();
        int expectedCount = fixture.path("expectedLearningScopes").size();
        if (expectedCount == 0) {
            return 1.0;
        }
        int coveredCount = 0;
        for (JsonNode expected : fixture.path("expectedLearningScopes")) {
            String normalizedExpected = normalize(expected.asText());
            if (taskTexts.stream().anyMatch(value -> value.contains(normalizedExpected))) {
                coveredCount++;
            }
        }
        return (double) coveredCount / expectedCount;
    }

    private AiWbsGenerationInput inputFrom(JsonNode fixture) {
        AiPlanRequestSourceType sourceType = AiPlanRequestSourceType.valueOf(
                fixture.path("sourceType").asText()
        );
        ObjectNode constraints = objectMapper.createObjectNode();
        constraints.put("weekdayAvailableHours", 2);
        constraints.put("weekendAvailableHours", 2);
        constraints.put("wbsSplitUnit", fixture.path("wbsSplitUnit").asText());
        constraints.putArray("unavailableWeekdays");
        AiPlanSourceType planSourceType = sourceType == AiPlanRequestSourceType.TABLE_OF_CONTENTS
                ? AiPlanSourceType.PASTED_TOC
                : AiPlanSourceType.OVERVIEW;
        return new AiWbsGenerationInput(
                sourceType,
                fixture.path("fixtureId").asText() + "を学ぶ",
                LocalDate.parse("2026-09-01"),
                LocalDate.parse("2026-12-31"),
                constraints,
                null,
                List.of(new AiWbsGenerationSource(
                        "source-1",
                        planSourceType,
                        0,
                        fixture.path("fixtureId").asText(),
                        fixture.path("textContent").asText()
                ))
        );
    }

    private OpenAiWbsGenerationProvider provider(String apiKey) {
        return new OpenAiWbsGenerationProvider(
                objectMapper,
                RestClient.builder(),
                apiKey,
                "https://api.openai.com",
                Duration.ofSeconds(120),
                24000
        );
    }

    private ObjectNode reportHeader(JsonNode dataset, String modelName, JsonNode candidate) {
        ObjectNode report = objectMapper.createObjectNode();
        report.put("datasetVersion", dataset.path("datasetVersion").asText());
        report.put("modelName", modelName);
        report.put("promptVersion", candidate.path("promptVersion").asText());
        report.put("schemaVersion", candidate.path("schemaVersion").asText());
        report.put("strategyVersion", candidate.path("strategyVersion").asText());
        report.put("applicationCommit", System.getenv().getOrDefault("APPLICATION_COMMIT", "working-tree"));
        report.put("executedAt", Instant.now().toString());
        return report;
    }

    private void addSummary(ObjectNode report, ArrayNode results) {
        int passed = 0;
        int regenerated = 0;
        for (JsonNode result : results) {
            if (result.path("structuralPass").asBoolean()) {
                passed++;
            }
            if (result.path("schemaRegenerated").asBoolean()) {
                regenerated++;
            }
        }
        ObjectNode summary = report.putObject("summary");
        summary.put("runCount", results.size());
        summary.put("structuralPassRate", results.isEmpty() ? 0.0 : (double) passed / results.size());
        summary.put("schemaRegenerationRate", results.isEmpty() ? 0.0 : (double) regenerated / results.size());
    }

    private String feedbackFor(AiStructuredOutputException exception) {
        return REGENERATION_INSTRUCTION + " 構造上の問題: " + safeMessage(exception.getMessage());
    }

    private String safeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "前回の出力がWBS下書きの構造要件を満たしませんでした。";
        }
        return message.codePointCount(0, message.length()) <= 500
                ? message
                : message.substring(0, message.offsetByCodePoints(0, 500));
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[\\p{Z}\\p{P}\\p{S}]", "");
    }

    private void putNullable(ObjectNode node, String field, Integer value) {
        if (value == null) {
            node.putNull(field);
        } else {
            node.put(field, value);
        }
    }

    private Integer addTokens(Integer total, Integer value) {
        if (value == null) {
            return total;
        }
        return (total == null ? 0 : total) + value;
    }

    private JsonNode resource(String fileName) throws Exception {
        try (InputStream input = getClass().getResourceAsStream(DIRECTORY + fileName)) {
            assertThat(input).as(fileName).isNotNull();
            return objectMapper.readTree(input);
        }
    }

    private Path outputPath() {
        Path buildDirectory = Files.isDirectory(Path.of("backend"))
                ? Path.of("backend", "target")
                : Path.of("target");
        return buildDirectory.resolve("wbs-generation-evaluation-v2-result.json");
    }
}
