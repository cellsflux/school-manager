import { updateElectronApp, UpdateSourceType } from "update-electron-app";

let initialized = false;

export function initializeUpdater() {
  if (initialized) return;

  initialized = true;

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      // Remplace par ton vrai owner/repository
      repo: "cellsflux/school-manager",
    },

    updateInterval: "1 hour",

    logger: console,

    notifyUser: true,
  });
}
