// screen-list.mdで定義したMVP1ルートと画面コンポーネントを対応付ける。
import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../pages/AU02_LoginPage";
import { SignupPage } from "../pages/AU01_SignupPage";
import { ProjectsPage } from "../pages/PJ01_ProjectsPage";
import { ProjectFormPage } from "../pages/PJ02_ProjectFormPage";
import { ProjectOverviewPage } from "../pages/PJ03_ProjectOverviewPage";
import { ProgressAnalysisPage } from "../pages/AN01_ProgressAnalysisPage";
import { AiPlanMethodPage } from "../pages/AI01_AiPlanMethodPage";
import { AiPlanInputPage } from "../pages/AI02_AiPlanInputPage";
import { AiPlanDraftPage } from "../pages/AI03_AiPlanDraftPage";
import { StudyLogsPage } from "../pages/SL01_StudyLogsPage";
import { WbsPage } from "../pages/WB01_WbsPage";
import { RequireAuth } from "./RequireAuth";

export const AppRoutes = () => (
  <Routes>
    <Route element={<LoginPage />} path="/login" />
    <Route element={<SignupPage />} path="/signup" />
    <Route element={<RequireAuth />}>
      <Route element={<ProjectsPage />} path="/projects" />
      <Route element={<ProjectFormPage />} path="/projects/new" />
      <Route element={<AiPlanMethodPage />} path="/projects/new/ai" />
      <Route element={<AiPlanInputPage />} path="/projects/new/ai/input" />
      <Route element={<AiPlanInputPage />} path="/projects/new/ai/requests/:requestId" />
      <Route element={<AiPlanDraftPage />} path="/projects/new/ai/drafts/:draftId" />
      <Route element={<ProjectFormPage />} path="/projects/:id/edit" />
      <Route element={<ProjectOverviewPage />} path="/projects/:id" />
      <Route element={<WbsPage />} path="/projects/:id/wbs" />
      <Route element={<StudyLogsPage />} path="/projects/:id/logs" />
      <Route element={<ProgressAnalysisPage />} path="/projects/:id/analysis" />
    </Route>
    <Route element={<Navigate replace to="/projects" />} path="/" />
    <Route element={<Navigate replace to="/projects" />} path="*" />
  </Routes>
);
