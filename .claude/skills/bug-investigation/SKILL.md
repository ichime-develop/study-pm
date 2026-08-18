---
name: bug-investigation
description: study-pmの不具合を、再現確認・原因分析・修正方針・簡易な横展開・報告まで調査する。実装、テストソースの追加・変更、コミットは行わない。「〇〇がおかしい」「エラーが出る」「計算が合わない」「AI計画生成に失敗する」「原因を特定して」「なぜこうなるか調べて」といった依頼で使う。WBS、学習記録、EVM・バーンダウン、AI生成、認証・Cookie・CORSの不具合を含む。
---

# study-pm 不具合調査

## 境界

原因の特定と修正方針の提示だけを行う。実装、既存テストを含むソースコードの変更、新規テストファイルの追加、マイグレーション、設定変更、コミットは行わない。ユーザーが報告を確認した後に、別途「直して」と明示した場合だけ実装作業へ移る。

調査で実行したコマンド・サーバー起動・既存テストの実行は許可する。ただし、作業ツリーを変更する再現用テストは作らない。既存テストだけで再現できない場合は、最小の手動操作、APIリクエスト、ログ、または読み取り結果で確認し、再現できなかった事実と不足情報を報告する。

## 進め方

### 1. 事実と期待をそろえる

- 報告から、再現手順、発生条件、実際の結果、期待結果、環境・時刻・エラー文を抜き出す。不足していても、調査できる範囲から始める。
- IssueまたはPRが指定されたときだけ、必要な範囲で `gh issue view` または `gh pr view` を確認する。Issue前提の調査にはしない。
- 期待結果は、まず関連する設計書で確認する。実装を期待仕様の根拠にしない。

| 話題 | 主な確認先 |
| --- | --- |
| 機能・受入条件 | `docs/requirements/details/functional.md`、`acceptance.md` |
| 業務ルール・入力・例外 | `docs/requirements/details/business-rules.md` |
| 画面・外部連携 | `docs/requirements/details/data-screens-interfaces.md` |
| API・画面・データ | `docs/basic-design/api-list.md`、`screen-list.md`、`screen-flow.md`、`data-model.md` |
| WBS/EVM/バーンダウン | `docs/detailed-design/business-logic.md`、`analysis-api.md` |
| DB・AI・認証/CORS | `docs/detailed-design/database-schema.md`、`ai-plan-api.md`、`ai-plan-generation.md`、`implementation-policy.md` |
| AI生成品質 | `docs/development/wbs-generation-evaluation.md` |

設計書同士、または設計書と実装が食い違う場合は、直ちにどちらかを正と決めない。乖離を原因候補または要確認事項として報告する。

外部サービス（OpenAIまたはGoogle Cloud Vision）が疑わしいときは、公式ドキュメントで現行の制限・エラー仕様を確認してから、アプリ側の原因と切り分ける。秘密情報、画像、OCR結果、AI入出力本文を報告やコマンド出力に含めない。

### 2. 再現を確認する

可能なら既存の自動テストを絞って実行し、報告された振る舞いと一致する失敗または結果を確認する。再現のためにテストソースは変更しない。

テストが起動前に失敗した場合は、アプリの不具合と扱わない。Java/Node/Dockerなどの実行環境、依存関係、既存のコンパイル成果物を先に切り分ける。

- backend単体テスト: `./mvnw -f backend/pom.xml -Dtest=XxxTest test`
- backend結合テスト: `./mvnw -f backend/pom.xml -Dit.test=XxxIT verify`（Docker Desktop と Testcontainers が必要）
- frontend: `npm --prefix frontend run test -- src/path/Xxx.test.tsx`

テスト分類は `docs/detailed-design/implementation-policy.md` の8章と `docs/development/coding-guidelines.md` の3.7に従う。`XxxTest` はService・Validator等、`XxxIT` はPostgreSQL・Flyway・API結合、frontendはVitest/Testing Libraryで画面操作を検証する。

既存テストで再現不能なら、ローカル画面操作、対象APIへの最小リクエスト、または安全な読み取りログで確認する。再現不能なまま原因を断定しない。必要なら「追加で必要な再現条件」を短く質問する。

### 3. 原因を絞る

- 再現結果と、Controller / Service / Repository / Entity、または画面・APIクライアント・状態管理を照合し、直接原因を特定する。
- `git log -- <対象ファイル>` と必要なら `git blame <対象ファイル>` で、設計変更への追随漏れ、誤った前提、同一パターンの踏襲などの根本原因を確認する。
- 確認済みの事実、妥当性の高い推定、未確認事項を分けて書く。

### 4. 修正方針を提示して止める

対象ファイル、該当責務、変更の考え方、修正後に確認すべき既存・追加テストの観点を示す。コードは書かず、ファイルを変更せず、コミットもしない。複数案に実質的な差がある場合だけ、利点・欠点を簡潔に比較してユーザーの判断を待つ。

### 5. 最小限の横展開を行う

広範な履歴調査は不要である。次だけを行う。

- `git log -- <対象ファイル>` で経緯を確認する。
- `rg` で同じバリデーション、例外変換、計算式、API呼び出しなどの実装パターンを探す。

見つけた候補は修正せず、影響候補として報告する。時間を要する網羅調査や過去Issueの総点検はしない。

## 報告形式

以下の見出しを保ち、未確認なら「未確認」と明記する。Notionへ転記できるMarkdownにする。

```markdown
【現状】
発生している事実、再現条件、実行した確認と結果を記載する。

【本来】
期待される挙動を、根拠となる設計書のファイル名・章番号とともに記載する。

【直接原因】
確認できたコード上または設定上の原因を記載する。再現できなければ断定しない。

【根本原因】
git履歴や設計との関係から、なぜ混入・残存したかを記載する。確認できない場合は未確認とする。

【修正方針】
対象ファイル、責務、変更の考え方、確認観点を記載する。コードは書かない。

【類似見直し（横展開）】
同じパターンの検索結果と、影響候補の有無を記載する。

【横展開スコープ】
追加で対応が必要になりそうな箇所だけを記載する。なければ「なし」とする。

【横展開スコープの確認観点】
対象があれば、既存テスト、追加すべきテスト観点、または手動確認手順を記載する。
```

最後に「この調査ではコード変更・コミットを行っていない」ことを一文で明記する。
