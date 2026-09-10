import React, { useState } from "react";
import {
  User,
  Calendar,
  Phone,
  Users,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Globe,
  Shield,
  Home,
  AlertCircle,
  X,
} from "lucide-react";
import FaceEnrollment from "@/components/ai/faceenrolement";
import type { StudentFaceProfile } from "@/Ai/faceRecognition";
import type { FaceEnrollmentResult } from "@/Ai/faceEnrolement";
import { useConnecter } from "@/hooks/useConnecter";

// Types pour les données du formulaire
interface StudentFormData {
  matricule: string;
  fname: string;
  lname: string;
  fm_name: string;
  picture: string;
  description: number[] | null;
  dateOfBirth: Date | null;
  placeOfBirth: string;
  nationality: string;
  gender: string;
  phone: string;
  address: string;
  dad_name: string;
  mom_name: string;
  responsableName: string;
  responsableRelation: string;
  responsablePhone: string;
}

// Props pour le formulaire
interface AddStudentProps {
  // `description`, quand il vient de l'API (mode édition), arrive comme la
  // String JSON brute stockée en base (schéma: `description: { type: String }`).
  // On accepte donc soit un array déjà parsé, soit cette string brute.
  initialData?: Partial<Omit<StudentFormData, "description">> & {
    description?: number[] | string | null;
  };
  students?: StudentFaceProfile[];
  onSave?: (data: StudentFormData) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

/**
 * Parse en toute sécurité l'empreinte reçue depuis l'API : elle est stockée
 * en base comme une String JSON (schéma Realm : `description: { type: String }`),
 * donc en mode édition `initialData.description` arrive sous cette forme et
 * doit être reconverti en array de 128 nombres avant d'aller dans le state
 * du formulaire (où le reste du composant l'attend en number[]).
 */
function parseStoredDescription(
  raw: number[] | string | null | undefined,
): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    console.warn(
      "⚠️ Impossible de parser l'empreinte faciale existante (description) :",
      raw,
    );
    return null;
  }
}

