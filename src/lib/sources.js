// ---------------------------------------------------------------------------
// Centralized Microsoft 365 documentation source registry.
//
// Single source of truth for every canonical Microsoft Learn / docs /
// pricing / Product Terms URL cited across the assessment tree, the profile
// detail pages, the frontline-wizard result card, the reference catalog,
// and the explainer MDX files.
//
// Why a registry?
//  - Microsoft renames Learn slugs and moves PDFs around. When that happens
//    we want to update ONE constant here, not chase 16 inline strings.
//  - Several of these pages are cited from 5–16 different tree nodes today;
//    grep `grep -hoE '"https://[^"]+"' src/data/tree.js | sort | uniq -c |
//    sort -rn | head` to confirm the top duplicates.
//  - The `cite(key)` helper returns the `[label, url]` tuple shape that the
//    tree-node `docs` / `techDocs` arrays already use, so migrating a tree
//    node is a single search-and-replace.
//
// Plain JS (not TS) so this file can be imported from `src/data/tree.js`,
// `scripts/validate-tree.js`, and `.astro` / `.ts` modules alike without a
// loader. JSDoc types give .ts consumers full IntelliSense via tsserver.
//
// When updating a URL:
//  1. Edit the `url` field below.
//  2. Run `npm run validate-tree` to confirm tree integrity is unaffected.
//  3. Run `npm run typecheck` to catch any consumer that relied on the old
//     label / shape.
//
// When adding a NEW source:
//  - Use a UPPER_SNAKE_CASE key that describes the page.
//  - Prefer Microsoft Learn / microsoft.com URLs over third-party mirrors.
//  - Prefer the no-locale form (`/microsoft-365/...`) over `/en-us/...`
//    where Microsoft serves both — the no-locale form auto-redirects to
//    the visitor's locale.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ label: string; url: string }} Source
 */

/**
 * Canonical Microsoft 365 documentation registry. Each entry MUST conform to
 * `Source`, but we use `@satisfies` (not `@type`) so TypeScript preserves the
 * exact key set — consumers get precise per-key autocompletion and the strict
 * `noUncheckedIndexedAccess` flag is happy (each property is `Source`, never
 * `Source | undefined`).
 */
