<!--
doc-type: 開発方針
id-prefix: なし
related: docs/development/README.md, docs/development/specification-driven-development.md, docs/requirements/summary/README.md
-->

# AI支援開発

## 目的

AIを使って要件整理、基本設計、コードレビューを支援する。

AI出力は正式成果物ではなく、レビュー対象のたたき台として扱う。

## 基本方針

- AIに作業を依頼する前に、入力となる成果物を明確にする。
- AIの出力は、人間が確認してから成果物へ反映する。
- 未決事項、判断理由、採用しなかった案を必要に応じて記録する。
- AIが判断すべきでないプロダクト判断は、人間が決める。

## ドキュメントメタ情報の語彙

`docs/` 配下のMarkdownファイル先頭に置く `doc-type` は、次のいずれかを使用する。新しいカテゴリを追加する場合は、先にこの一覧と `docs/INDEX.md` を更新する。

| `doc-type` | 対象 |
| --- | --- |
| `要件定義` | 要件、スコープ、業務ルール、受け入れ基準、用語定義 |
| `基本設計` | 画面、画面遷移、API一覧、データモデル、技術スタック |
| `詳細設計` | DBスキーマ、API詳細、業務ロジック、バリデーション、永続化の実装前提 |
| `UIモック` | UIモックの対象画面、確認観点、デザイン方針 |
| `セットアップ` | 開発環境、リポジトリ、初期設定の手順 |
| `開発方針` | 仕様駆動開発、AI支援開発などの開発プロセス |

## 当面使うSkill

Agent Skillは `.agents/skills/` 配下に配置する。

| Skill | 配置 | 用途 |
| --- | --- | --- |
| 要件定義Skill | `.agents/skills/requirements/SKILL.md` | ユーザー要望やユーザーストーリーを要件へ整理する |
| 基本設計Skill | `.agents/skills/basic-design/SKILL.md` | 要件から画面、API、DB、構成を整理する |
| 詳細設計Skill | `.agents/skills/detailed-design/SKILL.md` | 基本設計をもとにDB、API、業務ロジックを実装前提の粒度へ具体化する |
| 実装Skill | `.agents/skills/implementation/SKILL.md` | 承認済みの基本設計・詳細設計をもとに実装する |
| コードレビューSkill | `.agents/skills/code-review/SKILL.md` | 実装差分を要件・設計に照らしてレビューする |

## 現時点では作らないSkill

| Skill | 理由 |
| --- | --- |
| 学習支援Skill | アプリのユーザー向け機能と混ざりやすく、開発支援ルールとしては不要 |
| テスト設計Skill | テスト仕様書を作るか未定 |