// Composant d'alerte réutilisable
const Alert: React.FC<{
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}> = ({ type, title, message, onClose, className = "" }) => {
  const styles = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-800 dark:text-emerald-300",
      icon: "text-emerald-500 dark:text-emerald-400",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-300",
      icon: "text-red-500 dark:text-red-400",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-300",
      icon: "text-amber-500 dark:text-amber-400",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400",
    },
  };

  const style = styles[type];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${style.bg} ${style.border} ${className}`}
      role="alert"
    >
      <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.icon}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`text-sm font-semibold ${style.text}`}>{title}</h4>
        )}
        <p className={`text-sm ${style.text} ${title ? "mt-0.5" : ""}`}>
          {message}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${style.text}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Composant d'étape du formulaire
interface StepProps {
  data: StudentFormData;
  updateData: (key: keyof StudentFormData, value: any) => void;
  students?: StudentFaceProfile[];
}

// Étape 1: Identité
const IdentityStep: React.FC<StepProps> = ({
  data,
  updateData,
  students = [],
}) => {
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceSuccess, setFaceSuccess] = useState(false);

  const handleFaceEnrollment = (result: FaceEnrollmentResult) => {
    updateData("picture", result.image);
    updateData("description", result.descriptor);
    setFaceSuccess(true);
    setFaceError(null);
  };

  const handleFaceError = (error: string) => {
    setFaceError(error);
    setFaceSuccess(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <User className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Identité de l'étudiant
        </h3>
      </div>

      {/* Alertes pour la reconnaissance faciale */}
      {faceError && (
        <Alert
          type="error"
          title="Erreur de capture"
          message={faceError}
          onClose={() => setFaceError(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Matricule <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.matricule}
            onChange={(e) => updateData("matricule", e.target.value)}
            placeholder="Ex: STU-2024-001"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Genre <span className="text-destructive">*</span>
          </label>
          <select
            value={data.gender}
            onChange={(e) => updateData("gender", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
          >
            <option value="">Sélectionner</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Nom <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={data.lname}
            onChange={(e) => updateData("lname", e.target.value)}
            placeholder="Dupont"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Postnom <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.fm_name}
            onChange={(e) => updateData("fm_name", e.target.value)}
            placeholder="Kasongo"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-foreground/80">
            Prénom <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={data.fname}
            onChange={(e) => updateData("fname", e.target.value)}
            placeholder="Jean"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Photo <span className="text-destructive">*</span>
        </label>
        <div className="flex items-center gap-6">
          <FaceEnrollment
            students={students}
            value={data.picture ?? null}
            onChange={handleFaceEnrollment}
            onError={handleFaceError}
          />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {data.picture
                ? "✅ Photo capturée et empreinte faciale enregistrée"
                : "Cliquez sur l'avatar pour prendre une photo ou importer un fichier"}
            </p>
            {data.picture && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">
                  Empreinte faciale prête
                </span>
                {data.description && (
                  <span className="text-[10px] text-muted-foreground">
                    ({data.description.length} dimensions)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Étape 2: Naissance & Nationalité
const BirthStep: React.FC<StepProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Calendar className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Naissance & Nationalité
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Date de naissance <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={
              data.dateOfBirth
                ? new Date(data.dateOfBirth).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              updateData(
                "dateOfBirth",
                e.target.value ? new Date(e.target.value) : null,
              )
            }
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Lieu de naissance <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={data.placeOfBirth}
              onChange={(e) => updateData("placeOfBirth", e.target.value)}
              placeholder="Ville de naissance"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Nationalité{" "}
            <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={data.nationality}
              onChange={(e) => updateData("nationality", e.target.value)}
              placeholder="Nationalité"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Étape 3: Contact
const ContactStep: React.FC<StepProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Phone className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Coordonnées</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Téléphone <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateData("phone", e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Adresse <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={data.address}
              onChange={(e) => updateData("address", e.target.value)}
              placeholder="Adresse complète"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Étape 4: Parents
const ParentsStep: React.FC<StepProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Parents</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Nom du père{" "}
            <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.dad_name}
            onChange={(e) => updateData("dad_name", e.target.value)}
            placeholder="Nom complet du père"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Nom de la mère{" "}
            <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.mom_name}
            onChange={(e) => updateData("mom_name", e.target.value)}
            placeholder="Nom complet de la mère"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
};

// Étape 5: Responsable légal
const LegalStep: React.FC<StepProps> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Shield className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Responsable légal
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Nom du responsable{" "}
            <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.responsableName}
            onChange={(e) => updateData("responsableName", e.target.value)}
            placeholder="Nom complet du responsable"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/80">
            Relation <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <input
            type="text"
            value={data.responsableRelation}
            onChange={(e) => updateData("responsableRelation", e.target.value)}
            placeholder="Père, Mère, Tuteur..."
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-foreground/80">
            Téléphone du responsable{" "}
            <span className="text-muted-foreground">(optionnel)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={data.responsablePhone}
              onChange={(e) => updateData("responsablePhone", e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Étape de résumé
const SummaryStep: React.FC<{ data: StudentFormData }> = ({ data }) => {
  const hasFace = data.picture && data.description;
  const missingFields = [];

  if (!data.fname) missingFields.push("Prénom");
  if (!data.lname) missingFields.push("Nom");
  if (!data.dateOfBirth) missingFields.push("Date de naissance");
  if (!data.placeOfBirth) missingFields.push("Lieu de naissance");
  if (!data.gender) missingFields.push("Genre");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Récapitulatif</h3>
      </div>

      {/* Alertes de validation */}
      {!hasFace && (
        <Alert
          type="error"
          title="⚠️ Photo manquante"
          message="Veuillez capturer une photo et enregistrer l'empreinte faciale avant de soumettre."
        />
      )}

      {missingFields.length > 0 && (
        <Alert
          type="warning"
          title="Champs obligatoires manquants"
          message={`Les champs suivants sont requis : ${missingFields.join(", ")}`}
        />
      )}

      {hasFace && missingFields.length === 0 && (
        <Alert
          type="success"
          title="✅ Tous les champs sont remplis"
          message="Vous pouvez soumettre le formulaire."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-background/50">
        {[
          { label: "Matricule", value: data.matricule || "Non renseigné" },
          { label: "Prénom", value: data.fname || "Non renseigné" },
          { label: "Nom", value: data.lname || "Non renseigné" },
          { label: "Postnom", value: data.fm_name || "Non renseigné" },
          {
            label: "Photo",
            value: data.picture ? (
              <img
                src={data.picture}
                alt="Photo"
                className="h-12 w-12 rounded-full object-cover border border-border"
              />
            ) : (
              "Non renseignée"
            ),
          },
          {
            label: "Empreinte faciale",
            value: data.description ? (
              <span className="text-primary font-medium">
                ✅ Enregistrée ({data.description.length} dimensions)
              </span>
            ) : (
              "Non enregistrée"
            ),
          },
          {
            label: "Date de naissance",
            value: data.dateOfBirth
              ? new Date(data.dateOfBirth).toLocaleDateString()
              : "Non renseigné",
          },
          {
            label: "Lieu de naissance",
            value: data.placeOfBirth || "Non renseigné",
          },
          { label: "Nationalité", value: data.nationality || "Non renseigné" },
          {
            label: "Genre",
            value:
              data.gender === "M"
                ? "Masculin"
                : data.gender === "F"
                  ? "Féminin"
                  : "Non renseigné",
          },
          { label: "Téléphone", value: data.phone || "Non renseigné" },
          { label: "Adresse", value: data.address || "Non renseigné" },
          { label: "Père", value: data.dad_name || "Non renseigné" },
          { label: "Mère", value: data.mom_name || "Non renseigné" },
          {
            label: "Responsable",
            value: data.responsableName || "Non renseigné",
          },
          {
            label: "Relation",
            value: data.responsableRelation || "Non renseigné",
          },
          {
            label: "Téléphone responsable",
            value: data.responsablePhone || "Non renseigné",
          },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col p-2 rounded-md bg-background/50 border border-border/50"
          >
            <span className="text-xs text-muted-foreground font-medium">
              {item.label}
            </span>
            <span className="text-sm text-foreground mt-0.5">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant principal du formulaire multi-étapes
export const AddStudent: React.FC<AddStudentProps> = ({
  initialData = {},
  students = [],
  onSave,
  onCancel,
  onSuccess,
}) => {
  const { Student } = useConnecter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StudentFormData>({
    matricule: initialData.matricule || "",
    fname: initialData.fname || "",
    lname: initialData.lname || "",
    fm_name: initialData.fm_name || "",
    picture: initialData.picture || "",
    description: parseStoredDescription(initialData.description),
    dateOfBirth: initialData.dateOfBirth || null,
    placeOfBirth: initialData.placeOfBirth || "",
    nationality: initialData.nationality || "",
    gender: initialData.gender || "",
    phone: initialData.phone || "",
    address: initialData.address || "",
    dad_name: initialData.dad_name || "",
    mom_name: initialData.mom_name || "",
    responsableName: initialData.responsableName || "",
    responsableRelation: initialData.responsableRelation || "",
    responsablePhone: initialData.responsablePhone || "",
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const steps = [
    { title: "Identité", icon: User, component: IdentityStep },
    { title: "Naissance", icon: Calendar, component: BirthStep },
    { title: "Contact", icon: Phone, component: ContactStep },
    { title: "Parents", icon: Users, component: ParentsStep },
    { title: "Responsable", icon: Shield, component: LegalStep },
    { title: "Résumé", icon: FileText, component: SummaryStep },
  ];

  const updateData = (key: keyof StudentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      matricule: "",
      fname: "",
      lname: "",
      fm_name: "",
      picture: "",
      description: null,
      dateOfBirth: null,
      placeOfBirth: "",
      nationality: "",
      gender: "",
      phone: "",
      address: "",
      dad_name: "",
      mom_name: "",
      responsableName: "",
      responsableRelation: "",
      responsablePhone: "",
    });
    setCurrentStep(0);
    setSubmitError(null);
  };

  const handleNext = () => {
    // Vérifier les champs obligatoires avant de passer à l'étape suivante
    if (currentStep === 0) {
      if (!formData.fname || !formData.lname) {
        setSubmitError("Le prénom et le nom sont obligatoires.");
        return;
      }
      if (!formData.gender) {
        setSubmitError("Veuillez sélectionner le genre.");
        return;
      }
      if (!formData.picture || !formData.description) {
        setSubmitError(
          "Veuillez capturer une photo et enregistrer l'empreinte faciale.",
        );
        return;
      }
    }

    if (currentStep === 1) {
      if (!formData.dateOfBirth || !formData.placeOfBirth) {
        setSubmitError("La date et le lieu de naissance sont obligatoires.");
        return;
      }
    }

    setSubmitError(null);
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setSubmitError(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Vérifier que la photo et l'empreinte sont présentes
    if (!formData.picture || !formData.description) {
      setSubmitError(
        "Veuillez capturer une photo et enregistrer l'empreinte faciale.",
      );
      return;
    }

    // CORRECTIF : garde-fou supplémentaire — s'assure que l'empreinte a
    // bien la forme attendue (128 nombres) avant même d'appeler l'API,
    // pour ne plus jamais enregistrer un étudiant avec une empreinte vide.
    if (
      !Array.isArray(formData.description) ||
      formData.description.length !== 128
    ) {
      setSubmitError(
        "L'empreinte faciale semble invalide (relance la capture de la photo avant de soumettre).",
      );
      return;
    }

    // Vérifier les champs obligatoires
    const required = [
      { key: "fname", label: "Prénom" },
      { key: "lname", label: "Nom" },
      { key: "gender", label: "Genre" },
      { key: "dateOfBirth", label: "Date de naissance" },
      { key: "placeOfBirth", label: "Lieu de naissance" },
    ];

    const missing = required.filter(
      (f) => !formData[f.key as keyof StudentFormData],
    );

    if (missing.length > 0) {
      setSubmitError(
        `Champs obligatoires manquants : ${missing.map((m) => m.label).join(", ")}`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Récupérer l'ID de l'établissement depuis le localStorage
      const etablissementId = localStorage.getItem("__id_");

      if (!etablissementId) {
        setSubmitError(
          "ID de l'établissement non trouvé. Veuillez vous reconnecter.",
        );
        setIsSubmitting(false);
        return;
      }

      // Préparer les données pour l'API
      //
      // CORRECTIF (bug "toujours Inconnu") : `description` (l'empreinte
      // faciale, 128 nombres) était calculée et stockée dans le state du
      // formulaire via handleFaceEnrollment(), mais n'était JAMAIS incluse
      // dans ce payload envoyé à Student.create(). Le schéma appliquait
      // donc sa valeur par défaut, et aucune comparaison faciale ne pouvait
      // plus jamais matcher cet étudiant, y compris sur sa propre photo
      // d'enrôlement.
      //
      // IMPORTANT : le champ `description` du schéma Realm/Mongoose est de
      // type String (pas un array de nombres) :
      //   description: { type: String }
      // Il FAUT donc le sérialiser en JSON avant de l'envoyer, sinon l'ORM
      // le convertit en la string "0.12,-0.03,..." (via toString() implicite
      // sur l'array) ou rejette la valeur selon l'implémentation — dans les
      // deux cas, illisible tel quel par JSON.parse() à la relecture.
      const studentData = {
        fname: formData.fname,
        lname: formData.lname,
        fm_name: formData.fm_name || "",
        picture: formData.picture,
        description: JSON.stringify(formData.description), // <-- stringify obligatoire (schéma = String)
        dateOfBirth: formData.dateOfBirth,
        placeOfBirth: formData.placeOfBirth,
        nationality: formData.nationality || "",
        gender: formData.gender,
        phone: formData.phone || "",
        address: formData.address || "",
        dad_name: formData.dad_name || "",
        mom_name: formData.mom_name || "",
        responsableName: formData.responsableName || "",
        responsablePhone: formData.responsablePhone || "",
        responsableRelation: formData.responsableRelation || "",
      };

      // Appeler l'API pour créer l'étudiant
      const result = await Student.create({
        student: studentData,
        etablissementId: etablissementId,
      });

      if (result.success) {
        setSubmitSuccess(true);
        setSuccessMessage(
          result.message || "Étudiant enregistré avec succès !",
        );

        // Appeler le callback onSave si fourni
        if (onSave) {
          onSave(formData);
        }

        // Appeler le callback onSuccess si fourni
        if (onSuccess) {
          onSuccess();
        }

        // Réinitialiser le formulaire après 2 secondes
        setTimeout(() => {
          resetForm();
          setSubmitSuccess(false);
          setSuccessMessage("");
        }, 2000);
      } else {
        setSubmitError(result.message || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setSubmitError("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const isSummaryStep = currentStep === steps.length - 1;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
      <div className="bg-card border border-border/50 rounded-2xl shadow-xs overflow-hidden">
        {/* Header avec progression */}
        <div className="p-6 border-b border-border bg-background/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {initialData.matricule
                ? "Modifier l'étudiant"
                : "Inscription étudiant"}
            </h2>
            <span className="text-sm text-muted-foreground">
              Étape {currentStep + 1} / {steps.length}
            </span>
          </div>

          {/* Barre de progression */}
          <div className="flex gap-2">
            {steps.map((step, index) => {
              const isActive = index <= currentStep;
              return (
                <div
                  key={index}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    isActive ? "bg-primary" : "bg-border"
                  }`}
                />
              );
            })}
          </div>

          {/* Indicateur d'étape actuelle */}
          <div className="flex items-center gap-2 mt-3">
            <div className="p-1.5 rounded-full bg-primary/10 text-primary">
              {React.createElement(steps[currentStep].icon, {
                className: "w-4 h-4",
              })}
            </div>
            <span className="text-sm font-medium text-foreground">
              {steps[currentStep].title}
            </span>
          </div>
        </div>

        {/* Contenu du formulaire */}
        <div className="p-6">
          {/* Alertes d'erreur globales */}
          {submitError && (
            <div className="mb-4">
              <Alert
                type="error"
                title="Erreur de validation"
                message={submitError}
                onClose={() => setSubmitError(null)}
              />
            </div>
          )}

          {submitSuccess && (
            <div className="mb-4">
              <Alert
                type="success"
                title="✅ Enregistrement réussi"
                message={
                  successMessage || "L'étudiant a été enregistré avec succès !"
                }
                onClose={() => {
                  setSubmitSuccess(false);
                  setSuccessMessage("");
                }}
              />
            </div>
          )}

          <div className="min-h-75">
            {isSummaryStep ? (
              <SummaryStep data={formData} />
            ) : (
              <CurrentStepComponent
                data={formData}
                updateData={updateData}
                students={students}
              />
            )}
          </div>
        </div>

        {/* Pied de page avec boutons */}
        <div className="p-6 border-t border-border bg-background/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                currentStep === 0 || isSubmitting
                  ? "border-border text-muted-foreground cursor-not-allowed opacity-50"
                  : "border-border text-foreground hover:bg-primary/5 hover:border-primary/30"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-all duration-200"
              >
                Annuler
              </button>
            )}
          </div>

          {isSummaryStep ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {initialData.matricule ? "Mettre à jour" : "Envoyer"}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 dark:text-white rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudent;
