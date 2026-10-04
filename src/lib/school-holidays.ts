const ZONE = 'Zone C';
const ENDPOINT = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type Holiday = { start: string; end: string }; // 'YYYY-MM-DD'

type ApiRecord = { description?: string; population?: string; start_date?: string; end_date?: string };

const parisDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }); // 'YYYY-MM-DD'
const toParisDay = (iso: string) => parisDay.format(new Date(iso));

let cache: { at: number; holidays: Holiday[] } | null = null;

export async function getSchoolHolidays(): Promise<Holiday[]> {
	if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.holidays;

	const params = new URLSearchParams({
		select: 'description,population,start_date,end_date',
		limit: '100',
		order_by: 'start_date desc',
		timezone: 'Europe/Paris',
	});
	params.append('refine', `zones:"${ZONE}"`);

	try {
		const response = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(5000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const { results } = (await response.json()) as { results: ApiRecord[] };

		const holidays = results
			.filter((r) => /^vacances/i.test(r.description ?? '') && r.population !== 'Enseignants')
			.filter((r) => r.start_date && r.end_date)
			.map((r) => ({ start: toParisDay(r.start_date!), end: toParisDay(r.end_date!) }));

		cache = { at: Date.now(), holidays };
		return holidays;
	} catch (error) {
		console.error('School Calendar :', error);
		return cache?.holidays ?? [];
	}
}

function _isSchoolHolidayCommon (day: string, holidays: Holiday[]) {
	return holidays.some((holiday) => day >= holiday.start && day < holiday.end);
}

export function isSchoolHoliday (day: string, holidays: Holiday[]) {
	return _isSchoolHolidayCommon(day, holidays);
}

export function isSchoolHolidayMDC (day: string, end_minute: number, holidays: Holiday[]) {
	// Horraires MDC pendant les vacances scolaires : 9h-18h en semaine, fermée le week-end
	const date = new Date(day);
	const isSchoolHoliday: boolean = _isSchoolHolidayCommon(day, holidays);

	const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 = Sunday, 6 = Saturday
	if (isWeekend)
		return isSchoolHoliday;

	if (isSchoolHoliday) {
		if (end_minute <= 18 * 60) {
			return true;
		}
	}

	return false;
}