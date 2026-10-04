import type { AstroCookies } from 'astro';

const HELLOASSO_BEARER_TOKEN = import.meta.env.HELLOASSO_BEARER_TOKEN;

const SESSION_COOKIE = 'reservation_session';
const CHALLENGE_COOKIE = 'reservation_challenge';
const SESSION_TTL = 60 * 60 * 24 * 14; // 14 jours
const CHALLENGE_TTL = 60 * 10; // 10 minutes

const cookieOptions = {
	httpOnly: true,
	secure: import.meta.env.PROD,
	sameSite: 'lax' as const,
	path: '/',
};

const encode = (value: string) => btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const decode = (value: string) => atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));

// La clé HMAC est mise en cache : pas besoin de la réimporter à chaque appel.
let cachedKey: Promise<CryptoKey> | null = null;
function getKey() {
	if (!cachedKey) {
		const secret = import.meta.env.RESERVATION_AUTH_SECRET;
		if (!secret) throw new Error('RESERVATION_AUTH_SECRET is not configured');
		cachedKey = crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	}
	return cachedKey;
}

async function signature(value: string) {
	const key = await getKey();
	const result = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
	return encode(String.fromCharCode(...new Uint8Array(result)));
}

async function createToken(value: string, expiresIn: number) {
	const payload = `${value}|${Date.now() + expiresIn * 1000}`;
	return `${encode(payload)}.${await signature(payload)}`;
}

async function readToken(token: string | undefined) {
	if (!token) return null;
	const [encodedPayload, tokenSignature] = token.split('.');
	if (!encodedPayload || !tokenSignature) return null;
	const payload = decode(encodedPayload);
	if ((await signature(payload)) !== tokenSignature) return null;
	const separator = payload.lastIndexOf('|');
	if (separator < 1 || Number(payload.slice(separator + 1)) < Date.now()) return null;
	return payload.slice(0, separator);
}

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export async function getFormSlug() {
    const url: string = `https://api.helloasso.com/v5/directory/forms`;
    const options = {
        method: 'POST',
        headers: {'content-type': 'application/json-patch+json', accept: 'application/json'},
        body: '{"formTypes":["Membership"]}',
        authorization: 'Bearer ' + HELLOASSO_BEARER_TOKEN
    };

    fetch(url, options)
        .then(res => res.json())
        .then(res => {
			const data = res.data[0];
			const record = data.record;
			const formSlug = record.slug;

			return formSlug;
		})
        .catch(err => console.error(err));
}

export function isMemberEmail(email: string) {
    return true;
    
    const organizationSlug = import.meta.env.HELLOASSO_ORGANIZATION_SLUG;
    const formType = 'form';
    const formSlug = getFormSlug();
    const url: string = `https://api.helloasso.com/v5/organizations/${organizationSlug}/forms/${formType}/${formSlug}/payments?userSearchKey=${email}&states=Authorized&states=Registered`;
    const options = {
        method: 'GET',
        headers: {'content-type': 'application/json-patch+json', accept: 'application/json'},
        authorization: 'Bearer ' + HELLOASSO_BEARER_TOKEN
    };

    fetch(url, options)
        .then(res => res.json())
        .then(res => {
			const payments = res.data;
			if (payments.length > 0) {
				return true;
			}
		})
        .catch(err => console.error(err));
    
	return false;
}

export function isAdminEmail(email: string) {
	const allowed = (import.meta.env.RESERVATION_ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
	return allowed.includes(normalizeEmail(email));
}

// A challenge is a temporary token that allows the user to prove they received the code sent by email.

export async function createChallenge(email: string, codeHash: string) {
	return createToken(`${normalizeEmail(email)}|${codeHash}`, CHALLENGE_TTL);
}

async function readChallenge(token: string | undefined) {
	const value = await readToken(token);
	if (!value) return null;
	const separator = value.indexOf('|');
	return separator > 0 ? { email: value.slice(0, separator), codeHash: value.slice(separator + 1) } : null;
}

export function setChallengeCookie(cookies: AstroCookies, token: string) {
	cookies.set(CHALLENGE_COOKIE, token, { ...cookieOptions, maxAge: CHALLENGE_TTL });
}

export function clearChallengeCookie(cookies: AstroCookies) {
	cookies.delete(CHALLENGE_COOKIE, { path: '/' });
}

export function readChallengeCookie(cookies: AstroCookies) {
	return readChallenge(cookies.get(CHALLENGE_COOKIE)?.value);
}


// A session is created after the challenge is verified, and is used to keep the user logged in.

async function createSession(email: string) {
	return createToken(normalizeEmail(email), SESSION_TTL);
}

export async function setSessionCookie(cookies: AstroCookies, email: string) {
	const token = await createSession(email);
	cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL });
}

export async function getReservationSession(cookies: AstroCookies) {
	return readToken(cookies.get(SESSION_COOKIE)?.value);
}

export function clearSessionCookie(cookies: AstroCookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}