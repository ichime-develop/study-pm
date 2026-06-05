# Webフロントエンド開発環境

## 1. 目的

ReactによるUIモック画面を作成・確認できる環境を構築する。

この環境は、最終的な本実装を開始するためのものではなく、要件定義と画面イメージをすり合わせるための静的モックを動かすことを目的とする。

## 2. 採用方針

| 項目 | 内容 |
| --- | --- |
| 用途 | UIモック作成 |
| フレームワーク | React |
| 言語 | TypeScript |
| ビルドツール | Vite |
| パッケージ管理 | npm |
| データ接続 | なし。固定のダミーデータを利用する |

## 3. 推奨バージョン

| ツール | 推奨 |
| --- | --- |
| Node.js | LTS版 |
| npm | Node.js LTSに同梱されるバージョン |

現在の端末でバージョンを確認する。

```bash
node --version
npm --version
```

## 4. ディレクトリ構成

UIモックはリポジトリ直下の`mock/`で管理する。

```text
mock/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
```

## 5. セットアップ

依存関係をインストールする。

```bash
cd /Users/ichikawa/StudioProjects/study-pm/mock
npm install
```

## 6. 起動

ローカル開発サーバーを起動する。

```bash
cd /Users/ichikawa/StudioProjects/study-pm/mock
npm run dev
```

Viteが表示するローカルURLをブラウザで開き、画面を確認する。

## 7. ビルド確認

モックがTypeScriptとViteのビルドを通ることを確認する。

```bash
cd /Users/ichikawa/StudioProjects/study-pm/mock
npm run build
```

## 8. 注意事項

- `mock/`は要件検証用のUIモックであり、本番アプリではない。
- 認証、API通信、DB接続、永続化は実装しない。
- 保存操作は画面上の状態確認に必要な範囲だけ扱う。
- ダミーデータには実在の個人情報、認証情報、秘密情報を含めない。
- UIモックで見つかった要件の不足や矛盾は、要件定義書へフィードバックする。

