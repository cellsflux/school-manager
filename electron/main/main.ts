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

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === "development") {
  app.setAsDefaultProtocolClient("scoolmanager", process.execPath, [
    path.resolve(process.argv[1]),
  ]);
} else {
  app.setAsDefaultProtocolClient("scoolmanager");
}

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
        nodeIntegration: false,
      },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
    }

    return mainWindow;
  }

  app.whenReady().then(() => {
    AppDatabases();
    Menu.setApplicationMenu(null);
    registerModules();
    createWindow();
    initializeUpdater();

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

      // ✅ nouveau : résultat de la connexion OAuth (une fois le code PKCE
      // échangé contre accessToken/refreshToken/user). C'est ICI que tu
      // récupères enfin les données utilisateur — pas dans onDeepLink, qui
      // ne voit que le `code` brut.
      onAuthResult((result) => {
        if (!result.success || !result.data) {
          console.log(result);
          console.error("❌ Connexion échouée:", result.error);
          mainWindow?.webContents.send("auth:error", result.error);
          return;
        }
        const { accessToken, refreshToken, user } = result.data;
        console.log("✅ Utilisateur connecté:", user);

        // Le refresh token est sensible: on le chiffre avant stockage
        // (safeStorage utilise le trousseau macOS / DPAPI Windows / libsecret
        // Linux). Remplace ce bloc par ton propre mécanisme de persistance
        // (ex: AppDatabases()) si tu préfères le garder centralisé là-bas.
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(refreshToken);
          // TODO: persister `encrypted` (buffer) via AppDatabases() ou un
          // fichier dédié dans app.getPath("userData").
          console.log("🔐 Refresh token chiffré, prêt à être persisté.");
        }

        // L'access token est éphémère (15 min): on le transmet directement
        // au renderer pour la session en cours, pas besoin de le persister.
        mainWindow?.webContents.send("auth:success", { accessToken, user });
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
