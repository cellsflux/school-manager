// electron/main/utils/deepLinking.ts
import { BrowserWindow, app, ipcMain } from "electron";
import { exchangeCode, type ExchangeResult } from "./oauthClient";

type DeepLinkResult = {
  action: string;
  params: Record<string, any>;
  rawUrl: string;
  success: boolean;
  error?: string;
};

type AuthResult = {
  success: boolean;
  data?: ExchangeResult;
  error?: string;
};

type FileOpenResult = {
  filePath: string;
  success: boolean;
  error?: string;
};

// Extensions de fichiers gérées par l'app (à adapter selon fileAssociations dans package.json)
const SUPPORTED_FILE_EXTENSIONS = [".scx", ""];

let mainWindow: BrowserWindow | null = null;

// Stockage des callbacks
let deepLinkCallbacks: ((data: DeepLinkResult) => void)[] = [];
let fileOpenCallbacks: ((data: FileOpenResult) => void)[] = [];
// Nouveau: callbacks spécifiques au résultat de l'échange PKCE (succès avec
// accessToken/refreshToken/user, ou échec). C'est CE callback-là qu'il faut
// écouter pour récupérer les données utilisateur, plus params.user qui
// n'existe plus dans le nouveau flow.
let authResultCallbacks: ((data: AuthResult) => void)[] = [];

// Sur macOS, "open-url" / "open-file" peuvent être émis AVANT app.whenReady() (cold start).
let pendingUrl: string | null = null;
let pendingFilePath: string | null = null;

// ─────────────────────────────────────────────────────────
// macOS : deep link via URL personnalisée
// ─────────────────────────────────────────────────────────
app.on("open-url", (event, url) => {
  event.preventDefault();
  console.log("🔗 [open-url] Deep link intercepté:", url);

  if (mainWindow) {
    handleIncomingUrl(url);
  } else {
    console.log("⏳ App pas encore prête, mise en attente du deep link.");
    pendingUrl = url;
  }
});

// ─────────────────────────────────────────────────────────
// macOS : ouverture de fichier (double-clic sur un .smproj)
// ─────────────────────────────────────────────────────────
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  console.log("📂 [open-file] Fichier intercepté:", filePath);

  if (mainWindow) {
    const data = handleFileOpen(filePath);
    if (data) {
      focusMainWindow();
      notifyFileOpenCallbacks(data);
    }
  } else {
    console.log("⏳ App pas encore prête, mise en attente du fichier.");
    pendingFilePath = filePath;
  }
});

/**
 * Initialise le module deep link / file open
 */
export function initializeDeepLink(window: BrowserWindow): void {
  mainWindow = window;

  setupDeepLinkListeners();

  // macOS cold start : deep link en attente
  if (pendingUrl) {
    const url = pendingUrl;
    pendingUrl = null;
    handleIncomingUrl(url);
  }

  // macOS cold start : fichier en attente
  if (pendingFilePath) {
    const filePath = pendingFilePath;
    pendingFilePath = null;
    const data = handleFileOpen(filePath);
    if (data) notifyFileOpenCallbacks(data);
  }

  // Windows/Linux cold start : argv (deep link OU fichier)
  processCommandLineArgs();
}

/**
 * Enregistre un callback pour recevoir les deep links "bruts" (parsing
 * uniquement, avant tout échange réseau).
 */
export function onDeepLink(callback: (data: DeepLinkResult) => void): void {
  deepLinkCallbacks.push(callback);
}

export function removeDeepLinkListener(
  callback: (data: DeepLinkResult) => void,
): void {
  deepLinkCallbacks = deepLinkCallbacks.filter((cb) => cb !== callback);
}

/**
 * Enregistre un callback pour recevoir le RÉSULTAT de la connexion, une fois
 * le code PKCE échangé contre accessToken/refreshToken/user. C'est ici qu'il
 * faut récupérer les infos utilisateur, pas dans onDeepLink().
 */
export function onAuthResult(callback: (data: AuthResult) => void): void {
  authResultCallbacks.push(callback);
}

export function removeAuthResultListener(
  callback: (data: AuthResult) => void,
): void {
  authResultCallbacks = authResultCallbacks.filter((cb) => cb !== callback);
}

/**
 * Enregistre un callback pour recevoir les fichiers ouverts
 */
export function onFileOpen(callback: (data: FileOpenResult) => void): void {
  fileOpenCallbacks.push(callback);
}

export function removeFileOpenListener(
  callback: (data: FileOpenResult) => void,
): void {
  fileOpenCallbacks = fileOpenCallbacks.filter((cb) => cb !== callback);
}

/**
 * Configure les écouteurs pour app déjà lancée (Windows/Linux)
 */
function setupDeepLinkListeners(): void {
  app.on("second-instance", (event, argv) => {
    console.log("🔁 [second-instance] argv:", argv);

    focusMainWindow();

    // Deep link ?
    const deepLinkArg = argv.find((arg) => arg.startsWith("scoolmanager://"));
    if (deepLinkArg) {
      console.log("🔗 [second-instance] Deep link intercepté:", deepLinkArg);
      handleIncomingUrl(deepLinkArg);
      return;
    }

    // Sinon, fichier ?
    const fileArg = argv.find((arg) => isSupportedFile(arg));
    if (fileArg) {
      console.log("📂 [second-instance] Fichier intercepté:", fileArg);
      const data = handleFileOpen(fileArg);
      if (data) notifyFileOpenCallbacks(data);
      return;
    }

    console.log("ℹ️ [second-instance] Rien de reconnu dans les arguments.");
  });

  // Deep link demandé explicitement par le renderer
  ipcMain.on("open-deep-link", (event, url: string) => {
    console.log("🔗 [ipc] Deep link demandé par le renderer:", url);
    handleIncomingUrl(url);
  });
}

function focusMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

/**
 * Vérifie si un argument correspond à un fichier supporté
 */
function isSupportedFile(arg: string): boolean {
  return SUPPORTED_FILE_EXTENSIONS.some((ext) => arg.endsWith(ext));
}

/**
 * Point d'entrée unique pour un deep link reçu, quelle que soit la source
 * (open-url, second-instance, ipc, cold start). Sépare le parsing (toujours
 * synchrone, juste des query params) de l'échange réseau (async, uniquement
 * pour action === "auth").
 */
function handleIncomingUrl(url: string): void {
  const data = handleDeepLink(url);
  if (!data) return;

  focusMainWindow();
  notifyDeepLinkCallbacks(data);

  if (
    data.success &&
    data.action === "auth" &&
    typeof data.params.code === "string"
  ) {
    void runAuthExchange(data.params.code, data.params.state);
  }
}

/**
 * Échange le code PKCE reçu contre accessToken/refreshToken/user (voir
 * oauthClient.ts). C'est CETTE étape qui manquait: avant, le code essayait
 * de lire params.user en base64, mais le nouveau flow OAuth (Authorization
 * Code + PKCE) ne transmet plus jamais l'utilisateur dans l'URL — seulement
 * un code à usage unique. Il faut l'échanger explicitement.
 */
async function runAuthExchange(code: string, state?: string): Promise<void> {
  try {
    const result = await exchangeCode(code, state);
    console.log("✅ Connexion réussie, utilisateur:", result.user);
    notifyAuthResultCallbacks({ success: true, data: result });
  } catch (error: any) {
    console.error("❌ Échange du code OAuth échoué:", error);
    notifyAuthResultCallbacks({
      success: false,
      error: error?.message || "Échange du code échoué.",
    });
  }
}

/**
 * Traite un deep link et retourne les données (parsing uniquement, aucun
 * appel réseau ici).
 */
function handleDeepLink(url: string): DeepLinkResult | null {
  console.log("🔗 Deep link reçu:", url);

  try {
    const parsedUrl = new URL(url);
    const action = parsedUrl.hostname || "home";
    const params: Record<string, any> = {};

    parsedUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const result: DeepLinkResult = {
      action,
      params,
      rawUrl: url,
      success: true,
    };

    console.log("📦 Données deep link:", result);
    return result;
  } catch (error: any) {
    console.error("❌ Erreur lors du parsing du deep link:", error);
    return {
      action: "error",
      params: {},
      rawUrl: url,
      success: false,
      error: error.message || "Erreur de parsing",
    };
  }
}

/**
 * Traite l'ouverture d'un fichier et retourne les données
 */
function handleFileOpen(filePath: string): FileOpenResult | null {
  console.log("📂 Fichier reçu:", filePath);

  try {
    if (!isSupportedFile(filePath)) {
      console.warn("⚠️ Extension de fichier non supportée:", filePath);
      return {
        filePath,
        success: false,
        error: "Extension non supportée",
      };
    }

    return {
      filePath,
      success: true,
    };
  } catch (error: any) {
    console.error("❌ Erreur lors du traitement du fichier:", error);
    return {
      filePath,
      success: false,
      error: error.message || "Erreur inconnue",
    };
  }
}

/**
 * Traite les arguments de ligne de commande au cold start (Windows/Linux)
 * Gère à la fois deep link ET fichier.
 */
function processCommandLineArgs(): void {
  const argv = process.argv;

  const deepLinkArg = argv.find((arg) => arg.startsWith("scoolmanager://"));
  if (deepLinkArg) {
    console.log("🔗 [cold start] Deep link trouvé dans argv:", deepLinkArg);
    setTimeout(() => handleIncomingUrl(deepLinkArg), 500);
    return; // on ne traite qu'un seul cas à la fois
  }

  const fileArg = argv.find((arg) => isSupportedFile(arg));
  if (fileArg) {
    console.log("📂 [cold start] Fichier trouvé dans argv:", fileArg);
    setTimeout(() => {
      const data = handleFileOpen(fileArg);
      if (data) notifyFileOpenCallbacks(data);
    }, 500);
  }
}

function notifyDeepLinkCallbacks(data: DeepLinkResult): void {
  deepLinkCallbacks.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error("Erreur dans le callback deep link:", error);
    }
  });
}

function notifyAuthResultCallbacks(data: AuthResult): void {
  authResultCallbacks.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error("Erreur dans le callback auth result:", error);
    }
  });
}

function notifyFileOpenCallbacks(data: FileOpenResult): void {
  fileOpenCallbacks.forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error("Erreur dans le callback file open:", error);
    }
  });
}

/**
 * Ouvre un deep link depuis le renderer (parsing seul, sans échange réseau).
 */
export function openDeepLink(url: string): DeepLinkResult | null {
  return handleDeepLink(url);
}
