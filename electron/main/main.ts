// electron/main/main.ts
import { app, BrowserWindow, Menu, ipcMain, safeStorage } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerModules } from "./ipc/registerModules";
import { AppDatabases } from "../databases/db";
import {
  initializeDeepLink,
  onDeepLink,
  onFileOpen,
  onAuthResult,
} from "./utils/deepLinking";
import { initializeUpdater } from "./utils/updater";
import {
  ensureMacCameraAccess,
  setupCameraPermissions,
} from "./utils/camera.permission";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const PROTOCOL = "scoolmanager";

function registerProtocolHandler(): void {
  if (!app.isPackaged) {
    // Mode dev (electron . / npm run dev) : argv[1] doit être le chemin
    // du projet, PAS une URL. On vérifie que c'est bien le cas avant
    // d'enregistrer, sinon on ignore (évite de corrompre le registre si
    // l'app est relancée via un deep link pendant qu'on est en dev).
    const scriptArg = process.argv[1];
    const looksLikeUrl = scriptArg?.startsWith(`${PROTOCOL}://`);

    if (scriptArg && !looksLikeUrl) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(scriptArg),
      ]);
    }
  } else {
    // Build packagé : process.execPath = ton .exe, pas besoin d'argv custom.
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}
registerProtocolHandler();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("🚪 Une instance existe déjà, fermeture de cette instance.");
  app.quit();
} else {
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      titleBarStyle: "hidden",
      webPreferences: {
        preload: path.join(__dirname, "../preload/preload.mjs"),
        contextIsolation: true,
        nodeIntegration: true,

        //webSecurity: false, // 🔥 Désactiver la sécurité pour les images
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
    }

    return mainWindow;
  }

  app.whenReady().then(async () => {
    AppDatabases();
    Menu.setApplicationMenu(null);
    registerModules();
    createWindow();
    initializeUpdater();
    setupCameraPermissions();
    await ensureMacCameraAccess();

    if (mainWindow) {
      initializeDeepLink(mainWindow);

      onDeepLink((data) => {
        console.log("📨 Deep link reçu dans le main:", data);
        mainWindow?.webContents.send("deep-link-data", data);
      });

      // ✅ nouveau : callback fichier ouvert
      onFileOpen((data) => {
        console.log("📨 Fichier reçu dans le main:", data);
        mainWindow?.webContents.send("file-opened", data);
      });

      // ✅ résultat de la connexion OAuth (une fois le code PKCE échangé
      // contre accessToken/refreshToken/user/etablissement). C'est ICI que
      // tu récupères les données utilisateur ET l'établissement sélectionné
      // sur le web — pas dans onDeepLink, qui ne voit que le `code` brut.
      onAuthResult((result) => {
        if (!result.success || !result.data) {
          console.log(result);
          console.error("❌ Connexion échouée:", result.error);
          mainWindow?.webContents.send("auth:error", result.error);
          return;
        }

        const { accessToken, refreshToken, user, etablissement } = result.data;
        console.log("✅ Utilisateur connecté:", user);
        console.log("🏫 Établissement connecté:", etablissement);

        // Le refresh token est sensible: on le chiffre avant stockage
        // (safeStorage utilise le trousseau macOS / DPAPI Windows / libsecret
        // Linux). Remplace ce bloc par ton propre mécanisme de persistance
        // (ex: AppDatabases()) si tu préfères le garder centralisé là-bas.
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(refreshToken);
          // TODO: persister `encrypted` (buffer) via AppDatabases() ou un
          // fichier dédié dans app.getPath("userData"), avec l'id de
          // l'établissement connecté pour pouvoir gérer plusieurs comptes.
          console.log("🔐 Refresh token chiffré, prêt à être persisté.");
        }

        // L'access token est éphémère (15 min): on le transmet directement
        // au renderer avec l'établissement, pas besoin de les persister ici.
        mainWindow?.webContents.send("auth:success", {
          accessToken,
          user,
          etablissement,
        });
      });
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
