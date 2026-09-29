// src/pages/TeacherDetailPage.tsx
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Loader2, AlertCircle, Printer, Download, Palette, Check, ChevronDown, LayoutTemplate, RotateCcw, CreditCard,
} from "lucide-react";
import { useConnecter } from "@/hooks/useConnecter";
import { usePrintCv, A4_W, A4_H } from "@/hooks/usePrintCv";
import { CV_THEMES, CV_THEME_LIST, DEFAULT_CV_THEME, type CvThemeKey, type CvTheme } from "@/utils/teacherCvThemes";
import {
  CV_LAYOUTS, CV_LAYOUT_LIST, CV_LAYOUT_CATEGORIES, DEFAULT_CV_LAYOUT, type CvLayoutKey,
} from "@/utils/teacherCvLayouts";
import { CvSheet, type Teacher } from "./teacherCv/CvSheet";
import TeacherCardModal from "./teacherCard/TeacherCardModal";
import { useEtablissement } from "@/hooks/useEtablissement";

// Persistance
const LS_THEME = "__cv_theme_teacher__";
const LS_LAYOUT = "__cv_layout_teacher__";
const read = <T extends string>(key: string, valid: Record<string, unknown>, def: T): T => {
  try { const v = localStorage.getItem(key); if (v && v in valid) return v as T; } catch {}
  return def;
};
const write = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch {} };

// ---------------------------------------------------------------------------
// Mini aperçu des layouts (sélecteur)
// ---------------------------------------------------------------------------
type Shape = "L" | "R" | "B" | "C" | "T" | "M" | "G" | "S" | "X";
const SHAPES: Record<CvLayoutKey, [Shape, number?]> = {
  sidebarLeft: ["L", 12], sidebarRight: ["R", 12], sidebarLeftNarrow: ["L", 8], sidebarLeftWide: ["L", 17],
  topBanner: ["B", 10], topBannerCentered: ["B", 13], heroOverlap: ["B", 9], heroFullBg: ["B", 17],
  twoColsEqual: ["C", 50], twoCols30_70: ["C", 30], twoCols70_30: ["C", 70],
  timelineCentral: ["T"], timelineRight: ["T"], timelineHorizontal: ["T"],
  magazine: ["M"], editorial: ["M"], newspaper: ["C", 50],
  minimalCentered: ["M"], minimalLeft: ["M"], minimalCompact: ["M"],
  cardGrid: ["G"], bentoGrid: ["G"], masonry: ["G"],
  creativeDiagonal: ["B", 12], creativeCircle: ["X"], creativeSideAccent: ["S"], creativeSplit: ["C", 50],
};
const Mini: React.FC<{ k: CvLayoutKey; th: CvTheme }> = ({ k, th }) => {
  const [s, n = 12] = SHAPES[k];
  const bar = (w = "70%") => <div style={{ height: 3, width: w, borderRadius: 2, background: th.primary, marginBottom: 2 }} />;
  const gr = <div style={{ height: 2, borderRadius: 2, background: "#d1d5db", marginBottom: 2 }} />;
  let inner: React.ReactNode;
  if (s === "L" || s === "R") {
    const side = <div style={{ width: n, background: th.gradient }} />;
    const main = <div style={{ flex: 1, padding: 3 }}>{bar()}{gr}{gr}</div>;
    inner = <div style={{ display: "flex", height: "100%" }}>{s === "L" ? <>{side}{main}</> : <>{main}{side}</>}</div>;
  } else if (s === "B") inner = <div><div style={{ height: n, background: th.gradient }} /><div style={{ padding: 3 }}>{bar()}{gr}{gr}</div></div>;
  else if (s === "C") inner = <div style={{ display: "flex", height: "100%", gap: 2, padding: 3 }}><div style={{ width: `${n}%` }}>{bar("100%")}{gr}</div><div style={{ flex: 1 }}>{gr}{gr}{gr}</div></div>;
  else if (s === "T") inner = <div style={{ display: "flex", justifyContent: "center", height: "100%", padding: 3 }}><div style={{ width: 2, background: th.primary }} /></div>;
  else if (s === "G") inner = <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, padding: 3, height: "100%" }}>{[0, 1, 2, 3].map((i) => <div key={i} style={{ background: i === 0 ? th.primary : "#e5e7eb", borderRadius: 2 }} />)}</div>;
  else if (s === "S") inner = <div style={{ display: "flex", height: "100%" }}><div style={{ width: 3, background: th.gradient }} /><div style={{ padding: 3, flex: 1 }}>{bar()}{gr}</div></div>;
  else if (s === "X") inner = <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}><div style={{ width: 16, height: 16, borderRadius: "50%", background: th.gradient }} /></div>;
  else inner = <div style={{ padding: 4 }}>{bar("50%")}{gr}{gr}{gr}</div>;
  return <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">{inner}</div>;
};

