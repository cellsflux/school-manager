// src/components/ui/useConfirm.tsx
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * const { confirm, dialog } = useConfirm();
 * if (!(await confirm({ title: "Supprimer ?", danger: true }))) return;
 * … et rendre {dialog} une fois dans le JSX.
 */
export function useConfirm(): {
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ opts, resolve })),
    [],
  );

  const close = useCallback(
    (v: boolean) => {
      state?.resolve(v);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  const dialog = state ? (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-[290px] overflow-hidden rounded-[18px] bg-card text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pb-4 pt-5">
          <h3 className="text-[16px] font-semibold text-foreground">
            {state.opts.title}
          </h3>
          {state.opts.message && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              {state.opts.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <button
            type="button"
            onClick={() => close(false)}
            className="py-3 text-[16px] text-[#007AFF] active:bg-muted"
          >
            {state.opts.cancelLabel ?? "Annuler"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`py-3 text-[16px] font-semibold active:bg-muted ${
              state.opts.danger ? "text-[#FF3B30]" : "text-[#007AFF]"
            }`}
          >
            {state.opts.confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
