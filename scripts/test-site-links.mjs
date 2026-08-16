#!/usr/bin/env node
// Static-site link / asset validator for ./dist after `astro build`.
//
// Scans every built HTML file for:
//   • href / src attributes pointing at internal paths that do NOT exist
//     in the build output. (External http(s)/mailto/tel/data are skipped.)
//   • Page-fragment anchors (#some-id) that don't resolve to an element
//     with a matching id or name within the same page.
//   • Empty / placeholder hrefs that would render as broken UI.
//
// Why a custom scanner instead of a CLI like `linkinator`?
// We want this to run in pure-Node CI without a network round-trip, to
// only inspect the static OUTPUT (not source), and to be cheap enough to
// gate every build on.

import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(here, "..", "dist");

// Site base path — must match astro.config.mjs `base: '/'` (Azure Static
// Web Apps always serves from the root). We strip this prefix when
// resolving an internal href back to a file on disk.
const BASE = "";

const ERROR_THRESHOLD = 0;
const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

async function walk(dir, into = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    err(`Cannot read ${dir}: ${e.message}`);
    return into;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) await walk(p, into);
    else into.push(p);
  }
  return into;
}

/**
 * Convert an internal href to the dist file it should resolve to. Returns
 * null if the href is external or can't be resolved (e.g. mailto/tel).
 * Returns { filePath, anchor } where anchor is null if no #fragment.
 */
function resolveInternal(href, pageRelPath) {
  if (!href) return null;
  // Strip a leading anchor — same-page link.
  if (href.startsWith("#")) {
    return { filePath: path.join(DIST, pageRelPath), anchor: href.slice(1) };
  }
  // Skip externals + non-http schemes.
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|sms:)/i.test(href)) return null;
  // Protocol-relative.
  if (href.startsWith("//")) return null;

  // Split off anchor / query.
  let raw = href;
  let anchor = null;
  const hashIdx = raw.indexOf("#");
  if (hashIdx >= 0) {
    anchor = raw.slice(hashIdx + 1);
    raw = raw.slice(0, hashIdx);
  }
  const qIdx = raw.indexOf("?");
  if (qIdx >= 0) raw = raw.slice(0, qIdx);
  if (!raw) {
    return { filePath: path.join(DIST, pageRelPath), anchor };
  }

  // Resolve relative to the page if it doesn't start with /.
  let resolved;
  if (raw.startsWith("/")) {
    // Strip site base prefix when present (no-op for the default root base) so /foo → dist/foo
    if (raw.startsWith(`${BASE}/`)) raw = raw.slice(BASE.length);
    else if (raw === BASE) raw = "/";
    resolved = path.join(DIST, raw);
  } else {
    const pageDir = path.dirname(path.join(DIST, pageRelPath));
    resolved = path.resolve(pageDir, raw);
  }
  return { filePath: resolved, anchor };
}

async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map a resolved "path" into an actual on-disk file. Astro emits
 * /about → dist/about/index.html. So if the resolved path is a
 * directory or has no extension, try appending /index.html.
 */
async function resolveToFile(p) {
  if (await fileExists(p)) {
    try {
      const s = await stat(p);
      if (s.isDirectory()) {
        const idx = path.join(p, "index.html");
        return (await fileExists(idx)) ? idx : null;
      }
      return p;
    } catch {
      return null;
    }
  }
  // Try .html sibling.
  if (await fileExists(`${p}.html`)) return `${p}.html`;
  // Try /index.html under it.
  const idx = path.join(p, "index.html");
  if (await fileExists(idx)) return idx;
  return null;
}

/** Cheap href + id extractor. Good enough for static HTML the build emits. */
function extractAttrs(html) {
  const hrefs = [];
  // href / src attributes.
  const re = /\s(href|src)\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    hrefs.push({ attr: m[1].toLowerCase(), value: m[2] });
  }
  // ids and names that anchors could target.
  const idRe = /\sid\s*=\s*"([^"]+)"/gi;
  const ids = new Set();
  while ((m = idRe.exec(html)) !== null) ids.add(m[1]);
  const nameRe = /<a[^>]*\sname\s*=\s*"([^"]+)"/gi;
  while ((m = nameRe.exec(html)) !== null) ids.add(m[1]);
  return { hrefs, ids };
}

const idsByFile = new Map();
async function getIds(file) {
  if (idsByFile.has(file)) return idsByFile.get(file);
  let html = "";
  try {
    html = await readFile(file, "utf8");
  } catch {
    return new Set();
  }
  const { ids } = extractAttrs(html);
  idsByFile.set(file, ids);
  return ids;
}

async function main() {
  if (!(await fileExists(DIST))) {
    err(`dist/ does not exist — run 'npm run build' first.`);
    return finish();
  }

  const allFiles = await walk(DIST);
  const htmlFiles = allFiles.filter((f) => f.endsWith(".html"));
  if (htmlFiles.length === 0) {
    err("No .html files under dist/ — nothing to validate.");
    return finish();
  }

  let totalLinksChecked = 0;
  let internalLinksChecked = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const relToDist = path.relative(DIST, file);
    const { hrefs } = extractAttrs(html);
    for (const { attr, value } of hrefs) {
      totalLinksChecked++;
      if (!value || value.trim() === "") {
        err(`${relToDist}: empty ${attr}=""`);
        continue;
      }
      if (value === "#") continue; // legitimate placeholder for JS toggles
      const r = resolveInternal(value, relToDist);
      if (!r) continue; // external, skip
      internalLinksChecked++;
      const target = await resolveToFile(r.filePath);
      if (!target) {
        err(`${relToDist}: broken internal link ${attr}="${value}" (resolved to ${r.filePath})`);
        continue;
      }
      if (r.anchor) {
        const ids = await getIds(target);
        if (!ids.has(r.anchor)) {
          // Warn instead of error — anchors are sometimes added by client
          // JS at runtime and can't be detected by static scanning.
          warn(
            `${relToDist}: ${attr}="${value}" — fragment "#${r.anchor}" not found in ${path.relative(DIST, target)}`
          );
        }
      }
    }
  }

  console.log(
    `Scanned ${htmlFiles.length} HTML files: ${totalLinksChecked} total ${"" /* */}links, ` +
      `${internalLinksChecked} internal.`
  );
  return finish();
}

function finish() {
  if (warnings.length) {
    console.warn(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.warn(`  ! ${w}`);
  }
  if (errors.length > ERROR_THRESHOLD) {
    console.error(`\nErrors (${errors.length}):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\nSite link check OK.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Link scanner crashed:", e);
  process.exit(2);
});
