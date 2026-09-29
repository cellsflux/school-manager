// server/modules/print.module.ts
import { BrowserWindow, screen } from "electron";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { catchError } from "../utils/errorrequeste";

type PrintReceiptInput = {
  html: string;
  widthMm?: number; // 58 ou 80
  printerName?: string;
  silent?: boolean; // true = imprime directement sans dialogue
};

type PrintResult = {
  success: boolean;
  message?: string;
};

type ListPrintersResult = {
  success: boolean;
  data?: Electron.PrinterInfo[];
  message?: string;
};

function waitForLoad(win: BrowserWindow, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Délai dépassé lors du chargement du reçu à imprimer."));
    }, timeoutMs);

    win.webContents.once("did-finish-load", () => {
      clearTimeout(timer);
      resolve();
    });
    win.webContents.once("did-fail-load", (_e, errorCode, errorDescription) => {
      clearTimeout(timer);
      reject(new Error(`did-fail-load: ${errorCode} ${errorDescription}`));
    });
  });
}

/**
 * Calcule une position garantie hors de tous les écrans connectés,
 * quelle que soit leur disposition (y compris des écrans placés à
 * des coordonnées négatives). Un simple "-3000,-3000" en dur peut
 * tomber PILE sur un écran secondaire dans certaines configurations
 * multi-écrans, ce qui rend la fenêtre "invisible" visible à l'écran.
 */
function getOffscreenPosition(
  width: number,
  height: number,
): { x: number; y: number } {
  const displays = screen.getAllDisplays();
  let minX = 0;
  let minY = 0;
  for (const d of displays) {
    minX = Math.min(minX, d.bounds.x);
    minY = Math.min(minY, d.bounds.y);
  }
  // On se place largement au-delà du bord le plus extrême détecté.
  return { x: minX - width - 500, y: minY - height - 500 };
}

export const printModule = {
  /**
   * Imprime un reçu HTML. Fenêtre positionnée hors écran mais RÉELLEMENT
   * affichée (show: true) — indispensable sur Windows : une fenêtre
   * jamais peinte (show:false ou offscreen) fait échouer l'aperçu natif
   * avec "cette application ne prend pas en charge l'aperçu avant
   * impression" ou "Printing failed".
   */
  receipt: async ({
    html,
    widthMm = 58,
    printerName,
    silent = false,
  }: PrintReceiptInput): Promise<PrintResult> => {
    if (!html || typeof html !== "string") {
      return { success: false, message: "HTML manquant ou invalide." };
    }

    const tmpFile = path.join(os.tmpdir(), `print-${randomUUID()}.html`);
    let win: BrowserWindow | null = null;

    try {
      await fs.writeFile(tmpFile, html, "utf-8");

      const winWidth = 400;
      const winHeight = 600;
      const { x, y } = getOffscreenPosition(winWidth, winHeight);

      win = new BrowserWindow({
        show: true,
        x,
        y,
        width: winWidth,
        height: winHeight,
        frame: false,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        webPreferences: {
          sandbox: false,
          backgroundThrottling: false,
        },
      });

      const loadPromise = waitForLoad(win);
      await win.loadFile(tmpFile);
      await loadPromise;

      // Laisse un cycle de rendu se produire avant d'imprimer.
      await new Promise((r) => setTimeout(r, 80));

      const cleanPrinterName = printerName?.trim() || undefined;

      await new Promise<void>((resolve, reject) => {
        win!.webContents.print(
          {
            silent,
            printBackground: true,
            deviceName: cleanPrinterName,
            margins: { marginType: "none" },
            pageSize: {
              width: widthMm * 1000, // microns
              height: 297000, // hauteur max large (297mm), le contenu réel est plus court — l'imprimante thermique coupe au bon endroit selon son propre pilote/firmware
            },
          },
          (success, failureReason) => {
            if (!success) {
              reject(new Error(failureReason || "Échec de l'impression."));
              return;
            }
            resolve();
          },
        );
      });

      return { success: true };
    } catch (error: any) {
      catchError(error);
      return {
        success: false,
        message: error?.message || "Erreur lors de l'impression.",
      };
    } finally {
      win?.destroy();
      fs.unlink(tmpFile).catch(() => {});
    }
  },

  listPrinters: async (): Promise<ListPrintersResult> => {
    let win: BrowserWindow | null = null;
    try {
      win = new BrowserWindow({ show: false });
      const printers = await win.webContents.getPrintersAsync();
      return { success: true, data: printers };
    } catch (error: any) {
      catchError(error);
      return { success: false, message: error?.message };
    } finally {
      win?.destroy();
    }
  },
};
