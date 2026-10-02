// src/hooks/usePrintAttendance.ts
// Export PDF A4 portrait + impression directe des listes de présence.
import { useCallback, useState } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  PAGE_H,
  PAGE_W,
  PRINT_CSS,
  buildPrintPages,
  type AttendancePrintOptions,
} from "@/utils/attendancePrint";

import type { AttendanceView } from "../../shared/type";

type Progress = { done: number; total: number } | null;

async function renderPages(
  views: AttendanceView[],
  opts: AttendancePrintOptions,
  onProgress: (done: number, total: number) => void,
): Promise<string[]> {
  const pages = buildPrintPages(views, opts);
  if (!pages.length)
    throw new Error("Aucune présence à imprimer sur cette période.");

  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_W}px`,
    pointerEvents: "none",
  });
  host.innerHTML = `<style>${PRINT_CSS}</style>${pages.join("")}`;
  document.body.appendChild(host);

  try {
    await (document as any).fonts?.ready;
    const els = Array.from(host.querySelectorAll<HTMLElement>(".pg"));
    const out: string[] = [];
    for (let i = 0; i < els.length; i++) {
      const canvas = await html2canvas(els[i], {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        width: PAGE_W,
        height: PAGE_H,
        windowWidth: PAGE_W,
      });
      out.push(canvas.toDataURL("image/jpeg", 0.95));
      onProgress(i + 1, els.length);
      await new Promise((r) => setTimeout(r)); // laisse respirer l'UI
    }
    return out;
  } finally {
    host.remove();
  }
}

function printImages(pages: string[], title: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}
img{display:block;width:210mm;height:296.8mm;break-after:page;page-break-after:always}
img:last-child{break-after:auto;page-break-after:auto}</style></head><body>${pages.map((p) => `<img src="${p}"/>`).join("")}</body></html>`);
    doc.close();

    const prev = document.title;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      document.title = prev;
      iframe.remove();
      resolve();
    };
    Promise.all(
      Array.from(doc.images).map((i) => i.decode().catch(() => undefined)),
    ).then(() => {
      const w = iframe.contentWindow!;
      document.title = title;
      w.onafterprint = done;
      w.focus();
      w.print();
      setTimeout(done, 10 * 60_000);
    });
  });
}

export function usePrintAttendance() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      views: AttendanceView[],
      opts: AttendancePrintOptions,
      finish: (pages: string[]) => Promise<void> | void,
    ) => {
      setError(null);
      setBusy(true);
      setProgress(null);
      try {
        const pages = await renderPages(views, opts, (done, total) =>
          setProgress({ done, total }),
        );
        setBusy(false); // l'aperçu d'impression ne doit pas rester "occupé"
        await finish(pages);
      } catch (e: any) {
        console.error("Erreur export présences:", e);
        setError(e?.message || "Impossible de préparer le document.");
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [],
  );

  const downloadPdf = useCallback(
    (
      views: AttendanceView[],
      opts: AttendancePrintOptions,
      fileName = "presences.pdf",
    ) =>
      run(views, opts, (pages) => {
        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        });
        pages.forEach((img, i) => {
          if (i > 0) pdf.addPage();
          pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        });
        pdf.save(fileName);
      }),
    [run],
  );

  const print = useCallback(
    (
      views: AttendanceView[],
      opts: AttendancePrintOptions,
      title = "presences",
    ) => run(views, opts, (pages) => printImages(pages, title)),
    [run],
  );

  return { downloadPdf, print, busy, progress, error };
}
