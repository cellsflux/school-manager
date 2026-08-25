// src/theme/useThemeSettings.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { defaultThemeSettings } from "./themeSettings.types";
import type { ThemeSettings } from "./themeSettings.types";
import { themePresets } from "./themePresets";

const STORAGE_KEY = "app-theme-settings";

function loadSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...defaultThemeSettings, ...JSON.parse(raw) }
      : defaultThemeSettings;
  } catch {
    return defaultThemeSettings;
  }
}

export function useThemeSettings() {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sauvegarde en localStorage avec debounce
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, 100);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
      setSettings((s) => {
        const newSettings = {
          ...s,
          [key]: value,
          activePresetId: null,
        };
        return newSettings;
      });
    },
    [],
  );

  // Mise à jour multiple pour les presets
  const updateMultipleSettings = useCallback(
    (newSettings: Partial<ThemeSettings>) => {
      setSettings((s) => ({
        ...s,
        ...newSettings,
        activePresetId: null,
      }));
    },
    [],
  );

  const applyPreset = useCallback((presetId: string) => {
    const preset = themePresets.find((p) => p.id === presetId);
    if (!preset) return;
    setSettings((s) => ({
      ...s,
      ...preset.settings,
      activePresetId: preset.id,
    }));
  }, []);

  const resetSettings = useCallback(
    () => setSettings(defaultThemeSettings),
    [],
  );

  return {
    settings,
    updateSetting,
    updateMultipleSettings,
    applyPreset,
    resetSettings,
  };
}
