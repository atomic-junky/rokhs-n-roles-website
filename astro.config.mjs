import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';

import { loadEnv } from "vite";


import netlify from '@astrojs/netlify';


const { SANITY_PROJECT_ID } = loadEnv(process.env.SANITY_PROJECT_ID, process.cwd(), "");
const { SANITY_DATASET } = loadEnv(process.env.SANITY_DATASET, process.cwd(), "");
const { SANITY_API_VERSION } = loadEnv(process.env.SANITY_API_VERSION, process.cwd(), "");
const { SANITY_USE_CDN } = loadEnv(process.env.SANITY_USE_CDN, process.cwd(), "");


// export default defineConfig({
//     integrations: [sanity({
//         projectId: SANITY_PROJECT_ID,
//         dataset: SANITY_DATASET || 'production',

//         useCdn: SANITY_USE_CDN || false,
//         studioBasePath: '/admin',   
// 		}),
//         react()
//     ],
// });

export default defineConfig({
  integrations: [sanity({
      projectId: 'iqveg3px',
      dataset: 'production',

      useCdn: false,
      studioBasePath: '/admin',   
      }),
      react()
  ],

  adapter: netlify(),
});