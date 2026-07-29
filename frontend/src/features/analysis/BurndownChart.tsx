// 依存ライブラリを追加せず、バーンダウンの理想線と実績線をSVGで表示する。
import { formatMonthDay } from "../../shared/format/formatters";
import { formatAnalysisNumber } from "./analysisFormatters";
import type { BurndownPoint } from "./analysisTypes";

type BurndownChartProps = {
  actualPoints: BurndownPoint[];
  idealPoints: BurndownPoint[];
};

const chartWidth = 760;
const chartHeight = 260;
const padding = { bottom: 36, left: 52, right: 18, top: 18 };

export const BurndownChart = ({ actualPoints, idealPoints }: BurndownChartProps) => {
  const allPoints = [...idealPoints, ...actualPoints];
  const maxHours = Math.max(...allPoints.map((point) => point.remainingHours), 1);
  const horizontalStep = idealPoints.length > 1
    ? (chartWidth - padding.left - padding.right) / (idealPoints.length - 1)
    : 0;
  const verticalPosition = (hours: number) =>
    padding.top + (chartHeight - padding.top - padding.bottom) * (1 - hours / maxHours);
  const points = (items: BurndownPoint[]) =>
    items
      .map((point, index) => `${padding.left + horizontalStep * index},${verticalPosition(point.remainingHours)}`)
      .join(" ");
  const tickIndexes = [...new Set([0, Math.floor((idealPoints.length - 1) / 2), idealPoints.length - 1])]
    .filter((index) => index >= 0);

  return (
    <div className="burndown-chart" role="img" aria-label="バーンダウンチャート。理想残と実績残を表示">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <line className="burndown-axis" x1={padding.left} x2={padding.left} y1={padding.top} y2={chartHeight - padding.bottom} />
        <line
          className="burndown-axis"
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={chartHeight - padding.bottom}
          y2={chartHeight - padding.bottom}
        />
        <text className="burndown-axis-label" x="4" y={padding.top + 6}>{formatAnalysisNumber(maxHours)}h</text>
        <text className="burndown-axis-label" x="30" y={chartHeight - padding.bottom + 4}>0h</text>
        <polyline className="burndown-line ideal" points={points(idealPoints)} />
        {actualPoints.length > 0 && <polyline className="burndown-line actual" points={points(actualPoints)} />}
        {tickIndexes.map((index) => (
          <text className="burndown-axis-label" key={index} textAnchor="middle" x={padding.left + horizontalStep * index} y={chartHeight - 10}>
            {formatMonthDay(idealPoints[index]?.date ?? "")}
          </text>
        ))}
      </svg>
      <div className="burndown-legend" aria-hidden="true">
        <span><i className="burndown-legend-line ideal" />理想残</span>
        <span><i className="burndown-legend-line actual" />実績残</span>
      </div>
    </div>
  );
};
