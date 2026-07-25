// PJ02のプロジェクト作成・編集フォームと、保存後のPJ03遷移を提供する。
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  useCreateProject,
  useProject,
  useUpdateProject,
} from "../features/projects/useProjects";
import type { ProjectStatus } from "../features/projects/projectTypes";
import { fieldMessageOf, messageOf } from "../shared/api/errorMessages";
import { isApiClientError } from "../shared/api/apiTypes";
import { ErrorPanel } from "../shared/components/ErrorPanel";
import { FieldError } from "../shared/components/FieldError";
import { LoadingPanel } from "../shared/components/LoadingPanel";

type ProjectFormValues = {
  name: string;
  description: string;
  startDate: string;
  targetEndDate: string;
  status: ProjectStatus;
};

const initialValues: ProjectFormValues = {
  name: "",
  description: "",
  startDate: "",
  targetEndDate: "",
  status: "NOT_STARTED",
};

export const ProjectFormPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const isEditMode = projectId !== undefined;
  const navigate = useNavigate();
  const projectQuery = useProject(projectId);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject(projectId ?? "");
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [clientError, setClientError] = useState<string | null>(null);
  const mutationError = isEditMode ? updateProject.error : createProject.error;
  const isSubmitting = createProject.isPending || updateProject.isPending;

  useEffect(() => {
    if (projectQuery.data !== undefined) {
      setValues({
        name: projectQuery.data.name,
        description: projectQuery.data.description ?? "",
        startDate: projectQuery.data.startDate,
        targetEndDate: projectQuery.data.targetEndDate,
        status: projectQuery.data.status,
      });
    }
  }, [projectQuery.data]);

  const isProjectNotFound =
    (isApiClientError(projectQuery.error) && projectQuery.error.status === 404) ||
    (isApiClientError(mutationError) && mutationError.status === 404);
  const title = isEditMode ? "プロジェクト編集" : "プロジェクトを作成";
  const cancelPath = isEditMode && projectId !== undefined ? `/projects/${projectId}` : "/projects";
  const periodError = useMemo(() => {
    if (clientError !== null) {
      return clientError;
    }
    if (isApiClientError(mutationError) && mutationError.body.code === "INVALID_PROJECT_PERIOD") {
      return mutationError.body.message;
    }
    return undefined;
  }, [clientError, mutationError]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (values.startDate > values.targetEndDate) {
      setClientError("開始日は目標終了日以前にしてください。");
      return;
    }

    setClientError(null);
    const request = {
      name: values.name.trim(),
      description: emptyToNull(values.description),
      startDate: values.startDate,
      targetEndDate: values.targetEndDate,
    };

    if (isEditMode) {
      updateProject.mutate(
        { ...request, status: values.status },
        { onSuccess: (project) => navigate(`/projects/${project.projectId}`) },
      );
      return;
    }

    createProject.mutate(request, {
      onSuccess: (project) => navigate(`/projects/${project.projectId}`),
    });
  };

  const handleValueChange = <Key extends keyof ProjectFormValues>(key: Key, value: ProjectFormValues[Key]) => {
    setClientError(null);
    setValues((current) => ({ ...current, [key]: value }));
  };

  if (isEditMode && projectQuery.isPending) {
    return <LoadingPanel message="プロジェクト情報を読み込んでいます。" />;
  }

  if (isProjectNotFound) {
    return (
      <main className="app-page">
        <ErrorPanel message="対象のプロジェクトは存在しません。" />
        <Link className="primary-link" to="/projects">
          プロジェクト一覧へ戻る
        </Link>
      </main>
    );
  }

  if (isEditMode && projectQuery.isError) {
    return (
      <main className="app-page">
        <ErrorPanel message={messageOf(projectQuery.error)} onRetry={() => projectQuery.refetch()} />
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="panel project-form-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PJ02</p>
            <h1>{title}</h1>
          </div>
          <Link className="secondary-link" to={cancelPath}>
            キャンセル
          </Link>
        </div>

        {!isEditMode && (
          <p className="status-note">
            作成時の状態は「未着手」です。WBSタスクは作成後に追加できます。
          </p>
        )}

        <form className="form project-form" onSubmit={handleSubmit}>
          <label>
            プロジェクト名 <RequiredMark />
            <input
              maxLength={100}
              onChange={(event) => handleValueChange("name", event.target.value)}
              required
              type="text"
              value={values.name}
            />
            <FieldError message={fieldMessageOf(mutationError, "name")} />
          </label>

          <label>
            概要
            <textarea
              maxLength={5000}
              onChange={(event) => handleValueChange("description", event.target.value)}
              rows={6}
              value={values.description}
            />
            <FieldError message={fieldMessageOf(mutationError, "description")} />
          </label>

          <div className="form-two-columns">
            <label>
              開始日 <RequiredMark />
              <input
                onChange={(event) => handleValueChange("startDate", event.target.value)}
                required
                type="date"
                value={values.startDate}
              />
              <FieldError message={fieldMessageOf(mutationError, "startDate")} />
            </label>

            <label>
              目標終了日 <RequiredMark />
              <input
                onChange={(event) => handleValueChange("targetEndDate", event.target.value)}
                required
                type="date"
                value={values.targetEndDate}
              />
              <FieldError message={fieldMessageOf(mutationError, "targetEndDate")} />
            </label>
          </div>
          {periodError !== undefined && <p className="form-message error-text">{periodError}</p>}

          {isEditMode && (
            <label>
              状態
              <select
                onChange={(event) => handleValueChange("status", event.target.value as ProjectStatus)}
                value={values.status}
              >
                <option value="NOT_STARTED">未着手</option>
                <option value="IN_PROGRESS">進行中</option>
                <option value="COMPLETED">完了</option>
              </select>
              <FieldError message={fieldMessageOf(mutationError, "status")} />
            </label>
          )}

          {mutationError !== null && periodError === undefined && (
            <p className="form-message error-text">{messageOf(mutationError)}</p>
          )}

          <div className="button-row">
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isEditMode ? "変更を保存" : "プロジェクトを作成"}
            </button>
            <Link className="secondary-link" to={cancelPath}>
              戻る
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
};

const RequiredMark = () => <span aria-label="必須" className="required-mark">*</span>;

const emptyToNull = (value: string): string | null => {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
};
