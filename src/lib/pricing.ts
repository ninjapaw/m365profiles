// Microsoft 365 list prices — shared pricing catalog for the assessment.
//
// Single source of truth for per-user / month list prices across the SKU
// families recommended by the decision tree: Enterprise (E3, E5),
// Frontline (F1, F3), Business (Basic, Standard, Premium), plus the
// identity, security, compliance, endpoint, productivity, and AI add-ons
// that profile branches surface.
//
// Powers the frontline qualification wizard's "F + add-ons vs. E uplift"
// calculator today, and is the place any new pricing-aware UI should reach
// for SKU metadata (display name, list price, source citation, category).
//
// All values below are publicly published Microsoft list prices, USD, per
// user / month, on annual commitment (the most common purchasing motion).
// CSP / EA / volume / promo / partner-specific pricing always differs — the
// wizard surfaces a banner that says "verify with your Microsoft account
// team before purchase" in the result card.
//
// SKUs that don't fit a flat per-user / month list-price model on purpose
// live in the decision tree's result nodes instead of here:
//   • Microsoft 365 E7 (Frontier Suite) — bundled pricing, confirm with
//     account team (referenced from result_e7_full).
//   • Education (A1 / A3 / A5) — faculty vs. student SKUs price separately.
//   • Government (G1 / G3 / G5, IL5 / IL6 Air-Gapped) — varies by sovereign
//     cloud (GCC, GCC High, DoD).
//   • Nonprofit (NSP / grants) — first 10 seats free + NSP discount tier.
//   • Microsoft Entra External ID (B2B, P2, Verified ID, CIAM) — MAU-based.
//   • Workload Identities Premium — per workload identity, not per user.
//
// Last reviewed: 2026-05. When updating prices, bump PRICING_LAST_VERIFIED
// so the disclaimer renders the new date.

import { SOURCES } from "./sources.js";

export const PRICING_LAST_VERIFIED = "2026-05";

// Back-compat re-exports — these used to be declared locally in this file.
// Every existing import keeps working; new code should reach for SOURCES.
export const MICROSOFT_365_LICENSING_DOCS = SOURCES.LICENSING_DOCS_HUB;
export const MICROSOFT_365_ENTERPRISE_PRICING = SOURCES.ENTERPRISE_PRICING;
export const MICROSOFT_365_FRONTLINE_PRICING = SOURCES.FRONTLINE_PRICING;
export const MODERN_WORK_PLAN_COMPARISON = SOURCES.MODERN_WORK_PLAN_COMPARISON;
export const EXCHANGE_ONLINE_LIMITS = SOURCES.EXCHANGE_ONLINE_LIMITS;

/**
 * Category discriminator — lets consumers filter the catalog (e.g. "show
 * me only Intune add-ons", "show me only Business-tier base SKUs"). The
 * frontline wizard reaches for specific keys directly (BASE_SKUS.f1,
 * ADDONS.teams_phone_frontline, etc.) and does not filter by category, so
 * adding more categorised entries here is safe.
 */
export type SkuCategory =
  | "frontline" // F1, F3 + add-ons specifically authorised on F SKUs
  | "enterprise" // E3, E5 (and other enterprise base plans)
  | "business" // M365 Business Basic / Standard / Premium (SMB, ≤300 seats)
  | "ai" // Microsoft 365 Copilot and other per-user AI add-ons
  | "identity" // Entra ID P1 / P2, Entra Suite, Entra ID Governance
  | "security" // Defender for Endpoint / Office / Suite
  | "compliance" // Purview E5 Compliance / Purview Suite
  | "endpoint" // Intune Suite + standalone Intune add-ons
  | "productivity"; // Teams Premium, Teams Enterprise add-on, Exchange Plan 2, Teams Phone

export type PriceItem = {
  /** Stable key — also used as the addon dedupe key in wizard state. */
  key: string;
  /** Display name shown in the result card. */
  name: string;
  /** USD per user per month, list, annual commitment. */
  cost: number;
  /** Public Microsoft source for the price / SKU. */
  source: { label: string; url: string };
  /** Short blurb shown under the line item in the breakdown. */
  note?: string;
  /** Optional category for filtering (see SkuCategory). */
  category?: SkuCategory;
};

/**
 * Base SKU list prices (per user / month, USD, annual commitment).
 *
 * The frontline wizard reaches for `.f1`, `.f3`, `.e3`, and `.e5` by name —
 * those four entries must remain. Additional entries are reference data
 * for any other pricing-aware UI; they can be filtered via `.category`.
 */
export const BASE_SKUS = {
  // ---- Frontline (F SKUs) -------------------------------------------------
  f1: {
    key: "f1",
    name: "Microsoft 365 F1",
    cost: 2.25,
    category: "frontline",
    source: SOURCES.FRONTLINE_PRICING,
    note: "Kiosk-grade frontline — Teams + SharePoint browse + Stream + Intune + Entra ID P1. No personal Exchange mailbox (Teams calendar / free-busy only); no Office authoring.",
  },
  f3: {
    key: "f3",
    name: "Microsoft 365 F3",
    cost: 8.0,
    category: "frontline",
    source: SOURCES.FRONTLINE_PRICING,
    note: "Full-featured frontline — 2 GB Exchange mailbox (no archive mailbox per the Exchange Online limits doc; Recoverable Items quota 30 GB / 100 GB on hold), Office web + mobile (<10.9″ devices), Teams, Intune, Defender for Office P1, AIP P1.",
  },
  // ---- Enterprise (E SKUs) ------------------------------------------------
  e3: {
    key: "e3",
    name: "Microsoft 365 E3",
    cost: 36.0,
    category: "enterprise",
    source: SOURCES.ENTERPRISE_PRICING,
    note: "Information-worker baseline — Exchange Online Plan 2 (100 GB primary mailbox + 100 GB → 1.5 TB auto-expanding archive), desktop Office, full Teams, Intune, Entra ID P1, Defender for Office P1, AIP P1, 1+ TB OneDrive.",
  },
  e5: {
    key: "e5",
    name: "Microsoft 365 E5",
    cost: 57.0,
    category: "enterprise",
    source: SOURCES.ENTERPRISE_PRICING,
    note: "E3 mailbox / archive (100 GB + 1.5 TB auto-expanding) + Defender XDR (P2 + Defender for Identity + Defender for Cloud Apps + Defender for Office P2), Purview E5 (IRM / Comm Compliance / eDiscovery Premium / Customer Lockbox), Entra ID P2 (PIM / Identity Protection / Governance), Power BI Pro, Teams Phone.",
  },
  // ---- Business (SMB, ≤300 seat hard cap across all Business SKUs) --------
  business_basic: {
    key: "business_basic",
    name: "Microsoft 365 Business Basic",
    cost: 6.0,
    category: "business",
    source: SOURCES.BUSINESS_COMPARE_PLANS,
    note: "Web + mobile Office, Exchange Online (50 GB mailbox), Teams, OneDrive (1 TB), SharePoint. No desktop Office apps; no Defender / Intune. 300-seat hard cap shared across all Business SKUs in the tenant.",
  },
  business_standard: {
    key: "business_standard",
    name: "Microsoft 365 Business Standard",
    cost: 12.5,
    category: "business",
    source: SOURCES.BUSINESS_COMPARE_PLANS,
    note: "Business Basic + desktop Office apps (Outlook, Word, Excel, PowerPoint) and webinar / Clipchamp tooling. Eligible base plan for Microsoft 365 Copilot. 300-seat cap.",
  },
  business_premium: {
    key: "business_premium",
    name: "Microsoft 365 Business Premium",
    cost: 22.0,
    category: "business",
    source: SOURCES.BUSINESS_COMPARE_PLANS,
    note: "Business Standard + Intune, Entra ID P1, Defender for Business, Defender for Office P1, AIP P1 — the SMB equivalent of E3-class security and management. 300-seat cap.",
  },
} as const satisfies Record<string, PriceItem>;

/**
 * Per-user add-on list prices (USD per user / month, annual commitment).
 *
 * The frontline wizard reaches for specific keys when the decision tree's
 * `addon: { key: "…" }` branches fire — those must remain stable:
 *   teams_phone_frontline, teams_enterprise_addon, exchange_online_p2,
 *   defender_endpoint_p1, defender_endpoint_p2, defender_office_p2,
 *   entra_id_p2, purview_dlp, copilot_m365.
 *
 * Additional entries are reference data for any other pricing-aware UI;
 * they can be filtered via `.category`.
 */
