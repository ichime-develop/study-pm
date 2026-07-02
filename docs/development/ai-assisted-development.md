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

## 当面使うSkill

Agent Skillは `.agents/skills/` 配下に配置する。

| Skill | 配置 | 用途 |
| --- | --- | --- |
| 要件定義Skill | `.agents/skills/requirements/SKILL.md` | ユーザー要望やユーザーストーリーを要件へ整理する |
| 基本設計Skill | `.agents/skills/basic-design/SKILL.md` | 要件から画面、API、DB、構成を整理する |
| コードレビューSkill | `.agents/skills/code-review/SKILL.md` | 実装差分を要件・設計に照らしてレビューする |

## 現時点では作らないSkill

| Skill | 理由 |
| --- | --- |
| 学習支援Skill | アプリのユーザー向け機能と混ざりやすく、開発支援ルールとしては不要 |
| 詳細設計Skill | 詳細設計を作るか未定 |
| テスト設計Skill | テスト仕様書を作るか未定 |
