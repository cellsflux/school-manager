// src/hooks/usePrintCv.ts
// Rendu A4 paginé : capture haute résolution (~300 dpi) de la feuille CV, découpée en pages A4
// aux frontières des blocs (aucune section coupée en deux), avec marges de page.
// Le même rendu sert pour le PDF (jsPDF) et pour l'impression (pages A4 plein format, marges 0).
import { useCallback, useState } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export const A4_W = 794; // px @96dpi
export const A4_H = 1123;
const PAD = 40; // marge haut/bas des pages 2+ (px)

type Options = { element: HTMLElement | null; fileName?: string; scale?: number };

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      try {
        const blob = await (await fetch(src, { mode: "cors" })).blob();
        const data = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
        img.setAttribute("src", data);
      } catch {
        /* CORS refusé : on laisse l'URL d'origine */
      }
    }),
  );
  await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
}

async function renderPages(element: HTMLElement, wantedScale = 3): Promise<string[]> {
  // Clone non redimensionné (l'aperçu à l'écran peut être réduit par transform: scale)
  const host = document.createElement("div");
  Object.assign(host.style, { position: "fixed", left: "-10000px", top: "0", width: `${A4_W}px`, background: "#fff", pointerEvents: "none" });
  host.innerHTML = element.outerHTML;
  document.body.appendChild(host);
  try {
    const sheet = host.querySelector<HTMLElement>(".cv-sheet");
    if (!sheet) throw new Error(".cv-sheet introuvable");
    await inlineImages(host);
    await (document as any).fonts?.ready;

    const sr = sheet.getBoundingClientRect();
    const H = Math.ceil(sr.height);
    const blocks = Array.from(sheet.querySelectorAll<HTMLElement>(".cv-sec,.cv-item,.cv-brk")).map((e) => {
      const r = e.getBoundingClientRect();
      return { top: r.top - sr.top, bottom: r.bottom - sr.top };
    });

    const scale = Math.min(wantedScale, 16000 / H);
    const canvas = await html2canvas(sheet, {
      scale, useCORS: true, backgroundColor: "#ffffff", logging: false,
      width: A4_W, height: H, windowWidth: A4_W,
    });

    // Découpe en pages (coupure juste avant le bloc qui chevaucherait le bas de page)
    const ranges: [number, number][] = [];
    let y = 0;
    for (;;) {
      const top = ranges.length ? PAD : 0;
      if (H - y <= A4_H - top) { ranges.push([y, H]); break; }
      const cap = A4_H - top - PAD;
      const limit = y + cap;
      let cut = limit;
      let snapped = false;
      for (const b of blocks) {
        if (b.top > y + cap * 0.3 && b.top < limit && b.bottom > limit && b.bottom - b.top < A4_H * 0.7 && b.top < cut) {
          cut = b.top; snapped = true;
        }
      }
      ranges.push([y, cut]);
      y = snapped ? cut - 6 : cut;
    }

    return ranges.map(([a, b], i) => {
      const top = i ? PAD : 0;
      const pc = document.createElement("canvas");
      pc.width = canvas.width;
      pc.height = Math.round(A4_H * scale);
      const g = pc.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, pc.width, pc.height);
      const sy = Math.round(a * scale);
      const sh = Math.min(Math.max(1, Math.round((b - a) * scale)), canvas.height - sy);
      const dy = Math.round(top * scale);
      // Prolonge les bandes colorées (sidebars, dégradés) dans les marges haut/bas
      if (dy > 0) g.drawImage(canvas, 0, sy, canvas.width, 1, 0, 0, canvas.width, dy);
      g.drawImage(canvas, 0, sy, canvas.width, sh, 0, dy, canvas.width, sh);
      const by = dy + sh;
      if (by < pc.height) g.drawImage(canvas, 0, sy + sh - 1, canvas.width, 1, 0, by, canvas.width, pc.height - by);
      return pc.toDataURL("image/jpeg", 0.95);
    });
  } finally {
    document.body.removeChild(host);
  }
}

function printPages(pages: string[], title: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}
img{display:block;width:210mm;height:296.8mm;break-after:page;page-break-after:always}
img:last-child{break-after:auto;page-break-after:auto}
</style></head><body>${pages.map((p) => `<img src="${p}"/>`).join("")}</body></html>`,
    );
    doc.close();
    const prevTitle = document.title;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      document.title = prevTitle;
      iframe.remove();
      resolve();
    };
    Promise.all(Array.from(doc.images).map((i) => i.decode().catch(() => undefined))).then(() => {
      const w = iframe.contentWindow!;
      document.title = title;
      w.onafterprint = done;
      w.focus();
      w.print();
      setTimeout(done, 10 * 60_000);
    });
  });
}

export function usePrintCv() {
  const [busy, setBusy] = useState(false);

  const downloadCv = useCallback(async ({ element, fileName = "cv.pdf", scale }: Options) => {
    if (!element) return;
    try {
      setBusy(true);
      const pages = await renderPages(element, scale);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      pages.forEach((p, i) => {
        if (i) pdf.addPage();
        pdf.addImage(p, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      });
      pdf.setProperties({ title: fileName.replace(/\.pdf$/i, "") });
      pdf.save(fileName);
    } catch (e) {
      console.error("Erreur export PDF:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const printCv = useCallback(async ({ element, fileName = "cv.pdf", scale }: Options) => {
    if (!element) return;
    try {
      setBusy(true);
      const pages = await renderPages(element, scale);
      setBusy(false);
      await printPages(pages, fileName.replace(/\.pdf$/i, ""));
    } catch (e) {
      console.error("Erreur impression CV:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  return { printCv, downloadCv, busy };
}
