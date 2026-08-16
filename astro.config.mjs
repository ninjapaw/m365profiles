// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { CONFIG } from "./src/lib/config.js";

// Site URL + base are env-driven so forks work without editing this file.
// Defaults come from src/lib/config.js. See README ▸ Configuration.
const SITE_URL = process.env.PUBLIC_SITE_URL ?? CONFIG.origin;
const SITE_BASE = process.env.PUBLIC_SITE_BASE ?? CONFIG.base;

export default defineConfig({
  site: SITE_URL,
  base: SITE_BASE,
  trailingSlash: "ignore",
  output: "static",
  build: {
    format: "directory",
    inlineStylesheets: "auto",
  },
  integrations: [mdx(), sitemap()],
  vite: {
    build: {
      target: "es2022",
    },
  },
});
