// src/pages/AttendanceTeacherPage.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Settings,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
import { useConnecter } from "@/hooks/useConnecter";
import { useAttendanceConfig } from "@/hooks/useAttendanceConfig";
import { usePrintAttendance } from "@/hooks/usePrintAttendance";
import { AttendanceConfigModal } from "@/components/attendance/AttendanceConfigModal";
import { AttendanceForm } from "@/components/attendance/AttendanceForm";
import { TeacherQrScanner } from "@/components/attendance/TeacherQrScanner";
import { findTeacherByCard, parseTeacherCard } from "@/utils/teacherCard";
import {
  buildGreeting,
  genderOf,
  readVoiceEnabled,
  saveVoiceEnabled,
  speak,
  stopSpeaking,
} from "@/utils/speakGreeting";
import { useConfirm } from "@/components/ui/useConfirm";
import {
  AttendancePrintDialog,
  type PrintRequest,
} from "@/components/attendance/AttendancePrintDialog";
import {
  STATUS_LABEL,
  effectiveStatus,
  formatDateFr,
  hhmmLocal,
  localMinutesOf,
  monthRange,
  summarize,
  todayKey,
  weekdayOf,
} from "../../../shared/type";
import type {
  AttendanceContext,
  AttendanceStatus,
  AttendanceView,
} from "../../../shared/type";
import { formatDuration, isValidId, toMinutes } from "../../../shared/type";

type Period = "day" | "month";
type Notice = { ok: boolean; text: string; silent?: boolean } | null;