export const ADDONS = {
  // ---- Productivity (Teams / Exchange add-ons on top of F or E SKUs) ------
  teams_phone_frontline: {
    key: "teams_phone_frontline",
    name: "Teams Phone Standard for Frontline Workers",
    cost: 4.0,
    category: "productivity",
    source: SOURCES.TEAMS_ADDON_LICENSING,
    note: "Add-on specifically authorised for F1 / F3 users — pairs with a Calling Plan or Direct Routing for PSTN.",
  },
  teams_enterprise_addon: {
    key: "teams_enterprise_addon",
    name: "Teams Enterprise add-on",
    cost: 5.25,
    category: "productivity",
    source: SOURCES.TEAMS_2025_PACKAGING,
    note: "Enables town halls, webinars, full meeting features on top of an F SKU. Required for any large-audience meeting hosting.",
  },
  teams_premium: {
    key: "teams_premium",
    name: "Microsoft Teams Premium",
    cost: 10.0,
    category: "productivity",
    source: SOURCES.TEAMS_ADDON_LICENSING,
    note: "Advanced meetings (intelligent recap, meeting templates, watermarks, advanced webinars / town halls, real-time captions / translation, premium virtual appointments). Not bundled with E3, E5, or E7 — separate per-user add-on for organisers / attendees in scope.",
  },
  exchange_online_p2: {
    key: "exchange_online_p2",
    name: "Exchange Online Plan 2",
    cost: 8.0,
    category: "productivity",
    source: SOURCES.EXCHANGE_ONLINE_PLANS,
    note: "100 GB primary mailbox + 100 GB → 1.5 TB auto-expanding archive (per Exchange Online service-description limits) + DLP for email. Replaces the F3 mailbox (re-license to EOP2 — you don't stack F3's 2 GB mailbox).",
  },
  // ---- AI (Microsoft 365 Copilot family) ----------------------------------
  copilot_m365: {
    key: "copilot_m365",
    name: "Microsoft 365 Copilot",
    cost: 30.0,
    category: "ai",
    source: SOURCES.COPILOT_FOR_WORK,
    note: "Per-user add-on on top of an eligible base plan (E3 / E5 / Business Standard / Business Premium). Already bundled inside Microsoft 365 E7.",
  },
  // ---- Identity (Entra ID, Entra Suite, Entra ID Governance) -------------
  entra_id_p1: {
    key: "entra_id_p1",
    name: "Microsoft Entra ID P1",
    cost: 6.0,
    category: "identity",
    source: SOURCES.ENTRA_PRICING,
    note: "Conditional Access, group-based licensing, dynamic groups, self-service password reset with writeback, Entra Connect Health. Already included in F1 / F3 / E3 / E5 / Business Premium.",
  },
  entra_id_p2: {
    key: "entra_id_p2",
    name: "Microsoft Entra ID P2",
    cost: 9.0,
    category: "identity",
    source: SOURCES.ENTRA_PRICING,
    note: "Privileged Identity Management, risk-based Conditional Access, Identity Protection. P1 is already included in F1 / F3 / E3.",
  },
  entra_id_governance: {
    key: "entra_id_governance",
    name: "Microsoft Entra ID Governance",
    cost: 7.0,
    category: "identity",
    source: SOURCES.ENTRA_GOVERNANCE_FUNDAMENTALS,
    note: "Entitlement management, access reviews, lifecycle workflows. Includes Entra ID P2. Targets, approvers, and reviewers in a governance flow all need this (or Entra Suite, or M365 E7).",
  },
  entra_suite: {
    key: "entra_suite",
    name: "Microsoft Entra Suite",
    cost: 12.0,
    category: "identity",
    source: SOURCES.ENTRA_SUITE,
    note: "Bundles Entra ID P2 + Entra ID Governance + Global Secure Access (Internet Access + Private Access) + Entra Verified ID. Also included in M365 E7.",
  },
  // ---- Security (Defender for Endpoint / Office / Suite) ------------------
  defender_endpoint_p1: {
    key: "defender_endpoint_p1",
    name: "Microsoft Defender for Endpoint Plan 1",
    cost: 3.0,
    category: "security",
    source: SOURCES.DEFENDER_ENDPOINT_PLANS,
    note: "Next-gen AV + attack-surface reduction + manual response. The frontline-tier MDE is sold separately from M365 F SKUs.",
  },
  defender_endpoint_p2: {
    key: "defender_endpoint_p2",
    name: "Microsoft Defender for Endpoint Plan 2",
    cost: 5.2,
    category: "security",
    source: SOURCES.DEFENDER_ENDPOINT_PLANS,
    note: "Adds EDR, automated investigation/response, threat hunting, vulnerability management to P1.",
  },
  defender_office_p2: {
    key: "defender_office_p2",
    name: "Microsoft Defender for Office 365 Plan 2",
    cost: 5.0,
    category: "security",
    source: SOURCES.DEFENDER_OFFICE_365,
    note: "Adds Threat Explorer, Attack Simulation Training, Threat Trackers, and Campaign Views on top of the P1 capabilities included with F3.",
  },
  defender_suite: {
    key: "defender_suite",
    name: "Microsoft Defender Suite (E5 Security add-on)",
    cost: 12.0,
    category: "security",
    source: SOURCES.DEFENDER_XDR,
    note: "Bundles Defender XDR (Defender for Endpoint P2 + Defender for Identity + Defender for Cloud Apps + Defender for Office 365 P2) and Entra ID P2. Already bundled inside Microsoft 365 E5 / E7.",
  },
  // ---- Compliance (Purview Suite / E5 Compliance add-on) -----------------
  purview_dlp: {
    key: "purview_dlp",
    name: "Microsoft Purview Suite (M365 E5 Compliance add-on)",
    cost: 12.0,
    category: "compliance",
    source: SOURCES.PURVIEW_COMPLIANCE_PLANS,
    note: "Brings Purview DLP, IRM, Communication Compliance, eDiscovery Premium, Audit Premium, Customer Lockbox, Insider Risk Management. Already bundled inside Microsoft 365 E5 / E7. Frontline workers rarely qualify — usually a hard fail to E5.",
  },
  // ---- Endpoint (Intune Suite + standalone Intune add-ons) ----------------
  intune_suite: {
    key: "intune_suite",
    name: "Microsoft Intune Suite",
    cost: 10.0,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Bundles Endpoint Privilege Management + Remote Help + Microsoft Tunnel for MAM + Microsoft Cloud PKI + Enterprise App Management + Advanced Endpoint Analytics. Break-even is roughly two or more standalone add-ons per user.",
  },
  intune_epm: {
    key: "intune_epm",
    name: "Microsoft Intune Endpoint Privilege Management",
    cost: 3.0,
    category: "endpoint",
    source: SOURCES.INTUNE_EPM,
    note: "Just-in-time, file-elevation-based local admin rights for Windows endpoints. Standalone add-on; also bundled in the Intune Suite.",
  },
  intune_remote_help: {
    key: "intune_remote_help",
    name: "Microsoft Intune Remote Help",
    cost: 3.5,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Cloud-based, Entra-authenticated remote-assistance / screen-sharing for Intune-managed endpoints. License both helpdesk technicians AND end users in scope of assistance sessions. Standalone add-on; also bundled in the Intune Suite.",
  },
  intune_tunnel_mam: {
    key: "intune_tunnel_mam",
    name: "Microsoft Tunnel for Mobile Application Management",
    cost: 2.0,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Per-app VPN for unenrolled (BYOD) iOS / Android devices managed via MAM app-protection policies. Standalone add-on; also bundled in the Intune Suite.",
  },
  intune_cloud_pki: {
    key: "intune_cloud_pki",
    name: "Microsoft Cloud PKI",
    cost: 2.0,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Managed cloud certificate authority for Intune-managed devices — replaces on-premises Microsoft AD CS + NDES + Intune Connector. Standalone add-on; also bundled in the Intune Suite.",
  },
  intune_eam: {
    key: "intune_eam",
    name: "Microsoft Intune Enterprise App Management",
    cost: 2.0,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Curated, Microsoft-maintained Windows app catalog with auto-updates inside Intune (alternative to packaging Win32 apps manually). Standalone add-on; also bundled in the Intune Suite.",
  },
  intune_aea: {
    key: "intune_aea",
    name: "Microsoft Intune Advanced Endpoint Analytics",
    cost: 2.0,
    category: "endpoint",
    source: SOURCES.INTUNE_ADDONS,
    note: "Deeper device + user experience telemetry (anomaly detection, device timeline, custom scopes) on top of the baseline Endpoint Analytics included with Intune. Standalone add-on; also bundled in the Intune Suite.",
  },
} satisfies Record<string, PriceItem>;

/**
 * Hard-fail uplift policy — which feature gap forces which enterprise SKU.
 * Used by the wizard to roll up many "no, F can't do this" signals into the
 * single cheapest E recommendation that closes every gap.
 */
export type UpliftTarget = "e3" | "e5";

/** Pretty-print a USD price to 2 decimals with a leading $. */
export function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Result-level pricing recommendations
// ---------------------------------------------------------------------------
// Every result node in the decision tree (other than result_frontline_computed,
// which is wizard-driven via FrontlineRecommendation) gets a static pricing
// recommendation here so the result card can render a "cost breakdown +
// comparison chart + AI reasoning" panel like the frontline computed result.
//
// Why a separate map (not embedded in tree.js)?
//   1. Tree.js is data-only with no imports — putting price math in it would
//      drag the SKU catalog into the tree. Keeping pricing here means one
//      source of truth and one disclaimer ("last verified" date).
//   2. Some result nodes (Education, Government, Nonprofit, External ID,
//      E7 Frontier Suite) don't have flat public list prices we can
//      compare in dollars — those map to a specialty-note instead of a
//      numeric table, gracefully degrading.
//   3. The privileged-admin lens (info_privileged_admins) cross-references
//      this map: the admin's own account on the recommended SKU is usually
//      $0 (Entra ID Free) unless their answers tripped a per-user feature
//      (PIM / Identity Protection / Teams Premium admin features / Remote
//      Help helper / Copilot for self / Governance configurator). That
//      annotation lives here, next to the numbers, not in tree.js.

/** One row in the recommendation breakdown — either a base SKU or an add-on. */
export type RecommendationLine = {
  /** SKU label (e.g. "Microsoft 365 E3", "Microsoft 365 Copilot"). */
  label: string;
  /** USD per user / month, list, annual commitment. May be null for
   *  specialty SKUs whose price isn't a flat per-user number (E7, A-SKUs,
   *  G-SKUs, MAU-based External ID, grant-priced Nonprofit). */
  cost: number | null;
  /** Optional Microsoft source for the SKU / price (preferred over docs). */
  source?: { label: string; url: string };
  /** Short blurb shown under the line item. */
  note?: string;
};

/** One alternative posture in the comparison chart. */
export type RecommendationAlternative = {
  /** Human label for the alternative ("Microsoft 365 E5", "Add Copilot"). */
  label: string;
  /** USD per user / month for the alternative — used for the bar-chart
   *  width and the delta column. Null for specialty SKUs. */
  cost: number | null;
  /** Plain-English note about what this alternative buys you, what it
   *  doesn't, and why it isn't the cheapest path that closes your
   *  requirements. */
  note: string;
};

/** Full recommendation payload for one result node. */
export type ResultPricing = {
  /** Human label for the recommended posture ("Microsoft 365 E3 + Copilot"). */
  recommendationLabel: string;
  /** Per-line breakdown of the recommended SKU + add-on stack. */
  lines: RecommendationLine[];
  /** Higher / lower-tier postures the user could have chosen, with the
   *  cost delta the chart will visualise and a plain-English note on the
   *  tradeoff. ORDER MATTERS: render top-to-bottom; usually "next step up"
   *  first, then the bigger uplift. */
  alternatives: RecommendationAlternative[];
  /** Plain-English bullets explaining why this posture is cheapest path. */
  reasoning: string[];
  /** Privileged-admin lens — extra paragraph shown when the user picked the
   *  privileged-admin profile at the start. Cross-references the
   *  info_privileged_admins guide rules: admin's own account is usually
   *  no-license unless their answers tripped a per-user feature. */
  privilegedAdminLens?: string;
  /** Specialty marker: set true for SKUs with no flat public list price
   *  (Microsoft 365 E7, Education A-SKUs, Government G-SKUs / IL5 / IL6,
   *  Nonprofit grants, MAU-based External ID). When true, the renderer
   *  shows the recommendation + reasoning but suppresses the numeric
   *  table and bar chart, replacing them with a "specialty pricing —
   *  contact your Microsoft account team" note. */
  specialty?: boolean;
};

/** Sum the numeric prices on a recommendation; null lines (specialty SKUs)
 *  count as zero so the chart still renders a sensible bar. */
export function sumLines(lines: RecommendationLine[]): number {
  return lines.reduce((sum, l) => sum + (l.cost ?? 0), 0);
}

/** Helper: build a RecommendationLine straight from a catalog entry. */
function lineOf(item: PriceItem, overrideNote?: string): RecommendationLine {
  return {
    label: item.name,
    cost: item.cost,
    source: item.source,
    note: overrideNote ?? item.note,
  };
}

