// src/hooks/usePrintCard.ts
// Export carte de visite : PDF format carte (recto+verso), PDF planche A4 (10 cartes), impression planche A4.
import { useCallback, useState } from "react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import {
  CARD_CSS,
  CARD_W,
  CARD_H,
} from "@/screen/teache/teacherCard/cardTemplates";

const SHEET_W = 2480,
  SHEET_H = 3508; // A4 @300dpi
const COLS = 2,
  ROWS = 5;

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
        /* CORS refusé : on garde l'URL */
      }
    }),
  );
  await Promise.all(imgs.map((i) => i.decode().catch(() => undefined)));
}

async function faceCanvas(
  el: HTMLElement,
  scale = 1.5,
): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${CARD_W}px`,
    pointerEvents: "none",
  });
  host.innerHTML = `<style>${CARD_CSS}</style>${el.outerHTML}`;
  document.body.appendChild(host);
  try {
    const face = host.querySelector<HTMLElement>(".cc-face")!;
    await inlineImages(host);
    await (document as any).fonts?.ready;
    return await html2canvas(face, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: CARD_W,
      height: CARD_H,
      windowWidth: CARD_W,
    });
  } finally {
    document.body.removeChild(host);
  }
}

function buildSheet(face: HTMLCanvasElement): string {
  const c = document.createElement("canvas");
  c.width = SHEET_W;
  c.height = SHEET_H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, SHEET_W, SHEET_H);
  const x0 = (SHEET_W - COLS * CARD_W) / 2,
    y0 = (SHEET_H - ROWS * CARD_H) / 2;
  g.imageSmoothingQuality = "high";
  for (let i = 0; i < COLS * ROWS; i++)
    g.drawImage(
      face,
      x0 + (i % COLS) * CARD_W,
      y0 + Math.floor(i / COLS) * CARD_H,
      CARD_W,
      CARD_H,
    );
  // Traits de coupe
  g.strokeStyle = "#9ca3af";
  g.lineWidth = 2;
  g.beginPath();
  for (let c2 = 0; c2 <= COLS; c2++) {
    const x = x0 + c2 * CARD_W;
    g.moveTo(x, y0 - 50);
    g.lineTo(x, y0 - 10);
    g.moveTo(x, y0 + ROWS * CARD_H + 10);
    g.lineTo(x, y0 + ROWS * CARD_H + 50);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = y0 + r * CARD_H;
    g.moveTo(x0 - 50, y);
    g.lineTo(x0 - 10, y);
    g.moveTo(x0 + COLS * CARD_W + 10, y);
    g.lineTo(x0 + COLS * CARD_W + 50, y);
  }
  g.stroke();
  return c.toDataURL("image/jpeg", 0.95);
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

type In = {
  front: HTMLElement | null;
  back: HTMLElement | null;
  fileName?: string;
};

export function usePrintCard() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<void>) => {
    try {
      setBusy(true);
      await fn();
    } catch (e) {
      console.error("Erreur export carte:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  /** PDF format carte (88.9 x 50.8 mm), page 1 = recto, page 2 = verso */
  const downloadCardPdf = useCallback(
    ({ front, back, fileName = "carte.pdf" }: In) =>
      run(async () => {
        if (!front || !back) return;
        const [f, b] = await Promise.all([
          faceCanvas(front, 2),
          faceCanvas(back, 2),
        ]);
        const pdf = new jsPDF({
          unit: "mm",
          format: [88.9, 50.8],
          orientation: "landscape",
          compress: true,
        });
        pdf.addImage(f.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, 88.9, 50.8);
        pdf.addPage([88.9, 50.8], "landscape");
        pdf.addImage(b.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, 88.9, 50.8);
        pdf.save(fileName);
      }),
    [run],
  );

  /** PDF planche A4 : page 1 = 10 rectos, page 2 = 10 versos (impression recto-verso, bord long) */
  const downloadSheetPdf = useCallback(
    ({ front, back, fileName = "planche-cartes.pdf" }: In) =>
      run(async () => {
        if (!front || !back) return;
        const [f, b] = await Promise.all([faceCanvas(front), faceCanvas(back)]);
        const pdf = new jsPDF({
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
        });
        pdf.addImage(buildSheet(f), "JPEG", 0, 0, 210, 297, undefined, "FAST");
        pdf.addPage();
        pdf.addImage(buildSheet(b), "JPEG", 0, 0, 210, 297, undefined, "FAST");
        pdf.save(fileName);
      }),
    [run],
  );

  const printSheet = useCallback(
    ({ front, back, fileName = "planche-cartes" }: In) =>
      run(async () => {
        if (!front || !back) return;
        const [f, b] = await Promise.all([faceCanvas(front), faceCanvas(back)]);
        setBusy(false);
        await printPages(
          [buildSheet(f), buildSheet(b)],
          fileName.replace(/\.pdf$/i, ""),
        );
      }),
    [run],
  );

  return { downloadCardPdf, downloadSheetPdf, printSheet, busy };
}
