import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from './db/client';
import { rooms as roomsTable, roomAvailabilities, reservations as reservationsTable } from './db/schema';
import { getSchoolHolidays, isSchoolHoliday, isSchoolHolidayMDC } from './schoolHolidays';

export type Room = typeof roomsTable.$inferSelect;
export type Availability = typeof roomAvailabilities.$inferSelect;
export type Reservation = typeof reservationsTable.$inferSelect;

export type DaySlot = { availability: Availability; reservation?: Reservation };
export type DayStatus = 'empty' | 'closed' | 'past' | 'available' | 'reserved';
export type DayInfo = {
	date: Date;
	key: string; // 'YYYY-MM-DD'
	status: DayStatus;
	closed: boolean;
	slots: DaySlot[];
	time: string;
	description?: string;
};

export const dateParameter = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const weekdayOf = (date: Date) => (date.getDay() + 6) % 7;

const formatMinutes = (minutes: number) =>
	`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const formatSlot = (slot: Availability) => `${formatMinutes(slot.startMinute)} - ${formatMinutes(slot.endMinute)}`;

type LoadOptions = { from: string; to: string; roomSlug?: string };

export async function loadBooking({ from, to, roomSlug }: LoadOptions) {
	const [rooms, allSlots, booked, holidays] = await Promise.all([
		roomSlug ? db.select().from(roomsTable).where(eq(roomsTable.slug, roomSlug)) : db.select().from(roomsTable),
		db.select().from(roomAvailabilities).where(eq(roomAvailabilities.active, true)),
		db.select().from(reservationsTable).where(and(gte(reservationsTable.date, from), lte(reservationsTable.date, to))),
		getSchoolHolidays(),
	]);

	const reservationByKey = new Map(booked.map((r) => [`${r.availability}|${r.date}`, r]));

	const weeklySlots = (room: Room) =>
		allSlots.filter((s) => s.room === room.slug).sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);

	const getDay = (room: Room, date: Date): DayInfo => {
		const key = dateParameter(date);
		const openSlots = weeklySlots(room).filter((s) => s.weekday === weekdayOf(date));
		const past = key < dateParameter(new Date());
		const isMdc = room.location.toLowerCase() === 'mdc';

		const isClosed = (slot: Availability) =>
			isMdc
				? isSchoolHolidayMDC(key, slot.startMinute, slot.endMinute, holidays)
				: room.schoolCalendar && isSchoolHoliday(key, holidays);

		const bookable = openSlots.filter((slot) => !isClosed(slot));
		const closed = openSlots.length > 0 && bookable.length === 0;
		const slots: DaySlot[] = bookable.map((availability) => ({
			availability,
			reservation: reservationByKey.get(`${availability.id}|${key}`),
		}));

		const status: DayStatus = openSlots.length === 0
			? 'empty'
			: past
				? 'past'
				: closed
					? 'closed'
					: slots.every((s) => s.reservation)
						? 'reserved'
						: 'available';
		const descriptions = slots.flatMap((s) => (s.reservation ? [s.reservation.description] : []));

		return {
			date,
			key,
			status,
			closed,
			slots,
			time: slots.map((s) => formatSlot(s.availability)).join(' · '),
			description: descriptions.length ? descriptions.join(' · ') : undefined,
		};
	};

	return { rooms, weeklySlots, getDay };
}

export const loadRooms = async () => db.select().from(roomsTable);
export const loadAvailabilities = async (roomSlug: string) => db.select().from(roomAvailabilities).where(eq(roomAvailabilities.room, roomSlug));