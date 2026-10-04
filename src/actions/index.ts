import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import type { AstroCookies } from 'astro';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { rooms, roomAvailabilities, reservations } from '../lib/db/schema';
import { getReservationSession } from '../lib/reservation-auth';
import { WEEKDAYS, TYPE_LABELS  } from '../consts';
import { dateParameter, loadBooking } from '../lib/reservations';

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const describe = (slot: { weekday: number; startMinute: number; endMinute: number }) =>
	`${WEEKDAYS[slot.weekday]} ${hhmm(slot.startMinute)}-${hhmm(slot.endMinute)}`;

const slugify = (name: string) =>
	name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const parisToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date()); // 'YYYY-MM-DD'
const badRequest = (message: string) => new ActionError({ code: 'BAD_REQUEST', message });
const conflict = (message: string) => new ActionError({ code: 'CONFLICT', message });

const requireSession = async (cookies: AstroCookies) => {
	if (!(await getReservationSession(cookies))) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Connexion requise.' });
};

const isUniqueViolation = (error: unknown) => {
	for (let current: any = error; current; current = current.cause)
		if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(String(current?.message ?? current))) return true;
	return false;
};

const slotSchema = z
	.object({
		id: z.number().int().positive().optional(), // absent = nouveau créneau
		weekday: z.number().int().min(0).max(6),
		startMinute: z.number().int().min(0).max(1439),
		endMinute: z.number().int().min(1).max(1440),
		active: z.boolean(),
	})
	.refine((slot) => slot.endMinute > slot.startMinute, { message: 'La fin d’un créneau doit être après son début.', path: ['endMinute'] });

type SlotInput = z.infer<typeof slotSchema>;

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

export const server = {
	saveRoom: defineAction({
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
			if (!isNew && !existing) throw new ActionError({ code: 'NOT_FOUND', message: 'Cette salle n’existe plus.' });

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
	}),

	deleteRoom: defineAction({
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
	}),

	bookSlot: defineAction({
		input: z.object({
			availability: z.number().int().positive(),
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.'),
			type: z.enum(['jdr', 'jds', 'autre']),
			description: z.string().trim().max(200, 'La description est trop longue (200 caractères maximum).').optional(),
		}),
		handler: async ({ availability, date, type, description }, { cookies }) => {
			const memberEmail = await getReservationSession(cookies);
			if (!memberEmail) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Connectez-vous pour réserver une salle.' });
	
			const day = new Date(`${date}T12:00:00`);
			if (Number.isNaN(day.getTime()) || dateParameter(day) !== date) throw badRequest('Date invalide.'); // ex. 2026-02-31
			if (date < parisToday()) throw badRequest('Cette date est passée.');
	
			const [slot] = await db.select().from(roomAvailabilities).where(eq(roomAvailabilities.id, availability));
			if (!slot || !slot.active) throw new ActionError({ code: 'NOT_FOUND', message: 'Ce créneau n’existe pas.' });
	
			const { rooms, getDay } = await loadBooking({ roomSlug: slot.room, from: date, to: date });
			const room = rooms[0];
			if (!room) throw new ActionError({ code: 'NOT_FOUND', message: 'Cette salle n’existe pas.' });
			const info = getDay(room, day);
			if (info.closed) throw badRequest('La salle est fermée pendant les vacances scolaires.');
			const target = info.slots.find((s) => s.availability.id === availability);
			if (!target) throw badRequest('Ce créneau n’est pas disponible à cette date.');
			if (target.reservation) throw new ActionError({ code: 'CONFLICT', message: 'Ce créneau est déjà réservé.' });
	
			const manager = String(memberEmail).trim().toLowerCase();
	
			const text = description ?? '';
			const label = TYPE_LABELS[type];
			const title = type === 'autre' ? text || label : text ? `${label} · ${text}` : label;
	
			try {
				await db.insert(reservations).values({ availability, date, description: title, manager, members: [] });
			} catch (error) {
				if (isUniqueViolation(error)) throw new ActionError({ code: 'CONFLICT', message: 'Ce créneau vient d’être réservé par quelqu’un d’autre.' });
				throw error;
			}
	
			return { availability, date, description: title, manager, members: [] as string[] };
		},
	}),
};