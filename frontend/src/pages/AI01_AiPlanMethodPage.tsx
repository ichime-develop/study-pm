// AI01 作成方法選択画面。生成方法と外部サービスへの送信範囲を確認してAI02へ進める。
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AiPlanShell } from "../features/aiPlan/AiPlanShell";
import { loadAiPlanInput, saveAiPlanInput } from "../features/aiPlan/aiPlanInputSession";
import type { AiPlanMethod } from "../features/aiPlan/aiPlanTypes";
import { Panel, PanelHeader } from "../shared/components/Panel";

export const AiPlanMethodPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<AiPlanMethod>(() => loadAiPlanInput("overview").method);

  const handleNext = () => {
    saveAiPlanInput({ ...loadAiPlanInput(method), method });
    navigate(`/projects/new/ai/input?method=${method}`);
  };

  return (
    <AiPlanShell currentStep={1} title="AIと学習計画を作成">
      <Panel className="ai-plan-content-panel">
        <PanelHeader
          description="入力できる情報に合わせて作成方法を選びます。生成後のWBS下書きを確認してから保存します。"
          title="どのくらい詳しく計画しますか？"
          titleAs="h1"
        />
        <div aria-label="作成方法" className="ai-method-grid" role="radiogroup">
          <button
            aria-checked={method === "overview"}
            className={method === "overview" ? "ai-method-card selected" : "ai-method-card"}
            onClick={() => setMethod("overview")}
            role="radio"
            type="button"
          >
            <span>入力が少ない</span>
            <strong>概要から作成</strong>
            <p>学習目標、期限、学習内容の概要から、大まかなWBS案を作ります。</p>
            <small>教材の目次が手元にない場合に向いています。</small>
          </button>
          <button
            aria-checked={method === "toc"}
            className={method === "toc" ? "ai-method-card selected" : "ai-method-card"}
            onClick={() => setMethod("toc")}
            role="radio"
            type="button"
          >
            <span>教材に沿って作る</span>
            <strong>目次から作成</strong>
            <p>画像から読み取るか、目次を直接入力して、教材構成に沿ったWBS案を作ります。</p>
            <small>章や単元を計画へ正確に反映したい場合に向いています。</small>
          </button>
        </div>

        <section className="ai-usage-note" aria-labelledby="ai-usage-title">
          <p className="eyebrow">AI利用について</p>
          <h2 id="ai-usage-title">入力内容の送信先を確認してください</h2>
          <dl>
            <div><dt>Google Cloud Visionへ送信</dt><dd>選択した目次画像だけを文字認識のために送信します。</dd></div>
            <div><dt>OpenAIへ送信</dt><dd>修正済みテキストと、学習ペース・分割単位を含む生成条件を送信します。</dd></div>
            <div><dt>送信しない情報</dt><dd>画像そのもの、認証情報、学習記録、他のプロジェクト情報はOpenAIへ送信しません。</dd></div>
          </dl>
          <p>
            次へ進むことで上記の送信範囲を確認したものとして扱います。{" "}
            <a href="https://cloud.google.com/terms/cloud-privacy-notice" rel="noreferrer" target="_blank">Googleのデータ利用方針</a>{" "}
            <a href="https://openai.com/policies/privacy-policy/" rel="noreferrer" target="_blank">OpenAIのプライバシーポリシー</a>
          </p>
        </section>

        <div className="ai-plan-actions">
          <button className="secondary-button" onClick={() => navigate("/projects")} type="button">プロジェクト一覧へ戻る</button>
          <button className="primary-button" onClick={handleNext} type="button">次へ</button>
        </div>
      </Panel>
    </AiPlanShell>
  );
};
