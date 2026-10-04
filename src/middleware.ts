import { defineMiddleware } from 'astro:middleware';
import { getReservationSession } from './lib/reservation-auth';
 
const PROTECTED_PREFIX = ['/member'];
const PUBLIC_PREFIX = ['/member/login', '/member/logout'];
const LOGIN_PATH = '/login';
 
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	for (const prefix of PUBLIC_PREFIX) {
		if (pathname.startsWith(prefix)) {
			return next();
		}
	}
	
	let isProtected = false;
	for (const protectedPrefix of PROTECTED_PREFIX) {
		if (isProtected) {
			isProtected = pathname.startsWith(protectedPrefix) && pathname !== LOGIN_PATH;
		}
	}
 
	if (isProtected) {
		const session = await getReservationSession(context.cookies);
 
		if (!session) {
			const redirectTarget = `${LOGIN_PATH}?redirect=${encodeURIComponent(pathname + context.url.search)}`;
            console.log(`Redirecting to login: ${redirectTarget}`);
			return context.redirect(redirectTarget);
		}
 
		context.locals.memberEmail = session;
	}
 
	return next();
});
 