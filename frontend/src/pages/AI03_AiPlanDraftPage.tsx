// AI03 WBS下書き確認画面。下書きを編集・再検証し、通常Project/WBSへ変換する。
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { AiPlanShell } from "../features/aiPlan/AiPlanShell";
import { AiPlanTaskEditPanel } from "../features/aiPlan/AiPlanTaskEditPanel";
import { clearAiPlanInput, loadAiPlanInput } from "../features/aiPlan/aiPlanInputSession";
import type { AiPlanDraft, AiPlanDraftTask } from "../features/aiPlan/aiPlanTypes";
import { useAiPlanDraft, useAiPlanRequest, useConvertAiPlanDraft, useUpdateAiPlanDraft } from "../features/aiPlan/useAiPlan";
import { messageOf } from "../shared/api/errorMessages";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { LoadingPanel } from "../shared/components/LoadingPanel";
import { Panel, PanelHeader } from "../shared/components/Panel";

export const AiPlanDraftPage = () => {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId") ?? undefined;
  const draftQuery = useAiPlanDraft(draftId);
  const requestQuery = useAiPlanRequest(requestId);
  const updateDraft = useUpdateAiPlanDraft(draftId ?? "");
  const convertDraft = useConvertAiPlanDraft(draftId ?? "");
  const [draft, setDraft] = useState<AiPlanDraft | null>(null);
  const [editingTaskKey, setEditingTaskKey] = useState<string | null>(null);
  const [operationError, setOperationError] = useState("");
  const hasAppliedPreferredName = useRef(false);

  useEffect(() => {
    if (draftQuery.data === undefined) return;
    const preferredName = loadAiPlanInput("overview").projectName.trim();
    const next = !hasAppliedPreferredName.current && preferredName !== ""
      ? { ...draftQuery.data, project: { ...draftQuery.data.project, name: preferredName } }
      : draftQuery.data;
    hasAppliedPreferredName.current = true;
    setDraft(next);
  }, [draftQuery.data]);

  const sortedTasks = useMemo(() => draft === null ? [] : sortTasks(draft.tasks), [draft]);
  const editingTask = draft?.tasks.find((task) => task.temporaryKey === editingTaskKey) ?? null;
  const parentTasks = draft?.tasks.filter((task) => task.taskType === "PARENT") ?? [];
  const fallbackSourceKey = requestQuery.data?.sources[0]?.temporaryKey;
  const hasUnsavedProjectChanges = draft !== null && draftQuery.data !== undefined
    && JSON.stringify(draft.project) !== JSON.stringify(draftQuery.data.project);

  if (draftId === undefined) {
    return <ErrorPanel message="WBS下書きの識別子がありません。" />;
  }

  const persistDraft = async (next: AiPlanDraft) => {
    setOperationError("");
    try {
      const saved = await updateDraft.mutateAsync({
        draftRevision: next.draftRevision,
        project: next.project,
        tasks: next.tasks,
      });
      setDraft(saved);
      setEditingTaskKey(null);
    } catch (error) {
      setOperationError(messageOf(error));
    }
  };

  const handleTaskSave = (task: AiPlanDraftTask) => {
    if (draft === null) return;
    void persistDraft({ ...draft, tasks: draft.tasks.map((current) => current.temporaryKey === task.temporaryKey ? task : current) });
  };

  const handleTaskDelete = () => {
    if (draft === null || editingTask === null) return;
    const childCount = draft.tasks.filter((task) => task.parentTemporaryKey === editingTask.temporaryKey).length;
    const message = childCount > 0
      ? `「${editingTask.name}」と配下タスク${childCount}件を削除しますか？`
      : `「${editingTask.name}」を削除しますか？`;
    if (!window.confirm(message)) return;
    void persistDraft({
      ...draft,
      tasks: draft.tasks.filter((task) => task.temporaryKey !== editingTask.temporaryKey && task.parentTemporaryKey !== editingTask.temporaryKey),
    });
  };

  const handleConvert = async () => {
    if (draft === null) return;
    setOperationError("");
    try {
      const converted = await convertDraft.mutateAsync(draft.draftRevision);
      clearAiPlanInput();
      navigate(`/projects/${converted.projectId}/wbs`);
    } catch (error) {
      setOperationError(messageOf(error));
    }
  };

  const handleBackToInput = () => {
    const savedInput = loadAiPlanInput("overview");
    const path = requestId === undefined ? "/projects/new/ai/input" : `/projects/new/ai/requests/${requestId}`;
    navigate(`${path}?method=${savedInput.method}`);
  };

  return (
    <AiPlanShell currentStep={3} title="AIと学習計画を作成">
      {draftQuery.isLoading && <LoadingPanel message="WBS下書きを読み込んでいます。" />}
      {draftQuery.isError && <ErrorPanel message={messageOf(draftQuery.error)} onRetry={() => draftQuery.refetch()} />}
      {draft !== null && (
        <>
          <section className="ai-draft-summary-grid" aria-label="WBS下書き集計">
            <div><span>WBS合計</span><strong>{draft.tasks.length}件</strong></div>
            <div><span>タスク</span><strong>{draft.tasks.filter((task) => task.taskType === "LEAF").length}件</strong></div>
            <div><span>予定工数</span><strong>{totalPlannedHours(draft.tasks)}h</strong></div>
            <div><span>検証状態</span><strong>{validationLabel(draft.validation.status)}</strong></div>
          </section>

          <Panel className="ai-plan-content-panel ai-plan-form-panel">
            <PanelHeader description="AIの提案をそのまま使わず、保存前に修正できます。" title="プロジェクト基本情報" />
            <div className="ai-form-grid">
              <label>プロジェクト名<input maxLength={100} onChange={(event) => setDraft({ ...draft, project: { ...draft.project, name: event.target.value } })} value={draft.project.name} /></label>
              <label className="wide-field">概要<textarea maxLength={5000} onChange={(event) => setDraft({ ...draft, project: { ...draft.project, description: event.target.value } })} value={draft.project.description} /></label>
              <label>開始日<input onChange={(event) => setDraft({ ...draft, project: { ...draft.project, startDate: event.target.value } })} type="date" value={draft.project.startDate} /></label>
              <label>目標終了日<input onChange={(event) => setDraft({ ...draft, project: { ...draft.project, targetEndDate: event.target.value } })} type="date" value={draft.project.targetEndDate} /></label>
            </div>
            <div className="button-row"><button className="secondary-button" disabled={!hasUnsavedProjectChanges || updateDraft.isPending} onClick={() => void persistDraft(draft)} type="button">基本情報を保存</button></div>
          </Panel>

          <Panel className="ai-plan-content-panel">
            <PanelHeader actions={<button className="text-button" onClick={handleBackToInput} type="button">条件・教材を変更</button>} description="行を選択すると、タスク名・種別・親タスク・予定日・予定工数を編集できます。" title="生成されたWBS案" />
            <div className="ai-draft-host">
              <div className="ai-draft-list">
                <div aria-hidden="true" className="ai-draft-row header"><span>タスク</span><span>予定期間</span><span>工数</span><span>操作</span></div>
                {sortedTasks.map((task) => (
                  <button className={`ai-draft-row ${task.taskType.toLowerCase()} ${editingTaskKey === task.temporaryKey ? "selected" : ""}`} key={task.temporaryKey} onClick={() => setEditingTaskKey(task.temporaryKey)} type="button">
                    <span className="ai-draft-task-name"><b>{task.taskType === "PARENT" ? "▾" : "↳"}</b><span><strong>{task.name}</strong><small>{task.description}</small></span></span>
                    <span>{task.taskType === "PARENT" ? "親タスク" : `${task.plannedStartDate} - ${task.plannedEndDate}`}</span>
                    <span>{task.taskType === "PARENT" ? "計算対象外" : `${task.plannedHours}h`}</span>
                    <span className="text-button">編集</span>
                  </button>
                ))}
              </div>
              {editingTask !== null && <AiPlanTaskEditPanel fallbackSourceKey={fallbackSourceKey} hasChildren={draft.tasks.some((task) => task.parentTemporaryKey === editingTask.temporaryKey)} key={editingTask.temporaryKey} onClose={() => setEditingTaskKey(null)} onDelete={handleTaskDelete} onSave={handleTaskSave} parentTasks={parentTasks} task={editingTask} />}
            </div>
          </Panel>

          {(draft.planWarnings.length > 0 || draft.relaxationOptions.length > 0) && (
            <Panel className="ai-plan-content-panel plan-check-panel">
              <PanelHeader actions={<span className="ai-status-badge warning">確認推奨 {draft.planWarnings.length}件</span>} title="計画チェック" />
              {draft.planWarnings.map((warning) => <div className="plan-warning-row" key={`${warning.code}-${warning.target ?? ""}`}><strong>確認推奨</strong><span>{warning.message}</span></div>)}
              {draft.relaxationOptions.length > 0 && <div className="relaxation-list"><strong>条件を調整する場合の候補</strong><ol>{draft.relaxationOptions.map((option) => <li key={option.code}>{option.message}</li>)}</ol><small>調整案は自動では適用しません。</small></div>}
            </Panel>
          )}

          {hasUnsavedProjectChanges && <p className="warning-note">プロジェクト基本情報に未保存の変更があります。</p>}
          {operationError !== "" && <p className="field-error" role="alert">{operationError}</p>}
          <div className="ai-plan-actions">
            <button className="secondary-button" onClick={handleBackToInput} type="button">条件・教材を変更</button>
            <button className="primary-button" disabled={hasUnsavedProjectChanges || updateDraft.isPending || convertDraft.isPending || draft.validation.status === "INVALID"} onClick={() => void handleConvert()} type="button">{convertDraft.isPending ? "プロジェクトを作成しています" : "この計画でプロジェクトを作成"}</button>
          </div>
        </>
      )}
    </AiPlanShell>
  );
};

const sortTasks = (tasks: AiPlanDraftTask[]): AiPlanDraftTask[] => {
  const parents = tasks.filter((task) => task.taskType === "PARENT");
  return parents.flatMap((parent) => [parent, ...tasks.filter((task) => task.parentTemporaryKey === parent.temporaryKey)]);
};

const totalPlannedHours = (tasks: AiPlanDraftTask[]): string =>
  tasks.reduce((sum, task) => sum + (task.plannedHours ?? 0), 0).toFixed(2).replace(/\.00$/, "");

const validationLabel = (status: AiPlanDraft["validation"]["status"]): string => ({
  VALID: "保存可能",
  WARNING: "確認推奨あり",
  INVALID: "修正が必要",
})[status];
