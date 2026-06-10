---
name: code-review
description: Use when reviewing study-pm implementation diffs against requirements, basic design, maintainability, and executed validation results.
---

# Code Review Skill

## Purpose

実装差分を、要件・基本設計・保守性・検証結果の観点でレビューする。

## When to use

- 実装差分が要件や設計に合っているか確認するとき
- バグ、仕様逸脱、データ不整合、テスト不足を見つけたいとき
- PR、ローカル差分、レビュー依頼への回答を整理するとき
- 実装後に追加で必要な検証を洗い出すとき

## Instructions

- まず差分、関連要件、関連設計、実行済みの検証結果を確認する。
- 好みの指摘ではなく、バグ、仕様逸脱、保守性、テスト不足を優先する。
- 指摘には対象ファイル、問題、理由、影響、修正方針を含める。
- 要件や設計が曖昧な場合は、コードを無理に直さず未決事項として扱う。
- レビュー依頼だけの場合は、ユーザーが明示的に依頼するまでファイルを変更しない。
- 問題がない場合でも、残るリスクや未検証事項を明記する。

## Output format

- Findings
- Open questions
- Required fixes
- Suggested follow-ups
- Validation status

## Notes

- レビュー結果は対象成果物やPRの近くに残し、レビュー方法はこのSkillで管理する。
- GitHub上へ返信、レビュー投稿、スレッド解決を行う場合は、ユーザーの明示指示を待つ。
