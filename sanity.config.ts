// Different environments use different variables
const projectId = import.meta.env.PUBLIC_SANITY_STUDIO_PROJECT_ID! || import.meta.env.PUBLIC_SANITY_PROJECT_ID!;
const dataset = import.meta.env.PUBLIC_SANITY_STUDIO_DATASET! || import.meta.env.PUBLIC_SANITY_DATASET!;

// Feel free to remove this check if you don't need it
if (!projectId || !dataset) {
  throw new Error(
    `Missing environment variable(s). Check if named correctly in .env file.\n\nShould be:\nPUBLIC_SANITY_STUDIO_PROJECT_ID=${projectId}\nPUBLIC_SANITY_STUDIO_DATASET=${dataset}\n\nAvailable environment variables:\n${JSON.stringify(
      import.meta.env,
      null,
      2,
    )}`,
  );
}

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// import { loadEnv } from "vite";


// const { SANITY_PROJECT_ID } = loadEnv(process.env.SANITY_PROJECT_ID ?? "", process.cwd(), "");
// const { SANITY_DATASET } = loadEnv(process.env.SANITY_DATASET ?? "", process.cwd(), "");
// const { SANITY_API_VERSION } = loadEnv(process.env.SANITY_API_VERSION ?? "", process.cwd(), "");
// const { SANITY_USE_CDN } = loadEnv(process.env.SANITY_USE_CDN ?? "", process.cwd(), "");


export default defineConfig({
  name: 'default',
  title: 'Rokhs & Rôles',

  projectId,
  dataset,

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
})