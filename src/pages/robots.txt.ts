import type { APIRoute } from "astro";
import { baseUrl, siteOrigin } from "@lib/paths";

// Dynamic robots.txt — uses the site origin + Astro base path so forks and
// custom domains "just work" without editing a static file.
export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const baseRaw = baseUrl();
  const base = baseRaw.length > 0 ? `${baseRaw}/` : "/";
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}${base}sitemap-index.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
