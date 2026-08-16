import type { APIRoute } from "astro";
import { CONFIG } from "@lib/config.js";
import { OG_IMAGE_HEADERS, renderOgImageSvg } from "@lib/og";

// Dynamic default OG card — replaces public/og-image.svg. Rendered from
// CONFIG.colors so forks get a recoloured share card automatically. Also
// referenced by the web manifest as the install icon.
export const GET: APIRoute = () => {
  const spec = CONFIG.social.ogImages.home;
  return new Response(renderOgImageSvg(spec), { headers: OG_IMAGE_HEADERS });
};
