// src/hooks/useFileOpen.ts
import { useEffect, useRef } from "react";

type FileOpenData = {
  filePath: string;
  success: boolean;
  error?: string;
};

export function useFileOpen(onFile: (data: FileOpenData) => void) {
  const savedCallback = useRef(onFile);
  savedCallback.current = onFile;

  useEffect(() => {
    if (!window.events) {
      console.error("window.events non défini.");
      return;
    }

    const unsubscribe = window.events.on("file-opened", (data: any) => {
      savedCallback.current(data);
    });

    return () => unsubscribe();
  }, []);
}

/**
 * utilisation dans un composant
useFileOpen((data) => {
  if (data.success) {
    console.log("Fichier à ouvrir:", data.filePath);
    navigate(`/project?path=${encodeURIComponent(data.filePath)}`);
  } else {
    console.error("Erreur:", data.error);
  }
}); */
