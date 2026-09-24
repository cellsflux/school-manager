import { AnneeModel } from "../../databases/models/annee.model";
import { catchError } from "../utils/errorrequeste";

export const yearModule = {
  create: async ({
    labele,
    dateDebut,
    dateFin,
  }: {
    labele: string;
    dateDebut: Date;
    dateFin: Date;
  }) => {
    try {
      if (!labele || labele == "" || !dateDebut || !dateFin) {
        return { message: "ful required", success: false };
      }

      const y = await AnneeModel.create({
        libelle: labele,
        dateDebut,
        dateFin,
      });
      return { data: y, success: true, message: "success" };
    } catch (error) {
      catchError(error);
    }
  },
  find: async () => {
    try {
      const ys = await AnneeModel.find();
      return { data: ys };
    } catch (error) {
      catchError(error);
    }
  },
  delete: async (id: string) => {
    try {
      const d = await AnneeModel.findByIdAndDelete(id);
      if (!d) {
        return {
          message: "error to delete",
          success: false,
          data: null,
        };
      }
      return { success: true, message: "success delete" };
    } catch (error) {
      catchError(error);
    }
  },
  update: async ({
    id,
    data,
  }: {
    id: string;
    data: { labele: string; dateDebut: Date; dateFin: Date };
  }) => {
    try {
      const updatedyear = await AnneeModel.findByIdAndUpdate(
        id,
        { ...data, libelle: data.labele },
        { new: true },
      );
      if (!updatedyear) {
        return {
          message: "Étudiant non trouvé",
          success: false,
          data: null,
        };
      }
      return {
        message: "Une nouvelle année a été ajouter avec succès",
        success: true,
        data: updatedyear,
      };
    } catch (error) {
      catchError(error);
    }
  },
};
