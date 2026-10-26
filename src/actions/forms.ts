import { z } from 'astro/zod';
import { defineAction } from 'astro:actions';

export const registerSession = defineAction({
	accept: 'form',
	input: z.object({
		responsible: z.string().nonempty('Le nom du responsable est obligatoire.'),
		participants: z.string(),
        roomName: z.string().nonempty('Le nom de la salle est obligatoire.'),
        sessionStart: z.iso.time('L’heure de début de session est obligatoires.'),
	}),
	handler: async ({ responsible, participants, roomName, sessionStart }) => {
		const submittedAt = new Date().toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});

		const participantsList = participants
            .replace(',', '\n')
			.split('\n')
			.map((p) => p.trim())
			.filter(Boolean);

		const sessionData = {
			id: crypto.randomUUID(),
			submittedAt,
			responsible,
			participants: participantsList,
            roomName,
            sessionStart,
		};

		return { success: true, session: sessionData };
	},
});