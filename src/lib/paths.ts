// URL / path helpers — pure; safe to import from .astro, .ts, and client code.

import { SITE_ORIGIN_FALLBACK } from "@lib/site";

export function baseUrl(): string {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
}

export function withBase(path: string): string {
  const b = baseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export function siteOrigin(astroSite?: URL): string {
  return (astroSite ?? new URL(SITE_ORIGIN_FALLBACK)).origin;
}

export function canonicalUrl(pathname: string, astroSite?: URL): string {
  return new URL(pathname, astroSite ?? SITE_ORIGIN_FALLBACK).toString();
}

export function homeUrl(astroSite?: URL): string {
  return `${siteOrigin(astroSite)}${baseUrl()}/`;
}
