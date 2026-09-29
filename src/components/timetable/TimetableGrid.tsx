// src/components/timetable/TimetableGrid.tsx
import React, { useMemo, useState } from "react";
import { Trash2, AlertTriangle, Plus } from "lucide-react";
import type { DayConfig, ScheduleView, SlotConfig } from "../../../shared/type";
import { toMinutes } from "../../../shared/type";

interface Move {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  schedules: ScheduleView[];
  days: DayConfig[];
  slots: SlotConfig[];
  mode: "class" | "teacher";
  /** Signaler les chevauchements (pertinent seulement si une classe / un prof est sélectionné) */
  highlightConflicts?: boolean;
  onMove: (moves: Move[]) => void;
  onDelete: (id: string) => void;
  onCellClick: (s: ScheduleView) => void;
  onEmptyCellClick: (
    dayOfWeek: number,
    startTime: string,
    endTime: string,
  ) => void;
}

export function TimetableGrid({
  schedules,
  days,
  slots,
  mode,
  highlightConflicts = false,
  onMove,
  onDelete,
  onCellClick,
  onEmptyCellClick,
}: Props) {
  const [dragging, setDragging] = useState<ScheduleView | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const activeDays = useMemo(
    () =>
      days
        .filter((d) => d.enabled)
        .map((d) => ({ ...d, value: Number(d.value) }))
        .sort((a, b) => a.value - b.value),
    [days],
  );

  const sortedSlots = useMemo(
    () =>
      [...slots].sort(
        (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
      ),
    [slots],
  );

  /**
   * Placement par chevauchement : un créneau est rattaché à la ligne de la grille
   * dont la plage contient son heure de début (plus d'égalité stricte start|end,
   * qui faisait disparaître tout créneau non aligné sur la configuration).
   */
  const { cells, orphans } = useMemo(() => {
    const map = new Map<string, ScheduleView[]>();
    const lost: ScheduleView[] = [];
    const dayValues = new Set(activeDays.map((d) => d.value));

    for (const s of schedules) {
      const day = Number(s.dayOfWeek);
      const start = toMinutes(s.startTime);
      const slot = sortedSlots.find(
        (sl) =>
          !sl.isBreak &&
          start >= toMinutes(sl.startTime) &&
          start < toMinutes(sl.endTime),
      );
      if (!slot || !dayValues.has(day)) {
        lost.push(s);
        continue;
      }
      const key = `${day}|${slot.id}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return { cells: map, orphans: lost };
  }, [schedules, sortedSlots, activeDays]);

  // -------------------- Drag & drop --------------------
  const handleDragStart = (s: ScheduleView) => (e: React.DragEvent) => {
    setDragging(s);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", s.id);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const handleDragOver = (key: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== key) setDragOver(key);
  };

  const handleDrop =
    (dayOfWeek: number, slot: SlotConfig) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const current = dragging;
      setDragging(null);
      if (!current) return;
      if (
        Number(current.dayOfWeek) === dayOfWeek &&
        current.startTime === slot.startTime &&
        current.endTime === slot.endTime
      )
        return;
      onMove([
        {
          id: current.id,
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      ]);
    };

  // -------------------- Carte d'un créneau --------------------
  const renderCard = (s: ScheduleView, conflict: boolean) => (
    <div
      key={s.id}
      draggable
      onDragStart={handleDragStart(s)}
      onDragEnd={handleDragEnd}
      onClick={() => onCellClick(s)}
      className={`group relative flex flex-col gap-0.5 rounded-lg border p-2 pl-3 cursor-grab active:cursor-grabbing transition-all ${
        dragging?.id === s.id ? "opacity-40" : ""
      } ${
        conflict
          ? "border-destructive/50 bg-destructive/5"
          : s.status === "cancelled"
            ? "border-border bg-muted/50 text-muted-foreground line-through"
            : "border-border bg-card hover:bg-muted/40 hover:shadow-sm"
      }`}
    >
      <span
        className={`absolute inset-y-1.5 left-1 w-0.5 rounded-full ${
          conflict ? "bg-destructive" : "bg-primary/60"
        }`}
      />
      <div className="flex items-start justify-between gap-1">
        <span className="text-[12px] font-semibold leading-tight text-foreground">
          {mode === "class" ? s.courseName : `${s.courseName}`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(s.id);
          }}
          className="rounded p-0.5 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <span className="text-[10.5px] text-muted-foreground">
        {mode === "class" ? `Prof. ${s.teacherName || "—"}` : s.className}
      </span>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {conflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
        {s.startTime}–{s.endTime}
      </span>
    </div>
  );

  if (!sortedSlots.length || !activeDays.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">
        La grille est vide. Utilisez « Configurer la grille » pour activer des
        jours et définir des créneaux horaires.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full select-none border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-28 border-b border-border bg-muted p-2 text-left text-[11px] font-semibold text-muted-foreground">
                Horaire
              </th>
              {activeDays.map((d) => (
                <th
                  key={d.value}
                  className="min-w-[170px] border-b border-l border-border bg-muted/60 p-2 text-center text-[11px] font-semibold text-foreground"
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map((slot) => (
              <tr key={slot.id}>
                <td
                  className={`sticky left-0 z-10 whitespace-nowrap border-b border-border bg-card p-2 text-[11px] ${
                    slot.isBreak
                      ? "italic text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {slot.label && (
                    <div className="text-[10px] text-muted-foreground">
                      {slot.label}
                    </div>
                  )}
                  <span className="font-medium tabular-nums">
                    {slot.startTime}–{slot.endTime}
                  </span>
                </td>

                {slot.isBreak ? (
                  <td
                    colSpan={activeDays.length}
                    className="border-b border-l border-border bg-muted/30 p-1 text-center text-[10px] italic text-muted-foreground"
                  >
                    {slot.label || "Pause"}
                  </td>
                ) : (
                  activeDays.map((d) => {
                    const cellKey = `${d.value}|${slot.id}`;
                    const items = cells.get(cellKey) ?? [];
                    const isDragOver = dragOver === cellKey;
                    const conflict = highlightConflicts && items.length > 1;

                    return (
                      <td
                        key={d.value}
                        onDragOver={handleDragOver(cellKey)}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={handleDrop(d.value, slot)}
                        className={`min-w-[170px] border-b border-l border-border p-1 align-top transition-colors ${
                          isDragOver
                            ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                            : ""
                        }`}
                      >
                        {items.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {items.map((s) => renderCard(s, conflict))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onEmptyCellClick(
                                d.value,
                                slot.startTime,
                                slot.endTime,
                              )
                            }
                            title={`Ajouter — ${d.label} ${slot.startTime}–${slot.endTime}`}
                            className="group flex min-h-[64px] w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/50 text-[10px] text-transparent transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus className="h-3 w-3" />
                            {d.label} · {slot.startTime}
                          </button>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orphans.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {orphans.length} créneau(x) hors de la grille configurée
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Leur jour ou leur horaire ne correspond à aucune ligne de la grille.
            Cliquez pour les modifier ou glissez-les dans une cellule.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {orphans.map((s) => renderCard(s, false))}
          </div>
        </div>
      )}
    </div>
  );
}
