<!--
doc-type: 開発方針
id-prefix: なし
related: docs/development/README.md, docs/development/ai-assisted-development.md, docs/basic-design/tech-stack.md, docs/basic-design/data-model.md, docs/detailed-design/business-logic.md
-->

# コーディング規約

## 1. 目的

実装時の命名、コメント、クラス設計、メソッド設計の基準を定義し、AI支援開発でも読み手が業務意図を追いやすいコードにする。

本書は詳細なフォーマット規約ではなく、コード上に業務意図と設計判断を保つための判断基準を扱う。

## 2. 基本方針

- 名前は、存在そのものではなく、そのコードが担う業務目的・責務を表す。
- コメントは、処理内容の説明ではなく、設計判断・業務ルール・例外的な理由を補足する。
- データと、そのデータを守るロジックをできるだけ近くに置く。
- 不正な状態を作りにくいクラスにする。
- 要件・設計で決まっている用語を優先し、実装だけの別名を不用意に作らない。
- 迷った場合は、より具体的で意味が狭い名前を選ぶ。

## 3. 命名規約

### 3.1 業務用語と設計書を優先する

エンティティ、テーブル、API、状態値は、要件定義・基本設計・詳細設計の用語に合わせる。

例:

- `Account`
- `Project`
- `WbsTask`
- `StudyLog`
- `RefreshToken`
- `project_period_history`
- `wbs_task_progress_history`

要件上の「ユーザー」は、実装上ではログイン主体として `Account` を使う。これは `glossary.md` の定義に従う。

代表的な要件用語と実装識別子の対応は次の通り。正本は `glossary.md` と各設計書とする。

| 要件用語 | 実装識別子 |
| --- | --- |
| ユーザー | `Account` |
| リーフタスク | `LEAF`（`WbsTask.task_type`） |
| 親タスク | `PARENT`（`WbsTask.task_type`） |

### 3.2 目的駆動で名前を付ける

広すぎる名前よりも、責務が分かる名前を選ぶ。

避けたい例:

```java
class ProjectManager {
}

class TaskInfo {
}
```

望ましい例:

```java
class ProjectDeletionService {
}

class ProjectSummaryService {
}

class WbsProgressHistory {
}
```

ただし、初期実装では `ProjectService` のような広めのService名を許容する。責務が増えた時点で、削除・集計・状態遷移などの目的別Serviceへ分割する。

### 3.3 避ける名前

次の名前は、DTOや明確な境界用途を除き原則避ける。

| 避ける名前 | 理由 |
| --- | --- |
| `Info` | 何のための情報かが曖昧になり、データ入れ物になりやすい |
| `Data` | 業務目的が表れにくい |
| `Manager` | 責務が肥大化しやすい |
| `Util` | ロジックの置き場が曖昧になりやすい |
| `Common` | 業務責務を隠しやすい |
| `xxxFlag` | booleanは `is...` / `has...` / `can...` など「〜かどうか」が分かる名前にする |

DTO、Request、ResponseはAPI境界の型として許容する。

例:

```java
record LoginRequest(String email, String password) {
}

record ProjectSummaryResponse(...) {
}
```

### 3.4 メソッド名

業務ロジックは、できるだけ対象オブジェクトまたは責務を持つServiceへ寄せる。

避けたい例:

```java
calculateProjectProgress(project);
updateTaskProgress(task, progressRate);
```

望ましい例:

```java
projectProgress.calculate(projectId);
wbsTask.updateProgress(progressRate);
```

副作用があるメソッドは、何が変わるか分かる名前にする。

例:

```java
refreshToken.revoke(now);
wbsProgressHistory.recordInitialProgress(task, now);
projectStatus.revertToInProgressIfNeeded(project);
```

### 3.5 表記（ケース）規約

層ごとの表記は次の通りにする。

| 対象 | 表記 | 例 |
| --- | --- | --- |
| Javaクラス・レコード・enum型 | PascalCase | `WbsTaskService`, `ProjectStatus` |
| Javaメソッド・フィールド・変数・引数 | camelCase | `plannedHours` |
| Java定数（static final） | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| enum値 | UPPER_SNAKE_CASE | `NOT_STARTED`, `PARENT`, `LEAF` |
| パッケージ | すべて小文字・区切りなし | `com.studypm.wbs` |
| DBテーブル・カラム | snake_case（テーブルは複数形、履歴は単数形） | `wbs_tasks`, `project_period_history` |
| JSONフィールド | camelCase | `wbsTaskId`, `studyDate` |
| RESTパス | kebab-case・複数形リソース | `/api/wbs-tasks`, `/api/study-logs` |

