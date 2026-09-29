// src/services/teacher.service.ts
import { Iteacher } from "../../../shared/type";
import { TeacherModel } from "../../databases/models/Teacher.model";
import { generateTeacherMatricule } from "../utils/generate.matricule.teacher";

export const TeacherModule = {
  // -------------------------------------------------------------------
  // CREATE — on accepte `section` (objectId) dans le payload
  // -------------------------------------------------------------------
  create: async ({
    teacher,
    etablissementId,
  }: {
    teacher: Iteacher;
    etablissementId: string;
  }) => {
    try {
      const matricule = await generateTeacherMatricule(etablissementId);

      const newTeacher = new TeacherModel({
        matricule,
        fname: teacher.fname,
        fm_name: teacher.fm_name,
        lname: teacher.lname,
        picture: teacher.picture,
        dateOfBirth: teacher.dateOfBirth,
        placeOfBirth: teacher.placeOfBirth,
        nationality: teacher.nationality,
        gender: teacher.gender,
        phone: teacher.phone,
        phone2: teacher.phone2,
        email: teacher.email,
        address: teacher.address,

        // 👇 nouvelle référence
        section: teacher.section as any,

        grade: teacher.grade,
        specialite: teacher.specialite,
        skills: teacher.skills ?? [],
        experiences: teacher.experiences ?? [],
        langues: teacher.langues ?? [],
        etabid: etablissementId,
      });

      const res = await newTeacher.save();

      // On renvoie le doc populé directement
      const populated = await TeacherModel.findById(res._id).populate(
        "section",
      );

      return {
        message: "Enseignant créé avec succès",
        success: true,
        data: populated ?? res,
      };
    } catch (error) {
      console.log(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  // -------------------------------------------------------------------
  // FIND BY ID — populate section
  // -------------------------------------------------------------------
  findById: async ({ id }: { id: string }) => {
    try {
      const teacher = await TeacherModel.findById(id).populate("section");
      if (!teacher) {
        return { message: "Enseignant non trouvé", success: false, data: null };
      }
      return { message: "Enseignant trouvé", success: true, data: teacher };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la recherche",
        success: false,
        data: null,
      };
    }
  },

  // -------------------------------------------------------------------
  // GET ALL — populate section
  // -------------------------------------------------------------------
  getAll: async ({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    sortBy = "createdAt",
    sortOrder = "desc",
  }: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    try {
      const query: any = { ...filters };

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), "i");
        query.matricule = searchRegex;
      }

      const skip = (page - 1) * limit;
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      const queryBuilder = TeacherModel.find(query)
        .populate("section") // 👈 populate
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const [teachers, totalCount] = await Promise.all([
        queryBuilder,
        TeacherModel.count(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        message: "Enseignants récupérés avec succès",
        success: true,
        data: teachers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la récupération",
        success: false,
        data: [],
        pagination: null,
      };
    }
  },

  // -------------------------------------------------------------------
  // UPDATE — populate section dans le retour
  // -------------------------------------------------------------------
  update: async ({
    id,
    teacherData,
  }: {
    id: string;
    teacherData: Partial<Iteacher>;
  }) => {
    try {
      const updatedTeacher = await TeacherModel.findByIdAndUpdate(
        id,
        { ...(teacherData as any) },
        { new: true },
      );

      if (!updatedTeacher) {
        return { message: "Enseignant non trouvé", success: false, data: null };
      }

      const teacher = await TeacherModel.find({ _id: id }).populate("section");

      return {
        message: "Enseignant mis à jour avec succès",
        success: true,
        data: updatedTeacher,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la mise à jour",
        success: false,
        data: null,
      };
    }
  },

  // -------------------------------------------------------------------
  // DELETE — populate pour info
  // -------------------------------------------------------------------
  delete: async ({ id }: { id: string }) => {
    try {
      const deletedTeacher = await TeacherModel.findByIdAndDelete(id);
      if (!deletedTeacher) {
        return { message: "Enseignant non trouvé", success: false, data: null };
      }
      return {
        message: "Enseignant supprimé avec succès",
        success: true,
        data: deletedTeacher,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la suppression",
        success: false,
        data: null,
      };
    }
  },

  // -------------------------------------------------------------------
  // SEARCH — populate section
  // -------------------------------------------------------------------
  search: async ({ query, limit = 10 }: { query: string; limit?: number }) => {
    try {
      if (!query || !query.trim()) {
        return {
          message: "Veuillez fournir un terme de recherche",
          success: false,
          data: [],
        };
      }

      const searchRegex = new RegExp(query.trim(), "i");
      const searchFields = ["matricule", "fname", "lname", "fm_name", "email"];
      const searchPromises = searchFields.map((field) => {
        const fieldQuery: any = {};
        fieldQuery[field] = searchRegex;
        return TeacherModel.find(fieldQuery).populate("section").limit(limit);
      });

      const results = await Promise.all(searchPromises);
      const allResults = results.flat();
      const uniqueResults = Array.from(
        new Map(allResults.map((item) => [item._id, item])).values(),
      );

      return {
        message: "Recherche effectuée avec succès",
        success: true,
        data: uniqueResults.slice(0, limit),
        count: uniqueResults.length,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la recherche",
        success: false,
        data: [],
      };
    }
  },

  // -------------------------------------------------------------------
  // CREATE MANY — populate section sur les docs créés
  // -------------------------------------------------------------------
  createMany: async ({
    teachers,
    etablissementId,
  }: {
    teachers: Iteacher[];
    etablissementId: string;
  }) => {
    try {
      const teachersWithMatricules = await Promise.all(
        teachers.map(async (teacher) => {
          const matricule = await generateTeacherMatricule(etablissementId);
          return { ...teacher, matricule, etabid: etablissementId };
        }),
      );

      const createdTeachers = await TeacherModel.insertMany(
        teachersWithMatricules as any,
      );

      // Re-fetch pour populate (insertMany ne populate pas)
      const ids = createdTeachers.map((t: any) => t._id);
      const populated = await TeacherModel.find({ _id: { $in: ids } }).populate(
        "section",
      );

      return {
        message: `${populated.length} enseignants créés avec succès`,
        success: true,
        data: populated,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la création en masse",
        success: false,
        data: [],
      };
    }
  },

  count: async ({ filters = {} }: { filters?: Record<string, any> }) => {
    try {
      const count = await TeacherModel.count(filters);
      return {
        message: "Comptage effectué avec succès",
        success: true,
        data: { count },
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors du comptage",
        success: false,
        data: null,
      };
    }
  },
};
