// components/ai/StudentFaceIdentifier.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Camera } from "lucide-react";
import MultiFaceIdentifier from "@/components/ai/Facedetecto";
import { useConnecter } from "@/hooks/useConnecter";
import type { StudentFaceProfile } from "@/Ai/faceRecognition";

// ---------------------------------------------------------------------------
// Parse la `description` (string JSON "[..]") en array de 128 nombres.
// ---------------------------------------------------------------------------
function parseDescriptor(raw: unknown): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Props = {
  /** Callback optionnel quand un visage est recroppé. */
  onCropFace?: React.ComponentProps<typeof MultiFaceIdentifier>["onCropFace"];
  /** Seuil de reconnaissance (0-1). Défaut 0.5. */
  threshold?: number;
  /** Nombre max d'étudiants à charger (0 = illimité). Défaut 1000. */
  limit?: number;
  /** Classe Tailwind additionnelle sur le bouton. */
  className?: string;
  /** Titre du bouton (accessibilité). */
  title?: string;
};

/**
 * Bouton caméra style Google Lens.
 * Charge les étudiants et délègue tout à <MultiFaceIdentifier />.
 */
export default function SearcheImage({
  onCropFace,
  threshold = 0.5,
  limit = 1000,
  className = "",
  title = "Rechercher par image",
}: Props) {
  const { Student: StudentApi } = useConnecter();
  const [students, setStudents] = useState<StudentFaceProfile[]>([]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = StudentApi?.getAll
        ? await StudentApi.getAll({ page: 1, limit: limit || 1000, search: "" })
        : await (StudentApi as any).find();

      const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);

      const profiles: StudentFaceProfile[] = list
        .map((s) => {
          const id = s.id ?? s._id?.toString?.() ?? String(s._id ?? "");
          return {
            id,
            matricule: s.matricule ?? "",
            fname: s.fname ?? "",
            lname: s.lname ?? "",
            fm_name: s.fm_name ?? "",
            picture: s.picture ?? "",
            dateOfBirth: s.dateOfBirth,
            placeOfBirth: s.placeOfBirth ?? "",
            nationality: s.nationality ?? "",
            gender: (s.gender ?? "M") as "M" | "F",
            phone: s.phone ?? "",
            address: s.address ?? "",
            dad_name: s.dad_name ?? "",
            mom_name: s.mom_name ?? "",
            responsableName: s.responsableName ?? "",
            responsableRelation: s.responsableRelation ?? "",
            responsablePhone: s.responsablePhone ?? "",
            description: parseDescriptor(s.description),
          } as StudentFaceProfile;
        })
        .filter(
          (p) => Array.isArray(p.description) && p.description.length === 128,
        );

      setStudents(profiles);
    } catch (e) {
      console.error("StudentFaceIdentifier:", e);
      setStudents([]);
    }
  }, [StudentApi, limit]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <MultiFaceIdentifier
      students={students}
      threshold={threshold}
      onCropFace={onCropFace}
      targent_children={
        <button
          type="button"
          title={title}
          aria-label={title}
          className={
            "inline-flex size-3 z-9999 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 " +
            className
          }
        >
          <Camera className="h-5 w-5" />
        </button>
      }
    />
  );
}
