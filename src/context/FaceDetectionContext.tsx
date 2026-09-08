// contexts/FaceDetectionContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { loadFaceModels } from "@/Ai/faceRecognition";

interface FaceDetectionContextType {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  loadModels: () => Promise<void>;
  retry: () => Promise<void>;
}

const FaceDetectionContext = createContext<
  FaceDetectionContextType | undefined
>(undefined);

interface FaceDetectionProviderProps {
  children: ReactNode;
  autoLoad?: boolean;
}

export function FaceDetectionProvider({
  children,
  autoLoad = true,
}: FaceDetectionProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadFaceModels();
      setIsReady(true);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Erreur lors du chargement des modèles faciaux");
      setError(error);
      console.error("Erreur Face API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const retry = async () => {
    if (!isReady) {
      await loadModels();
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadModels();
    }
  }, [autoLoad]);

  const value = {
    isReady,
    isLoading,
    error,
    loadModels,
    retry,
  };

  return (
    <FaceDetectionContext.Provider value={value}>
      {children}
    </FaceDetectionContext.Provider>
  );
}

export function useFaceDetection() {
  const context = useContext(FaceDetectionContext);
  if (context === undefined) {
    throw new Error(
      "useFaceDetection must be used within a FaceDetectionProvider",
    );
  }
  return context;
}

// Composant pour afficher l'état du chargement
export function FaceDetectionLoader({
  children,
  fallback,
  loadingComponent,
  errorComponent,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}) {
  const { isReady, isLoading, error, retry } = useFaceDetection();

  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Chargement des modèles de reconnaissance faciale...
          </p>
        </div>
      )
    );
  }

  if (error) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
          <div className="text-red-500 dark:text-red-400">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {error.message || "Erreur de chargement des modèles faciaux"}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )
    );
  }

  if (!isReady) {
    return fallback || null;
  }

  return <>{children}</>;
}

export default FaceDetectionContext;
