export interface Istudent {
  _id?: string;
  matricule?: string;
  // Identité
  fname: string;
  lname: string;
  fm_name: string;
  // Photo
  picture: string;
  // Naissance
  dateOfBirth: Date;
  placeOfBirth: string;
  // Informations personnelles
  nationality: string;
  gender: "F" | "M";
  // Contact
  phone: string;
  address: string;
  // Parents
  dad_name: string;
  mom_name: string;
  // Responsable légal
  responsableName: string;
  responsableRelation: string;
  responsablePhone: string;
}