enum値・DB・JSON・RESTの具体値は `data-model.md`、`database-schema.md`、`api-list.md` を正本とし、本表は表記形式のみを示す。

### 3.6 フロントエンド命名（TypeScript / React）

React 19 + TypeScript + TanStack Query + React Router + 独自CSSの前提で、次の命名に揃える。

- コンポーネント名はPascalCaseにし、1ファイル1主コンポーネントを基本とする。
- カスタムフックは `useXxx` とする。
- イベントハンドラはprops側を `onXxx`、実装側を `handleXxx` とする。
- 型・インターフェースはPascalCaseにする。`any` は避け、不明な値は `unknown` と絞り込みで扱う。
- booleanはバックエンドと同様、`is...` / `has...` / `can...` を優先する。
- TanStack Queryの `queryKey` は `["リソース名", ...識別子, "サブリソース"]` を基本形にする。

例:

```tsx
type Project = {
  id: string;
  name: string;
};

const ProjectOverview = ({ project, onMove }: ProjectOverviewProps) => {
  const handleMoveToWbs = () => onMove("wbs");
  const hasStudyLogs = project.studyLogCount > 0;

  // ...
};
```

```tsx
useQuery({ queryKey: ["projects", "list", filters] });
useQuery({ queryKey: ["projects", projectId, "overview"] });
useQuery({ queryKey: ["projects", projectId, "wbs"] });
```

業務用語・設計書を優先し、値の意味を名前で表す方針はTypeScriptでも同様に適用する。

### 3.7 テスト命名

バックエンドはJUnit 5 + Testcontainers、フロントエンドはVitest + Testing Libraryを前提にする。

- バックエンド単体テストクラスは `XxxTest` とする。
- 実PostgreSQLを使う結合テストは `XxxIT` とし、単体テストと区別する。
- テストメソッド名は検証意図が分かる名前にする。必要に応じて日本語 `@DisplayName` を併用してよい。
- フロントエンドのテストファイルは `Xxx.test.tsx` とし、ユーザー操作単位で記述する。

例:

```java
class ProjectCompletionServiceTest {

    @Test
    @DisplayName("完了条件を満たさないプロジェクトは完了にできない")
    void rejectsCompletionWhenAnyLeafTaskIsIncomplete() {
    }
}
```

```tsx
describe("StudyLogList", () => {
  it("学習記録の行を選択すると詳細パネルを表示する", async () => {
  });
});
```

## 4. クラス設計規約

### 4.1 データクラス化を避ける

DTO、Request、Response、JPA Entityなどの境界用途を除き、フィールドだけを持つクラスを作らない。

業務上の制約や判断を持つ概念は、その概念を表すクラスまたはServiceにロジックを寄せる。

避けたい例:

```java
class WbsTaskData {
    BigDecimal plannedHours;
    int progressRate;
}
```

望ましい例:

```java
class WbsTask {
    private BigDecimal plannedHours;
    private int progressRate;

    boolean isCompleted() {
        return progressRate == 100;
    }

    void updateProgress(int nextProgressRate) {
        // 進捗率の範囲・刻みはこのクラスまたはServiceで守る。
    }
}
```

### 4.2 コンストラクタやファクトリで正常状態を作る

インスタンス生成直後に不正状態にならないよう、必須値と値域を生成時に検証する。

例:

```java
record ProgressRate(int value) {
    ProgressRate {
        if (value < 0 || 100 < value || value % 10 != 0) {
            throw new IllegalArgumentException("進捗率は0〜100の10刻みで指定してください。");
        }
    }
}
```

### 4.3 値オブジェクトを検討する

単なる `String`, `int`, `BigDecimal` では意味や制約が曖昧になる値は、値オブジェクト化を検討する。

候補:

- `ProgressRate`
- `StudyHours`
- `PlannedHours`
- `ProjectPeriod`

ただし、初期実装では過剰に細分化しない。制約が複数箇所に重複し始めた値、または取り違えが起きやすい値から優先して導入する。

