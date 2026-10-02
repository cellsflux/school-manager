// src/utils/attendancePrint.ts
import {
  STATUS_LABEL,
  effectiveStatus,
  formatDateFr,
  hhmmLocal,
  summarize,
  weekdayOf,
} from "../../shared/type";
import type { AttendanceStatus, AttendanceView } from "../../shared/type";
import { formatDuration } from "../../shared/type";

export const PAGE_W = 794; // A4 @96dpi
export const PAGE_H = 1123;
export const ROWS_PER_PAGE = 24;

export type PrintGroup = "teacher" | "day";

export interface AttendancePrintOptions {
  group: PrintGroup;
  from: string;
  to: string;
  yearLabel?: string;
  today: string;
  schoolName?: string;
}

export const PRINT_CSS = `
.pg{box-sizing:border-box;width:${PAGE_W}px;height:${PAGE_H}px;padding:36px 40px;background:#fff;color:#111;font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;font-size:12px;position:relative;overflow:hidden}
.pg h1{font-size:20px;margin:0 0 2px;font-weight:700;letter-spacing:-.01em}
.pg .sub{color:#6b7280;font-size:11.5px;margin-bottom:14px}
.pg table{width:100%;border-collapse:collapse}
.pg th{background:#f2f2f7;text-align:left;font-size:10.5px;color:#6b7280;padding:7px 8px;border-bottom:1px solid #d1d1d6;font-weight:600}
.pg td{padding:7px 8px;border-bottom:1px solid #e5e5ea;font-size:11.5px}
.pg .pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:600}
.pg .sum{display:flex;gap:8px;margin-top:14px}
.pg .sum div{flex:1;background:#f2f2f7;border-radius:10px;padding:8px 10px}
.pg .sum b{display:block;font-size:16px}
.pg .sum span{font-size:10px;color:#6b7280}
.pg .sig{position:absolute;left:40px;right:40px;bottom:50px;display:flex;justify-content:space-between;font-size:11px;color:#6b7280}
.pg .sig div{width:40%;border-top:1px solid #9ca3af;padding-top:6px;text-align:center}
.pg .ft{position:absolute;left:40px;right:40px;bottom:22px;display:flex;justify-content:space-between;font-size:9.5px;color:#9ca3af}
`;

const PILL: Record<AttendanceStatus, string> = {
  present: "background:#e3f7e8;color:#248a3d",
  late: "background:#fff1dc;color:#b25e00",
  absent: "background:#ffe5e3;color:#c4261d",
  incomplete: "background:#ececf0;color:#4b4b52",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const clip = (s: string, n = 38) =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s;

const pill = (st: AttendanceStatus) =>
  `<span class="pill" style="${PILL[st]}">${STATUS_LABEL[st]}</span>`;

const dur = (v: AttendanceView) =>
  v.workedMinutes ? formatDuration(v.workedMinutes) : "—";

interface DraftPage {
  title: string;
  sub: string;
  head: string[];
  rows: string[];
  summary?: string;
  last: boolean;
}

function row(v: AttendanceView, group: PrintGroup, idx: number, today: string) {
  const st = effectiveStatus(v, today);
  const first =
    group === "teacher"
      ? `<td>${formatDateFr(v.dateKey)}</td><td>${weekdayOf(v.dateKey)}</td>`
      : `<td>${idx}</td><td>${esc(v.teacherName || "—")}</td>`;
  return `<tr>${first}<td>${hhmmLocal(v.arrive)}</td><td>${hhmmLocal(v.sortie)}</td><td>${dur(v)}</td><td>${pill(st)}</td><td>${esc(clip(v.observation))}</td></tr>`;
}

function summaryHtml(views: AttendanceView[], today: string) {
  const s = summarize(views, today);
  const box = (n: string | number, l: string) =>
    `<div><b>${n}</b><span>${l}</span></div>`;
  return `<div class="sum">${box(s.present, "Présent")}${box(s.late, "Retard")}${box(s.absent, "Absent")}${box(s.incomplete, "Incomplet")}${box(formatDuration(s.minutes), "Total heures")}</div>`;
}

/** Retourne une chaîne HTML par page A4 portrait */
export function buildPrintPages(
  views: AttendanceView[],
  o: AttendancePrintOptions,
): string[] {
  const groups = new Map<string, AttendanceView[]>();
  for (const v of views) {
    const k = o.group === "teacher" ? v.teacherId : v.dateKey;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(v);
  }

  const sections = [...groups.values()].sort((a, b) =>
    o.group === "teacher"
      ? a[0].teacherName.localeCompare(b[0].teacherName)
      : a[0].dateKey.localeCompare(b[0].dateKey),
  );

  const head =
    o.group === "teacher"
      ? ["Date", "Jour", "Entrée", "Sortie", "Durée", "Statut", "Observation"]
      : [
          "N°",
          "Professeur",
          "Entrée",
          "Sortie",
          "Durée",
          "Statut",
          "Observation",
        ];

  const drafts: DraftPage[] = [];
  for (const list of sections) {
    list.sort(
      (a, b) =>
        a.dateKey.localeCompare(b.dateKey) ||
        a.teacherName.localeCompare(b.teacherName),
    );
    const period =
      o.from <= "1971-01-01"
        ? "Toute l'année scolaire"
        : `Du ${formatDateFr(o.from)} au ${formatDateFr(o.to)}`;
    const title =
      o.group === "teacher"
        ? `Liste de présence — ${list[0].teacherName || "Professeur"}`
        : `Liste de présence du ${formatDateFr(list[0].dateKey)} (${weekdayOf(list[0].dateKey)})`;
    const sub =
      o.group === "teacher"
        ? [period, o.yearLabel].filter(Boolean).join("  ·  ")
        : [o.yearLabel, `${list.length} professeur(s)`]
            .filter(Boolean)
            .join("  ·  ");

    for (let i = 0; i < list.length; i += ROWS_PER_PAGE) {
      const chunk = list.slice(i, i + ROWS_PER_PAGE);
      const last = i + ROWS_PER_PAGE >= list.length;
      drafts.push({
        title,
        sub,
        head,
        last,
        rows: chunk.map((v, j) => row(v, o.group, i + j + 1, o.today)),
        summary: last ? summaryHtml(list, o.today) : undefined,
      });
    }
  }

  const total = drafts.length;
  const school = o.schoolName ? esc(o.schoolName) : "";
  return drafts.map(
    (p, n) => `<div class="pg">
<h1>${esc(p.title)}</h1><div class="sub">${esc(p.sub)}</div>
<table><thead><tr>${p.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${p.rows.join("")}</tbody></table>
${p.summary ?? ""}
${p.last ? `<div class="sig"><div>Signature du professeur</div><div>Direction / Préfecture</div></div>` : ""}
<div class="ft"><span>${school}</span><span>Page ${n + 1}/${total}</span></div>
</div>`,
  );
}
