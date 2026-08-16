import type { APIRoute } from "astro";
import { ICON_HEADERS, renderIconSvg } from "@lib/icons";

// Canonical favicon endpoint. Modern browsers prefer rel="icon" SVG over
// .ico when both are advertised; the inline data-URI in Base.astro still
// loads first (zero round-trip) but this file URL exists for crawlers,
// scrapers, and tooling that fetch /favicon.svg by convention.
export const GET: APIRoute = () => {
  return new Response(renderIconSvg({ size: 32, purpose: "any" }), { headers: ICON_HEADERS });
};
