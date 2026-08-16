import type { APIRoute, GetStaticPaths } from "astro";
import { ICON_HEADERS, ICON_SET, renderIconSvg, type IconSpec } from "@lib/icons";

// One SVG per entry in ICON_SET → /icons/<slug>.svg. The web manifest and
// Base.astro both reference these URLs so adding a new size means editing
// ICON_SET only — no static asset files to keep in sync.
export const getStaticPaths: GetStaticPaths = () => {
  return Object.entries(ICON_SET).map(([slug, spec]) => ({
    params: { slug },
    props: { spec: spec as IconSpec },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const { spec } = props as { spec: IconSpec };
  return new Response(renderIconSvg(spec), { headers: ICON_HEADERS });
};
