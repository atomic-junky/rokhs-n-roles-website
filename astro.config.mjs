// @ts-nocheck
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro'
import vue  from '@astrojs/vue'
import vercel from '@astrojs/vercel'

import { loadEnv } from "vite";

const { SANITY_PROJECT_ID } = loadEnv(process.env.SANITY_PROJECT_ID, process.cwd(), "");
const { SANITY_DATASET } = loadEnv(process.env.SANITY_DATASET, process.cwd(), "");
const { SANITY_API_VERSION } = loadEnv(process.env.SANITY_API_VERSION, process.cwd(), "");
const { SANITY_USE_CDN } = loadEnv(process.env.SANITY_USE_CDN, process.cwd(), "");


export default defineConfig({
	integrations: [
		sanity({
			projectId: SANITY_PROJECT_ID,
			dataset: SANITY_DATASET || 'production',
			apiVersion: SANITY_API_VERSION || '2022-07-27',
			useCdn: SANITY_USE_CDN || false,
      		studioBasePath: '/admin',
		}),
    	vue(),
	],
	output: 'server',
	adapter: vercel(),
});
