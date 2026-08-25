import type { Api } from "../../shared/api.types";

export function useConnecter(): Api {
  return window.api;
}
