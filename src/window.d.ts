// src/global.d.ts
import type { Api, EventsApi } from "./shared/api.types";

declare global {
  interface Window {
    api: Api;
    events: EventsApi;
  }
}

export {};
