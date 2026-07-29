package com.studypm.analysis;

import java.util.UUID;

import com.studypm.auth.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * プロジェクト単位のEVM、バーンダウン、計画不整合を取得するAPIを提供する。
 */
@RestController
@RequestMapping("/api/projects/{projectId}/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping("/evm")
    EvmAnalysisResponse evm(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        return analysisService.evm(account.accountId(), projectId);
    }

    @GetMapping("/burndown")
    BurndownAnalysisResponse burndown(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        return analysisService.burndown(account.accountId(), projectId);
    }

    @GetMapping("/plan-warnings")
    PlanWarningsResponse planWarnings(
            @AuthenticationPrincipal AuthenticatedAccount account,
            @PathVariable UUID projectId
    ) {
        return analysisService.planWarnings(account.accountId(), projectId);
    }
}