export const SOURCES = Object.freeze(
  /** @satisfies {Record<string, Source>} */ ({
    // ---- Licensing umbrella -------------------------------------------------
    LICENSING_DOCS_HUB: {
      label: "Microsoft 365 — Licensing Resources and Documents",
      url: "https://www.microsoft.com/licensing/docs/view/Microsoft-365",
    },
    PRODUCT_TERMS_HOME: {
      label: "Microsoft Product Terms (licensing terms home)",
      url: "https://www.microsoft.com/licensing/terms/",
    },
    PRODUCT_TERMS_ONLINE_SERVICES: {
      label: "Microsoft Online Services — Product Terms (EAEAS)",
      url: "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS",
    },
    PRODUCT_TERMS_UNIVERSAL: {
      label: "Universal License Terms for Online Services",
      url: "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all",
    },
    SECURE_FUTURE_INITIATIVE: {
      label: "Microsoft Secure Future Initiative (SFI)",
      url: "https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative",
    },

    // ---- Enterprise (E1 / E3 / E5 / E7) -------------------------------------
    ENTERPRISE_PRICING: {
      label: "Microsoft 365 Enterprise — plans & pricing (E3 / E5 comparison)",
      url: "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing",
    },
    MODERN_WORK_PLAN_COMPARISON: {
      label: "Modern Work Plan Comparison — Enterprise (official Microsoft PDF, May 2026 edition)",
      url: "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/education/Modern-Work-Plan-Comparison-Enterprise-5-1-2026.pdf",
    },
    TEAMS_2025_PACKAGING: {
      label: "Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update",
      url: "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025",
    },
    M365_E7_ANNOUNCEMENT: {
      label: "Microsoft 365 E7 (Frontier Suite) — partner announcement (May 2026)",
      url: "https://learn.microsoft.com/partner-center/announcements/2026-may",
    },
    M365_MAPS_E5: {
      label: "M365 Maps — Microsoft 365 E5 comparison",
      url: "https://m365maps.com/Microsoft%20365%20E5.htm",
    },

    // ---- Frontline (F1 / F3) ------------------------------------------------
    FRONTLINE_PRICING: {
      label: "Microsoft 365 Frontline — plans & pricing (F1 / F3 comparison)",
      url: "https://www.microsoft.com/microsoft-365/enterprise/frontline-plans-and-pricing",
    },
    FRONTLINE_LICENSING_OPTIONS: {
      label: "Microsoft 365 Frontline — licensing options",
      url: "https://learn.microsoft.com/microsoft-365/frontline/flw-licensing-options",
    },

    // ---- Education (A1 / A3 / A5) -------------------------------------------
    EDU_PRODUCTS_OFFICE: {
      label: "Microsoft 365 Education — products & plans",
      url: "https://www.microsoft.com/education/products/office",
    },
    EDU_O365_SERVICE_DESCRIPTION: {
      label: "Office 365 Education — service description",
      url: "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education",
    },

    // ---- Government (G1 / G3 / G5 / IL6) ------------------------------------
    GOV_M365_US: {
      label: "Microsoft 365 — US Government plans",
      url: "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government",
    },

    // ---- Nonprofit ----------------------------------------------------------
    NONPROFITS_HOME: {
      label: "Microsoft Nonprofits — programs & offers",
      url: "https://www.microsoft.com/nonprofits",
    },
    NONPROFITS_ELIGIBILITY: {
      label: "Microsoft Nonprofits — eligibility",
      url: "https://www.microsoft.com/nonprofits/eligibility",
    },
    NONPROFITS_DOCS: {
      label: "Microsoft 365 Nonprofit — admin documentation",
      url: "https://learn.microsoft.com/microsoft-365/nonprofit/",
    },

    // ---- Small / mid-size business ------------------------------------------
    BUSINESS_COMPARE_PLANS: {
      label: "Microsoft 365 for business — compare plans",
      url: "https://www.microsoft.com/microsoft-365/business/compare-all-plans",
    },
    BUSINESS_PREMIUM_DOCS: {
      label: "Microsoft 365 Business Premium — admin documentation",
      url: "https://learn.microsoft.com/microsoft-365/business-premium/",
    },

    // ---- External ID / B2B / CIAM -------------------------------------------
    EXTID_PRICING: {
      label: "Microsoft Entra External ID — pricing (MAU)",
      url: "https://learn.microsoft.com/entra/external-id/external-identities-pricing",
    },
    EXTID_OVERVIEW: {
      label: "Microsoft Entra External ID — overview",
      url: "https://learn.microsoft.com/entra/external-id/external-identities-overview",
    },
    EXTID_USERS_2024_UPDATE: {
      label: "Microsoft Licensing — Update to external users licensing (2024)",
      url: "https://www.microsoft.com/en-us/licensing/news/Update-to-external-users-2024",
    },

    // ---- Microsoft 365 Copilot ---------------------------------------------
    COPILOT_LICENSING: {
      label: "Microsoft 365 Copilot — licensing",
      url: "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing",
    },
    COPILOT_FOR_WORK: {
      label: "Microsoft 365 Copilot — plans & pricing",
      url: "https://www.microsoft.com/microsoft-365/copilot/copilot-for-work",
    },

    // ---- Entra (Identity) ---------------------------------------------------
    ENTRA_SUITE: {
      label: "Microsoft Entra Suite — overview",
      url: "https://learn.microsoft.com/entra/fundamentals/entra-suite",
    },
    ENTRA_ADMIN_BEST_PRACTICES: {
      label: "Microsoft Entra best practices for admin roles",
      url: "https://learn.microsoft.com/entra/identity/role-based-access-control/best-practices",
    },
    ENTRA_EMERGENCY_ACCESS: {
      label: "Microsoft Entra — emergency access accounts",
      url: "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access",
    },
    ENTRA_PRIVILEGED_ACCESS_OVERVIEW: {
      label: "Securing privileged access — overview",
      url: "https://learn.microsoft.com/security/privileged-access-workgroup/overview",
    },
    ENTRA_GOVERNANCE_FUNDAMENTALS: {
      label: "Microsoft Entra ID Governance — licensing fundamentals",
      url: "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals",
    },
    ENTRA_PIM_FUNDAMENTALS: {
      label: "PIM licensing fundamentals — every category of P2-required user",
      url: "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management",
    },
    ENTRA_ID_PROTECTION_LICENSING: {
      label: "Microsoft Entra Identity Protection — license requirements",
      url: "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#license-requirements",
    },
    AZURE_AD_SERVICE_DESCRIPTION: {
      label: "Microsoft Entra ID (Azure AD) — service description",
      url: "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory",
    },
    ENTRA_PRICING: {
      label: "Microsoft Entra ID — plans & pricing",
      url: "https://www.microsoft.com/security/business/microsoft-entra-pricing",
    },

    // ---- Defender (Security) ------------------------------------------------
    DEFENDER_XDR: {
      label: "Microsoft Defender XDR (M365 Defender) — overview",
      url: "https://learn.microsoft.com/defender-xdr/microsoft-365-defender",
    },
    DEFENDER_ENDPOINT_PLANS: {
      label: "Microsoft Defender for Endpoint — plans (P1 vs P2)",
      url: "https://learn.microsoft.com/defender-endpoint/defender-endpoint-plan-1-2",
    },
    DEFENDER_OFFICE_365: {
      label: "Microsoft Defender for Office 365 — overview",
      url: "https://learn.microsoft.com/defender-office-365/mdo-about",
    },

    // ---- Purview (Compliance) ----------------------------------------------
    PURVIEW_SERVICE_DESCRIPTION: {
      label: "Microsoft Purview — service description (who needs a license)",
      url: "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#which-users-need-a-license",
    },
    PURVIEW_COMPLIANCE_PLANS: {
      label: "Microsoft 365 E5 Compliance — Microsoft Purview plans",
      url: "https://www.microsoft.com/security/business/compliance/compliance-plans",
    },
    PURVIEW_IRM_LICENSING: {
      label: "Insider Risk Management — subscriptions and licensing",
      url: "https://learn.microsoft.com/purview/insider-risk-management-configure#subscriptions-and-licensing",
    },
    PURVIEW_EDISCOVERY_LICENSING: {
      label: "eDiscovery — subscription and licensing (Purview service description)",
      url: "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-ediscovery",
    },
    PURVIEW_SECURITY_COMPLIANCE_GUIDANCE: {
      label: "Microsoft 365 Security & Compliance — licensing guidance",
      url: "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance",
    },

    // ---- Intune (Endpoint Management) --------------------------------------
    INTUNE_ADDONS: {
      label: "Microsoft Intune — add-ons (Intune Suite, EPM, Cloud PKI, etc.)",
      url: "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons",
    },
    INTUNE_EPM: {
      label: "Microsoft Intune — Endpoint Privilege Management (EPM)",
      url: "https://learn.microsoft.com/mem/intune/protect/epm-overview",
    },

    // ---- Exchange Online ----------------------------------------------------
    EXCHANGE_ONLINE_LIMITS: {
      label:
        "Exchange Online — service description limits (mailbox & archive sizes, message size, send/receive rates)",
      url: "https://learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits",
    },
    EXCHANGE_ONLINE_PLANS: {
      label: "Exchange Online — plans & pricing",
      url: "https://www.microsoft.com/microsoft-365/exchange/compare-microsoft-exchange-online-plans",
    },

    // ---- Teams add-ons ------------------------------------------------------
    TEAMS_ADDON_LICENSING: {
      label: "Microsoft Teams add-on licensing (Teams Phone, Premium, Frontline)",
      url: "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/microsoft-teams-add-on-licensing",
    },

    // ---- Plan management ----------------------------------------------------
    UPGRADE_PLAN: {
      label: "Microsoft 365 — upgrade to a different plan",
      url: "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan",
    },
    SWITCH_ENTERPRISE_TO_FRONTLINE: {
      label: "Switch from Microsoft 365 Enterprise to Frontline",
      url: "https://learn.microsoft.com/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#email",
    },
  })
);

/**
 * Return the `[label, url]` tuple shape that the tree-node `docs` /
 * `techDocs` arrays use. Throws on an unknown key so a typo fails fast at
 * build time rather than rendering a broken link.
 *
 * @param {keyof typeof SOURCES} key
 * @returns {[string, string]}
 */
export function cite(key) {
  const s = SOURCES[key];
  if (!s) throw new Error(`sources.js: unknown source key "${String(key)}"`);
  return [s.label, s.url];
}
