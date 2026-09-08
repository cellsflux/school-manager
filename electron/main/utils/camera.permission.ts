// ---------------------------------------------------------------------------
// À intégrer dans ton process PRINCIPAL Electron (main.ts),
// AVANT la création de la BrowserWindow qui affichera la caméra.
//
// Sans ça, `navigator.mediaDevices.getUserMedia(...)` dans le renderer
// échoue avec NotAllowedError même si l'utilisateur clique "Autoriser" —
// Electron ne montre pas la popup navigateur habituelle, c'est le process
// principal qui décide.
// ---------------------------------------------------------------------------

import { session, systemPreferences } from "electron";

/**
 * Autorise explicitement la permission "media" (caméra + micro) pour toutes
 * les requêtes venant du renderer. À appeler une fois, avant de créer la
 * fenêtre principale.
 */
export function setupCameraPermissions(): void {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      if (permission === "media") {
        callback(true);
        return;
      }
      callback(false);
    },
  );

  // (Optionnel mais recommandé) restreint aussi les vérifications
  // synchrones de permission au même comportement.
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission) => {
      return permission === "media";
    },
  );
}

/**
 * Sur macOS, l'accès caméra est en plus bloqué au niveau OS (TCC) tant que
 * l'utilisateur n'a pas autorisé l'app dans Réglages Système >
 * Confidentialité et sécurité > Caméra. Il faut le demander explicitement au
 * démarrage — sinon Electron renvoie NotAllowedError sans même déclencher la
 * popup système. Ne fait rien sur les autres plateformes (retourne `true`).
 */
export async function ensureMacCameraAccess(): Promise<boolean> {
  if (process.platform !== "darwin") return true;

  const status = systemPreferences.getMediaAccessStatus("camera");
  if (status === "granted") return true;

  // Déclenche la popup système native macOS (une seule fois : macOS retient
  // le choix de l'utilisateur pour les lancements suivants).
  return systemPreferences.askForMediaAccess("camera");
}

// ---------------------------------------------------------------------------
// Exemple d'utilisation dans main.ts :
//
// import { app } from "electron";
// import { setupCameraPermissions, ensureMacCameraAccess } from "./electron-camera-permissions";
//
// app.whenReady().then(async () => {
//   setupCameraPermissions();
//   await ensureMacCameraAccess();
//   createMainWindow();
// });
//
// Rappel packaging macOS : ton Info.plist (via electron-builder / forge)
// doit aussi déclarer :
//   <key>NSCameraUsageDescription</key>
//   <string>Cette application utilise la caméra pour identifier les étudiants.</string>
// Sans cette clé, macOS tue l'app dès l'appel à getUserMedia, sans message clair.
// ---------------------------------------------------------------------------
