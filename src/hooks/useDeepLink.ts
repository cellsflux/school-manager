// src/hooks/useDeepLink.ts
import { useEffect, useRef } from "react";
import type { DeepLinkData } from "../../shared/api.types";

export function useDeepLink(onData: (data: DeepLinkData) => void) {
  // évite de recréer le listener à chaque render si onData n'est pas mémoïsé
  const savedCallback = useRef(onData);
  savedCallback.current = onData;

  useEffect(() => {
    const unsubscribe = window.events.on("deep-link-data", (data: any) => {
      savedCallback.current(data);
    });

    return () => unsubscribe();
  }, []);
}
