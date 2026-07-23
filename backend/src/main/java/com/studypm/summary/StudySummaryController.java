package com.studypm.summary;

import com.studypm.auth.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * プロジェクト一覧上部の学習サマリーAPIを提供する。
 */
@RestController
@RequestMapping("/api/me")
public class StudySummaryController {

    private final StudySummaryService studySummaryService;

    public StudySummaryController(StudySummaryService studySummaryService) {
        this.studySummaryService = studySummaryService;
    }

    @GetMapping("/study-summary")
    StudySummaryResponse summary(@AuthenticationPrincipal AuthenticatedAccount account) {
        return studySummaryService.summary(account.accountId());
    }
}
