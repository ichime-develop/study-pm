---
name: detailed-design
description: Use when turning study-pm basic design into implementation-ready detailed design for DB schema, API details, business logic, validations, exceptions, and persistence behavior.
---

# Detailed Design Skill

## Purpose

基本設計をもとに、PC Web版 `study-pm` の詳細設計案を作る。

## When to use

- DBスキーマ、型、制約、外部キー、インデックスを具体化するとき
- API詳細設計として入出力、例外、HTTPステータス、バリデーションを整理するとき
- 業務ロジック詳細設計として計算式、更新順序、履歴保存条件を具体化するとき
- 実装前に、基本設計だけでは不足する判断を埋めるとき

## Instructions

- まず関連する要件定義、基本設計、必要ならUIモックを確認する。
- 原則として、最初に詳細設計案を提示する。ユーザーが明示的に依頼した場合のみファイルを変更する。
- 詳細設計では、実装者がそのまま実装に着手できる粒度まで具体化する。
- 要件定義や基本設計を勝手に変更しない。矛盾があれば明記する。
- 型、制約、バリデーション、例外、保存順序、責務分担を曖昧にしない。
- 要件、基本設計、詳細設計、実装を混同しない。
- 未決事項は残してよいが、実装を止める重要事項だけに絞る。

## Output format

- 対象と目的
- 前提となる要件・基本設計
- 構造と責務
- 型、制約、入出力、例外
- 保存・更新・計算ルール
- 要件との対応
- 矛盾点
- 未決事項

## Notes

- 詳細設計は、必要になった領域だけ作る。
- 実装コードそのものではなく、実装者の判断を減らすための設計成果物として扱う。
