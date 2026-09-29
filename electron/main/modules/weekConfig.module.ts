// server/modules/horaires/weekConfig.module.ts
import { WeekConfigModel } from "../../databases/models/horaires/WeekConfig.model";
import { catchError } from "../utils/errorrequeste";
import { DEFAULT_DAYS, DEFAULT_SLOTS, isValidId } from "../../../shared/type";
import type { DayConfig, SlotConfig } from "../../../shared/type";

const fail = (message: string, extra: object = {}) => ({
  success: false as const,
  message,
  ...extra,
});

/**
 * Récupère la config d'une année, ou en crée une par défaut.
 */
export async function getOrCreateWeekConfig({ yearId }: { yearId: string }) {
  try {
    if (!isValidId(yearId)) return fail("Année scolaire invalide.");

    const existing: any[] = await WeekConfigModel.find({ yearId } as any);
    if (Array.isArray(existing) && existing.length > 0) {
      return { success: true as const, data: existing[0] };
    }

    const created: any = await WeekConfigModel.create({
      yearId,
      name: "Configuration par défaut",
      isDefault: true,
      days: DEFAULT_DAYS,
      slots: DEFAULT_SLOTS,
    });

    return { success: true as const, data: created };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors du chargement de la config");
  }
}

/**
 * Met à jour les jours / créneaux / nom.
 * Valide que :
 *  - les jours ont un `value` unique
 *  - les slots ont un `id` unique
 *  - les slots ont des heures valides et startTime < endTime
 */
export async function updateWeekConfig({
  id,
  days,
  slots,
  name,
}: {
  id: string;
  days?: DayConfig[];
  slots?: SlotConfig[];
  name?: string;
}) {
  try {
    if (!isValidId(id)) return fail("Identifiant de config invalide.");

    const errors: string[] = [];

    // Validation des jours
    if (days) {
      const values = new Set<number>();
      for (const d of days) {
        if (typeof d.value !== "number")
          errors.push("Chaque jour doit avoir une valeur numérique.");
        if (values.has(d.value))
          errors.push(`Jour en double : valeur ${d.value}.`);
        values.add(d.value);
        if (!d.label) errors.push(`Le jour ${d.value} doit avoir un libellé.`);
      }
    }

    // Validation des créneaux
    if (slots) {
      const ids = new Set<string>();
      for (const s of slots) {
        if (!s.id) errors.push("Chaque créneau doit avoir un identifiant.");
        if (ids.has(s.id)) errors.push(`Créneau en double : ${s.id}.`);
        ids.add(s.id);
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(s.startTime))
          errors.push(`Heure de début invalide pour le créneau ${s.id}.`);
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(s.endTime))
          errors.push(`Heure de fin invalide pour le créneau ${s.id}.`);
        if (s.startTime >= s.endTime)
          errors.push(
            `Le créneau ${s.startTime}–${s.endTime} est invalide (fin ≤ début).`,
          );
      }
    }

    if (errors.length) return fail(errors[0], { errors });

    const payload: any = {};
    if (days) payload.days = days;
    if (slots) payload.slots = slots;
    if (name) payload.name = name;

    const updated = await WeekConfigModel.findByIdAndUpdate(id, payload, {
      new: true,
    });
    if (!updated) return fail("Configuration introuvable");

    return {
      success: true as const,
      data: updated,
      message: "Configuration mise à jour",
    };
  } catch (error) {
    catchError(error);
    return fail("Erreur lors de la mise à jour");
  }
}

export const weekConfigModule = {
  getOrCreateWeekConfig,
  updateWeekConfig,
};
