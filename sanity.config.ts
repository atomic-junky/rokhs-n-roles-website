import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import { presentationTool } from 'sanity/presentation'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Rokhs & Rôles',
  projectId: import.meta.env.SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  plugins: [structureTool(), presentationTool({
      previewUrl: {
        origin: import.meta.env.BASE_URL,
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
    }),
],
  schema: {
    types: schemaTypes,
  },
})