import { EtablissmentModel } from "../../databases/models/etablissement.model";
import { StudentModel } from "../../databases/models/sudent.model";

/**
 * Génère un matricule unique pour un étudiant basé sur la configuration de l'établissement
 *
 * @param etablissementId - ID de l'établissement
 * @returns Matricule unique généré
 *
 * Format: PREFIX + NUMÉROS (longueur configurable)
 * Exemple: avec prefix "STU" et longueur 6 -> "STU123456"
 */
export const generateStudentMatricule = async (
  etablissementId: string,
): Promise<string> => {
  const MAX_ATTEMPTS = 1000; // Nombre maximum de tentatives pour éviter les boucles infinies

  try {
    // 1. Récupérer l'établissement
    const etablissement = await EtablissmentModel.find({ id: etablissementId });
    if (!etablissement || etablissement.length < 1) {
      throw new Error("Établissement non trouvé");
    }

    // 2. Récupérer la configuration du matricule
    const prefix = etablissement[0].maticule_prefix || "STU";
    const length = etablissement[0].matricule_lengh || 6;

    // Validation des paramètres
    if (length < 1 || length > 20) {
      throw new Error("La longueur du matricule doit être entre 1 et 20");
    }

    // 3. Générer un matricule unique
    let attempts = 0;
    let matricule = "";
    let isUnique = false;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
      // Générer la partie numérique
      const numericPart = generateNumericPart(length);
      matricule = `${prefix}${numericPart}`;

      // Vérifier l'unicité dans la base de données
      const existingStudent = await StudentModel.findOne({
        matricule: matricule,
      });

      if (!existingStudent) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        `Impossible de générer un matricule unique après ${MAX_ATTEMPTS} tentatives`,
      );
    }

    console.log(`Matricule généré avec succès: ${matricule}`);
    return matricule;
  } catch (error) {
    console.error("Erreur lors de la génération du matricule:", error);
    if (error instanceof Error) {
      throw new Error(`Échec de génération du matricule: ${error.message}`);
    }
    throw new Error("Erreur inconnue lors de la génération du matricule");
  }
};

/**
 * Génère une partie numérique aléatoire de la longueur spécifiée
 */
const generateNumericPart = (length: number): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

/**
 * Génère plusieurs matricules en une fois
 */
export const generateMultipleMatricules = async (
  etablissementId: string,
  count: number,
): Promise<string[]> => {
  const matricules: string[] = [];
  const uniqueMatricules = new Set<string>();

  for (let i = 0; i < count; i++) {
    let matricule = await generateStudentMatricule(etablissementId);

    // S'assurer que le matricule est vraiment unique dans la liste générée
    let attempts = 0;
    while (uniqueMatricules.has(matricule) && attempts < 50) {
      matricule = await generateStudentMatricule(etablissementId);
      attempts++;
    }

    uniqueMatricules.add(matricule);
    matricules.push(matricule);
  }

  return matricules;
};

/**
 * Vérifie si un matricule est valide selon la configuration
 */
export const validateMatricule = async (
  etablissementId: string,
  matricule: string,
): Promise<boolean> => {
  try {
    const etablissement = await EtablissmentModel.findById(etablissementId);
    if (!etablissement) {
      return false;
    }

    const prefix = etablissement.maticule_prefix || "STU";
    const length = etablissement.matricule_lengh || 6;

    // Vérifier le préfixe
    if (!matricule.startsWith(prefix)) {
      return false;
    }

    // Vérifier la longueur totale
    if (matricule.length !== prefix.length + length) {
      return false;
    }

    // Vérifier que la partie numérique est bien des chiffres
    const numericPart = matricule.substring(prefix.length);
    return /^\d+$/.test(numericPart);
  } catch (error) {
    console.error("Erreur lors de la validation du matricule:", error);
    return false;
  }
};

/**
 * Génère un matricule avec un préfixe personnalisé (sans config)
 */
export const generateMatriculeWithCustomPrefix = async (
  prefix: string,
  length: number,
): Promise<string> => {
  const MAX_ATTEMPTS = 1000;

  if (length < 1 || length > 20) {
    throw new Error("La longueur du matricule doit être entre 1 et 20");
  }

  let attempts = 0;
  let matricule = "";
  let isUnique = false;

  while (!isUnique && attempts < MAX_ATTEMPTS) {
    const numericPart = generateNumericPart(length);
    matricule = `${prefix}${numericPart}`;

    const existingStudent = await StudentModel.findOne({
      matricule: matricule,
    });

    if (!existingStudent) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new Error(
      `Impossible de générer un matricule unique après ${MAX_ATTEMPTS} tentatives`,
    );
  }

  return matricule;
};

// Exemple d'utilisation
/*
// Générer un matricule pour un étudiant
const matricule = await generateStudentMatricule(etablissementId);
console.log(matricule); // "STU123456"

// Générer 5 matricules à la fois
const matricules = await generateMultipleMatricules(etablissementId, 5);
console.log(matricules); // ["STU123456", "STU789012", ...]

// Valider un matricule
const isValid = await validateMatricule(etablissementId, "STU123456");
console.log(isValid); // true

// Générer avec préfixe personnalisé
const customMatricule = await generateMatriculeWithCustomPrefix("ELV", 8);
console.log(customMatricule); // "ELV12345678"
*/
