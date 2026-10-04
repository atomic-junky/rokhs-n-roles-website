import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import { imageService } from "@unpic/astro/service";

// Load .env file using Vite (if not already loaded by process)
import { loadEnv } from "vite";
const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");

export default defineConfig({
  integrations: [sanity({
      projectId: env.PUBLIC_SANITY_STUDIO_PROJECT_ID || env.SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID,
      dataset: env.PUBLIC_SANITY_STUDIO_DATASET || env.SANITY_DATASET || process.env.SANITY_DATASET || 'production',

      useCdn: (env.SANITY_USE_CDN || process.env.SANITY_USE_CDN) === 'true' ? true : false,
      studioBasePath: '/admin',   
      }),
      icon(),
      react(),
  ],
  image: {
    domains: ["cdn.sanity.io"],
    service: imageService({
      placeholder: "blurhash",
      layout: "constrained",
    }),
  },
  prefetch: {
    prefetchAll: true,
      defaultStrategy: "viewport"
  },
  site: env.CONFIG_BASE_URL || process.env.CONFIG_BASE_URL,
  output: 'server',
  adapter: netlify(),
    vite: {
    server: {
      watch: { ignored: ['**/*.db*', '**/*.sqlite*'] },
    },
  },
});