const PILL: Record<AttendanceStatus, string> = {
  present: "bg-[#34C759]/15 text-[#248A3D]",
  late: "bg-[#FF9500]/15 text-[#B25E00]",
  absent: "bg-[#FF3B30]/15 text-[#C4261D]",
  incomplete: "bg-[#8E8E93]/20 text-[#636366]",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const seg = (on: boolean) =>
  `rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
  }`;

const selectCls =
  "rounded-xl bg-muted px-3 py-2 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-[#007AFF]/40";

export default function AttendanceTeacherPage() {
  const api = useConnecter();
  const apiRef = useRef(api);
  apiRef.current = api;

  const { config, configured, save, tzOffset } = useAttendanceConfig();
  const printer = usePrintAttendance();
  const { confirm: ask, dialog: confirmDialog } = useConfirm();

  const talk = useCallback(
    (text: string, wait = false) => speak(text, apiRef.current.speech, wait),
    [],
  );
  const hush = useCallback(() => stopSpeaking(apiRef.current.speech), []);

  // -------------------- État --------------------
  const [records, setRecords] = useState<AttendanceView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "">("");

  const [period, setPeriod] = useState<Period>("day");
  const [dayKey, setDayKey] = useState(todayKey());
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));

  const [configOpen, setConfigOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceView | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [scanValue, setScanValue] = useState("");
  const [manualTeacher, setManualTeacher] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(readVoiceEnabled);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;

  const toggleVoice = async () => {
    const next = !voiceOn;
    setVoiceOn(next);
    saveVoiceEnabled(next);
    if (!next) return hush();
    const r = await talk("Voix activée.", true);
    if (!r.ok)
      setNotice({
        ok: false,
        silent: true,
        text: `Voix indisponible : ${r.error ?? "erreur inconnue"}`,
      });
    else if (!r.frenchVoice)
      setNotice({
        ok: false,
        silent: true,
        text: "Aucune voix française installée sur cet ordinateur. Ajoutez-la dans Windows : Paramètres > Heure et langue > Voix.",
      });
  };

  const scanBusy = useRef(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const ctx: AttendanceContext | null = useMemo(
    () => (config ? { config, tzOffset: tzOffset() } : null),
    [config, tzOffset],
  );
  const today = todayKey();

  useEffect(() => {
    if (!configured) setConfigOpen(true);
  }, [configured]);

  // -------------------- Référentiels --------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Teacher, year } = apiRef.current;
        const [teaRes, yearRes] = await Promise.all([
          Teacher?.getAll
            ? Teacher.getAll({ page: 1, limit: 500 })
            : Promise.resolve({ data: [] }),
          year?.find ? year.find() : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;
        const teaList = teaRes?.data ?? (Array.isArray(teaRes) ? teaRes : []);
        const yearList =
          yearRes?.data ?? (Array.isArray(yearRes) ? yearRes : []);
        setTeachers(teaList);
        setYears(yearList);
        if (yearList.length) {
          const sorted = [...yearList].sort(
            (a: any, b: any) =>
              (b.dateDebut ? new Date(b.dateDebut).getTime() : 0) -
              (a.dateDebut ? new Date(a.dateDebut).getTime() : 0),
          );
          setSelectedYearId(String(sorted[0]._id));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const teacherOptions = useMemo(
    () =>
      teachers.map((t: any) => ({
        value: t._id?.toString?.() ?? t.id,
        label: [t.fname, t.fm_name, t.lname].filter(Boolean).join(" ") || "—",
      })),
    [teachers],
  );
  const yearOptions = useMemo(
    () =>
      years.map((y: any) => ({
        value: y._id?.toString?.() ?? y.id,
        label: y.libelle ?? "—",
      })),
    [years],
  );
  const yearLabel = yearOptions.find((y) => y.value === selectedYearId)?.label;

  // -------------------- Lecture --------------------
  const range = useMemo(
    () =>
      period === "day" ? { from: dayKey, to: dayKey } : monthRange(monthKey),
    [period, dayKey, monthKey],
  );

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRef.current.attendanceTeacher.getAttendances({
        yearId: selectedYearId ?? undefined,
        teacherId: teacherFilter || undefined,
        from: range.from,
        to: range.to,
      });
      if (res?.success === false) {
        setError(res.message || "Erreur de chargement");
        setRecords([]);
      } else setRecords(res?.data ?? []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les présences.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, teacherFilter, range]);

  useEffect(() => {
    fetchRecords();
    setSelected(new Set());
  }, [fetchRecords]);

  // -------------------- Pointage --------------------
  const pointer = useCallback(
    async (teacherId: string, method: "qr_code" | "manual") => {
      if (scanBusy.current) return;
      if (!ctx) return setConfigOpen(true);
      if (!selectedYearId)
        return setNotice({ ok: false, text: "Sélectionnez l'année scolaire." });
      if (!isValidId(teacherId))
        return setNotice({
          ok: false,
          text: "Code invalide : professeur introuvable.",
        });

      scanBusy.current = true;
      setScanning(true);
      try {
        const res: any = await apiRef.current.attendanceTeacher.scan({
          teacherId,
          yearId: selectedYearId,
          datetime: new Date().toISOString(),
          method,
          ctx,
        });

        const v = res?.data as AttendanceView | undefined;
        const name = v?.teacherName ?? "";
        const isLate = res?.kind === "entry" && v?.status === "late";
        const isEarly =
          res?.kind === "exit" && !!v?.observation?.includes("Départ anticipé");

        // Message AFFICHÉ (avec symboles, pour l'écran)
        const displayText =
          res?.success === false
            ? res.message
            : `${name ? `${name} — ` : ""}${res.message}`;
        setNotice({ ok: res?.success !== false, text: displayText });

        if (res?.success !== false) {
          setPeriod("day");
          setDayKey(todayKey());
          fetchRecords();

          // Message VOCAL (déjà propre, aucun symbole)
          if (voiceRef.current && v) {
            const t = teachers.find(
              (x: any) => String(x._id ?? x.id) === teacherId,
            );

            let lateMinutes = 0;
            if (isLate && v.arrive) {
              lateMinutes = Math.max(
                0,
                localMinutesOf(v.arrive, ctx.tzOffset) -
                  toMinutes(ctx.config.arrivalTime),
              );
            }

            const voiceText = buildGreeting({
              kind: res.kind,
              name: v.teacherName,
              gender: genderOf(t),
              hour: new Date().getHours(),
              lateMinutes,
              late: isLate,
              early: isEarly,
            });

            talk(voiceText);
          }
        }
      } catch (e) {
        console.error(e);
        setNotice({ ok: false, text: "Erreur lors du pointage." });
      } finally {
        scanBusy.current = false;
        setScanning(false);
        setScanValue("");
        scanRef.current?.focus();
      }
    },
    [ctx, selectedYearId, fetchRecords, teachers, talk],
  );

  const handleRaw = useCallback(
    (raw: string) => {
      setScanValue("");
      const card = parseTeacherCard(raw);
      if (!card.ok) return setNotice({ ok: false, text: card.message });
      if (!teachers.length)
        return setNotice({
          ok: false,
          text: "Liste des enseignants non chargée. Réessayez.",
        });

      const t = findTeacherByCard(teachers, card);
      if (!t)
        return setNotice({
          ok: false,
          text: `Enseignant introuvable (matricule ${card.matricule || "inconnu"}).`,
        });
      pointer(String(t._id ?? t.id), "qr_code");
    },
    [teachers, pointer],
  );

  const submitScan = () => handleRaw(scanValue);

  useEffect(() => {
    if (notice && !notice.ok && !notice.silent && voiceRef.current)
      talk(notice.text);
  }, [notice]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  // -------------------- Actions --------------------
  const handleDelete = async (id: string) => {
    if (
      !(await ask({
        title: "Supprimer cette présence ?",
        confirmLabel: "Supprimer",
        danger: true,
      }))
    )
      return;
    const res = await apiRef.current.attendanceTeacher.deleteAttendance({ id });
    if (res?.success === false)
      return setError(res.message ?? "Suppression impossible");
    fetchRecords();
  };

  const handleDeleteMany = async () => {
    if (!selected.size) return;
    if (
      !(await ask({
        title: `Supprimer ${selected.size} présence(s) ?`,
        message: "Cette action est définitive.",
        confirmLabel: "Supprimer",
        danger: true,
      }))
    )
      return;
    const res = await apiRef.current.attendanceTeacher.deleteManyAttendances({
      ids: [...selected],
    });
    if (res?.success === false)
      return setError(res.message ?? "Suppression impossible");
    setSelected(new Set());
    setSelectMode(false);
    fetchRecords();
  };

  const handleMarkAbsent = async () => {
    if (!selectedYearId || period !== "day") return;
    const has = new Set(records.map((r) => r.teacherId));
    const ids = teacherOptions.map((t) => t.value).filter((id) => !has.has(id));
    if (!ids.length)
      return setNotice({
        ok: true,
        text: "Tous les professeurs ont déjà une ligne.",
      });
    if (
      !(await ask({
        title: `Marquer ${ids.length} absent(s) ?`,
        message: `Professeurs sans pointage le ${formatDateFr(dayKey)}.`,
        confirmLabel: "Marquer absents",
      }))
    )
      return;
    const res = await apiRef.current.attendanceTeacher.markAbsentees({
      yearId: selectedYearId,
      dateKey: dayKey,
      teacherIds: ids,
      tzOffset: tzOffset(),
    });
    if (res?.success === false)
      return setError(res.message ?? "Opération impossible");
    setNotice({ ok: true, text: res.message });
    fetchRecords();
  };

  // -------------------- Impression --------------------
  const handlePrint = async (r: PrintRequest) => {
    try {
      const res = await apiRef.current.attendanceTeacher.getAttendances({
        yearId: selectedYearId ?? undefined,
        teacherId: r.teacherId ?? undefined,
        from: r.from,
        to: r.to,
      });
      if (res?.success === false)
        return setError(res.message ?? "Chargement impossible");

      const opts = {
        group: r.group,
        from: r.from,
        to: r.to,
        yearLabel,
        today,
      };
      const views: AttendanceView[] = res?.data ?? [];
      const base = `presences-${r.group === "teacher" ? "professeurs" : "jours"}-${r.from > "1971" ? `${r.from}_${r.to}` : (yearLabel ?? "annee")}`;
      if (r.action === "pdf")
        await printer.downloadPdf(views, opts, `${base}.pdf`);
      else await printer.print(views, opts, base);
    } catch (e) {
      console.error(e);
      setError("Impossible de préparer l'impression.");
    }
  };

  useEffect(() => {
    if (printer.error) setError(printer.error);
  }, [printer.error]);

  // -------------------- Dérivés --------------------
  const shown = useMemo(
    () =>
      records.filter(
        (r) => !statusFilter || effectiveStatus(r, today) === statusFilter,
      ),
    [records, statusFilter, today],
  );
  const stats = useMemo(() => summarize(records, today), [records, today]);

  const byDay = useMemo(() => {
    const m = new Map<string, AttendanceView[]>();
    for (const r of shown)
      (m.get(r.dateKey) ?? m.set(r.dateKey, []).get(r.dateKey)!).push(r);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
      on ? "bg-[#007AFF] text-white" : "bg-muted text-muted-foreground"
    }`;

  return (
    <div
      className="mx-auto max-w-3xl space-y-4 p-4"
      style={{ fontFamily: FONT }}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-tight text-foreground">
            Présences
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {config
              ? `Arrivée ${config.arrivalTime} · Sortie ${config.departureTime} · Tolérance ${config.lateToleranceMin} min`
              : "Horaires non définis"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            aria-label="Horaires de pointage"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground active:opacity-70"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            aria-label="Imprimer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground active:opacity-70"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            aria-label="Nouvelle présence"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] text-white active:opacity-80"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34C759] text-white">
            <QrCode className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              Pointage
            </p>
            <p className="text-[11.5px] text-muted-foreground">
              1er passage = entrée · 2e passage = sortie
            </p>
          </div>
          {scanning && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={voiceOn ? "Couper la voix" : "Activer la voix"}
            className={`${scanning ? "" : "ml-auto "}flex h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70 ${
              voiceOn ? "text-[#007AFF]" : "text-muted-foreground"
            }`}
          >
            {voiceOn ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            disabled={!configured}
            onClick={() => setCameraOn((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold active:opacity-80 disabled:opacity-40 ${
              cameraOn
                ? "bg-[#FF3B30]/12 text-[#C4261D]"
                : "bg-[#007AFF] text-white"
            }`}
          >
            {cameraOn ? (
              <CameraOff className="h-3.5 w-3.5" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {cameraOn ? "Arrêter" : "Scanner"}
          </button>
        </div>

        {cameraOn && configured && <TeacherQrScanner onDetect={handleRaw} />}

        <input
          ref={scanRef}
          autoFocus
          value={scanValue}
          disabled={!configured}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scanValue && submitScan()}
          placeholder={
            configured
              ? "Lecteur USB : scannez la carte…"
              : "Définissez d'abord les horaires"
          }
          className="mt-3 w-full rounded-xl bg-muted px-3 py-2.5 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-[#34C759]/50 disabled:opacity-50"
        />

        <div className="mt-2 flex gap-2">
          <select
            value={manualTeacher}
            onChange={(e) => setManualTeacher(e.target.value)}
            className={`${selectCls} min-w-0 flex-1`}
          >
            <option value="">Pointer sans QR code…</option>
            {teacherOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!manualTeacher || scanning}
            onClick={() => {
              pointer(manualTeacher, "manual");
              setManualTeacher("");
            }}
            className="rounded-xl bg-[#34C759] px-4 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            Pointer
          </button>
        </div>

        {notice && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] ${
              notice.ok
                ? "bg-[#34C759]/12 text-[#248A3D]"
                : "bg-[#FF3B30]/10 text-[#C4261D]"
            }`}
          >
            {notice.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            className={seg(period === "day")}
            onClick={() => setPeriod("day")}
          >
            Jour
          </button>
          <button
            type="button"
            className={seg(period === "month")}
            onClick={() => setPeriod("month")}
          >
            Mois
          </button>
        </div>
        {period === "day" ? (
          <input
            type="date"
            value={dayKey}
            max={today}
            onChange={(e) => e.target.value && setDayKey(e.target.value)}
            className={selectCls}
          />
        ) : (
          <input
            type="month"
            value={monthKey}
            onChange={(e) => e.target.value && setMonthKey(e.target.value)}
            className={selectCls}
          />
        )}
        <select
          value={selectedYearId ?? ""}
          onChange={(e) => setSelectedYearId(e.target.value || null)}
          className={selectCls}
        >
          <option value="">Année scolaire…</option>
          {yearOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          className={`${selectCls} max-w-[200px]`}
        >
          <option value="">Tous les professeurs</option>
          {teacherOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchRecords}
          aria-label="Rafraîchir"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground active:opacity-70"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(
          [
            ["present", stats.present, "text-[#248A3D]"],
            ["late", stats.late, "text-[#B25E00]"],
            ["absent", stats.absent, "text-[#C4261D]"],
            ["incomplete", stats.incomplete, "text-[#636366]"],
          ] as const
        ).map(([k, n, c]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatusFilter(statusFilter === k ? "" : k)}
            className={`rounded-2xl border p-2.5 text-left transition-colors ${
              statusFilter === k
                ? "border-[#007AFF] bg-[#007AFF]/5"
                : "border-border bg-card"
            }`}
          >
            <span className={`block text-[20px] font-bold leading-none ${c}`}>
              {n}
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {STATUS_LABEL[k]}
            </span>
          </button>
        ))}
        <div className="rounded-2xl border border-border bg-card p-2.5">
          <span className="block text-[15px] font-bold leading-[20px] text-foreground">
            {formatDuration(stats.minutes)}
          </span>
          <span className="text-[10.5px] text-muted-foreground">Heures</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={chip(selectMode)}
          onClick={() => {
            setSelectMode((v) => !v);
            setSelected(new Set());
          }}
        >
          {selectMode ? "Terminer" : "Sélectionner"}
        </button>
        {selectMode && selected.size > 0 && (
          <button
            type="button"
            onClick={handleDeleteMany}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B30] px-3 py-1 text-[12px] font-medium text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Supprimer ({selected.size})
          </button>
        )}
        {period === "day" && !teacherFilter && (
          <button
            type="button"
            onClick={handleMarkAbsent}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-muted-foreground active:opacity-70"
          >
            <UserX className="h-3.5 w-3.5" /> Marquer les absents
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-[#FF3B30]/10 px-3 py-2 text-[12.5px] text-[#C4261D]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Fermer
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : byDay.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-[13px] text-muted-foreground">
          Aucune présence sur cette période.
        </div>
      ) : (
        byDay.map(([dateKey, list]) => (
          <section key={dateKey}>
            {period === "month" && (
              <h2 className="mb-1 px-1 text-[12.5px] font-semibold text-muted-foreground">
                {weekdayOf(dateKey)} {formatDateFr(dateKey)}
              </h2>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {list.map((r) => {
                const st = effectiveStatus(r, today);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                    onClick={() => selectMode && toggle(r.id)}
                  >
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="h-4 w-4 accent-[#007AFF]"
                      />
                    )}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-[13px] font-semibold text-[#007AFF]">
                      {initials(r.teacherName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-foreground">
                        {r.teacherName || "—"}
                      </p>
                      <p className="truncate text-[12px] tabular-nums text-muted-foreground">
                        {st === "absent"
                          ? "Aucun pointage"
                          : `${hhmmLocal(r.arrive)} → ${hhmmLocal(r.sortie)}${r.workedMinutes ? ` · ${formatDuration(r.workedMinutes)}` : ""}`}
                        {r.observation ? ` · ${r.observation}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PILL[st]}`}
                    >
                      {STATUS_LABEL[st]}
                    </span>
                    {!selectMode && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Modifier"
                          onClick={() => {
                            setEditing(r);
                            setFormOpen(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Supprimer"
                          onClick={() => handleDelete(r.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#FF3B30] hover:bg-[#FF3B30]/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {confirmDialog}

      <AttendanceConfigModal
        opened={configOpen || !configured}
        required={!configured}
        initial={config}
        onSave={save}
        onClose={() => setConfigOpen(false)}
      />

      <AttendanceForm
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchRecords}
        editing={editing}
        teachers={teacherOptions}
        yearId={selectedYearId}
        defaultTeacherId={teacherFilter || null}
        defaultDateKey={period === "day" ? dayKey : undefined}
        ctx={ctx}
      />

      <AttendancePrintDialog
        opened={printOpen}
        onClose={() => setPrintOpen(false)}
        onConfirm={handlePrint}
        selectedTeacherId={teacherFilter || null}
        selectedTeacherLabel={
          teacherOptions.find((t) => t.value === teacherFilter)?.label
        }
        busy={printer.busy}
        progress={printer.progress}
      />
    </div>
  );
}
