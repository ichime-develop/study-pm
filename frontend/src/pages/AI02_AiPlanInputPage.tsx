// AI02 条件・教材入力画面。OCR結果と生成条件を確認して非同期WBS生成を開始する。
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { AiPlanShell } from "../features/aiPlan/AiPlanShell";
import { AiUnavailableDialog } from "../features/aiPlan/AiUnavailableDialog";
import { aiPlanApi } from "../features/aiPlan/aiPlanApi";
import {
  loadAiPlanInput,
  saveAiPlanInput,
  type AiPlanInputSnapshot,
} from "../features/aiPlan/aiPlanInputSession";
import type { AiPlanMethod, AiPlanRequestPayload, AiPlanSource } from "../features/aiPlan/aiPlanTypes";
import { OcrImageList, type OcrImageItem } from "../features/aiPlan/OcrImageList";
import { useAiGenerationJob, useAiPlanRequest, useSaveAiPlanRequest } from "../features/aiPlan/useAiPlan";
import { messageOf } from "../shared/api/errorMessages";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { Panel, PanelHeader } from "../shared/components/Panel";

const weekdays = [
  ["MONDAY", "月"], ["TUESDAY", "火"], ["WEDNESDAY", "水"], ["THURSDAY", "木"],
  ["FRIDAY", "金"], ["SATURDAY", "土"], ["SUNDAY", "日"],
] as const;

