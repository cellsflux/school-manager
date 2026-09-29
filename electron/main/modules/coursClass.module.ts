// server/modules/coursClass.module.ts
import { CoursClassModel } from "../../databases/models/cours.class.model";
import { ClasseModel } from "../../databases/models/classes.model";
import { CoursModel } from "../../databases/models/cours.model";
import { TeacherModel } from "../../databases/models/Teacher.model";
import { catchError } from "../utils/errorrequeste";

type CoursClassInput = {
  classid: string;
  coursid: string;
  teacherId?: string;
  max_score?: number;
  coefficient?: number;
  display_order?: number;
};

// Single source of truth for which relations to resolve
const POPULATE = ["classid", "coursid", "teacherId"];

// ---------------------------------------------------------------------------
// Module CoursClass
// ---------------------------------------------------------------------------
export const coursClassModule = {
  /** Create a cours-class assignment */
  create: async (data: CoursClassInput) => {
    try {
      if (!data.classid) {
        return { message: "La classe est obligatoire", success: false };
      }
      if (!data.coursid) {
        return { message: "Le cours est obligatoire", success: false };
      }

      const classeExists = await ClasseModel.exists({
        _id: data.classid as any,
      });
      if (!classeExists) {
        return { message: "Classe introuvable", success: false };
      }

      const coursExists = await CoursModel.exists({
        _id: data.coursid as any,
      });
      if (!coursExists) {
        return { message: "Cours introuvable", success: false };
      }

      if (data.teacherId) {
        const teacherExists = await TeacherModel.exists({
          _id: data.teacherId as any,
        });
        if (!teacherExists) {
          return { message: "Enseignant introuvable", success: false };
        }
      }

      const max_score =
        typeof data.max_score === "number"
          ? data.max_score
          : data.max_score
            ? Number(data.max_score)
            : 20;
      const coefficient =
        typeof data.coefficient === "number"
          ? data.coefficient
          : data.coefficient
            ? Number(data.coefficient)
            : 1;
      const display_order =
        typeof data.display_order === "number"
          ? data.display_order
          : data.display_order
            ? Number(data.display_order)
            : 0;

      const created = await CoursClassModel.create({
        classid: data.classid as any,
        coursid: data.coursid as any,
        teacherId: (data.teacherId ?? null) as any,
        max_score: isNaN(max_score) ? 20 : max_score,
        coefficient: isNaN(coefficient) ? 1 : coefficient,
        display_order: isNaN(display_order) ? 0 : display_order,
      });

      const hydrated = await CoursClassModel.findById(created._id as string, {
        populate: POPULATE as any,
      });

      return {
        data: hydrated,
        success: true,
        message: "Attribution créée avec succès",
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Get every cours-class */
  find: async () => {
    try {
      const list = await CoursClassModel.find(
        {},
        { populate: POPULATE as any },
      );

      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Get a cours-class by id */
  findById: async ({ id }: { id: string }) => {
    try {
      const c = await CoursClassModel.findById(id, {
        populate: POPULATE as any,
      });
      if (!c) {
        return {
          message: "Attribution non trouvée",
          success: false,
          data: null,
        };
      }
      return { data: c, success: true, message: "Attribution trouvée" };
    } catch (error) {
      catchError(error);
      return { data: null, success: false };
    }
  },

  /** Filter by classe */
  findByClasse: async ({ classId }: { classId: string }) => {
    try {
      const list = await CoursClassModel.find(
        { classid: classId as any },
        { populate: POPULATE as any },
      );
      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Filter by cours */
  findByCours: async ({ coursId }: { coursId: string }) => {
    try {
      const list = await CoursClassModel.find(
        { coursid: coursId as any },
        { populate: POPULATE as any },
      );
      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Filter by teacher */
  findByTeacher: async ({ teacherId }: { teacherId: string }) => {
    try {
      const list = await CoursClassModel.find(
        { teacherId: teacherId as any },
        { populate: POPULATE as any },
      );
      return { data: list, success: true };
    } catch (error) {
      catchError(error);
      return { data: [], success: false };
    }
  },

  /** Update a cours-class */
  update: async ({
    id,
    data,
  }: {
    id: string;
    data: Partial<CoursClassInput>;
  }) => {
    try {
      const payload: Record<string, unknown> = {};

      if (data.classid !== undefined) {
        const exists = await ClasseModel.exists({ _id: data.classid as any });
        if (!exists) return { message: "Classe introuvable", success: false };
        payload.classid = data.classid;
      }

      if (data.coursid !== undefined) {
        const exists = await CoursModel.exists({ _id: data.coursid as any });
        if (!exists) return { message: "Cours introuvable", success: false };
        payload.coursid = data.coursid;
      }

      if (data.teacherId !== undefined) {
        if (data.teacherId === null || data.teacherId === "") {
          payload.teacherId = null;
        } else {
          const exists = await TeacherModel.exists({
            _id: data.teacherId as any,
          });
          if (!exists)
            return { message: "Enseignant introuvable", success: false };
          payload.teacherId = data.teacherId;
        }
      }

      if (data.max_score !== undefined) {
        const n =
          typeof data.max_score === "number"
            ? data.max_score
            : Number(data.max_score);
        payload.max_score = isNaN(n) ? 20 : n;
      }

      if (data.coefficient !== undefined) {
        const n =
          typeof data.coefficient === "number"
            ? data.coefficient
            : Number(data.coefficient);
        payload.coefficient = isNaN(n) ? 1 : n;
      }

      if (data.display_order !== undefined) {
        const n =
          typeof data.display_order === "number"
            ? data.display_order
            : Number(data.display_order);
        payload.display_order = isNaN(n) ? 0 : n;
      }

      const updated = await CoursClassModel.findByIdAndUpdate(
        id,
        payload as Partial<CoursClassInput>,
        { new: true },
      );
      if (!updated) {
        return {
          message: "Attribution non trouvée",
          success: false,
          data: null,
        };
      }

      const hydrated = await CoursClassModel.findById(id, {
        populate: POPULATE as any,
      });

      return {
        message: "Attribution mise à jour avec succès",
        success: true,
        data: hydrated,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la mise à jour", success: false };
    }
  },

  /** Delete a cours-class */
  delete: async ({ id }: { id: string }) => {
    try {
      const deleted = await CoursClassModel.findByIdAndDelete(id);
      if (!deleted) {
        return {
          message: "Attribution non trouvée",
          success: false,
          data: null,
        };
      }
      return {
        message: "Attribution supprimée avec succès",
        success: true,
        data: deleted,
      };
    } catch (error) {
      catchError(error);
      return { message: "Erreur lors de la suppression", success: false };
    }
  },
};
