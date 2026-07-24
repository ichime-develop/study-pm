// screen-list.mdで定義したMVP1ルートと画面コンポーネントを対応付ける。
import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../pages/AU02_LoginPage";
import { SignupPage } from "../pages/AU01_SignupPage";
import { ProjectsPage } from "../pages/PJ01_ProjectsPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { RequireAuth } from "./RequireAuth";

export const AppRoutes = () => (
  <Routes>
    <Route element={<LoginPage />} path="/login" />
    <Route element={<SignupPage />} path="/signup" />
    <Route element={<RequireAuth />}>
      <Route element={<ProjectsPage />} path="/projects" />
      <Route element={<PlaceholderPage screenId="PJ02" title="プロジェクト作成・編集" />} path="/projects/new" />
      <Route element={<PlaceholderPage screenId="PJ02" title="プロジェクト作成・編集" />} path="/projects/:id/edit" />
      <Route element={<PlaceholderPage screenId="PJ03" title="プロジェクト概要" />} path="/projects/:id" />
      <Route element={<PlaceholderPage screenId="WB01" title="WBS・ガント" />} path="/projects/:id/wbs" />
      <Route element={<PlaceholderPage screenId="SL01" title="学習記録" />} path="/projects/:id/logs" />
    </Route>
    <Route element={<Navigate replace to="/projects" />} path="/" />
    <Route element={<Navigate replace to="/projects" />} path="*" />
  </Routes>
);
