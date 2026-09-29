// src/pages/teacherCard/TeacherCardModal.tsx
// Composant autonome (modal) : choix parmi 27 templates, recto/verso, QR, export PDF / impression.
import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Printer,
  Download,
  FileText,
  Loader2,
  CreditCard,
} from "lucide-react";
import QRCode from "qrcode";
import appLogo from "../../../../resources/logo.png";
import { useEtablissement, type Ets } from "@/hooks/useEtablissement";
import { usePrintCard } from "@/hooks/usePrintCard";
import {
  CARD_TEMPLATES,
  CARD_CATEGORIES,
  CARD_CSS,
  CardFace,
  Scaled,
  type CardData,
} from "./cardTemplates";

export type CardTeacher = {
  id: string;
  _id?: string;
  matricule: string;
  fname: string;
  lname: string;
  fm_name?: string;
  grade?: string;
  specialite?: string;
  phone?: string;
  email?: string;
  picture?: string;
};

const LS_TPL = "__card_tpl_teacher__";
const LS_LOGO = "__card_logo_src__";

type Props = {
  open: boolean;
  onClose: () => void;
  teacher: CardTeacher;
  /** Optionnel : si absent, l'établissement est chargé via localStorage("__id_") + etablissement.getEts() */
  ets?: Ets | null;
};