### 4.4 不変性を優先する

ローカル変数、引数、DTO、値オブジェクトは、可能な限り再代入や後続変更を避ける。

- Javaでは `record` を積極的に使う。
- コレクションは外部から変更されない形で渡す。
- 値を変更する業務操作は、意図が分かるメソッド名にする。

JPA Entityは永続化の都合で可変になり得る。その場合もsetterを無制限に公開せず、業務操作メソッドを通して状態を変える。

例:

```java
project.rename(nextName);
wbsTask.updatePlan(nextPlan);
studyLog.correctHours(nextStudyHours);
```

### 4.5 static / Util / Commonの扱い

特定の業務オブジェクトの状態を使う処理は、staticメソッドやUtilへ逃がさない。

staticを許容する例:

- 状態を持たないファクトリ
- 汎用的な変換
- フレームワーク設定
- テストデータ生成

避けたい例:

```java
WbsTaskUtil.isCompleted(task);
```

望ましい例:

```java
task.isCompleted();
```

### 4.6 継承よりコンポジションを優先する

業務ルールの差し替えや組み合わせは、継承で階層化する前に、部品として持たせる構造を検討する。

例:

```java
class ProjectSummaryService {
    private final ProjectProgressCalculator projectProgressCalculator;
    private final StudySummaryCalculator studySummaryCalculator;
}
```

## 5. メソッド設計規約

### 5.1 ガード節で不正条件を先に弾く

ネストを深くせず、対象外条件や異常条件は早い段階で返すか例外にする。

例:

```java
if (!task.isLeaf()) {
    throw new IllegalArgumentException("学習記録はリーフタスクにのみ登録できます。");
}
if (studyDate.isAfter(today)) {
    throw new IllegalArgumentException("未来日の学習記録は登録できません。");
}
```

### 5.2 コマンドとクエリを分ける

メソッドは、状態を変更するコマンドか、値を返すクエリのどちらかに寄せる。

避けたい例:

```java
ProjectSummary updateProgressAndGetSummary(...);
```

望ましい例:

```java
wbsProgressService.update(...);
ProjectSummary summary = projectSummaryService.get(...);
```

### 5.3 フラグ引数を避ける

処理を切り替えるためのboolean引数は、呼び出し側の意図が読みにくくなるため避ける。

避けたい例:

```java
projectService.save(project, true);
```

望ましい例:

```java
projectService.create(project);
projectService.update(project);
```

### 5.4 nullを渡さない・返さない

業務ロジックでは、原則としてnullを引数に渡さず、戻り値にも使わない。

- 値がない可能性を表す場合は `Optional` を検討する。
- 一覧は空リストを返す。
- APIレスポンスでは、表示上の `-` と値なしを混同しない。

### 5.5 引数を増やしすぎない

引数が増えた場合は、関係の強い値をRequest、Command、値オブジェクトとしてまとめる。

例:

```java
record UpdateWbsTaskPlanCommand(
        UUID taskId,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        BigDecimal plannedHours
) {
}
```

### 5.6 分岐の重複を避ける

同じ `switch` や `if` の分岐が複数箇所に出てきた場合は、責務の分離を検討する。

ただし、状態値が少なく、分岐が1箇所に閉じている場合は、無理にinterface化しない。重複や変更頻度が見えてから分離する。

### 5.7 コレクション処理は標準APIを使う

手書きループで状態フラグを更新するよりも、意図が伝わる標準APIを優先する。

例:

```java
boolean allCompleted = tasks.stream().allMatch(WbsTask::isCompleted);
BigDecimal totalHours = logs.stream()
        .map(StudyLog::studyHours)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
```

ネストが深くなる場合は、`continue`、早期return、メソッド分割で読みやすさを保つ。

## 6. コメント規約

### 6.1 ファイル先頭に役割を書く

実装ファイルの先頭には、そのファイルが何の責務を持つかを短く書く。

目的は、読み手がファイルを開いた直後に「このファイルで扱う関心事」と「扱わない関心事」を判断できるようにすることである。

Javaの場合は、クラスJavadocまたはファイル先頭コメントとして書く。

例:

```java
/**
 * WBSタスクの作成・更新・削除と、計画履歴・進捗履歴の保存を担当する。
 * プロジェクト全体の集計値は保持せず、参照時に別Serviceで再計算する。
 */
class WbsTaskService {
}
```

