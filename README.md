# M365 Profiles — Microsoft 365 Licensing Decision Tree

[![Deploy](https://github.com/ninjapaw/m365profiles/actions/workflows/deploy.yml/badge.svg)](https://github.com/ninjapaw/m365profiles/actions/workflows/deploy.yml)
[![Lint](https://github.com/ninjapaw/m365profiles/actions/workflows/lint.yml/badge.svg)](https://github.com/ninjapaw/m365profiles/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live site](https://img.shields.io/badge/Live%20site-Azure%20Static%20Web%20Apps-0078d4)](https://m365profiles.com/)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro%205-FF5D01)](https://astro.build/)

Interactive decision tree that matches a **Microsoft 365 identity profile** —
privileged admin, information worker, frontline (F1/F3), education (A1/A3/A5),
government (GCC / GCC High / DoD / IL6), nonprofit, SMB, or External ID guest —
to the right license tier.

**Live site:** <https://m365profiles.com/>

> ⚠️ **Not official Microsoft guidance.** This is an independent community
> helper — not a Microsoft product, not endorsed by Microsoft. Always verify
> SKUs and entitlements with your Microsoft account team. The Microsoft
> Product Terms are the source of truth.
>
> Unofficial community helper. Ninja Paws is a fictional demo organization
> used by this repository. This is an independent community project, not a
> Microsoft product, and is not affiliated with, sponsored by, endorsed by,
> or supported by Microsoft Corporation.

## Highlights

- Static multi-page Astro site — no backend, no analytics, no cookies.
- 82 decision-tree nodes (28 questions, 7 choice screens, 4 info screens,
  43 results), every edge verified reachable on every push.
- Card-based UI with progress bar, source citations, full keyboard support,
  and one-click PDF handout (jsPDF, lazy-loaded only on click).
- Light / dark theme that respects `prefers-color-scheme` and persists locally.
- Reference catalog at `/reference` renders every result node as a static,
  indexable page for users without JavaScript.
- Dynamic `robots.txt`, `sitemap-index.xml`, and `version.json` — forks and
  custom domains work without editing static files.
- Released as a CalVer GitHub Release on every push to `main`.

## Quick start

```bash
git clone https://github.com/ninjapaw/m365profiles.git
cd m365profiles
npm ci

npm run validate-tree   # verify the decision-tree wiring
npm run dev             # http://localhost:4321
npm run build           # production build → ./dist
npm run preview         # serve ./dist locally
```

Requirements: **Node 20+** and **npm 10+**.

## Configuration

Every user-editable knob lives in **[`src/lib/config.js`](src/lib/config.js)** — a
single `CONFIG` object read by the Astro config, the layout, the web manifest,
the CSP meta tag, and the CI workflow. Edit one file and the change propagates
everywhere. Derived helpers in `src/lib/site.ts`, `security.ts`, and `brand.ts`
read from `CONFIG` and should not be edited directly.

### Site identity

| Key | Default | What it controls |
|---|---|---|
| `origin` | `https://m365profiles.com` | Site origin (no trailing slash). `Astro.site`, JSON-LD `@id`, robots.txt sitemap, canonical URLs. Override with `PUBLIC_SITE_URL`. |
| `base` | `/` | Site base path. Azure Static Web Apps always serves from the root. `Astro.base` and every internal-link prefix. Override with `PUBLIC_SITE_BASE`. |
| `name` | `M365 Profiles` | Brand name in navbar, footer, `<title>`, manifest, JSON-LD. |
| `tagline` | `Microsoft 365 Licensing Decision Tree` | Home `<title>` suffix and JSON-LD `description`. |
| `owner` | `Ninja Paws contributors` | Footer copyright, `<meta author>`, JSON-LD `Person`. |
| `repo` | `ninjapaw/m365profiles` | GitHub `owner/repo` slug — drives `GITHUB_URL` and source deep-links. |
| `defaultBranch` | `main` | Branch used in `blob/<branch>/…` deep-links. |

### Brand colors

Mirror these in `src/styles/tokens.css` (`--ms-blue`, `--ms-blue-darkest`, `--ms-square-1..4`) — CSS can't import JS at runtime.

| Key | Default | What it controls |
|---|---|---|
| `colors.blue` | `#0078d4` | Primary → `<meta theme-color>`, PDF headings. |
| `colors.navy` | `#003e72` | Secondary → PDF headings, hover accents. |
| `colors.squares` | `["#f25022","#7fba00","#00a4ef","#ffb900"]` | Four-square palette → nav logo + auto-derived favicon. |

### Page metadata, manifest, and storage

| Key | Default | What it controls |
|---|---|---|
| `defaultDescription` | *(see file)* | Fallback `<meta description>`. |
| `language` / `direction` | `en` / `ltr` | `<html lang>` / `<html dir>` and JSON-LD `inLanguage`. |
| `titleSeparator` | ` — ` | `pageTitle("X")` → `"X — Brand"`. |
| `manifest.description` | *(see file)* | Install-prompt description. |
| `manifest.display` | `minimal-ui` | PWA display mode. |
| `manifest.orientation` | `any` | PWA orientation lock. |
| `manifest.backgroundColor` | `#ffffff` | PWA splash background. |
| `storage.theme` | `m365-theme` | localStorage key for color theme. |
| `storage.knownVersion` | `m365-known-version` | localStorage key for cache-bust detection. |
| `storage.assessmentStatePrefix` | `m365-assessment-state` | sessionStorage prefix; suffixed with `APP_VERSION` so deploys invalidate stale sessions. |

### Security headers

Delivered as `<meta>` tags from [`src/layouts/Base.astro`](src/layouts/Base.astro) — Azure Static Web Apps can also set real HTTP headers via `staticwebapp.config.json`, but the meta tags keep the site host-agnostic. Loosen at your own risk.

| Key | Default | What it controls |
|---|---|---|
| `security.csp` | strict same-origin (11 directives) | Joined with a `;` + space separator into `<meta http-equiv="Content-Security-Policy">`. |
| `security.referrerPolicy` | `strict-origin-when-cross-origin` | `<meta name="referrer">`. |
| `security.permissionsPolicy` | denies camera / mic / geolocation / FLoC | `<meta http-equiv="Permissions-Policy">`. |

### Social / Open Graph metadata

The full "essential meta tags for social media" set ([css-tricks.com][otmeta])
is emitted from [`Base.astro`](src/layouts/Base.astro) on every page —
`og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`, `og:locale`,
`og:image` + `width` + `height` + `alt`, `twitter:card`, `twitter:title`,
`twitter:description`, `twitter:image`, `twitter:image:alt`, and optional
`twitter:site` / `twitter:creator` / `fb:app_id`. Per-page overrides are
passed via the `<Base>` props (`ogTitle`, `ogDescription`, `ogType`,
`ogImageSlug`, `ogImageAlt`).

OG images themselves are also dynamic — there are no binary card PNGs in
`public/`. The card SVG is generated at build time by
[`src/lib/og.ts`](src/lib/og.ts) from `CONFIG.colors` + a per-page text spec,
and served by two routes:

- `/og-image.svg` — default card, also referenced by the web manifest.
- `/og/<slug>.svg` — one per entry in `CONFIG.social.ogImages`, selected per
  page via `<Base ogImageSlug="home" />`. Forks get recoloured share cards
  for free.

[otmeta]: https://css-tricks.com/essential-meta-tags-social-media/

| Key | Default | What it controls |
|---|---|---|
| `social.region` | `US` | Combined with `language` → `og:locale` (e.g. `en_US`). |
| `social.ogType` | `website` | Default `og:type`. Pages can override per call. |
| `social.ogImageWidth` / `Height` | `1200` / `630` | Dimensions baked into the SVG card and emitted as `og:image:width/height`. |
| `social.ogImageAlt` | *(see file)* | Default `og:image:alt` / `twitter:image:alt`. |
| `social.twitterSite` | `""` | If set (e.g. `@handle`), emits `<meta name="twitter:site">`. |
| `social.twitterCreator` | `""` | If set, emits `<meta name="twitter:creator">`. |
| `social.fbAppId` | `""` | If set, emits `<meta property="fb:app_id">` for Facebook Domain Insights. |
| `social.profiles` | `[]` | Owner profile URLs → `<link rel="me">` (Mastodon / IndieWeb) + JSON-LD `Person.sameAs` (Knowledge Graph). |
| `social.ogImages` | 6 entries | `{ eyebrow, headline, subline }` per page → one SVG card each at `/og/<key>.svg`. |

### SEO directives

| Key | Default | What it controls |
|---|---|---|
| `seo.robots` | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` | `<meta name="robots">` + `<meta name="googlebot">`. Per-page override via `<Base robots="noindex, follow" />` (already set on `/404`). |
| `seo.emitHreflang` | `true` | Emit self-referential `<link rel="alternate" hreflang>` + `x-default`. |
| `seo.emitBreadcrumbs` | `true` | Auto-derive a JSON-LD `BreadcrumbList` from the URL path on non-home pages. Pages can override with a `breadcrumbs` prop. |
| `seo.appleStatusBarStyle` | `default` | iOS PWA status-bar style: `default \| black \| black-translucent`. |
| `seo.themeColorDark` | `#003e72` | Dark-mode `<meta name="theme-color">`. Light variant uses `colors.blue`. |

Other always-on additions: `format-detection` (disables iOS auto-linking of phone numbers / addresses / emails), `application-name`, `apple-mobile-web-app-title|capable|status-bar-style`, `mobile-web-app-capable`, `msapplication-TileColor`, `apple-touch-icon` (auto-derived from `CONFIG.colors.squares`), and `mask-icon` for Safari pinned tabs. JSON-LD now includes `datePublished` / `dateModified` and `primaryImageOfPage`. A dynamic [`/llms.txt`](src/pages/llms.txt.ts) describes the site to LLM crawlers per the [llmstxt.org](https://llmstxt.org) convention.

### Favicons & PWA icons

All icons are SVG, generated at build time by [`src/lib/icons.ts`](src/lib/icons.ts) from `CONFIG.colors.squares` — there are no PNG / ICO binaries to keep in sync. Three purposes (W3C manifest spec) are rendered:

| Purpose | Used for | How it renders |
|---|---|---|
| `any` | Browser tab, app list, home screen | Full four-color mark, edge-to-edge. |
| `maskable` | Android adaptive icons | Same mark at 60% scale inside a brand-blue safe-zone bleed. |
| `monochrome` | Notification badges, watch faces, Safari pinned tabs | Single-color silhouette (defaults to brand blue). |

Endpoints (all built statically — no runtime calls):

- `/favicon.svg` — primary favicon.
- `/icons/<slug>.svg` — one per entry in `ICON_SET`: `favicon-32`, `favicon-192`, `favicon-512`, `apple-touch-180`, `maskable-192`, `maskable-512`, `monochrome-512`.

The web manifest advertises all five PWA sizes (`any` × 2 + `maskable` × 2 + `monochrome` × 1) plus two **app shortcuts** (Start assessment, Reference catalog) so installed PWAs get a long-press menu. `Base.astro` emits an inline data-URI favicon (zero round-trips) plus file-URL `rel="icon"`, `apple-touch-icon`, and `mask-icon` links for crawlers, iOS, and Safari.

### External links and CI overrides

- `CONFIG.externalSources` — array of `{ href, label }` rendered in the footer.
- The deploy workflow resolves URL/base from Actions variables `PUBLIC_SITE_URL` / `PUBLIC_SITE_BASE` first, then falls back to `CONFIG.origin` / `CONFIG.base`. Forks can target their own Azure Static Web Apps hostname or custom domain without editing `config.js`.

## Editing the decision tree

All decision logic lives in [`src/data/tree.js`](src/data/tree.js). Each node
is one of: a `question` (yes/no), a `choice` (n-way picker), an `info` screen,
or a terminal `result`. Workflow:

1. Edit nodes in [`src/data/tree.js`](src/data/tree.js).
2. Re-wire `yes` / `no` / `target` edges to point at your node ids.
3. `npm run validate-tree` — confirms every edge resolves and every node is
   reachable from the start node.
4. `npm run build` to confirm the site still compiles.
5. Open a PR — `lint.yml` re-runs validation, link-check, markdownlint, and
   dependency review.

## Versioning

CI sets `PUBLIC_APP_VERSION` (CalVer `vYYYY.MM.DD-N`) and `PUBLIC_BUILD_DATE`
before `astro build`, so every page, the footer, the PDF, and `/version.json`
all bake the same string. On load the client fetches `/version.json` and, if a
new build is detected, clears `sessionStorage` and reloads — users see the new
release as soon as they revisit the tab.

## Deployment

| Workflow | Trigger | What it does |
| --- | --- | --- |
| [`deploy-azure-infrastructure.yml`](.github/workflows/deploy-azure-infrastructure.yml) | IaC changes, PR, manual | Compiles Bicep. A manual run performs an OIDC-authenticated `what-if` or deploys the Static Web App. |
| [`deploy.yml`](.github/workflows/deploy.yml) | push to `main` or `dev`, manual | Validate tree → build → publish to the matching Azure Static Web Apps environment → tag CalVer release. Add `[skip release]` to skip tagging. |
| [`lint.yml`](.github/workflows/lint.yml) | push + PR to `main` | Build + tree validation, typecheck, markdownlint, link check, format check. |

The site is fully static (no API routes), so it deploys to **Azure Static Web Apps Free** with no Azure Functions app required. `azure.yaml` and [`infra/`](infra/) make the resource reproducible through Bicep and Azure Developer CLI. The resource is kept separate from the static publish step: Bicep creates the Static Web App, while the deployment workflow publishes the verified Astro `dist/` output.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fninjapaw%2Fm365profiles%2Fmain%2Finfra%2Fazure%2Fsite%2Fazuredeploy.json)

The button provisions only the Static Web App resource. For repeatable environments and GitHub Actions deployment, use the bootstrap script instead. It creates or reuses an Entra application, configures GitHub Environment OIDC trust, scopes `Contributor` to the target resource group, and writes non-secret GitHub Environment variables:

```bash
az login
gh auth login
bash infra/azure/bootstrap.sh \
  --environment production \
  --subscription <approved-subscription-id> \
  --resource-group m365profiles-production \
  --site-name <globally-unique-site-name> \
  --public-site-url https://m365profiles.com
```

The script refuses the subscription named `MCPP Subscription - DO NOT USE`. Run **Validate and Deploy Azure Infrastructure** with `operation: deploy` and `environment: production`; then rerun the bootstrap command after the site exists so it can set the Static Web Apps publish token.

Create protected `deployment-development` and `deployment-production` GitHub Environments. The bootstrap script configures these values; they can also be configured manually:

| Name | Type | Example | Notes |
| --- | --- | --- | --- |
| `AZURE_CLIENT_ID` | Environment secret | *(OIDC app ID)* | Infrastructure deployment identity. No client secret is used. |
| `AZURE_TENANT_ID` | Environment secret | *(tenant ID)* | Tenant containing the OIDC application. |
| `AZURE_SUBSCRIPTION_ID` | Environment secret | *(subscription ID)* | Subscription that owns the target resource group. |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Environment secret | *(Production Static Web App deployment token)* | Used by `main` deployments. Rotate immediately if exposed. |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` | Repository or environment secret | *(Development Static Web App deployment token)* | Used by `dev` deployments. Keep separate from production. Rotate immediately if exposed. |
| `AZURE_LOCATION` | Environment variable | `eastus2` | Resource-group and Static Web App metadata region. |
| `AZURE_RESOURCE_GROUP` | Environment variable | `m365profiles-production` | Resource group owned by this Environment. |
| `AZURE_STATIC_WEB_APP_NAME` | Environment variable | `m365profiles-production-site` | Globally unique Static Web Apps resource name. |
| `AZURE_PUBLIC_SITE_URL` | Environment variable | `https://m365profiles.com` | Canonical URL embedded into the Astro build. |
| `AZURE_SITE_SKU` | Environment variable | `Free` | Use `Standard` only for a required plan feature. |

Pushes to `main` deploy to `deployment-production` and use `https://m365profiles.com`.
Pushes to `dev` deploy to `deployment-development` and use
`https://dev.m365profiles.com`. The development environment needs its own
`AZURE_STATIC_WEB_APPS_API_TOKEN` for the development Static Web App; tokens
must not be shared between environments. Configure `dev.m365profiles.com` as
an Azure Static Web Apps custom domain and point its DNS record at the
development app before relying on the hostname.

The hosted development target uses `NP-m365profiles-Dev-CentralUS` for both
the resource group and Static Web App name, in `centralus`. Store its publish
token as `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`; the `dev` branch workflow uses
that secret and never uses the production publish token.

`staticwebapp.config.json` configures the Azure Static Web Apps navigation fallback, 404 handling, MIME type, and HTTP security headers. `PUBLIC_SITE_BASE` is always `/` for this target.

**Custom domain:** add the domain under the Static Web App's **Custom domains** blade, then set `AZURE_PUBLIC_SITE_URL` in the matching GitHub Environment before publishing the next build.

## Project layout

```text
astro.config.mjs       Astro config (site, base, MDX, sitemap)
staticwebapp.config.json  Azure Static Web Apps routing + 404 handling
scripts/
  validate-tree.js     Tree wiring + reachability check
src/
  config.js (in lib/)  Single source of truth for editable knobs
  data/tree.js         82-node decision tree
  lib/                 Derived constants + DOM/path helpers (do not edit)
  client/              Assessment renderer + lazy PDF builder
  layouts/Base.astro   HTML shell, meta tags, CSP, cache-bust bootstrap
  components/          Nav, Footer, Disclaimer
  pages/               index, assessment, profiles, reference, about, 404,
                       robots.txt, sitemap, manifest, version.json,
                       og-image.svg, og/[slug].svg, llms.txt,
                       favicon.svg, icons/[slug].svg
  styles/              Tokens, base, components, print
  content/             MDX explainers keyed to result ids
public/                Optional static assets
.github/               Workflows (infrastructure, deploy, lint)
infra/                 Bicep, Deploy to Azure template, and OIDC bootstrap
.azure/deployment-plan.md  Azure architecture and deployment record
```

## Keyboard shortcuts (assessment)

| Key | Action |
| --- | --- |
| `1`–`9`, `A`–`Z` | Pick a numbered / lettered choice |
| `Y` / `N` (or `1` / `2`) | Yes / No on question screens |
| `←` or `Backspace` | Go back one step |
| `R` | Restart |
| `Tab` / `Enter` / `Space` | Standard focus + activation |

## Security & privacy

Static site. No backend, no telemetry, no cookies. Defense-in-depth `<meta>`
headers (CSP, Referrer-Policy, Permissions-Policy). Report vulnerabilities
privately — see [`SECURITY.md`](SECURITY.md).

## Contributing

Contributions that improve cited, source-grounded licensing guidance are
welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening an issue or
pull request.

## Trademark notice

Microsoft, Microsoft 365, Azure, Entra, Defender, Purview, Intune, Teams,
Copilot, and related product names are trademarks of Microsoft Corporation.
This site uses those names nominatively to identify the products discussed.
The four colored accent squares used as a favicon and navbar mark are not the
Microsoft corporate logo. This project is not affiliated with, sponsored by,
or endorsed by Microsoft Corporation.

## Acknowledgements

- UI patterns inspired by [Microsoft Zero Trust Assessment](https://github.com/microsoft/zerotrustassessment).
- License cross-references on top of [m365maps.com](https://m365maps.com/) by Aaron Dinnage.
- Built with [Astro 5](https://astro.build/) and [jsPDF](https://github.com/parallax/jsPDF).

## License

[MIT](LICENSE) © Ninja Paws contributors
