import React from "react";
import { Gauge } from "../charts/gauge";

export default function Gnuage() {
  /** Gauge is driven by props — bind to your metrics
const gaugeValue = 66;
const gaugeCenterValue = 284920; */
  return (
    <Gauge
      className="dark:text-white"
      value={66}
      centerValue={284920}
      defaultLabel="Total Revenue"
      startAngle={135}
      endAngle={405}
      totalNotches={40}
      spacing={25}
      notchCornerRadius={0}
      notchLengthPercent={100}
      useGradient={false}
      inactiveFillOpacity={0.4}
      activeFillOpacity={1}
      formatOptions={{
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }}
      enterTransition={{
        type: "tween",
        duration: 1.1,
        ease: [0.85, 0, 0.15, 1],
      }}
      enterStaggerScale={1.0}
    ></Gauge>
  );
}