// ---------------------------------------------------------------------------
// Sélecteur Forme / Couleur
// ---------------------------------------------------------------------------
function Customizer(props: {
  theme: CvThemeKey; onTheme: (k: CvThemeKey) => void; layout: CvLayoutKey; onLayout: (k: CvLayoutKey) => void; onReset: () => void;
}) {
  const { theme, onTheme, layout, onLayout, onReset } = props;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"theme" | "layout">("layout");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const th = CV_THEMES[theme];
  const item = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`;
  const tabCls = (a: boolean) =>
    `flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-medium ${a ? "border-b-2 border-current text-gray-900 dark:text-gray-100" : "text-gray-500"}`;
  return (
    <div className="relative print:hidden" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
        <Palette className="h-3.5 w-3.5" /><span className="hidden sm:inline">Personnaliser</span><ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button onClick={() => setTab("layout")} className={tabCls(tab === "layout")}><LayoutTemplate className="h-3.5 w-3.5" /> Forme ({CV_LAYOUT_LIST.length})</button>
            <button onClick={() => setTab("theme")} className={tabCls(tab === "theme")}><Palette className="h-3.5 w-3.5" /> Couleur ({CV_THEME_LIST.length})</button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {tab === "layout" && CV_LAYOUT_CATEGORIES.map((cat) => (
              <div key={cat} className="mb-2">
                <p className="px-2 py-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-400">{cat}</p>
                {CV_LAYOUT_LIST.filter((l) => l.category === cat).map((l) => (
                  <button key={l.key} onClick={() => onLayout(l.key)} className={item(l.key === layout)}>
                    <Mini k={l.key} th={th} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-100">{l.name}</p>
                      <p className="text-[10.5px] text-gray-400 truncate">{l.description}</p>
                    </div>
                    {l.key === layout && <Check className="h-4 w-4 text-emerald-500" />}
                  </button>
                ))}
              </div>
            ))}
            {tab === "theme" && CV_THEME_LIST.map((t) => (
              <button key={t.key} onClick={() => onTheme(t.key)} className={item(t.key === theme)}>
                <div className="h-10 w-10 flex-shrink-0 rounded-lg border border-gray-200" style={{ background: t.gradient }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-100">{t.name}</p>
                  <p className="text-[10.5px] text-gray-400 truncate">{t.description}</p>
                </div>
                {t.key === theme && <Check className="h-4 w-4 text-emerald-500" />}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex items-center justify-between">
            <p className="text-[10.5px] text-gray-400 px-2">{CV_LAYOUTS[layout].name} · {th.name}</p>
            <button onClick={onReset} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <RotateCcw className="h-3 w-3" /> Réinitialiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aperçu A4 mis à l'échelle (l'export utilise toujours la taille réelle 794px)
// ---------------------------------------------------------------------------
const Preview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [h, setH] = useState(A4_H);
  useLayoutEffect(() => {
    const upd = () => {
      if (!wrap.current || !inner.current) return;
      setScale(Math.min(1, wrap.current.clientWidth / A4_W));
      setH(inner.current.offsetHeight);
    };
    upd();
    const ro = new ResizeObserver(upd);
    if (wrap.current) ro.observe(wrap.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrap} className="w-full">
      <div className="mx-auto overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-black/5" style={{ width: A4_W * scale, height: h * scale }}>
        <div ref={inner} style={{ width: A4_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400 print:hidden">
        Format A4 · environ {Math.max(1, Math.ceil(h / A4_H))} page(s)
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { Teacher: TeacherApi } = useConnecter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { printCv, downloadCv, busy } = usePrintCv();

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState<CvThemeKey>(() => read(LS_THEME, CV_THEMES, DEFAULT_CV_THEME));
  const [layoutKey, setLayoutKey] = useState<CvLayoutKey>(() => read(LS_LAYOUT, CV_LAYOUTS, DEFAULT_CV_LAYOUT));
  const theme = CV_THEMES[themeKey];
  const { ets } = useEtablissement();
  const [cardOpen, setCardOpen] = useState(false);

  const onTheme = (k: CvThemeKey) => { setThemeKey(k); write(LS_THEME, k); };
  const onLayout = (k: CvLayoutKey) => { setLayoutKey(k); write(LS_LAYOUT, k); };
  const onReset = () => { onTheme(DEFAULT_CV_THEME); onLayout(DEFAULT_CV_LAYOUT); };

  const fetchTeacher = useCallback(async () => {
    if (!id) { setError("Aucun identifiant fourni."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const r = await TeacherApi.findById({ id });
      if (r?.success && r.data) {
        const t: any = r.data;
        setTeacher({ ...t, id: t.id ?? t._id?.toString?.() ?? String(t._id) });
      } else setError(r?.message || "Enseignant non trouvé.");
    } catch (e) {
      console.error("Erreur fetch teacher:", e);
      setError("Une erreur est survenue lors du chargement.");
    } finally { setLoading(false); }
  }, [id, TeacherApi]);
  useEffect(() => { fetchTeacher(); }, [fetchTeacher]);

  if (loading)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-gray-500">Chargement du profil enseignant…</p>
      </div>
    );
  if (error || !teacher)
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error || "Enseignant introuvable."}</p>
          <button onClick={() => navigate("/teachers")} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste
          </button>
        </div>
      </div>
    );

  const fileName = `CV-${(teacher.fname ?? "").trim()}-${(teacher.lname ?? "").trim()}-${teacher.matricule}.pdf`.replace(/\s+/g, "_");
  const btn = "inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate("/teachers")} className={btn}><ArrowLeft className="h-3.5 w-3.5" /> Retour</button>
        <div className="flex items-center gap-2">
          <Customizer theme={themeKey} onTheme={onTheme} layout={layoutKey} onLayout={onLayout} onReset={onReset} />
          <button disabled={busy} className={btn} onClick={() => downloadCv({ element: sheetRef.current, fileName })}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}<span className="hidden sm:inline">PDF</span>
          </button>
          <button disabled={busy} className={btn} onClick={() => printCv({ element: sheetRef.current, fileName })}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}<span className="hidden sm:inline">Imprimer</span>
          </button>
          <button className={btn} onClick={() => setCardOpen(true)}>
            <CreditCard className="h-3.5 w-3.5" /><span className="hidden sm:inline">Carte</span>
          </button>
          <button onClick={() => navigate("/teachers/add", { state: { teacher } })}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-sm hover:opacity-90" style={{ background: theme.primary }}>
            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Modifier</span>
          </button>
        </div>
      </div>
      <Preview>
        <CvSheet ref={sheetRef} teacher={teacher} theme={theme} layout={layoutKey} ets={ets} />
      </Preview>
      <TeacherCardModal open={cardOpen} onClose={() => setCardOpen(false)} teacher={teacher as any} ets={ets} />
    </div>
  );
}