// ---------------------------------------------------------------------------
// RESULT_PRICING — keyed by tree.js result node ID. Coverage notes inline.
// ---------------------------------------------------------------------------
export const RESULT_PRICING: Record<string, ResultPricing> = {
  // ===== Information worker profile =======================================
  result_iw_e3: {
    recommendationLabel: "Microsoft 365 E3",
    lines: [lineOf(BASE_SKUS.e3)],
    alternatives: [
      {
        label: "Microsoft 365 E5",
        cost: BASE_SKUS.e5.cost,
        note: "Adds Defender XDR + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro. Costs +$21 / user / month. Only worth it if at least two E5-tier features are actually in scope — otherwise buy the matching standalone add-on on top of E3.",
      },
      {
        label: "Microsoft 365 E3 + Copilot",
        cost: BASE_SKUS.e3.cost + ADDONS.copilot_m365.cost,
        note: "Add Microsoft 365 Copilot per Copilot user. +$30 / user / month — only for users who actually use Copilot, not the whole tenant.",
      },
      {
        label: "Microsoft 365 Business Premium",
        cost: BASE_SKUS.business_premium.cost,
        note: "SMB equivalent of E3-class security and management — only available if the tenant has ≤300 seats across all Business SKUs combined. -$14 / user / month vs E3.",
      },
    ],
    reasoning: [
      "Information worker who needs desktop Office + Exchange mailbox + Teams + Intune + Entra ID P1, but declined every E5-tier trigger (Defender XDR / Purview E5 / Entra ID P2) and doesn't need Copilot.",
      "M365 E3 ($36 / user / month) is the smallest Enterprise SKU that closes all of those needs. Jumping to E5 would add $21 / user / month for features the user explicitly declined.",
      "If a specific E5-tier feature surfaces later for a small subset of users, buy the matching standalone add-on (Defender Suite, Purview Suite, Entra ID P2, Teams Premium) on top of E3 — cheaper than upgrading the whole tenant.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: the admin's own account does NOT need E3. A dedicated privileged-admin identity (admin-firstname@tenant.onmicrosoft.com) with no mailbox / Teams / Office consumption runs on Entra ID Free at $0 / month per the privileged-access guide — see Background → info_privileged_admins. Buy E3 for the PRIMARY day-to-day accounts of users; layer premium tiers only where the admin's answers in this assessment confirmed a per-user trigger.",
  },
  result_iw_e3_copilot: {
    recommendationLabel: "Microsoft 365 E3 + Copilot",
    lines: [lineOf(BASE_SKUS.e3), lineOf(ADDONS.copilot_m365)],
    alternatives: [
      {
        label: "Microsoft 365 E5 + Copilot",
        cost: BASE_SKUS.e5.cost + ADDONS.copilot_m365.cost,
        note: "Upgrade base to E5 — adds Defender XDR + Purview E5 + Entra ID P2. +$21 / user / month vs E3 + Copilot. Only worth it if E5-tier features are in scope.",
      },
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles E5 + Copilot + Entra Suite + Agent 365 in one SKU. Confirm bundle pricing with your Microsoft account team — typically cheaper than stacking E5 + Copilot + Entra Suite individually when all three are needed.",
      },
    ],
    reasoning: [
      "Information worker who needs E3-class capabilities AND Microsoft 365 Copilot, but declined Entra Suite + Agent 365.",
      "E3 + Copilot ($36 + $30 = $66 / user / month) is cheaper than E5 + Copilot ($57 + $30 = $87) and only the users who actually use Copilot need the $30 add-on.",
      "If Copilot adoption stays small (< ~30% of users), per-user Copilot on top of E3 beats every bundled alternative on cost — the bundled E5 / E7 paths only win when every E5-tier feature is also needed.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: if the admin themselves invokes Copilot (in Word / Excel / PowerPoint / Outlook / Teams, or runs M365 Copilot Chat work prompts under their admin account), Copilot must be assigned to THAT account too — the admin-firstname@tenant.onmicrosoft.com identity. See info_privileged_admins → Notable exceptions point (6). Otherwise the admin's account stays on Entra ID Free ($0).",
  },
  result_iw_e5: {
    recommendationLabel: "Microsoft 365 E5",
    lines: [lineOf(BASE_SKUS.e5)],
    alternatives: [
      {
        label: "Microsoft 365 E3 + Defender Suite + Purview Suite",
        cost: BASE_SKUS.e3.cost + ADDONS.defender_suite.cost + ADDONS.purview_dlp.cost,
        note: "Stack the security + compliance add-ons on top of E3. $36 + $12 + $12 = $60. Slightly more than E5 list ($57) AND missing Teams Phone + Power BI Pro that E5 bundles. E5 wins on value.",
      },
      {
        label: "Microsoft 365 E5 + Copilot",
        cost: BASE_SKUS.e5.cost + ADDONS.copilot_m365.cost,
        note: "Add Copilot per Copilot user. +$30 / user / month.",
      },
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles E5 + Copilot + Entra Suite + Agent 365 in one SKU. Confirm with your account team if all three add-ons are needed.",
      },
    ],
    reasoning: [
      "Information worker AND at least one E5-tier trigger (Defender XDR / Purview E5 / Entra ID P2) is in scope for the same user.",
      "M365 E5 ($57 / user / month) is the single SKU that bundles Defender Suite + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro. Stacking E3 + Defender Suite + Purview Suite hits $60 and misses Teams Phone + Power BI — E5 wins on price AND coverage.",
      "License every user in scope of any E5 policy, not just the policy author. The Purview, Defender, and Entra ID Governance docs are explicit on this.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: the admin's account does NOT automatically need E5. The admin's PIM-eligible / Identity Protection / Purview-monitored / Copilot-using status (each captured by the per-question depth in this tree) determines whether their own account needs Entra ID P2, Purview Suite, Defender Suite, or Copilot — not blanket E5. See info_privileged_admins. The recommended E5 here is for the IN-SCOPE primary accounts; layer admin-account add-ons separately.",
  },
  result_iw_e7: {
    recommendationLabel: "Microsoft 365 E7 (Frontier Suite)",
    lines: [
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        source: {
          label: "Microsoft 365 E7 (Frontier Suite) announcement",
          url: "https://learn.microsoft.com/partner-center/announcements/2026-may",
        },
        note: "Bundles M365 E5 + Microsoft 365 Copilot + Microsoft Entra Suite + Agent 365 in one per-user SKU. Confirm pricing with your Microsoft account team — typically cheaper than stacking E5 + Copilot ($30) + Entra Suite ($12) + Agent 365 individually.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 E5 + Copilot + Entra Suite (stacked)",
        cost: BASE_SKUS.e5.cost + ADDONS.copilot_m365.cost + ADDONS.entra_suite.cost,
        note: "Stack the components individually. $57 + $30 + $12 = $99 / user / month, PLUS Agent 365 (not yet a public per-user list price). E7 is normally meaningfully cheaper as a bundle.",
      },
    ],
    reasoning: [
      "Information worker AND every premium dimension fires: E5-tier security/compliance, Copilot, Entra Suite (Internet/Private Access, Verified ID), and Agent 365 governance.",
      "E7 (Frontier Suite, GA 2026-05-01) bundles all four in a single per-user SKU at a list price below the sum of E5 + Copilot + Entra Suite + Agent 365 stacked individually.",
      "E7 customers also get Security Copilot capacity included at no extra cost.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: E7 includes Entra ID P2 (via Entra Suite), so a privileged admin assigned E7 covers PIM / Identity Protection / Governance triggers on the same account. Most admins do not need E7 themselves — assign it to the PRIMARY accounts in scope; the admin-firstname@tenant.onmicrosoft.com account stays on Entra ID Free + standalone Entra ID P2 ($9 / month) ONLY if their answers in this tree confirmed a per-user P2 trigger.",
    specialty: true,
  },
  result_iw_apps: {
    recommendationLabel: "Microsoft 365 Apps for Enterprise",
    lines: [
      {
        label: "Microsoft 365 Apps for Enterprise",
        cost: 12.0,
        source: SOURCES.LICENSING_DOCS_HUB,
        note: "Installed Office desktop apps (Word / Excel / PowerPoint / Outlook / OneNote) + 1 TB OneDrive. NO Exchange mailbox, NO Teams, NO SharePoint, NO Intune, NO Entra ID P1.",
      },
    ],
    alternatives: [
      {
        label: "Office 365 E1",
        cost: 10.0,
        note: "Web + mobile Office, 50 GB Exchange, Teams, SharePoint, OneDrive — but NO desktop Office. Wrong choice if the user needs desktop apps.",
      },
      {
        label: "Office 365 E3",
        cost: 23.0,
        note: "Apps for Enterprise + Exchange P2 + Teams + SharePoint cloud services (no Windows, no Intune, no Defender / Purview / Entra ID P1). Pick this if a cloud mailbox + collaboration are also needed.",
      },
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "Apps + cloud services + Windows + Intune + Entra ID P1 + Defender for Office P1. Pick this if the user is on a managed Windows endpoint.",
      },
    ],
    reasoning: [
      "User declined the full M365 bundle and only needs installed Office apps — mail / chat / collaboration come from a third party (Google Workspace, on-prem Exchange, etc.).",
      "Microsoft 365 Apps for Enterprise (~$12 / user / month) is the smallest list-priced SKU that covers desktop Office on 5 PCs + 5 tablets + 5 phones + 1 TB OneDrive without bundling cloud services the user doesn't need.",
      "Step up to Office 365 E1 / E3 / E5 if cloud collab is added later, or M365 E3 / E5 if Windows + Intune are also needed.",
    ],
  },
  result_iw_o1: {
    recommendationLabel: "Office 365 E1",
    lines: [
      {
        label: "Office 365 E1",
        cost: 10.0,
        source: SOURCES.ENTERPRISE_PRICING,
        note: "Web + mobile Office (no desktop apps), 50 GB Exchange mailbox, Teams, SharePoint, OneDrive (1 TB). NO Windows, NO Intune, NO Defender / Purview / Entra ID P1.",
      },
    ],
    alternatives: [
      {
        label: "Office 365 E3",
        cost: 23.0,
        note: "Adds desktop Office apps + Exchange P2 (100 GB mailbox + auto-expanding archive) + AIP P1 + Defender for Office P1. +$13 / user / month.",
      },
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "O365 E3 + Windows + Intune + Entra ID P1 — the full managed-endpoint stack. +$26 / user / month vs O365 E1.",
      },
    ],
    reasoning: [
      "Information worker who needs cloud email + Teams + SharePoint but only web/mobile Office (no installed desktop apps), and no Windows / Intune / Entra ID P1.",
      "Office 365 E1 (~$10 / user / month) is the cheapest list-priced SKU that delivers the cloud-collab stack without paying for desktop apps the user doesn't install.",
      "Upgrade to O365 E3 the moment a user actually installs desktop Office; upgrade to M365 E3 the moment a user needs a managed Windows device or Intune-protected mobile.",
    ],
  },
  result_iw_o3: {
    recommendationLabel: "Office 365 E3",
    lines: [
      {
        label: "Office 365 E3",
        cost: 23.0,
        source: SOURCES.ENTERPRISE_PRICING,
        note: "Apps for Enterprise + Exchange Online Plan 2 (100 GB mailbox + auto-expanding archive) + Teams + SharePoint + OneDrive + AIP P1 + Defender for Office P1. NO Windows, NO Intune, NO Entra ID P1.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "O365 E3 + Windows + Intune + Entra ID P1. +$13 / user / month — the right pick the moment the user has a managed Windows or mobile device.",
      },
      {
        label: "Office 365 E5",
        cost: 38.0,
        note: "Adds Power BI Pro + Teams Phone + advanced compliance. +$15 / user / month vs O365 E3, but no Windows / Intune. Niche pick.",
      },
    ],
    reasoning: [
      "Information worker who needs the full Office + Exchange + Teams + SharePoint cloud stack but does NOT need Windows licensing, Intune endpoint management, or Entra ID P1 Conditional Access.",
      "Office 365 E3 (~$23 / user / month) is the cheapest SKU with desktop Office + 100 GB Exchange + collab. The moment the user gets a managed Windows device, jump to M365 E3 — $13 / month for Windows + Intune + Entra ID P1 is a great deal.",
    ],
  },
  result_iw_o5: {
    recommendationLabel: "Office 365 E5",
    lines: [
      {
        label: "Office 365 E5",
        cost: 38.0,
        source: SOURCES.ENTERPRISE_PRICING,
        note: "O365 E3 + Defender for Office P2 + Audit (Premium) + Customer Lockbox + Customer Key + Advanced eDiscovery + Power BI Pro + Teams Phone Standard. NO Windows, NO Intune, NO Entra ID P2.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 E5",
        cost: BASE_SKUS.e5.cost,
        note: "O365 E5 + Windows + Intune + Defender for Endpoint P2 + Defender for Identity + Defender for Cloud Apps + Entra ID P2. +$19 / user / month — the right pick the moment Windows / Intune / Entra ID P2 enter scope.",
      },
    ],
    reasoning: [
      "Information worker who needs E5-tier Office security/compliance + Power BI Pro + Teams Phone but does NOT need Windows / Intune / Defender for Endpoint / Entra ID P2 — niche profile.",
      "Office 365 E5 (~$38 / user / month) is the cheapest path to those features without paying for the M365 components the user doesn't need. The moment Defender for Endpoint or Entra ID P2 enters scope, jump to M365 E5.",
    ],
  },

  // ===== SMB (Business) profile ===========================================
  result_smb_apps: {
    recommendationLabel: "Microsoft 365 Apps for Business",
    lines: [
      {
        label: "Microsoft 365 Apps for Business",
        cost: 8.25,
        source: SOURCES.BUSINESS_COMPARE_PLANS,
        note: "Installed Office desktop apps + 1 TB OneDrive. NO Exchange mailbox, NO Teams, NO SharePoint, NO Intune. SMB-tier apps-only SKU. 300-seat cap.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 Business Basic",
        cost: BASE_SKUS.business_basic.cost,
        note: "Web/mobile Office + Exchange (50 GB) + Teams + SharePoint + OneDrive — but no desktop apps. -$2.25 / user / month, very different feature set.",
      },
      {
        label: "Microsoft 365 Business Standard",
        cost: BASE_SKUS.business_standard.cost,
        note: "Apps for Business + Exchange + Teams + SharePoint. +$4.25 / user / month — usually the right pick once email + collab are also needed.",
      },
    ],
    reasoning: [
      "SMB (≤300 seats) user who needs installed Office desktop apps only — mail / chat / collaboration come from a third party.",
      "M365 Apps for Business (~$8.25 / user / month) is the SMB equivalent of M365 Apps for Enterprise at a lower price, with the same 5-device install rights.",
    ],
  },
  result_smb_basic: {
    recommendationLabel: "Microsoft 365 Business Basic",
    lines: [lineOf(BASE_SKUS.business_basic)],
    alternatives: [
      {
        label: "Microsoft 365 Business Standard",
        cost: BASE_SKUS.business_standard.cost,
        note: "Adds desktop Office apps + Clipchamp + webinar tooling. +$6.50 / user / month — almost always the right pick once any user installs Office.",
      },
      {
        label: "Microsoft 365 Business Premium",
        cost: BASE_SKUS.business_premium.cost,
        note: "Standard + Intune + Entra ID P1 + Defender for Business + AIP P1. +$16 / user / month — pick this the moment endpoint management or Conditional Access is in scope.",
      },
    ],
    reasoning: [
      "SMB (≤300 seats) user who only needs cloud mail + Teams + SharePoint + web/mobile Office (no desktop apps, no Intune).",
      "Business Basic ($6 / user / month) is the cheapest legitimate Business-tier SKU when the user genuinely doesn't install Office on a PC/Mac.",
    ],
  },
  result_smb_standard: {
    recommendationLabel: "Microsoft 365 Business Standard",
    lines: [lineOf(BASE_SKUS.business_standard)],
    alternatives: [
      {
        label: "Microsoft 365 Business Premium",
        cost: BASE_SKUS.business_premium.cost,
        note: "Adds Intune + Entra ID P1 + Defender for Business + AIP P1 — the SMB security & management stack. +$9.50 / user / month and the right pick the moment endpoint management enters scope.",
      },
      {
        label: "Microsoft 365 Business Standard + Copilot",
        cost: BASE_SKUS.business_standard.cost + ADDONS.copilot_m365.cost,
        note: "Add Copilot per Copilot user. +$30 / user / month — only for users who actually use Copilot.",
      },
    ],
    reasoning: [
      "SMB (≤300 seats) user who needs desktop Office + Exchange + Teams + SharePoint but does NOT need Intune / Conditional Access / Defender — small business with little / no formal endpoint management.",
      "Business Standard ($12.50 / user / month) is the SMB analog of Office 365 E3 at a lower price. Eligible base plan for the Copilot add-on.",
    ],
  },
  result_smb_premium: {
    recommendationLabel: "Microsoft 365 Business Premium",
    lines: [lineOf(BASE_SKUS.business_premium)],
    alternatives: [
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "Enterprise tier — same identity / security / management baseline as Business Premium PLUS unlimited mailbox archive + Windows Enterprise edition rights. +$14 / user / month, no 300-seat cap. Switch the moment headcount exceeds 300 OR you need E3-only features.",
      },
      {
        label: "Microsoft 365 Business Premium + Copilot",
        cost: BASE_SKUS.business_premium.cost + ADDONS.copilot_m365.cost,
        note: "Add Copilot per Copilot user. +$30 / user / month.",
      },
      {
        label: "Microsoft 365 Business Premium + Defender for Endpoint P2",
        cost: BASE_SKUS.business_premium.cost + ADDONS.defender_endpoint_p2.cost,
        note: "Adds EDR + automated investigation + threat hunting to Defender for Business. +$5.20 / user / month for mature SMB SOC posture.",
      },
    ],
    reasoning: [
      "SMB (≤300 seats) user who needs desktop Office + Exchange + Teams + Intune + Entra ID P1 + Defender for Business + AIP P1 — full SMB security + management stack.",
      "Business Premium ($22 / user / month) is the SMB equivalent of M365 E3 with the same identity / security baseline at $14 / user / month less. Eligible for Copilot.",
      "The 300-seat hard cap is across ALL Business SKUs combined in the tenant — once the tenant approaches 300 seats, plan the M365 E3 migration.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: SMB tenants often run with one or two human admins and skip the dedicated-admin-account pattern. Microsoft's privileged-access guidance applies regardless of tenant size — see info_privileged_admins. Create a separate admin-firstname@tenant.onmicrosoft.com identity, leave it on Entra ID Free ($0), and don't assign Business Premium to it.",
  },

  // ===== Frontline profile ================================================
  result_frontline_f1: {
    recommendationLabel: "Microsoft 365 F1",
    lines: [lineOf(BASE_SKUS.f1)],
    alternatives: [
      {
        label: "Microsoft 365 F3",
        cost: BASE_SKUS.f3.cost,
        note: "Adds 2 GB Exchange mailbox + Office web/mobile + Defender for Office P1 + AIP P1. +$5.75 / user / month — the right pick the moment the user needs a personal mailbox.",
      },
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "Full information-worker SKU. +$33.75 / user / month — wrong fit for a kiosk-grade frontline worker.",
      },
    ],
    reasoning: [
      "Kiosk-grade frontline worker who needs Teams + SharePoint browse + Intune + Entra ID P1, but no personal Exchange mailbox and no Office authoring.",
      "F1 ($2.25 / user / month) is the cheapest legitimate M365 SKU. Wrong fit if the user needs to send / receive personal mail — flip to F3.",
    ],
  },
  result_frontline_f3: {
    recommendationLabel: "Microsoft 365 F3",
    lines: [lineOf(BASE_SKUS.f3)],
    alternatives: [
      {
        label: "Microsoft 365 F3 + Teams Phone for Frontline",
        cost: BASE_SKUS.f3.cost + ADDONS.teams_phone_frontline.cost,
        note: "Adds Teams Phone (cloud calling). +$4 / user / month for frontline workers who need PSTN calling.",
      },
      {
        label: "Microsoft 365 F3 + Defender for Endpoint P1",
        cost: BASE_SKUS.f3.cost + ADDONS.defender_endpoint_p1.cost,
        note: "Adds next-gen AV + ASR for frontline endpoints. +$3 / user / month for tenants that don't already have Defender for Endpoint.",
      },
      {
        label: "Microsoft 365 E3",
        cost: BASE_SKUS.e3.cost,
        note: "Full information-worker SKU — desktop Office + 100 GB mailbox + Windows Enterprise. +$28 / user / month. The right pick once frontline-tier limits (2 GB mailbox, Office web/mobile only on <10.9″ devices) become a problem.",
      },
    ],
    reasoning: [
      "Full-featured frontline worker who needs Teams + SharePoint + a 2 GB personal mailbox + Office web/mobile + Intune + Defender for Office P1 + AIP P1.",
      "F3 ($8 / user / month) is the cheapest legitimate frontline SKU with a personal mailbox. Stacking too many add-ons makes the F + add-ons total exceed E3 — at that point run the frontline computed wizard for the right tradeoff.",
    ],
  },

  // ===== Premium add-on results (admin tree) =============================
  result_defender_suite_only: {
    recommendationLabel: "Microsoft Defender Suite add-on (on top of an E3-class base)",
    lines: [lineOf(ADDONS.defender_suite)],
    alternatives: [
      {
        label: "Microsoft 365 E5 (full upgrade)",
        cost: BASE_SKUS.e5.cost,
        note: "Bundles Defender Suite + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro. Worth it only if Purview features are also needed — otherwise the Defender Suite add-on is cheaper.",
      },
      {
        label: "E3 + Defender Suite + Purview Suite (stacked)",
        cost: BASE_SKUS.e3.cost + ADDONS.defender_suite.cost + ADDONS.purview_dlp.cost,
        note: "Stack both add-ons on top of E3: $36 + $12 + $12 = $60. $3 more than full E5 and missing Teams Phone + Power BI — at that point upgrade to E5.",
      },
    ],
    reasoning: [
      "User needs Defender XDR / Defender Suite features (Defender for Endpoint P2, Identity, Cloud Apps, Office P2) but explicitly declined Purview E5 — so the Defender Suite add-on alone covers the gap.",
      "Defender Suite add-on ($12 / user / month) on top of E3 ($36) totals $48 — $9 cheaper than full E5 ($57). The add-on also bundles Entra ID P2, so PIM and Identity Protection are covered for the same user.",
      "Microsoft Sentinel is billed in Azure per-GB and is a separate purchase — the standard combo is Defender Suite + Sentinel for unified SecOps.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: the SOC analyst's portal access to Defender XDR is ROLE-GATED, not license-gated — see info_privileged_admins. The Defender Suite license applies to the USERS / DEVICES being protected, not the analyst's account. Add Defender Suite to the analyst's account only if their own laptop is enrolled and protected by the Suite components.",
  },
  result_e5_compliance_only: {
    recommendationLabel:
      "Microsoft Purview Suite (E5 Compliance add-on) on top of an E3-class base",
    lines: [lineOf(ADDONS.purview_dlp)],
    alternatives: [
      {
        label: "Microsoft 365 E5 (full upgrade)",
        cost: BASE_SKUS.e5.cost,
        note: "Bundles Purview E5 + Defender Suite + Entra ID P2 + Teams Phone + Power BI Pro. Worth it only if Defender Suite features are also needed.",
      },
      {
        label: "E3 + Purview Suite + Defender Suite (stacked)",
        cost: BASE_SKUS.e3.cost + ADDONS.purview_dlp.cost + ADDONS.defender_suite.cost,
        note: "Stack both add-ons: $36 + $12 + $12 = $60. $3 more than full E5 and missing Teams Phone + Power BI — at that point upgrade to E5.",
      },
    ],
    reasoning: [
      "User needs Purview E5 features (IRM, Communication Compliance, eDiscovery Premium, Audit Premium, Customer Lockbox, Insider Risk Management) but explicitly declined Defender XDR — so the Purview Suite add-on alone covers the gap.",
      "Purview Suite ($12 / user / month) on top of E3 ($36) totals $48 — $9 cheaper than full E5 ($57). The add-on also bundles Entra ID P2.",
      "License every USER IN SCOPE of a Purview policy, not just the admin who configures it — Microsoft's Purview service description is explicit on this rule.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: the IRM admin's portal access to Microsoft Purview is ROLE-GATED, not license-gated — see info_privileged_admins. The Purview Suite license applies to the USERS being monitored / protected / placed on hold, not the admin's account. Add Purview Suite to the admin's account only if their own account is in scope of an IRM policy, Communication Compliance review, or Audit Premium hold.",
  },
  result_e5_full: {
    recommendationLabel: "Microsoft 365 E5",
    lines: [lineOf(BASE_SKUS.e5)],
    alternatives: [
      {
        label: "E3 + Defender Suite + Purview Suite (stacked)",
        cost: BASE_SKUS.e3.cost + ADDONS.defender_suite.cost + ADDONS.purview_dlp.cost,
        note: "Stack both add-ons on top of E3. $36 + $12 + $12 = $60. $3 MORE than E5 and missing Teams Phone + Power BI — E5 wins on both price and coverage.",
      },
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles E5 + Copilot + Entra Suite + Agent 365 in one SKU. Confirm with your account team if Copilot + Entra Suite + Agent 365 are also needed.",
      },
    ],
    reasoning: [
      "User needs BOTH Purview E5 features AND Defender Suite features for the same account.",
      "M365 E5 ($57 / user / month) is the single SKU that bundles both AND also includes Entra ID P2 + Teams Phone + Power BI Pro. Stacking the add-ons individually hits $60 and misses the bundled extras — E5 wins on both price and coverage.",
    ],
  },
  result_e7_full: {
    recommendationLabel: "Microsoft 365 E7 (Frontier Suite)",
    lines: [
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        source: {
          label: "Microsoft 365 E7 (Frontier Suite) announcement",
          url: "https://learn.microsoft.com/partner-center/announcements/2026-may",
        },
        note: "Bundles M365 E5 + Microsoft 365 Copilot + Microsoft Entra Suite + Agent 365 in one per-user SKU. Confirm pricing with your Microsoft account team.",
      },
    ],
    alternatives: [
      {
        label: "M365 E5 + Copilot + Entra Suite (stacked)",
        cost: BASE_SKUS.e5.cost + ADDONS.copilot_m365.cost + ADDONS.entra_suite.cost,
        note: "Stack individually: $57 + $30 + $12 = $99 / user / month, PLUS Agent 365 (no public per-user list price). E7 is normally cheaper as a bundle.",
      },
    ],
    reasoning: [
      "User needs E5-tier security/compliance AND Copilot AND Entra Suite (Internet/Private Access, Verified ID) AND Agent 365 governance — every premium dimension fires.",
      "E7 (Frontier Suite, GA 2026-05-01) bundles all four in a single SKU below the stacked list price.",
      "E7 customers also get Security Copilot capacity included at no extra cost.",
    ],
    specialty: true,
  },
  result_teams_premium: {
    recommendationLabel: "Microsoft Teams Premium add-on",
    lines: [lineOf(ADDONS.teams_premium)],
    alternatives: [
      {
        label: "No Teams Premium",
        cost: 0,
        note: "If no user actually needs intelligent recap / advanced webinars / town hall premium / sensitivity-labeled meetings / branded meetings, Teams Premium is unused capacity — skip it.",
      },
    ],
    reasoning: [
      "User needs Teams Premium organizer features (advanced webinars, town halls premium, sensitivity-labeled meetings, branded meetings), attendee features (intelligent recap, AI notes, live translation under their own account), OR Teams admin features (advanced collaboration analytics).",
      "Teams Premium ($10 / user / month) is a per-user add-on — license only the organizers / attendees / admins in scope, not the whole tenant.",
      "Teams Premium is NOT bundled in E3, E5, or E7 — it remains a separate add-on across all base SKUs.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (2), the Teams admin's OWN account must have Teams Premium assigned if they use admin-only analytics views (Advanced collaboration analytics, aggregated Teams Premium usage reports) in the Teams admin center. This is one of the few admin scenarios where the admin's account needs the add-on even when they aren't using meeting features themselves.",
  },
  result_id_governance: {
    recommendationLabel: "Microsoft Entra ID Governance",
    lines: [lineOf(ADDONS.entra_id_governance)],
    alternatives: [
      {
        label: "Microsoft Entra Suite",
        cost: ADDONS.entra_suite.cost,
        note: "Bundles Governance + Entra ID P2 + Global Secure Access + Verified ID. +$5 / user / month and the right pick if Internet/Private Access or Verified ID are also needed.",
      },
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles Entra Suite + E5 + Copilot + Agent 365. Confirm with your account team.",
      },
    ],
    reasoning: [
      "User configures or is in scope of Entra ID Governance features: Entitlement Management access packages, Lifecycle Workflows, ML-assisted access reviews, PIM for Groups.",
      "Entra ID Governance ($7 / user / month) includes Entra ID P2 — so it also covers PIM and Identity Protection for the same user.",
      "Per the Governance licensing FAQ, the admin who CONFIGURES Lifecycle Workflows / Entitlement Management needs a license — this is one of the explicit exceptions to the role-gated rule.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (3), the Lifecycle Workflows admin who configures the workflow needs an Entra ID Governance license assigned to their OWN account. This is unique among admin scenarios.",
  },
  result_entra_suite: {
    recommendationLabel: "Microsoft Entra Suite",
    lines: [lineOf(ADDONS.entra_suite)],
    alternatives: [
      {
        label: "Microsoft Entra ID Governance only",
        cost: ADDONS.entra_id_governance.cost,
        note: "Cheaper ($7 vs $12 / user / month) but covers only Governance + P2 — no Global Secure Access (Internet Access + Private Access) and no Verified ID. Wrong fit if GSA / VID are in scope.",
      },
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles Entra Suite + E5 + Copilot + Agent 365. Confirm with your account team if all four are needed.",
      },
    ],
    reasoning: [
      "User needs Entra Suite features: Global Secure Access (Internet Access + Private Access), Entra ID Governance (Entitlement Management, Lifecycle Workflows), Entra ID P2 (PIM, Identity Protection), and Verified ID.",
      "Entra Suite ($12 / user / month) bundles all four — cheaper than stacking GSA + Governance + P2 + VID individually and the right pick when GSA replaces a traditional VPN.",
    ],
  },
  result_p2_standalone: {
    recommendationLabel: "Microsoft Entra ID P2 (standalone)",
    lines: [lineOf(ADDONS.entra_id_p2)],
    alternatives: [
      {
        label: "Microsoft Entra ID Governance",
        cost: ADDONS.entra_id_governance.cost,
        note: "P2 + Governance features (Entitlement Management, Lifecycle Workflows). -$2 / user / month if you also need access packages.",
      },
      {
        label: "Microsoft Entra Suite",
        cost: ADDONS.entra_suite.cost,
        note: "P2 + Governance + Global Secure Access + Verified ID. +$3 / user / month for the full Entra premium bundle.",
      },
      {
        label: "Microsoft 365 E5",
        cost: BASE_SKUS.e5.cost,
        note: "Bundles P2 + Defender Suite + Purview E5 + Teams Phone + Power BI Pro. Big jump ($48 difference) — only worth it if E5-tier features are also in scope.",
      },
    ],
    reasoning: [
      "User triggered a P2 requirement (PIM-eligible / approver / reviewer, Identity Protection scope, risk-based Conditional Access) and is NOT on any SKU that already includes P2.",
      "Entra ID P2 standalone ($9 / user / month) is the cheapest path — Microsoft's PIM licensing fundamentals doc requires P2 for every category of user (eligible, approver, reviewer, in-scope of access reviews).",
      "License the admin AND every approver / reviewer / access-review participant — the per-user check fires on each role independently.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (4), every PIM-eligible / approver / reviewer admin needs Entra ID P2 assigned to their own account. The PIM licensing fundamentals doc is explicit: this is enforced per-user, not via role assignment.",
  },
  result_p2_already_included: {
    recommendationLabel: "No additional license — Entra ID P2 is already included",
    lines: [
      {
        label: "Entra ID P2 (included)",
        cost: 0,
        note: "P2 is bundled in the user's existing SKU (M365 E5 / E7, EMS E5, Defender Suite, Entra Suite, or Entra ID Governance). No additional purchase.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft Entra ID P2 (standalone)",
        cost: ADDONS.entra_id_p2.cost,
        note: "Buy standalone P2 for any in-scope user who is NOT on a P2-inclusive SKU — even one uncovered admin makes the PIM configuration non-compliant.",
      },
    ],
    reasoning: [
      "Every in-scope user (admin, approver, reviewer, Identity Protection scope) is already assigned at least one P2-inclusive SKU. No new purchase needed.",
      "VERIFY assignment in the M365 admin center (Users → Licenses & apps) — the tenant owning a pool of E5 SKUs is not the same as a specific admin being assigned one. Auditors verify the per-user tick-box, not the pool.",
      "If even one in-scope admin is on a non-P2 SKU (E3, Business Premium, F-series, Office 365 E5), go back and answer No on the previous question — buy standalone P2 ($9) for that admin to keep PIM configuration compliant.",
    ],
  },
  result_intune_suite_full: {
    recommendationLabel: "Microsoft Intune Suite add-on",
    lines: [lineOf(ADDONS.intune_suite)],
    alternatives: [
      {
        label: "Intune EPM standalone",
        cost: ADDONS.intune_epm.cost,
        note: "Just EPM ($3). The right pick when only ONE Intune Suite feature is in scope per user.",
      },
      {
        label: "Two Intune standalones (e.g. EPM + Remote Help)",
        cost: ADDONS.intune_epm.cost + ADDONS.intune_remote_help.cost,
        note: "$3 + $3.50 = $6.50. Cheaper than the Suite ($10) — but only if exactly two features are in scope. Three or more standalones → Suite wins.",
      },
      {
        label: "All six standalones stacked",
        cost:
          ADDONS.intune_epm.cost +
          ADDONS.intune_remote_help.cost +
          ADDONS.intune_tunnel_mam.cost +
          ADDONS.intune_cloud_pki.cost +
          ADDONS.intune_eam.cost +
          ADDONS.intune_aea.cost,
        note: "$3 + $3.50 + $2 + $2 + $2 + $2 = $14.50 — $4.50 more than the Suite. Once you need three or more, Suite ($10) is always cheaper.",
      },
    ],
    reasoning: [
      "User needs TWO OR MORE of the six Intune Suite features (EPM, Remote Help, Tunnel for MAM, Cloud PKI, EAM, Advanced Endpoint Analytics).",
      "Intune Suite ($10 / user / month) is cheaper than stacking three or more standalones. Break-even is roughly two standalones per user — at three the Suite always wins.",
      "Tunnel for MAM has no standalone SKU — if it's in scope, the Suite is the only path.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (1), Remote Help requires the license on BOTH the helper (admin) AND the sharer (end user). If the admin will run Remote Help sessions, assign the Suite (or Remote Help standalone) to their own account too. The other five features license the managed user / device, not the admin who configures them.",
  },
  result_intune_epm: {
    recommendationLabel: "Microsoft Intune Endpoint Privilege Management (standalone)",
    lines: [lineOf(ADDONS.intune_epm)],
    alternatives: [
      {
        label: "Microsoft Intune Suite",
        cost: ADDONS.intune_suite.cost,
        note: "All six Intune Suite features bundled. +$7 / user / month over EPM standalone — worth it only if a second Intune feature enters scope for the same user.",
      },
    ],
    reasoning: [
      "User needs Endpoint Privilege Management ONLY — none of the other five Intune Suite features are in scope.",
      "EPM standalone ($3 / user / month) is the cheapest path. If a second Intune Suite feature is added later, switch to the Suite at $10.",
    ],
  },
  result_intune_remote_help: {
    recommendationLabel: "Microsoft Intune Remote Help (standalone)",
    lines: [lineOf(ADDONS.intune_remote_help)],
    alternatives: [
      {
        label: "Microsoft Intune Suite",
        cost: ADDONS.intune_suite.cost,
        note: "All six Intune Suite features bundled. +$6.50 / user / month over Remote Help standalone — worth it if a second Intune feature is in scope.",
      },
    ],
    reasoning: [
      "User needs Remote Help ONLY — none of the other five Intune Suite features are in scope.",
      "Remote Help standalone ($3.50 / user / month) is the cheapest path. CRITICAL: license BOTH the helpdesk admin AND every end user whose device receives a session — per Microsoft's planning doc, the helper+sharer rule fires on every pairing.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (1), the helpdesk admin's OWN account must have Remote Help (or Intune Suite) assigned, even though they aren't the end user of the protected workload. Microsoft's Remote Help planning doc states verbatim: 'A Remote Help license for everyone targeted to use the service — both helpers (IT support workers) and sharers (users).'",
  },
  result_intune_tunnel: {
    recommendationLabel: "Microsoft Intune Suite (Tunnel for MAM has no standalone SKU)",
    lines: [
      lineOf(
        ADDONS.intune_suite,
        "Microsoft Tunnel for MAM is ONLY available via the Intune Suite — there is no standalone Tunnel for MAM SKU. Suite ($10 / user / month) is the only path."
      ),
    ],
    alternatives: [
      {
        label: "Microsoft Tunnel for managed devices (included in Intune Plan 1)",
        cost: 0,
        note: "If users have FULLY ENROLLED devices (not BYOD MAM-only), the base Microsoft Tunnel is included in Intune Plan 1 — no Suite needed. Tunnel for MAM is specifically for unenrolled iOS/Android.",
      },
    ],
    reasoning: [
      "User needs Microsoft Tunnel for MAM (per-app VPN for unenrolled BYOD iOS/Android devices).",
      "Tunnel for MAM has NO standalone SKU — it's the only Intune Suite feature without one. Intune Suite ($10 / user / month) is the only purchase path.",
      "If users are on fully-enrolled corporate devices, the base Microsoft Tunnel is included in Intune Plan 1 — no Suite needed.",
    ],
  },
  result_intune_cloud_pki: {
    recommendationLabel: "Microsoft Cloud PKI (standalone)",
    lines: [lineOf(ADDONS.intune_cloud_pki)],
    alternatives: [
      {
        label: "Microsoft Intune Suite",
        cost: ADDONS.intune_suite.cost,
        note: "All six Intune Suite features bundled. +$8 / user / month over Cloud PKI standalone — worth it if a second Intune feature is in scope.",
      },
    ],
    reasoning: [
      "User needs Microsoft Cloud PKI (managed certificate authority for Intune-managed endpoints) — none of the other five Intune Suite features are in scope.",
      "Cloud PKI standalone ($2 / user / month) is the cheapest path. Replaces legacy on-prem ADCS + NDES + Intune Connector for SCEP/PKCS certificate issuance.",
    ],
  },
  result_intune_eam: {
    recommendationLabel: "Microsoft Intune Enterprise App Management (standalone)",
    lines: [lineOf(ADDONS.intune_eam)],
    alternatives: [
      {
        label: "Microsoft Intune Suite",
        cost: ADDONS.intune_suite.cost,
        note: "All six Intune Suite features bundled. +$8 / user / month — worth it if a second Intune feature is in scope.",
      },
    ],
    reasoning: [
      "User needs Enterprise App Management ONLY — none of the other five Intune Suite features are in scope.",
      "EAM standalone ($2 / user / month) is the cheapest path. Microsoft-maintained Enterprise App Catalog with auto-update detection replaces manual Win32 packaging for covered apps.",
    ],
  },
  result_intune_aea: {
    recommendationLabel: "Microsoft Intune Advanced Endpoint Analytics (standalone)",
    lines: [lineOf(ADDONS.intune_aea)],
    alternatives: [
      {
        label: "Microsoft Intune Suite",
        cost: ADDONS.intune_suite.cost,
        note: "All six Intune Suite features bundled. +$8 / user / month — worth it if a second Intune feature is in scope.",
      },
    ],
    reasoning: [
      "User needs Advanced Endpoint Analytics ONLY — none of the other five Intune Suite features are in scope.",
      "Advanced Endpoint Analytics standalone ($2 / user / month) is the cheapest path. Adds anomaly detection, device timelines, and proactive remediation on top of base Endpoint Analytics (which is included in Intune Plan 1).",
    ],
  },
  result_copilot_addon: {
    recommendationLabel: "Microsoft 365 Copilot add-on",
    lines: [lineOf(ADDONS.copilot_m365)],
    alternatives: [
      {
        label: "Microsoft 365 E7 (Frontier Suite)",
        cost: null,
        note: "Bundles Copilot + E5 + Entra Suite + Agent 365. Confirm with your account team — only cheaper than stacked add-ons when all four dimensions fire.",
      },
      {
        label: "Copilot Credits (pay-as-you-go)",
        cost: 0,
        note: "Pay-as-you-go credits for limited agent access without a full Copilot license. Variable cost — only viable for low-volume agent usage.",
      },
    ],
    reasoning: [
      "User needs Microsoft 365 Copilot, has an eligible base plan (E3 / E5 / Business Standard / Business Premium), and does NOT need Entra Suite + Agent 365 in one bundle.",
      "Copilot add-on ($30 / user / month) is the cheapest path — license only the users who actually use Copilot, not the whole tenant.",
      "License assignment gates Copilot access — assignment is what enables Copilot in apps and Copilot Chat work mode.",
    ],
    privilegedAdminLens:
      "Privileged-admin lens: per info_privileged_admins → Notable exceptions point (6), if the admin invokes Copilot in Word / Excel / PowerPoint / Outlook / Teams under their own account, OR runs M365 Copilot Chat work prompts as the admin, Copilot must be assigned to that account too. SOC analysts who only use Security Copilot do NOT need M365 Copilot — Security Copilot is SCU-based, not per-user.",
  },
  result_break_glass: {
    recommendationLabel: "Entra ID Free (break-glass / emergency-access account)",
    lines: [
      {
        label: "Entra ID Free",
        cost: 0,
        source: SOURCES.ENTRA_PRICING,
        note: "Every tenant gets Entra ID Free at no cost. Break-glass accounts run on Free indefinitely — no M365 SKU assignment needed.",
      },
    ],
    alternatives: [
      {
        label: "FIDO2 security key (e.g. YubiKey)",
        cost: null,
        note: "One-time hardware cost ($30-$80 per key). Microsoft recommends at least two FIDO2 keys per break-glass account, stored in physical safes.",
      },
    ],
    reasoning: [
      "Break-glass / emergency-access Global Administrator accounts should NEVER be assigned a paid SKU — Entra ID Free is the correct license posture.",
      "Microsoft recommends at least two break-glass accounts, excluded from MFA / Conditional Access policies that could lock them out, authenticated by FIDO2 hardware keys stored offline.",
      "Audit break-glass account sign-ins quarterly — sign-ins should be RARE and only during true emergencies (Identity Protection outage, MFA service disruption, lost-key recovery).",
    ],
  },
  result_no_license_admin: {
    recommendationLabel: "Entra ID Free (admin account with no license)",
    lines: [
      {
        label: "Entra ID Free",
        cost: 0,
        source: SOURCES.ENTRA_PRICING,
        note: "Every tenant gets Entra ID Free at no cost. Privileged-admin accounts that consume no M365 service and trigger no per-user premium feature run on Free indefinitely.",
      },
    ],
    alternatives: [
      {
        label: "Add a single per-user add-on (e.g. Entra ID P2)",
        cost: ADDONS.entra_id_p2.cost,
        note: "Only if a later answer in the privileged-admin tree confirms a per-user trigger (PIM, Identity Protection, Teams Premium admin, Remote Help helper, Copilot for self, Governance configurator).",
      },
    ],
    reasoning: [
      "Privileged admin account that does NOT consume any Microsoft 365 user-facing service (no mailbox, no Teams, no SharePoint, no Office apps) AND does not trigger any per-user premium feature.",
      "Per Microsoft Universal License Terms and the privileged-access guide, admin accounts that only hold role assignments don't need a per-user M365 license. Entra ID Free ($0) is sufficient.",
      "Re-run the privileged-admin tree to confirm no premium triggers — PIM eligibility, Identity Protection scope, Remote Help helper status, Teams Premium admin features, Copilot use, or Governance configuration each independently require a per-user add-on.",
    ],
    privilegedAdminLens:
      "This IS the privileged-admin guidance — see info_privileged_admins for the full guide. Key rule: portal access is ROLE-GATED for most admin scenarios (Defender XDR, Microsoft Purview, Intune admin center, Microsoft 365 admin center, Microsoft Sentinel, Security Copilot). Only seven scenarios trigger a per-user license on the admin's OWN account: (1) Remote Help helper, (2) Teams Premium admin features, (3) Entra ID Governance configurator, (4) PIM eligible/approver/reviewer, (5) Identity Protection scope, (6) Copilot for self, (7) GSA client on admin's device.",
  },
  result_entra_id_p1_admin: {
    recommendationLabel: "Microsoft Entra ID P1 (admin is in CA / SSPR-writeback / App Proxy / Cloud Discovery scope)",
    lines: [
      {
        label: "Microsoft Entra ID P1 (admin's own account)",
        cost: ADDONS.entra_id_p1.cost,
        source: SOURCES.ENTRA_PRICING,
        note: "Per-user. Required because the admin's own account is in the AUDIENCE scope of at least one Entra ID P1 feature — most commonly a Conditional Access policy that targets them. CA licensing FAQ: every user in scope of a CA policy must have P1.",
      },
    ],
    alternatives: [
      {
        label: "Bundle via M365 E3 (includes P1 + Office apps + E3 services)",
        cost: 36.0,
        note: "If the admin will also consume any Microsoft 365 service (mailbox, Teams, SharePoint, OneDrive, Office apps), buy M365 E3 instead — P1 is bundled in. The price delta is the value of E3 services minus the standalone P1 you'd buy anyway.",
      },
      {
        label: "Bundle via M365 Business Premium (≤ 300 seats)",
        cost: 22.0,
        note: "For small tenants under 300 seats — Business Premium includes Entra ID P1 plus Defender for Business and Intune for the admin's account at a lower price than E3.",
      },
      {
        label: "Bundle via EMS E3 (identity + Intune, no Office)",
        cost: 10.6,
        note: "EMS E3 (Enterprise Mobility + Security) is the cheapest bundled P1 path when the admin will also be Intune-managed but won't consume Office / Exchange / Teams.",
      },
      {
        label: "Stay on Entra ID Free + exclude admin from CA",
        cost: 0,
        note: "Break-glass pattern: keep the admin's account EXCLUDED from every CA policy (per Microsoft's emergency-access guidance). No P1 required, but you lose CA-enforced MFA on the admin — only viable for true break-glass identities.",
      },
    ],
    reasoning: [
      "The admin's own account is the AUDIENCE of at least one Microsoft Entra ID P1 feature: a Conditional Access policy targets them, OR SSPR writes their password back to on-prem AD, OR they connect through Entra Application Proxy to an on-prem app, OR Defender for Cloud Apps Cloud Discovery attributes shadow-IT activity from their device.",
      "Per Microsoft's Conditional Access licensing FAQ ('CA requires Entra ID P1 licenses for every user in scope of a CA policy'), the admin's account needs P1 even though they may only OPERATE the M365 admin centers — being in the policy AUDIENCE is what triggers the license.",
      "P1 is bundled in M365 E3 / E5 / Business Premium / A3 / A5 / G3 / G5 / EMS E3+ / Entra Suite. If the tenant already buys any of those for the admin (e.g., the admin needs a mailbox), the P1 requirement is already satisfied — no extra purchase needed.",
      "Configuring CA policies, Security Defaults, Authentication Strengths, Application Proxy connectors, and Cloud Discovery data collectors is ROLE-GATED (Conditional Access Administrator, Application Administrator, Security Administrator) and FREE — the license requirement is for being the AUDIENCE of those policies, not the configurator.",
      "Free admin capabilities (no P1 needed): Security Defaults, basic per-user MFA via Authenticator / FIDO2, cloud-only SSPR, M365 admin center / Power Platform admin center operation, Entra Connect / Cloud Sync configuration, B2B guest invitations (first 50,000 MAU free), CA policy authoring under the CA Administrator role.",
      "If the admin is also in scope of a P2 feature (PIM-eligible role, Identity Protection risk policy with remediation, Access Reviews), the higher P2 tier applies and supersedes P1 — see the later questions in the tree.",
    ],
    privilegedAdminLens:
      "Most-missed admin licensing trigger. Per the privileged-admin guide (info_privileged_admins), most admin portal access is role-gated and free — but Conditional Access is the exception: if a CA policy targets the admin's account (the recommended pattern for enforcing MFA on directory roles), the admin's account needs Entra ID P1. The break-glass exclusion pattern (CA-excluded emergency-access accounts) is the only legitimate way to stay on Entra ID Free while still using CA for everyone else. See the full admin capability map (info_admin_capability_map) for the complete free-vs-P1-vs-P2 breakdown.",
  },
  result_primary_account: {
    recommendationLabel: "Re-run the assessment as the user's PRIMARY account",
    lines: [
      {
        label: "Recommendation depends on the primary account's role",
        cost: null,
        note: "Restart the assessment and pick the user's actual role (Information worker, SMB, Frontline, Education, Government, Nonprofit, External). The privileged-admin path is for ROLE-SEPARATED admin identities only.",
      },
    ],
    alternatives: [],
    reasoning: [
      "You started the privileged-admin path but the user does NOT have a separate admin account — they sign in to one identity for everything.",
      "Microsoft's privileged-access guide recommends splitting into two accounts (primary + admin-firstname@tenant.onmicrosoft.com). Until that's done, license the user as their primary role (information worker, SMB, frontline, etc.) and layer premium add-ons on top.",
    ],
    privilegedAdminLens:
      "Once you've split the user into a primary + privileged-admin identity pair, re-run THIS privileged-admin tree for the admin identity — most of the time the admin account itself will land on Entra ID Free ($0) or Free + a single per-user add-on (P2, Copilot, Teams Premium, Remote Help).",
  },
  result_service: {
    recommendationLabel: "Workload Identities Premium (per workload identity)",
    lines: [
      {
        label: "Microsoft Entra Workload Identities Premium",
        cost: null,
        source: {
          label: "Microsoft Entra Workload Identities pricing",
          url: "https://www.microsoft.com/security/business/microsoft-entra-pricing",
        },
        note: "Per workload identity / month (not per user). Required when applying Conditional Access, Identity Protection, or Access Reviews to a service principal or managed identity. Confirm pricing with your Microsoft account team.",
      },
    ],
    alternatives: [
      {
        label: "Entra ID Free (no premium workload-identity features)",
        cost: 0,
        note: "Service principals and managed identities work on Entra ID Free — but with no Conditional Access, no risk-based policies, and no access reviews on the workload identity itself.",
      },
    ],
    reasoning: [
      "Service identity (service principal, managed identity, or workload identity) that needs Conditional Access, Identity Protection, or Access Reviews applied.",
      "Workload Identities Premium is the only SKU that licenses these features for non-human identities. Pricing is per workload identity, not per user.",
    ],
    specialty: true,
  },
  result_service_principal: {
    recommendationLabel: "Entra ID Free (service principal / app registration)",
    lines: [
      {
        label: "Entra ID Free",
        cost: 0,
        source: SOURCES.ENTRA_PRICING,
        note: "Service principals and app registrations consume Entra Free authentication — no per-user SKU required.",
      },
    ],
    alternatives: [
      {
        label: "Workload Identities Premium",
        cost: null,
        note: "Required if Conditional Access, Identity Protection, or Access Reviews need to be applied to the service identity. Per workload identity, not per user.",
      },
    ],
    reasoning: [
      "Service principal / app registration with no human user behind it.",
      "Service principals run on Entra ID Free at $0 — they need a SKU only if Conditional Access, Identity Protection, or Access Reviews are applied to the workload identity.",
    ],
  },

  // ===== Education profile (A-SKUs — separate faculty / student pricing) ==
  result_edu_a1: {
    recommendationLabel: "Microsoft 365 A1",
    lines: [
      {
        label: "Microsoft 365 A1 for students (free) / A1 for faculty (free)",
        cost: 0,
        source: {
          label: "Microsoft 365 Education plans",
          url: "https://www.microsoft.com/education/products/microsoft-365",
        },
        note: "A1 is included free for qualified academic institutions — Office on the web, Teams for Education, OneDrive, SharePoint, Sway, Forms.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 A3",
        cost: null,
        note: "Adds desktop Office, Intune, Defender for Office P1, AIP P1. Confirm faculty / student pricing with your Microsoft Education representative.",
      },
      {
        label: "Microsoft 365 A5",
        cost: null,
        note: "A3 + Defender XDR + Purview E5 + Entra ID P2 + Power BI Pro. Confirm faculty / student pricing.",
      },
    ],
    reasoning: [
      "Qualified academic institution (K-12, higher-ed, library) with users who only need web-based productivity + Teams for Education.",
      "M365 A1 is FREE for qualified institutions — no per-user cost. The right entry point unless desktop Office, Intune, or Defender are needed.",
    ],
    specialty: true,
  },
  result_edu_a3: {
    recommendationLabel: "Microsoft 365 A3",
    lines: [
      {
        label: "Microsoft 365 A3 for faculty or A3 for students",
        cost: null,
        source: {
          label: "Microsoft 365 Education plans",
          url: "https://www.microsoft.com/education/products/microsoft-365",
        },
        note: "Faculty vs student SKUs price differently. Confirm with your Microsoft Education representative.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 A1",
        cost: 0,
        note: "Free for qualified institutions. Lacks desktop Office + Intune + Defender — fine for students who only use web Office.",
      },
      {
        label: "Microsoft 365 A5",
        cost: null,
        note: "Adds Defender XDR + Purview E5 + Entra ID P2 + Power BI Pro on top of A3. Confirm with Education rep.",
      },
    ],
    reasoning: [
      "Academic institution where users need desktop Office + Exchange mailbox + Teams + Intune + Entra ID P1 — the A-tier equivalent of M365 E3.",
      "M365 A3 has separate faculty / student SKU pricing — confirm with Microsoft Education rep.",
    ],
    specialty: true,
  },
  result_edu_a5: {
    recommendationLabel: "Microsoft 365 A5",
    lines: [
      {
        label: "Microsoft 365 A5 for faculty or A5 for students",
        cost: null,
        source: {
          label: "Microsoft 365 Education plans",
          url: "https://www.microsoft.com/education/products/microsoft-365",
        },
        note: "Academic equivalent of M365 E5. Faculty vs student SKUs price differently. Confirm with Microsoft Education representative.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 A3",
        cost: null,
        note: "Drop the E5-tier security/compliance/identity features. The right pick if A5-tier features aren't actually used.",
      },
    ],
    reasoning: [
      "Academic institution where users need desktop Office + the full Defender XDR + Purview E5 + Entra ID P2 + Power BI Pro stack — academic equivalent of M365 E5.",
    ],
    specialty: true,
  },

  // ===== Government profile (G-SKUs — sovereign cloud variance) ==========
  result_gov_g1: {
    recommendationLabel: "Microsoft 365 G1 (GCC)",
    lines: [
      {
        label: "Microsoft 365 G1",
        cost: null,
        source: {
          label: "Microsoft 365 for US Government",
          url: "https://www.microsoft.com/microsoft-365/government",
        },
        note: "Government Community Cloud equivalent of O365 E1. Pricing varies by sovereign cloud (GCC / GCC High / DoD).",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 G3",
        cost: null,
        note: "Adds desktop Office, Exchange P2, Intune, Entra ID P1. Confirm with Microsoft Government rep.",
      },
      {
        label: "Microsoft 365 G5",
        cost: null,
        note: "G3 + Defender XDR + Purview E5 + Entra ID P2. Confirm with Microsoft Government rep.",
      },
    ],
    reasoning: [
      "US government tenant in GCC sovereign cloud, user only needs cloud collab (web Office + Teams + SharePoint + Exchange) with no desktop apps.",
      "G-SKU pricing varies by sovereign cloud and government channel — confirm with your Microsoft Government account team.",
    ],
    specialty: true,
  },
  result_gov_g3: {
    recommendationLabel: "Microsoft 365 G3 (GCC / GCC High)",
    lines: [
      {
        label: "Microsoft 365 G3",
        cost: null,
        source: {
          label: "Microsoft 365 for US Government",
          url: "https://www.microsoft.com/microsoft-365/government",
        },
        note: "GCC or GCC High equivalent of M365 E3. Pricing varies by sovereign cloud (GCC / GCC High / DoD). Feature parity with commercial E3 trails by months.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 G5",
        cost: null,
        note: "Adds Defender XDR + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro. Confirm with Microsoft Government rep.",
      },
    ],
    reasoning: [
      "US government tenant in GCC / GCC High, user needs the M365 E3 equivalent — desktop Office + Exchange P2 + Teams + Intune + Entra ID P1.",
      "G-SKU pricing and feature parity vary by sovereign cloud — confirm with Microsoft Government account team.",
    ],
    specialty: true,
  },
  result_gov_g5: {
    recommendationLabel: "Microsoft 365 G5 (GCC / GCC High)",
    lines: [
      {
        label: "Microsoft 365 G5",
        cost: null,
        source: {
          label: "Microsoft 365 for US Government",
          url: "https://www.microsoft.com/microsoft-365/government",
        },
        note: "GCC or GCC High equivalent of M365 E5. Pricing varies. Some E5 features (Defender for Cloud Apps, specific Purview detections) have reduced parity in GCC High vs commercial.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 G3 + targeted add-ons",
        cost: null,
        note: "If only some E5 features are needed, layer government add-on SKUs on G3. Discuss with Microsoft Government rep.",
      },
    ],
    reasoning: [
      "US government tenant in GCC / GCC High, user needs the M365 E5 equivalent — Defender XDR + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro.",
      "G5 feature parity is closer to commercial E5 in GCC than in GCC High. Confirm feature availability AND pricing with Microsoft Government account team.",
    ],
    specialty: true,
  },
  result_gov_il6: {
    recommendationLabel: "Microsoft 365 for DoD IL5 / IL6 (Air-Gapped)",
    lines: [
      {
        label: "Microsoft 365 DoD (IL5) / Air-Gapped (IL6)",
        cost: null,
        source: {
          label: "Microsoft 365 US Sovereign Cloud Government",
          url: "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-overview-of-government-environments",
        },
        note: "DoD IL5 (cloud-isolated) and Air-Gapped IL6 (physically isolated) require dedicated contract vehicles. Pricing always negotiated through Microsoft Federal — no public list price.",
      },
    ],
    alternatives: [],
    reasoning: [
      "DoD tenant requiring IL5 or IL6 accreditation — physically isolated infrastructure with dedicated personnel clearances.",
      "Pricing is always contract-negotiated through Microsoft Federal — there is no public list price.",
    ],
    specialty: true,
  },

  // ===== Nonprofit profile (grants + first 10 seats free) =================
  result_npo_business_premium: {
    recommendationLabel: "Microsoft 365 Business Premium for Nonprofits",
    lines: [
      {
        label: "Microsoft 365 Business Premium (Nonprofit)",
        cost: null,
        source: {
          label: "Microsoft 365 for Nonprofits",
          url: "https://www.microsoft.com/nonprofits/microsoft-365",
        },
        note: "First 10 seats granted FREE, additional seats at the nonprofit discount tier. Confirm grant eligibility and pricing with Microsoft Nonprofit Hub.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 E3 for Nonprofits",
        cost: null,
        note: "Discounted E3. No 300-seat cap. Confirm pricing with Microsoft Nonprofit Hub.",
      },
    ],
    reasoning: [
      "Qualified nonprofit, ≤300 seats, needs Business Premium-tier features (desktop Office + Exchange + Teams + Intune + Entra ID P1 + Defender for Business + AIP P1).",
      "Business Premium for Nonprofits is the cheapest path — first 10 seats FREE, additional seats at the nonprofit discount tier.",
    ],
    specialty: true,
  },
  result_npo_e3: {
    recommendationLabel: "Microsoft 365 E3 for Nonprofits",
    lines: [
      {
        label: "Microsoft 365 E3 (Nonprofit)",
        cost: null,
        source: {
          label: "Microsoft 365 for Nonprofits",
          url: "https://www.microsoft.com/nonprofits/microsoft-365",
        },
        note: "Discounted M365 E3 at nonprofit pricing tier. Confirm with Microsoft Nonprofit Hub.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 Business Premium (Nonprofit)",
        cost: null,
        note: "First 10 seats free + nonprofit discount. Only if tenant is ≤300 seats.",
      },
      {
        label: "Microsoft 365 E5 (Nonprofit)",
        cost: null,
        note: "Adds Defender XDR + Purview E5 + Entra ID P2 + Teams Phone + Power BI Pro. Confirm with Microsoft Nonprofit Hub.",
      },
    ],
    reasoning: [
      "Qualified nonprofit, >300 seats OR needs E3-only features (unlimited mailbox archive, Windows Enterprise rights).",
      "E3 for Nonprofits at the discount tier is the right pick when Business Premium's 300-seat cap is exceeded.",
    ],
    specialty: true,
  },
  result_npo_e5: {
    recommendationLabel: "Microsoft 365 E5 for Nonprofits",
    lines: [
      {
        label: "Microsoft 365 E5 (Nonprofit)",
        cost: null,
        source: {
          label: "Microsoft 365 for Nonprofits",
          url: "https://www.microsoft.com/nonprofits/microsoft-365",
        },
        note: "Discounted M365 E5 at nonprofit pricing tier. Confirm with Microsoft Nonprofit Hub.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft 365 E3 (Nonprofit) + targeted add-ons",
        cost: null,
        note: "Stack Defender Suite or Purview Suite as needed — cheaper if only one E5-tier dimension is in scope.",
      },
    ],
    reasoning: [
      "Qualified nonprofit, user needs E5-tier security/compliance/identity (Defender XDR + Purview E5 + Entra ID P2).",
      "E5 for Nonprofits at the discount tier is the right pick when multiple E5-tier dimensions are in scope.",
    ],
    specialty: true,
  },

  // ===== External Identity profile (MAU-based pricing) ===================
  result_extid_free: {
    recommendationLabel: "Microsoft Entra External ID — Free tier",
    lines: [
      {
        label: "Entra External ID (Free tier)",
        cost: 0,
        source: {
          label: "Microsoft Entra External ID pricing",
          url: "https://www.microsoft.com/security/business/microsoft-entra-pricing",
        },
        note: "Up to 50,000 monthly active users (MAU) free for both B2B and B2C/CIAM scenarios. Per-MAU pricing kicks in above that ceiling.",
      },
    ],
    alternatives: [
      {
        label: "Entra External ID P2 / Premium MAU tier",
        cost: null,
        note: "Add Conditional Access, risk-based sign-in, Identity Protection for external users. Per-MAU billing — confirm with Microsoft.",
      },
    ],
    reasoning: [
      "External ID scenario (B2B partners, B2C customers, CIAM) with low monthly active user volume.",
      "Up to 50,000 MAU is FREE — only pay above that ceiling. The right entry point for most external ID scenarios.",
    ],
    specialty: true,
  },
  result_extid_p2: {
    recommendationLabel: "Microsoft Entra External ID — P2 (Premium) MAU tier",
    lines: [
      {
        label: "Entra External ID (P2 / Premium MAU)",
        cost: null,
        source: {
          label: "Microsoft Entra External ID pricing",
          url: "https://www.microsoft.com/security/business/microsoft-entra-pricing",
        },
        note: "Adds Conditional Access, Identity Protection, MFA, and risk-based policies for external users. Per-MAU billing above the free ceiling.",
      },
    ],
    alternatives: [
      {
        label: "Entra External ID (Free tier)",
        cost: 0,
        note: "If risk-based / Conditional Access features aren't needed, stay on the free 50,000 MAU tier.",
      },
    ],
    reasoning: [
      "External ID scenario requiring Conditional Access, Identity Protection, MFA, or risk-based policies for B2B / B2C / CIAM users.",
      "P2 MAU tier is required for these features — billed per MAU above the free ceiling.",
    ],
    specialty: true,
  },
  result_extid_verified: {
    recommendationLabel: "Microsoft Entra Verified ID",
    lines: [
      {
        label: "Microsoft Entra Verified ID",
        cost: 0,
        source: {
          label: "Verified ID FAQ — no special licensing requirements",
          url: "https://learn.microsoft.com/entra/verified-id/verifiable-credentials-faq#what-are-the-licensing-requirements",
        },
        note: "Per the FAQ: 'no special licensing requirements' — issuance and verification of W3C Verifiable Credentials are included.",
      },
    ],
    alternatives: [
      {
        label: "Microsoft Entra Suite",
        cost: ADDONS.entra_suite.cost,
        note: "Bundles Verified ID + Entra ID P2 + Governance + Global Secure Access. Worth it if multiple Entra premium features are also needed.",
      },
    ],
    reasoning: [
      "Scenario requires Verifiable Credentials issuance / verification.",
      "Per Microsoft's Verified ID FAQ, there are 'no special licensing requirements' — Verified ID is included in Entra at no extra cost.",
    ],
    specialty: true,
  },
  result_extid_ciam: {
    recommendationLabel: "Microsoft Entra External ID for Customers (CIAM)",
    lines: [
      {
        label: "Entra External ID for Customers (CIAM)",
        cost: null,
        source: {
          label: "Microsoft Entra External ID pricing",
          url: "https://www.microsoft.com/security/business/microsoft-entra-pricing",
        },
        note: "MAU-based pricing for customer-facing identity scenarios. First 50,000 MAU free; per-MAU above that. Replaces legacy Entra B2C tenants for new scenarios.",
      },
    ],
    alternatives: [
      {
        label: "Legacy Entra B2C tenant",
        cost: null,
        note: "Microsoft has stopped onboarding new Entra B2C tenants — new CIAM scenarios MUST use External ID for Customers.",
      },
    ],
    reasoning: [
      "Customer-facing identity scenario (CIAM) — public app sign-in, customer account creation, social login federation.",
      "Entra External ID for Customers is the new CIAM SKU — replaces legacy Entra B2C for new tenants. Free up to 50,000 MAU.",
    ],
    specialty: true,
  },
};

/** Look up a result-pricing recommendation by result node ID.
 *  Returns undefined when there's no entry (graceful fallback — the
 *  renderer skips the panel rather than rendering a broken table). */
export function getResultPricing(resultId: string): ResultPricing | undefined {
  return RESULT_PRICING[resultId];
}
