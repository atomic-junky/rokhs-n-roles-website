import { ActionError } from "astro:actions";
import { WEEKDAYS } from "../consts";
import type { AstroCookies } from "astro";
import { getReservationSession } from "../lib/memberAuth";
import { z } from "astro/zod";

export const success = (message: string) => ({ success: true, message });
export const badRequest = (message: string) => new ActionError({ code: 'BAD_REQUEST', message });
export const conflict = (message: string) => new ActionError({ code: 'CONFLICT', message });
export const notFound = (message: string) => new ActionError({ code: 'NOT_FOUND', message });
export const unauthorized = (message: string) => new ActionError({ code: 'UNAUTHORIZED', message });
export const internalError = (message: string) => new ActionError({ code: 'INTERNAL_SERVER_ERROR', message });

export const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const slugify = (name: string) =>
	name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const describe = (slot: { weekday: number; startMinute: number; endMinute: number }) =>
	`${WEEKDAYS[slot.weekday]} ${hhmm(slot.startMinute)}-${hhmm(slot.endMinute)}`;
export const requireSession = async (cookies: AstroCookies) => {
	if (!(await getReservationSession(cookies))) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Connexion requise.' });
};
export const parisToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date()); // 'YYYY-MM-DD'
export const isUniqueViolation = (error: unknown) => {
    for (let current: any = error; current; current = current.cause)
        if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(String(current?.message ?? current))) return true;
    return false;
};

export const slotSchema = z
    .object({
        id: z.number().int().positive().optional(),
        weekday: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
        active: z.boolean(),
    })
    .refine((slot) => slot.endMinute > slot.startMinute, { message: 'La fin d’un créneau doit être après son début.', path: ['endMinute'] });
export type SlotInput = z.infer<typeof slotSchema>;
