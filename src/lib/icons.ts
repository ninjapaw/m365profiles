// Build-time favicon / PWA icon generator. Produces SVGs at arbitrary sizes
// in three purposes — square (any), maskable (Android adaptive with safe-zone
// padding), and monochrome (single-color silhouette) — all derived from the
// four-square brand palette in CONFIG.colors. No binary assets, no PNG
// conversion: every icon is an SVG that browsers scale natively, matching
// the favicon trick already used in Base.astro.

import { BRAND } from "@lib/brand";

export type IconPurpose = "any" | "maskable" | "monochrome";

export type IconSpec = {
  size: number;
  purpose?: IconPurpose;
  /** Override monochrome fill color. Defaults to BRAND.blue. */
  monoColor?: string;
};

/**
 * Render the four-square brand mark as an SVG at the requested pixel size.
 *
 * - `any` (default) — the full four-color mark, edge-to-edge.
 * - `maskable` — same mark inside the Android adaptive-icon safe zone
 *   (40% padding, full-bleed brand-blue background) so launcher shapes
 *   don't crop the bars.
 * - `monochrome` — silhouette in a single color for system theming
 *   (notification badges, watch faces).
 */
export function renderIconSvg(spec: IconSpec): string {
  const { size, purpose = "any", monoColor = BRAND.blue } = spec;
  const [sq1, sq2, sq3, sq4] = BRAND.squares;

  if (purpose === "monochrome") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect x="1" y="1" width="10" height="10" fill="${monoColor}"/>
  <rect x="13" y="1" width="10" height="10" fill="${monoColor}"/>
  <rect x="1" y="13" width="10" height="10" fill="${monoColor}"/>
  <rect x="13" y="13" width="10" height="10" fill="${monoColor}"/>
</svg>`;
  }

  if (purpose === "maskable") {
    // Maskable spec: the icon must remain readable inside the inner 80% safe
    // zone (radius 40% from center). We render the mark at ~60% scale on a
    // solid brand-blue background that fills the bleed area.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect width="24" height="24" fill="${BRAND.blue}"/>
  <g transform="translate(5.5,5.5) scale(0.54)">
    <rect x="1" y="1" width="10" height="10" fill="${sq1}"/>
    <rect x="13" y="1" width="10" height="10" fill="${sq2}"/>
    <rect x="1" y="13" width="10" height="10" fill="${sq3}"/>
    <rect x="13" y="13" width="10" height="10" fill="${sq4}"/>
  </g>
</svg>`;
  }

  // purpose: "any"
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
  <rect x="1" y="1" width="10" height="10" fill="${sq1}"/>
  <rect x="13" y="1" width="10" height="10" fill="${sq2}"/>
  <rect x="1" y="13" width="10" height="10" fill="${sq3}"/>
  <rect x="13" y="13" width="10" height="10" fill="${sq4}"/>
</svg>`;
}

/** data: URI form — for inline use in <link rel="icon"> without an extra HTTP request. */
export function renderIconDataUri(spec: IconSpec): string {
  return `data:image/svg+xml,${encodeURIComponent(renderIconSvg(spec))}`;
}

// Canonical icon set referenced by both the dynamic /icons/[slug].svg endpoint
// and the web manifest. Slugs become file names → /icons/<slug>.svg.
export const ICON_SET = Object.freeze({
  "favicon-32": { size: 32, purpose: "any" as const },
  "favicon-192": { size: 192, purpose: "any" as const },
  "favicon-512": { size: 512, purpose: "any" as const },
  "apple-touch-180": { size: 180, purpose: "any" as const },
  "maskable-192": { size: 192, purpose: "maskable" as const },
  "maskable-512": { size: 512, purpose: "maskable" as const },
  "monochrome-512": { size: 512, purpose: "monochrome" as const },
});

export type IconSlug = keyof typeof ICON_SET;

export const ICON_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=86400",
} as const;
