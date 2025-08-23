/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  readonly CONFIG_BASE_URL: string;
  readonly SANITY_PROJECT_ID: string;
  readonly SANITY_DATASET: string;
  readonly SANITY_API_VERSION: string;
  readonly SANITY_USE_CDN: boolean;
  readonly SANITY_VISUAL_EDITING_ENABLED: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}