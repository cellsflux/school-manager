// hooks/usePrintReceipt.ts
import { useCallback } from "react";
import { useConnecter } from "@/hooks/useConnecter";
import {
  buildReceiptHtml,
  type PrintReceiptParams,
} from "@/utils/printReceipt";

type PrintReceiptResult = {
  success: boolean;
  message?: string;
};

export function usePrintReceipt() {
  const { print } = useConnecter();

  const printReceipt = useCallback(
    async (
      params: PrintReceiptParams,
      options?: { printerName?: string; silent?: boolean },
    ): Promise<PrintReceiptResult> => {
      // buildReceiptHtml est asynchrone depuis l'ajout du QR code
      // (génération du SVG), il faut donc l'attendre avant d'imprimer.
      const html = await buildReceiptHtml(params);
      const widthMm = params.width === "80mm" ? 80 : 58;

      const result = await print.receipt({
        html,
        widthMm,
        printerName: options?.printerName,
        silent: options?.silent ?? false,
      });

      if (!result?.success) {
        console.error("[usePrintReceipt] Échec impression:", result?.message);
      }

      // On renvoie le résultat pour que l'appelant puisse informer
      // l'utilisateur en cas d'échec (avant, l'erreur restait muette
      // pour la personne qui clique sur "Imprimer").
      return result;
    },
    [print],
  );

  return { printReceipt };
}
