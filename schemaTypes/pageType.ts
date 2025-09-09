import { TextIcon } from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
	name: 'page',
	type: 'document',
	title: 'Page',
	fields: [
		defineField({
			name: 'title',
			title: 'Titre',
			description: 'Le titre de la page.',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			description: 'L\'URL de la page. (e.g. https://rohks-n-roles.fr/<slug>)',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'banner',
			title: 'Bannière',
			description: 'Image de bannière pour la page. Elle sera affichée en haut de la page.',
			type: 'image',
			options: {hotspot: true},
			fields: [
				defineField({
					name: 'alt',
					type: 'string',
					title: 'Description de l\'image',
				}),
			],
		}),
		defineField({
			name: 'sections',
			title: 'Sections',
			description: 'Ajoutez des sections de contenu à la page. Vous pouvez ajouter du texte, des images, des vidéos, etc.',
			type: 'array',
			of: [
				defineArrayMember({
					name: 'textSection',
					title: 'Section de texte',
					type: 'textSection',
				}),
				defineArrayMember({
					name: 'gallery',
					title: 'Galerie d\'images',
					type: 'gallery',
				}),
				defineArrayMember({
					name: 'video',
					title: 'Vidéo',
					type: 'video',
				}),
			],
		}),
  	],
	preview: {
		select: {
			title: 'title'
		}
	}
})