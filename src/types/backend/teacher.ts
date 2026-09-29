// src/shared/type.ts (extrait mis à jour)
export interface Isection {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  logo?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Iteacher {
  _id?: string;
  id?: string;
  matricule?: string;
  fname: string;
  fm_name?: string;
  lname: string;
  picture?: string;
  dateOfBirth?: Date;
  placeOfBirth?: string;
  nationality?: string;
  gender: "M" | "F";
  phone?: string;
  phone2?: string;
  email?: string;
  address?: string;

  // 👇 Peut être un ObjectId (string) OU un objet peuplé (Isection)
  section?: string | Isection;

  grade?: string;
  specialite?: string;
  skills?: { details?: string }[];
  experiences?: {
    company?: string;
    domaine?: string;
    debut?: Date | string;
    dateFin?: Date | string;
  }[];
  langues?: { name?: string; level?: string }[];
  etabid?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