```java
/**
 * APIエラー応答の共通形式を表す。
 * 業務例外の判定やHTTPステータスの決定は行わない。
 */
record ApiErrorResponse(String code, String message, List<ApiErrorDetail> details) {
}
```

避けたい例:

```java
/**
 * WbsTaskServiceクラス。
 */
class WbsTaskService {
}
```

ファイル先頭コメントも、処理内容の言い換えではなく、責務・対象範囲・除外範囲を書く。

### 6.2 コメントを書くべき箇所

次の箇所には、短いコメントまたは設計書参照を書く。

- 業務ルールを実装している箇所
- セキュリティ上の判断
- 要件・設計上の例外
- 一見すると不自然だが意図がある制約
- 将来拡張を見越して意図的に残している構造
- 仕様変更時に合わせて見直すべき条件分岐

例:

```java
// api-list.md 4.0: refresh tokenはCookieで扱うため、localStorageには保存させない。
```

```java
// database-schema.md 2.4: タスク削除後も履歴を追跡できるよう、履歴側にsnapshotを残す。
```

```java
// business-logic.md 3.1: 残予定工数は実績時間ではなく進捗量(EV)から求める。
```

### 6.3 コメントを書かなくてよい箇所

名前と型で意図が分かる箇所にはコメントを書かない。

例:

```java
private final PasswordEncoder passwordEncoder;
```

```java
record ApiErrorResponse(String code, String message, List<ApiErrorDetail> details) {
}
```

処理をそのまま言い換えるコメントは避ける。

避けたい例:

```java
// パスワードエンコーダを返す
return PasswordEncoderFactories.createDelegatingPasswordEncoder();
```

望ましい例:

```java
// DelegatingPasswordEncoderを使い、将来ハッシュ方式を移行できるようにする。
return PasswordEncoderFactories.createDelegatingPasswordEncoder();
```

コメントで分かりにくい命名や複雑な構造を補わない。コメントがないと読めない場合は、先に名前、メソッド分割、クラス分割を見直す。

### 6.4 設計書参照の書き方

実装判断が設計書由来の場合は、必要に応じて参照元を短く書く。

形式:

```java
// business-logic.md 5.2: 進捗同値更新では履歴を追加しない。
```

参照は過剰に付けない。業務ルール・セキュリティ・例外的な設計判断に限定する。

### 6.5 コメントも変更対象にする

ロジックを変更した場合は、関連コメントも必ず確認する。古いコメントは、コメントがない状態より危険である。

## 7. レビュー観点

実装レビューでは、次を確認する。

- 名前が業務目的・責務を表しているか。
- ファイル先頭に、そのファイルの責務・対象範囲・除外範囲が短く書かれているか。
- データとロジックが不自然に分離していないか。
- コンストラクタ、ファクトリ、業務メソッドで不正値を防いでいるか。
- setterやpublicフィールドで不正状態を作れる構造になっていないか。
- static / Util / Commonへ業務ロジックが逃げていないか。
- フラグ引数、null戻り値、出力引数がないか。
- 同じ分岐や同じバリデーションが複数箇所に重複していないか。
- UI層に業務ロジックが入り込んでいないか。
- コメントが理由や注意点を説明しているか。処理の言い換えになっていないか。

## 8. AI実装時の注意

AIに実装させる場合は、次を明示する。

- 新しい名前を作る前に、要件・設計書の用語を検索する（3.1参照）。
- `Info`, `Data`, `Manager`, `Util`, `Common` を使う場合は理由を説明する（3.3参照）。
- DTOやJPA Entityを除き、データだけのクラスを作らない（4.1参照）。
- 業務制約はControllerやUIに散らさず、Serviceまたは業務概念のクラスへ寄せる（4.1、5.2参照）。
- 新規ファイルを作る場合は、先頭にそのファイルの役割を短く書く（6.1参照）。
- コメントは「なぜそうするか」を書く。単なる処理説明は書かない（6.2、6.3参照）。
- 複雑な業務ロジックには、該当する要件IDまたは設計書の章をコメントで添える（6.4参照）。
- 生成後に、命名が責務を表しているか、コメントが冗長でないかをレビューする（7章参照）。
