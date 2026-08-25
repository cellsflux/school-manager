import Bar from "../charts/bar";
import BarChart from "../charts/bar-chart";
import BarXAxis from "../charts/bar-x-axis";
import Grid from "../charts/grid";
import ReferenceArea from "../charts/reference-area";
import { ChartTooltip } from "../charts/tooltip";

interface ChartPoint {
  month: string;
  desktop: number;
  mobile: number;
}

export default function Barechart() {
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    month: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][i % 12],
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
  }));
  return (
    <BarChart
      data={chartData}
      xDataKey="month"
      animationDuration={1100}
      animationEasing="cubic-bezier(0.85, 0, 0.15, 1)"
      barGap={0.2}
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
      <Bar
        dataKey="desktop"
        lineCap="round"
        fill="var(--chart-1)"
        fadedOpacity={0.3}
        groupGap={4}
      />
      <Bar
        dataKey="mobile"
        lineCap="round"
        fill="var(--chart-2)"
        fadedOpacity={0.3}
        groupGap={4}
      />
      <BarXAxis />
      <ChartTooltip
        showCrosshair={false}
        backgroundColor="var(--chart-tooltip-background)"
        content={({ point: rawPoint }) => {
          const point = rawPoint as unknown as ChartPoint;
          return (
            <div
              style={{
                background: "var(--chart-tooltip-background)",
                color: "var(--chart-tooltip-foreground)",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.5,
                minWidth: 140,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {point.month}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--chart-1)",
                    display: "inline-block",
                  }}
                />
                <span style={{ color: "var(--chart-tooltip-muted)" }}>
                  Desktop
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 500 }}>
                  {point.desktop.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--chart-2)",
                    display: "inline-block",
                  }}
                />
                <span style={{ color: "var(--chart-tooltip-muted)" }}>
                  Mobile
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 500 }}>
                  {point.mobile.toLocaleString()}
                </span>
              </div>
            </div>
          );
        }}
      />
    </BarChart>
  );
}
