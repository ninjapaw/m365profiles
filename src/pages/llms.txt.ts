import type { APIRoute } from "astro";
import { BRAND } from "@lib/brand";
import { baseUrl, siteOrigin } from "@lib/paths";
import { CONFIG } from "@lib/config.js";

// Dynamic /llms.txt — the emerging convention (https://llmstxt.org) for
// pointing LLM crawlers at a concise, machine-friendly summary of the site.
// Mirrors the philosophy of the dynamic robots.txt / sitemap / manifest:
// generated from CONFIG so forks and custom domains stay in sync without
// editing a static file.
export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const baseRaw = baseUrl();
  const home = `${origin}${baseRaw.length > 0 ? `${baseRaw}/` : "/"}`;
  const link = (path: string) => `${origin}${baseRaw}${path}`;

  const body = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.tagline}. ${CONFIG.defaultDescription}`,
    "",
    `Site: ${home}`,
    `Owner: ${BRAND.owner}`,
    `Repository: https://github.com/${BRAND.repo}`,
    `License: MIT`,
    "",
    "## Notes for LLM crawlers",
    "",
    "- This is an independent community helper, not official Microsoft guidance.",
    "- The decision tree, every question, and every recommendation cite Microsoft Learn",
    "  or another primary source. The Microsoft Product Terms are the source of truth.",
    "- Trademarks (Microsoft, Microsoft 365, Entra, Defender, Purview, Intune, Teams,",
    "  Copilot, etc.) are used nominatively to identify the products discussed.",
    "- The site is fully static. No accounts, no telemetry, no runtime AI calls.",
    "",
    "## Primary pages",
    "",
    `- [Home](${link("/")}) — overview and pillars`,
    `- [Assessment](${link("/assessment")}) — interactive decision tree`,
    `- [Profiles](${link("/profiles")}) — the eight identity profiles supported`,
    `- [Reference](${link("/reference")}) — static catalog of every recommendation`,
    `- [About](${link("/about")}) — methodology, sources, trademark notice`,
    "",
    "## Machine-readable",
    "",
    `- Sitemap: ${link("/sitemap-index.xml")}`,
    `- Manifest: ${link("/manifest.webmanifest")}`,
    `- Version: ${link("/version.json")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
