<!--
doc-type: 要件定義
id-prefix: UC, PRJ, WBS, LOG, EVM, PLN, USR, HME, AU, PJ, WB, SL, AN, AI, CM, SCR, DSG-TBD, REV
related: docs/requirements/details/functional.md, docs/requirements/details/data-screens-interfaces.md, docs/basic-design/screen-list.md
-->

# 用語定義


| 用語 | 定義 |
| --- | --- |
| アカウント（Account） | 要件定義上の「ユーザー」に対応する実装上のエンティティ。メールアドレス、パスワードハッシュ、表示名を保持し、認証情報と所有データの起点となる |
| 学習プロジェクト | 学習目標、期間、計画工数をまとめる管理単位。例: Java Silver合格、SQL基礎習得 |
| WBS | 学習内容を親タスクとタスクで整理するタスク構造 |
| WBSタスク | 親タスクまたはタスクの総称 |
| 親タスク | WBS上でタスクをまとめる見出し。章、単元、学習テーマなどのまとまりを表し、予定日、予定工数、実績工数、進捗率、学習記録は持たない |
| タスク | 実際に学習する作業。親タスク配下にも、親なしの最上位にも登録でき、予定日、予定工数、進捗率を入力する。実績工数は学習記録から集計する |
| 親なしタスク | 親タスクに紐づかず、WBSの最上位に表示されるタスク |
| リーフタスク | タスクと同義。プロジェクト集計、EVM、バーンダウンの計算対象となる最小単位 |
| 予定工数 | タスク完了に必要と見積もった時間 |
| 実績工数 | 学習記録の学習時間から集計した、実際に学習した時間 |
| 進捗率 | タスクの完了度を0%から100%で表した値 |
| 学習記録 | 実際に学習した日付、対象タスク、学習時間、任意メモを残す記録 |
| 学習記録メモ | 学習中の気づき、補足、振り返りとして学習記録に任意で残すメモ |
| 連続学習日数 | JST当日を基準日として、同一ユーザーの学習記録が連続して存在する日数。判定対象日は登録日時ではなく、ユーザーが入力した学習日とする |
| 総学習時間 | 同一ユーザーの学習記録に登録された学習時間の合計 |
| プロジェクト学習時間 | 対象プロジェクトに属する学習記録に登録された学習時間の合計 |
| プロジェクト連続日数 | 対象プロジェクトの学習記録のみを対象に、ユーザーが入力した学習日の連続性をJST当日基準で算出した日数。ユーザー単位の連続学習日数とは独立した指標 |
| AI学習計画 | 学習目標、期限、学習内容の概要または教材目次、学習可能時間をもとにAIが生成するWBSと学習予定の案 |
| OCR結果 | 教材目次画像から読み取ったテキスト。ユーザーが修正してからAI学習計画生成に利用する |
| 学習項目候補 | 概要、目次テキスト、修正済みOCR結果から抽出またはAIが補足した、WBS生成前の確認対象。入力由来またはAI補足の由来と、重点・通常・軽め・除外の優先度を持つが、親タスクやタスクそのものではない |
| 確認済み候補一覧 | ユーザーが現在の学習項目候補の内容と優先度を一括確認した状態。候補の編集、追加、削除により確認済み状態は解除される |
| 構造化数量条件 | 「全300ページを1日10ページ」のような自然文を、単位・総量・1日量へ構造化したWBS生成条件。AIが解釈案を作り、ユーザー確認後にサーバーが必要日数を計算する |
| WBS下書き | 確認済み学習項目候補と生成条件からAIが生成し、サーバー検証を通過した保存前の計画案。ユーザーが編集・確認した後に限り、プロジェクトとWBSへ変換できる |
| AI処理ジョブ | 学習項目候補の抽出またはWBS下書きの生成を非同期に実行し、状態、期限、失敗理由、停止要求を管理する単位 |
| 基準日 | EVM、遅延、バーンダウンを算出する対象日。進捗分析ではJST当日に固定する |
| BAC | Budget at Completion。プロジェクト全体の予定工数 |
| PV | Planned Value。基準日時点で完了予定だった作業の予定工数 |
| EV | Earned Value。進捗率に応じて完了したとみなす予定工数 |
| AC | Actual Cost。本アプリでは実績工数 |
| SPI | Schedule Performance Index。スケジュール効率を表す指標 |
| CPI | Cost Performance Index。本アプリでは工数効率を表す指標 |
| バーンダウンチャート | 日ごとの残予定工数を表示するグラフ |

## ID体系一覧

| ID体系 | 書式 | 用途 | 定義・主な参照 |
| --- | --- | --- | --- |
| ユースケースID | `UC-01` | ユースケースを識別する | `docs/requirements/details/scope.md` |
| 機能要件ID | `PRJ-01`, `WBS-01`, `LOG-01`, `EVM-01`, `PLN-01`, `USR-01`, `HME-01` | 機能要件を機能領域別に識別する | `docs/requirements/details/functional.md` |
| 画面ID | `AU01`, `PJ01`, `WB01`, `SL01`, `AN01`, `AI01` | 画面単位を識別する | `docs/basic-design/screen-list.md`, `docs/requirements/details/data-screens-interfaces.md` |
| 共通部品ID | `CM01` | 複数画面で使う共通UI部品を識別する | `docs/basic-design/screen-list.md`, `docs/requirements/details/data-screens-interfaces.md` |
| 画面内要件ID | `SCR.PJ01-01`, `SCR.WB01-01` | 画面内の表示項目、操作、状態などの要件を識別する | `docs/requirements/details/data-screens-interfaces.md` |
| 保留事項ID | `DSG-TBD-01` | 要件定義・基本設計で未確定の事項を識別する | `docs/requirements/details/acceptance.md`, `docs/requirements/review/requirements-review.md`, `docs/basic-design/tech-stack.md` |
| API保留事項ID | `API-TBD-06` | API設計で未確定の事項を識別する | `docs/basic-design/api-list.md` |
| レビュー指摘ID | `REV-01` | レビューで出た指摘・確認事項を識別する | `docs/requirements/review/requirements-review.md` |
| API ID | `API-PJ-01`, `API-WB-05` | REST APIのエンドポイント単位を識別する | `docs/basic-design/api-list.md` |

画面IDはハイフンを含まない `2文字+2桁` の形式とする。画面内要件IDは機能要件IDと混同しないよう、必ず `SCR.` を付ける。
