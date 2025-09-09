// /schemas/header.ts
import { defineType, defineField } from 'sanity'
import { LinkIcon } from '@sanity/icons'

export default defineType({
  name: 'header',
  title: 'Header',
  type: 'document',
  fields: [
    defineField({
        name: 'title',
        title: 'Titre',
        description: 'Le titre du header (n\'apparait nul part).',
        type: 'string',
        validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'links',
      title: 'Liens du menu',
      type: 'array',
      of: [
        {
          type: 'object',
          icon: LinkIcon,
          fields: [
            defineField({
                name: 'title',
                title: 'Titre',
                description: 'Le titre du lien.',
                type: 'string',
                validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'linkType',
              title: 'Type de lien',
              type: 'string',
              options: {
                list: [
                  { title: 'Page Sanity', value: 'page' },
                  { title: 'Lien custom', value: 'custom' },
                ],
                layout: 'radio',
              },
              initialValue: 'page',
            }),
            defineField({
              name: 'page',
              title: 'Page',
              type: 'reference',
              to: [{ type: 'page' }],
              hidden: ({ parent }) => parent?.linkType !== 'page',
            }),
            defineField({
                name: 'slug',
                title: 'Slug',
                description: 'L\'URL de la page. (e.g. https://rohks-n-roles.fr/<slug>)',
                initialValue: '', 
                type: 'string',
                hidden: ({ parent }) => parent?.linkType !== 'custom',
            }),
          ]
        },
      ],
    }),
  ],
})
