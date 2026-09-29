// AddTeacher.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Calendar,
  Phone,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Globe,
  Home,
  AlertCircle,
  X,
  FileText,
  GraduationCap,
  Briefcase,
  Languages,
  Layers,
} from "lucide-react";
import { useConnecter } from "@/hooks/useConnecter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TeacherFormData {
  matricule: string;
  fname: string;
  lname: string;
  fm_name: string;
  picture: string;
  dateOfBirth: Date | null;
  placeOfBirth: string;
  nationality: string;
  gender: string;
  phone: string;
  phone2: string;
  email: string;
  address: string;
  section: string; // 👈 id de la section (string) dans le state
  grade: string;
  specialite: string;
  skills: { details?: string }[];
  experiences: {
    company?: string;
    domaine?: string;
    debut?: Date | string;
    dateFin?: Date | string;
  }[];
  langues: { name?: string; level?: string }[];
}

interface AddTeacherProps {
  initialData?: Partial<TeacherFormData> & { _id?: string };
  onSave?: (data: TeacherFormData) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

interface SectionOption {
  _id: string;
  name: string;
  logo?: string;
}

function buildFormData(raw: any): TeacherFormData {
  return {
    matricule: raw?.matricule || "",
    fname: raw?.fname || "",
    lname: raw?.lname || "",
    fm_name: raw?.fm_name || "",
    picture: raw?.picture || "",
    dateOfBirth: raw?.dateOfBirth ? new Date(raw.dateOfBirth) : null,
    placeOfBirth: raw?.placeOfBirth || "",
    nationality: raw?.nationality || "",
    gender: raw?.gender || "",
    phone: raw?.phone || "",
    phone2: raw?.phone2 || "",
    email: raw?.email || "",
    address: raw?.address || "",
    // section peut être un id (string) OU un doc populé ({ _id, name, ... })
    section:
      typeof raw?.section === "string"
        ? raw.section
        : (raw?.section?._id ?? ""),
    grade: raw?.grade || "",
    specialite: raw?.specialite || "",
    skills: raw?.skills ?? [],
    experiences: raw?.experiences ?? [],
    langues: raw?.langues ?? [],
  };
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------
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
  const s = styles[type];
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${s.bg} ${s.border} ${className}`}
      role="alert"
    >
      <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`text-sm font-semibold ${s.text}`}>{title}</h4>
        )}
        <p className={`text-sm ${s.text} ${title ? "mt-0.5" : ""}`}>
          {message}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 ${s.text}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Steps — props enrichies pour passer les sections
// ---------------------------------------------------------------------------
interface StepProps {
  data: TeacherFormData;
  updateData: (key: keyof TeacherFormData, value: any) => void;
  sections?: SectionOption[];
}

const IdentityStep: React.FC<StepProps> = ({
  data,
  updateData,
  sections = [],
}) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <User className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-medium text-foreground">
        Identité de l'enseignant
      </h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Matricule <span className="text-muted-foreground">(optionnel)</span>
        </label>
        <input
          type="text"
          value={data.matricule}
          onChange={(e) => updateData("matricule", e.target.value)}
          placeholder="Ex: ENS-2024-001"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Genre <span className="text-destructive">*</span>
        </label>
        <select
          value={data.gender}
          onChange={(e) => updateData("gender", e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
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
          value={data.fname}
          onChange={(e) => updateData("fname", e.target.value)}
          placeholder="Dupont"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground/80">
          Prénom <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={data.lname}
          onChange={(e) => updateData("lname", e.target.value)}
          placeholder="Jean"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* 👇 Sélecteur de section */}
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Section
        </label>
        <select
          value={data.section}
          onChange={(e) => updateData("section", e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
        >
          <option value="">— Aucune —</option>
          {sections.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
        {sections.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Aucune section disponible pour le moment.
          </p>
        )}
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground/80">
          Photo (URL ou upload)
        </label>
        <div className="flex items-center gap-4">
          {data.picture ? (
            <img
              src={data.picture}
              alt="Photo"
              className="h-16 w-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
              Aucune
            </div>
          )}
          <input
            type="text"
            value={data.picture}
            onChange={(e) => updateData("picture", e.target.value)}
            placeholder="https://… ou data:image/…"
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  </div>
);

const BirthStep: React.FC<StepProps> = ({ data, updateData }) => (
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
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Nationalité
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={data.nationality}
            onChange={(e) => updateData("nationality", e.target.value)}
            placeholder="Nationalité"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  </div>
);

const ContactStep: React.FC<StepProps> = ({ data, updateData }) => (
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
          Téléphone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => updateData("phone", e.target.value)}
            placeholder="+225 07 00 00 00 00"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Téléphone 2
        </label>
        <input
          type="tel"
          value={data.phone2}
          onChange={(e) => updateData("phone2", e.target.value)}
          placeholder="Optionnel"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Email</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => updateData("email", e.target.value)}
          placeholder="email@exemple.com"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Adresse
        </label>
        <div className="relative">
          <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={data.address}
            onChange={(e) => updateData("address", e.target.value)}
            placeholder="Adresse complète"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  </div>
);

const ProfessionalStep: React.FC<StepProps> = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <GraduationCap className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-medium text-foreground">
        Informations professionnelles
      </h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">Grade</label>
        <input
          type="text"
          value={data.grade}
          onChange={(e) => updateData("grade", e.target.value)}
          placeholder="Ex: Professeur certifié"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/80">
          Spécialité
        </label>
        <input
          type="text"
          value={data.specialite}
          onChange={(e) => updateData("specialite", e.target.value)}
          placeholder="Ex: Mathématiques"
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    </div>

    {/* Skills */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Compétences
        </label>
        <button
          type="button"
          onClick={() =>
            updateData("skills", [...data.skills, { details: "" }])
          }
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-primary/5"
        >
          + Ajouter
        </button>
      </div>
      {data.skills.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={s.details ?? ""}
            placeholder="Compétence"
            onChange={(e) => {
              const copy = [...data.skills];
              copy[i] = { ...copy[i], details: e.target.value };
              updateData("skills", copy);
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <button
            type="button"
            onClick={() =>
              updateData(
                "skills",
                data.skills.filter((_, idx) => idx !== i),
              )
            }
            className="px-3 rounded-lg border border-border text-red-500 hover:bg-red-50"
          >
            ×
          </button>
        </div>
      ))}
    </div>

    {/* Langues */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
          <Languages className="w-4 h-4" /> Langues
        </label>
        <button
          type="button"
          onClick={() =>
            updateData("langues", [...data.langues, { name: "", level: "" }])
          }
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-primary/5"
        >
          + Ajouter
        </button>
      </div>
      {data.langues.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="text"
            value={l.name ?? ""}
            placeholder="Langue"
            onChange={(e) => {
              const copy = [...data.langues];
              copy[i] = { ...copy[i], name: e.target.value };
              updateData("langues", copy);
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <input
            type="text"
            value={l.level ?? ""}
            placeholder="Niveau"
            onChange={(e) => {
              const copy = [...data.langues];
              copy[i] = { ...copy[i], level: e.target.value };
              updateData("langues", copy);
            }}
            className="w-32 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <button
            type="button"
            onClick={() =>
              updateData(
                "langues",
                data.langues.filter((_, idx) => idx !== i),
              )
            }
            className="px-3 rounded-lg border border-border text-red-500 hover:bg-red-50"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ExperiencesStep: React.FC<StepProps> = ({ data, updateData }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Briefcase className="w-5 h-5" />
      </div>
      <h3 className="text-lg font-medium text-foreground">
        Expériences professionnelles
      </h3>
    </div>

    <button
      type="button"
      onClick={() =>
        updateData("experiences", [
          ...data.experiences,
          { company: "", domaine: "", debut: "", dateFin: "" },
        ])
      }
      className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-primary/5"
    >
      + Ajouter une expérience
    </button>

    {data.experiences.map((exp, i) => (
      <div key={i} className="p-4 rounded-lg border border-border space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Expérience #{i + 1}</span>
          <button
            type="button"
            onClick={() =>
              updateData(
                "experiences",
                data.experiences.filter((_, idx) => idx !== i),
              )
            }
            className="text-red-500 hover:bg-red-50 px-2 rounded"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={exp.company ?? ""}
            placeholder="Entreprise / Établissement"
            onChange={(e) => {
              const copy = [...data.experiences];
              copy[i] = { ...copy[i], company: e.target.value };
              updateData("experiences", copy);
            }}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <input
            type="text"
            value={exp.domaine ?? ""}
            placeholder="Domaine"
            onChange={(e) => {
              const copy = [...data.experiences];
              copy[i] = { ...copy[i], domaine: e.target.value };
              updateData("experiences", copy);
            }}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <input
            type="date"
            value={
              exp.debut ? new Date(exp.debut).toISOString().split("T")[0] : ""
            }
            onChange={(e) => {
              const copy = [...data.experiences];
              copy[i] = { ...copy[i], debut: e.target.value };
              updateData("experiences", copy);
            }}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          <input
            type="date"
            value={
              exp.dateFin
                ? new Date(exp.dateFin).toISOString().split("T")[0]
                : ""
            }
            onChange={(e) => {
              const copy = [...data.experiences];
              copy[i] = { ...copy[i], dateFin: e.target.value };
              updateData("experiences", copy);
            }}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>
      </div>
    ))}
  </div>
);

const SummaryStep: React.FC<{
  data: TeacherFormData;
  sections: SectionOption[];
}> = ({ data, sections }) => {
  const missingFields: string[] = [];
  if (!data.fname) missingFields.push("Prénom");
  if (!data.lname) missingFields.push("Nom");
  if (!data.dateOfBirth) missingFields.push("Date de naissance");
  if (!data.placeOfBirth) missingFields.push("Lieu de naissance");
  if (!data.gender) missingFields.push("Genre");

  const sectionName = data.section
    ? (sections.find((s) => s._id === data.section)?.name ?? data.section)
    : "Non renseignée";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Récapitulatif</h3>
      </div>

      {missingFields.length > 0 && (
        <Alert
          type="warning"
          title="Champs obligatoires manquants"
          message={`Les champs suivants sont requis : ${missingFields.join(", ")}`}
        />
      )}
      {missingFields.length === 0 && (
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
          { label: "Section", value: sectionName },
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
          { label: "Téléphone 2", value: data.phone2 || "Non renseigné" },
          { label: "Email", value: data.email || "Non renseigné" },
          { label: "Adresse", value: data.address || "Non renseigné" },
          { label: "Grade", value: data.grade || "Non renseigné" },
          { label: "Spécialité", value: data.specialite || "Non renseigné" },
          {
            label: "Compétences",
            value: data.skills.length
              ? `${data.skills.length} entrée(s)`
              : "Aucune",
          },
          {
            label: "Langues",
            value: data.langues.length
              ? `${data.langues.length} langue(s)`
              : "Aucune",
          },
          {
            label: "Expériences",
            value: data.experiences.length
              ? `${data.experiences.length} expérience(s)`
              : "Aucune",
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

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export const AddTeacher: React.FC<AddTeacherProps> = ({
  initialData,
  onSave,
  onCancel,
  onSuccess,
}) => {
  const { Teacher, section } = useConnecter();
  const location = useLocation();
  const navigate = useNavigate();

  const routerTeacher = (location.state as { teacher?: any } | null)?.teacher;
  const mergedInitialData = initialData ?? routerTeacher ?? {};
  const isEditMode = Boolean(mergedInitialData?._id);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TeacherFormData>(() =>
    buildFormData(mergedInitialData),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // 👇 Sections chargées depuis l'API
  const [sections, setSections] = useState<SectionOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await section.find();
        if (!cancelled && res?.success) {
          const list = (res.data ?? []).map((s: any) => ({
            _id: s._id?.toString?.() ?? s.id ?? String(s._id),
            name: s.name,
            logo: s.logo,
          }));
          setSections(list);
        }
      } catch (error) {
        console.error("Erreur chargement sections:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    if (!mergedInitialData) return;
    setFormData(buildFormData(mergedInitialData));
    setCurrentStep(0);
    setSubmitError(null);
    setSubmitSuccess(false);
    setSuccessMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedInitialData?._id]);

  const steps = [
    { title: "Identité", icon: User, component: IdentityStep },
    { title: "Naissance", icon: Calendar, component: BirthStep },
    { title: "Contact", icon: Phone, component: ContactStep },
    {
      title: "Professionnel",
      icon: GraduationCap,
      component: ProfessionalStep,
    },
    { title: "Expériences", icon: Briefcase, component: ExperiencesStep },
    { title: "Résumé", icon: FileText, component: SummaryStep },
  ];

  const updateData = (key: keyof TeacherFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData(buildFormData({}));
    setCurrentStep(0);
    setSubmitError(null);
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!formData.fname || !formData.lname) {
        setSubmitError("Le prénom et le nom sont obligatoires.");
        return;
      }
      if (!formData.gender) {
        setSubmitError("Veuillez sélectionner le genre.");
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
    if (currentStep < steps.length - 1) setCurrentStep((p) => p + 1);
  };

  const handlePrevious = () => {
    setSubmitError(null);
    if (currentStep > 0) setCurrentStep((p) => p - 1);
  };

  const handleSubmit = async () => {
    const required = [
      { key: "fname", label: "Prénom" },
      { key: "lname", label: "Nom" },
      { key: "gender", label: "Genre" },
      { key: "dateOfBirth", label: "Date de naissance" },
      { key: "placeOfBirth", label: "Lieu de naissance" },
    ];
    const missing = required.filter(
      (f) => !formData[f.key as keyof TeacherFormData],
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
      const etablissementId = localStorage.getItem("__id_");
      if (!etablissementId) {
        setSubmitError(
          "ID de l'établissement non trouvé. Veuillez vous reconnecter.",
        );
        setIsSubmitting(false);
        return;
      }

      const teacherData = {
        fname: formData.fname,
        lname: formData.lname,
        fm_name: formData.fm_name || "",
        picture: formData.picture || "",
        dateOfBirth: formData.dateOfBirth,
        placeOfBirth: formData.placeOfBirth,
        nationality: formData.nationality || "",
        gender: formData.gender,
        phone: formData.phone || "",
        phone2: formData.phone2 || "",
        email: formData.email || "",
        address: formData.address || "",
        // 👇 envoyer l'id de section (ou undefined si vide)
        section: formData.section || undefined,
        grade: formData.grade || "",
        specialite: formData.specialite || "",
        skills: formData.skills || [],
        experiences: formData.experiences || [],
        langues: formData.langues || [],
      };

      let result;
      if (isEditMode && mergedInitialData._id) {
        result = await Teacher.update({
          id: mergedInitialData._id,
          teacherData: teacherData as any,
        });
        navigate(-1);
      } else {
        result = await Teacher.create({
          teacher: teacherData as any,
          etablissementId,
        });
        navigate("/teachers");
      }

      if (result.success) {
        setSubmitSuccess(true);
        setSuccessMessage(
          result.message ||
            (isEditMode
              ? "Enseignant mis à jour avec succès !"
              : "Enseignant enregistré avec succès !"),
        );
        if (onSave) onSave(formData);
        if (onSuccess) onSuccess();
        if (!isEditMode) {
          setTimeout(() => {
            resetForm();
            setSubmitSuccess(false);
            setSuccessMessage("");
          }, 2000);
        }
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
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-card border border-border/50 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border bg-background/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {isEditMode ? "Modifier l'enseignant" : "Inscription enseignant"}
            </h2>
            <span className="text-sm text-muted-foreground">
              Étape {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  index <= currentStep ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
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

        <div className="p-6">
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
                  successMessage ||
                  "L'enseignant a été enregistré avec succès !"
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
              <SummaryStep data={formData} sections={sections} />
            ) : (
              <CurrentStepComponent
                data={formData}
                updateData={updateData}
                sections={sections}
              />
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border bg-background/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                currentStep === 0 || isSubmitting
                  ? "border-border text-muted-foreground cursor-not-allowed opacity-50"
                  : "border-border text-foreground hover:bg-primary/5 hover:border-primary/30"
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50"
              >
                Annuler
              </button>
            )}
          </div>

          {isSummaryStep ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditMode ? "Mettre à jour" : "Envoyer"}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 dark:text-white rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTeacher;
