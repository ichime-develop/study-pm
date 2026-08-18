// AI01〜AI03で共有する生成依頼、ジョブ、WBS下書きのAPI型を定義する。
export type AiPlanMethod = "overview" | "toc";
export type AiPlanMaterialMode = "image" | "text";
export type AiPlanRequestSourceType = "OVERVIEW" | "TABLE_OF_CONTENTS" | "MIXED";
export type AiPlanSourceType = "OVERVIEW" | "PASTED_TOC" | "OCR_TEXT";
export type AiWbsSplitUnit = "SECTION" | "PAGE" | "QUESTION_SET" | "AI";
export type AiDraftTaskType = "PARENT" | "LEAF";
export type AiGenerationJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "CANCEL_REQUESTED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";

export type AiPlanSource = {
  temporaryKey: string;
  sourceType: AiPlanSourceType;
  sourceOrder: number;
  label: string | null;
  textContent: string;
};

export type AiPlanConstraints = {
  weekdayAvailableHours: number;
  weekendAvailableHours: number;
  unavailableWeekdays: string[];
  scheduleNotes: string;
  focusText: string;
  lightText: string;
  excludeText: string;
  quantityCondition?: {
    totalAmount: number;
    dailyAmount: number;
    unit: string;
  };
  wbsSplitUnit: AiWbsSplitUnit;
};

export type AiPlanRequestPayload = {
  sourceType: AiPlanRequestSourceType;
  learningGoal: string;
  startDate: string;
  targetEndDate: string;
  constraints: AiPlanConstraints;
  sources: AiPlanSource[];
};

export type AiPlanRequestResponse = AiPlanRequestPayload & {
  generationRequestId: string;
};

export type AiOcrResponse = {
  text: string;
  detectedPageCount: number;
};

export type AiGenerationJobError = {
  code: string;
  message: string;
  actionHints: string[];
};

export type AiGenerationJob = {
  jobId: string;
  jobType: string;
  status: AiGenerationJobStatus;
  acceptedAt: string;
  deadlineAt: string;
  error: AiGenerationJobError | null;
  draftId: string | null;
};

export type AiPlanDraftProject = {
  name: string;
  description: string;
  startDate: string;
  targetEndDate: string;
};

export type AiPlanDraftTask = {
  temporaryKey: string;
  taskType: AiDraftTaskType;
  parentTemporaryKey: string | null;
  name: string;
  description: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  plannedHours: number | null;
  sourceTemporaryKeys: string[];
};

export type AiPlanIssue = {
  code: string;
  message: string;
  target?: string;
};

export type AiPlanDraft = {
  draftId: string;
  draftRevision: number;
  project: AiPlanDraftProject;
  tasks: AiPlanDraftTask[];
  validation: { status: "VALID" | "WARNING" | "INVALID" };
  planWarnings: AiPlanIssue[];
  relaxationOptions: AiPlanIssue[];
};

export type AiPlanDraftUpdatePayload = {
  draftRevision: number;
  project: AiPlanDraftProject;
  tasks: AiPlanDraftTask[];
};

export type AiPlanDraftConversion = {
  projectId: string;
  wbsTaskIds: string[];
};
