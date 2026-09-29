// src/hooks/useEtablissement.ts
// Retrouve l'établissement : id dans localStorage ("__id_") -> etablissement.getEts(id)
import { useEffect, useRef, useState } from "react";
import { useConnecter } from "@/hooks/useConnecter";

export type Ets = {
  id?: string; name: string; logo: string; slug?: string; type?: string;
  ville?: string; pays?: string; adresse?: string; phone?: string; email?: string; website?: string;
};

export function readEtsId(): string | undefined {
  try {
    const raw = localStorage.getItem("__id_");
    if (!raw) return undefined;
    try { const p = JSON.parse(raw); if (typeof p === "string") return p; } catch {}
    return raw;
  } catch { return undefined; }
}

export function useEtablissement(enabled = true) {
  const { etablissement: EtsApi } = useConnecter() as any;
  const api = useRef(EtsApi);
  api.current = EtsApi;
  const [ets, setEts] = useState<Ets | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res: any = await api.current.getEts(readEtsId());
        const e = res?.etablissement ?? res?.data?.etablissement ?? res?.data;
        const d = e?._doc ?? e;
        if (alive && d) {
          setEts({
            id: d.id ?? (d._id ? String(d._id) : undefined), name: d.name ?? "", logo: d.logo ?? "", slug: d.slug,
            type: d.type ? String(d.type).replace(/_/g, " ") : undefined, ville: d.ville, pays: d.pays,
            adresse: d.adresse_complete, phone: d.phone, email: d.email, website: d.website,
          });
        }
      } catch (err) { console.error("Erreur chargement établissement:", err); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [enabled]);

  return { ets, loading };
}
