import type { APIRoute } from "astro";
import { BRAND } from "@lib/brand";
import { baseUrl } from "@lib/paths";
import { CONFIG } from "@lib/config.js";

// Dynamic web app manifest so the base path + name stay in sync with the brand
// constants and forks don't have to maintain a separate static file.
export const GET: APIRoute = () => {
  const baseRaw = baseUrl();
  const start = baseRaw.length > 0 ? `${baseRaw}/` : "/";
  const icon = (slug: string, sizes: string, purpose: string) => ({
    src: `${start}icons/${slug}.svg`,
    sizes,
    type: "image/svg+xml",
    purpose,
  });
  const body = {
    name: `${BRAND.name}${CONFIG.titleSeparator}${BRAND.tagline}`,
    short_name: BRAND.name,
    description: CONFIG.manifest.description,
    start_url: start,
    scope: start,
    id: start,
    lang: CONFIG.language,
    dir: CONFIG.direction,
    display: CONFIG.manifest.display,
    orientation: CONFIG.manifest.orientation,
    background_color: CONFIG.manifest.backgroundColor,
    theme_color: BRAND.blue,
    // SVG icons scale to any size; we still advertise discrete `sizes` so
    // installers can pick the right slot. Purposes per W3C manifest spec:
    //   any        → home-screen / app-list (no masking)
    //   maskable   → Android adaptive icons (safe-zone padded)
    //   monochrome → system theming (notification badges, watch faces)
    icons: [
      icon("favicon-192", "192x192", "any"),
      icon("favicon-512", "512x512", "any"),
      icon("maskable-192", "192x192", "maskable"),
      icon("maskable-512", "512x512", "maskable"),
      icon("monochrome-512", "512x512", "monochrome"),
    ],
    shortcuts: [
      {
        name: "Start assessment",
        short_name: "Assessment",
        description: "Run the Microsoft 365 licensing decision tree",
        url: `${start}assessment`,
        icons: [icon("favicon-192", "192x192", "any")],
      },
      {
        name: "Reference catalog",
        short_name: "Reference",
        description: "Browse every recommendation the tree can produce",
        url: `${start}reference`,
        icons: [icon("favicon-192", "192x192", "any")],
      },
    ],
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
};
