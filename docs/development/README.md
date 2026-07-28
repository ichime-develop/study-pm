<!--
doc-type: 開発方針
id-prefix: なし
related: docs/development/ai-assisted-development.md, docs/development/specification-driven-development.md, docs/INDEX.md
-->

# 開発方針

## 目的

このフォルダは、`study-pm` をどのような方針で開発するかを管理する。

ここに置く内容は、ユーザーへ提供するアプリ機能ではなく、開発者自身の学習・開発運用の方針である。

## 位置づけ

- 要件定義、設計、実装、レビューを段階的に進める。
- AIに丸投げせず、AI出力は人間がレビューして採用可否を判断する。
- 未決事項、判断理由、レビュー結果を成果物として残す。
- 仕様駆動開発はMVP機能ではなく、開発者側の裏ゴールとして扱う。

## 関連ファイル

| ファイル | 内容 |
| --- | --- |
| [specification-driven-development.md](specification-driven-development.md) | 仕様駆動開発の進め方 |
| [ai-assisted-development.md](ai-assisted-development.md) | AI支援開発の使い方と注意点 |
| [coding-guidelines.md](coding-guidelines.md) | 命名、コメント、クラス設計、メソッド設計の判断基準 |
| [ci-and-branch-policy.md](ci-and-branch-policy.md) | CIの検証内容とmain保護、ブランチ運用の方針 |
