import {TextIcon} from '@sanity/icons'
import {defineField, defineArrayMember} from 'sanity'


export default defineArrayMember({
    name: 'textSection',
    title: 'Section de texte',
    icon: TextIcon,
    type: 'object',
    fields: [
        defineField({
            name: 'content',
            title: 'Contenu',
            type: 'blockContent',
        }),
    ],
    preview: {
        select: {
            title: 'content[0].children[0].text',
        },
    },
})