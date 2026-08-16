// Derived brand identity surface. Edit values in src/lib/config.js.

import { CONFIG } from "./config.js";

export const BRAND = {
  name: CONFIG.name,
  tagline: CONFIG.tagline,
  owner: CONFIG.owner,
  repo: CONFIG.repo,
  blue: CONFIG.colors.blue,
  navy: CONFIG.colors.navy,
  squares: CONFIG.colors.squares as readonly [string, string, string, string],
} as const;
