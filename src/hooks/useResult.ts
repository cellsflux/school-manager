// src/hooks/useResultSIgn.ts
import { useEffect, useRef } from "react";

export function useResultSIgn(onData: (data: any) => void) {
  // évite de recréer le listener à chaque render si onData n'est pas mémoïsé
  const savedCallback = useRef(onData);
  savedCallback.current = onData;

  useEffect(() => {
    const unsubscribe = window.events.on("auth:success", (data: any) => {
      savedCallback.current(data);
    });

    return () => unsubscribe();
  }, []);
}
