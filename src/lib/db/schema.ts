import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('rooms', {
	slug: text('slug').primaryKey(),
	name: text('name').notNull(),
	location: text('location').notNull(),
	schoolCalendar: integer('school_calendar', { mode: 'boolean' }).notNull(), // Only allow reservations on school days
});

export const roomAvailabilities = sqliteTable(
	'room_availabilities',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		room: text('room')
			.notNull()
			.references(() => rooms.slug, { onDelete: 'cascade', onUpdate: 'cascade' }),
		weekday: integer('weekday').notNull(),
		startMinute: integer('start_minute').notNull(),
		endMinute: integer('end_minute').notNull(),
		active: integer('active', { mode: 'boolean' }).notNull().default(true),
	},
	(t) => [unique().on(t.room, t.weekday, t.startMinute)],
);

export const reservations = sqliteTable(
	'reservations',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		availability: integer('availability')
			.notNull()
			.references(() => roomAvailabilities.id, { onDelete: 'restrict' }),
		date: text('date').notNull(), // 'YYYY-MM-DD'
		description: text('description').notNull(),
		manager: text('manager').notNull(),
		members: text('members', { mode: 'json' }).$type<string[]>().notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	},
	(t) => [unique().on(t.availability, t.date)],
);