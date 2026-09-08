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
  initialData?: Partial<StudentFormData>;
  students?: StudentFaceProfile[];
  onSave?: (data: StudentFormData) => void;
  onCancel?: () => void;
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
            // onError={handleFaceError}
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
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StudentFormData>({
    matricule: initialData.matricule || "",
    fname: initialData.fname || "",
    lname: initialData.lname || "",
    fm_name: initialData.fm_name || "",
    picture: initialData.picture || "",
    description: initialData.description || null,
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

  const handleSubmit = () => {
    // Vérifier que la photo et l'empreinte sont présentes
    if (!formData.picture || !formData.description) {
      setSubmitError(
        "Veuillez capturer une photo et enregistrer l'empreinte faciale.",
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

    setSubmitError(null);
    setSubmitSuccess(true);

    console.log("Form data submitted:", formData);
    if (onSave) {
      onSave(formData);
    }

    // Cacher le message de succès après 5 secondes
    setTimeout(() => {
      setSubmitSuccess(false);
    }, 5000);
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
                title="✅ Formulaire soumis avec succès"
                message="Les données ont été enregistrées."
                onClose={() => setSubmitSuccess(false)}
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
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
                currentStep === 0
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-all duration-200"
              >
                Annuler
              </button>
            )}
          </div>

          {isSummaryStep ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              <Check className="w-4 h-4" />
              {initialData.matricule ? "Mettre à jour" : "Envoyer"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 dark:text-white rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
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
