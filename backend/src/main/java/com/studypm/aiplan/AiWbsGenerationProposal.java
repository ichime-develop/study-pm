package com.studypm.aiplan;

import java.util.List;

/** OpenAIのStructured Outputsから受け取るWBS生成提案を表す。 */
public record AiWbsGenerationProposal(
        AiWbsGenerationProject project,
        List<AiWbsOutlineNode> outlineNodes,
        WbsSplitUnit wbsSplitUnit
) {
    public AiWbsGenerationProposal {
        outlineNodes = outlineNodes == null ? List.of() : List.copyOf(outlineNodes);
    }
}
