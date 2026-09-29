// src/lib/timetablePrint.ts
// Regroupement des créneaux + rendu HTML d'UNE page A4 paysage par emploi du temps.
import { toMinutes } from "../../shared/type";
import type { DayConfig, ScheduleView, SlotConfig } from "../../shared/type";

/** A4 paysage à 96 dpi */
export const TT_W = 1123;
export const TT_H = 794;

export type PrintKind = "class" | "teacher";

export interface PrintPage {
  key: string;
  kind: PrintKind;
  /** Nom de la classe ou du professeur */
  label: string;
  schedules: ScheduleView[];
}

export interface PrintOptions {
  days: DayConfig[];
  slots: SlotConfig[];
  yearLabel?: string;
  schoolName?: string;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

const hue = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
};

const isActive = (s: ScheduleView) => s.status !== "cancelled";

/** Une page pour une classe / un professeur déjà filtré (ex. la sélection courante). */
export function makePage(
  kind: PrintKind,
  label: string,
  schedules: ScheduleView[],
): PrintPage {
  return {
    key: `${kind}:${label}`,
    kind,
    label,
    schedules: schedules.filter(isActive),
  };
}

/**
 * Une page par classe (ou par professeur).
 * Pour un professeur, la page contient tous ses cours, dans toutes ses classes.
 */
export function groupSchedules(
  schedules: ScheduleView[],
  kind: PrintKind,
): PrintPage[] {
  const groups = new Map<string, PrintPage>();
  for (const s of schedules.filter(isActive)) {
    const label = (kind === "class" ? s.className : s.teacherName)?.trim();
    if (!label) continue;
    const g = groups.get(label) ?? {
      key: `${kind}:${label}`,
      kind,
      label,
      schedules: [],
    };
    g.schedules.push(s);
    groups.set(label, g);
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fr", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export const TIMETABLE_CSS = `
.tt-page{box-sizing:border-box;width:${TT_W}px;height:${TT_H}px;padding:28px 34px 22px;background:#fff;color:#0f172a;font-family:"Segoe UI",Inter,Arial,sans-serif;display:flex;flex-direction:column}
.tt-page *{box-sizing:border-box}
.tt-head{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;margin-bottom:12px;border-bottom:2px solid #0f172a}
.tt-title{font-size:28px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.tt-kind{font-size:13px;color:#475569;margin-top:5px}
.tt-meta{text-align:right;font-size:12px;color:#475569;line-height:1.5}
.tt-meta b{display:block;font-size:14px;color:#0f172a}
.tt-grid{flex:1;min-height:0;display:grid;gap:1px;background:#cbd5e1;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden}
.tt-cell{background:#fff;padding:3px;min-height:0;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:3px}
.tt-dh{background:#0f172a;color:#fff;font-size:12.5px;font-weight:600;align-items:center;justify-content:center;padding:0}
.tt-time{background:#f8fafc;font-size:11.5px;font-weight:600;justify-content:center;padding:3px 8px}
.tt-time small{display:block;font-weight:400;color:#64748b;font-size:9.5px}
.tt-break{background:repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9 6px,#e8edf3 6px,#e8edf3 12px);color:#64748b;font-size:10.5px;font-style:italic;align-items:center;justify-content:center}
.tt-item{flex:1;min-height:0;border-radius:4px;padding:4px 7px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.tt-item b{font-size:12.5px;line-height:1.2}
.tt-item span{font-size:10.5px;line-height:1.25;opacity:.85}
.tt-note{font-size:10px;color:#b45309;margin-top:6px}
.tt-foot{display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:8px}
`;

/** HTML d'une page (élément .tt-page de 1123×794 px) */
export function renderTimetableHtml(
  page: PrintPage,
  opts: PrintOptions,
  index: number,
  total: number,
): string {
  const days = opts.days
    .filter((d) => d.enabled)
    .map((d) => ({ ...d, value: Number(d.value) }))
    .sort((a, b) => a.value - b.value);
  const slots = [...opts.slots].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
  );
  const dayValues = new Set(days.map((d) => d.value));

  // Placement par chevauchement (même règle que la grille à l'écran)
  const cells = new Map<string, ScheduleView[]>();
  const orphans: ScheduleView[] = [];
  for (const s of page.schedules) {
    const start = toMinutes(s.startTime);
    const slot = slots.find(
      (sl) =>
        !sl.isBreak &&
        start >= toMinutes(sl.startTime) &&
        start < toMinutes(sl.endTime),
    );
    const day = Number(s.dayOfWeek);
    if (!slot || !dayValues.has(day)) {
      orphans.push(s);
      continue;
    }
    const k = `${day}|${slot.id}`;
    cells.set(k, [...(cells.get(k) ?? []), s]);
  }

  const item = (s: ScheduleView) => {
    const sub =
      page.kind === "class"
        ? s.teacherName
          ? `Prof. ${s.teacherName}`
          : ""
        : s.className;
    const h = hue(page.kind === "class" ? s.courseName : s.className);
    return `<div class="tt-item" style="background:hsl(${h},75%,94%);border-left:3px solid hsl(${h},55%,45%);color:hsl(${h},45%,22%)"><b>${esc(s.courseName)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
  };

  const rows = slots
    .map((slot) => {
      const time = `<div class="tt-cell tt-time">${slot.label ? `<small>${esc(slot.label)}</small>` : ""}${esc(slot.startTime)}–${esc(slot.endTime)}</div>`;
      if (slot.isBreak)
        return `${time}<div class="tt-cell tt-break" style="grid-column:2 / -1">${esc(slot.label || "Pause")}</div>`;
      return (
        time +
        days
          .map(
            (d) =>
              `<div class="tt-cell">${(cells.get(`${d.value}|${slot.id}`) ?? []).map(item).join("")}</div>`,
          )
          .join("")
      );
    })
    .join("");

  const gridRows = `28px ${slots.map((s) => (s.isBreak ? "minmax(0,.35fr)" : "minmax(0,1fr)")).join(" ")}`;
  const gridCols = `92px repeat(${days.length},minmax(0,1fr))`;

  const dayLabel = (v: number) =>
    opts.days.find((d) => Number(d.value) === v)?.label ?? `J${v}`;
  const note = orphans.length
    ? `<div class="tt-note">Hors grille : ${orphans
        .slice(0, 4)
        .map(
          (s) =>
            `${esc(dayLabel(Number(s.dayOfWeek)))} ${esc(s.startTime)}–${esc(s.endTime)} ${esc(s.courseName)}`,
        )
        .join(" ; ")}${orphans.length > 4 ? " …" : ""}</div>`
    : "";

  const kindLabel =
    page.kind === "class"
      ? "Emploi du temps de la classe"
      : "Emploi du temps du professeur (toutes ses classes)";

  return `<section class="tt-page">
<header class="tt-head">
  <div><div class="tt-title">${esc(page.label)}</div><div class="tt-kind">${kindLabel}</div></div>
  <div class="tt-meta">${opts.schoolName ? `<b>${esc(opts.schoolName)}</b>` : ""}${opts.yearLabel ? `Année scolaire ${esc(opts.yearLabel)}` : ""}</div>
</header>
<div class="tt-grid" style="grid-template-columns:${gridCols};grid-template-rows:${gridRows}">
  <div class="tt-cell tt-dh">Horaire</div>${days.map((d) => `<div class="tt-cell tt-dh">${esc(d.label)}</div>`).join("")}
  ${rows}
</div>
${note}
<footer class="tt-foot"><span>Imprimé le ${new Date().toLocaleDateString("fr-FR")}</span><span>Page ${index + 1} / ${total}</span></footer>
</section>`;
}
