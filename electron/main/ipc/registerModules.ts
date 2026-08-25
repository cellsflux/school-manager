// electron/main/ipc/registerModules.ts
import { ipcMain } from "electron";
import { modules } from "../modules";

export function registerModules() {
  // Enregistre chaque méthode comme handler IPC
  for (const [namespace, methods] of Object.entries(modules)) {
    for (const [methodName, fn] of Object.entries(methods)) {
      ipcMain.handle(`${namespace}:${methodName}`, (_e, ...args) =>
        (fn as Function)(...args),
      );
    }
  }

  // Canal spécial : renvoie la "carte" des modules/méthodes disponibles
  ipcMain.handle("__manifest__", () => {
    const manifest: Record<string, string[]> = {};
    for (const [namespace, methods] of Object.entries(modules)) {
      manifest[namespace] = Object.keys(methods);
    }
    return manifest;
  });
}
