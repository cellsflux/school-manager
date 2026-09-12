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
import { saveSlug, loadSlug } from "./utils/sessionStore";
import { initializeUpdater } from "./utils/updater";
import {
  ensureMacCameraAccess,
  setupCameraPermissions,
} from "./utils/camera.permission";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Un seul établissement connecté par installation. Sert de garde pour ne
// pas rouvrir la base si elle l'est déjà pour ce même slug.
let connectedEtablissementSlug: string | null = null;

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

  /**
   * Ouvre la base locale correspondant au slug (si ce n'est pas déjà fait
   * pour ce même slug) et prévient le renderer que l'app est prête à
   * travailler hors-ligne sur cet établissement.
   */
  async function connectLocalDatabase(slug: string): Promise<void> {
    if (connectedEtablissementSlug === slug) return;

    await AppDatabases({ slug });
    connectedEtablissementSlug = slug;
    console.log(`💾 Base locale connectée pour "${slug}".`);
  }

  app.whenReady().then(async () => {
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

      onFileOpen((data) => {
        console.log("📨 Fichier reçu dans le main:", data);
        mainWindow?.webContents.send("file-opened", data);
      });

      // ✅ résultat de la connexion OAuth (une fois le code PKCE échangé
      // contre accessToken/refreshToken/user/etablissement). C'est ICI que
      // tu récupères les données utilisateur ET l'établissement sélectionné
      // sur le web — pas dans onDeepLink, qui ne voit que le `code` brut.
      onAuthResult(async (result) => {
        if (!result.success || !result.data) {
          console.log(result);
          console.error("❌ Connexion échouée:", result.error);
          mainWindow?.webContents.send("auth:error", result.error);
          return;
        }

        const { accessToken, refreshToken, user, etablissement } = result.data;

        if (!etablissement?.slug) {
          console.error(
            "❌ Établissement reçu sans slug — impossible de connecter la base locale.",
          );
          mainWindow?.webContents.send(
            "auth:error",
            "Établissement invalide (slug manquant).",
          );
          return;
        }

        console.log("✅ Utilisateur connecté:", user);
        console.log("🏫 Établissement connecté:", etablissement);

        try {
          await connectLocalDatabase(etablissement.slug);
        } catch (dbError: any) {
          console.error("❌ Échec de connexion à la base locale:", dbError);
          mainWindow?.webContents.send(
            "auth:error",
            "Impossible de préparer la base de données locale.",
          );
          return;
        }

        // Chaque deep link réécrit le slug: un seul établissement connecté
        // à la fois, le nouveau remplace toujours l'ancien.
        saveSlug(etablissement.slug);

        // Le refresh token est sensible: on le chiffre avant stockage si tu
        // en as besoin plus tard pour des appels réseau authentifiés
        // (sync, etc.) — la restauration au démarrage, elle, ne dépend
        // QUE du slug (voir plus bas), pas de ce token.
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(refreshToken);
          // TODO: persister `encrypted` si besoin d'appels API authentifiés
          // plus tard (ex: sync cloud). Pas nécessaire pour juste rouvrir
          // la base locale au démarrage.
        }

        mainWindow?.webContents.send("auth:success", {
          accessToken,
          user,
          etablissement,
        });
      });

      // Démarrage: pas de réseau ici, juste retrouver le slug déjà connu
      // et rouvrir directement la base locale correspondante — l'app ne
      // reste jamais à attendre un deep link si une connexion a déjà eu
      // lieu par le passé.
      const persistedSlug = loadSlug();
      if (persistedSlug) {
        try {
          await connectLocalDatabase(persistedSlug);
          mainWindow.webContents.send("local-session-restored", {
            etablissementSlug: persistedSlug,
          });
          console.log(
            `🔄 Base locale rouverte directement pour "${persistedSlug}".`,
          );
        } catch (error: any) {
          console.error(
            "❌ Échec d'ouverture de la base locale persistée:",
            error,
          );
        }
      } else {
        console.log(
          "ℹ️ Aucun établissement connu — en attente d'une connexion.",
        );
      }
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
