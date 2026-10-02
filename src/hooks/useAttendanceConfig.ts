// src/hooks/useAttendanceConfig.ts
import { useCallback, useEffect, useState } from "react";
import { isValidConfig } from "../../shared/type";
import type { AttendanceConfig } from "../../shared/type";

const KEY = "attendance.teacher.config.v1";

export function readAttendanceConfig(): AttendanceConfig | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return isValidConfig(c) ? c : null;
  } catch {
    return null;
  }
}

/** null tant que l'utilisateur n'a pas défini les heures → la page l'exige */
export function useAttendanceConfig() {
  const [config, setConfig] = useState<AttendanceConfig | null>(
    readAttendanceConfig,
  );

  const save = useCallback((c: AttendanceConfig) => {
    if (!isValidConfig(c)) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {
      /* stockage indisponible : la config reste valable pour la session */
    }
    setConfig(c);
    return true;
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setConfig(null);
  }, []);

  // Synchronisation entre onglets
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY) setConfig(readAttendanceConfig());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  return {
    config,
    configured: config !== null,
    save,
    reset,
    tzOffset: () => new Date().getTimezoneOffset(),
  };
}
