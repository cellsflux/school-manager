// src/services/utils/generate.matricule.teacher.ts
import { EtablissmentModel } from "../../databases/models/etablissement.model";
import { TeacherModel } from "../../databases/models/Teacher.model";

/**
 * Génère un matricule unique pour un enseignant basé sur la config de l'établissement
 *
 * Format: PREFIX + NUMÉROS (longueur configurable)
 * Exemple: avec prefix "ENS" et longueur 6 -> "ENS123456"
 *
 * ⚠️ Utilise `teacher_maticule_prefix` et `teacher_matricule_lengh` si présents
 * dans le document établissement, sinon retombe sur les valeurs étudiant.
 */
export const generateTeacherMatricule = async (
  etablissementId: string,
): Promise<string> => {
  const MAX_ATTEMPTS = 1000;

  try {
    const etablissement = await EtablissmentModel.find({ id: etablissementId });
    if (!etablissement || etablissement.length < 1) {
      throw new Error("Établissement non trouvé");
    }

    // Config spécifique enseignant, avec fallback sur la config étudiant
    const prefix = etablissement[0].maticule_prefix || "ENS";
    const length = etablissement[0].matricule_lengh || 6;

    if (length < 1 || length > 20) {
      throw new Error("La longueur du matricule doit être entre 1 et 20");
    }

    let attempts = 0;
    let matricule = "";
    let isUnique = false;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      const numericPart = generateNumericPart(length);
      matricule = `${prefix}${numericPart}`;

      const existingTeacher = await TeacherModel.findOne({
        matricule,
      });

      if (!existingTeacher) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        `Impossible de générer un matricule unique après ${MAX_ATTEMPTS} tentatives`,
      );
    }

    console.log(`Matricule enseignant généré avec succès: ${matricule}`);
    return matricule;
  } catch (error) {
    console.error(
      "Erreur lors de la génération du matricule enseignant:",
      error,
    );
    if (error instanceof Error) {
      throw new Error(`Échec de génération du matricule: ${error.message}`);
    }
    throw new Error("Erreur inconnue lors de la génération du matricule");
  }
};

const generateNumericPart = (length: number): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

export const generateMultipleTeacherMatricules = async (
  etablissementId: string,
  count: number,
): Promise<string[]> => {
  const matricules: string[] = [];
  const uniqueMatricules = new Set<string>();

  for (let i = 0; i < count; i++) {
    let matricule = await generateTeacherMatricule(etablissementId);

    let attempts = 0;
    while (uniqueMatricules.has(matricule) && attempts < 50) {
      matricule = await generateTeacherMatricule(etablissementId);
      attempts++;
    }

    uniqueMatricules.add(matricule);
    matricules.push(matricule);
  }

  return matricules;
};

export const validateTeacherMatricule = async (
  etablissementId: string,
  matricule: string,
): Promise<boolean> => {
  try {
    const etablissement = await EtablissmentModel.findById(etablissementId);
    if (!etablissement) return false;

    const prefix =
      etablissement.maticule_prefix || etablissement.maticule_prefix || "ENS";
    const length =
      etablissement.matricule_lengh || etablissement.matricule_lengh || 6;

    if (!matricule.startsWith(prefix)) return false;
    if (matricule.length !== prefix.length + length) return false;

    const numericPart = matricule.substring(prefix.length);
    return /^\d+$/.test(numericPart);
  } catch (error) {
    console.error(
      "Erreur lors de la validation du matricule enseignant:",
      error,
    );
    return false;
  }
};
