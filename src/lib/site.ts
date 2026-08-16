// Derived site-wide constants and helpers. Edit values in src/lib/config.js.

import { BRAND } from "@lib/brand";
import { APP_VERSION } from "@lib/version";
import { CONFIG } from "./config.js";

export const SITE_ORIGIN_FALLBACK = CONFIG.origin;
export const SITE_BASE_FALLBACK = CONFIG.base;
export const GITHUB_URL = `https://github.com/${CONFIG.repo}`;

export function repoFileUrl(path: string, branch: string = CONFIG.defaultBranch): string {
  const clean = path.replace(/^\/+/, "");
  return `${GITHUB_URL}/blob/${branch}/${clean}`;
}

export function repoSubUrl(suffix: string): string {
  const clean = suffix.replace(/^\/+/, "");
  return `${GITHUB_URL}/${clean}`;
}

export function pageTitle(section: string): string {
  return `${section}${CONFIG.titleSeparator}${BRAND.name}`;
}

export const HOME_TITLE = `${BRAND.name}${CONFIG.titleSeparator}${BRAND.tagline}`;

export const STORAGE_KEYS = Object.freeze({
  theme: CONFIG.storage.theme,
  knownVersion: CONFIG.storage.knownVersion,
  assessmentState: `${CONFIG.storage.assessmentStatePrefix}:${APP_VERSION}`,
});
