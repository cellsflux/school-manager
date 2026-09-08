import { Istudent } from "../../../shared/type";
import { StudentModel } from "../../databases/models/sudent.model";
import { generateStudentMatricule } from "../utils/generate.matricule";

export const Student = {
  create: async ({
    student,
    etablissementId,
  }: {
    student: Istudent;
    etablissementId: string;
  }) => {
    try {
      const matricule = await generateStudentMatricule(etablissementId);
      const new_student = new StudentModel({
        matricule: matricule,
        fname: student.fname,
        lname: student.lname,
        fm_name: student.fm_name,
        picture: student.picture,
        dateOfBirth: student.dateOfBirth,
        placeOfBirth: student.placeOfBirth,
        nationality: student.nationality,
        gender: student.gender,
        phone: student.phone,
        address: student.address,
        dad_name: student.dad_name,
        mom_name: student.mom_name,
        responsableName: student.responsableName,
        responsablePhone: student.responsablePhone,
        responsableRelation: student.responsableRelation,
      });

      const res = await new_student.save();

      return { message: "Étudiant créé avec succès", success: true, data: res };
    } catch (error) {
      console.log(error);
      return { message: "Erreur lors de la création", success: false };
    }
  },

  /** Find student by id */
  findById: async ({ id }: { id: string }) => {
    try {
      const student = await StudentModel.findById(id);
      if (!student) {
        return {
          message: "Étudiant non trouvé",
          success: false,
          data: null,
        };
      }
      return {
        message: "Étudiant trouvé",
        success: true,
        data: student,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Erreur lors de la recherche",
        success: false,
        data: null,
      };
    }
  },

  /** Get all students with pagination and search */
  /** Get all students with pagination and search (version simplifiée) */
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
      // Construire la requête de base
      let query: any = { ...filters };

      // Recherche simplifiée : utiliser un seul champ pour la recherche
      if (search && search.trim()) {
        // Vous pouvez choisir un champ principal pour la recherche
        // ou combiner plusieurs champs avec une logique personnalisée
        const searchRegex = new RegExp(search.trim(), "i");

        // Option 1 : Recherche sur un champ spécifique (par exemple matricule)
        query.matricule = searchRegex;

        // Option 2 : Si vous voulez chercher sur plusieurs champs,
        // utilisez une approche différente
      }

      const skip = (page - 1) * limit;
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Utiliser le Query builder de realm-mongoose-orm
      const queryBuilder = StudentModel.find(query);
      queryBuilder.sort(sort);
      queryBuilder.skip(skip);
      queryBuilder.limit(limit);

      const [students, totalCount] = await Promise.all([
        queryBuilder,
        StudentModel.count(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        message: "Étudiants récupérés avec succès",
        success: true,
        data: students,
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

  /** Update student by id */
  update: async ({
    id,
    studentData,
  }: {
    id: string;
    studentData: Partial<Istudent>;
  }) => {
    try {
      const updatedStudent = await StudentModel.findByIdAndUpdate(
        id,
        { ...studentData },
        { new: true },
      );

      if (!updatedStudent) {
        return {
          message: "Étudiant non trouvé",
          success: false,
          data: null,
        };
      }

      return {
        message: "Étudiant mis à jour avec succès",
        success: true,
        data: updatedStudent,
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

  /** Delete student by id */
  delete: async ({ id }: { id: string }) => {
    try {
      const deletedStudent = await StudentModel.findByIdAndDelete(id);
      if (!deletedStudent) {
        return {
          message: "Étudiant non trouvé",
          success: false,
          data: null,
        };
      }
      return {
        message: "Étudiant supprimé avec succès",
        success: true,
        data: deletedStudent,
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

  /** Search students by matricule or name (quick search) */
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

      // Chercher sur chaque champ séparément
      const searchFields = ["matricule", "fname", "lname", "fm_name"];
      const searchPromises = searchFields.map((field) => {
        const fieldQuery: any = {};
        fieldQuery[field] = searchRegex;
        return StudentModel.find(fieldQuery).limit(limit);
      });

      const results = await Promise.all(searchPromises);

      // Fusionner et enlever les doublons
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

  /** Bulk create students */
  createMany: async ({
    students,
    etablissementId,
  }: {
    students: Istudent[];
    etablissementId: string;
  }) => {
    try {
      const studentsWithMatricules = await Promise.all(
        students.map(async (student) => {
          const matricule = await generateStudentMatricule(etablissementId);
          return {
            ...student,
            matricule,
          };
        }),
      );

      const createdStudents = await StudentModel.insertMany(
        studentsWithMatricules,
      );

      return {
        message: `${createdStudents.length} étudiants créés avec succès`,
        success: true,
        data: createdStudents,
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

  /** Count students with filters */
  count: async ({ filters = {} }: { filters?: Record<string, any> }) => {
    try {
      const count = await StudentModel.count(filters);
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
