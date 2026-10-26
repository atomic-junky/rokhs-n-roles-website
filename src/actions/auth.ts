import { z } from "astro/zod"
import { ActionError, defineAction } from "astro:actions"
import { Resend, type CreateEmailResponse } from 'resend';
import { clearChallengeCookie, createChallenge, isMemberFromEmail, normalizeEmail, readChallengeCookie, setChallengeCookie, setSessionCookie } from "../lib/memberAuth";
import { internalError, success, unauthorized } from "../utils/action";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

async function sendCodeEmail(email: string, code: string): Promise<CreateEmailResponse> {
	return await resend.emails.send({
        from: 'Rokhs & Rôles <no-reply@rokhsnroles.fr>',
        to: email,
        subject: 'Votre code de connexion',
		html: `
			<div style="font-family: sans-serif; max-width: 480px; margin: auto;">
				<h2>Votre code de connexion</h2>
				<p>Voici votre code à usage unique, valable 10 minutes :</p>
				<p style="font-size:32px;font-weight:700;letter-spacing:0.2em;">${code}</p>
				<p style="color:#666;font-size:12px;margin-top:24px;">
					Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
				</p>
			</div>
		`.trim(),
    });
}

async function hashCode(code: string): Promise<string> {
	const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const sendVerificationEmail = defineAction({
    accept: 'form',
    input: z.object({
        email: z.email('Adresse e-mail invalide.'),
    }),
    handler: async ({ email }, { cookies }) => {
        const normalized = normalizeEmail(email);

        const successResponse = success('Si cette adresse email est lié à un adhérent, un code connexion y sera envoyé.');
        const isMember = await isMemberFromEmail(normalized).catch(err => {
            console.error('Error checking membership status:', err);
            return internalError("Une erreur interne est survenue lors de la vérification de l'adhésion. Veuillez réessayer plus tard ou contacter l'administrateur.");
        });
        
        if (isMember instanceof ActionError) return isMember;
        if (!isMember) return successResponse;

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await hashCode(code);

        const challengeToken = await createChallenge(normalized, codeHash);
        setChallengeCookie(cookies, challengeToken);

        try {
            await sendCodeEmail(normalized, code);
        } catch (err) {
			throw internalError("Impossible d'envoyer l'email de vérification.");
		}

        return successResponse;
    }
})

export const verifyLoginCode = defineAction({
    accept: 'form',
    input: z.object({
		code: z.string().regex(/^[0-9]{6}$/, 'Le code doit contenir 6 chiffres.'),
	}),
    handler: async ({ code }, { cookies }) => {
        const challenge = await readChallengeCookie(cookies);
        if (!challenge) {
            throw unauthorized('La session a expiré, veuillez réessayer.');
        }

        const inputHash = await hashCode(code.trim());
        if (challenge.codeHash !== inputHash) {
            throw unauthorized('Le code est incorrect, veuillez réessayer.');
        }

        clearChallengeCookie(cookies);
        await setSessionCookie(cookies, challenge.email);
        return success('Connexion réussie !');
    }
})