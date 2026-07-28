<!--
doc-type: セットアップ
id-prefix: なし
related: docs/setup/README.md, docs/basic-design/tech-stack.md, docs/detailed-design/implementation-policy.md
-->

# ローカル起動と画面確認

## 1. 目的

ローカルのPostgreSQL、バックエンド、frontendを起動し、ブラウザでMVP1の画面を確認する手順をまとめる。UIモックは、実装との表示比較が必要なときだけ別途起動する。

## 2. 前提条件

- Docker Desktopが起動していること。
- Java 25 LTSが導入されていること。VS CodeタスクはmacOSの`/usr/libexec/java_home -v 25`でJDK 25を選択する。
- Node.jsが導入されていること。必要なバージョンは[技術スタック](../basic-design/tech-stack.md)を正とし、Vite 7の要件はNode.js 20.19+または22.12+である。
- `frontend/` と `mock/` で依存パッケージを導入済みであること（初回のみ各ディレクトリで`npm install`を実行する）。

## 3. 使用ポート

| 用途 | ポート | URLまたは接続先 |
| --- | --- | --- |
| frontend | 5173 | `http://localhost:5173` |
| バックエンドAPI | 8080 | `http://localhost:8080` |
| UIモック | 5174 | `http://localhost:5174` |
| PostgreSQL | 5432 | `localhost:5432` |

frontendはバックエンドのCORS許可originに合わせて5173へ固定している。`--port`で別ポートに変更せず、ブラウザも`127.0.0.1`ではなく`localhost`で開く。

## 4. VS Codeから起動する

1. VS Codeで本リポジトリを開く。
2. タスク一覧から`2. backend起動 (:8080)`を選ぶ。DBを起動した後、backendを8080で起動する。
3. 実行とデバッグの構成で`frontendを起動してChromeを開く (:5173)`を選択し、`F5`または実行ボタンを押す。frontendを起動完了後、Chromeで`http://localhost:5173`を開く。5173でfrontendが起動済みなら、そのサーバーを再利用する。
4. 一括で起動する場合は、タスク一覧から`アプリ一式を起動 (DB→backend→frontend)`を選ぶ。

UIモックを比較に使う場合は、実行とデバッグの構成で`UIモックを起動してChromeを開く (:5174)`を選ぶ。タスクだけを起動する場合は、タスク一覧から`mock起動 (:5174)`を選ぶ。モックはAPIへ接続しないため、frontendと同時に起動できる。

## 5. ターミナルから起動する

3つのターミナルで次を実行する。

```bash
# ターミナル1: PostgreSQL
docker compose up -d
```

```bash
# ターミナル2: バックエンド
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
export PATH="$JAVA_HOME/bin:$PATH"
./mvnw -f backend/pom.xml spring-boot:run
```

```bash
# ターミナル3: frontend
cd frontend && npm run dev
```

UIモックを比較に使う場合は、追加のターミナルで起動する。

```bash
cd mock && npm run dev
```

## 6. 初回の確認

新規DBにはアカウントが存在しない。`http://localhost:5173/signup`でアカウントを登録した後、プロジェクト一覧を表示する。

ログイン後にブラウザを再読み込みしてもログイン状態が維持されることを確認する。access tokenは再取得され、refresh tokenはHttpOnly Cookieで扱われる。

## 7. 停止する

frontendとバックエンドは、それぞれのターミナルで`Ctrl+C`を押して停止する。PostgreSQLは次で停止する。

```bash
docker compose down
```

DBデータも削除して初期状態へ戻す場合だけ、次を実行する。

```bash
docker compose down -v
```

## 8. トラブルシューティング

| 症状 | 確認すること |
| --- | --- |
| `UnsupportedClassVersionError`でバックエンドが起動しない | `java -version`が25を示すことを確認する。ターミナル起動時は`JAVA_HOME`と`PATH`をJDK 25へ切り替える。 |
| ブラウザでCORSエラーになる | frontendが5173で起動していること、URLが`http://localhost:5173`であり`127.0.0.1`ではないことを確認する。 |
| バックエンドが起動しない | 先にDBを起動する。FlywayとHibernateのDDL検証にはPostgreSQL接続が必要である。 |
| ポートを使えない | frontendとUIモックのVS Code起動タスクは、同じポートで起動済みのサーバーを再利用する。想定外のプロセスが5173、5174、8080、5432を使用している場合は停止する。frontendとUIモックは`strictPort`のため、別ポートへ自動変更されない。 |
| ログインできない | 新規DBではアカウントがないため、`/signup`から登録する。 |
| `verify`が失敗する | Testcontainersを使うITがあるため、Docker Desktopが起動していることを確認する。通常の`test`はDocker不要である。 |
