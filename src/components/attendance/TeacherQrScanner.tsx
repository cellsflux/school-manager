// src/components/attendance/TeacherQrScanner.tsx
// npm i @yudiel/react-qr-scanner   (la caméra exige HTTPS ou localhost)
import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface Props {
  onDetect: (raw: string) => void;
  /** Délai pendant lequel la caméra ignore tout scan après une détection */
  cooldownMs?: number;
}

export function TeacherQrScanner({ onDetect, cooldownMs = 3000 }: Props) {
  const [paused, setPaused] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const last = useRef<{ v: string; t: number } | null>(null);

  const handle = (codes: { rawValue: string }[]) => {
    const raw = codes?.[0]?.rawValue;
    if (!raw) return;
    const now = Date.now();
    // Même carte maintenue devant la caméra : on ne la compte qu'une fois
    if (
      last.current &&
      last.current.v === raw &&
      now - last.current.t < cooldownMs * 2
    )
      return;
    last.current = { v: raw, t: now };
    onDetect(raw);
    setPaused(true);
    setTimeout(() => setPaused(false), cooldownMs);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-black">
      <div className="relative mx-auto aspect-square w-full max-w-xs">
        <Scanner
          paused={paused}
          onScan={handle}
          onError={(e: any) => {
            console.error("Erreur caméra :", e);
            setCamError(
              e?.name === "NotAllowedError"
                ? "Accès à la caméra refusé. Autorisez-le dans le navigateur."
                : "Caméra indisponible.",
            );
          }}
          constraints={{ facingMode: "environment" }}
          components={{ finder: true, torch: true, onOff: false }}
        />
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[13px] font-medium text-white backdrop-blur-sm">
            Carte lue…
          </div>
        )}
      </div>
      {camError && (
        <p className="bg-[#FF3B30]/15 px-3 py-2 text-center text-[12.5px] text-[#FF6B62]">
          {camError}
        </p>
      )}
    </div>
  );
}
