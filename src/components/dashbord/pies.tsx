import React from "react";
import PieChart from "../charts/pie-chart";
import PieSlice from "../charts/pie-slice";
import Grid from "../charts/grid";

export default function Piesharts() {
  const pieData = [
    {
      label: "Chrome",
      value: 275,
      color: "var(--chart-1)",
    },
    {
      label: "Safari",
      value: 200,
      color: "var(--chart-2)",
    },
    {
      label: "Firefox",
      value: 187,
      color: "var(--chart-3)",
    },
    {
      label: "Edge",
      value: 173,
      color: "var(--chart-4)",
    },
    {
      label: "Other",
      value: 90,
      color: "var(--chart-5)",
    },
  ];
  return (
    <PieChart
      data={pieData}
      size={100}
      padAngle={0}
      cornerRadius={0}
      hoverOffset={10}
      startAngle={(-90 * Math.PI) / 180}
      endAngle={(270 * Math.PI) / 180}
      enterTransition={{
        type: "tween",
        duration: 1.1,
        ease: [0.85, 0, 0.15, 1],
      }}
      enterStaggerScale={1.0}
    >
      <PieSlice index={0} hoverEffect="translate" />
      <PieSlice index={1} hoverEffect="translate" />
      <PieSlice index={2} hoverEffect="translate" />
      <PieSlice index={3} hoverEffect="translate" />
      <PieSlice index={4} hoverEffect="translate" />
    </PieChart>
  );
}
