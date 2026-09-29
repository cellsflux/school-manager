// src/components/timetable/WeekConfigEditor.tsx
import React, { useState } from "react";
import { Trash2, Plus, GripVertical, Coffee, Clock } from "lucide-react";
import type { DayConfig, SlotConfig } from "../../../shared/type";

interface Props {
  days: DayConfig[];
  slots: SlotConfig[];
  onChange: (days: DayConfig[], slots: SlotConfig[]) => void;
}

const uid = () => `s-${Math.random().toString(36).slice(2, 9)}`;

export function WeekConfigEditor({ days, slots, onChange }: Props) {
  const [tab, setTab] = useState<"days" | "slots">("slots");

  // ---------- JOURS ----------
  const updateDay = (idx: number, patch: Partial<DayConfig>) => {
    const next = days.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(next, slots);
  };

  const addDay = () => {
    const maxValue = Math.max(...days.map((d) => d.value), 0);
    onChange(
      [
        ...days,
        {
          value: maxValue + 1,
          label: `Jour ${maxValue + 1}`,
          short: "J",
          enabled: true,
        },
      ],
      slots,
    );
  };

  const removeDay = (idx: number) => {
    onChange(
      days.filter((_, i) => i !== idx),
      slots,
    );
  };

  // ---------- CRÉNEAUX ----------
  const updateSlot = (idx: number, patch: Partial<SlotConfig>) => {
    const next = slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(days, next);
  };

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const startTime = last?.endTime ?? "08:00";
    const [h, m] = startTime.split(":").map(Number);
    const endTime = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(days, [
      ...slots,
      { id: uid(), startTime, endTime, isBreak: false },
    ]);
  };

  const removeSlot = (idx: number) => {
    onChange(
      days,
      slots.filter((_, i) => i !== idx),
    );
  };

  const duplicateSlot = (idx: number) => {
    const s = slots[idx];
    const next = [...slots];
    next.splice(idx + 1, 0, { ...s, id: uid() });
    onChange(days, next);
  };

  const moveSlot = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slots.length) return;
    const next = [...slots];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(days, next);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab("slots")}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${
            tab === "slots"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Clock className="inline h-3.5 w-3.5 mr-1" />
          Créneaux horaires
        </button>
        <button
          onClick={() => setTab("days")}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${
            tab === "days"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Jours de la semaine
        </button>
      </div>

      {tab === "days" && (
        <div className="space-y-2">
          {days.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="number"
                value={d.value}
                onChange={(e) =>
                  updateDay(i, { value: Number(e.target.value) })
                }
                className="w-14 rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <input
                value={d.label}
                onChange={(e) => updateDay(i, { label: e.target.value })}
                placeholder="Libellé"
                className="flex-1 rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <input
                value={d.short}
                onChange={(e) => updateDay(i, { short: e.target.value })}
                placeholder="Court"
                className="w-20 rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => updateDay(i, { enabled: e.target.checked })}
                />
                actif
              </label>
              <button
                onClick={() => removeDay(i)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addDay}
            className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-[11.5px] text-muted-foreground hover:bg-muted/80"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un jour
          </button>
        </div>
      )}

      {tab === "slots" && (
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  onClick={() => moveSlot(i, -1)}
                  className="text-muted-foreground hover:text-foreground text-[9px] leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveSlot(i, 1)}
                  className="text-muted-foreground hover:text-foreground text-[9px] leading-none"
                >
                  ▼
                </button>
              </div>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="time"
                value={s.startTime}
                onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                className="rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="time"
                value={s.endTime}
                onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                className="rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <input
                value={s.label ?? ""}
                onChange={(e) => updateSlot(i, { label: e.target.value })}
                placeholder="Libellé (optionnel)"
                className="flex-1 rounded border border-border bg-card px-2 py-1 text-[12px]"
              />
              <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={s.isBreak}
                  onChange={(e) => updateSlot(i, { isBreak: e.target.checked })}
                />
                <Coffee className="h-3 w-3" /> pause
              </label>
              <button
                onClick={() => duplicateSlot(i)}
                className="text-muted-foreground hover:bg-muted p-1 rounded text-[10px]"
                title="Dupliquer"
              >
                ⧉
              </button>
              <button
                onClick={() => removeSlot(i)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addSlot}
            className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-[11.5px] text-muted-foreground hover:bg-muted/80"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un créneau
          </button>
        </div>
      )}
    </div>
  );
}
