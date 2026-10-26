import { defineMiddleware } from 'astro:middleware';
import { getReservationSession, isAdminEmail } from './lib/memberAuth';

const PROTECTED_PREFIXES = ['/adherent'];
const PUBLIC_PREFIXES = ['/adherent/login', '/adherent/logout'];
const LOGIN_PATH = '/adherent/login';
const ADMIN_SUFFIXES = ['/admin', '/edit'];

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname, search } = context.url;

	const isPublic = PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
	const isProtected = !isPublic && PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
	const isAdminProtected = ADMIN_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
	if (!isProtected) return next();

	const session = await getReservationSession(context.cookies);
	if (!session) return context.redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(pathname + search)}`);

	const isAdmin = await isAdminEmail(session);
	if (!isAdmin && isAdminProtected) return context.rewrite('/404');

	context.locals.memberEmail = session;

	const response = await next();
	response.headers.set('Cache-Control', 'no-store');
	return response;
});