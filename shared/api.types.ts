// src/shared/api.types.ts (complète ton fichier existant)
import type { Modules } from "../electron/main/modules";

type AsyncApi<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R extends Promise<infer U> ? U : R>
    : never;
};

export type Api = {
  [K in keyof Modules]: AsyncApi<Modules[K]>;
};

export type DeepLinkData = {
  action: string;
  params: Record<string, any>;
  rawUrl: string;
  success: boolean;
  error?: string;
};

export type EventsApi = {
  on: (
    channel: "deep-link-data",
    callback: (data: DeepLinkData) => void,
  ) => () => void; // renvoie l'unsubscribe
};
