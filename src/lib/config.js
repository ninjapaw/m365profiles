// Central configuration — every user-editable knob lives here.
// All other modules derive from CONFIG; see README ▸ Configuration.
// Overrides: PUBLIC_SITE_URL, PUBLIC_SITE_BASE (env / Actions vars).

export const CONFIG = Object.freeze({
  // Site identity. Azure Static Web Apps always serves from the root, so
  // `base` stays "/" — PUBLIC_SITE_BASE only matters for a GitHub Pages fork.
  origin: "https://m365profiles.com",
  base: "/",
  name: "M365 Profiles",
  tagline: "Microsoft 365 Licensing Decision Tree",
  owner: "Microsoft Corporation",
  repo: "ninjapaw/m365profiles",
  defaultBranch: "main",

  // Brand colors — also mirrored in src/styles/tokens.css; keep in sync.
  colors: Object.freeze({
    blue: "#0078d4",
    navy: "#003e72",
    squares: Object.freeze(["#f25022", "#7fba00", "#00a4ef", "#ffb900"]),
  }),

  // Page metadata defaults
  defaultDescription:
    "Interactive decision tree that matches a Microsoft 365 identity profile to the right license tier — independent, unofficial community helper.",
  language: "en",
  direction: "ltr",
  titleSeparator: " — ",

  // Crawler / search-engine directives. Default opts into Google's largest
  // rich-result image + unlimited snippet/video preview lengths. Per-page
  // overrides go via <Base robots="noindex,nofollow" />.
  seo: Object.freeze({
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    // Whether to emit a <link rel="alternate" hreflang> self + x-default pair.
    // Useful even for a single-language site; harmless otherwise.
    emitHreflang: true,
    // Whether to emit a BreadcrumbList JSON-LD block on non-home pages.
    emitBreadcrumbs: true,
    // Apple PWA status bar — "default" | "black" | "black-translucent".
    appleStatusBarStyle: "default",
    // Dark-mode <meta name="theme-color"> (light variant uses CONFIG.colors.blue).
    themeColorDark: "#003e72",
  }),

  // Social / Open Graph / Twitter card metadata. All five "essential" tags
  // from https://css-tricks.com/essential-meta-tags-social-media/ are emitted
  // from these values; per-page overrides live in each page's frontmatter.
  // OG images are generated at build time from CONFIG.colors + the per-page
  // entry in `ogImages` below — no static binary assets required.
  social: Object.freeze({
    // OG locale uses the underscore form (e.g. "en_US"); language + region are
    // recombined in Base.astro. Leave region empty to derive from language.
    region: "US",
    // Default og:type for pages that don't override (article, profile, etc.).
    ogType: "website",
    // Default OG image dimensions (the dynamic SVG endpoint matches these).
    ogImageWidth: 1200,
    ogImageHeight: 630,
    // Default alt text — every page can override via Props.ogImageAlt.
    ogImageAlt:
      "M365 Profiles — Microsoft 365 licensing decision tree. Independent, unofficial community helper.",
    // Optional analytics handles. Leave empty strings to omit the meta tags.
    twitterSite: "", // e.g. "@yourhandle" → emits <meta name="twitter:site">
    twitterCreator: "", // e.g. "@yourhandle" → emits <meta name="twitter:creator">
    fbAppId: "", // e.g. "1234567890"   → emits <meta property="fb:app_id">
    // Owner profile URLs. Each becomes a <link rel="me"> in <head> (used by
    // Mastodon / IndieWeb verification) and is folded into the JSON-LD
    // Person.sameAs array (helps Google's Knowledge Graph). Leave empty to omit.
    profiles: Object.freeze([
      // "https://github.com/ninjapaw",
      // "https://www.linkedin.com/in/example/",
      // "https://mastodon.social/@example",
    ]),
    // Per-route OG image specs. Each key becomes /og/<key>.svg and is rendered
    // at build time from CONFIG.colors using the headline + subline below.
    // Keep entries short — the SVG generator wraps at ~24 chars per line.
    ogImages: Object.freeze({
      home: Object.freeze({
        eyebrow: "Decision tree",
        headline: "The right Microsoft 365 license for every profile.",
        subline: "Step-by-step · Source-cited · PDF handout · No tracking",
      }),
      assessment: Object.freeze({
        eyebrow: "Interactive assessment",
        headline: "Find the right Microsoft 365 license.",
        subline: "Eight profiles · 12 questions max · Citations on every screen",
      }),
      profiles: Object.freeze({
        eyebrow: "Identity profiles",
        headline: "Eight profiles, one decision tree.",
        subline: "Admin · IW · Frontline · Edu · Gov · Nonprofit · SMB · Guest",
      }),
      reference: Object.freeze({
        eyebrow: "Reference catalog",
        headline: "Every recommendation, one page each.",
        subline: "Static, citation-linked view of every result node",
      }),
      about: Object.freeze({
        eyebrow: "About",
        headline: "Methodology, sources & honest limits.",
        subline: "Source-first · Cited · Not official Microsoft guidance",
      }),
      404: Object.freeze({
        eyebrow: "404",
        headline: "Page not found.",
        subline: "The page you requested doesn't exist on this site.",
      }),
    }),
  }),

  // Web app manifest (/manifest.webmanifest)
  manifest: Object.freeze({
    description:
      "Independent decision-tree helper that maps Microsoft 365 identity profiles to the right license tier.",
    display: "minimal-ui",
    orientation: "any",
    backgroundColor: "#ffffff",
  }),

  // Security headers (delivered as <meta> tags since they cover every static host)
  security: Object.freeze({
    csp: Object.freeze([
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ]),
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  }),

  // Browser storage key prefixes. assessmentState is suffixed with APP_VERSION
  // at runtime so each deploy invalidates in-progress sessions.
  storage: Object.freeze({
    theme: "m365-theme",
    knownVersion: "m365-known-version",
    assessmentStatePrefix: "m365-assessment-state",
  }),

  // Footer "source document" links. The first two are the legally binding
  // sources of truth (Microsoft Licensing hub + Microsoft Product Terms,
  // which contains the Use Rights for every Microsoft Online Service);
  // the rest are operational / community references.
  externalSources: Object.freeze([
    {
      href: "https://www.microsoft.com/licensing/terms",
      label: "Microsoft Product Terms (Use Rights)",
    },
    { href: "https://www.microsoft.com/en-us/licensing", label: "Microsoft Licensing Hub" },
    { href: "https://learn.microsoft.com/microsoft-365/", label: "Microsoft 365 Learn" },
    { href: "https://learn.microsoft.com/entra/", label: "Microsoft Entra Learn" },
    { href: "https://m365maps.com/", label: "M365 Maps (Aaron Dinnage)" },
    { href: "https://microsoft.github.io/zerotrustassessment/", label: "Zero Trust Assessment" },
  ]),
});
