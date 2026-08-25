// electron/preload/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type Manifest = Record<string, string[]>;

function buildApi(manifest: Manifest) {
  const api: Record<
    string,
    Record<string, (...args: any[]) => Promise<any>>
  > = {};

  for (const namespace of Object.keys(manifest)) {
    api[namespace] = {};
    for (const methodName of manifest[namespace]) {
      api[namespace][methodName] = (...args: any[]) =>
        ipcRenderer.invoke(`${namespace}:${methodName}`, ...args);
    }
  }

  return api;
}

// Liste blanche des canaux "push" (main -> renderer) autorisés.
// Sécurité : on n'expose jamais ipcRenderer brut, seulement ces canaux précis.
const ALLOWED_EVENT_CHANNELS = [
  "deep-link-data",
  "file-opened",
  "auth:success",
] as const;
type AllowedEventChannel = (typeof ALLOWED_EVENT_CHANNELS)[number];

function on(channel: AllowedEventChannel, callback: (data: any) => void) {
  if (!ALLOWED_EVENT_CHANNELS.includes(channel)) {
    console.warn(`Canal non autorisé: ${channel}`);
    return () => {};
  }

  const listener = (_event: IpcRendererEvent, data: any) => callback(data);
  ipcRenderer.on(channel, listener);

  // Fonction de désabonnement, indispensable pour un cleanup React propre
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

async function init() {
  const manifest: Manifest = await ipcRenderer.invoke("__manifest__");
  contextBridge.exposeInMainWorld("api", buildApi(manifest));
  contextBridge.exposeInMainWorld("events", { on });
}

init();
