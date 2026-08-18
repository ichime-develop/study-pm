package com.studypm.aiplan;

import java.util.List;

import org.springframework.stereotype.Component;

/** 保存済みAI生成依頼と入力元から、検証・生成共通の入力を組み立てる。 */
@Component
public class AiWbsGenerationInputFactory {

    private final AiPlanSourceRepository sourceRepository;

    public AiWbsGenerationInputFactory(AiPlanSourceRepository sourceRepository) {
        this.sourceRepository = sourceRepository;
    }

    public AiWbsGenerationInput forRequest(AiPlanGenerationRequest request) {
        List<AiWbsGenerationSource> sources = sourceRepository
                .findAllByGenerationRequest_IdOrderBySourceOrderAsc(request.id())
                .stream()
                .map(source -> new AiWbsGenerationSource(
                        source.temporaryKey(),
                        source.sourceType(),
                        source.sourceOrder(),
                        source.label(),
                        source.textContent()
                ))
                .toList();
        return new AiWbsGenerationInput(
                request.sourceType(),
                request.learningGoal(),
                request.startDate(),
                request.targetEndDate(),
                request.constraints(),
                AiQuantityCondition.from(request.constraints()).map(AiQuantityCondition::requiredDays).orElse(null),
                sources
        );
    }
}
