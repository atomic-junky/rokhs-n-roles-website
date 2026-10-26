import { z } from "astro/zod";
import { defineAction } from "astro:actions";
import { badRequest, conflict, describe, notFound, requireSession, slotSchema, slugify, type SlotInput } from "../utils/action";
import { db } from "../lib/db/client";
import { eq, inArray } from 'drizzle-orm';
import { rooms, roomAvailabilities, reservations } from '../lib/db/schema';


const checkSlots = (slots: SlotInput[]) => {
    const starts = new Set<string>();
    for (const slot of slots) {
        const key = `${slot.weekday}:${slot.startMinute}`;
        if (starts.has(key)) throw badRequest(`Deux créneaux commencent en même temps (${describe(slot)}).`);
        starts.add(key);
    }
    const active = slots.filter((s) => s.active).sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
    for (let i = 1; i < active.length; i++) {
        const [previous, next] = [active[i - 1], active[i]];
        if (previous.weekday === next.weekday && next.startMinute < previous.endMinute)
            throw badRequest(`Les créneaux ${describe(previous)} et ${describe(next)} se chevauchent.`);
    }
};

export const saveRoom = defineAction({
    input: z.object({
        slug: z.string().optional(),
        name: z.string().trim().min(1, 'Le nom est obligatoire.'),
        location: z.string().trim().min(1, 'Le lieu est obligatoire.'),
        schoolCalendar: z.boolean(),
        slots: z.array(slotSchema),
    }),
    handler: async (input, { cookies }) => {
        await requireSession(cookies);
        checkSlots(input.slots);

        const isNew = !input.slug;
        const slug = input.slug ?? slugify(input.name);
        if (!slug) throw badRequest('Le nom doit contenir au moins une lettre ou un chiffre.');

        const [existing] = await db.select().from(rooms).where(eq(rooms.slug, slug));
        if (isNew && existing) throw conflict('Une salle avec ce nom existe déjà.');
        if (!isNew && !existing) throw notFound('Cette salle n’existe pas.');

        const currentSlots = await db.select().from(roomAvailabilities).where(eq(roomAvailabilities.room, slug));
        const currentIds = new Set(currentSlots.map((s) => s.id));
        if (input.slots.some((s) => s.id && !currentIds.has(s.id))) throw badRequest('Un créneau n’appartient pas à cette salle.');

        const submittedIds = new Set(input.slots.flatMap((s) => (s.id ? [s.id] : [])));
        const removedIds = currentSlots.filter((s) => !submittedIds.has(s.id)).map((s) => s.id);
        const usedIds = new Set<number>();
        if (removedIds.length) {
            const used = await db
                .selectDistinct({ id: reservations.availability })
                .from(reservations)
                .where(inArray(reservations.availability, removedIds));
            for (const row of used) usedIds.add(row.id);
        }
        for (const slot of input.slots) {
            const clash = currentSlots.find((k) => usedIds.has(k.id) && k.weekday === slot.weekday && k.startMinute === slot.startMinute);
            if (clash) throw conflict(`Le créneau ${describe(clash)} a des réservations : modifie-le au lieu de le supprimer puis de le recréer.`);
        }

        const roomValues = { name: input.name, location: input.location, schoolCalendar: input.schoolCalendar };
        if (isNew) await db.insert(rooms).values({ slug, ...roomValues });
        else await db.update(rooms).set(roomValues).where(eq(rooms.slug, slug));

        const deletableIds = removedIds.filter((id) => !usedIds.has(id));
        if (deletableIds.length) await db.delete(roomAvailabilities).where(inArray(roomAvailabilities.id, deletableIds));
        if (usedIds.size) await db.update(roomAvailabilities).set({ active: false }).where(inArray(roomAvailabilities.id, [...usedIds]));

        for (const slot of input.slots) {
            const values = { room: slug, weekday: slot.weekday, startMinute: slot.startMinute, endMinute: slot.endMinute, active: slot.active };
            if (slot.id) await db.update(roomAvailabilities).set(values).where(eq(roomAvailabilities.id, slot.id));
            else await db.insert(roomAvailabilities).values(values);
        }

        const slots = await db.select().from(roomAvailabilities).where(eq(roomAvailabilities.room, slug));
        return { slug, ...roomValues, slots, deactivated: usedIds.size };
    },
});


export const deleteRoom = defineAction({
    input: z.object({ slug: z.string().min(1) }),
    handler: async ({ slug }, { cookies }) => {
        await requireSession(cookies);
        const slots = await db.select({ id: roomAvailabilities.id }).from(roomAvailabilities).where(eq(roomAvailabilities.room, slug));
        if (slots.length) {
            const [used] = await db
                .select({ id: reservations.id })
                .from(reservations)
                .where(inArray(reservations.availability, slots.map((s) => s.id)))
                .limit(1);
            if (used) throw conflict('Cette salle a des réservations : désactive ses créneaux plutôt que de la supprimer.');
        }
        await db.delete(rooms).where(eq(rooms.slug, slug));
        return { slug };
    },
});