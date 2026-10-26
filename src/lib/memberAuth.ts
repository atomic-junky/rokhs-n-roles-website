import type { AstroCookies } from 'astro';
import { RESERVATION_AUTH_SECRET } from 'astro:env/server';
import { getHelloAssoMemberships } from '../utils/helloasso';

const SESSION_COOKIE = 'reservation_session';
const CHALLENGE_COOKIE = 'reservation_challenge';
const SESSION_TTL = 60 * 60 * 24 * 14; // 14 jours
const CHALLENGE_TTL = 60 * 10; // 10 minutes
const ORGANIZATION_EMAIL = "rokhsroles@gmail.com";

const cookieOptions = {
	httpOnly: true,
	secure: import.meta.env.PROD,
	sameSite: 'lax' as const,
	path: '/',
};

const encode = (value: string) => btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const decode = (value: string) => atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));

// La clé HMAC est mise en cache
let cachedKey: Promise<CryptoKey> | null = null;
function getKey() {
	if (!cachedKey) {
		cachedKey = crypto.subtle.importKey('raw', new TextEncoder().encode(RESERVATION_AUTH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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

export async function isMemberFromEmail(email: string) {
	const normalizedEmail = normalizeEmail(email);
	if (normalizedEmail === ORGANIZATION_EMAIL) return true;

	const membershipsPayment = await getHelloAssoMemberships(normalizedEmail);
	return membershipsPayment.length > 0;
}

export function isAdminEmail(email: string) {
	return email == ORGANIZATION_EMAIL
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