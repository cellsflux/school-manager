// src/components/timetable/ScheduleCell.tsx
import React from "react";
import type { ScheduleView } from "../../../shared/type";

interface Props {
  schedule: ScheduleView;
  onClick?: () => void;
}

export function ScheduleCell({ schedule, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-0.5 p-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <span className="text-[12px] font-semibold text-foreground">
        {schedule.courseName}
      </span>
      <span className="text-[10.5px] text-muted-foreground">
        Prof. {schedule.teacherName || "—"}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {schedule.startTime} - {schedule.endTime}
      </span>
      {schedule.sectionName && (
        <span className="text-[9.5px] text-muted-foreground/70">
          {schedule.sectionName}
        </span>
      )}
    </div>
  );
}
