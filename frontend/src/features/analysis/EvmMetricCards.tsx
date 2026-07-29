// EVMの8指標をカード形式で表示する。
import { StatCard } from "../../shared/components/StatCard";
import { formatAnalysisHours, formatAnalysisNumber, formatSignedHours } from "./analysisFormatters";
import type { EvmAnalysis } from "./analysisTypes";

type EvmMetricCardsProps = {
  evm: EvmAnalysis;
};

const evmMetricHelp = {
  AC: [
    "Actual Cost。基準日までに記録された学習時間です。",
    "計算式: JST当日以前の学習記録の時間合計",
    "実際に使った学習時間を表します。",
  ],
  BAC: [
    "Budget at Completion。プロジェクト全体の予定工数です。",
    "計算式: 全LEAFタスクの予定工数合計",
    "最終的に必要と見積もった学習時間を表します。",
  ],
  CPI: [
    "Cost Performance Index。本アプリでは工数効率です。",
    "計算式: CPI = EV / AC",
    "1.0未満は、完了量に対して予定より時間を使っています。",
  ],
  CV: [
    "Cost Variance。予定工数に対する工数差です。",
    "計算式: CV = EV - AC",
    "正は予定より少ない時間で進んでいることを表します。",
  ],
  EV: [
    "Earned Value。進捗率から見た完了済み作業量です。",
    "計算式: 各タスクの予定工数 x 進捗率の合計",
    "実際に使った時間ではなく、完了相当の予定工数です。",
  ],
  PV: [
    "Planned Value。基準日までに完了予定だった作業量です。",
    "計算式: 各タスクの予定工数を予定期間で日割りし、基準日までを合計",
    "EVより大きい場合、計画より遅れている可能性があります。",
  ],
  SPI: [
    "Schedule Performance Index。スケジュール効率です。",
    "計算式: SPI = EV / PV",
    "1.0未満は、計画より遅れていることを表します。",
  ],
  SV: [
    "Schedule Variance。予定に対する進捗差です。",
    "計算式: SV = EV - PV",
    "正は計画より先行、負は遅れていることを表します。",
  ],
} as const;

export const EvmMetricCards = ({ evm }: EvmMetricCardsProps) => (
  <section aria-label="EVM指標" className="analysis-metric-grid">
    <StatCard help={evmMetricHelp.BAC} label="BAC" value={formatAnalysisHours(evm.bac)} />
    <StatCard help={evmMetricHelp.PV} label="PV" value={formatAnalysisHours(evm.pv)} />
    <StatCard help={evmMetricHelp.EV} label="EV" value={formatAnalysisHours(evm.ev)} />
    <StatCard help={evmMetricHelp.AC} label="AC" value={formatAnalysisHours(evm.ac)} />
    <StatCard help={evmMetricHelp.SV} label="SV" value={formatSignedHours(evm.sv)} />
    <StatCard help={evmMetricHelp.CV} label="CV" value={formatSignedHours(evm.cv)} />
    <StatCard
      help={evmMetricHelp.SPI}
      helper={evm.spi !== null && evm.spi < 1 ? "遅れ" : undefined}
      label="SPI"
      value={formatAnalysisNumber(evm.spi, 3)}
    />
    <StatCard
      help={evmMetricHelp.CPI}
      helper={evm.cpi !== null && evm.cpi < 1 ? "超過" : undefined}
      label="CPI"
      value={formatAnalysisNumber(evm.cpi, 3)}
    />
  </section>
);
