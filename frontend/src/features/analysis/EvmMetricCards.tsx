// EVMの8指標をカード形式で表示する。
import { StatCard } from "../../shared/components/StatCard";
import { formatAnalysisHours, formatAnalysisNumber, formatSignedHours } from "./analysisFormatters";
import type { EvmAnalysis } from "./analysisTypes";

type EvmMetricCardsProps = {
  evm: EvmAnalysis;
};

export const EvmMetricCards = ({ evm }: EvmMetricCardsProps) => (
  <section aria-label="EVM指標" className="analysis-metric-grid">
    <StatCard label="BAC" value={formatAnalysisHours(evm.bac)} />
    <StatCard label="PV" value={formatAnalysisHours(evm.pv)} />
    <StatCard label="EV" value={formatAnalysisHours(evm.ev)} />
    <StatCard label="AC" value={formatAnalysisHours(evm.ac)} />
    <StatCard label="SV" value={formatSignedHours(evm.sv)} />
    <StatCard label="CV" value={formatSignedHours(evm.cv)} />
    <StatCard
      helper={evm.spi !== null && evm.spi < 1 ? "遅れ" : undefined}
      label="SPI"
      value={formatAnalysisNumber(evm.spi, 3)}
    />
    <StatCard
      helper={evm.cpi !== null && evm.cpi < 1 ? "超過" : undefined}
      label="CPI"
      value={formatAnalysisNumber(evm.cpi, 3)}
    />
  </section>
);
