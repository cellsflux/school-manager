import { curveNatural } from "@visx/curve";

import AreaChart, { Area } from "../charts/area-chart";
import Grid from "../charts/grid";
import XAxis from "../charts/x-axis";

import { ChartTooltip } from "../charts/tooltip";
import ReferenceArea from "../charts/reference-area";

export default function ChartOne() {
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2024, 0, i + 1),
    desktop: Math.max(
      10,
      Math.floor(
        180 +
          Math.sin((i + 0) / 4.77) * 38 +
          Math.cos((i + 0) / 1.7) * 24 +
          Math.sin((i + 0) / 0.61) * 14 +
          Math.cos((i + 0) / 0.31) * 8,
      ),
    ),
    mobile: Math.max(
      10,
      Math.floor(
        198 +
          Math.sin((i + 17) / 4.77) * 41 +
          Math.cos((i + 7) / 1.7) * 24 +
          Math.sin((i + 3) / 0.61) * 14 +
          Math.cos((i + 11) / 0.31) * 8,
      ),
    ),
    tablet: Math.max(
      10,
      Math.floor(
        216 +
          Math.sin((i + 34) / 4.77) * 44 +
          Math.cos((i + 14) / 1.7) * 24 +
          Math.sin((i + 6) / 0.61) * 14 +
          Math.cos((i + 22) / 0.31) * 8,
      ),
    ),
  }));
  return (
    <AreaChart
      data={chartData}
      animationDuration={1100}
      animationEasing="cubic-bezier(0.85, 0, 0.15, 1)"
    >
      <Grid horizontal />
      <ReferenceArea
        y1={160}
        y2={220}
        fill="color-mix(in oklch, var(--chart-foreground-muted) 15%, transparent)"
        fillOpacity={1}
        pattern="none"
        patternColor="var(--chart-foreground-muted)"
        stroke="var(--chart-foreground-muted)"
        strokeStyle="dashed"
        strokeDasharray="4,4"
        fadeEdges={true}
        fadeEdgesLength={10}
        axisLabelColor="var(--chart-1)"
        showMarkers={true}
        markerColor="var(--chart-1)"
        yAxisId="left"
      />
      <Area
        dataKey="desktop"
        curve={curveNatural}
        fillOpacity={0.3}
        strokeWidth={2}
        fadeEdges
        gradientToOpacity={0}
        showLine={true}
        showHighlight={true}
      />
      <Area
        dataKey="mobile"
        fill="var(--chart-2)"
        curve={curveNatural}
        fillOpacity={0.3}
        strokeWidth={2}
        fadeEdges
        gradientToOpacity={0}
        showLine={true}
        showHighlight={true}
      />
      <Area
        dataKey="tablet"
        fill="var(--chart-3)"
        curve={curveNatural}
        fillOpacity={0.3}
        strokeWidth={2}
        fadeEdges
        gradientToOpacity={0}
        showLine={true}
        showHighlight={true}
      />
      <XAxis />
      <ChartTooltip className="text-white" />
    </AreaChart>
  );
}
