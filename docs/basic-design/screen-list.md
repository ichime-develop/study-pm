<!--
doc-type: 基本設計
id-prefix: AU, PJ, WB, SL, AN, AI, CM, SCR
related: docs/basic-design/screen-flow.md, docs/requirements/details/data-screens-interfaces.md, docs/requirements/details/glossary.md
-->

# 画面一覧（画面ID・画面名）

## 1. 目的

基本設計と実装で画面を一意に識別するため、画面IDと画面名を定義する。

- 画面IDは「機能プレフィックス + 2桁連番」とし、実装ファイル名の接頭辞として使う。
- 要件定義（`docs/requirements/details/data-screens-interfaces.md` 16章）の画面ID・要件IDも本採番へ更新済み。初期に使用していたSCR-xxとの対応は旧ID列に残す（過去のコミット・レビュー記録の参照用）。
- 英語名は実装時のルーティング名の基準とし、UIモック（`mock/src/App.tsx`）の `Screen` 型の値と対応させる。

## 2. 機能プレフィックス

| プレフィックス | 機能 |
| --- | --- |
| AU | 認証（Auth） |
| PJ | プロジェクト管理（Project） |
| WB | WBS管理（WBS) |
| SL | 学習記録（Study Log） |
| AN | 進捗分析（Analysis） |
| AI | AI学習計画生成 |
| CM | 共通部品（Common） |

## 3. 画面一覧

| 画面ID | 画面名 | 英語名（ルーティング基準） | Reactファイル名 | MVP | 旧ID（参考） |
| --- | --- | --- | --- | --- | --- |
| AU01 | アカウント登録画面 | signup | `AU01_SignupPage.tsx` | 1 | SCR-01 |
| AU02 | ログイン画面 | login | `AU02_LoginPage.tsx` | 1 | SCR-02 |
| PJ01 | プロジェクト一覧画面 | projects | `PJ01_ProjectsPage.tsx` | 1 | SCR-04 |
| PJ02 | プロジェクト作成・編集画面 | project-form | `PJ02_ProjectFormPage.tsx` | 1 | SCR-05 |
| PJ03 | プロジェクト概要画面 | project-overview | `PJ03_ProjectOverviewPage.tsx` | 1 | SCR-06 |
| WB01 | WBS・ガント画面 | wbs | `WB01_WbsPage.tsx` | 1 | SCR-07 |
| SL01 | 学習記録画面 | study-logs | `SL01_StudyLogsPage.tsx` | 1 | SCR-06B |
| AN01 | 進捗分析画面 | progress-analysis | `AN01_ProgressAnalysisPage.tsx` | 2 | SCR-06A |
| AI01 | AI計画作成: 作成方法選択画面 | ai-plan-method | `AI01_AiPlanMethodPage.tsx` | 3 | SCR-11 |
| AI02 | AI計画作成: 条件・教材入力画面 | ai-plan-input | `AI02_AiPlanInputPage.tsx` | 3 | SCR-12 |
| AI03 | AI計画作成: 学習項目候補確認画面 | ai-plan-items | `AI03_AiPlanItemsPage.tsx` | 3 | 新規 |
| AI04 | AI計画作成: WBS下書き確認・編集画面 | ai-plan-draft | `AI04_AiPlanDraftPage.tsx` | 3 | SCR-13を分割 |

- モックの `Screen` 型ではプロジェクト概要のみ `projectDetail` という名前になっており、`projectOverview` へのリネーム対象とする。他は英語名のcamelCaseと一致している。

## 4. 共通部品一覧

画面をまたいで使う共通部品にはCM系のIDを割り当てる。

| 部品ID | 部品名 | Reactファイル名 | 使用画面 | 備考 |
| --- | --- | --- | --- | --- |
| CM01 | アプリヘッダー | `CM01_AppHeader.tsx` | ログイン後の全画面 | 画面タイトル、ログアウト導線 |
| CM02 | プロジェクト内ナビゲーション | `CM02_ProjectNav.tsx` | PJ03、WB01、SL01、AN01 | プロジェクト名・状態・期間の表示、状態変更モーダル、概要 / WBS / 学習記録 / 進捗分析のタブ切り替え |
| CM03 | 作成フローステッパー | `CM03_FlowStepper.tsx` | PJ02、AI01、AI02、AI03、AI04 | 作成フローの現在ステップ表示 |
| CM04 | 認証レイアウト | `CM04_AuthLayout.tsx` | AU01、AU02 | 左のヒーローパネルと右の入力フォームの2カラム構成 |

### 4.1 モック専用の部品

UIモックのサイドバー（全画面切り替えナビ）は要件検証用であり、本実装の対象外とする。部品IDは割り当てない。

## 5. 実装時の命名方針

### 5.1 フロントエンド（React）

- ファイル名は `画面ID_説明的名前` とする（例: `PJ03_ProjectOverviewPage.tsx`）。IDでのgrepと、import文・JSXでの可読性を両立する。
- コンポーネント名はIDを含めないPascalCaseとする（例: `ProjectOverviewPage`）。
- ルーティングパスは英語名を基準にする。

| パス | 画面ID |
| --- | --- |
| `/signup` | AU01 |
| `/login` | AU02 |
| `/projects` | PJ01 |
| `/projects/new`、`/projects/:id/edit` | PJ02 |
| `/projects/:id` | PJ03 |
| `/projects/:id/wbs` | WB01 |
| `/projects/:id/logs` | SL01 |
| `/projects/:id/analysis` | AN01 |
| `/projects/new/ai` | AI01 |
| `/projects/new/ai/input` | AI02 |
| `/projects/new/ai/requests/:requestId/input` | AI02（保存済み入力の再開） |
| `/projects/new/ai/requests/:requestId/items` | AI03 |
| `/projects/new/ai/drafts/:draftId` | AI04 |

AI03とAI04はURLのIDを正本としてサーバーから状態を再取得する。ブラウザ再読み込みや別画面からの復帰で、フロントエンドのメモリ内状態だけに依存しない。

### 5.2 バックエンド（Java）

- Java側はREST APIとしてリソース単位で構成し、画面IDをファイル名に使わない（例: `ProjectController`、`TaskController`、`StudyLogController`）。
- APIには別系統のAPI ID（例: `API-PJ-01`）をAPI一覧で採番し、画面との対応は「画面 × 使用API」のマトリクスで管理する。API一覧とマトリクスは基本設計で作成する。

### 5.3 IDの拡張

- 新しい画面は該当プレフィックスの次番号を割り当てる。番号の再利用はしない。
- 画面内の領域や項目まで採番が必要になった場合は、`SCR.PJ03-01` のように枝番で拡張する。
