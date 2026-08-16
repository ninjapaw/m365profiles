// Shared link list for nav, footer, sitemap helpers.
import type { APIContext } from "astro";
import { GITHUB_URL, SITE_BASE_FALLBACK } from "@lib/site";
import { CONFIG } from "./config.js";

export type NavLink = { href: string; label: string; external?: boolean };

export function siteLinks(base: string): NavLink[] {
  const b = base.replace(/\/$/, "");
  return [
    { href: `${b}/`, label: "Home" },
    { href: `${b}/assessment`, label: "Assessment" },
    { href: `${b}/profiles`, label: "Profiles" },
    { href: `${b}/reference`, label: "Reference" },
    { href: `${b}/about`, label: "About" },
  ];
}

export function externalSources(): NavLink[] {
  return CONFIG.externalSources.map((s) => ({
    href: s.href,
    label: s.label,
    external: true,
  }));
}

export function repoLinks(): NavLink[] {
  return [
    { href: GITHUB_URL, label: "GitHub", external: true },
    { href: `${GITHUB_URL}/issues`, label: "Issues", external: true },
    { href: `${GITHUB_URL}/blob/main/LICENSE`, label: "MIT License", external: true },
    { href: `${GITHUB_URL}/blob/main/SECURITY.md`, label: "Security policy", external: true },
  ];
}

export function baseFromContext(ctx: Pick<APIContext, "site">): string {
  return ctx.site?.pathname.replace(/\/$/, "") ?? SITE_BASE_FALLBACK;
}