export default function TeacherCardModal({
  open,
  onClose,
  teacher,
  ets: etsProp,
}: Props) {
  const { ets: etsFetched, loading } = useEtablissement(open && !etsProp);
  const ets = etsProp ?? etsFetched;
  const { downloadCardPdf, downloadSheetPdf, printSheet, busy } =
    usePrintCard();

  const [tplKey, setTplKey] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_TPL) || CARD_TEMPLATES[0].key;
    } catch {
      return CARD_TEMPLATES[0].key;
    }
  });
  const [logoMode, setLogoMode] = useState<"ets" | "app">(() => {
    try {
      return (localStorage.getItem(LS_LOGO) as any) === "app" ? "app" : "ets";
    } catch {
      return "ets";
    }
  });
  const [cat, setCat] = useState<string>("Tous");
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [frontEl, setFrontEl] = useState<HTMLDivElement | null>(null);
  const [backEl, setBackEl] = useState<HTMLDivElement | null>(null);

  const tpl = CARD_TEMPLATES.find((t) => t.key === tplKey) ?? CARD_TEMPLATES[0];

  const data: CardData = useMemo(() => {
    const logo =
      logoMode === "app"
        ? (appLogo as string)
        : ets?.logo || (appLogo as string);
    return {
      name: [teacher.fname, teacher.fm_name, teacher.lname]
        .filter(Boolean)
        .join(" ")
        .trim(),
      role: [teacher.grade, teacher.specialite].filter(Boolean).join(" · "),
      matricule: teacher.matricule,
      initials:
        `${teacher.fname?.[0] ?? ""}${teacher.lname?.[0] ?? ""}`.toUpperCase(),
      phone: teacher.phone,
      email: teacher.email,
      picture: teacher.picture,
      ets: {
        name: ets?.name || "Établissement",
        logo,
        type: ets?.type,
        ville: ets?.ville,
        pays: ets?.pays,
        adresse: ets?.adresse,
        phone: ets?.phone,
        email: ets?.email,
        website: ets?.website,
      },
    };
  }, [teacher, ets, logoMode]);

  // Contenu du QR : établissement + id enseignant + matricule
  const payload = useMemo(
    () =>
      JSON.stringify({
        v: 1,
        type: "teacher-card",
        ets: {
          id: ets?.id,
          name: ets?.name,
          slug: ets?.slug,
          ville: ets?.ville,
          phone: ets?.phone,
          email: ets?.email,
        },
        teacher: {
          id: teacher.id ?? teacher._id,
          matricule: teacher.matricule,
        },
      }),
    [ets, teacher],
  );

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const colors = Array.from(new Set(CARD_TEMPLATES.map((t) => t.c2)));
    Promise.all(
      colors.map((c) =>
        QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 0,
          width: 600,
          color: { dark: c, light: "#ffffff" },
        }),
      ),
    )
      .then((urls) => {
        if (alive)
          setQrs(Object.fromEntries(colors.map((c, i) => [c, urls[i]])));
      })
      .catch((e) => console.error("QR:", e));
    return () => {
      alive = false;
    };
  }, [open, payload]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const pick = (k: string) => {
    setTplKey(k);
    try {
      localStorage.setItem(LS_TPL, k);
    } catch {}
  };
  const pickLogo = (m: "ets" | "app") => {
    setLogoMode(m);
    try {
      localStorage.setItem(LS_LOGO, m);
    } catch {}
  };
  const list =
    cat === "Tous"
      ? CARD_TEMPLATES
      : CARD_TEMPLATES.filter((t) => t.cat === cat);
  const qr = qrs[tpl.c2];
  const base =
    `${teacher.fname ?? ""}-${teacher.lname ?? ""}-${teacher.matricule}`
      .trim()
      .replace(/\s+/g, "_");
  const inputs = { front: frontEl, back: backEl };
  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed";
  const chip = (a: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium ${a ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`;

  return (
    <div
      className="fixed inset-0 z-9999999999 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{CARD_CSS}</style>
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <CreditCard className="h-4 w-4" /> Carte d'enseignant — {data.name}
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10.5px] font-medium text-gray-500">
              {CARD_TEMPLATES.length} templates
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Galerie */}
          <div className="flex min-h-0 w-full flex-col border-b md:w-75 md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
            <div className="flex gap-1.5 overflow-x-hidden hover:overflow-x-auto  p-3">
              {["Tous", ...CARD_CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={chip(cat === c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="min-h-0 overflow-x-hidden pt-5   flex-1 space-y-3 overflow-y-hidden hover:overflow-y-auto px-3 pb-3">
              {list.map((t) => (
                <button
                  key={t.key}
                  onClick={() => pick(t.key)}
                  className={`block w-65  rounded-xl p-1.5 text-left transition ${t.key === tplKey ? "bg-gray-100 dark:bg-gray-800 ring-2 ring-gray-900 dark:ring-white" : "hover:bg-gray-50 dark:hover:bg-gray-900"} `}
                >
                  {qrs[t.c2] && (
                    <Scaled width={250}>
                      <CardFace d={data} tpl={t} qr={qrs[t.c2]} side="front" />
                    </Scaled>
                  )}
                  <p className="mt-1.5 px-1 text-[12px] font-semibold text-gray-800 dark:text-gray-100">
                    {t.name}{" "}
                    <span className="font-normal text-gray-400">· {t.cat}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-5">
              {loading || !qr ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl pt-5 gap-6 lg:grid-cols-2">
                  {(["front", "back"] as const).map((side) => (
                    <div key={side}>
                      <p className="mb-2 text-[11px]  font-bold uppercase tracking-wider text-gray-400">
                        {side === "front" ? "Recto" : "Verso"}
                      </p>
                      <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black/5">
                        <Scaled width={420}>
                          <CardFace
                            ref={side === "front" ? setFrontEl : setBackEl}
                            d={data}
                            tpl={tpl}
                            qr={qr}
                            side={side}
                          />
                        </Scaled>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-[11px] font-medium">
                {(
                  [
                    ["ets", "Logo école"],
                    ["app", "Logo application"],
                  ] as const
                ).map(([m, l]) => (
                  <button
                    key={m}
                    onClick={() => pickLogo(m)}
                    className={`rounded-md px-2.5 py-1 ${logoMode === m ? "bg-white dark:bg-gray-950 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={btn}
                  disabled={busy || !qr}
                  onClick={() =>
                    downloadCardPdf({
                      ...inputs,
                      fileName: `carte-${base}.pdf`,
                    })
                  }
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}{" "}
                  PDF carte
                </button>
                <button
                  className={btn}
                  disabled={busy || !qr}
                  onClick={() =>
                    downloadSheetPdf({
                      ...inputs,
                      fileName: `planche-${base}.pdf`,
                    })
                  }
                >
                  <Download className="h-3.5 w-3.5" /> PDF planche A4
                </button>
                <button
                  className={btn}
                  disabled={busy || !qr}
                  onClick={() =>
                    printSheet({ ...inputs, fileName: `planche-${base}` })
                  }
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
