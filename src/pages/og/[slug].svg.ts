import type { APIRoute, GetStaticPaths } from "astro";
import { CONFIG } from "@lib/config.js";
import { OG_IMAGE_HEADERS, renderOgImageSvg, type OgImageSpec } from "@lib/og";

// One SVG card per entry in CONFIG.social.ogImages → /og/<slug>.svg.
// Pages opt in by passing `ogImageSlug` to <Base>; the layout then sets
// og:image / twitter:image to this URL. Build-time only — no runtime calls.
export const getStaticPaths: GetStaticPaths = () => {
  return Object.entries(CONFIG.social.ogImages).map(([slug, spec]) => ({
    params: { slug },
    props: { spec: spec as OgImageSpec },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { spec } = props as { spec: OgImageSpec };
  return new Response(renderOgImageSvg(spec), { headers: OG_IMAGE_HEADERS });
};
