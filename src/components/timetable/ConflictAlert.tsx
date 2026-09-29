// src/components/timetable/ConflictAlert.tsx
import React from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Conflict } from "../../../shared/type";

interface Props {
  conflicts: Conflict[];
  onClose?: () => void;
}

export function ConflictAlert({ conflicts, onClose }: Props) {
  if (!conflicts.length) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-[12.5px] font-semibold text-foreground">
            Conflit d'horaire détecté
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {conflicts.map((c, i) => (
        <p key={i} className="text-[11.5px] text-muted-foreground pl-6">
          {c.message}
        </p>
      ))}
    </div>
  );
}