export const AiPlanInputPage = () => {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const method = methodFrom(searchParams.get("method"));
  const jobId = searchParams.get("jobId") ?? undefined;
  const [input, setInput] = useState<AiPlanInputSnapshot>(() => loadAiPlanInput(method));
  const [ocrImages, setOcrImages] = useState<OcrImageItem[]>([]);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const hasHydratedRequest = useRef(false);
  const requestQuery = useAiPlanRequest(requestId);
  const jobQuery = useAiGenerationJob(jobId);
  const saveRequest = useSaveAiPlanRequest(requestId);

  useEffect(() => saveAiPlanInput(input), [input]);

  useEffect(() => {
    if (requestQuery.data === undefined || hasHydratedRequest.current) return;
    hasHydratedRequest.current = true;
    const request = requestQuery.data;
    const overview = request.sources.find((source) => source.sourceType === "OVERVIEW")?.textContent ?? "";
    const tocSources = request.sources.filter((source) => source.sourceType !== "OVERVIEW");
    const constraints = request.constraints;
    setInput((current) => ({
      ...current,
      method: request.sourceType === "OVERVIEW" ? "overview" : "toc",
      learningGoal: request.learningGoal,
      startDate: request.startDate,
      targetEndDate: request.targetEndDate,
      weekdayAvailableHours: String(constraints.weekdayAvailableHours ?? 1),
      weekendAvailableHours: String(constraints.weekendAvailableHours ?? 2),
      unavailableWeekdays: constraints.unavailableWeekdays ?? [],
      scheduleNotes: constraints.scheduleNotes ?? "",
      focusText: constraints.focusText ?? "",
      lightText: constraints.lightText ?? "",
      excludeText: constraints.excludeText ?? "",
      quantityUnit: constraints.quantityCondition?.unit ?? "ページ",
      totalAmount: constraints.quantityCondition === undefined ? "" : String(constraints.quantityCondition.totalAmount),
      dailyAmount: constraints.quantityCondition === undefined ? "" : String(constraints.quantityCondition.dailyAmount),
      wbsSplitUnit: constraints.wbsSplitUnit ?? "SECTION",
      overview,
      materialMode: tocSources.some((source) => source.sourceType === "OCR_TEXT") ? "image" : "text",
      materialName: tocSources[0]?.label ?? "",
      tocText: tocSources.map((source) => source.textContent).join("\n\n"),
    }));
  }, [requestQuery.data]);

  useEffect(() => {
    const job = jobQuery.data;
    if (job?.status === "COMPLETED" && job.draftId !== null) {
      navigate(`/projects/new/ai/drafts/${job.draftId}?requestId=${requestId ?? ""}`, { replace: true });
    }
    if (job?.status === "FAILED" && job.error?.code === "AI_GENERATION_UNAVAILABLE") {
      setIsUnavailable(true);
    }
  }, [jobQuery.data, navigate, requestId]);

  const setField = <K extends keyof AiPlanInputSnapshot>(field: K, value: AiPlanInputSnapshot[K]) => {
    setInput((current) => ({ ...current, [field]: value }));
  };

  const handleGenerate = async () => {
    const validationMessage = validateInput(input);
    if (validationMessage !== "") {
      setFormError(validationMessage);
      return;
    }
    setFormError("");
    setIsStartingJob(true);
    try {
      const saved = await saveRequest.mutateAsync(buildRequestPayload(input));
      const job = await aiPlanApi.createDraftJob(saved.generationRequestId);
      navigate(`/projects/new/ai/requests/${saved.generationRequestId}?method=${input.method}&jobId=${job.jobId}`, { replace: true });
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleCancel = async () => {
    if (jobId === undefined) return;
    try {
      await aiPlanApi.cancelJob(jobId);
      await jobQuery.refetch();
    } catch (error) {
      setFormError(messageOf(error));
    }
  };

  const isJobActive = jobQuery.data?.status === "QUEUED" || jobQuery.data?.status === "PROCESSING" || jobQuery.data?.status === "CANCEL_REQUESTED";
  const jobError = jobQuery.data?.status === "FAILED" && jobQuery.data.error?.code !== "AI_GENERATION_UNAVAILABLE"
    ? jobQuery.data.error
    : null;

  return (
    <AiPlanShell currentStep={2} title="AIと学習計画を作成">
      <Panel className="ai-plan-content-panel ai-plan-form-panel">
        <PanelHeader
          description={input.method === "overview" ? "学習内容の概要と条件からWBS下書きを作ります。" : "OCR結果または入力した目次を確認してから、AIへ送信します。"}
          title={input.method === "overview" ? "概要から計画案を作る" : "教材の目次に沿った計画案を作る"}
          titleAs="h1"
        />

        {requestQuery.isError && <ErrorPanel message={messageOf(requestQuery.error)} onRetry={() => requestQuery.refetch()} />}
        <section className="ai-form-section">
          <div className="ai-section-heading"><span>1</span><h2>基本条件</h2></div>
          <div className="ai-form-grid">
            <label className="wide-field">学習目標 <span className="required-label">必須</span><input maxLength={5000} onChange={(event) => setField("learningGoal", event.target.value)} value={input.learningGoal} /></label>
            <label className="wide-field">プロジェクト名（任意）<input maxLength={100} onChange={(event) => setField("projectName", event.target.value)} value={input.projectName} /><small>未入力の場合は、学習目標からAIが提案します。</small></label>
            <label>学習開始日 <span className="required-label">必須</span><input onChange={(event) => setField("startDate", event.target.value)} type="date" value={input.startDate} /></label>
            <label>目標終了日 <span className="required-label">必須</span><input onChange={(event) => setField("targetEndDate", event.target.value)} type="date" value={input.targetEndDate} /></label>
          </div>
        </section>

        <section className="ai-form-section">
          <button aria-expanded={isPreferencesOpen} className="ai-preferences-toggle" onClick={() => setIsPreferencesOpen((open) => !open)} type="button">
            <span><strong>2 こだわり条件（任意）</strong><small>学習時間、学習できない日、重点範囲、分割単位を設定できます。</small></span>
            <span>{isPreferencesOpen ? "閉じる" : "設定する"}</span>
          </button>
          {isPreferencesOpen && (
            <div className="ai-preferences-body">
              <div className="ai-form-grid">
                <label>平日の学習可能時間<input min="0" onChange={(event) => setField("weekdayAvailableHours", event.target.value)} step="0.25" type="number" value={input.weekdayAvailableHours} /></label>
                <label>土日の学習可能時間<input min="0" onChange={(event) => setField("weekendAvailableHours", event.target.value)} step="0.25" type="number" value={input.weekendAvailableHours} /></label>
              </div>
              <fieldset className="weekday-fieldset"><legend>学習できない曜日</legend><div>{weekdays.map(([value, label]) => <label className={input.unavailableWeekdays.includes(value) ? "selected" : ""} key={value}><input checked={input.unavailableWeekdays.includes(value)} onChange={() => setField("unavailableWeekdays", toggleValue(input.unavailableWeekdays, value))} type="checkbox" />{label}</label>)}</div></fieldset>
              <label>日程の補足<textarea onChange={(event) => setField("scheduleNotes", event.target.value)} value={input.scheduleNotes} /></label>
              <div className="ai-form-grid"><label>重点的に学ぶ範囲<textarea onChange={(event) => setField("focusText", event.target.value)} value={input.focusText} /></label><label>軽く確認する範囲<textarea onChange={(event) => setField("lightText", event.target.value)} value={input.lightText} /></label></div>
              <label>除外する範囲<textarea onChange={(event) => setField("excludeText", event.target.value)} value={input.excludeText} /></label>
              <div className="ai-form-grid three-columns">
                <label>WBS分割単位<select onChange={(event) => setField("wbsSplitUnit", event.target.value as AiPlanInputSnapshot["wbsSplitUnit"])} value={input.wbsSplitUnit}><option value="SECTION">教材の章・節</option><option value="PAGE">ページ数</option><option value="QUESTION_SET">問題セット</option><option value="AI">AIに任せる</option></select></label>
                <label>学習量の総量<input min="0" onChange={(event) => setField("totalAmount", event.target.value)} type="number" value={input.totalAmount} /></label>
                <label>1日あたりの学習量<input min="0" onChange={(event) => setField("dailyAmount", event.target.value)} type="number" value={input.dailyAmount} /></label>
              </div>
              <label>数量条件の単位<input disabled={input.wbsSplitUnit === "PAGE"} maxLength={20} onChange={(event) => setField("quantityUnit", event.target.value)} value={input.wbsSplitUnit === "PAGE" ? "ページ" : input.quantityUnit} /></label>
            </div>
          )}
        </section>

        <section className="ai-form-section">
          <div className="ai-section-heading"><span>3</span><h2>{input.method === "overview" ? "学習内容の概要" : "教材の目次"}</h2></div>
          {input.method === "overview" ? (
            <label>学習内容の概要 <span className="required-label">必須</span><textarea className="ai-long-textarea" maxLength={5000} onChange={(event) => setField("overview", event.target.value)} value={input.overview} /><small className="field-counter">{input.overview.length.toLocaleString()} / 5,000文字</small></label>
          ) : (
            <>
              <div aria-label="目次の入力方法" className="ai-material-tabs" role="tablist"><button aria-selected={input.materialMode === "image"} className={input.materialMode === "image" ? "active" : ""} onClick={() => setField("materialMode", "image")} role="tab" type="button">画像から読み取る</button><button aria-selected={input.materialMode === "text"} className={input.materialMode === "text" ? "active" : ""} onClick={() => setField("materialMode", "text")} role="tab" type="button">目次を直接入力</button></div>
              <label>教材名（任意）<input maxLength={100} onChange={(event) => setField("materialName", event.target.value)} value={input.materialName} /></label>
              {input.materialMode === "image" && <OcrImageList items={ocrImages} onChange={setOcrImages} onCombinedTextChange={(text) => setField("tocText", text)} />}
              <label>{input.materialMode === "image" ? "読み取った目次" : "目次"} <span className="required-label">必須</span><textarea className="ai-long-textarea" maxLength={20000} onChange={(event) => setField("tocText", event.target.value)} value={input.tocText} /><small className="field-counter">{input.tocText.length.toLocaleString()} / 20,000文字</small>{input.materialMode === "image" && <small>この修正済みテキストだけをOpenAIへ送信します。</small>}</label>
            </>
          )}
        </section>

        {isJobActive && <section aria-live="polite" className="ai-job-status"><div><strong>{jobStatusLabel(jobQuery.data?.status)}</strong><p>入力内容を保持したまま処理しています。</p></div><button className="secondary-button" disabled={jobQuery.data?.status === "CANCEL_REQUESTED"} onClick={() => void handleCancel()} type="button">処理を停止</button></section>}
        {jobError !== null && formError === "" && <section className="plan-validation-message error" role="alert"><strong>{jobError.message}</strong>{jobError.actionHints.length > 0 && <ul>{jobError.actionHints.map((hint) => <li key={hint}>{hint}</li>)}</ul>}</section>}
        {formError !== "" && <p className="form-message field-error" role="alert">{formError}</p>}

        <div className="ai-plan-actions">
          <button className="secondary-button" disabled={isJobActive || isStartingJob} onClick={() => navigate("/projects/new/ai")} type="button">作成方法へ戻る</button>
          <button className="primary-button" disabled={isJobActive || isStartingJob} onClick={() => void handleGenerate()} type="button">{isStartingJob ? "生成を受け付けています" : "WBS下書きを生成"}</button>
        </div>
      </Panel>
      {isUnavailable && <AiUnavailableDialog onConfirm={() => navigate("/projects")} />}
    </AiPlanShell>
  );
};

const methodFrom = (value: string | null): AiPlanMethod => value === "toc" ? "toc" : "overview";

const toggleValue = (values: string[], value: string): string[] =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value];

const validateInput = (input: AiPlanInputSnapshot): string => {
  if (input.learningGoal.trim() === "" || input.startDate === "" || input.targetEndDate === "") return "学習目標、学習開始日、目標終了日を入力してください。";
  if (input.startDate > input.targetEndDate) return "学習開始日は目標終了日以前にしてください。";
  if (input.method === "overview" && input.overview.trim() === "") return "学習内容の概要を入力してください。";
  if (input.method === "toc" && input.tocText.trim() === "") return "OCRで目次を読み取るか、目次を直接入力してください。";
  const hasTotal = input.totalAmount.trim() !== "";
  const hasDaily = input.dailyAmount.trim() !== "";
  if (hasTotal !== hasDaily) return "数量条件は総量と1日あたりの学習量を両方入力してください。";
  if (input.wbsSplitUnit === "PAGE" && (!hasTotal || !hasDaily)) return "ページ数で分割する場合は、ページ単位の総量と1日量を入力してください。";
  return "";
};

const buildRequestPayload = (input: AiPlanInputSnapshot): AiPlanRequestPayload => {
  const sources: AiPlanSource[] = input.method === "overview"
    ? [{ temporaryKey: "source-overview-1", sourceType: "OVERVIEW", sourceOrder: 0, label: "学習内容の概要", textContent: input.overview.trim() }]
    : [{ temporaryKey: input.materialMode === "image" ? "source-ocr-1" : "source-toc-1", sourceType: input.materialMode === "image" ? "OCR_TEXT" : "PASTED_TOC", sourceOrder: 0, label: input.materialName.trim() || "教材の目次", textContent: input.tocText.trim() }];
  const quantityCondition = input.totalAmount.trim() !== "" && input.dailyAmount.trim() !== ""
    ? { totalAmount: Number(input.totalAmount), dailyAmount: Number(input.dailyAmount), unit: input.wbsSplitUnit === "PAGE" ? "ページ" : input.quantityUnit.trim() }
    : undefined;
  return {
    sourceType: input.method === "overview" ? "OVERVIEW" : "TABLE_OF_CONTENTS",
    learningGoal: input.learningGoal.trim(),
    startDate: input.startDate,
    targetEndDate: input.targetEndDate,
    constraints: {
      weekdayAvailableHours: Number(input.weekdayAvailableHours),
      weekendAvailableHours: Number(input.weekendAvailableHours),
      unavailableWeekdays: input.unavailableWeekdays,
      scheduleNotes: input.scheduleNotes,
      focusText: input.focusText,
      lightText: input.lightText,
      excludeText: input.excludeText,
      ...(quantityCondition === undefined ? {} : { quantityCondition }),
      wbsSplitUnit: input.wbsSplitUnit,
    },
    sources,
  };
};

const jobStatusLabel = (status: string | undefined): string => ({
  QUEUED: "処理の開始を待っています",
  PROCESSING: "AIがWBS下書きを作成しています",
  CANCEL_REQUESTED: "停止を要求しています",
})[status ?? ""] ?? "処理しています";
