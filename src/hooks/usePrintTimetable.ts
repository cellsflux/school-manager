// src/hooks/usePrintTimetable.ts
// Export / impression des emplois du temps : 1 emploi du temps = 1 page A4 paysage.
import { useCallback, useState } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  TT_W,
  TT_H,
  TIMETABLE_CSS,
  renderTimetableHtml,
} from "@/utils/timetablePrint";
import type { PrintPage, PrintOptions } from "@/utils/timetablePrint";

const SCALE = 2.5; // ≈ 240 dpi

async function pageCanvas(html: string): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${TT_W}px`,
    height: `${TT_H}px`,
    pointerEvents: "none",
  });
  host.innerHTML = `<style>${TIMETABLE_CSS}</style>${html}`;
  document.body.appendChild(host);
  try {
    await (document as any).fonts?.ready;
    const el = host.querySelector<HTMLElement>(".tt-page")!;
    return await html2canvas(el, {
      scale: SCALE,
      backgroundColor: "#ffffff",
      logging: false,
      width: TT_W,
      height: TT_H,
      windowWidth: TT_W,
      windowHeight: TT_H,
    });
  } finally {
    host.remove();
  }
}

function printPages(pages: string[], title: string): Promise<void> {
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
@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0;background:#fff}
img{display:block;width:297mm;height:209.5mm;break-after:page;page-break-after:always}
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

export function usePrintTimetable() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Rend chaque page l'une après l'autre (mémoire maîtrisée) */
  const each = useCallback(
    async (
      pages: PrintPage[],
      opts: PrintOptions,
      onCanvas: (c: HTMLCanvasElement, i: number) => void,
    ) => {
      for (let i = 0; i < pages.length; i++) {
        const c = await pageCanvas(
          renderTimetableHtml(pages[i], opts, i, pages.length),
        );
        onCanvas(c, i);
        setProgress({ done: i + 1, total: pages.length });
        await new Promise((r) => setTimeout(r, 0)); // laisse respirer l'UI
      }
    },
    [],
  );

  const run = useCallback(
    async (pages: PrintPage[], fn: () => Promise<void>) => {
      if (!pages.length) {
        setError("Aucun emploi du temps à imprimer.");
        return;
      }
      setBusy(true);
      setError(null);
      setProgress({ done: 0, total: pages.length });
      try {
        await fn();
      } catch (e) {
        console.error("Erreur export emploi du temps:", e);
        setError("L'export a échoué. Réessayez.");
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [],
  );

  /** PDF A4 paysage : une page par classe / professeur */
  const downloadPdf = useCallback(
    (
      pages: PrintPage[],
      opts: PrintOptions,
      fileName = "emplois-du-temps.pdf",
    ) =>
      run(pages, async () => {
        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "landscape",
          compress: true,
        });
        await each(pages, opts, (c, i) => {
          if (i > 0) pdf.addPage("a4", "landscape");
          pdf.addImage(
            c.toDataURL("image/jpeg", 0.93),
            "JPEG",
            0,
            0,
            297,
            210,
            undefined,
            "FAST",
          );
        });
        pdf.save(fileName);
      }),
    [run, each],
  );

  /** Boîte de dialogue d'impression du navigateur (A4 paysage) */
  const print = useCallback(
    (pages: PrintPage[], opts: PrintOptions, title = "Emplois du temps") =>
      run(pages, async () => {
        const urls: string[] = [];
        await each(pages, opts, (c) =>
          urls.push(c.toDataURL("image/jpeg", 0.93)),
        );
        setBusy(false);
        setProgress(null);
        await printPages(urls, title);
      }),
    [run, each],
  );

  return { downloadPdf, print, busy, progress, error };
}
