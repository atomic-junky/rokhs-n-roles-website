import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';

// 1. Définition directe des schémas Drizzle dans le même fichier
export const rooms = sqliteTable('rooms', {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    location: text('location').notNull(),
    schoolCalendar: integer('school_calendar', { mode: 'boolean' }).notNull(),
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
        date: text('date').notNull(),
        description: text('description').notNull(),
        manager: text('manager').notNull(),
        members: text('members', { mode: 'json' }).$type<string[]>().notNull(),
        createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    },
    (t) => [unique().on(t.availability, t.date)],
);

// 2. Initialisation des clients
const libsqlClient = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
});

const db = drizzle(libsqlClient);

// Conversion des heures "18h" ou "22h30" en minutes depuis minuit
function timeToMinutes(timeStr: string): number {
    const [hoursStr, minutesStr] = timeStr.split('h');
    const hours = parseInt(hoursStr, 10);
    const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;
    return hours * 60 + minutes;
}

async function main() {
    // 3. Création automatique des tables si elles n'existent pas encore
    await libsqlClient.execute(`
        CREATE TABLE IF NOT EXISTS rooms (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            school_calendar INTEGER NOT NULL
        )
    `);

    await libsqlClient.execute(`
        CREATE TABLE IF NOT EXISTS room_availabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL REFERENCES rooms(slug) ON DELETE CASCADE ON UPDATE CASCADE,
            weekday INTEGER NOT NULL,
            start_minute INTEGER NOT NULL,
            end_minute INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            UNIQUE(room, weekday, start_minute)
        )
    `);

    await libsqlClient.execute(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            availability INTEGER NOT NULL REFERENCES room_availabilities(id) ON DELETE RESTRICT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            manager TEXT NOT NULL,
            members TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            UNIQUE(availability, date)
        )
    `);

    // 4. Données brutes à insérer
    const rawRooms = [
        { slug: 'salle-201', name: 'Salle 201', location: 'MDC', availabilities: [5], schoolCalendar: true, from: '18h', to: '22h30' },
        { slug: 'salle-204', name: 'Salle 204', location: 'MDC', availabilities: [5], schoolCalendar: true, from: '18h', to: '22h30' },
        { slug: 'salle-209', name: 'Salle 209', location: 'MDC', availabilities: [5], schoolCalendar: true, from: '18h', to: '22h30' },
        { slug: 'salle-305', name: 'Salle 305', location: 'MDC', availabilities: [5], schoolCalendar: true, from: '18h', to: '22h30' },
        { slug: 'salle-104', name: 'Salle 104', location: 'MDC', availabilities: [6], schoolCalendar: true, from: '13h30', to: '16h30' },
    ];

    // 5. Insertion des salles et créneaux
    for (const room of rawRooms) {
        await db.insert(rooms).values({
            slug: room.slug,
            name: room.name,
            location: room.location,
            schoolCalendar: room.schoolCalendar,
        }).onConflictDoNothing();

        for (const weekday of room.availabilities) {
            await db.insert(roomAvailabilities).values({
                room: room.slug,
                weekday,
                startMinute: timeToMinutes(room.from),
                endMinute: timeToMinutes(room.to),
            }).onConflictDoNothing();
        }
    }

    // 6. Récupération du créneau pour la salle 204
    const [s204Availability] = await db
        .select({ id: roomAvailabilities.id })
        .from(roomAvailabilities)
        .where(eq(roomAvailabilities.room, 'salle-204'))
        .limit(1);

    if (s204Availability) {
        await db.insert(reservations).values({
            availability: s204Availability.id,
            date: '2026-10-01',
            description: 'Soirée 7 Wonders',
            manager: 'David',
            members: ['Lucile', 'Arthur', 'Soleïa'],
        }).onConflictDoNothing();
    }

    console.log('Base de données initialisée et pré-remplie.');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});