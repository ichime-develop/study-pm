---
name: implementation
description: Use when implementing study-pm features from approved basic design and detailed design into backend, frontend, tests, migrations, or integration code. Trigger for MVP implementation tasks, Spring Boot backend work, React frontend work, Flyway migrations, API wiring, business logic implementation, and implementation fixes that must follow docs/development/coding-guidelines.md.
---

# Implementation Skill

## Purpose

承認済みの基本設計・詳細設計を入力として、PC Web版 `study-pm` の実装を進める。

## Inputs

コードを編集する前に、タスクに必要なドキュメントだけを読む。

- `docs/INDEX.md` から現在の正本を辿る。
- 機能スコープ、API一覧、データモデル、画面遷移、技術スタックは `docs/basic-design/` を使う。
- DBスキーマ、業務ロジック、バリデーション、例外、永続化の挙動は `docs/detailed-design/` を使う。
- 実装の挙動を要件まで遡って確認する必要がある場合は `docs/requirements/` を使う。
- 命名、コメント、クラス設計、メソッド設計、フロントエンド命名、テスト命名は `docs/development/coding-guidelines.md` を使う。
- `mock/` はUI・参照用としてのみ使う。ユーザーが明示的に依頼しない限り、`mock/` へコーディングスタイルのコメントや命名修正を後追いで加えない。

## Workflow

1. ファイルを変更する前に、関連する設計と既存実装を確認する。
2. 実装対象と、入力に使った設計ドキュメントを述べる。
3. 実装は承認済みのMVP範囲内に収める。
4. 新しい構造を発明するより、既存のローカルパターンとプロジェクト用語を優先する。
5. バックエンド・フロントエンド・マイグレーション・テストを、依存関係を壊さない小さな単位で実装する。
6. 設計の矛盾や未決定事項が実装を妨げる場合は、勝手にプロダクト挙動を作らず報告する。
7. 実行可能な検証のうち最も関連するものを実行し、実行できなかった検証は報告する。

## Coding Rules

- `docs/development/coding-guidelines.md` に従う。
- 新規ソースファイルの先頭に、責務を示す短いコメントを書く。
- 要件・基本設計・詳細設計・glossary の名前を使う。
- 明確な境界上の理由がない限り、`Info`、`Data`、`Manager`、`Util`、`Common`、`xxxFlag` を避ける。
- 業務ロジックをControllerやUIコンポーネントに置かない。責務が分かる名前のドメインオブジェクト、Service、Calculator、Validator に置く。
- boolean は `is...` / `has...` / `can...` を使う。
- コメントは責務・理由・業務ルール・セキュリティ判断・自明でない例外に絞る。コードの言い換えを書かない。

## Backend Rules

- `tech-stack.md` の定義どおり、Java 25 + Spring Boot 3.x + Spring Data JPA + Flyway + PostgreSQL を使う。
- データベースオブジェクトは `docs/detailed-design/database-schema.md` に合わせる。
- スキーマ変更はFlywayマイグレーションで行う。Hibernate のDDL生成に依存しない。
- 学習工数を表す時間・計算値には `BigDecimal` を使う。
- 業務日付には `LocalDate`、タイムスタンプには `Instant` または `OffsetDateTime` を使う。
- `api-list.md` の共通エラー応答形式を維持する。
- 認証の挙動は `api-list.md` のJWT・リフレッシュトークンのハッシュ保存・Cookieルールに合わせる。

## Frontend Rules

- 本実装は `frontend/` に作り、`mock/` は参照のみとして扱う。
- `tech-stack.md` の定義どおり、React + TypeScript + Vite、React Router、TanStack Query、独自CSS を使う。
- コンポーネントはPascalCase、フックは `useXxx`、propsは `onXxx`、ローカルハンドラは `handleXxx` にする。
- `any` を避け、型付きのAPIモデルを使い、`unknown` は絞り込む。
- サーバー状態はTanStack Query、ローカルUI状態はReactのstateに置く。
- 設計ドキュメントが別途指示しない限り、承認済みUIモックのUI用語・レイアウト意図・操作パターンを維持する。
- 通常画面の表面コンテナとセクション見出しには `shared/components/Panel.tsx` の `Panel` / `PanelHeader` を使う。複数画面で使う余白、枠線、見出し構造を画面固有のCSSで再定義しない。
- 文字サイズ、行間、フォント、色、角丸、共通余白は `shared/styles/global.css` のトークンを使う。通常画面での直接的な値指定は、画面固有の構造上必要な場合に限定する。

## Testing And Validation

- 挙動のリスクが意味を持つ場合は、実装スライスと一緒にテストを追加・更新する。
- バックエンドの単体テストは `XxxTest`、Testcontainers/PostgreSQL の結合テストは `XxxIT` と命名する。
- フロントエンドのテストは `Xxx.test.tsx` と命名し、ユーザーに見える挙動を通してテストする。
- バックエンドのスキーマ/API作業では、検証を次の順で優先する: コンパイル/テスト → PostgreSQLへのFlywayマイグレーション → 対象APIのテスト。
- フロントエンド作業では、検証を次の順で優先する: 型チェック → 単体/コンポーネントテスト → ビルド → ローカルUI挙動が重要な場合はブラウザ確認。

## Output

完了を報告するときは、次を含める。

- 実装した内容。
- 実装を駆動した設計ドキュメント。
- 変更したファイルの概要。
- 実行した検証と、失敗または利用不可だったツール。
- 残るリスクまたは後続の実装スライス。
