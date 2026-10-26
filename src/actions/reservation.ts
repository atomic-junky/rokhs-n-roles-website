import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import type { AstroCookies } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { rooms, roomAvailabilities, reservations } from '../lib/db/schema';
import { getReservationSession } from '../lib/memberAuth';
import { badRequest, conflict, isUniqueViolation } from '../utils/action';
import { dateParameter, loadBooking } from '../lib/reservations';
import { TYPE_LABELS } from '../consts';

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const parisToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date()); // 'YYYY-MM-DD'

const requireEmail = async (cookies: AstroCookies) => {
	const email = await getReservationSession(cookies);
	if (!email) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Connectez-vous pour continuer.' });
	return email;
};

const withSlot = () =>
	db
		.select({ reservation: reservations, slot: roomAvailabilities, roomName: rooms.name })
		.from(reservations)
		.innerJoin(roomAvailabilities, eq(reservations.availability, roomAvailabilities.id))
		.innerJoin(rooms, eq(roomAvailabilities.room, rooms.slug));

const loadReservation = async (id: number) => {
	const [row] = await withSlot().where(eq(reservations.id, id));
	if (!row) throw new ActionError({ code: 'NOT_FOUND', message: 'Cette réservation n’existe plus.' });
	if (row.reservation.date < parisToday()) throw badRequest('Cette date est passée.');
	return row;
};

const input = z.object({ reservationId: z.number().int().positive() });

export const bookSlot = defineAction({
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
});

export const cancelReservation = defineAction({
	input,
	handler: async ({ reservationId }, { cookies }) => {
		const email = await requireEmail(cookies);
		const { reservation } = await loadReservation(reservationId);
		if (reservation.manager !== email) throw new ActionError({ code: 'FORBIDDEN', message: 'Seul le responsable peut annuler cette réservation.' });
		await db.delete(reservations).where(and(eq(reservations.id, reservationId), eq(reservations.manager, email)));
		return { reservationId };
	},
});

export const joinReservation = defineAction({
	input,
	handler: async ({ reservationId }, { cookies }) => {
		const email = await requireEmail(cookies);
		const { reservation, slot } = await loadReservation(reservationId);
		if (reservation.manager === email) throw badRequest('Vous êtes le responsable de cette partie.');
		if (reservation.members.includes(email)) throw conflict('Vous participez déjà à cette partie.');

		const sameDay = await withSlot().where(eq(reservations.date, reservation.date));
		const clash = sameDay.find(
			(other) =>
				other.reservation.id !== reservation.id &&
				(other.reservation.manager === email || other.reservation.members.includes(email)) &&
				other.slot.startMinute < slot.endMinute &&
				other.slot.endMinute > slot.startMinute
		);
		if (clash)
			throw conflict(`Vous participez déjà à une partie dans « ${clash.roomName} » de ${hhmm(clash.slot.startMinute)} à ${hhmm(clash.slot.endMinute)} ce jour-là.`);

		await db
			.update(reservations)
			.set({ members: sql`json_insert(${reservations.members}, '$[#]', ${email})` })
			.where(
				and(
					eq(reservations.id, reservationId),
					sql`NOT EXISTS (SELECT 1 FROM json_each(${reservations.members}) WHERE value = ${email})`
				)
			);

		const [updated] = await db.select({ members: reservations.members }).from(reservations).where(eq(reservations.id, reservationId));
		return { reservationId, members: updated?.members ?? [] };
	},
});

export const leaveReservation = defineAction({
	input,
	handler: async ({ reservationId }, { cookies }) => {
		const email = await requireEmail(cookies);
		const { reservation } = await loadReservation(reservationId);
		if (!reservation.members.includes(email)) throw badRequest('Vous ne participez pas à cette partie.');

		await db
			.update(reservations)
			.set({ members: sql`(SELECT json_group_array(j.value) FROM json_each(${reservations.members}) AS j WHERE j.value <> ${email})` })
			.where(eq(reservations.id, reservationId));

		const [updated] = await db.select({ members: reservations.members }).from(reservations).where(eq(reservations.id, reservationId));
		return { reservationId, members: updated?.members ?? [] };
	},
});