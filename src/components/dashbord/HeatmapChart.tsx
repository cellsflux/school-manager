import React from "react";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapSeparator,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from "../charts/heatmap";

import { contributionData } from "./heatmapData";

export default function HeatmapCharts() {
  const heatmapLevelStyles = [
    { color: "var(--chart-scale-01)", fillMode: "solid", pattern: "none" },
    { color: "var(--chart-scale-02)", fillMode: "solid", pattern: "none" },
    { color: "var(--chart-scale-03)", fillMode: "solid", pattern: "none" },
    { color: "var(--chart-scale-04)", fillMode: "solid", pattern: "none" },
    { color: "var(--chart-scale-05)", fillMode: "solid", pattern: "none" },
  ] as const;

  return (
    <HeatmapInteractionProvider>
      <HeatmapInteractionBoundary>
        <div className="flex w-full flex-col items-stretch gap-3">
          <HeatmapChart
            data={contributionData}
            gap={2}
            levelStyles={heatmapLevelStyles}
            animationDuration={1100}
            //animationEasing="cubic-bezier(0.85, 0, 0.15, 1)"
            enterTransition={{
              type: "tween",
              duration: 1.1,
              ease: [0.85, 0, 0.15, 1],
            }}
            enterStaggerScale={1.0}
          >
            <HeatmapCells cornerRadius={2} />
            <HeatmapXAxis />
            <HeatmapYAxis />
            <HeatmapTooltip className="bg-popover  text-white" />
            <HeatmapSeparator
              groupBy="quarter"
              showLabels
              labelClassName="text-foreground"
              stroke="var(--border)"
              spacing={12}
              startOffset={14}
            />
          </HeatmapChart>
          <HeatmapLegend
            align="end"
            cellSize={11}
            cornerRadius={2}
            gap={2}
            levelStyles={heatmapLevelStyles}
          />
        </div>
      </HeatmapInteractionBoundary>
    </HeatmapInteractionProvider>
  );
}
