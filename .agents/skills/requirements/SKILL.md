---
name: requirements
description: Use when organizing study-pm user requests, user stories, existing requirements, and review comments into requirement change proposals without mixing in design or implementation details.
---

# Requirements Skill

## Purpose

`study-pm` のユーザー要望、ユーザーストーリー、既存要件、レビュー指摘をもとに、要件定義の追加・修正案を作る。

## When to use

- 新しい要望を要件へ反映するか判断するとき
- ユーザーストーリーから機能要件、業務ルール、受入条件を整理するとき
- 既存要件の矛盾、不足、MVP範囲のずれを確認するとき
- 要件定義レビューの指摘を反映するとき

## Instructions

- まず `docs/requirements/summary/README.md` と関連する `docs/requirements/details/` のファイルを確認する。
- 原則として、最初に修正案を提示する。ユーザーが明示的に依頼した場合のみファイルを変更する。
- 要件に入れる内容と、基本設計以降へ送る内容を分ける。
- MVP範囲を不用意に広げない。MVPへ入れる場合は、どのMVPに入るかを明記する。
- 技術スタック、DB物理設計、API詳細、画面部品の実装方式は要件へ混ぜない。
- 既存の要件、設計、UIモックと矛盾する場合は、矛盾点を明記する。
- AI出力は正式要件ではなく、人間が確認するたたき台として扱う。
- 未決事項、判断理由、採用しなかった案を必要に応じて残す。

## Output format

- 要件へ追加・修正する内容
- 要件へ入れない内容
- 影響する既存ファイル
- 矛盾点
- 未決事項
- 判断理由

## Notes

- `study-pm` はPC Web版を主対象とし、将来Flutterスマホアプリ向けAPI仕様も考慮する。
- 仕様駆動開発は開発者側の学習・開発方針であり、アプリのMVP機能には含めない。
