import type { APIRoute } from "astro";
import { APP_VERSION, BUILD_DATE, PKG_VERSION } from "@lib/version";

// Tiny JSON manifest the client polls at startup to detect a new deploy and
// cache-bust stale state. Kept intentionally minimal.
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ version: APP_VERSION, pkg: PKG_VERSION, built: BUILD_DATE }, null, 2),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    }
  );
};
