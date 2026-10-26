/// <reference types="astro/client" />
/// <reference types="@sanity/astro/module" />

interface ImportMetaEnv {
  readonly CONFIG_BASE_URL: string;
  readonly SANITY_PROJECT_ID: string;
  readonly SANITY_DATASET: string;
  readonly SANITY_API_VERSION: string;
  readonly SANITY_USE_CDN: boolean;
  readonly SANITY_VISUAL_EDITING_ENABLED: boolean;
  readonly RESERVATION_AUTH_SECRET: string;
  readonly RESERVATION_MEMBER_EMAILS: string;
  readonly RESERVATION_ADMIN_EMAILS: string;
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL: string;
  readonly HELLOASSO_API_ENDPOINT: string;
  readonly HELLOASSO_CLIENT_ID: string;
  readonly HELLOASSO_CLIENT_SECRET: string;
  readonly HELLOASSO_ENDPOINT: string;
  readonly HELLOASSO_ORGANIZATION_SLUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
	interface Locals {
		memberEmail?: string;
	}
}