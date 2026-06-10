---
name: basic-design
description: Use when turning study-pm requirements and UI mocks into basic design proposals for screens, navigation, APIs, data model direction, and core business logic.
---

# Basic Design Skill

## Purpose

要件定義とUIモックをもとに、PC Web版 `study-pm` の基本設計案を作る。

## When to use

- 要件から画面構成、画面遷移、画面責務を整理するとき
- API方針、データモデル方針、主要な業務ロジックを整理するとき
- UIモックと要件のずれを確認するとき
- 実装前に、設計上の未決事項を洗い出すとき

## Instructions

- まず関連する要件定義とUIモックを確認する。
- 原則として、最初に設計案を提示する。ユーザーが明示的に依頼した場合のみファイルを変更する。
- 基本設計では、実装者が迷わない粒度まで整理する。
- 詳細設計の粒度まで踏み込みすぎない。
- 要件にない機能を勝手に追加しない。
- 画面、API、データ、業務ルールの対応関係を明確にする。
- 既存の要件、設計、UIモックと矛盾する場合は、矛盾点を明記する。
- 実装者が判断に迷う重要事項は、未決事項として残す。

## Output format

- 画面構成
- 画面遷移
- API方針
- データモデル方針
- 主要な業務ロジック
- 要件との対応
- 矛盾点
- 未決事項

## Notes

- 現時点では詳細設計書を必ず作る前提にしない。
- テスト仕様書は必要になった時点で作成する。
- 技術スタックが未確定の場合は、決め打ちせず基本設計の検討事項として扱う。
