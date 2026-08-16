// Build-time Open Graph image generator. Produces 1200×630 SVG cards from
// CONFIG.colors + a per-page text spec. No runtime calls, no binary assets —
// the favicon trick (data-URI SVG retinted from CONFIG.squares) extended to
// share cards. Used by:
//   - src/pages/og-image.svg.ts   (default card, also referenced by manifest)
//   - src/pages/og/[slug].svg.ts  (per-page cards, one per CONFIG.social.ogImages key)

import { BRAND } from "@lib/brand";
import { CONFIG } from "@lib/config.js";

export type OgImageSpec = {
  eyebrow?: string;
  headline: string;
  subline?: string;
};

const FONT_STACK = "Segoe UI, Helvetica, Arial, sans-serif";

// Lightweight word-wrap: greedy fill up to `maxCharsPerLine`, hard cap at
// `maxLines`. Trailing overflow gets an ellipsis. Good enough for headline-
// style copy authored in CONFIG; not a general typographic wrapper.
function wrap(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = `${last.replace(/[.,;:!?]+$/, "")}…`;
  }
  return lines;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a 1200×630 OG card SVG. Colors come from CONFIG.colors so a fork
 * gets recoloured share cards for free; text comes from the per-page spec.
 */
export function renderOgImageSvg(spec: OgImageSpec): string {
  const width = CONFIG.social.ogImageWidth;
  const height = CONFIG.social.ogImageHeight;
  const [sq1, sq2, sq3, sq4] = BRAND.squares;
  const blue = BRAND.blue;
  const navy = BRAND.navy;

  const eyebrow = spec.eyebrow ? escapeXml(spec.eyebrow.toUpperCase()) : "";
  const headlineLines = wrap(spec.headline, 24, 3).map(escapeXml);
  const sublineLines = spec.subline ? wrap(spec.subline, 60, 2).map(escapeXml) : [];

  const headlineStartY = 320;
  const headlineLineH = 80;
  const headlineEndY = headlineStartY + (headlineLines.length - 1) * headlineLineH;
  const sublineStartY = headlineEndY + 70;

  const headlineTspans = headlineLines
    .map((line, i) => `<tspan x="80" y="${headlineStartY + i * headlineLineH}">${line}</tspan>`)
    .join("");
  const sublineTspans = sublineLines
    .map((line, i) => `<tspan x="80" y="${sublineStartY + i * 36}">${line}</tspan>`)
    .join("");

  const brandName = escapeXml(BRAND.name);
  const tagline = escapeXml(`${BRAND.tagline} · Unofficial`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(CONFIG.social.ogImageAlt)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eff6fc"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="ruleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${sq1}"/>
      <stop offset="33%" stop-color="${sq4}"/>
      <stop offset="66%" stop-color="${sq2}"/>
      <stop offset="100%" stop-color="${sq3}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <g transform="translate(80, 80)">
    <rect width="44" height="44" fill="${sq1}"/>
    <rect x="52" width="44" height="44" fill="${sq2}"/>
    <rect y="52" width="44" height="44" fill="${sq3}"/>
    <rect x="52" y="52" width="44" height="44" fill="${sq4}"/>
  </g>
  <text x="180" y="120" font-family="${FONT_STACK}" font-size="38" font-weight="700" fill="${blue}">${brandName}</text>
  <text x="180" y="155" font-family="${FONT_STACK}" font-size="20" fill="#605e5c">${tagline}</text>
  ${eyebrow ? `<text x="80" y="240" font-family="${FONT_STACK}" font-size="22" font-weight="700" fill="${blue}" letter-spacing="2">${eyebrow}</text>` : ""}
  <text font-family="${FONT_STACK}" font-size="72" font-weight="700" fill="${navy}">${headlineTspans}</text>
  ${sublineLines.length > 0 ? `<text font-family="${FONT_STACK}" font-size="26" fill="#424242">${sublineTspans}</text>` : ""}
  <rect x="0" y="${height - 18}" width="${width}" height="18" fill="url(#ruleGrad)"/>
</svg>
`;
}

export const OG_IMAGE_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;
