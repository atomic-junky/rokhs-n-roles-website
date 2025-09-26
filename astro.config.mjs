import { defineConfig } from 'astro/config';
import purgecss from 'astro-purgecss';
import icon from "astro-icon";
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { imageService } from "@unpic/astro/service";

import { loadEnv } from "vite";

const { CONFIG_BASE_URL } = loadEnv(process.env.CONFIG_BASE_URL, process.cwd(), "")
const { SANITY_PROJECT_ID } = loadEnv(process.env.SANITY_PROJECT_ID ?? "", process.cwd(), "");
const { SANITY_DATASET } = loadEnv(process.env.SANITY_DATASET ?? "", process.cwd(), "");
// const { SANITY_API_VERSION } = loadEnv(process.env.SANITY_API_VERSION ?? "", process.cwd(), "");
const { SANITY_USE_CDN } = loadEnv(process.env.SANITY_USE_CDN ?? "", process.cwd(), "");


export default defineConfig({
  integrations: [sanity({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET || 'production',

      useCdn: SANITY_USE_CDN || false,
      studioBasePath: '/admin',   
      }),
      purgecss({
        fontFace: true,
        keyframes: true,
        content: [
          process.cwd() + '/src/**/*.{astro}'
        ],
      }),
      icon(),
      react(),
  ],
  image: {
    service: imageService({
      placeholder: "blurhash",
      layout: "constrained",
    }),
  },
  site: CONFIG_BASE_URL,
  output: 'server',
  adapter: netlify(),
});