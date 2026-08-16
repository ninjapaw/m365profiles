// Decision-tree data. Edit nodes here, then run `npm run validate-tree`.
// Node shapes: choice | question (yes/no) | info | result.

// ---------------------------------------------------------------------------
// Shared mini-card breakdowns
//
// These constants are referenced from multiple umbrella questions so we only
// maintain the source-of-truth in one place. Edit here once and every
// question that references them (the upstream Defender / Purview umbrella +
// the "ALSO need..." breadth follow-ups) picks up the change.
//
// DEFENDER_SUITE_MINI_CARDS  — used by `q_defender` (the admin's own-Defender
//   trigger check) and `q_purview_e5_breadth` (the "after Purview Yes, do you
//   ALSO need Defender?" follow-up). Five cards: Defender for Office 365 P2,
//   Defender for Endpoint P2, Defender for Identity (tenant-wide *
//   informational), Defender for Cloud Apps, Defender XDR.
//
// PURVIEW_E5_BREADTH_MINI_CARDS — used by `q_defender_breadth` (the "after
//   Defender Yes, do you ALSO need Purview?" follow-up). Four focused cards
//   covering the most common per-user Purview E5 triggers: IRM, Communication
//   Compliance, eDiscovery (Premium), Audit (Premium). The full 12-card
//   Purview breakdown lives inline on `q_purview_e5` (the upstream umbrella);
//   the breadth-question version is a focused recap, not a duplicate.
//
// INTUNE_SUITE_MINI_CARDS — used by `q_intune_suite` (admin's own Intune Suite
//   trigger check) and `q_intune_breadth` (bundle-vs-standalone follow-up).
//   Six cards: Remote Help (unique helper+sharer rule), EPM, Tunnel for MAM
//   (Suite-only, no standalone), Cloud PKI, EAM, Advanced Analytics.
// ---------------------------------------------------------------------------

const DEFENDER_SUITE_MINI_CARDS = [
  {
    name: "Defender for Office 365 Plan 2",
    sku: "M365 E5 / M365 E5 Security / Defender for Office 365 P2 standalone / Office 365 E5",
    scope: "tenant-wide-scopeable",
    scopeNote:
      "Tenant-wide by default but scopeable down to licensed mailboxes. Microsoft's Defender for Office 365 service description and the Standard / Strict preset security policies apply Safe Links, Safe Attachments, anti-phishing impersonation protection, Safe Attachments for SharePoint / OneDrive / Teams, Threat Explorer, Automated Investigation and Response (AIR), and Attack Simulation Training across the whole tenant unless you scope them. Admins should scope each policy (Safe Links, Safe Attachments, anti-phish, ASR Training campaigns) to only the user mailboxes / shared mailboxes / resource mailboxes / Microsoft 365 groups that actually hold a Defender for Office 365 P2 entitlement \u2014 either by using the preset policy 'Users, groups, and domains' include lists, or by building custom policies with explicit recipient scoping. Microsoft Product Terms require a per-mailbox licence for every mailbox covered by the scope you configure (user mailbox, shared mailbox, resource mailbox, room, or equipment).",
    inScopeMeans:
      "this user's Exchange Online mailbox falls inside the recipient scope of a Safe Links / Safe Attachments / anti-phish policy (or the Standard / Strict preset), OR they are enrolled in Attack Simulation Training as a trainee.",
    notInScopeMeans:
      "every Defender for Office 365 P2 policy explicitly excludes this user's mailbox (or they have no Exchange Online mailbox at all), AND they are not enrolled in any ASR Training campaign. They still get the always-on EOP anti-malware / anti-spam baseline that comes with every Exchange Online mailbox SKU.",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5; their mailbox is in scope of the Strict preset, so Safe Links rewrites their URLs and Safe Attachments sandboxes their attachments.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 only and the tenant's Safe Links policy is scoped to 'all users' \u2014 silently covering them. Per Product Terms, each protected mailbox needs a P2 entitlement; either uplift to E5 / E5 Security / Defender Suite add-on, or exclude their mailbox from the policy.",
      "Yes: this user is enrolled as a trainee in an Attack Simulation Training campaign \u2014 ASR Training requires a P2 entitlement on the trainee.",
      "No (current licence already covers it): this user holds M365 E3 and every Defender for Office 365 policy is scoped to the 'mdo-p2-licensed' group; their mailbox is explicitly excluded. They keep the EOP baseline at no extra cost.",
      "No (tenant-vs-user note \u2014 unlicensed user): this user has no Exchange Online mailbox at all (e.g. an Entra-only break-glass account); Defender for Office 365 has no mailbox footprint to protect them and the licence trigger never fires."
    ],
    docs: [
      ["Microsoft Defender for Office 365 service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description#microsoft-defender-for-office-365"],
      ["Recipient filters for Defender for Office 365 policies", "https://learn.microsoft.com/defender-office-365/recipient-filters-in-preset-security-policies"],
      ["Preset security policies (Standard / Strict)", "https://learn.microsoft.com/defender-office-365/preset-security-policies"],
      ["Defender for Office 365 plans and pricing", "https://learn.microsoft.com/defender-office-365/mdo-security-comparison"]
    ]
  },
  {
    name: "Defender for Endpoint Plan 2",
    sku: "M365 E5 / M365 E5 Security / Defender for Endpoint P2 standalone (per-user or per-device)",
    scope: "per-device",
    scopeNote:
      "Per onboarded endpoint. Microsoft's Defender for Endpoint licensing guide allows two purchase models: per-user (each user covers up to 5 devices \u2014 the M365 E5 / E5 Security / Defender Suite add-on path) or per-device standalone (typically used for shared / kiosk / OT endpoints). EDR, attack-surface-reduction reporting, automated investigation, advanced hunting on device data, vulnerability management, and threat-and-vulnerability remediation all require a P2 entitlement on the device. Defender for Endpoint Plan 1 (bundled in M365 E3 / E5 / F3 / Business Premium) provides next-gen AV + manual response / ASR rules only \u2014 no EDR / AIR / advanced hunting.",
    inScopeMeans:
      "this user's Windows, macOS, Linux, iOS, or Android device is onboarded to Defender for Endpoint and shows up in Device Inventory under their identity, AND the Defender for Endpoint experience the device reports is P2 (EDR + AIR + advanced hunting), not Plan 1.",
    notInScopeMeans:
      "this user has no Defender for Endpoint sensor on any device they use, OR every device they use runs Plan 1 only (next-gen AV + ASR rules, no EDR / advanced hunting).",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5; their managed laptop is onboarded to Defender for Endpoint P2 and shows up in Device Inventory under their identity.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 and their laptop is silently onboarded to Defender for Endpoint P2 via group-based onboarding. P2 needs an E5 / E5 Security / Defender Suite add-on / per-user P2 entitlement on the user (or per-device on the endpoint) \u2014 uplift, or move the device back to Plan 1.",
      "No (current licence already covers it): this user holds M365 E3, which bundles Defender for Endpoint Plan 1. Their laptop reports Plan 1 telemetry only \u2014 no EDR / advanced hunting \u2014 and no P2 licence trigger fires.",
      "No: this user only ever uses an unmanaged personal device with no Defender sensor of any plan, or an Azure VM jumpbox that has no Defender for Endpoint sensor installed."
    ],
    docs: [
      ["Defender for Endpoint licensing options", "https://learn.microsoft.com/defender-endpoint/minimum-requirements#licensing-requirements"],
      ["Compare Defender for Endpoint plans (P1 vs P2)", "https://learn.microsoft.com/defender-endpoint/defender-endpoint-plan-1-2"]
    ]
  },
  {
    name: "Defender for Identity",
    sku: "M365 E5 / M365 E5 Security / EMS E5 / Defender for Identity standalone",
    scope: "tenant-wide-not-scopeable",
    scopeNote:
      "Technically tenant-wide and not scopeable. The Microsoft Defender service description states verbatim that \u201CMicrosoft Defender for Identity features are enabled at the tenant level for all users within the tenant\u201D and that the service \u201Cisn't currently capable of limiting benefits to specific users.\u201D The sensor on Domain Controllers / AD FS / AD CS / Entra Connect observes every account in the monitored forest \u2014 you cannot scope it to a subset. Microsoft Product Terms still require a per-user Defender for Identity / EMS E5 / M365 E5 / E5 Security / Defender Suite add-on licence for every user who benefits from the service. Microsoft's Secure Future Initiative (Secure by Default principle) recommends enabling identity-threat protection like MDI on every tenant that has on-premises AD.",
    inScopeMeans:
      "the tenant has deployed any Defender for Identity sensor (on a Domain Controller, AD FS, AD CS, or Entra Connect server) \u2014 every user monitored by that sensor benefits, including this user.",
    notInScopeMeans:
      "the tenant has not deployed any Defender for Identity sensor on any Domain Controller, AD FS, AD CS, or Entra Connect server.",
    examples: [
      "Yes: any Defender for Identity sensor is running anywhere in the tenant's monitored forest \u2014 this user (along with every other monitored user) is a beneficiary and needs a licence.",
      "No: a greenfield / cloud-only tenant with no on-prem AD and no Defender for Identity sensors deployed; the licence is not yet triggered for anyone."
    ],
    docs: [
      ["Microsoft Defender for Identity service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description#microsoft-defender-for-identity"],
      ["Defender for Identity prerequisites (licensing)", "https://learn.microsoft.com/defender-for-identity/deploy/prerequisites-sensor-version-2#licensing-requirements"],
      ["Microsoft Product Terms", "https://www.microsoft.com/licensing/terms/"],
      ["Microsoft Secure Future Initiative (SFI)", "https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative"]
    ]
  },
  {
    name: "Defender for Cloud Apps",
    sku: "M365 E5 / M365 E5 Security / EMS E5 / Defender for Cloud Apps standalone",
    scope: "tenant-wide-scopeable",
    scopeNote:
      "Tenant-wide by default but scopeable. The Microsoft Defender service description states \u201CBy default, Microsoft Defender for Cloud Apps is enabled at the tenant level for all users within the tenant\u201D and then provides an explicit Scoped Deployment capability so admins can limit the service to licensed users / groups. Microsoft Product Terms require a per-user licence for every user covered by the scope you configure \u2014 Conditional Access App Control sessions, file / activity / OAuth-app policies, and attributed Cloud Discovery activity all count.",
    inScopeMeans:
      "this user's identity is included in the configured Scoped Deployment (or no Scoped Deployment is configured, so the tenant default applies), AND Defender for Cloud Apps activity / file / OAuth / session policies cover them.",
    notInScopeMeans:
      "a Scoped Deployment explicitly excludes this user's identity, AND no Conditional Access App Control or activity policy targets them.",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5; a Conditional Access App Control policy routes their Salesforce / ServiceNow sessions through the Defender for Cloud Apps reverse-proxy for download restrictions.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 and the tenant has no Scoped Deployment configured \u2014 so Defender for Cloud Apps is silently watching them. Either uplift to E5 / E5 Security / Defender Suite add-on, or configure Scoped Deployment to exclude them.",
      "No (current licence already covers it): Scoped Deployment is configured to include only the Sales group; this user is in IT and explicitly excluded.",
      "No: the tenant has Defender for Cloud Apps disabled / has never connected any apps; no per-user licence is triggered for anyone."
    ],
    docs: [
      ["Microsoft Defender for Cloud Apps service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description#microsoft-defender-for-cloud-apps"],
      ["Defender for Cloud Apps scoped deployment", "https://learn.microsoft.com/defender-cloud-apps/scoped-deployment"],
      ["Defender for Cloud Apps editions and licensing", "https://learn.microsoft.com/defender-cloud-apps/editions-cloud-app-security"]
    ]
  },
  {
    name: "Microsoft Defender XDR (correlation and incident layer)",
    sku: "Auto-entitled by any qualifying license; no separate per-user SKU",
    scope: "tenant-wide-scopeable",
    scopeNote:
      "Tenant-level entitlement, layered. Defender XDR is the cross-workload correlation, incident grouping, advanced hunting (KQL over 30 days of raw alert + signal data), automated investigation & response (AIR), automatic attack disruption, threat analytics, and unified portal experience at security.microsoft.com. There is no separate per-user Defender XDR SKU \u2014 customers are entitled automatically when at least one qualifying license is present in the tenant. Per Microsoft's official prerequisites, qualifying licenses include: M365 E5 / A5, M365 E3 + Defender Suite add-on, M365 E3 + EMS E5 add-on, M365 A3 + M365 A5 Security add-on, M365 Business Premium, Defender for Business, Windows 10/11 Enterprise E5 / A5, EMS E5 / A5, Office 365 E5 / A5, and any of the four per-user component SKUs (Defender for Endpoint P2, Defender for Office 365 P2, Defender for Identity, Defender for Cloud Apps). Crucially: Plan 1 versions (Defender for Endpoint P1, Defender for Office 365 P1, Defender for Business basic-only) do NOT qualify \u2014 they surface basic telemetry in the Defender portal but no XDR correlation / AIR / advanced hunting. Per-user visibility scope follows the underlying components: a SOC analyst's hunt only sees signals from identities / mailboxes / devices that hold qualifying licenses, and two XDR-tier features have a stricter dependency \u2014 Automatic Attack Disruption and Threat Analytics require Defender for Endpoint Plan 2 specifically.",
    inScopeMeans:
      "this user holds at least one qualifying license (any M365 E5 / A5 family SKU, M365 Business Premium, Defender for Business, E3 + Defender Suite add-on, EMS E5, O365 E5, or any of the four P2-tier Defender component SKUs); Defender XDR is automatically entitled for them with no extra cost, and incidents correlate across whichever components they hold.",
    notInScopeMeans:
      "this user holds no qualifying license \u2014 only Plan 1 / entry-level Defender (e.g., M365 E3 base with DfE P1 + DfO P1 only) or no Defender entitlement at all (Exchange Online Plan 1 standalone, M365 Apps for Business, F1 with no DfE assignment). They have nothing for Defender XDR to correlate beyond basic component telemetry.",
    examples: [
      "Yes (E5 path): this user holds M365 E5; all four Defender components light up in the unified Defender portal and incidents span email + endpoint + identity + cloud apps for them. Attack disruption and threat analytics fully available (E5 includes DfE P2).",
      "Yes (E3 + Defender Suite add-on): this user holds M365 E3 + Microsoft Defender Suite add-on \u2014 functionally equivalent XDR experience to E5, layered on the E3 base.",
      "Yes (SMB path \u2014 Business Premium / Defender for Business): this user holds M365 Business Premium (bundles Defender for Business). Defender XDR is entitled; correlation covers Defender for Business endpoint signals plus any Defender for Office 365 P1 / P2 they hold. Attack disruption requires explicitly uplifting to Defender for Endpoint P2 (Business Premium ships DfB, not full DfE P2).",
      "Yes (partial \u2014 single-component standalone uplift): this user holds M365 E3 + Defender for Endpoint Plan 2 standalone add-on (no Defender Suite). XDR is entitled, but their correlation is limited to endpoint signals \u2014 their mailbox and identity signals stay at P1 / Entra-Free tier and are NOT pulled into XDR incidents.",
      "Mixed-license tenant: 200 users on M365 E5, 800 users on M365 E3 (no add-on). Defender XDR is enabled tenant-wide because qualifying licenses exist. The 200 E5 users contribute full cross-workload signals; the 800 E3 users contribute only DfE P1 device telemetry (visible in Device Inventory but not in XDR incident correlation, AIR, or advanced hunting joins on those identities). A SOC analyst can only USE the XDR portal if THEY personally hold a qualifying license (typically E5).",
      "No (only Plan 1 components): this user holds M365 E3 with no Defender add-on. They have DfO P1 (anti-malware / Safe Links / Safe Attachments) and DfE P1 (next-gen AV) only. Neither P1 SKU qualifies for XDR \u2014 they can see basic component telemetry in security.microsoft.com but get no incident correlation, no advanced hunting, no AIR, no attack disruption.",
      "No (no Defender entitlement at all): this user holds Exchange Online Plan 1 standalone, or M365 Apps for Business, or an F1 frontline assignment with no Defender for Endpoint allocation. They have zero qualifying components \u2014 Defender XDR has nothing to correlate, surface, or hunt for them."
    ],
    docs: [
      ["Microsoft Defender XDR prerequisites \u2014 official licensing list", "https://learn.microsoft.com/defender-xdr/prerequisites#licensing-requirements"],
      ["What is Microsoft Defender XDR (correlates only licensed and provisioned signals)", "https://learn.microsoft.com/defender-xdr/microsoft-365-defender"],
      ["Defender for Office 365 Plan 1 vs Plan 2 cheat sheet (only P2 qualifies for XDR)", "https://learn.microsoft.com/defender-office-365/mdo-about#defender-for-office-365-plan-1-vs-plan-2-cheat-sheet"],
      ["Defender for Endpoint Plan 1 vs Plan 2 (only P2 qualifies for XDR + Attack Disruption)", "https://learn.microsoft.com/defender-endpoint/defender-endpoint-plan-1-2"],
      ["Configure automatic attack disruption (requires DfE P2)", "https://learn.microsoft.com/defender-xdr/configure-attack-disruption"],
      ["Microsoft Product Terms \u2014 Microsoft 365 Online Services", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ]
  }
];

const PURVIEW_E5_BREADTH_MINI_CARDS = [
  {
    name: "Insider Risk Management (IRM)",
    sku: "M365 E5 / E5 Compliance / IRM standalone",
    scope: "per-user",
    scopeNote:
      "Per-user feature. Microsoft Purview IRM policies score user signals (data theft by departing users, security policy violations, healthcare PHI, data leaks by priority users, risky AI usage). Microsoft Product Terms require a per-user E5 / E5 Compliance / IRM-standalone licence for every user whose activity an IRM policy is allowed to score. Adaptive Protection adds no independent licence requirement beyond IRM.",
    inScopeMeans:
      "this user (or their device) is included in the In-Scope users list of at least one IRM policy, or in a Priority Users group used by an IRM policy.",
    notInScopeMeans:
      "this user is not in the In-Scope list of any IRM policy AND not in any Priority Users group \u2014 their activity isn't scored.",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5 and is in the 'Priority Users \u2014 IT staff' IRM group.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 only but the tenant silently put them in an IRM Priority Users group. Uplift to E5 / E5 Compliance / IRM standalone, or remove them from scope.",
      "No: this user holds M365 E3 and the tenant excludes them from every IRM policy \u2014 no E5 trigger fires."
    ],
    docs: [
      ["IRM service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-tenantlevel-services-licensing-guidance#microsoft-purview-insider-risk-management"],
      ["IRM licensing prerequisites", "https://learn.microsoft.com/purview/insider-risk-management-configure-settings#prerequisites"]
    ]
  },
  {
    name: "Communication Compliance",
    sku: "M365 E5 / E5 Compliance / Communication Compliance standalone",
    scope: "per-user",
    scopeNote:
      "Per-user feature. Microsoft Purview Communication Compliance policies scan Exchange / Teams / Yammer / Viva Engage messages (plus optional connectors like Slack, Bloomberg, WhatsApp) for the users you scope in, looking for harassment, threats, regulatory violations, IP leaks. Microsoft Product Terms require a per-user E5 / E5 Compliance / CC-standalone licence for every user whose communications a CC policy scans.",
    inScopeMeans:
      "this user is in the user-scope of at least one Communication Compliance policy \u2014 their Exchange / Teams / Viva Engage messages are scanned.",
    notInScopeMeans:
      "this user is excluded from every Communication Compliance policy \u2014 none of their messages are scanned.",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5; their Teams DMs are scanned by the 'Workplace conduct' CC policy.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 only and is silently in scope of a FINRA / SEC CC policy. Uplift to E5 / E5 Compliance / CC standalone, or remove them from scope.",
      "No: this user holds M365 E3 and is excluded from every CC policy."
    ],
    docs: [
      ["Communication Compliance service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-tenantlevel-services-licensing-guidance#microsoft-purview-communication-compliance"],
      ["Communication Compliance licensing", "https://learn.microsoft.com/purview/communication-compliance-solution-overview#subscriptions-and-licensing"]
    ]
  },
  {
    name: "eDiscovery (Premium)",
    sku: "M365 E5 / E5 Compliance / E5 eDiscovery & Audit / eDiscovery Premium standalone",
    scope: "per-user",
    scopeNote:
      "Per-user (custodian + reviewer) feature. Microsoft Purview eDiscovery (Premium) provides advanced case workflow \u2014 custodian holds, advanced collection, review-set analytics, near-duplicate / threading, predictive coding (ML relevance), export to Relativity. Microsoft Product Terms require a per-user Premium licence for every named custodian and every reviewer who opens Review Sets. eDiscovery (Standard) \u2014 basic search + holds without the custodian workflow \u2014 is bundled in E3.",
    inScopeMeans:
      "this user is either (a) named as a custodian on at least one Premium eDiscovery case, OR (b) a reviewer who opens / works inside Review Sets.",
    notInScopeMeans:
      "this user is neither a Premium eDiscovery custodian nor a Review-Set reviewer. They can still be searched via Standard eDiscovery, which is included in E3.",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5; they are a Premium eDiscovery reviewer working inside Review Sets on a litigation matter.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 only and is added as a custodian on a Premium case. Uplift to E5 / E5 Compliance / E5 eDiscovery & Audit / Premium standalone \u2014 or downgrade the case to eDiscovery (Standard).",
      "No (current licence already covers it): this user holds M365 E3 and is only ever searched via eDiscovery (Standard) \u2014 included in E3, no Premium custodian status."
    ],
    docs: [
      ["eDiscovery (Premium) service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-tenantlevel-services-licensing-guidance#microsoft-purview-ediscovery-premium"],
      ["eDiscovery (Premium) subscriptions and licensing", "https://learn.microsoft.com/purview/ediscovery-premium-get-started#subscriptions-and-licensing"]
    ]
  },
  {
    name: "Audit (Premium)",
    sku: "M365 E5 / E5 Compliance / E5 eDiscovery & Audit / Audit Premium standalone",
    scope: "per-user",
    scopeNote:
      "Per-user feature, tenant-enabled. Audit (Premium) is enabled tenant-wide by default once an eligible SKU is present, but the service description states explicitly: \u201C1-year retention of audit logs and the auditing of crucial events only apply to users with the appropriate license\u201D and \u201C10-year retention of audit logs only applies to users with the appropriate add-on license.\u201D Crucial events (MailItemsAccessed, SearchQueryInitiated, Send, MessageBind) and 1-year (or optional 10-year) retention require a per-user Premium licence on the audited user. Tenant-vs-user note: an unlicensed user (no mailbox SKU at all) generates only limited Entra-level audit signals regardless of what the tenant holds, because the high-value events are workload-bound (Exchange / SharePoint) and need a mailbox / OneDrive licence to even exist.",
    inScopeMeans:
      "this user's role or regulatory context requires (a) MailItemsAccessed / SearchQueryInitiated / Send / MessageBind crucial events, OR (b) >180-day audit-log retention (1-year default with Audit Premium, 10-year with the audit-log retention add-on).",
    notInScopeMeans:
      "Audit (Standard) at 180-day retention covers this user's investigation / compliance needs (Standard event set + 180 days are bundled into M365 E3).",
    examples: [
      "Yes (licensed correctly): this user holds M365 E5 + a privileged role \u2014 their session / mailbox / search events need MailItemsAccessed-grade forensics on demand.",
      "Yes (under-licensed \u2014 needs uplift): this user holds M365 E3 only and an investigation requires MailItemsAccessed beyond what Standard provides. Uplift to E5 / E5 Compliance / E5 eDiscovery & Audit / Audit Premium standalone, or accept the Standard-tier signals.",
      "No (current licence already covers it): this user holds M365 E3; Audit (Standard) at 180-day retention covers their needs with no crucial-event requirement.",
      "No (tenant-vs-user note \u2014 unlicensed user): this user is an Entra-only break-glass account with no mailbox SKU. Even with Audit Premium enabled tenant-wide, there's no Exchange / SharePoint footprint to record MailItemsAccessed / SearchQueryInitiated for them \u2014 assign a mailbox first if mailbox-level forensics are required."
    ],
    docs: [
      ["Audit (Premium) service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-tenantlevel-services-licensing-guidance#microsoft-purview-audit-premium"],
      ["Auditing solutions overview", "https://learn.microsoft.com/purview/audit-solutions-overview"],
      ["Manage audit log retention policies", "https://learn.microsoft.com/purview/audit-log-retention-policies"]
    ]
  }
];

// INTUNE_SUITE_MINI_CARDS — used by `q_intune_suite` (admin's own Intune Suite
//   trigger check) and `q_intune_breadth` (the "do you need 2+ Suite features?"
//   bundle-vs-standalone follow-up). Six cards: Remote Help (the unique
//   helper-AND-sharer rule), Endpoint Privilege Management, Microsoft Tunnel
//   for MAM, Microsoft Cloud PKI, Enterprise App Management, Advanced Endpoint
//   Analytics. Every Intune Suite add-on requires Microsoft Intune Plan 1 or
//   Plan 2 as a prerequisite base license — the Suite is layered on top, not
//   a replacement. Tunnel for MAM has no standalone SKU (Suite-only); the
//   other five are also sold as per-user standalone add-ons.
const INTUNE_SUITE_MINI_CARDS = [
  {
    name: "Remote Help (helper + sharer license rule)",
    sku: "Microsoft Intune Suite / Remote Help standalone add-on (per-user). Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user, with a UNIQUE dual-licensing rule that does not exist elsewhere in the Intune Suite. Microsoft's Remote Help planning documentation states verbatim under Prerequisites: 'A Remote Help license for everyone targeted to use the service \u2014 both helpers (IT support workers) and sharers (users).' This means a Remote Help / Intune Suite license must be assigned to BOTH (a) the admin / helpdesk operator's own user account when they run support sessions AND (b) every end-user account whose device receives a session. Intune RBAC role assignment (Help Desk Operator built-in role, or a custom role with the Remote Help permissions) controls WHAT the helper can do (view only, full control, elevation, unattended on Android) \u2014 but RBAC is not a substitute for the per-user license. Both must be in the same Entra tenant; cross-tenant Remote Help is not supported.",
    inScopeMeans:
      "this user is either (a) a helpdesk / IT support worker who will RUN Remote Help sessions from the Intune admin center (helper role), OR (b) an end user whose device may RECEIVE a Remote Help session (sharer role).",
    notInScopeMeans:
      "this user is neither a helper nor a sharer \u2014 they neither run Remote Help sessions nor have a device that receives them.",
    examples: [
      "Yes (helper \u2014 admin's own account): Helpdesk admin holds Help Desk Operator role and uses Remote Help from intune.microsoft.com to take full control of a struggling user's laptop. License the admin's own account with Remote Help / Intune Suite, even though they themselves aren't the end user of the protected workload.",
      "Yes (sharer \u2014 end user): Field engineer's enrolled Windows laptop receives a Remote Help session from IT. License the engineer's account.",
      "Yes (under-licensed \u2014 needs uplift): Tenant has Intune Plan 1 only; admin tries to launch Remote Help and the session fails with a licensing error. Buy Remote Help standalone or Intune Suite for the admin (and every sharer).",
      "No: SOC analyst who never runs Remote Help, and whose device is supported by a separate helpdesk where the analyst themselves is just a sharer-eligible end user (no helper role assignment). They still need the license as a sharer if anyone might run a session against their device."
    ],
    docs: [
      ["Remote Help \u2014 plan (Prerequisites: license required for both helpers and sharers)", "https://learn.microsoft.com/intune/remote-help/plan#prerequisites"],
      ["Remote Help overview", "https://learn.microsoft.com/intune/remote-help/remote-help"],
      ["Intune RBAC for Remote Help (Help Desk Operator built-in role)", "https://learn.microsoft.com/intune/remote-help/plan#role-based-access-control-rbac"]
    ]
  },
  {
    name: "Endpoint Privilege Management (EPM)",
    sku: "Microsoft Intune Suite / EPM standalone add-on (per-user). Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user. EPM lets standard users elevate approved applications without holding local administrator rights on the device. License the USER whose elevation requests will be evaluated by an EPM elevation rule \u2014 the agent on their device is what consumes the entitlement, but the license is attached to the user identity. An Intune admin who AUTHORS elevation rules but is not themselves a standard user whose elevations are governed does NOT need an EPM license. EPM standalone exists for tenants that want just this feature without the rest of the Suite.",
    inScopeMeans:
      "this user signs in as a standard (non-admin) user on a Windows device that has the EPM agent and is targeted by an EPM elevation rule (e.g., approved apps allowed to elevate without UAC admin prompt).",
    notInScopeMeans:
      "this user either (a) doesn't use a Windows device with EPM enabled, OR (b) only OPERATES the EPM policy authoring UI in the Intune admin center under an Intune Administrator role without their own device being in scope of any elevation rule.",
    examples: [
      "Yes (end user): Standard-user developer needs to install npm packages that require admin elevation; their device is in an EPM elevation policy for approved tools. License their account.",
      "Yes (admin's own device): Intune admin's own laptop is a standard-user device covered by an EPM elevation rule for diagnostic tools. License the admin's account.",
      "No (admin operates the policy authoring UI only): Intune admin authors EPM elevation rules for 5,000 standard users but signs in to their own admin workstation as a local admin (no EPM elevation rule applies). No EPM license needed for the admin themselves \u2014 the 5,000 users still each need one."
    ],
    docs: [
      ["Endpoint Privilege Management overview", "https://learn.microsoft.com/intune/epm/overview"],
      ["EPM licensing requirements", "https://learn.microsoft.com/intune/epm/epm-overview#licensing-requirements"]
    ]
  },
  {
    name: "Microsoft Tunnel for MAM",
    sku: "Microsoft Intune Suite ONLY (per-user) \u2014 no standalone SKU. Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user. Microsoft Tunnel for MAM extends the Microsoft Tunnel VPN gateway to UNMANAGED iOS and Android devices that are not enrolled in Intune MDM but are protected by Mobile Application Management (MAM) policies (e.g., personal / BYOD devices running Outlook + Edge with App Protection Policies). License the USER whose unmanaged device runs the Tunnel for MAM client to reach corporate resources. The base Microsoft Tunnel for ENROLLED devices is part of Intune Plan 1 / Plan 2 itself \u2014 only the MAM extension requires Suite. Tunnel for MAM is uniquely Suite-only; there is no Tunnel-MAM standalone add-on.",
    inScopeMeans:
      "this user uses an UNMANAGED (Entra-registered only, not enrolled) iOS or Android device running an MAM-protected app (Outlook, Edge, Teams, Word, Excel, etc.) that needs to reach internal corporate resources through Microsoft Tunnel.",
    notInScopeMeans:
      "this user either (a) doesn't use Tunnel at all, OR (b) only uses Tunnel from FULLY ENROLLED iOS / Android / Windows / macOS devices (managed Tunnel, included in Intune Plan 1 / Plan 2, no Suite uplift needed).",
    examples: [
      "Yes: Consultant uses Outlook on their personal iPhone (MAM-protected, not enrolled) and needs to reach an internal SharePoint server through Microsoft Tunnel. License them for Intune Suite.",
      "Yes (under-licensed \u2014 needs uplift): Tenant deploys Tunnel for MAM to 200 BYOD users without buying Intune Suite. Connections fail at the licensing-check stage. Uplift the 200 users to Intune Suite (no standalone available).",
      "No (managed device path): Field engineer uses Tunnel from their fully-enrolled corporate iPhone \u2014 that's the base Microsoft Tunnel feature included in Intune Plan 1 / Plan 2, no Suite needed.",
      "No: this user doesn't use Tunnel of any kind."
    ],
    docs: [
      ["Microsoft Tunnel for MAM overview (Suite-only)", "https://learn.microsoft.com/intune/device-security/microsoft-tunnel/mam"],
      ["Microsoft Tunnel base (for enrolled devices, included in Intune Plan 1/2)", "https://learn.microsoft.com/intune/protect/microsoft-tunnel-overview"]
    ]
  },
  {
    name: "Microsoft Cloud PKI",
    sku: "Microsoft Intune Suite / Cloud PKI standalone add-on (per-user). Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user. Microsoft Cloud PKI is a managed certificate authority that issues, renews, and revokes user / device certificates for Intune-managed endpoints, replacing legacy on-prem AD CS + NDES + Intune Connector for SCEP / PKCS deployments. License the USER whose Intune-managed device receives a certificate from Cloud PKI \u2014 e.g., for Wi-Fi 802.1X, VPN, Entra ID certificate-based authentication, S/MIME mail signing, or app authentication. Cloud PKI standalone exists for tenants that only want managed PKI without the rest of the Suite.",
    inScopeMeans:
      "this user has an Intune-managed device that is targeted by a SCEP or PKCS certificate profile pointing to a Cloud PKI issuing CA (for Wi-Fi, VPN, CBA, S/MIME, or app auth).",
    notInScopeMeans:
      "this user either (a) has no device-issued certificates from Cloud PKI, OR (b) receives certificates from an on-prem ADCS + NDES + Intune Connector deployment instead, OR (c) only ADMINISTERS Cloud PKI CA configurations in the Intune admin center under an Intune Administrator role without holding any Cloud-PKI-issued certificate themselves.",
    examples: [
      "Yes: Marketing user's enrolled Windows laptop receives an 802.1X authentication certificate from a Cloud PKI issuing CA so it can connect to corporate Wi-Fi. License them for Cloud PKI standalone or Intune Suite.",
      "Yes (admin's own device): Intune admin's enrolled MacBook is configured with a Cloud-PKI-issued certificate for Entra CBA sign-in. License the admin's account.",
      "No (admin operates Cloud PKI config only): Intune admin onboards a Cloud PKI issuing CA and authors certificate profiles for 10,000 users, but their own admin workstation uses a legacy ADCS-issued certificate. No Cloud PKI license needed on the admin's account \u2014 the 10,000 user-devices still each need one.",
      "No (legacy on-prem path): User's device gets certificates from a SCEP / PKCS profile pointing at ADCS + NDES + Intune Connector. No Cloud PKI license required."
    ],
    docs: [
      ["Microsoft Cloud PKI overview", "https://learn.microsoft.com/intune/cloud-pki/overview"],
      ["Cloud PKI prerequisites and licensing", "https://learn.microsoft.com/intune/cloud-pki/quickstart-create-pki"]
    ]
  },
  {
    name: "Enterprise App Management (EAM)",
    sku: "Microsoft Intune Suite / EAM standalone add-on (per-user). Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user. Enterprise App Management provides a Microsoft-hosted Enterprise App Catalog of pre-packaged Win32 applications (and select macOS apps) with built-in install commands, detection rules, and \u2014 critically \u2014 auto-update detection / update push from the Intune admin center. It replaces the manual Win32 app packaging + repackaging cycle for the catalog's covered apps. License the USER whose Intune-managed device receives apps from the Enterprise App Catalog with EAM update tracking enabled. An Intune admin who ADMINISTERS the catalog (selects apps, configures deployments) but whose own device doesn't receive EAM-managed apps does not need an EAM license.",
    inScopeMeans:
      "this user has an Intune-managed Windows / macOS device that is deployed any application from the Enterprise App Catalog with EAM auto-update detection enabled (so Intune tracks newer versions in the catalog and pushes updates).",
    notInScopeMeans:
      "this user either (a) only receives manually-packaged Win32 / DMG apps (legacy path, no EAM), OR (b) only ADMINISTERS the Enterprise App Catalog in the Intune admin center under an Intune Administrator role without their own device being deployed any EAM-managed app.",
    examples: [
      "Yes (end user): Engineer's enrolled Windows laptop receives Zoom, 7-Zip, and Notepad++ from the Enterprise App Catalog with auto-update tracking enabled. License them for EAM standalone or Intune Suite.",
      "Yes (admin's own device): Intune admin's enrolled laptop is targeted by an EAM-managed deployment of Slack. License the admin's account.",
      "No (admin curates the catalog only): Intune admin builds the catalog of 50 EAM apps and assigns them to 8,000 users, but their own admin workstation uses legacy MSI / Win32 packages with no EAM auto-update tracking. No EAM license needed on the admin's account \u2014 the 8,000 users still each need one.",
      "No (legacy Win32 path): User's device gets apps via classic Win32 .intunewin packages or LOB apps with no catalog auto-update tracking. No EAM license required."
    ],
    docs: [
      ["Enterprise App Management overview", "https://learn.microsoft.com/intune/app-management/deployment/enterprise-app-management"],
      ["EAM licensing requirements", "https://learn.microsoft.com/intune/app-management/deployment/enterprise-app-management#licensing-requirements"]
    ]
  },
  {
    name: "Advanced Endpoint Analytics",
    sku: "Microsoft Intune Suite / Advanced Analytics standalone add-on (per-user). Requires Microsoft Intune Plan 1 or Plan 2 base.",
    scope: "per-user",
    scopeNote:
      "Per-user. Advanced Endpoint Analytics (now branded as 'Advanced Analytics' in the Intune admin center) extends the base Endpoint Analytics product (included in Intune Plan 1) with anomaly detection on device health metrics, a per-device timeline view showing changes / events over time, proactive remediation script scheduling (run a custom remediation when a detection script flags a problem), advanced battery health insights, and richer Windows reliability reports. License the USER whose Intune-managed device is enrolled in Advanced Analytics scoring / scripting. Plain Endpoint Analytics (boot performance, anti-malware overhead aggregates) is base Intune and free. Advanced Analytics standalone exists for tenants that only want this feature.",
    inScopeMeans:
      "this user has an Intune-managed Windows device that is in scope of an Advanced Analytics proactive remediation script, has its anomaly-detection data scored, or whose device timeline is viewed by an admin in the Advanced Analytics workspace.",
    notInScopeMeans:
      "this user either (a) only contributes data to base Endpoint Analytics (free, included), OR (b) only ADMINISTERS Advanced Analytics scripts and views aggregate data without their own device being scored / remediated.",
    examples: [
      "Yes (end user): Developer's enrolled Windows laptop is targeted by a proactive remediation script (detect outdated WSL, remediate with reinstall). License them for Advanced Analytics standalone or Intune Suite.",
      "Yes (admin's own device): Intune admin's enrolled laptop is in the Advanced Analytics anomaly-detection cohort \u2014 their device timeline is monitored. License the admin's account.",
      "No (admin views aggregate base Endpoint Analytics only): Intune admin checks Endpoint Analytics scores for the fleet but their own device is excluded from Advanced Analytics scoring / scripting. No Advanced Analytics license needed on the admin's account.",
      "No: this user's device only contributes to base Endpoint Analytics (boot performance / anti-malware overhead aggregates), no anomaly detection or proactive remediation."
    ],
    docs: [
      ["Advanced Endpoint Analytics overview", "https://learn.microsoft.com/intune/advanced-analytics/overview"],
      ["Intune advanced capabilities (Plan 2 / Suite / standalone matrix)", "https://learn.microsoft.com/intune/fundamentals/advanced-capabilities"]
    ]
  }
];

export const TREE = {
  gov_cloud: {
    choice: true,
    step: { major: 1, label: "Government cloud", secondary: true },
    question: "Which US sovereign cloud is the tenant in?",
    help: "Microsoft 365 Government tenants run in separately accredited environments. Feature availability, compliance accreditations, and licensing parity differ for each — this selection drives a sovereign-cloud caveat shown on every result.",
    helpLink: { label: "Background — sovereign cloud feature parity & compliance", target: "info_sovereign_cloud" },
    choices: [
      {
        label: "GCC (Government Community Cloud)",
        sublabel: "FedRAMP High / DoD IL2. Multi-tenant on commercial Azure with US-only data residency. Most M365 commercial features land in GCC with a multi-week to multi-month delay.",
        icon: "1",
        tone: "primary",
        value: "gcc",
        target: "start_choice"
      },
      {
        label: "GCC High",
        sublabel: "FedRAMP High / DoD IL4 / DFARS 7012 / ITAR / EAR. Isolated cloud, preferred for the Defense Industrial Base and CMMC Level 2 / 3 contractors handling CUI. Feature parity lags commercial.",
        icon: "2",
        tone: "primary",
        value: "gcc_high",
        target: "start_choice"
      },
      {
        label: "DoD",
        sublabel: "DoD IL5. US Department of Defense only — isolated cloud, most restrictive feature parity of the unclassified clouds.",
        icon: "3",
        tone: "primary",
        value: "dod",
        target: "start_choice"
      },
      {
        label: "Microsoft 365 Air-Gapped (Top Secret / DoD IL6)",
        sublabel: "Classified workloads on physically separated infrastructure. Commercial-feature parity is intentionally limited — verify every premium SKU on the Air-Gapped product page before purchase.",
        icon: "4",
        tone: "primary",
        value: "il6",
        target: "start_choice"
      }
    ]
  },
  info_sovereign_cloud: {
    info: true,
    badge: "Background",
    badgeClass: "badge-info",
    title: "US Government clouds — feature parity & compliance",
    sub: "Microsoft's government clouds are separately accredited environments with different feature roadmaps.",
    paragraphs: [
      "GCC (Government Community Cloud) is a multi-tenant environment that runs on commercial Microsoft 365 infrastructure with FedRAMP High accreditation, DoD IL2 reauthorization, and US-only data residency. Most M365 commercial features are available, usually with a feature-parity delay measured in weeks to months.",
      "GCC High is a physically and logically isolated cloud accredited at FedRAMP High and DoD IL4. It supports DFARS 7012, ITAR, and EAR controls — making it the preferred environment for the Defense Industrial Base (DIB) and CMMC Level 2 / Level 3 contractors who handle Controlled Unclassified Information (CUI). Feature parity lags commercial by 6–18 months for many capabilities; Microsoft 365 Copilot, parts of the Entra Suite (Global Secure Access, Verified ID), and the newest Defender XDR features ship later — or not at all.",
      "DoD is the most restricted unclassified cloud — DoD IL5, US Department of Defense only. Feature roadmap typically trails GCC High by another quarter or two.",
      "Microsoft 365 Air-Gapped (Top Secret / DoD IL6) serves classified workloads on physically separated infrastructure. Commercial-feature parity is intentionally limited — verify every premium SKU against the Air-Gapped product page before purchasing.",
      "Compliance context: CMMC Level 2 / Level 3 contractors handling CUI typically need GCC High or DoD, not GCC. Commercial M365 tenants generally cannot meet DFARS 7012 export-control requirements regardless of which premium SKUs are added."
    ],
    docs: [
      ["GCC High and DoD service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-us-government/gcc-high-and-dod"],
      ["Microsoft 365 Government — GCC service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-us-government/gcc"],
      ["US Government CMMC compliance", "https://learn.microsoft.com/compliance/us-government/gov-cmmc"],
      ["Compliance between Commercial, Government, DoD & Secret offerings (Microsoft TechCommunity)", "https://techcommunity.microsoft.com/blog/publicsectorblog/understanding-compliance-between-commercial-government-dod--secret-offerings---m/4225436"]
    ],
    actions: [
      { label: "Continue → pick your government cloud", target: "gov_cloud", tone: "primary" },
      { label: "← Back to who it's for", target: "start_choice", tone: "secondary" }
    ]
  },
  start_choice: {
    choice: true,
    step: { major: 1, label: "Who it's for" },
    question: "Who are you buying this license for?",
    help: "Pick the option that best describes the person. We'll use Microsoft Learn and m365maps.com to recommend the right license.",
    helpLink: { label: "Not sure what counts as an admin account? Read this first", target: "info_privileged_admins" },
    choices: [
      {
        label: "Privileged (dedicated) admin account",
        sublabel: "Industry standard for separation of duties. Used only for privileged work — no mailbox, no Teams, no Office consumption. Runs the full admin licensing tree.",
        icon: "1",
        tone: "primary",
        target: "start"
      },
      {
        label: "Primary daily-use account that also holds admin roles",
        sublabel: "Same identity does email/Teams/Office AND privileged work. Microsoft does not recommend this.",
        icon: "2",
        tone: "warning",
        target: "result_primary_account"
      },
      {
        label: "Information / knowledge worker (end user)",
        sublabel: "Office, Teams, Outlook, OneDrive, SharePoint user on a desktop or laptop. Two short questions → exact E3 / E3+Copilot / E5 / E7 recommendation.",
        icon: "3",
        tone: "primary",
        target: "q_iw_platform"
      },
      {
        label: "Frontline worker (F1 / F3)",
        sublabel: "Shift / deskless / field worker — retail, manufacturing, healthcare, hospitality. Step-by-step wizard walks Microsoft's eligibility criteria, then asks one question per E-vs-F feature gap, tracks add-on costs, and recommends F1 / F3 / F3 + add-ons / E3 / E5 by best total value.",
        icon: "4",
        tone: "primary",
        target: "q_frontline_eligibility"
      },
      {
        label: "Education (faculty / student)",
        sublabel: "Qualifying academic institution. Two short questions → exact A1 / A3 / A5 recommendation.",
        icon: "5",
        tone: "primary",
        target: "q_edu_security"
      },
      {
        label: "Government (GCC / GCC High / DoD / Air-Gapped)",
        sublabel: "US public-sector sovereign clouds. Pick a cloud + tier → exact G1 / G3 / G5 / Air-Gapped recommendation with cloud-specific caveats.",
        icon: "6",
        tone: "primary",
        target: "q_gov_profile_cloud"
      },
      {
        label: "Nonprofit (validated eligibility)",
        sublabel: "Charitable / nonprofit org enrolled in Microsoft Nonprofits. Two short questions → exact Business Premium grant / E3 NSP / E5 NSP recommendation.",
        icon: "7",
        tone: "primary",
        target: "q_npo_seats"
      },
      {
        label: "Small / mid-size business (≤ 300 seats)",
        sublabel: "Commercial business with no more than 300 seats. Two short questions → exact Business Basic / Standard / Premium recommendation.",
        icon: "8",
        tone: "primary",
        target: "q_smb_collab"
      },
      {
        label: "External ID / B2B guest / CIAM",
        sublabel: "Partner / vendor / contractor / customer identity. Pick the scenario → exact MAU free / P1 / P2 / Verified ID / CIAM recommendation.",
        icon: "9",
        tone: "primary",
        target: "q_extid_features"
      },
      {
        label: "Don't see your scenario? Suggest one",
        sublabel: "Opens a new GitHub issue — tell us the role / persona / SKU pattern we're missing and we'll add it to the tree.",
        icon: "+",
        tone: "ghost",
        href: "https://github.com/ninjapaw/m365profiles/issues/new?labels=missing-profile&title=Missing%20profile%3A%20%5Bdescribe%20role%20%2F%20persona%5D&body=Profile%20%2F%20persona%3A%0A%0AWhy%20the%20current%20decision%20tree%20didn%27t%20fit%3A%0A%0ASuggested%20SKU%28s%29%20%28optional%29%3A%0A%0AReference%20%28Microsoft%20Learn%20%2F%20m365maps%20URL%29%3A"
      }
    ]
  },
  info_privileged_admins: {
    info: true,
    badge: "Background",
    badgeClass: "badge-info",
    title: "Why privileged (dedicated) admin accounts?",
    sub: "Microsoft's privileged access strategy is built on separation of duties.",
    paragraphs: [
      "A privileged admin account is a separate cloud-only identity (typically admin-firstname@tenant.onmicrosoft.com) that is used only for privileged work — Global Admin, Privileged Role Admin, Identity / Security / Compliance / Intune / Teams / Exchange Admin, etc.",
      "The user's primary account holds their mailbox, Teams chats, OneDrive, and Office apps. The privileged account holds the role assignments. Two identities = two blast radii. If the primary mailbox is phished, the attacker doesn't automatically get Global Admin.",
      "Because the privileged account has no mailbox or Teams to consume, it doesn't need a Microsoft 365 service license. Most privileged admin accounts can run on Entra ID Free indefinitely — they only need a premium tier when they cross into PIM, Identity Protection, Defender XDR, Purview E5, Intune Suite, Teams Premium, Entra Suite, Copilot, or Agent 365.",
      "Portal access vs. license assignment — IMPORTANT: most Microsoft admin portals (Entra admin center, Intune admin center, Microsoft 365 admin center, Microsoft Defender portal, Microsoft Purview portal, Microsoft Sentinel, Security Copilot) enforce ROLE-GROUP permissions, not per-user license checks on the admin. A SOC analyst can triage Defender XDR incidents, an Insider Risk admin can manage IRM alerts and policies, an Intune admin can configure EPM / Cloud PKI / EAM policies — all without a per-user license assigned to the admin's account. The per-user license applies to the USERS / DEVICES being protected or monitored, not the admin operating the portal. The questions below test whether the admin's own account crosses into a scoped population.",
      "Notable exceptions where the admin's OWN account IS the licensed party (not just configuring for others): (1) Intune Remote Help — helper AND sharer both need the license per Microsoft planning docs; (2) Teams Premium admin-only features (Advanced collaboration analytics, aggregated Teams Premium usage views) — the Teams admin's own account must have Teams Premium assigned; (3) Microsoft Entra ID Governance — the Governance FAQ explicitly counts the admin who CONFIGURES Lifecycle Workflows / Entitlement Management as needing a license ('1 license for the Lifecycle Workflows Administrator'); (4) PIM eligible / approver / reviewer scenarios — each requires Entra ID P2 on the admin; (5) Identity Protection when the admin's own sign-ins are evaluated by risk policies; (6) M365 Copilot when the admin themselves invokes Copilot in apps or Copilot Chat work mode; (7) Global Secure Access — if the admin's own laptop runs the GSA client.",
      "Notable cases that DO NOT require a per-user license on the admin even though premium portals are involved: Microsoft Sentinel (GB-based Azure consumption, role-gated), Microsoft Security Copilot (SCU tenant capacity + Security Copilot role, no per-user SKU), Microsoft Entra Verified ID issuance (the FAQ states 'no special licensing requirements'), Defender XDR / Purview portal operation by SOC / IRM admins (role-gated; license applies to the users / devices being protected), and pure GSA policy configuration without the admin's device being a GSA client.",
      "Microsoft recommends at least two break-glass / emergency-access Global Administrator accounts on top of your day-to-day privileged admin accounts, stored offline with FIDO2 keys."
    ],
    docs: [
      ["Microsoft Entra best practices for admin roles", "https://learn.microsoft.com/entra/identity/role-based-access-control/best-practices"],
      ["Securing privileged access — overview", "https://learn.microsoft.com/security/privileged-access-workgroup/overview"],
      ["Privileged access accounts", "https://learn.microsoft.com/security/privileged-access-workgroup/privileged-access-accounts"],
      ["Emergency access accounts", "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access"],
      ["Remote Help — plan (helpers AND sharers both need a license)", "https://learn.microsoft.com/en-us/intune/remote-help/plan"],
      ["Teams Premium — organizer / attendee / admin license matrix", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/licensing-enhance-teams#which-features-are-applied-to-organizers-attendeesusers-or-admins"],
      ["Entra ID Governance FAQ — admin who CONFIGURES needs a license", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#do-licenses-need-to-be-assigned-to-users-to-use-identity-governance-features"],
      ["PIM licensing fundamentals — every category of P2-required user", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
      ["Identity Protection — required roles vs license scope", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#required-roles"],
      ["Verified ID FAQ — no special licensing requirements", "https://learn.microsoft.com/entra/verified-id/verifiable-credentials-faq#what-are-the-licensing-requirements"],
      ["Security Copilot FAQ — SCU pricing model (no per-user license)", "https://learn.microsoft.com/copilot/security/faq-security-copilot#how-is-security-copilot-priced"],
      ["Microsoft Sentinel billing — GB-based, role-gated", "https://learn.microsoft.com/azure/sentinel/billing"],
      ["Microsoft Purview service description — which users need a license", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#which-users-need-a-license"],
      ["Microsoft Product Terms — Universal License Terms (admin-without-license rule & per-user assignment)", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"]
    ],
    actions: [
      { label: "Continue with a privileged admin →", target: "start", tone: "primary" },
      { label: "See the full admin capability map (free vs P1 vs P2 vs E5)", target: "info_admin_capability_map", tone: "secondary" },
      { label: "I have a primary account instead", target: "result_primary_account", tone: "secondary" },
      { label: "← Back to account-scope choice", target: "start_choice", tone: "secondary" }
    ]
  },
  info_admin_capability_map: {
    info: true,
    badge: "Capability map",
    badgeClass: "badge-info",
    title: "Privileged admin capability map — what's free, what's P1, what's P2, what's E5",
    sub: "Cross-referenced against Microsoft Learn AND m365maps.com — built so you don't over-license a dedicated admin account.",
    paragraphs: [
      "This card answers the question we hear most often: 'My privileged admin account doesn't have a mailbox and doesn't use Office — but it DOES manage Conditional Access, MFA, Intune, Defender, and Purview. What license does it need?' The short answer is almost always 'nothing more than Entra ID Free' — as long as the admin only CONFIGURES things rather than being IN SCOPE of policies that target them. The long answer is below, organized by capability category.",
      "Each capability is tagged with (a) the license the admin's OWN account needs to USE the feature, (b) the Microsoft Learn documentation that defines that requirement, and (c) the m365maps.com visual map that shows where the feature is bundled. Where a capability is role-gated and free to configure but per-user to consume, both rows are called out. The walk-through tree below uses these same definitions.",
      "Three license tiers cover almost everything: Entra ID Free (included with every M365 tenant — no extra purchase), Entra ID P1 (bundled in M365 E3 / E5 / Business Premium / A3 / A5 / G3 / G5, sold standalone), and Entra ID P2 (bundled in M365 E5 / A5 / G5 / Entra Suite, sold standalone). M365 E5 layers Defender Suite + Purview E5 + Entra ID P2 on top of E3. The catch is that Microsoft Product Terms target the licence at the USER WHO BENEFITS — for an admin, 'benefits' means 'is in the policy's user scope', not 'opens the admin portal'."
    ],
    breakdownIntro: "Each row is one capability. The 'Scope' badge tells you whether the admin's own account needs a license to USE the capability (per-user / per-mailbox / per-device) or whether the capability is tenant-wide / role-gated (admin operates it free, but every USER it protects is licensed separately). Click through to Microsoft Learn for the technical doc and to m365maps.com for the visual licensing map.",
    productBreakdown: [
      {
        name: "Conditional Access — POLICY CONFIGURATION",
        sku: "Entra ID Free (role-gated: Conditional Access Administrator)",
        scope: "tenant-wide-scopeable",
        scopeNote: "Configuring CA policies in the Entra admin center is role-gated, not license-gated. Any user with the Conditional Access Administrator (or Security Administrator) role can author policies on Entra ID Free.",
        inScopeMeans: "the admin OPENS the Entra portal and creates / edits / disables Conditional Access policies. Role membership is the only requirement.",
        notInScopeMeans: "the admin is in the user/group scope of a CA policy themselves — that's the P1 row below, not this one.",
        examples: [
          "Free: Admin under the Conditional Access Administrator role authors policies for 50,000 users. No license required on the admin.",
          "Not free: Admin's account is in the user scope of a CA policy that requires phishing-resistant MFA for admins — that's the P1 row."
        ],
        docs: [
          ["Conditional Access Administrator role", "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#conditional-access-administrator"],
          ["Conditional Access overview", "https://learn.microsoft.com/entra/identity/conditional-access/overview"]
        ]
      },
      {
        name: "Conditional Access — USER IN POLICY SCOPE",
        sku: "Entra ID P1 (per-user, bundled in M365 E3 / E5 / Business Premium / EMS E3+)",
        scope: "per-user",
        scopeNote: "Every user TARGETED by a CA policy (included in user/group/role scope and not excluded) must have Entra ID P1 or higher assigned. Microsoft's CA licensing FAQ is explicit on this.",
        inScopeMeans: "the admin's own account is in the included scope of at least one CA policy (and not excluded). This is the most-missed admin licensing trigger.",
        notInScopeMeans: "the admin is a break-glass / emergency-access account explicitly excluded from every CA policy.",
        examples: [
          "Per-user: Tenant has CA policy 'Require MFA for all directory roles' that targets the Global Administrators role group. Admin holds GA → P1 required on the admin.",
          "Not per-user: Admin's account is excluded from every CA policy (break-glass pattern). Stays on Entra ID Free."
        ],
        docs: [
          ["CA licensing requirements (per-user-in-scope)", "https://learn.microsoft.com/entra/identity/conditional-access/overview#license-requirements"],
          ["Emergency access accounts — recommended CA exclusion", "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access"],
          ["M365 Maps — Entra ID P1", "https://m365maps.com/Microsoft%20Entra%20ID%20P1.htm"]
        ]
      },
      {
        name: "Security Defaults",
        sku: "Entra ID Free (tenant-wide on/off; mutually exclusive with Conditional Access)",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Security Defaults are tenant-wide and free. When enabled, they force Authenticator MFA enrollment for all users, block legacy auth, and require MFA for privileged actions — without any P1 license.",
        inScopeMeans: "the tenant has Security Defaults enabled — every user (including the admin) gets baseline MFA enforcement at no licensing cost.",
        examples: [
          "Free: New tenant under 300 seats uses Security Defaults to enforce MFA and block legacy auth. No P1 / E3 / Business Premium needed for the admin's account."
        ],
        docs: [
          ["Security Defaults — Entra ID Free", "https://learn.microsoft.com/entra/fundamentals/security-defaults"]
        ]
      },
      {
        name: "Multi-Factor Authentication (Authenticator push / TOTP / FIDO2)",
        sku: "Entra ID Free (per-user MFA, Security Defaults, or as part of any CA policy)",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Basic MFA via Microsoft Authenticator (push / TOTP) and FIDO2 security keys are free on Entra ID Free. The 'per-user MFA' enforcement model and Security Defaults both enable MFA at no additional cost. Advanced features (number matching, system-preferred MFA method, location-based granularity) are also free since 2023.",
        inScopeMeans: "every user signs in with MFA — the admin can require Authenticator app or FIDO2 keys on their own account at no licensing cost.",
        examples: [
          "Free: Admin requires FIDO2 (YubiKey) for sign-in via Authentication Methods policy. No P1 required.",
          "Free: Admin enables phishing-resistant MFA via Authentication Strengths and applies through a CA policy — Authentication Strength config is free; the CA policy is where P1 kicks in if the admin's own account is in scope."
        ],
        docs: [
          ["MFA licensing — free with Entra ID Free", "https://learn.microsoft.com/entra/identity/authentication/concept-mfa-licensing"],
          ["Authentication methods policy", "https://learn.microsoft.com/entra/identity/authentication/concept-authentication-methods-manage"]
        ]
      },
      {
        name: "Self-Service Password Reset (SSPR) — cloud users only",
        sku: "Entra ID Free (cloud-only password reset)",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Cloud-only SSPR (Entra-mastered accounts, no on-prem AD writeback) is free for all cloud users on Entra ID Free.",
        inScopeMeans: "the admin's cloud-only account can reset its own password via aka.ms/sspr at no licensing cost.",
        examples: [
          "Free: Cloud-only admin account uses SSPR to reset their password. No P1 required.",
          "Not free: Admin's account is synced from on-prem AD and SSPR writes back to AD — see SSPR writeback row below for P1 requirement."
        ],
        docs: [
          ["SSPR licensing (cloud users free)", "https://learn.microsoft.com/entra/identity/authentication/concept-sspr-licensing"]
        ]
      },
      {
        name: "Self-Service Password Reset (SSPR) — with on-prem writeback",
        sku: "Entra ID P1 (per-user, bundled in M365 E3 / E5 / Business Premium / EMS E3+)",
        scope: "per-user",
        scopeNote: "When SSPR writes back to on-prem AD via Entra Connect / Cloud Sync password writeback, every user with writeback enabled needs Entra ID P1.",
        inScopeMeans: "the admin's hybrid account uses SSPR and the new password syncs back to on-prem AD.",
        examples: [
          "Per-user: Hybrid admin account, password change via SSPR writes back to on-prem AD → P1 required."
        ],
        docs: [
          ["SSPR password writeback (P1 required)", "https://learn.microsoft.com/entra/identity/authentication/howto-sspr-writeback"]
        ]
      },
      {
        name: "Application Proxy — admin who configures the connector",
        sku: "Entra ID Free (role-gated: Application Administrator)",
        scope: "tenant-wide-scopeable",
        scopeNote: "Installing and configuring App Proxy connectors and publishing on-prem apps is role-gated. The publisher does not need a license.",
        inScopeMeans: "the admin under Application Administrator role installs connectors and publishes on-prem apps through Entra App Proxy.",
        examples: [
          "Free: Admin publishes the on-prem helpdesk app through App Proxy for remote users."
        ],
        docs: [
          ["Application Proxy admin role", "https://learn.microsoft.com/entra/identity/app-proxy/application-proxy"]
        ]
      },
      {
        name: "Application Proxy — connecting USER",
        sku: "Entra ID P1 (per-user)",
        scope: "per-user",
        scopeNote: "Every user who CONNECTS through Entra App Proxy to an on-prem app needs Entra ID P1.",
        inScopeMeans: "the admin's account connects through App Proxy to an on-prem app (e.g., SCCM console, legacy admin tool).",
        examples: [
          "Per-user: Admin connects via App Proxy to on-prem SCCM console → P1 required on the admin."
        ],
        docs: [
          ["App Proxy licensing (connecting users)", "https://learn.microsoft.com/entra/identity/app-proxy/overview-what-is-app-proxy"]
        ]
      },
      {
        name: "Privileged Identity Management (PIM)",
        sku: "Entra ID P2 (per ELIGIBLE user, bundled in M365 E5 / A5 / G5 / Entra Suite)",
        scope: "per-user",
        scopeNote: "Per PIM licensing fundamentals: 'an Entra ID P2 license is required for any user who is an eligible / active / approver / reviewer / requestor in PIM.' This includes the admin themselves when their role assignments are eligible-not-active.",
        inScopeMeans: "the admin's role assignments are configured as PIM-eligible (not permanent-active), OR the admin is an approver / reviewer for someone else's PIM elevation.",
        examples: [
          "Per-user: Admin's Global Administrator role is configured as PIM-eligible — they activate just-in-time. P2 required on the admin.",
          "Per-user: Admin is an approver for someone else's GA elevation. P2 required.",
          "Free: Admin's GA role is permanent-active (NOT recommended) and they don't approve anyone else's PIM. No P2 — but Microsoft's privileged access guidance strongly recommends PIM eligibility."
        ],
        docs: [
          ["PIM licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
          ["M365 Maps — Entra ID P2", "https://m365maps.com/Microsoft%20Entra%20ID%20P2.htm"]
        ]
      },
      {
        name: "Identity Protection — sign-in / user risk policies",
        sku: "Entra ID P2 (per-user, bundled in M365 E5 / A5 / G5 / Entra Suite)",
        scope: "per-user",
        scopeNote: "Identity Protection risk policies (sign-in risk, user risk) and full remediation (require password change, require MFA on risky sign-in) license each user IN POLICY SCOPE. Viewing the risky users / risky sign-ins reports is role-gated and free.",
        inScopeMeans: "the admin's own account is in the user/group scope of a sign-in risk or user risk policy with remediation actions.",
        notInScopeMeans: "the admin only VIEWS the risky users / risky sign-ins reports under the Security Reader role and is not themselves in any risk policy's scope.",
        examples: [
          "Per-user: All-users risk policy includes the admin → P2 required on the admin.",
          "Free (viewing only): Admin under Security Reader role views the Risky Sign-Ins report but is not in any risk policy's scope. No P2."
        ],
        docs: [
          ["Identity Protection required roles vs license scope", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#required-roles"]
        ]
      },
      {
        name: "Defender XDR portal (security.microsoft.com)",
        sku: "Free for admin (role-gated). Per-user license required for protected USERS.",
        scope: "tenant-wide-scopeable",
        scopeNote: "Opening the Defender XDR portal, triaging incidents, and running advanced hunting queries is role-gated (Security Reader / Security Operator / Security Administrator). The admin's own account needs NO Defender / E5 license to operate the portal. The per-user Defender Suite or M365 E5 license is required on USERS / MAILBOXES / DEVICES that are being protected.",
        inScopeMeans: "admin opens security.microsoft.com to triage incidents, run hunting queries, manage alerts. Role gives access; no license needed on the admin.",
        notInScopeMeans: "admin's own mailbox is in scope of a Defender for Office 365 Safe Links policy — then they're in the protected population.",
        examples: [
          "Free: SOC analyst under Security Operator role triages 500 incidents/day in Defender XDR for 50,000 protected users. No license on the analyst's account.",
          "Per-user: Admin's own mailbox is covered by Safe Attachments / Safe Links → Defender for Office 365 P1/P2 required on the admin's mailbox."
        ],
        docs: [
          ["Defender XDR — role-based access", "https://learn.microsoft.com/defender-xdr/m365d-permissions"],
          ["M365 Maps — Defender XDR", "https://m365maps.com/Microsoft%20Defender%20XDR.htm"]
        ]
      },
      {
        name: "Microsoft Sentinel",
        sku: "Azure GB-based consumption (NOT per-user). Role-gated for admin operation.",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Sentinel is billed via Azure GB-ingested pricing, not per-user. Admin operates it under the Sentinel Contributor / Reader / Responder Azure roles. No per-user license on the admin or anyone else.",
        inScopeMeans: "admin operates Sentinel workspaces, runs KQL queries, manages analytics rules, triages incidents.",
        examples: [
          "Free (per-user): Admin operates Sentinel across 5 workspaces. Azure consumption bill applies to the WORKSPACE, not per analyst or per protected user."
        ],
        docs: [
          ["Sentinel billing — GB-based", "https://learn.microsoft.com/azure/sentinel/billing"]
        ]
      },
      {
        name: "Microsoft Security Copilot",
        sku: "SCU (Security Compute Unit) tenant capacity. NOT per-user. Role-gated.",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Security Copilot is billed at the tenant level via SCU capacity provisioning. Admin operates it under the Copilot Owner / Contributor role. No per-user license assignment.",
        inScopeMeans: "admin uses Security Copilot standalone or embedded experiences (Defender XDR, Sentinel, Intune) to investigate incidents.",
        examples: [
          "Free (per-user): SOC analysts under Copilot Contributor role use Security Copilot to summarize Defender XDR incidents. SCU capacity bill applies; no per-analyst license.",
          "Bundled: M365 E5 and E7 customers get Security Copilot SCU capacity included at no extra cost."
        ],
        docs: [
          ["Security Copilot — SCU pricing", "https://learn.microsoft.com/copilot/security/faq-security-copilot#how-is-security-copilot-priced"]
        ]
      },
      {
        name: "Microsoft Purview portal (purview.microsoft.com)",
        sku: "Free for admin operation (role-gated). Per-user E5/E5 Compliance/Purview Suite required for PROTECTED USERS and admins IN MONITORED SCOPE.",
        scope: "tenant-wide-scopeable",
        scopeNote: "Opening the Purview portal and triaging IRM / DLP / eDiscovery / Communication Compliance alerts is role-gated (Insider Risk Management role group, eDiscovery Manager, Compliance Administrator, etc.). License applies to users IN MONITORED SCOPE — including the admin if they're added as a test user.",
        inScopeMeans: "admin under Compliance Administrator / IRM role triages alerts and tunes policies. No license needed on the admin unless they're in a monitored user scope.",
        notInScopeMeans: "admin is added as a TEST USER inside an IRM policy during pilot → they're in the monitored population, needs E5 Compliance / Purview Suite license.",
        examples: [
          "Free (admin only operates): IRM analyst triages 5,000 monitored users' alerts. Their own account is excluded from every IRM policy. No license on the analyst.",
          "Per-user: Admin added as test user inside Data Theft IRM policy → license required on the admin's account."
        ],
        docs: [
          ["Purview service description — who needs a license", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#which-users-need-a-license"],
          ["M365 Maps — Purview E5", "https://m365maps.com/Microsoft%20Purview%20E5.htm"]
        ]
      },
      {
        name: "Microsoft Intune admin center",
        sku: "Free for admin operation (role-gated: Intune Administrator). Per-USER Intune Plan 1+ for managed users / devices.",
        scope: "tenant-wide-scopeable",
        scopeNote: "Opening the Intune admin center (intune.microsoft.com), authoring configuration profiles, compliance policies, app deployments, and Autopilot setups is role-gated under Intune Administrator. The admin's own account does NOT need an Intune license to operate the portal.",
        inScopeMeans: "admin manages 10,000 devices via Intune policies and runs Autopilot enrollments. No license on the admin needed.",
        notInScopeMeans: "admin's own device is enrolled in Intune as a managed device → admin needs an Intune license (Plan 1 / Plan 2 / Suite) on their own account.",
        examples: [
          "Free (admin operates only): Intune admin manages 10,000 user-devices but their own admin workstation is a pure cloud-only device not enrolled in Intune. No Intune license on the admin.",
          "Per-user (admin's device managed): Admin's own laptop is enrolled in Intune with a compliance policy applied → Intune Plan 1+ required on the admin's account."
        ],
        docs: [
          ["Intune RBAC roles", "https://learn.microsoft.com/intune/intune-service/fundamentals/role-based-access-control"],
          ["Microsoft Intune licensing", "https://learn.microsoft.com/intune/intune-service/fundamentals/licenses"],
          ["M365 Maps — Microsoft Intune Suite", "https://m365maps.com/Microsoft%20Intune%20Suite.htm"]
        ]
      },
      {
        name: "Intune Remote Help (helpers AND sharers)",
        sku: "Remote Help standalone or Intune Suite — required on BOTH the helper admin's account AND the end-user sharer's account.",
        scope: "per-user",
        scopeNote: "Microsoft's Remote Help planning doc states verbatim: 'A Remote Help license for everyone targeted to use the service — both helpers (IT support workers) and sharers (users).' This is a UNIQUE dual-licensing rule in the Intune Suite.",
        inScopeMeans: "admin will RUN Remote Help sessions from the Intune admin center (helper role) — license required on the admin's account.",
        examples: [
          "Per-user (helper): Helpdesk admin holds Help Desk Operator role and runs Remote Help sessions → Remote Help / Intune Suite license required on the admin."
        ],
        docs: [
          ["Remote Help — plan (helpers AND sharers)", "https://learn.microsoft.com/intune/remote-help/plan"]
        ]
      },
      {
        name: "Microsoft Entra ID Governance — admin who CONFIGURES",
        sku: "Entra ID Governance per-user (bundled in Entra Suite / M365 E7) — required on the admin who configures Lifecycle Workflows / Entitlement Management.",
        scope: "per-user",
        scopeNote: "The Entra ID Governance FAQ is explicit: 'A license is needed for any user who configures Lifecycle Workflows' — that includes the admin who builds the workflow.",
        inScopeMeans: "admin authors Lifecycle Workflows or Entitlement Management access packages.",
        examples: [
          "Per-user: Identity admin builds Lifecycle Workflows for joiner/leaver automation → Entra ID Governance / Entra Suite / M365 E7 license required on the admin's own account."
        ],
        docs: [
          ["Entra ID Governance FAQ — admin licensing", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#do-licenses-need-to-be-assigned-to-users-to-use-identity-governance-features"]
        ]
      },
      {
        name: "Teams Premium — admin-only features (Advanced collaboration analytics)",
        sku: "Teams Premium per-user — required on the Teams admin's own account.",
        scope: "per-user",
        scopeNote: "Per the Teams Premium licensing matrix, Advanced collaboration analytics and aggregated Teams Premium usage views require Teams Premium assigned to the Teams admin's OWN account.",
        inScopeMeans: "admin uses Teams admin center features that require Teams Premium (analytics dashboards, premium config UIs).",
        examples: [
          "Per-user: Teams admin uses Advanced collaboration analytics → Teams Premium required on the admin's account."
        ],
        docs: [
          ["Teams Premium admin license matrix", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/licensing-enhance-teams#which-features-are-applied-to-organizers-attendeesusers-or-admins"]
        ]
      },
      {
        name: "Microsoft 365 Copilot — admin who USES Copilot",
        sku: "Microsoft 365 Copilot per-user add-on, OR M365 E7 (bundles Copilot).",
        scope: "per-user",
        scopeNote: "Per the M365 Copilot licensing doc, Copilot in apps (Word/Excel/PowerPoint/Outlook/Teams) and Copilot Chat work mode check for the per-user M365 Copilot license on the signed-in user — including the admin.",
        inScopeMeans: "admin invokes Copilot in any M365 app or runs work-mode Copilot Chat prompts.",
        notInScopeMeans: "admin only MANAGES Copilot rollout in the M365 admin center (license assignment, restricted SharePoint sites, Copilot governance) but never uses Copilot themselves.",
        examples: [
          "Per-user: Admin opens Copilot Chat in Teams to draft a status report → M365 Copilot required on the admin.",
          "Free (admin manages only): Admin configures Copilot license assignment and SharePoint Restricted Sites in the M365 admin center but never invokes Copilot. No Copilot license needed on the admin."
        ],
        docs: [
          ["M365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
          ["M365 Maps — Microsoft 365 Copilot", "https://m365maps.com/Microsoft%20365%20Copilot.htm"]
        ]
      },
      {
        name: "Microsoft Entra Verified ID",
        sku: "Free — no special licensing requirements (per Verified ID FAQ).",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Microsoft's Verified ID FAQ states verbatim: 'There are no special licensing requirements to issue verifiable credentials.' Issuance is free; Verified ID is bundled in Entra Suite as a value-add but does not itself require a per-user license.",
        inScopeMeans: "admin issues verifiable credentials for HR onboarding, helpdesk verification, etc.",
        examples: [
          "Free: Admin sets up Verified ID issuance pipeline for new-hire onboarding. No license required."
        ],
        docs: [
          ["Verified ID FAQ — no licensing requirements", "https://learn.microsoft.com/entra/verified-id/verifiable-credentials-faq#what-are-the-licensing-requirements"]
        ]
      },
      {
        name: "Global Secure Access (Internet Access + Private Access)",
        sku: "Microsoft Entra Suite per-user (or standalone GSA license) — required on EVERY USER whose device runs the GSA client.",
        scope: "per-user",
        scopeNote: "GSA is licensed per user whose client routes through the GSA edge. Configuring GSA policies in the Entra portal is role-gated and free.",
        inScopeMeans: "admin's own laptop runs the GSA client and routes traffic through Entra Internet Access / Private Access.",
        notInScopeMeans: "admin configures GSA traffic-forwarding profiles for other users but their own laptop is NOT a GSA client.",
        examples: [
          "Per-user: Admin's laptop runs GSA client → Entra Suite required on the admin's account.",
          "Free (config only): Admin configures GSA Internet Access for 5,000 users but their own laptop bypasses GSA. No GSA license on the admin."
        ],
        docs: [
          ["Global Secure Access overview", "https://learn.microsoft.com/entra/global-secure-access/overview-what-is-global-secure-access"],
          ["M365 Maps — Entra Suite", "https://m365maps.com/Microsoft%20Entra%20Suite.htm"]
        ]
      },
      {
        name: "Microsoft Entra Connect / Cloud Sync — admin who configures",
        sku: "Entra ID Free (role-gated: Hybrid Identity Administrator)",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Installing and operating Entra Connect (legacy) and Cloud Sync (modern) is role-gated. The admin who configures sync needs no license; synced USERS may need P1 for writeback features.",
        inScopeMeans: "admin installs Entra Connect or Cloud Sync and configures attribute filtering, scoping filters, and writeback.",
        examples: [
          "Free: Hybrid Identity Administrator configures Cloud Sync to sync on-prem AD users to Entra. No license required on the admin."
        ],
        docs: [
          ["Entra Connect / Cloud Sync overview", "https://learn.microsoft.com/entra/identity/hybrid/cloud-sync/what-is-cloud-sync"]
        ]
      },
      {
        name: "Cross-tenant access settings & B2B / B2B Direct Connect",
        sku: "Entra ID Free for admin config. Per-MAU billing for guests (External ID), free baseline.",
        scope: "tenant-wide-scopeable",
        scopeNote: "Configuring cross-tenant access settings, B2B invitations, and B2B Direct Connect trust is role-gated. External users are billed per MAU (Monthly Active User) at the External ID pricing tier; first 50,000 MAU free per Microsoft pricing.",
        inScopeMeans: "admin configures cross-tenant B2B trust and invites partners.",
        examples: [
          "Free: Admin invites 100 contractors as B2B guests. First 50,000 MAU free."
        ],
        docs: [
          ["Cross-tenant access settings", "https://learn.microsoft.com/entra/external-id/cross-tenant-access-overview"],
          ["External ID pricing (MAU model)", "https://learn.microsoft.com/entra/external-id/external-identities-pricing"]
        ]
      },
      {
        name: "Microsoft 365 admin center & Power Platform admin center",
        sku: "Free — Global Administrator and Power Platform Administrator administer WITHOUT a license.",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Microsoft's documented policy: 'Global Administrators and Power Platform Administrators can administer without a license assigned.' Unlicensed admins land in Administrative access mode for Dynamics 365 / Power Platform.",
        inScopeMeans: "admin operates the M365 admin center, Power Platform admin center, and Dynamics 365 admin center under GA / PPA role.",
        examples: [
          "Free: GA-only admin account manages tenant settings, license assignment, mailbox creation, Teams settings. No license required on the admin's account."
        ],
        docs: [
          ["GA / PPA can administer without a license", "https://learn.microsoft.com/power-platform/admin/global-service-administrators-can-administer-without-license"]
        ]
      }
    ],
    docs: [
      ["Microsoft Entra plans & pricing (Free vs P1 vs P2)", "https://www.microsoft.com/security/business/microsoft-entra-pricing"],
      ["Microsoft Entra service description", "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory"],
      ["Microsoft 365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["Microsoft Product Terms — Universal License Terms", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"],
      ["M365 Maps — full licensing map index", "https://m365maps.com/"],
      ["M365 Maps — Microsoft 365 and Office 365 plans comparison", "https://m365maps.com/files/Microsoft-365-and-Office-365-Plans.htm"],
      ["M365 Maps — Microsoft Entra ID Free / P1 / P2", "https://m365maps.com/Microsoft%20Entra%20ID%20P1.htm"],
      ["M365 Maps — Microsoft 365 E3", "https://m365maps.com/Microsoft%20365%20E3.htm"],
      ["M365 Maps — Microsoft 365 E5", "https://m365maps.com/Microsoft%20365%20E5.htm"],
      ["M365 Maps — Microsoft Intune Suite", "https://m365maps.com/Microsoft%20Intune%20Suite.htm"],
      ["M365 Maps — Microsoft Defender XDR", "https://m365maps.com/Microsoft%20Defender%20XDR.htm"],
      ["M365 Maps — Microsoft Purview E5", "https://m365maps.com/Microsoft%20Purview%20E5.htm"],
      ["M365 Maps — Microsoft Entra Suite", "https://m365maps.com/Microsoft%20Entra%20Suite.htm"]
    ],
    actions: [
      { label: "← Back to privileged admin overview", target: "info_privileged_admins", tone: "primary" },
      { label: "Start the admin walk-through →", target: "start", tone: "secondary" },
      { label: "← Back to account-scope choice", target: "start_choice", tone: "secondary" }
    ]
  },
  info_teams_phone: {
    info: true,
    badge: "Add-on deep-dive",
    badgeClass: "badge-info",
    title: "Teams Phone licensing — the four flavors",
    sub: "Cloud control plane vs. minutes — how to pick Teams Phone Standard, Calling Plan, Direct Routing, or Operator Connect.",
    paragraphs: [
      "Microsoft Teams Phone replaces a PBX with a cloud calling stack inside Microsoft Teams. The confusing part is that there are FOUR ways to license it, and you have to pick the cloud control plane separately from how Microsoft Teams gets to the PSTN (the phone network).",
      "STEP 1 — pick the cloud control plane. Teams Phone Standard (~$8 / user / month) is the basic license: it gives the user a Teams phone number, voicemail, call queues, auto attendants, and the ability to make and receive PSTN calls — but does NOT include any minutes. Teams Phone with Calling Plan bundles Standard PLUS Microsoft as the carrier with included minutes (Domestic ~$12 / user / month — 3,000 outbound domestic minutes; Domestic + International ~$24 / user / month — 600 international minutes added). Microsoft 365 E5 / E7 include Teams Phone Standard at no extra cost (you still need to add a Calling Plan or BYO carrier to actually make calls).",
      "STEP 2 — pick how calls reach the PSTN. Option A: Microsoft Calling Plan (the bundled-minutes SKUs above). Microsoft is your carrier; available in ~33 countries; cheapest if Microsoft sells it where you operate. Option B: Direct Routing — bring your own SIP trunks via a certified Session Border Controller (SBC) and pair it with Teams Phone Standard. Most flexible (any carrier in any country), most operational overhead (you run the SBC). Option C: Operator Connect — a curated marketplace of telco carriers (AT&T, BT, Verizon, Telstra, etc.) that integrate directly with Teams Phone Standard; you sign a contract with the carrier, they handle the SBC and provisioning. Lower lift than Direct Routing, fewer countries than DR but more than Calling Plan.",
      "STEP 3 — pick add-ons. Microsoft Teams Shared Devices (~$8 / device / month) is a device license for shared phones (lobby, conference rooms) — it covers Teams Phone Standard for that device. Common Area Phone is the Standard equivalent for shared phones. Communication Credits cover overage minutes, international toll, and inbound toll-free.",
      "RULE OF THUMB. ≤ 500 users in a Microsoft Calling-Plan country with predictable domestic-only calling → Teams Phone with Domestic Calling Plan. Larger / international / regulated industries → Direct Routing or Operator Connect with Teams Phone Standard. Already on Microsoft 365 E5 / E7 → Standard is included, just add a calling path."
    ],
    docs: [
      ["Teams Phone — overview", "https://www.microsoft.com/microsoft-teams/microsoft-teams-phone"],
      ["Teams Phone — plans and pricing", "https://www.microsoft.com/microsoft-teams/compare-microsoft-teams-options"],
      ["Teams Phone Standard vs Calling Plan vs Direct Routing vs Operator Connect (PSTN comparison)", "https://learn.microsoft.com/microsoftteams/pstn-connectivity"],
      ["Microsoft Calling Plans — country and region availability", "https://learn.microsoft.com/microsoftteams/calling-plan-landing-page"],
      ["Direct Routing — plan", "https://learn.microsoft.com/microsoftteams/direct-routing-plan"],
      ["Operator Connect — overview", "https://learn.microsoft.com/microsoftteams/operator-connect-plan"],
      ["Teams Shared Devices license", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/microsoft-teams-rooms-licensing#microsoft-teams-shared-devices-license"],
      ["Communication Credits — overview", "https://learn.microsoft.com/microsoftteams/what-are-communications-credits"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  info_windows_365: {
    info: true,
    badge: "Add-on deep-dive",
    badgeClass: "badge-info",
    title: "Windows 365 & Cloud PC licensing",
    sub: "Windows 365 Business vs. Enterprise vs. Frontline vs. Azure Virtual Desktop — when each is the right choice.",
    paragraphs: [
      "A Cloud PC is a Windows 11 desktop hosted by Microsoft and streamed to any device (Windows, Mac, iPad, browser). Microsoft sells it in two parallel SKU families that don't interchange: Windows 365 (fixed-price per-user Cloud PC) and Azure Virtual Desktop (per-user license + consumption-priced Azure VM).",
      "Windows 365 BUSINESS — ≤ 300 seats hard cap. Sold to small / mid-size business at a fixed per-user / per-month price by VM SKU (2 vCPU / 4 GB / 128 GB starts ~$31; 8 vCPU / 32 GB / 512 GB tops out ~$162). Includes Microsoft Defender Antivirus and the Windows 365 user portal — does NOT require an Intune license or Microsoft 365 E3. Best for SMBs that need a few Cloud PCs without a domain.",
      "Windows 365 ENTERPRISE — unlimited seats. Same fixed per-user pricing, but requires the assigned user already have Windows 11 / Windows 10 Enterprise licensing (Microsoft 365 E3 / E5 / F3 / A3 / A5 / Business Premium all include it) AND Microsoft Intune. The Cloud PC is provisioned into your tenant, joins Microsoft Entra (or Hybrid AD-joined), and is managed by Intune like any physical PC. Best for enterprise standardization, BYOD scenarios, contractor workstations, and developer environments.",
      "Windows 365 FRONTLINE — shift-worker model. One license covers up to 3 frontline users sharing a Cloud PC pool, with concurrency-based assignment. Sized for shift work where a Cloud PC is only used during the worker's shift. Significantly cheaper per-seat than Windows 365 Enterprise when the use pattern is truly shift-based.",
      "AZURE VIRTUAL DESKTOP (AVD) — consumption-priced alternative. The Windows / Microsoft 365 license cost is the same Enterprise inclusion, but the desktop runs on Azure VMs you size and pay for by the hour (with auto-scale, hibernate, and reserved-instance discounts). More flexible than Windows 365 (multi-session Windows 11, custom images, app streaming, RemoteApp), more complex to operate. Best for very large fleets where consumption pricing beats fixed Cloud PC pricing, or for app-streaming and multi-session scenarios Windows 365 doesn't cover."
    ],
    docs: [
      ["Windows 365 — overview", "https://www.microsoft.com/windows-365"],
      ["Windows 365 Business vs Enterprise comparison", "https://learn.microsoft.com/windows-365/business/compare-plans"],
      ["Windows 365 Enterprise — requirements", "https://learn.microsoft.com/windows-365/enterprise/requirements"],
      ["Windows 365 Frontline — overview", "https://learn.microsoft.com/windows-365/enterprise/windows-365-frontline-overview"],
      ["Azure Virtual Desktop — pricing", "https://azure.microsoft.com/pricing/details/virtual-desktop/"],
      ["Choose between Windows 365 and AVD", "https://learn.microsoft.com/windows-365/business/windows-365-business-vs-enterprise"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  info_workload_addons: {
    info: true,
    badge: "Add-on deep-dive",
    badgeClass: "badge-info",
    title: "Workload add-ons — Viva, Project, Visio, Power Platform",
    sub: "When to layer Microsoft Viva, Project, Visio, Power BI, Power Apps, or Copilot Studio on top of a base SKU.",
    paragraphs: [
      "Microsoft sells most workloads (analytics, project, diagramming, BI, low-code, agent platforms) as add-on SKUs on top of a base Microsoft 365 / Office 365 SKU. The decision is always: does the bundled tier in my base SKU cover the use case, or do I need a paid add-on per user?",
      "MICROSOFT VIVA. Viva Connections is included with most Microsoft 365 / Office 365 SKUs. Viva Engage core (formerly Yammer) is included. Paid uplift = Viva Suite (~$12 / user / month) bundling Viva Insights (advanced personal + team analytics, Glint integration), Viva Goals (OKRs, formerly Ally.io), Viva Learning (Premium content library), Viva Topics (knowledge AI — now deprecated but still in the Suite), and Viva Engage Premium (Storyline + Leadership Corner). Best fit: HR / People Analytics, OKR-driven orgs, large enterprises with internal learning programs. Microsoft 365 Copilot license is NOT a substitute for Viva Suite — they're complementary.",
      "MICROSOFT PROJECT. Project Plan 1 (~$10 / user / month) — web-only project / task list. Project Plan 3 (~$30 / user / month) — Plan 1 + Project desktop app + Resource Management. Project Plan 5 (~$55 / user / month) — Plan 3 + portfolio analytics + demand management. Pick by feature need: most casual PMs only need Plan 1; PMO / portfolio offices need Plan 5.",
      "MICROSOFT VISIO. Visio Plan 1 (~$5 / user / month) — web-only diagramming. Visio Plan 2 (~$15 / user / month) — Plan 1 + Visio desktop app + Data Visualizer + Process Advisor. Most architects / engineers / business analysts want Plan 2.",
      "POWER BI. Power BI Pro (~$10 / user / month, included in Microsoft 365 E5 / E7 / A5 / G5) — author + share reports in My Workspace and Pro workspaces. Power BI Premium Per User / PPU (~$20 / user / month) — Pro + paginated reports + AI features + 100 GB datasets. Power BI Premium Per Capacity (~$5,000 / capacity / month) — dedicated capacity, no per-user limit for consumers, required for Premium-only features at scale. Microsoft Fabric (capacity-priced from ~$262 / month F2 SKU) — supersedes Power BI Premium Per Capacity for new deployments and adds Data Engineering, Data Science, Real-Time Analytics, and OneLake.",
      "POWER APPS & POWER AUTOMATE. Seeded usage rights for premium connectors are NOT included in any Microsoft 365 / Office 365 SKU — base SKUs only include Power Apps for Microsoft 365 (standard connectors only, customizing SharePoint / Teams data). Paid: Power Apps Premium (~$20 / user / month, formerly Per User Plan) — unlimited apps + premium connectors + Dataverse + custom AI. Power Apps Per App (~$5 / user / app / month) — 1 specific app. Power Automate Premium (~$15 / user / month) — premium connectors in flows. Power Automate Process (~$150 / bot / month) — Process Mining + RPA bot. Microsoft Sentinel-style consumption pricing for Power Automate hosted RPA.",
      "COPILOT STUDIO. ~$200 / tenant / month (25,000 messages) — build agents / copilots that integrate with Microsoft 365 Copilot, Teams, custom websites, etc. Required for any agent built with Copilot Studio that's not just a Microsoft 365 Copilot extension. Microsoft 365 Copilot per-user license is separate (~$30 / user / month) and required for the user invoking the agent inside Microsoft 365 apps.",
      "MICROSOFT 365 COPILOT. ~$30 / user / month add-on (requires a base Microsoft 365 / Office 365 SKU with Outlook, Word, Excel, PowerPoint, Teams, OneDrive). The base SKU question (E3 vs E5 vs E7 vs Business Standard / Premium vs A3 / A5 vs G3 / G5) is answered first, then Copilot layers on top. Microsoft 365 Copilot Chat (formerly Bing Chat Enterprise) is included with most paid Microsoft 365 / Office 365 SKUs at no extra cost — only the in-app Copilot in Word / Excel / PowerPoint / Outlook / Teams requires the paid Copilot license."
    ],
    docs: [
      ["Microsoft Viva — plans and pricing", "https://www.microsoft.com/microsoft-viva/pricing"],
      ["Microsoft Project — plans", "https://www.microsoft.com/microsoft-365/project/compare-microsoft-project-management-software"],
      ["Microsoft Visio — plans", "https://www.microsoft.com/microsoft-365/visio/compare-visio-options"],
      ["Power BI pricing", "https://www.microsoft.com/power-platform/products/power-bi/pricing"],
      ["Microsoft Fabric pricing", "https://azure.microsoft.com/pricing/details/microsoft-fabric/"],
      ["Power Apps pricing", "https://www.microsoft.com/power-platform/products/power-apps/pricing"],
      ["Power Automate pricing", "https://www.microsoft.com/power-platform/products/power-automate/pricing"],
      ["Copilot Studio pricing", "https://www.microsoft.com/microsoft-copilot/microsoft-copilot-studio"],
      ["Microsoft 365 Copilot — overview", "https://www.microsoft.com/microsoft-365/copilot/business"],
      ["Power Platform licensing overview (the authoritative guide)", "https://learn.microsoft.com/power-platform/admin/pricing-billing-skus"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  info_per_device_licensing: {
    info: true,
    badge: "Background · informational",
    badgeClass: "badge-warning",
    title: "Per-device & shared-workstation licensing",
    sub: "This tree profiles USERS — not devices. Shared workstations, lobby phones, classroom PCs, and Teams Rooms hardware follow a separate licensing model. Read this any time you're sizing a device, kiosk, or shared endpoint instead of a person.",
    paragraphs: [
      "WHY this is informational, not a yes/no fork. Every other question in this tree assumes a single human identity — a user account with a mailbox / no-mailbox, an admin role / no admin role, etc. Per-device licensing sits on a different procurement axis: it covers physical endpoints that don't map cleanly to one user (shared front-desk PC, conference-room display, factory-floor terminal, common-area phone, classroom workstation). When the right answer is per-device, the question to read is the Microsoft Product Terms — not a one-question wizard fork.",
      "THE SHARED-WORKSTATION RULE (Universal License Terms). Microsoft's Universal License Terms — which apply to every Microsoft 365 / Office 365 / Windows / Teams SKU — say a per-user license covers ONE named user. If multiple distinct humans physically use the same device or sign in to the same Microsoft 365 Apps installation, EVERY one of those humans must EITHER (a) have their own per-user license assigned, OR (b) the device itself must be licensed with a per-device SKU. There is no middle ground.",
      "TWO-ACCOUNT SAME USER IS NOT SHARED. A user who holds both a privileged admin account (e.g. admin-alice@tenant.onmicrosoft.com) and a primary daily-use account (alice@contoso.com) on the same laptop is ONE licensed user. Microsoft licensing is based on the human consuming the service, not the count of identities. The Privileged Admin / Primary Account split this tree's first question already captures is about role separation — it does not duplicate licensing.",
      "WHEN PER-DEVICE IS THE RIGHT ANSWER. (1) A workstation that 5+ rotating shift workers sign in to (factory floor PC, hospital nurse station, retail back-office terminal). (2) A Teams conference room with a Teams Rooms certified appliance (Logitech Tap, Poly Studio X, etc.) — needs Teams Rooms Basic or Pro per device, not per user. (3) A lobby / reception / breakroom phone with no assigned user — needs Common Area Phone or Microsoft Teams Shared Devices. (4) A K-12 classroom PC used by 25+ students per day — Education Student-Use Benefit per device. (5) Industrial / air-gapped scenarios where cloud sign-in isn't possible — Office LTSC perpetual + Windows 11 Enterprise per Device via Volume Licensing.",
      "THE PER-DEVICE SKU CATALOG. Microsoft Teams Rooms BASIC (~$0 / room / month, ≤ 25 rooms per tenant, basic meeting features, free) and PRO (~$40 / room / month, advanced management, intelligent capture, AI noise suppression, premium meeting experiences) — for Teams-certified room hardware. Microsoft Teams Shared Devices (~$10 / device / month) — for shared Teams phones, displays, and shared sign-in devices that aren't certified Teams Rooms. Common Area Phone (~$8 / device / month) — for unassigned lobby / hallway / elevator phones with PSTN calling via Calling Plan or Direct Routing. Microsoft 365 Apps for Enterprise (Device) — restricted SKU for shared physical PCs running installed Office; sold via Volume Licensing only. Windows 11 Enterprise per Device — Volume Licensing alternative to per-user E3 / E5 Windows entitlement; useful when devices are shared and you don't want to license every user with Microsoft 365. Office LTSC 2024 Standard / Professional Plus — perpetual, device-installed, no cloud sign-in; for air-gapped, regulated, or kiosk scenarios. EES Student-Use Benefit (per device) — academic device licensing for shared K-12 student PCs.",
      "FRONTLINE-SPECIFIC NUANCE. Microsoft 365 F1 / F3 are PER-USER frontline SKUs that explicitly permit sign-in on shared devices — but the LICENSED entity is still the user, not the device. A frontline worker can sign in to up to 3 shared devices and 1 personal device with one F license. If a shared device is used by workers who do NOT have their own F license assigned (e.g. visiting contractors, walk-in vendors), the device itself needs a per-device SKU on top.",
      "MICROSOFT 365 APPS — SHARED COMPUTER ACTIVATION (SCA). When installed Office (Word / Excel / PowerPoint / Outlook) runs on a SHARED Windows PC that multiple users sign in to (e.g. RDS / Citrix session hosts, multi-user shared workstations), Shared Computer Activation MUST be enabled in the Office Deployment Tool configuration. SCA does NOT change the licensing — every signed-in user still needs a Microsoft 365 Apps license — but without SCA enabled, Office will fail to activate on subsequent users. Required for AVD multi-session, Windows 365 Frontline pooled, RDS / Citrix scenarios. Not required when only one user signs into the PC.",
      "AUDIT REALITY. Microsoft does enforce these rules during EA / CSP true-ups and licensing reviews. The two failure modes auditors most often find: (1) under-licensing — multiple users share a workstation but only one user license is assigned; (2) F-SKU mis-assignment — a knowledge worker who sits at a personal HQ desk is licensed as F1 / F3 to save money. Both are remediable but expensive. Use this tree's profile-by-profile recommendations for the PRIMARY user of each device, then sanity-check shared scenarios against the per-device catalog above.",
      "BOTTOM LINE FOR THIS TOOL. If you are profiling a HUMAN USER who has dedicated use of a device (laptop, phone, shift-assigned tablet), the recommendations from the per-profile wizards are complete. If you are sizing a SHARED DEVICE, a CONFERENCE ROOM, a LOBBY PHONE, a CLASSROOM PC, or a KIOSK, treat this page as the authoritative reference and pick a per-device SKU from the catalog above — the per-user wizards do not apply."
    ],
    docs: [
      ["Microsoft Product Terms — Universal License Terms (the per-user / per-device rule)", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"],
      ["Microsoft Product Terms — Microsoft 365 / Office 365 Online Services Use Rights", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["Microsoft Teams Rooms — licensing (Basic vs. Pro per-device)", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/microsoft-teams-rooms-licensing"],
      ["Microsoft Teams Shared Devices — license overview", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/microsoft-teams-rooms-licensing#microsoft-teams-shared-devices-license"],
      ["Common Area Phone licensing", "https://learn.microsoft.com/microsoftteams/set-up-common-area-phones"],
      ["Microsoft 365 Apps for Enterprise (Device) — Volume Licensing reference", "https://www.microsoft.com/licensing/product-licensing/microsoft-365"],
      ["Windows 11 Enterprise per-device vs. per-user (Volume Licensing)", "https://learn.microsoft.com/windows/whats-new/windows-licensing"],
      ["Office LTSC 2024 — overview", "https://learn.microsoft.com/officeupdates/perpetual-versions"],
      ["Microsoft 365 Apps — Shared Computer Activation (SCA) overview", "https://learn.microsoft.com/deployoffice/overview-shared-computer-activation"],
      ["Microsoft 365 Apps — enable Shared Computer Activation", "https://learn.microsoft.com/deployoffice/overview-shared-computer-activation#enable-shared-computer-activation-for-microsoft-365-apps"],
      ["Frontline workers — shared device sign-in (1 personal + 3 shared rule)", "https://learn.microsoft.com/microsoft-365/frontline/flw-shared-devices"],
      ["EES Student-Use Benefit (per-device academic licensing)", "https://www.microsoft.com/licensing/news/student-use-benefit"],
      ["Microsoft licensing audits — best practices (Volume Licensing)", "https://www.microsoft.com/licensing/learn-more/compliance"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  // result_primary_account was previously a fuzzy result that said
  // "buy a base service license (E3 / Business Premium / F3) PLUS re-run
  // the admin tree to get the premium tier." That left the user with two
  // unanswered questions and zero specific SKUs. It is now an info node
  // that routes through the knowledge-worker disambiguation (q_iw_security
  // → q_iw_copilot_*) for the base SKU AND offers a second action to
  // re-run the privileged-admin tree for any premium add-ons on top.
  result_primary_account: {
    info: true,
    badge: "License needed",
    badgeClass: "badge-warning",
    title: "Daily-use account that also holds admin roles",
    sub: "Microsoft recommends splitting daily-use and admin work into separate identities, but if this one account does both, it needs a base end-user license AND any premium tier the admin work requires.",
    paragraphs: [
      "Microsoft's privileged-access guidance is to keep daily-use and admin identities separate. A dedicated admin-only account usually only needs Entra ID Free — far cheaper than a full user license. That separation is a future improvement; right now this single account is doing both jobs.",
      "Because the account reads mail / joins Teams / edits Office docs, it always needs a per-user base service license. The next two quick questions narrow that down to a specific SKU (Microsoft 365 E3, E3 + Copilot, E5, or E7).",
      "On top of that base SKU, the same account also needs any premium tier the admin work requires (Defender Suite, Purview, Intune Suite, PIM via Entra ID P2, Entra Suite, Teams Premium, Copilot, etc.). After this run, optionally re-run the tree as a privileged-admin profile to identify those add-ons — then layer them on top of the base SKU you get here.",
      "Tenant-baseline mapping: if your tenant is Business Premium, Frontline, Education, Government, or Nonprofit, the E3 / E5 / E7 answer maps directly to your equivalent SKU (Business Premium ≈ E3, A3 ≈ E3, A5 ≈ E5, G3 ≈ E3, G5 ≈ E5, NSP E3 ≈ E3, NSP E5 ≈ E5)."
    ],
    docs: [
      ["Why separate admin accounts matter", "https://learn.microsoft.com/entra/identity/role-based-access-control/best-practices"],
      ["Securing privileged access — overview", "https://learn.microsoft.com/security/privileged-access-workgroup/overview"],
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"]
    ],
    actions: [
      { label: "Find the base service license →", target: "q_iw_platform", tone: "primary" },
      { label: "Run the privileged-admin add-on tree →", target: "start", tone: "secondary" },
      { label: "← Back to account-scope choice", target: "start_choice", tone: "secondary" }
    ]
  },
  start: {
    step: { major: 2, sub: 1, subTotal: 2, label: "Service consumption" },
    question: "Does this privileged admin account sign in to any Microsoft 365 user-facing service (Exchange mailbox, Teams, SharePoint, OneDrive, Office apps)?",
    help: "A properly dedicated privileged admin account should not be used to read mail, join Teams meetings, or open Office documents. If it does consume any of those services, it needs a service license — separate from any admin role — and you should consider splitting it back into a primary + privileged pair.",
    rationale: {
      why: "Microsoft 365 service licenses (Exchange, Teams, SharePoint/OneDrive, Office apps) are per-user — any account that signs in and consumes those services must be licensed for them, regardless of whether it also holds admin roles.",
      yes: "the account is consuming Microsoft 365 services, so a base service plan is required (E3 / Business Premium / F3 minimum) — this is independent of any premium-tier add-ons.",
      no: "the account is purely administrative — we keep walking the tree to see whether any premium-tier admin feature requires a license on its own."
    },
    examples: [
      "Yes example: The admin reads Exchange email, joins Teams calls, or edits files in OneDrive.",
      "No example: The admin only signs in for Entra/Intune/Security portals and never uses end-user workloads."
    ],
    techDocs: [
      ["Exchange Online service descriptions", "https://learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-service-description"],
      ["Microsoft Teams service description", "https://learn.microsoft.com/office365/servicedescriptions/teams-service-description/teams-service-description"],
      ["SharePoint Online and OneDrive service descriptions", "https://learn.microsoft.com/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-service-description"]
    ],
    yes: "result_service",
    no: "q_service_principal"
  },
  q_service_principal: {
    step: { major: 2, sub: 2, subTotal: 2, label: "Service consumption" },
    question: "Is this a non-interactive identity — service principal, managed identity, or workload identity with no human sign-in?",
    help: "Per Microsoft guidance, service principals and managed identities are typically excluded from user-targeted Conditional Access and don't consume user licenses. Use managed identities where possible.",
    rationale: {
      why: "User-based Microsoft 365 and Entra licenses are assigned to humans. Service principals, managed identities, and workload identities are billed differently — they don't consume per-user licenses, and Entra Workload Identities Premium is a separate (optional) per-identity SKU.",
      yes: "no per-user Microsoft 365 license is required for the identity itself; advanced workload protection is opt-in via Workload Identities Premium.",
      no: "this is a human-driven admin account, so we continue walking the tree to find the lowest tier that covers every premium feature it actually uses."
    },
    examples: [
      "Yes example: Azure Automation or Function app uses a managed identity to call Graph/API with no person signing in.",
      "No example: A named human admin account signs in interactively to admin centers."
    ],
    techDocs: [
      ["Managed identities for Azure resources", "https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview"],
      ["Workload identities FAQ", "https://learn.microsoft.com/entra/workload-id/workload-identities-faqs"],
      ["Conditional Access for workload identities", "https://learn.microsoft.com/entra/identity/conditional-access/workload-identity"]
    ],
    yes: "result_service_principal",
    no: "q_admin_p1_audience"
  },
  q_admin_p1_audience: {
    step: { major: 3, sub: 1, subTotal: 6, label: "Premium service features" },
    question: "Is the admin's OWN account the AUDIENCE of any Microsoft Entra ID P1 feature — i.e., targeted by a Conditional Access policy (other than a break-glass exclusion), enrolled in self-service password reset with on-prem write-back, in scope of a sign-in risk policy with remediation, accessing an on-prem app published through Microsoft Entra Application Proxy, or having their device evaluated by Microsoft Defender for Cloud Apps Cloud Discovery?",
    help: "This is the most-missed admin licensing question. Per Microsoft's Conditional Access licensing FAQ, every user TARGETED by a CA policy must have Entra ID P1 (or higher) assigned — and 'targeted' includes both included and effective scope. CONFIGURING a CA policy in the Entra portal is role-gated (Conditional Access Administrator) and does NOT require a license on the admin themselves, but if the admin's own account is in the policy's user/group scope, P1 is required. The same applies to SSPR with on-prem write-back (Hybrid Identity Administrator can configure, but the admin's own account using SSPR-writeback consumes P1), Application Proxy as a user (publisher is free, the connecting user is P1), and Cloud App Discovery on the admin's device. Security Defaults, basic per-user MFA (now Entra ID Free), cloud-only SSPR (cloud users on Entra ID Free), and Conditional Access POLICY CONFIGURATION are all FREE — they do not trigger this question. P2-tier features (PIM, Identity Protection sign-in risk policies with full remediation, Access Reviews) are covered by later questions.",
    helpLink: { label: "See the full admin capability map (what's free vs P1 vs P2)", target: "info_admin_capability_map" },
    rationale: {
      why: "Microsoft's Conditional Access licensing FAQ ('Conditional Access licensing fundamentals') is explicit: 'Conditional Access requires Microsoft Entra ID P1 licenses for every user in scope of a Conditional Access policy.' The Entra ID Free vs P1 vs P2 comparison page (and the m365maps Entra ID P1 map) confirm P1 includes Conditional Access, Application Proxy, advanced group management, SSPR with write-back, and Cloud App Discovery as P1-AUDIENCE features. P2 layers PIM, Identity Protection, and Access Reviews on top — those are caught by later questions. Security Defaults, basic MFA enforcement, and cloud-user SSPR are now in Entra ID Free per the 2024+ licensing changes (security defaults are tenant-wide and free; MFA via Authenticator is free; cloud SSPR is free).",
      yes: "the admin needs Microsoft Entra ID P1 on their own account (standalone, or via any plan that includes P1 — M365 E3, E5, Business Premium, A3, A5, G3, G5, Entra ID P1 standalone). Same rule for every other user in scope of those policies — license them separately.",
      no: "no P1-audience trigger for the admin themselves — they can stay on Entra ID Free unless a later premium-tier trigger fires. Free tier still covers Security Defaults, basic per-user MFA, cloud-user SSPR, CA policy CONFIGURATION (role-gated), Entra Connect Cloud Sync, B2B guest invitations, and basic reporting. We continue walking the tree."
    },
    examples: [
      "Yes example (CA target): Tenant has a Conditional Access policy 'All admins must use phishing-resistant MFA' that includes the Global Administrators role group. The admin's account holds GA, so they're in scope — P1 required.",
      "Yes example (SSPR write-back): Admin's cloud account is synced from on-prem AD via Entra Connect, and SSPR is configured to write password changes back to AD. P1 required on the admin's account for the write-back path.",
      "Yes example (Application Proxy): Admin connects to an on-prem SCCM console published through Entra Application Proxy — the connecting user (the admin) needs P1.",
      "Yes example (Cloud Discovery): Admin's managed laptop reports shadow-IT app usage via the Defender for Cloud Apps Cloud Discovery integration — that data attribution requires P1 on the admin.",
      "No example (CA config only): Admin authors and tunes Conditional Access policies for 5,000 users in the Entra portal under the Conditional Access Administrator role, but is explicitly excluded from every CA policy themselves (break-glass-style exclusion). No P1 needed on the admin's account.",
      "No example (Security Defaults): Tenant uses Security Defaults (free, tenant-wide) — the admin is forced to enroll in Authenticator-based MFA but Security Defaults itself is Entra ID Free, not P1.",
      "No example (cloud SSPR): Admin's account is cloud-only (no on-prem AD), and SSPR resets the cloud password — that's Entra ID Free.",
      "No example (basic MFA): Admin uses Authenticator push for MFA via the per-user MFA legacy enforcement or via Security Defaults — neither requires P1."
    ],
    techDocs: [
      ["Conditional Access licensing fundamentals (per-user-in-scope rule)", "https://learn.microsoft.com/entra/identity/conditional-access/overview#license-requirements"],
      ["Microsoft Entra plans & pricing (Free vs P1 vs P2 feature matrix)", "https://www.microsoft.com/security/business/microsoft-entra-pricing"],
      ["Microsoft Entra ID Free, P1, P2 feature comparison", "https://learn.microsoft.com/entra/fundamentals/whatis"],
      ["What is Entra ID P1 — included features", "https://learn.microsoft.com/entra/fundamentals/concept-fundamentals-licensing"],
      ["SSPR licensing — cloud users free, write-back needs P1", "https://learn.microsoft.com/entra/identity/authentication/concept-sspr-licensing"],
      ["Application Proxy licensing — connecting users need P1", "https://learn.microsoft.com/entra/identity/app-proxy/overview-what-is-app-proxy"],
      ["Security Defaults — Entra ID Free, tenant-wide", "https://learn.microsoft.com/entra/fundamentals/security-defaults"],
      ["Microsoft Authenticator MFA — free with Entra ID Free", "https://learn.microsoft.com/entra/identity/authentication/concept-mfa-licensing"],
      ["M365 Maps — Microsoft Entra ID P1 visual map", "https://m365maps.com/Microsoft%20Entra%20ID%20P1.htm"],
      ["M365 Maps — Microsoft Entra ID Free vs P1 vs P2", "https://m365maps.com/files/Microsoft-365-and-Office-365-Plans.htm"]
    ],
    yes: "result_entra_id_p1_admin",
    no: "q_copilot"
  },
  q_copilot: {
    step: { major: 3, sub: 2, subTotal: 6, label: "Premium service features" },
    question: "Will the privileged admin themselves USE Microsoft 365 Copilot — i.e., invoke Copilot in Word / Excel / PowerPoint / Outlook / Teams, run Microsoft 365 Copilot Chat work-based prompts (Entra-authenticated, tenant-grounded), build tenant-grounded Copilot Studio agents, or be assigned Microsoft Agent 365 governance for their own agent identities?",
    help: "M365 Copilot is one of the few admin scenarios where the per-user license is enforced on the admin's own account. Copilot in M365 apps and Copilot Chat work mode check for the M365 Copilot SKU on the signed-in user; without the license assigned, the admin sees only web-grounded Copilot Chat (free tier). Pure portal administration of Copilot deployment in the M365 admin center does NOT require Copilot on the admin — only actually using Copilot does. Note: Microsoft Security Copilot is a separate product on a different licensing model (SCU capacity, not per-user) — see the SOC-Copilot info card under Defender.",
    rationale: {
      why: "The M365 Copilot licensing page lists it as a per-user add-on whose assignment unlocks Copilot in apps and Copilot Chat work mode. The Copilot License Details diagnostic checks for the per-user assignment. Agent 365 is similarly a per-user governance SKU under the Entra ID Governance umbrella. Security Copilot, by contrast, is SCU-based and gated by role (Copilot owner / contributor) — the admin needs the role, not a per-user license, and tenant SCUs cover usage.",
      yes: "the admin needs M365 Copilot per-user, OR M365 E7 (which bundles Copilot + Entra Suite + Agent 365 on E5). If Agent 365 governance is also needed, see Agent 365 separately.",
      no: "no per-user Copilot / Agent 365 trigger for the admin themselves. Note: every USER who runs M365 Copilot still needs the add-on — license them separately. Security Copilot for SOC use cases uses SCUs at the tenant, no per-user license required."
    },
    examples: [
      "Yes example: The admin opens Copilot Chat in Teams, drafts an email with Copilot in Outlook, or chats with a Copilot Studio agent grounded in tenant SharePoint content under their admin identity.",
      "Yes example (Agent 365): The admin owns / sponsors an agent identity governed via Entra ID Governance + Agent 365 SKU.",
      "No example: The admin only manages Copilot rollout (license assignment, governance policies, restricted SharePoint sites) in the M365 admin center but never invokes Copilot themselves.",
      "No example (Security Copilot): The admin runs SOC investigations in the Security Copilot standalone or embedded experience under a Copilot role — covered by tenant SCU capacity, no per-user license required."
    ],
    techDocs: [
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Copilot License Details diagnostic", "https://aka.ms/CopilotLicenseDetails"],
      ["Security Copilot FAQ — SCU pricing model", "https://learn.microsoft.com/copilot/security/faq-security-copilot#how-is-security-copilot-priced"],
      ["Microsoft Agent 365 licensing", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals"],
      ["M365 E7 announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"]
    ],
    yes: "q_copilot_e7_choice",
    no: "q_purview_e5"
  },
  q_purview_e5: {
    step: { major: 3, sub: 3, subTotal: 6, label: "Premium service features" },
    question: "Is the privileged admin themselves IN SCOPE — as a monitored user or test user — of any Microsoft Purview E5-tier policy (Insider Risk Management, Communication Compliance, Adaptive Protection, endpoint DLP, premium eDiscovery, auto-labeling, Records Management, Customer Lockbox, Customer Key, Information Barriers, Privileged Access Management for Office, or Audit Premium)?",
    help: "Important distinction: opening the Purview portal to manage policies / triage alerts / investigate incidents does NOT require a per-user license on the admin — that's gated by role-group permissions (Insider Risk Management, eDiscovery Manager, Compliance Administrator, etc.). The per-user E5 / E5 Compliance / Purview Suite license is only required for users whose activity is being monitored or whose mailbox / device / chat is being protected — including the admin if they're added as a test user in policy scope.",
    rationale: {
      why: "The Microsoft Purview service description is explicit: 'Any user benefiting from the service requires a license' and lists 'users with a Purview role assigned for use in the Microsoft Purview portal' alongside 'Exchange user mailboxes, OneDrive accounts, Teams chats, and devices' as the licensable population. An admin who only manages policies / alerts / incidents via a Purview role does not benefit from the policy itself — the users in scope do. A test-user admin DOES benefit (their activity is monitored) and is licensable.",
      yes: "the admin is in scope of an E5-tier Purview policy as a monitored / test user — they must be licensed at M365 E5, E5 Compliance, or the Purview Suite, same as every other in-scope user.",
      no: "no Purview E5 licensing trigger for the admin themselves. Note: every USER whose activity, mailbox, device, or chats are protected by the policy still needs a license — license them separately. We continue to Defender XDR."
    },
    examples: [
      "Yes example: The admin account is added as a test user inside an Insider Risk Management policy, or is in the user scope of an endpoint DLP policy that monitors their device.",
      "No example: The admin opens the Purview portal under the 'Insider Risk Management' role group to triage alerts, manage incidents, and tune policies, but is NOT included in any policy's monitored-user scope."
    ],
    breakdownIntro: "Microsoft Purview E5 is an umbrella of ~12 features with different scoping models. Expand each row to see how that feature is scoped (per-user, per-mailbox, or tenant-wide configuration), what 'in scope' means in plain language, an example, and the Microsoft source. Answer Yes below if THIS user is in scope of at least ONE of these features as a monitored / test / protected user. Starred (*) cards are tenant-wide and not scopeable \u2014 they are informational only and do not count toward 'at least one applies'; expand them for Microsoft's two official statements (SFI and Product Terms) and decide the licence call for those features separately.",
    productBreakdown: [
      {
        name: "Insider Risk Management (IRM)",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Configurable per-user scope. Each IRM policy targets a defined set of users; only users included in at least one IRM policy's user scope need the license.",
        inScopeMeans: "this user (or their device) is included in the user / device scope of an IRM policy — either as a monitored user, a test user during pilot, or via a Priority User Group.",
        notInScopeMeans: "this user only OPERATES IRM (via the Insider Risk Management role group) — triaging alerts, tuning policies, investigating cases — without being inside any policy's monitored scope.",
        examples: [
          "Yes: The admin's own account is added as a test user inside a Data Theft IRM policy during pilot.",
          "No: The IRM analyst manages alerts for 5,000 monitored users but their own account is excluded from every IRM policy scope."
        ],
        docs: [
          ["IRM — subscriptions and licensing", "https://learn.microsoft.com/purview/insider-risk-management-configure#subscriptions-and-licensing"],
          ["IRM — get started / policy scope", "https://learn.microsoft.com/purview/insider-risk-management-policies"]
        ]
      },
      {
        name: "Communication Compliance",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Configurable per-user scope. Each Communication Compliance policy explicitly targets users / groups whose Exchange / Teams / Yammer communications will be reviewed.",
        inScopeMeans: "this user is in the 'Users and groups to supervise' scope of a Communication Compliance policy.",
        notInScopeMeans: "this user only acts as a reviewer / investigator via the Communication Compliance role group, and is not themselves a supervised user.",
        examples: [
          "Yes: The admin is included in a Communication Compliance policy that scans their Teams chats for harassment keywords.",
          "No: HR Compliance reviewer triages flagged messages for monitored employees but is not themselves supervised."
        ],
        docs: [
          ["Communication Compliance — get started", "https://learn.microsoft.com/purview/communication-compliance-configure"],
          ["Communication Compliance licensing", "https://learn.microsoft.com/purview/communication-compliance-solution-overview#subscriptions-and-licensing"]
        ]
      },
      {
        name: "Adaptive Protection",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user. Adaptive Protection sits on top of Insider Risk Management — it reads each in-scope IRM user's risk level (Minor / Moderate / Elevated) and dynamically tightens DLP rules or Conditional Access conditions for users whose risk has risen. Because it consumes IRM signals, it requires the same E5-tier Purview licence that IRM does on every user it evaluates. Adaptive Protection adds NO independent licence requirement beyond IRM — if the user is already in scope of IRM (and therefore licensed for E5-tier Purview), they are covered for Adaptive Protection too.",
        inScopeMeans: "this user is an in-scope IRM user (in at least one IRM policy's user scope) AND the tenant has Adaptive Protection enabled, so their IRM risk level drives downstream DLP or Conditional Access enforcement on them.",
        notInScopeMeans: "either (a) this user is excluded from every IRM policy scope (so Adaptive Protection never assigns them a risk level), OR (b) the tenant has not enabled Adaptive Protection at all. In either case, Adaptive Protection adds no E5-tier licence trigger for this user separate from the IRM call.",
        examples: [
          "Yes (licensed correctly): This user already holds M365 E5 and is in scope of an IRM data-theft policy. Adaptive Protection raises them to 'Elevated' risk and a DLP rule blocks USB egress from their endpoint. The same E5-tier IRM licence covers this.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 but is included in the user scope of an IRM policy with Adaptive Protection on. Adaptive Protection (and IRM itself) require an E5-tier licence — assign M365 E5 / E5 Compliance / Purview Suite to this user.",
          "No: This user is excluded from every IRM policy scope; Adaptive Protection never evaluates them. No E5-tier uplift triggered by Adaptive Protection.",
          "No: The tenant has not enabled Adaptive Protection (no Adaptive Protection conditions exist in DLP / CA). Adaptive Protection is not a licensing trigger for any user."
        ],
        docs: [
          ["Adaptive Protection overview", "https://learn.microsoft.com/purview/insider-risk-management-adaptive-protection"],
          ["Purview service description — Insider Risk Management licensing", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-insider-risk-management"]
        ]
      },
      {
        name: "Endpoint DLP",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-device",
        scopeNote: "Per-device licence assigned via the user signed in. Endpoint DLP policies target devices but enforce per-user — every user signing into an onboarded device whose activity is evaluated needs an E5-tier licence.",
        inScopeMeans: "this user signs into an Endpoint-DLP-onboarded device that has an active DLP policy applied to their account / location.",
        notInScopeMeans: "this user only configures Endpoint DLP policies in Purview, and their own workstation is not onboarded.",
        examples: [
          "Yes: The admin's laptop is onboarded for Endpoint DLP and a 'block USB copy of sensitive files' policy targets their account.",
          "No: The DLP admin manages Endpoint DLP policies that target 10,000 other devices; their own workstation is not onboarded."
        ],
        docs: [
          ["Endpoint DLP — get started", "https://learn.microsoft.com/purview/endpoint-dlp-getting-started"],
          ["DLP licensing requirements", "https://learn.microsoft.com/purview/dlp-microsoft-teams#licensing-requirements"]
        ]
      },
      {
        name: "Premium eDiscovery (eDiscovery Premium)",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user — required on BOTH (a) custodians whose Exchange mailbox / OneDrive / SharePoint site / Teams chat is preserved, collected, or reviewed in a Premium case, AND (b) eDiscovery users who actually run Premium-tier workflows (custodian management, legal-hold notifications, review sets, advanced indexing, analytics, predictive coding / TAR, Premium search of Copilot interactions). Standard-tier eDiscovery — case creation, basic search, basic legal hold, export — is already covered by E3 / A3 / G3 and does NOT trigger a Premium SKU on this user.",
        inScopeMeans: "this user is either (a) named as a custodian on a Premium eDiscovery case, OR (b) owns / is a member of an Exchange mailbox / SharePoint site / Teams channel that is on hold or whose content is included in a Premium case's Search, Collection, or Review set, OR (c) personally performs any Premium-tier eDiscovery activity (review sets, predictive coding, advanced indexing, legal-hold notification workflow, Premium search of Copilot interactions).",
        notInScopeMeans: "this user is NOT a custodian on any Premium case, NONE of their content is on hold or included in a Premium Search / Collection / Review set, AND they personally only perform Standard-tier eDiscovery activities (case creation, basic search, basic legal hold, export). Standard-tier work is already covered by their existing E3 / A3 / G3 — no Premium SKU is added on their account.",
        examples: [
          "Yes: This user is named as a custodian on an active Premium eDiscovery case (their mailbox / OneDrive / Teams content is being preserved or reviewed).",
          "Yes: This user owns an Exchange mailbox or SharePoint site that's on hold or included in a Premium case's Search / Collection / Review set — even if they never touch the Purview portal.",
          "Yes: The eDiscovery Manager runs Review sets, Predictive coding (TAR), or Premium search of Copilot interactions.",
          "No: This user only runs Standard searches and basic legal holds (no Premium workflows), AND none of their own content is in scope of any Premium case.",
          "No: This user has an Exchange mailbox in the tenant but is not a custodian on any Premium case and their content is not included in any Premium Search / Collection / Review set."
        ],
        docs: [
          ["Purview service description — eDiscovery licensing", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-ediscovery"],
          ["eDiscovery solutions and Standard vs Premium comparison", "https://learn.microsoft.com/purview/ediscovery"],
          ["New unified eDiscovery experience (Purview portal)", "https://learn.microsoft.com/purview/edisc"]
        ]
      },
      {
        name: "Auto-labeling (sensitivity & retention)",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user. Automatic application of labels — whether sensitivity labels driven by SITs / trainable classifiers, or retention labels driven by SITs / classifiers / adaptive policy scopes — requires an E5-tier licence on every user whose content is scanned and labelled. Both the SERVICE-SIDE policy run (Exchange / OneDrive / SharePoint mailbox-and-site crawl) and the CLIENT-SIDE recommend / automatic mode in Office apps count as auto-labelling.",
        inScopeMeans: "any one of the following applies to this user: (a) a service-side auto-labelling policy is configured to scan their Exchange mailbox / OneDrive / SharePoint site and apply sensitivity labels, (b) a retention-label policy is configured to auto-apply retention labels to their content (via SIT, trainable classifier, or adaptive policy scope), or (c) they use the client-side automatic / recommended-label mode of sensitivity labelling in Office apps.",
        notInScopeMeans: "this user is not in scope of any auto-labelling policy — no sensitivity-label auto-policy targets their mailbox / OneDrive / SharePoint site, no retention-label auto-apply policy targets their content, and they only apply labels manually (picking a label themselves in Word / Outlook / OneDrive / SharePoint, or having an admin manually tag a document).",
        examples: [
          "Yes: A service-side auto-labelling policy scans this user's OneDrive and auto-applies 'Confidential' to files matching a PII pattern.",
          "Yes: An auto-apply retention-label policy uses a trainable classifier to tag this user's contracts in SharePoint with a '7-year contract' label.",
          "Yes: This user has the Office apps configured to automatically recommend / apply sensitivity labels based on content inspection.",
          "No: This user only picks sensitivity labels manually from the Office app label picker; no auto-policy scans or labels their content.",
          "No: An admin applies retention labels to a specific SharePoint library by hand; no auto-apply policy is configured against this user's locations."
        ],
        docs: [
          ["Apply a sensitivity label automatically", "https://learn.microsoft.com/purview/apply-sensitivity-label-automatically"],
          ["Auto-apply retention labels", "https://learn.microsoft.com/purview/retention-label-flow"],
          ["Purview service description — sensitivity labelling licensing", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-information-protection-sensitivity-labeling"]
        ]
      },
      {
        name: "Records Management",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user, per Microsoft Product Terms. The Microsoft Purview service description (Data Lifecycle & Records Management) splits retention into two licence tiers. E3 / A3 / G3 / F1 / F3 / Business Premium ALREADY grant the right to be in scope of: plain retain-or-delete retention POLICIES (org-wide or location-wide), retention LABEL creation, and label PUBLISHING / manual application. An E5-tier licence (M365 E5, E5 Compliance, Purview Suite, or the Information Protection & Governance add-on) is required ONLY for users who benefit from the records-management label settings — declaring items as records (or regulatory records), event-based retention, auto-relabel-at-end-of-period, disposition review, file-plan management, Priority cleanup, or adaptive-scope retention policies. 'Benefit' also covers Purview-portal roles: Records Management, Retention Management, Disposition Management, and the View-Only variants. SharePoint site VISITORS do NOT benefit and do NOT need a licence.",
        inScopeMeans: "any one of the following applies to this user: (a) a retention label that DECLARES items as records (or regulatory records) is applied to their Exchange mailbox / OneDrive / SharePoint / Teams content, (b) an EVENT-BASED retention label, an AUTO-RELABEL-at-end-of-period label, or a label that triggers DISPOSITION REVIEW is applied to their content, (c) they hold a Records-Management-tier role in the Purview portal (Records Management, Retention Management, Disposition Management, View-Only Records Management, View-Only Retention Management), (d) they personally sit on a disposition review (named reviewer), OR (e) they are an OWNER or MEMBER of a SharePoint site or Microsoft 365 Group that uses file-plan management, Priority cleanup, an adaptive-scope retention policy, or any record-declaring label policy.",
        notInScopeMeans: "this user's content is only under plain retain-or-delete behaviour — an org-wide / location-wide retention policy, or a published retention label that simply keeps / deletes content after a fixed period. No record (or regulatory-record) declaration, no event-based retention, no auto-relabel, no disposition review on their content, no file-plan / Priority-cleanup / adaptive-scope policy targets them. They do not personally hold a Records-Management-tier role, and they are not a named disposition reviewer. (SharePoint site VISITORS on a site that DOES use these features are also out of scope — visitors do not benefit and do not need a licence.)",
        examples: [
          "Yes (licensed correctly): This user already holds M365 E5; a 'Contract – 7-year Record' label that declares items as records is applied to their OneDrive. No uplift needed — E5 grants the right to be in scope.",
          "Yes (under-licensed — needs uplift): This user only holds M365 E3 and is named as a Disposition Reviewer in Purview. Microsoft Product Terms require an E5-tier licence for that role — assign M365 E5 / E5 Compliance / Purview Suite to this user.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 and owns a SharePoint site whose library has an EVENT-BASED retention label (e.g. tied to an 'employee-departure' event) applied to documents. Per the service description, site owners and members benefiting from E5-only label settings need an E5-tier licence.",
          "No (E3 already covers it): This user holds M365 E3 and is only under a retention POLICY that keeps Exchange items for 3 years then deletes them — no labels, no record declaration. E3 grants the right to be in scope of plain retention policies; no uplift needed.",
          "No (E3 already covers it): This user holds M365 E3; a published 'Keep for 5 years then delete' retention label is applied to their SharePoint library. The label does not declare items as records, is not event-based, and triggers no disposition review. E3 grants the right to be in scope of label publishing / manual apply; no uplift needed.",
          "No (visitor — does not benefit): This user has no Records-Management-tier licence and is only a VISITOR on a SharePoint site that uses record-declaring labels. Per the Purview service description, site visitors do not benefit from the service and do not need an E5-tier licence."
        ],
        docs: [
          ["Records Management overview", "https://learn.microsoft.com/purview/records-management"],
          ["Disposition of content", "https://learn.microsoft.com/purview/disposition"],
          ["Limits for retention policies and retention label policies", "https://learn.microsoft.com/purview/retention-limits"],
          ["Purview service description — Data Lifecycle & Records Management licensing (E3 vs E5 split)", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-data-lifecycle--records-management"],
          ["Microsoft Product Terms", "https://www.microsoft.com/licensing/terms/"]
        ]
      },
      {
        name: "Customer Lockbox",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Technically tenant-wide and not scopeable. Customer Lockbox is a single tenant toggle and the approval workflow applies to every Microsoft engineer support request that could touch any mailbox / SharePoint / OneDrive / Teams content in the tenant. Microsoft Product Terms still require an E5-tier licence (M365 E5, E5 Compliance, Purview Suite, or the Information Protection & Compliance add-on) for every user whose data could be subject to such a request \u2014 in practice every active mailbox / OneDrive in the tenant. Microsoft's Secure Future Initiative (Protect Tenants and Isolate Production Systems pillar) recommends enabling Customer Lockbox so that no Microsoft engineer can access tenant content without explicit customer approval.",
        inScopeMeans: "Customer Lockbox is enabled tenant-wide and this user has a mailbox / OneDrive / SharePoint footprint that a Microsoft engineer could need to access during a support case.",
        notInScopeMeans: "Customer Lockbox is disabled tenant-wide.",
        examples: [
          "Yes: Customer Lockbox is enabled; the admin's mailbox could be subject to a Microsoft access request requiring tenant-admin approval.",
          "No: The tenant has not enabled Customer Lockbox."
        ],
        docs: [
          ["Customer Lockbox in Microsoft 365", "https://learn.microsoft.com/purview/customer-lockbox-requests"],
          ["Microsoft Purview service description \u2014 Customer Lockbox", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-customer-lockbox"],
          ["Microsoft Product Terms", "https://www.microsoft.com/licensing/terms/"],
          ["Microsoft Secure Future Initiative (SFI)", "https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative"]
        ]
      },
      {
        name: "Customer Key",
        sku: "M365 E5 + Customer Key add-on",
        scope: "tenant-wide-not-scopeable",
        scopeNote: "Technically tenant-wide and not scopeable. Once enabled with customer-provided RSA / availability keys, the Customer Key data-encryption policy re-encrypts every mailbox / file / chat across Exchange Online / SharePoint / OneDrive / Teams under those keys. Microsoft's Customer Key documentation states verbatim that \u201Ceach mailbox must meet licensing requirements to use Customer Key,\u201D so Microsoft Product Terms require a per-user E5-tier licence (M365 E5 + Customer Key add-on, or equivalent) for every user whose data is encrypted. Microsoft's Secure Future Initiative (Protect Tenants and Isolate Production Systems pillar) supports customer-controlled encryption keys as a defence-in-depth measure on top of Microsoft-managed encryption.",
        inScopeMeans: "the tenant has assigned a Customer Key data-encryption policy that covers this user's mailbox / files / chats.",
        notInScopeMeans: "the tenant uses Microsoft-managed keys only (the default).",
        examples: [
          "Yes: The tenant has provisioned Customer Key with HSM-backed RSA keys; the admin's mailbox is encrypted under those keys.",
          "No: The tenant has never enabled Customer Key."
        ],
        docs: [
          ["Customer Key overview", "https://learn.microsoft.com/purview/customer-key-overview"],
          ["Microsoft Purview service description \u2014 Customer Key", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-customer-key"],
          ["Microsoft Product Terms", "https://www.microsoft.com/licensing/terms/"],
          ["Microsoft Secure Future Initiative (SFI)", "https://www.microsoft.com/en-us/trust-center/security/secure-future-initiative"]
        ]
      },
      {
        name: "Information Barriers",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user. Information Barriers (IB) restrict who can communicate / collaborate with whom across Teams / SharePoint / OneDrive / Exchange. The Microsoft Purview service description states that 'users belonging to segments defined under Assigned Segments require licenses.' This is a true per-user trigger — only users who are ASSIGNED to a segment need the E5-tier licence, no matter how many segments the tenant has defined. Defining segments alone is a tenant-level configuration step and does not licence anyone; ASSIGNMENT is the licensable event.",
        inScopeMeans: "this user is assigned to an Information Barriers segment and is therefore subject to enforced communication / collaboration restrictions with users in incompatible segments.",
        notInScopeMeans: "Information Barriers segments may exist in the tenant, but this user is NOT assigned to any segment — they sit outside the segmented population (e.g. they're an IB admin who only configures policies, or they're an employee whose role is not walled-off). No restriction is enforced against them, so they do not benefit from the service and the per-user IB licence is not triggered on them.",
        examples: [
          "Yes (licensed correctly): This user already holds M365 E5 and is assigned to the 'Research' segment, blocking chats with users in 'Sales'.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 only but is assigned to the 'Investment Banking' segment for regulatory wall-off purposes. Segment assignment requires an E5-tier licence — assign M365 E5 / E5 Compliance / Purview Suite to this user.",
          "No: This user only manages Information Barriers policies via the IB admin role and is not themselves assigned to any segment. No IB licence trigger.",
          "No: The tenant has not defined any Information Barriers segments at all. No user is in scope and no IB licence question arises for anyone."
        ],
        docs: [
          ["Information Barriers overview", "https://learn.microsoft.com/purview/information-barriers"],
          ["Purview service description — Information Barriers", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-information-barriers"]
        ]
      },
      {
        name: "Privileged Access Management for Office (PAM)",
        sku: "M365 E5 / E5 Compliance / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user — both REQUESTORS and APPROVERS. PAM for Office gates just-in-time approval for high-risk Exchange Online / Office 365 tasks (mailbox export, journaling, certain transport-rule and DLP-policy changes, etc.). Enabling PAM for Office is a tenant prerequisite; once enabled, every user who can REQUEST a PAM-gated task and every user who APPROVES one (member of a PAM approver group) needs an E5-tier Purview licence. IMPORTANT: PAM for Office is a DIFFERENT feature from Entra Privileged Identity Management (PIM). Entra PIM gates Entra / Azure RBAC role activation and is licensed under Entra ID P2 — do NOT count Entra PIM usage as a PAM-for-Office trigger here.",
        inScopeMeans: "the tenant has enabled PAM for Office AND this user is either (a) an admin / role-holder REQUIRED to go through a PAM JIT approval to perform their privileged Exchange / O365 tasks, OR (b) a member of a PAM APPROVER group who reviews and approves those requests.",
        notInScopeMeans: "either (a) the tenant has not enabled PAM for Office (no PAM JIT workflow exists for any Exchange / O365 task — in which case no user is licensable on PAM grounds), OR (b) PAM is enabled but this specific user neither requests nor approves any PAM-gated task. Holding non-PAM-gated Exchange admin rights, or using Entra PIM only, does not put this user in scope of PAM for Office.",
        examples: [
          "Yes (licensed correctly): This user already holds M365 E5; PAM for Office is enabled and they must request JIT activation to run New-MailboxExportRequest.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 and is a member of the 'PAM Approvers' group reviewing JIT requests for Exchange admin tasks. Both requestors and approvers need an E5-tier licence — assign M365 E5 / E5 Compliance / Purview Suite to this user.",
          "No: The tenant has not enabled PAM for Office; no PAM JIT workflow exists for any Exchange / O365 task. PAM is not a licence trigger for any user.",
          "No: This user holds permanent Exchange admin rights and performs no PAM-gated tasks (and is not a PAM approver). PAM for Office does not trigger an E5-tier requirement on them.",
          "No (different feature): This user activates Entra roles via Entra PIM only — that is licensed under Entra ID P2, not under E5 Compliance / PAM for Office. Do not record this as a PAM trigger."
        ],
        docs: [
          ["Privileged Access Management for Office 365", "https://learn.microsoft.com/purview/privileged-access-management"],
          ["PAM for Office vs Entra PIM — differences", "https://learn.microsoft.com/purview/privileged-access-management-overview"]
        ]
      },
      {
        name: "Audit (Premium)",
        sku: "M365 E5 / E5 Compliance / E5 eDiscovery & Audit / Purview Suite",
        scope: "per-user",
        scopeNote: "Per-user, per Microsoft Product Terms — with a tenant-level enablement step that does NOT license anyone on its own. Audit (Premium) is 'enabled at the tenant level for all users that benefit from the service' by default, but the Microsoft Purview service description states verbatim that '1-year retention of audit logs and the auditing of crucial events only apply to users with the appropriate license' and that '10-year retention of audit logs only applies to users with the appropriate add-on license.' Premium gives you (a) the crucial events MailItemsAccessed (mailbox accessed / read), Send, SearchQueryInitiated, MessageBind, and the broader high-value-event set used in IR / forensic investigations, plus (b) 1-year audit retention by default (10 years with the Audit add-on). Standard audit — sign-ins, admin actions, and a baseline set of mailbox / SharePoint / Teams activity at 180-day retention — comes with E3 / A3 / G3 / F3 / Business Premium and the equivalent Office 365 SKUs. An UNLICENSED user (no M365 / O365 mailbox SKU at all) generates only limited Entra-level audit signals regardless of what the tenant holds, because the high-value events are workload-bound (Exchange / SharePoint) and need a mailbox / OneDrive licence to even exist.",
        inScopeMeans: "this user's role or regulatory context requires either (a) the high-value Premium events — e.g. MailItemsAccessed to detect a mailbox compromise on an executive / finance / admin account, SearchQueryInitiated for insider-investigation lookbacks, Send / MessageBind for outbound-exfil review — OR (b) audit-log retention beyond 180 days (annual regulatory audit, multi-quarter incident lookback, legal-hold-style retention of audit records).",
        notInScopeMeans: "this user's investigative / compliance needs are met by Standard audit signals (sign-ins, admin actions, baseline mailbox / SharePoint / Teams activity) at 180-day retention. They are not the subject of a regulatory or forensic requirement that depends on the high-value Premium events or on multi-year audit retention.",
        examples: [
          "Yes (licensed correctly): This user already holds M365 E5; the security team relies on MailItemsAccessed to investigate any mailbox compromise on this executive account. No uplift needed — E5 grants the right to Premium events and 1-year retention.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 only, but they are a finance executive whose mailbox MUST have MailItemsAccessed recorded for fraud investigation. Standard audit on E3 does NOT record MailItemsAccessed — assign M365 E5 / E5 Compliance / E5 eDiscovery & Audit / Purview Suite to this user.",
          "Yes (under-licensed — needs uplift): This user holds M365 E3 but is in scope of a regulatory regime that requires audit retention longer than 180 days. Standard audit caps at 180 days — uplift to an E5-tier licence (and optionally the 10-year Audit add-on) for this user.",
          "No (current licence already covers it): This user holds M365 E3 and only needs sign-in history and admin-action history at 180-day retention for routine troubleshooting. Standard audit on E3 covers this; no uplift needed.",
          "No (current licence already covers it): This user holds M365 E3, has no high-value-target profile, and is not in scope of any forensic / regulatory requirement that depends on MailItemsAccessed or multi-year retention. Standard audit suffices.",
          "No (tenant-vs-user note — unlicensed user): This user has NO M365 / O365 mailbox SKU (e.g. an Entra-only account with no Exchange mailbox). Even though the tenant has Audit (Premium) enabled tenant-wide for its licensed users, this account has no Exchange footprint to generate MailItemsAccessed and gets only baseline Entra audit. No Audit (Premium) uplift on this user is meaningful — give them a mailbox SKU first, then revisit whether Premium audit is warranted."
        ],
        docs: [
          ["Audit (Premium)", "https://learn.microsoft.com/purview/audit-premium"],
          ["Audit log retention policies", "https://learn.microsoft.com/purview/audit-log-retention-policies"],
          ["Crucial events for investigations (MailItemsAccessed, Send, SearchQueryInitiated)", "https://learn.microsoft.com/purview/audit-premium#crucial-events-for-investigations"],
          ["Purview service description — Audit (Standard) and Audit (Premium)", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-audit-premium"],
          ["Microsoft Product Terms", "https://www.microsoft.com/licensing/terms/"]
        ]
      }
    ],
    techDocs: [
      ["Microsoft Purview service description — which users need a license", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#which-users-need-a-license"],
      ["Insider Risk Management — permissions vs. licensing", "https://learn.microsoft.com/purview/insider-risk-management-configure#subscriptions-and-licensing"],
      ["Purview eDiscovery licensing (custodians AND eDiscovery users)", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-ediscovery"],
      ["Audit (Premium)", "https://learn.microsoft.com/purview/audit-premium"]
    ],
    yes: "q_purview_e5_breadth",
    no: "q_defender"
  },
  q_defender: {
    step: { major: 3, sub: 4, subTotal: 6, label: "Premium service features" },
    title: "Check whether the admin is personally protected by any Defender Suite component",
    question:
      "Is the admin's own mailbox, device, or identity covered by a Microsoft Defender for Office 365 P2, Defender for Endpoint P2, Defender for Identity, or Defender for Cloud Apps policy?",
    sub: "Operating the Microsoft Defender portal as a SOC role is not a licence trigger. The trigger is whether the admin's own asset is one of the protected ones.",
    help:
      "Microsoft licenses the Defender Suite per protected mailbox, device, and identity. Opening security.microsoft.com to triage incidents, run advanced hunting, manage alerts, or operate Microsoft Sentinel under a Security Reader / Security Operator / Security Admin / Global Reader role does not by itself require a per-user Defender licence on the admin. The licence is required for each user, mailbox, or device that is actually receiving protection from the workload.",
    paragraphs: [
      "The Microsoft Defender Suite is an umbrella over four component workloads — Defender for Office 365, Defender for Endpoint, Defender for Identity, and Defender for Cloud Apps — plus the Microsoft Defender XDR correlation and incident layer. Each component has its own licensing dimension (per-mailbox, per-user, per-device, or tenant-level) and its own Service Description in Microsoft's Product Terms. The bundles that include all of them are Microsoft 365 E5, Microsoft 365 E5 Security, the Microsoft Defender Suite add-on (sometimes listed as the 'Defender for Customer-Year Engagement' bundle), Office 365 E5 + EMS E5 (overlapping coverage), or Microsoft 365 E7 (Frontier Suite, generally available since May 1, 2026) which bundles E5 + Copilot + Entra Suite + Agent 365.",
      "Important: portal operation and protection are licensed separately. Microsoft's Defender XDR licensing documentation is explicit that role-based access (Security Reader, Security Operator, Security Administrator, Global Reader, Compliance Administrator) controls what the admin can see and do in the portal, while per-mailbox / per-user / per-device assignment controls what is actually being protected. A SOC analyst with Security Operator role can investigate alerts for 50,000 mailboxes without holding a Defender for Office 365 P2 licence themselves, as long as their own mailbox is not also being protected.",
      "If the admin runs a normal day-job mailbox (Exchange Online), uses a managed Windows / macOS / iOS / Android device that is enrolled in Defender for Endpoint, and signs in with an Entra-synced identity that Defender for Identity monitors, then they are personally a protected user on top of being a portal operator — and Microsoft requires every protected user to be licensed. The mini-cards below walk through each component so you can answer Yes if at least one applies to the admin themselves.",
      "Microsoft Sentinel is intentionally out of the mini-card grid. Sentinel is licensed by Log Analytics workspace data-ingestion (per-GB or Commitment Tier), not per user. Operating Sentinel as a SOC analyst — even Sentinel-only customers — never creates a per-user Defender Suite licence requirement on the admin. It is referenced in the footnotes for completeness."
    ],
    rationale: {
      why:
        "The Microsoft Defender Service Descriptions license Defender for Endpoint, Defender for Identity, Defender for Cloud Apps, and Defender for Office 365 P2 per protected user / mailbox / device — not per portal operator. A SOC analyst can investigate incidents for thousands of users without needing a Defender Suite licence themselves, as long as their own mailbox / device / identity is not separately in scope of those protections.",
      yes:
        "The admin's own mailbox / device / identity is protected by at least one Defender Suite component, so they must be licensed at M365 E5, M365 E5 Security, the Defender Suite add-on, or M365 E7 — the same rule that applies to every other protected user.",
      no:
        "No Defender Suite trigger for the admin themselves; we continue to the Intune Suite questions. Every other user, mailbox, or device protected by these workloads still needs to be licensed individually — they're handled in their own profile journeys."
    },
    breakdownIntro:
      "The Microsoft Defender Suite is four components plus a correlation layer, and each component is scoped differently per Microsoft's official service descriptions: Defender for Office 365 P2 is tenant-wide but scopeable (policies default to all mailboxes; admins should scope Safe Links / Safe Attachments / anti-phish policies to licensed mailboxes only), Defender for Endpoint P2 is per-device (enrollment-based), Defender for Identity is tenant-wide and not scopeable (the sensor sees every account in the forest), Defender for Cloud Apps is tenant-wide but scopeable (Scoped Deployment lets you limit it), and Defender XDR is the correlation layer that lights up wherever any of the four components is licensed. Answer Yes to the umbrella question if at least one component covers the admin personally. Starred (*) cards are tenant-wide and not scopeable \u2014 they are informational only and do not count toward 'at least one applies'; expand them for Microsoft's two official statements (SFI and Product Terms) and decide the licence call for those features separately.",
    productBreakdown: DEFENDER_SUITE_MINI_CARDS,
    examples: [
      "Yes: the admin's mailbox is in scope of the Strict preset security policy and their laptop is onboarded to Defender for Endpoint — they need a Defender Suite-tier licence (E5 / E5 Security / Defender Suite add-on).",
      "No: a SOC analyst signs into the Defender portal as Security Operator to investigate incidents across the fleet, but their cloud-only admin account has no mailbox, no managed device, and no synced identity — no per-user Defender licence is required for that account."
    ],
    techDocs: [
      ["Microsoft Defender XDR", "https://learn.microsoft.com/defender-xdr/microsoft-365-defender"],
      ["Defender for Endpoint plans", "https://learn.microsoft.com/defender-endpoint/microsoft-defender-endpoint"],
      ["Microsoft Sentinel — per-GB ingestion model (not per-user)", "https://learn.microsoft.com/azure/sentinel/billing"],
      ["Microsoft Product Terms (Universal Licence Terms + Service-specific Terms)", "https://www.microsoft.com/licensing/terms/"]
    ],
    yes: "q_defender_breadth",
    no: "q_intune_suite"
  },
  q_intune_suite: {
    step: { major: 3, sub: 5, subTotal: 6, label: "Premium service features" },
    title: "Check whether the admin is personally in scope of any Intune Suite feature",
    question:
      "Will the admin act as a Remote Help HELPER, OR is their own device / account in scope of Endpoint Privilege Management, Microsoft Tunnel for MAM, Cloud PKI, Enterprise App Management, or Advanced Endpoint Analytics?",
    sub: "Operating the Intune admin center under an Intune Administrator role is not a license trigger. The trigger is whether the admin themselves is a helper / sharer, or their own device is in scope of one of the other five features.",
    help:
      "Unlike most admin portals, Remote Help is one of the few Microsoft portals that DOES enforce a per-user license check on the admin: Microsoft requires a Remote Help license assigned to BOTH the helper (admin) AND the sharer (end user) \u2014 this is one of the few admin scenarios where the admin's own account needs the add-on even though they aren't an end user of the protected workload. EPM, Tunnel for MAM, Cloud PKI, EAM, and Advanced Endpoint Analytics license the user / device being managed (not the admin who configures them), unless the admin's own device is also in scope.",
    paragraphs: [
      "The Microsoft Intune Suite is an umbrella over six advanced-capability add-ons: Endpoint Privilege Management (EPM), Remote Help, Microsoft Tunnel for MAM, Microsoft Cloud PKI, Enterprise App Management (EAM), and Advanced Endpoint Analytics. Every one of them requires Microsoft Intune Plan 1 or Plan 2 as the prerequisite BASE license \u2014 the Suite is layered on top, not a replacement. Five of the six are also sold as per-user standalone add-ons (EPM standalone, Remote Help standalone, Cloud PKI standalone, EAM standalone, Advanced Analytics standalone). Tunnel for MAM is the exception \u2014 it has no standalone SKU and is only sold as part of the Intune Suite.",
      "Base Intune itself (Plan 1, included in Microsoft 365 E3 / E5 / E7 / Business Premium / EMS E3 / EMS E5) covers: MDM enrollment for Windows / macOS / iOS / Android, Mobile Application Management (MAM) with App Protection Policies on unenrolled devices, compliance policies, configuration profiles, Win32 / LOB app deployment, conditional-access integration, base Microsoft Tunnel (for ENROLLED devices), and base Endpoint Analytics (boot performance / anti-malware overhead aggregates). Intune Plan 2 adds specialty device management (AR/VR headsets, large meeting-room displays, conference devices) and is included in M365 E5 / E7. Anything above that base is an Intune Suite add-on \u2014 each card below maps to one of those six.",
      "Five of the six features (EPM, Tunnel for MAM, Cloud PKI, EAM, Advanced Analytics) license the user whose device is in scope of the feature \u2014 NOT the admin who configures it. An Intune admin who only authors EPM elevation rules, deploys Cloud PKI certificate profiles, or curates the Enterprise App Catalog does not need a Suite license themselves UNLESS their own device is also a target of one of those policies. The unique exception is Remote Help: per Microsoft's official planning documentation (Prerequisites section, verbatim), 'A Remote Help license for everyone targeted to use the service \u2014 both helpers (IT support workers) and sharers (users).' Helpdesk admins who RUN Remote Help sessions must always be licensed on their own user account, even though they aren't an end user of any protected workload.",
      "Important: portal role assignment and per-user license are separate dimensions. An Intune Administrator role lets the admin configure all six features in the admin center; only the per-user / per-device license check determines whether the admin themselves benefits from the feature on their own device or session. Answer Yes below if at least one of the six cards applies to the admin personally (as a helper / sharer for Remote Help, or as the user whose own device is in scope for the other five)."
    ],
    breakdownIntro:
      "The Microsoft Intune Suite is six add-on capabilities, each licensed per-user, all sitting on top of base Intune Plan 1 or Plan 2. Expand each card to see how that feature is scoped, what 'in scope' means in plain language with licensed-vs-unlicensed walkthroughs, the standalone SKU (where available), and Microsoft's source citations. Remote Help is uniquely flagged for the helper+sharer dual-license rule (Microsoft's planning docs require it on BOTH the admin running the session AND the end user receiving it). The other five features license the user whose own device is in scope \u2014 admin operating the portal alone is not a trigger. Answer Yes below if at least ONE card applies to the admin themselves.",
    productBreakdown: INTUNE_SUITE_MINI_CARDS,
    productBreakdownAggregation: "any",
    rationale: {
      why: "The Remote Help planning documentation states explicitly: 'A Remote Help license for everyone targeted to use the service \u2014 both helpers (IT support workers) and sharers (users).' This is unusual: most admin portals enforce role-based access control without a per-user license check on the admin. Endpoint Privilege Management, Tunnel for MAM, Cloud PKI, Enterprise App Management, and Advanced Endpoint Analytics license the managed user / device, so the admin only needs the license if their own device is in scope.",
      yes: "the admin needs the Intune Suite add-on (or the matching standalone add-on). Remote Help helpers ALWAYS need a license assigned to their admin account; the other five features need it only when the admin's own device is also in scope.",
      no: "no Intune Suite trigger for the admin themselves. Note: every end-user device or sharer covered by these features still needs to be licensed \u2014 license them separately. We continue to Teams Premium."
    },
    examples: [
      "Yes example (Remote Help helper): Helpdesk admin uses Remote Help from the Intune portal to take control of an end user's device \u2014 both the admin and the end user need a Remote Help / Intune Suite license assigned.",
      "Yes example (own device): The admin's own laptop is enrolled in Intune and is targeted by an EPM elevation policy or onboarded for Advanced Endpoint Analytics \u2014 license the admin's user account.",
      "No example: The admin only configures EPM / Tunnel for MAM / Cloud PKI / EAM policies that target other users' devices, never their own, and never acts as a Remote Help helper."
    ],
    techDocs: [
      ["Microsoft Intune Suite and add-ons", "https://learn.microsoft.com/intune/fundamentals/intune-add-ons"],
      ["Intune advanced capabilities (Plan 2 / Suite / standalone matrix)", "https://learn.microsoft.com/intune/fundamentals/advanced-capabilities"],
      ["Remote Help \u2014 plan (helpers AND sharers both need a license)", "https://learn.microsoft.com/intune/remote-help/plan#prerequisites"],
      ["Microsoft Intune plans and pricing (Plan 1 vs Plan 2 vs Suite)", "https://www.microsoft.com/security/business/microsoft-intune-pricing"]
    ],
    yes: "q_intune_breadth",
    no: "q_teams_premium"
  },
  q_teams_premium: {
    step: { major: 3, sub: 6, subTotal: 6, label: "Premium service features" },
    question: "Will the privileged admin (a) host meetings using Teams Premium organizer features (advanced webinars, town halls premium, sensitivity-labeled meetings, branded meetings), (b) ATTEND meetings as a Teams Premium attendee (intelligent recap, live translation, AI notes/tasks under their own account), or (c) use Teams Premium ADMIN-ONLY features (advanced collaboration analytics, inactive teams/external domains insights, aggregated Teams Premium usage reporting in the Teams admin center)?",
    help: "Teams Premium is a per-user add-on with three license-check categories per the Microsoft Learn licensing page: organizer-based (license check on the meeting organizer), attendee-based (license check on each attendee receiving the feature), and admin-based (license check on the Teams admin's own account before they can see Advanced collaboration analytics and aggregated usage views in the Teams admin center). The Teams admin center page states explicitly: 'Customers must acquire and assign Teams Premium licenses to each user in their tenant for its use of Advanced collaboration analytics.' Plain Teams admin role access without a Teams Premium license assigned to the admin's own account hides the premium admin reports.",
    rationale: {
      why: "The Teams Premium licensing page categorizes features as organizer-, attendee-, or admin-based. Admin-based features are unique among the premium add-ons: the IT admin's OWN account must have Teams Premium assigned to see Advanced collaboration analytics and aggregated Teams Premium usage views in the Teams admin center. This is similar to the Remote Help helper-license rule — the admin themselves is the licensed party for that specific portal feature, not just the end users.",
      yes: "the admin needs Teams Premium per-user (not included in E3 / E5 / E7). Same SKU covers organizer, attendee, and admin features — license the admin's own account if they host premium meetings, receive premium attendee benefits, OR consume admin-only premium analytics.",
      no: "no Teams Premium trigger for the admin themselves. Note: every USER hosting or receiving Teams Premium features still needs the per-user add-on — license them separately."
    },
    examples: [
      "Yes example (admin-only): Teams admin opens the Teams admin center and wants to see Advanced collaboration analytics, insights on inactive teams, or aggregated Teams Premium usage by user — those views require Teams Premium assigned to the admin's own account.",
      "Yes example (organizer): Admin hosts an advanced webinar or premium town hall.",
      "Yes example (attendee): Admin attends meetings and uses intelligent recap, live translation, or AI-generated notes/tasks under their own account.",
      "No example: Admin uses standard Teams meetings only and uses the Teams admin center solely for policies / call-quality (CQD) views that don't require Teams Premium."
    ],
    techDocs: [
      ["Teams Premium licensing — organizer / attendee / admin matrix", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/licensing-enhance-teams#which-features-are-applied-to-organizers-attendeesusers-or-admins"],
      ["Teams Premium overview for admins", "https://learn.microsoft.com/microsoftteams/enhanced-teams-experience"],
      ["Town halls in Teams", "https://learn.microsoft.com/microsoftteams/town-hall-overview"]
    ],
    yes: "result_teams_premium",
    no: "q_pim"
  },
  q_pim: {
    step: { major: 4, sub: 1, subTotal: 4, label: "Premium identity features" },
    question: "Is the privileged admin themselves PIM-eligible / time-bound for any Entra ID, Azure, or PIM-for-Groups role, OR does the account approve PIM activations, review access for any PIM-managed scope, or get reviewed in any access review?",
    help: "PIM is the most common premium-tier trigger for privileged admins. Unlike Defender / Purview portal access (role-only), PIM enforces a per-user license check on EVERY user who is eligible, time-bound, an approver, a reviewer, or assigned to an access review. The Entra ID Governance licensing FAQ is explicit: 'Ensure that your directory has Microsoft Entra ID P2 or Microsoft Entra ID Governance licenses for the following categories of users: eligible / time-bound assignments to Entra or Azure roles, eligible / time-bound assignments as members or owners of PIM for Groups, users able to approve or reject activation requests, users assigned to an access review, users who perform access reviews.' When the P2 license is removed, eligible assignments are stripped from the user — enforcement is real.",
    rationale: {
      why: "The PIM licensing fundamentals page enforces a per-user license: when a P2 (or Entra ID Governance) license expires, eligible role assignments are REMOVED from the user. This is one of the few admin scenarios where Microsoft actively enforces and de-provisions on license loss. Approvers, reviewers, and PIM-for-Groups eligible members all count.",
      yes: "the admin must hold Entra ID P2 (or Entra ID Governance) — included in M365 E5 / E7 or available standalone. Same rule for every approver, reviewer, and eligible user.",
      no: "no PIM licensing trigger for this admin; we continue to Identity Protection."
    },
    examples: [
      "Yes example (eligible): Admin is PIM-eligible for Global Admin and activates through the portal.",
      "Yes example (approver): Admin is in the approver group that authorizes Global Admin activations.",
      "Yes example (reviewer): Admin reviews a quarterly access review of users in privileged groups.",
      "Yes example (PIM for Groups): Admin is an eligible member or owner of a PIM-managed group.",
      "No example: Admin holds permanent active role assignments only — no PIM workflows configured."
    ],
    techDocs: [
      ["PIM licensing fundamentals — every category of P2-required user", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
      ["What is PIM", "https://learn.microsoft.com/entra/id-governance/privileged-identity-management/pim-configure"],
      ["Access reviews", "https://learn.microsoft.com/entra/id-governance/access-reviews-overview"]
    ],
    yes: "q_p2_bundle_check",
    no: "q_identity_protection"
  },
  q_identity_protection: {
    step: { major: 4, sub: 2, subTotal: 4, label: "Premium identity features" },
    question: "Is the privileged admin's own sign-in evaluated by Microsoft Entra ID Protection — i.e., their account is in the user-scope of a sign-in-risk or user-risk Conditional Access policy, the MFA-registration policy, or any user / sign-in risk policy with premium detections (atypical travel, password spray, malicious IP, leaked credentials, suspicious MFA approval, anomalous token)?",
    help: "Important distinction: a Security Reader / Security Operator / Security Admin / Conditional Access Admin / Global Reader can OPEN ID Protection reports and dismiss / confirm risks via their role — no per-user P2 license is needed on the admin to operate the portal. The per-user P2 license is required for every user whose sign-ins are being EVALUATED by risk policies (premium detections produce limited info on Free / P1; full info, risky-user / risky-sign-in drawer, notifications, and risk-based CA only on P2). If the admin's own account is in scope of those policies (most well-managed tenants put admins in scope), the admin needs P2.",
    rationale: {
      why: "The Entra ID Protection license-requirements table grants Free / P1 users only limited risk visibility and no risk-based CA enforcement — full ID Protection capability is gated to P2 per evaluated user. The Required Roles section separately lists Security Reader / Operator / Admin / CA Admin as the role-based gates for portal operation. Two separate gates: role for portal access, P2 license per user being evaluated.",
      yes: "the admin's own sign-ins are evaluated by ID Protection — they must hold Entra ID P2. Same rule for every other in-scope user. Most production tenants put admin accounts in scope of risk policies, so this usually triggers.",
      no: "the admin's account is explicitly excluded from all risk-based and MFA-registration CA policies. We continue to Identity Governance. Note: every USER whose sign-ins are evaluated by ID Protection still needs P2 — license them separately."
    },
    examples: [
      "Yes example: A sign-in-risk Conditional Access policy includes 'All users' and the admin account is not excluded — their every sign-in is risk-evaluated.",
      "Yes example: A user-risk policy requires password reset on high risk and the admin is in scope.",
      "No example: The admin is a break-glass account explicitly excluded from CA, ID Protection, and PIM (handled in the final break-glass question).",
      "No example: The tenant has no Identity Protection policies configured — no users are being risk-evaluated."
    ],
    techDocs: [
      ["Identity Protection license requirements", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#license-requirements"],
      ["Identity Protection required roles", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#required-roles"],
      ["Risk-based sign-in CA policy", "https://learn.microsoft.com/entra/identity/conditional-access/policy-risk-based-sign-in"],
      ["User-risk CA policy", "https://learn.microsoft.com/entra/identity/conditional-access/policy-risk-based-user"]
    ],
    yes: "q_p2_bundle_check",
    no: "q_id_governance"
  },
  q_id_governance: {
    step: { major: 4, sub: 3, subTotal: 4, label: "Premium identity features" },
    question: "Will the privileged admin CONFIGURE Microsoft Entra ID Governance features (Entitlement Management access packages, Lifecycle Workflows, ML-assisted access reviews, PIM for Groups governance, account discovery) OR be in scope as a requestor / assignee / reviewer / sponsor / approver of any access package or lifecycle workflow?",
    help: "This is one of the rare admin scenarios where the per-user license is enforced on the configurer themselves, not just on users in scope. The Microsoft Entra ID Governance licensing FAQ is explicit: 'Users don't need to be assigned a Microsoft Entra ID Governance license, but there needs to be as many licenses to include all member users in scope of, or who CONFIGURES, the Identity Governance features.' The official license-count examples include '1 license for the Lifecycle Workflows Administrator' and '1 license for the group owner as reviewer'. Configurators, reviewers, approvers, sponsors, and end-users in scope ALL count toward the license total.",
    rationale: {
      why: "Unlike Defender / Purview, where the admin operating the portal does NOT need a per-user license, the ID Governance licensing FAQ explicitly counts the administrator who configures features (e.g., 'the Lifecycle Workflows Administrator') toward the required license total. Required for every member user who configures Entitlement Management, Lifecycle Workflows, or Access Reviews, every group owner used as reviewer, every requestor, and every user assigned to access packages. Standalone access reviews on basic groups operate with P2; Entitlement Management, Lifecycle Workflows, ML access-review recommendations, PIM for Groups governance, and Account Discovery require Entra ID Governance (or Entra Suite).",
      yes: "the admin needs Entra ID Governance (or the Entra Suite, or M365 E7 which bundles the Entra Suite). Same rule for every approver / reviewer / sponsor / requestor / assignee.",
      no: "no ID Governance trigger for this admin; we continue to the Entra Suite network-identity features."
    },
    examples: [
      "Yes example (configurator): Admin builds joiner / mover / leaver Lifecycle Workflows or creates an access package in Entitlement Management.",
      "Yes example (reviewer): Group owner runs ML-assisted access reviews on group membership.",
      "Yes example (approver): Admin approves access-package requests on a Catalog they sponsor.",
      "Yes example (assignee): Admin is assigned to receive access via an Entitlement Management access package.",
      "No example: Admin manages only static security groups and basic Entra role assignments — no Entitlement Management / Lifecycle Workflows / ML access reviews are configured in the tenant."
    ],
    techDocs: [
      ["Entra ID Governance licensing — 'users who CONFIGURE Identity Governance features need a license' FAQ", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#do-licenses-need-to-be-assigned-to-users-to-use-identity-governance-features"],
      ["Lifecycle Workflows — admin counts as 1 license", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#example-license-scenarios-2"],
      ["What are Lifecycle Workflows", "https://learn.microsoft.com/entra/id-governance/what-are-lifecycle-workflows"],
      ["Entitlement Management overview", "https://learn.microsoft.com/entra/id-governance/entitlement-management-overview"]
    ],
    yes: "result_id_governance",
    no: "q_entra_suite"
  },
  q_entra_suite: {
    step: { major: 4, sub: 4, subTotal: 4, label: "Premium identity features" },
    question: "Will the privileged admin themselves connect through Microsoft Entra Internet Access OR Microsoft Entra Private Access (their own device runs the Global Secure Access client and routes traffic through the GSA edge)? (Configuring GSA policies for other users, or issuing Verified ID credentials, does NOT trigger a license on the admin themselves.)",
    help: "Global Secure Access (Internet Access + Private Access) is licensed per user whose CLIENT routes through the GSA edge — the admin who configures GSA policies via the Entra portal does not need the license unless their own device is also a GSA client. Microsoft Entra Verified ID has NO special licensing requirements per the Verified ID FAQ: 'There are no special licensing requirements to issue verifiable credentials.' Verified ID is bundled in Entra Suite as a value-add but does not itself trigger a per-user license. So Entra Suite licensing for the admin is driven by whether the admin's own device is a GSA client, not by Verified ID issuance and not by GSA policy configuration.",
    rationale: {
      why: "Per the Entra Suite documentation, Global Secure Access (Internet Access + Private Access) is a per-user SKU that gates the GSA client and traffic-forwarding profiles — the licensed party is the user whose traffic is being secured. The Verified ID FAQ states explicitly that issuing verifiable credentials has no special licensing requirements. Unified network + identity CA policies are configured via Conditional Access (role-gated) and license each user in scope of the policy. So an admin triggers Entra Suite only when their own endpoint is also routing through GSA.",
      yes: "the admin needs Microsoft Entra Suite (or M365 E7, which bundles it). Same rule for every other user whose device runs the GSA client.",
      no: "no Entra Suite trigger for the admin themselves. Note: every USER whose device routes through Internet Access / Private Access still needs the per-user license — license them separately. Verified ID issuance and verification require no per-user license."
    },
    examples: [
      "Yes example: The admin's own laptop runs the Global Secure Access client and all internet / private-app traffic is routed through Entra GSA.",
      "No example: The admin configures GSA Internet Access / Private Access traffic-forwarding profiles for other users in the Entra portal but their own laptop is not a GSA client.",
      "No example: The admin sets up Verified ID issuance pipelines for HR onboarding — Verified ID has no licensing requirement."
    ],
    techDocs: [
      ["Global Secure Access overview", "https://learn.microsoft.com/entra/global-secure-access/overview-what-is-global-secure-access"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"],
      ["Verified ID FAQ — no special licensing requirements", "https://learn.microsoft.com/entra/verified-id/verifiable-credentials-faq#what-are-the-licensing-requirements"]
    ],
    yes: "result_entra_suite",
    no: "q_break_glass"
  },
  q_break_glass: {
    step: { major: 5, label: "Emergency access check" },
    question: "Is this a break-glass / emergency-access account that is explicitly excluded from Conditional Access, PIM, and risk policies?",
    help: "Microsoft recommends excluding emergency-access accounts from Conditional Access to avoid lockout. When excluded from PIM and Identity Protection, they don't trigger the P2 requirement.",
    rationale: {
      why: "Microsoft's emergency-access guidance recommends excluding break-glass accounts from Conditional Access, PIM, and Identity Protection so they remain usable during a tenant lockout. Because they're not in scope of those policies, they don't trigger the per-user premium licensing requirement those policies would normally create.",
      yes: "the account is explicitly excluded from CA / PIM / risk policies, so no per-user premium-tier license is required for it.",
      no: "the account is in scope of premium policies but didn't hit any earlier trigger — it can stay on Entra ID Free."
    },
    examples: [
      "Yes example: Offline emergency GA account excluded from CA/PIM, used only during tenant lockout incidents.",
      "No example: Normal day-to-day admin account that still goes through CA and PIM controls."
    ],
    techDocs: [
      ["Emergency access accounts", "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access"],
      ["Conditional Access planning", "https://learn.microsoft.com/entra/identity/conditional-access/plan-conditional-access"],
      ["PIM licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"]
    ],
    yes: "result_break_glass",
    no: "result_no_license_admin"
  },

  // ---------- Admin tree disambiguation questions ----------
  q_copilot_e7_choice: {
    step: { major: 3, sub: 2, subTotal: 6, label: "Premium service features" },
    question: "Will this user ALSO need Microsoft Entra Suite (Internet Access + Private Access + Verified ID) AND Agent 365 governance — all bundled in a single per-user SKU?",
    help: "Microsoft 365 E7 (Frontier Suite, generally available since May 1, 2026) bundles E5 + Copilot + Entra Suite + Agent 365 in one license. The Copilot add-on layered on E3/E5 is cheaper when you only need Copilot.",
    rationale: {
      why: "E7 is meaningfully cheaper than stacking E5 + Copilot + Entra Suite + Agent 365 individually when all four are needed. The Copilot add-on alone is the right answer when Entra Suite and Agent 365 aren't required.",
      yes: "buy M365 E7 — one bundled license covers all four.",
      no: "buy the Microsoft 365 Copilot add-on layered on the existing base plan — cheaper and no base-plan change."
    },
    techDocs: [
      ["Microsoft 365 E7 (Frontier Suite) announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"],
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"]
    ],
    yes: "result_e7_full",
    no: "result_copilot_addon"
  },
  q_purview_e5_breadth: {
    step: { major: 3, sub: 3, subTotal: 6, label: "Premium service features" },
    question: "Does this user ALSO need Defender XDR / Defender for Endpoint P2 / Defender for Identity / Defender for Cloud Apps (any of the Defender Suite workloads)?",
    help: "M365 E5 bundles Purview E5 AND the Defender Suite. If you need both for the same user, full E5 is the single cheapest SKU. The E5 Compliance add-on covers ONLY Purview E5 and is cheaper when Defender XDR is not in scope.",
    rationale: {
      why: "Buying E5 once is usually cheaper than stacking E3 + E5 Compliance + Defender Suite. But the E5 Compliance add-on is meaningfully cheaper when only Purview is needed.",
      yes: "the user is in scope for BOTH Purview E5 and Defender — buy full M365 E5.",
      no: "only Purview is in scope — buy the M365 E5 Compliance add-on on the existing base."
    },
    breakdownIntro:
      "You already answered Yes to Purview E5. Now we're asking the symmetric question about the Defender Suite \u2014 because if this user needs BOTH, full M365 E5 is the single cheapest SKU; if they only need Purview, the E5 Compliance add-on on top of E3 is meaningfully cheaper. The Defender Suite is four protection workloads plus a correlation layer: Defender for Office 365 P2 (mailbox), Defender for Endpoint P2 (device), Defender for Identity (on-prem AD, tenant-wide-not-scopeable *), Defender for Cloud Apps (SaaS sessions), and Defender XDR (the correlation portal). Expand each card to see how that workload is scoped per Microsoft's service description, what 'in scope' means for this user in plain language with licensed-vs-unlicensed walkthroughs, and Microsoft's source citations. Answer Yes below if this user is in scope of at least ONE Defender workload as a protected asset (mailbox, device, or identity). Starred (*) cards are tenant-wide and not scopeable \u2014 they are informational only and do not count toward 'at least one applies'.",
    productBreakdown: DEFENDER_SUITE_MINI_CARDS,
    productBreakdownAggregation: "any",
    techDocs: [
      ["M365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["M365 Maps — E5 Compliance comparison", "https://m365maps.com/Microsoft%20365%20E5%20Compliance.htm"]
    ],
    yes: "result_e5_full",
    no: "result_e5_compliance_only"
  },
  q_defender_breadth: {
    step: { major: 3, sub: 4, subTotal: 6, label: "Premium service features" },
    question: "Does this user ALSO need Microsoft Purview E5 features (Insider Risk Management, Communication Compliance, premium eDiscovery, Audit Premium)?",
    help: "M365 E5 bundles the Defender Suite AND Purview E5. If you need both for the same user, full E5 is the single cheapest SKU. The Defender Suite add-on (formerly E5 Security) covers ONLY Defender — cheaper when Purview E5 isn't in scope.",
    breakdownIntro:
      "You already answered Yes to the Defender Suite. Now we're asking the symmetric question about Purview E5 \u2014 because if this user needs BOTH, full M365 E5 is the single cheapest SKU; if they only need Defender, the Defender Suite add-on (formerly E5 Security) on top of E3 is meaningfully cheaper. The four most common per-user Purview E5 triggers are: Insider Risk Management (IRM), Communication Compliance, eDiscovery (Premium), and Audit (Premium). Expand each card to see how that feature is scoped, what 'in scope' means for this user in plain language with licensed-vs-unlicensed walkthroughs, and Microsoft's source citations. Answer Yes below if this user is in scope of at least ONE of these Purview E5 features. (The upstream Purview umbrella has the full 12-card breakdown including Endpoint DLP, Records Management, Adaptive Protection, Information Barriers, Customer Lockbox, Customer Key, PAM, and Auto-labeling \u2014 these four are the most common triggers.)",
    productBreakdown: PURVIEW_E5_BREADTH_MINI_CARDS,
    productBreakdownAggregation: "any",
    rationale: {
      why: "Buying E5 once is usually cheaper than stacking E3 + Defender Suite + E5 Compliance. But the Defender Suite add-on alone is meaningfully cheaper when Purview isn't in scope.",
      yes: "the user is in scope for BOTH Defender and Purview E5 — buy full M365 E5.",
      no: "only Defender is in scope — buy the Microsoft Defender Suite add-on on the existing base."
    },
    techDocs: [
      ["M365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["Microsoft Defender XDR overview", "https://learn.microsoft.com/defender-xdr/microsoft-365-defender"],
      ["M365 Maps — E5 Security comparison", "https://m365maps.com/Microsoft%20365%20E5%20Security.htm"]
    ],
    yes: "result_e5_full",
    no: "result_defender_suite_only"
  },
  q_intune_breadth: {
    step: { major: 3, sub: 5, subTotal: 6, label: "Premium service features" },
    question: "Does this user need TWO OR MORE of the Intune premium features — Endpoint Privilege Management, Remote Help, Microsoft Tunnel for MAM, Cloud PKI, Enterprise App Management, or Advanced Endpoint Analytics?",
    help: "The Intune Suite bundles all six features and costs less than the sum of two standalone add-ons. If only ONE feature is in scope, the matching standalone add-on (EPM standalone, Remote Help standalone, etc.) is cheaper. Reminder for Remote Help: licensing applies to BOTH the helper (admin) and the sharer (end user) — a Remote Help / Intune Suite license must be assigned to the admin's own account if they will run support sessions.",
    rationale: {
      why: "Microsoft prices the Intune Suite below the cost of stacking two standalone add-ons. A single standalone is cheaper than the Suite when only one feature is needed. Remote Help is the only Intune Suite feature with a per-helper license rule on the admin — EPM / Tunnel for MAM / Cloud PKI / EAM / Advanced Endpoint Analytics license the managed user / device.",
      yes: "buy Microsoft Intune Suite — bundle is cheaper for two or more features.",
      no: "buy a single matching Intune standalone add-on — cheaper for one feature only."
    },
    techDocs: [
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"],
      ["Endpoint Privilege Management", "https://learn.microsoft.com/mem/intune/protect/epm-overview"],
      ["Remote Help — plan (helpers AND sharers both need a license)", "https://learn.microsoft.com/en-us/intune/remote-help/plan"],
      ["M365 Maps — Intune Suite", "https://m365maps.com/Microsoft%20Intune%20Suite.htm"]
    ],
    yes: "result_intune_suite_full",
    no: "q_intune_which_one"
  },
  // q_intune_which_one — disambiguation when the user needs exactly ONE
  // Intune premium feature. The previous tree dead-ended at a fuzzy
  // "pick the matching standalone" result; this choice node forces a
  // specific feature pick so we can name the exact standalone SKU.
  q_intune_which_one: {
    choice: true,
    step: { major: 3, sub: 6, subTotal: 6, label: "Premium service features" },
    question: "Which Intune premium feature does this user need?",
    help: "Pick the one feature in scope. Each option maps to a specific Microsoft Intune standalone add-on SKU. If two or more apply to the same user, go back and answer 'Yes' to the previous question — the Intune Suite bundles all six.",
    choices: [
      {
        label: "Endpoint Privilege Management (EPM)",
        sublabel: "Lets standard users elevate approved apps without local admin rights.",
        icon: "1",
        tone: "primary",
        target: "result_intune_epm"
      },
      {
        label: "Remote Help",
        sublabel: "Cloud-managed, secure remote-control / view-only support sessions from the Intune admin center.",
        icon: "2",
        tone: "primary",
        target: "result_intune_remote_help"
      },
      {
        label: "Microsoft Tunnel for MAM",
        sublabel: "Per-app VPN for unmanaged iOS / Android devices in Mobile Application Management.",
        icon: "3",
        tone: "primary",
        target: "result_intune_tunnel"
      },
      {
        label: "Microsoft Cloud PKI",
        sublabel: "Managed cloud PKI service issuing device / user certificates to Intune-managed endpoints.",
        icon: "4",
        tone: "primary",
        target: "result_intune_cloud_pki"
      },
      {
        label: "Enterprise App Management",
        sublabel: "Catalog of pre-packaged Win32 apps with auto-update detection in the Intune admin center.",
        icon: "5",
        tone: "primary",
        target: "result_intune_eam"
      },
      {
        label: "Advanced Endpoint Analytics",
        sublabel: "Anomaly detection, device timeline, and proactive remediation scripts beyond base Endpoint Analytics.",
        icon: "6",
        tone: "primary",
        target: "result_intune_aea"
      }
      // Note: no in-card "← Back to feature-count question" option here.
      // The global "← Back" button in the assessment controls already
      // pops q_intune_breadth back into view via the canonical history
      // pop. Adding an in-card back-target was a tree-level cycle (it
      // PUSHED q_intune_which_one onto history instead of popping it),
      // which surfaced as "answer-driven cycle" in test-tree-walk.mjs.
    ]
  },
  q_p2_bundle_check: {
    step: { major: 4, sub: 1, subTotal: 4, label: "Premium identity features" },
    title: "Check whether Entra ID P2 is already covered by another license",
    question: "Is one of the six P2-inclusive licenses already assigned to every user who will use PIM or Identity Protection?",
    sub: "Entra ID P2 is the gating license for PIM and Identity Protection. It is also bundled inside six other SKUs — so before you buy standalone P2, confirm whether the user is already covered.",
    help: "Walk through the six SKUs below. Answer Yes only if every PIM eligible admin, approver, reviewer, and risk-policy user is assigned at least one of them (or standalone Entra ID P2) in the Microsoft 365 admin center. 'Assigned' means the license appears on the user's Licenses tab — your tenant owning a pool of E5 SKUs is not the same as a specific admin being assigned one.",
    paragraphs: [
      "Microsoft Entra ID P2 unlocks Privileged Identity Management (PIM), Identity Protection (sign-in risk + user risk + MFA registration policy), risk-based Conditional Access, and access reviews. Every user who benefits from any of those features must hold a license that includes P2.",
      "Six commercial SKUs bundle Entra ID P2: Microsoft 365 E5, Microsoft 365 E7 (Frontier Suite), Enterprise Mobility + Security E5 (EMS E5), Microsoft Defender Suite, Microsoft Entra Suite, and Microsoft Entra ID Governance. If a user already has one of those, no separate P2 purchase is needed — you would just be paying twice for the same entitlement.",
      "Confirm assignment, not ownership. Auditors check each individual user account, not the tenant's license pool. The fastest verification is Microsoft 365 admin center → Users → pick the user → Licenses & apps tab → look for a P2-inclusive SKU with a ticked box.",
      "If your fleet is mixed (some admins on E5, some on E3), answer No here. Buying standalone Entra ID P2 for the handful of admins on a non-P2 SKU is far cheaper than discovering at audit that PIM eligibility was non-compliant for the uncovered users."
    ],
    rationale: {
      why: "Entra ID P2 is included in six different SKUs. Standalone Entra ID P2 is the cheapest path only when the user is not already on one of those — otherwise the recommendation would be a double-buy.",
      yes: "skip the purchase — but confirm the P2-inclusive SKU is actually assigned (not just owned by the tenant) to every PIM eligible admin, approver, reviewer, and every user in scope of a risk-based Conditional Access, user-risk, or sign-in-risk policy.",
      no: "buy Microsoft Entra ID P2 standalone, per user, for every admin and every approver / reviewer / risk-scoped user who is not already on a P2-inclusive SKU."
    },
    breakdownIntro: "Tick through each P2-inclusive SKU. Answer Yes to the umbrella question only if every user who needs PIM or Identity Protection is assigned at least one of them (or standalone Entra ID P2). 'Assigned' means the license is ticked on the user's Licenses tab — owning the SKU at the tenant level is not enough.",
    productBreakdown: [
      {
        name: "Microsoft 365 E5",
        sku: "M365 E5 (commercial) / A5 (education) / G5 (US Gov)",
        scope: "per-user",
        scopeNote: "Per-user license assignment. Each user evaluated by PIM or Identity Protection must hold the SKU.",
        inScopeMeans: "The user is assigned 'Microsoft 365 E5' (or A5 / G5) in the M365 admin center. Entra ID P2 is bundled inside, so no separate purchase is needed.",
        notInScopeMeans: "The user is on M365 E3, Business Premium, an F-series SKU, or Office 365 E5 (Office 365 E5 is not the same as Microsoft 365 E5 and does not include Entra ID P2).",
        examples: [
          "Yes — privileged admin assigned 'Microsoft 365 E5' in the Licenses tab.",
          "No — privileged admin only assigned 'Microsoft 365 E3' (Entra ID P1 only, no P2).",
          "No — user is assigned 'Office 365 E5' (different SKU; does not include Entra ID P2)."
        ],
        docs: [
          ["Microsoft 365 E5 product page", "https://www.microsoft.com/microsoft-365/enterprise/e5"],
          ["M365 Maps — E5 contents", "https://m365maps.com/Microsoft%20365%20E5.htm"]
        ]
      },
      {
        name: "Microsoft 365 E7 (Frontier Suite)",
        sku: "M365 E7 — generally available since May 1, 2026",
        scope: "per-user",
        scopeNote: "Per-user license assignment. E7 bundles E5 + Copilot + Entra Suite + Agent 365.",
        inScopeMeans: "The user is assigned 'Microsoft 365 E7' in the Licenses tab. Entra ID P2 is included via the bundled E5 component.",
        notInScopeMeans: "The user holds individual add-ons (E5 + Copilot + Entra Suite stacked separately) — those still cover P2, but answer Yes against the M365 E5 or Entra Suite row instead.",
        examples: [
          "Yes — executive assigned 'Microsoft 365 E7' to consolidate Copilot, Entra Suite, and E5 into one SKU.",
          "No — user is on M365 E5 only (no E7); check the E5 or Entra Suite row instead."
        ],
        docs: [
          ["Microsoft 365 E7 announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"],
          ["Microsoft 365 Frontier Suite overview", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"]
        ]
      },
      {
        name: "Enterprise Mobility + Security E5 (EMS E5)",
        sku: "EMS E5 — standalone identity + security suite",
        scope: "per-user",
        scopeNote: "Per-user license. EMS E5 bundles Entra ID P2, Intune, AIP P2, Defender for Identity, and Defender for Cloud Apps.",
        inScopeMeans: "The user is assigned 'Enterprise Mobility + Security E5' in the Licenses tab.",
        notInScopeMeans: "The user holds EMS E3 (Entra ID P1 only — no P2) or has no EMS license at all.",
        examples: [
          "Yes — admin assigned 'EMS E5' on top of an Office 365 SKU.",
          "No — admin is assigned 'EMS E3' (Entra ID P1 only; PIM and Identity Protection both require P2)."
        ],
        docs: [
          ["EMS E5 product page", "https://www.microsoft.com/security/business/enterprise-mobility-security"],
          ["M365 Maps — EMS E5 contents", "https://m365maps.com/Enterprise%20Mobility%20%2B%20Security%20E5.htm"]
        ]
      },
      {
        name: "Microsoft Defender Suite",
        sku: "Defender Suite — security add-on (commercial)",
        scope: "per-user",
        scopeNote: "Per-user security add-on bundle. Includes Defender XDR, Entra ID P2, and Purview Audit (Premium).",
        inScopeMeans: "The user is assigned 'Microsoft Defender Suite' in the Licenses tab. Entra ID P2 is bundled.",
        notInScopeMeans: "The user holds individual Defender SKUs (Defender for Endpoint P2, Office P2, Identity, or Cloud Apps stacked separately). Those individual SKUs do not include Entra ID P2 unless purchased separately.",
        examples: [
          "Yes — SOC analyst assigned 'Microsoft Defender Suite' on top of M365 E3.",
          "No — SOC analyst holds individual 'Defender for Endpoint P2' plus 'Defender for Identity' but no full Defender Suite SKU."
        ],
        docs: [
          ["Microsoft Defender Suite overview", "https://learn.microsoft.com/defender-xdr/microsoft-365-defender"],
          ["Microsoft Defender Suite licensing", "https://learn.microsoft.com/microsoft-365/security/defender/microsoft-365-security-center-mde"]
        ]
      },
      {
        name: "Microsoft Entra Suite",
        sku: "Entra Suite — identity + network access add-on",
        scope: "per-user",
        scopeNote: "Per-user identity bundle. Includes Entra ID P2, Entra ID Governance, Internet Access, Private Access, and Verified ID.",
        inScopeMeans: "The user is assigned 'Microsoft Entra Suite' in the Licenses tab. Entra ID P2 (and Governance) are bundled.",
        notInScopeMeans: "The user is on Entra ID P1 plus Internet Access standalone — that combination does not include P2.",
        examples: [
          "Yes — admin assigned 'Microsoft Entra Suite' as the privileged-identity SKU.",
          "No — admin is on Entra ID P1 only (Conditional Access works, but PIM and Identity Protection do not)."
        ],
        docs: [
          ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"],
          ["Entra Suite pricing & contents", "https://www.microsoft.com/security/business/microsoft-entra-pricing"]
        ]
      },
      {
        name: "Microsoft Entra ID Governance",
        sku: "Entra ID Governance — standalone governance add-on",
        scope: "per-user",
        scopeNote: "Per-user governance SKU. Bundles Entra ID P2 plus Entra ID Governance features (Entitlement Management, Lifecycle Workflows, ML-driven access reviews).",
        inScopeMeans: "The user is assigned 'Microsoft Entra ID Governance' in the Licenses tab. Entra ID P2 is included.",
        notInScopeMeans: "The user is only on Entra ID P1 — Governance and PIM both require P2.",
        examples: [
          "Yes — joiner/mover/leaver process owner assigned 'Microsoft Entra ID Governance'.",
          "No — operator is on Entra ID P1 only; needs Governance or Entra Suite to cover PIM and Governance together."
        ],
        docs: [
          ["Microsoft Entra ID Governance licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals"],
          ["Microsoft Entra ID Governance overview", "https://learn.microsoft.com/entra/id-governance/identity-governance-overview"]
        ]
      }
    ],
    examples: [
      "Yes — every PIM eligible admin in scope is assigned M365 E5. No additional P2 needed.",
      "Yes — SOC analysts are on M365 E3 plus Microsoft Defender Suite. The Defender Suite includes P2 — no extra purchase.",
      "Mixed → answer No — half the admins are on M365 E5 (covered) and half are on M365 E3 (not covered). Buy standalone P2 for the E3 admins.",
      "No — admins are all on M365 E3, EMS E3, and standalone Defender for Endpoint P2. None of those include Entra ID P2."
    ],
    techDocs: [
      ["PIM licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
      ["Identity Protection licensing", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#license-requirements"],
      ["M365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["M365 Maps — Entra ID", "https://m365maps.com/Microsoft%20Entra%20ID.htm"]
    ],
    yes: "result_p2_already_included",
    no: "result_p2_standalone"
  },

  // ---------- Profile flow disambiguation questions ----------
  // q_iw_platform forks the Information Worker path between Microsoft 365
  // (full suite: Office + Windows + Intune + Entra ID P1) and Office 365
  // (cloud productivity only — no Windows licence, no Intune, no Entra P1).
  // O365 is ~$11–22 / user / month cheaper than the matching M365 tier and is
  // the right base when the customer licenses Windows + Intune + Entra
  // separately (BYOD, Mac/Linux fleets, EMS-only deals, third-party MDM),
  // and "Microsoft 365 Apps for Enterprise" (no cloud services at all) is
  // a niche apps-only fork below that.
  q_iw_platform: {
    step: { major: 2, sub: 1, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user's organization want Microsoft to ALSO license Windows 11 Enterprise + Microsoft Intune device management + Microsoft Entra ID P1 (Conditional Access, group-based licensing, MFA enforcement via CA, SSPR, password protection) under the SAME per-user SKU as Office?",
    help: "This is the canonical Microsoft 365 vs Office 365 fork. M365 E-series = Office + Windows + EMS (Intune + Entra ID P1/P2) bundled. O365 E-series = Office cloud productivity ONLY (Exchange / Teams / SharePoint / OneDrive / desktop Office) — no Windows licence, no Intune, no Entra ID P1 included. O365 is roughly $11–$22 / user / month cheaper than the matching M365 tier and is the right base when the org licenses Windows + Intune + EMS separately (e.g. BYOD, Mac / Linux fleets, third-party MDM, existing EMS-only enrolment, or Windows Volume Licensing handled by procurement). Microsoft Product Terms allow EMS E3 / EMS E5 to be added per-user on top of any O365 base.",
    rationale: {
      why: "Microsoft sells the same Office cloud productivity stack under TWO SKU families: M365 (bundles Windows + Intune + EMS) and O365 (cloud productivity only). They are NOT the same SKU. The right answer depends on how the org licenses Windows, Intune, and Entra ID for this user.",
      yes: "this user gets Windows + Intune + Entra ID P1 under the same SKU — continue down the M365 path (E3 / E3 + Copilot / E5 / E7).",
      no: "Windows / Intune / Entra ID are licensed separately (or the user is on Mac / Linux / BYOD with third-party MDM) — drop into the O365 sub-tree (O1 / O3 / O5 / Apps for Enterprise)."
    },
    examples: [
      "Yes: Standard Windows-fleet knowledge worker — IT provisions a Windows 11 laptop, enrols it in Intune, applies Conditional Access. M365 E3 / E5 bundles all of that.",
      "Yes: Mixed environment but the customer wants ONE SKU for simplicity — M365 covers Windows even if they choose not to deploy it for every user.",
      "No: BYOD shop — every employee brings their own Mac or PC, no Intune, no managed Windows image. Office 365 E3 / E5 plus standalone Entra ID P1 (or EMS E3) per user is cheaper.",
      "No: Mac / Linux engineering team — Windows licence has no value to them; the org runs Jamf / third-party MDM. O365 + EMS layered for the few who need Entra P1.",
      "No: Customer already owns Windows VL + Intune via a separate EA negotiation — buying it again inside M365 would double-pay. O365 is the clean answer."
    ],
    techDocs: [
      ["Compare Microsoft 365 Enterprise vs Office 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Office 365 Enterprise service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["Microsoft Product Terms — Universal License Terms", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"],
      ["M365 Maps — Microsoft 365 vs Office 365 comparison", "https://m365maps.com/Microsoft%20365%20Enterprise.htm"],
      ["Enterprise Mobility + Security (EMS) plans", "https://www.microsoft.com/microsoft-365/enterprise-mobility-security/compare-plans-and-pricing"]
    ],
    yes: "q_iw_security",
    no: "q_iw_o365_collab"
  },
  q_iw_security: {
    step: { major: 2, sub: 2, subTotal: 3, label: "Knowledge worker tier" },
    question: "Do these users need E5-tier security or compliance — Microsoft Defender XDR, Defender for Endpoint P2, Defender for Identity, Defender for Cloud Apps, Microsoft Purview E5 (IRM / Communication Compliance / premium eDiscovery / Audit Premium / endpoint DLP), or Entra ID P2 (PIM, Identity Protection)?",
    help: "M365 E5 bundles all of those for one per-user price. E3 (or E3 + Copilot add-on) is the cheapest path when none of those are needed.",
    rationale: {
      why: "E3 is the smallest Enterprise SKU with desktop Office + Exchange + Teams + Intune + Entra ID P1. E5 layers Defender Suite + Purview E5 + Entra ID P2 on top in one SKU.",
      yes: "the user needs E5-tier features — drop into the E5 vs E7 disambiguation next.",
      no: "the user can stay on E3 — drop into the Copilot question next."
    },
    techDocs: [
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["M365 Maps — E5 comparison", "https://m365maps.com/Microsoft%20365%20E5.htm"]
    ],
    yes: "q_iw_copilot_bundle",
    no: "q_iw_copilot_addon"
  },
  q_iw_copilot_bundle: {
    step: { major: 2, sub: 3, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user ALSO need Microsoft 365 Copilot, Microsoft Entra Suite (Internet Access / Private Access / Verified ID), AND Agent 365 — all bundled in a single per-user SKU?",
    help: "M365 E7 (generally available since May 1, 2026) bundles E5 + Copilot + Entra Suite + Agent 365 in one license — typically cheaper than stacking the four add-ons.",
    rationale: {
      why: "E7 was designed as the bundled price point for users who need all four. E5 alone is cheaper when Copilot / Entra Suite / Agent 365 aren't all required.",
      yes: "buy Microsoft 365 E7 — the single bundled SKU.",
      no: "buy Microsoft 365 E5 — add Copilot or Entra Suite individually only if specific users need them."
    },
    techDocs: [
      ["Microsoft 365 E7 (Frontier Suite) announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"],
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"]
    ],
    yes: "result_iw_e7",
    no: "result_iw_e5"
  },
  q_iw_copilot_addon: {
    step: { major: 2, sub: 3, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user need Microsoft 365 Copilot (in Word / Excel / PowerPoint / Outlook / Teams, or Copilot Studio agents grounded in tenant data)?",
    help: "The Copilot add-on layers on M365 E3 per user. It does NOT require a base-plan upgrade.",
    rationale: {
      why: "Copilot per-user add-on is the smallest incremental cost for a single user. Only users who actually use Copilot need the add-on — license assignment gates access.",
      yes: "buy M365 E3 + the Microsoft 365 Copilot add-on per Copilot user.",
      no: "buy M365 E3 only — the baseline knowledge-worker SKU."
    },
    techDocs: [
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"]
    ],
    yes: "result_iw_e3_copilot",
    no: "result_iw_e3"
  },
  // ---------- Office 365 sub-tree ----------
  // Triggered when q_iw_platform = No (org does NOT need Windows + Intune +
  // Entra P1 bundled with Office). Three short questions narrow down to
  // Microsoft 365 Apps for Enterprise (Office apps only, no cloud services)
  // / Office 365 E1 (web only) / Office 365 E3 (desktop + cloud) /
  // Office 365 E5 (E3 + Defender for Office P2 + Power BI Pro + Teams Phone).
  q_iw_o365_collab: {
    step: { major: 2, sub: 2, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user need cloud collaboration services — Exchange Online mailbox + Microsoft Teams + SharePoint + OneDrive — or ONLY the installed Office desktop apps (Word / Excel / PowerPoint / Outlook running locally on their device)?",
    help: "Microsoft 365 Apps for Enterprise is the desktop Office apps as a per-user SKU with NO Exchange, NO Teams, NO SharePoint, NO OneDrive for Business cloud services. It's the right SKU when the user's mailbox / chat / file-share comes from a third-party service (Google Workspace, on-premises Exchange, IBM Notes, Zimbra, etc.) and Office is all that's needed from Microsoft. Office 365 E1 / E3 / E5 all include the cloud services.",
    rationale: {
      why: "M365 Apps for Enterprise (~$12 / user / month) is a meaningful saving over Office 365 E3 (~$23) when the customer truly does not consume Microsoft cloud collab. The trade-off: no mailbox, no Teams, no SharePoint sites, no OneDrive — those have to come from somewhere else.",
      yes: "the user needs Exchange / Teams / SharePoint / OneDrive — continue to the O365 tier question.",
      no: "the user only needs desktop Office apps — Microsoft 365 Apps for Enterprise is the answer."
    },
    examples: [
      "Yes: Standard knowledge worker who uses Outlook for email, Teams for meetings / chat, SharePoint for the intranet, and OneDrive for personal files — O3 or O5.",
      "No: Engineer on a Google Workspace org who only needs Excel + PowerPoint installed for Office-format compatibility with external partners — M365 Apps for Enterprise.",
      "No: Migration scenario — org is still on on-premises Exchange / Skype for Business and has not moved to Microsoft cloud yet, but users need Office locally."
    ],
    techDocs: [
      ["Microsoft 365 Apps for Enterprise overview", "https://learn.microsoft.com/microsoft-365-apps/deploy/about-microsoft-365-apps"],
      ["Office 365 E1 / E3 / E5 service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["M365 Maps — Apps for Enterprise", "https://m365maps.com/Microsoft%20365%20Apps%20for%20enterprise.htm"]
    ],
    yes: "q_iw_o365_tier",
    no: "result_iw_apps"
  },
  q_iw_o365_tier: {
    step: { major: 2, sub: 3, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user need Office 365 E5-tier premium services — Microsoft Defender for Office 365 Plan 2 (Safe Links / Safe Attachments / anti-phish impersonation + Attack Simulation Training), Microsoft Purview E5 (Audit Premium, eDiscovery Premium, IRM, Communication Compliance, Customer Lockbox), Power BI Pro, OR Microsoft Teams Phone Standard?",
    help: "Office 365 E5 bundles those four uplifts (DfO P2 + Purview E5 + Power BI Pro + Teams Phone Standard) at one per-user price. Without any of those, Office 365 E3 (or E1 for web-only users) is meaningfully cheaper. NOTE: Office 365 E5 does NOT include Entra ID P2, Defender for Endpoint, Defender for Identity, or Defender for Cloud Apps — those need EMS E5 / Defender Suite / standalone SKUs added on top.",
    rationale: {
      why: "Office 365 E5 is the premium O365 tier. Buying O3 + DfO P2 + Power BI Pro + Audit Premium + Teams Phone separately is more expensive than O5 once you stack 3+ of those. If the user only needs the standard collab + desktop apps, O3 is the answer; if they live in the browser, O1 saves another $12 / user / month.",
      yes: "the user needs O5-tier premium — Office 365 E5 is the answer.",
      no: "continue to the desktop-apps question (O3 vs O1)."
    },
    techDocs: [
      ["Compare Office 365 plans (E1 / E3 / E5)", "https://www.microsoft.com/microsoft-365/business/compare-office-365-plans"],
      ["Defender for Office 365 P2 service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description#microsoft-defender-for-office-365"],
      ["Power BI Pro included in Office 365 E5", "https://learn.microsoft.com/power-bi/fundamentals/service-features-license-type"],
      ["Teams Phone Standard included in Office 365 E5", "https://www.microsoft.com/microsoft-teams/compare-microsoft-teams-options"]
    ],
    yes: "result_iw_o5",
    no: "q_iw_o365_desktop"
  },
  q_iw_o365_desktop: {
    step: { major: 2, sub: 3, subTotal: 3, label: "Knowledge worker tier" },
    question: "Does this user need INSTALLED desktop Office apps (Word / Excel / PowerPoint / Outlook running locally on Windows or Mac) — or is Office for the web (browser + mobile apps with the 10.9-inch screen limit) enough?",
    help: "Office 365 E1 (~$10 / user / month) includes Exchange (50 GB), Teams, SharePoint, OneDrive (1 TB), and Office for the web / mobile — but NOT the installed desktop apps. Office 365 E3 (~$23) adds the installed desktop apps + larger 100 GB mailbox + unlimited online archive + DLP. The 10.9-inch screen rule from Microsoft's mobile apps service description means Office on a tablet larger than 10.9 inches (most iPads, Surface) requires a commercial-use right that E1 does NOT carry on the desktop.",
    rationale: {
      why: "Office 365 E1 is the cheapest O365 tier with cloud collab. If the user only needs to read / light-edit in the browser and on their phone, E1 saves $13 / user / month over E3. The moment they need installed Outlook / Word / Excel locally, E3 is the floor.",
      yes: "the user needs installed desktop Office — Office 365 E3 is the answer.",
      no: "the user lives in the browser — Office 365 E1 is the answer."
    },
    techDocs: [
      ["Compare Office 365 plans (E1 / E3 / E5)", "https://www.microsoft.com/microsoft-365/business/compare-office-365-plans"],
      ["Office mobile apps — commercial-use rights & 10.9-inch screen rule", "https://learn.microsoft.com/office365/servicedescriptions/office-applications-service-description/office-applications-service-description"],
      ["Exchange Online plans (E1 = 50 GB, E3 = 100 GB)", "https://www.microsoft.com/microsoft-365/exchange/compare-microsoft-exchange-online-plans"]
    ],
    yes: "result_iw_o3",
    no: "result_iw_o1"
  },
  q_smb_collab: {
    step: { major: 2, sub: 1, subTotal: 3, label: "SMB tier" },
    question: "Does this user need MICROSOFT cloud collaboration services (Exchange Online mailbox, Microsoft Teams, SharePoint Online, OneDrive for Business) — OR do they ONLY need the installed Office apps (Word / Excel / PowerPoint / Outlook) on Windows or Mac?",
    help: "Microsoft 365 Apps for Business is the SMB-tier apps-only SKU — installed Office on up to 5 devices + 1 TB OneDrive, no Exchange / Teams / SharePoint cloud services. Cheaper than Business Basic / Standard / Premium when the org gets email and chat from a third party (Google Workspace, on-prem Exchange, etc.) or doesn't need them at all.",
    helpLink: { label: "Sizing a shared front-desk PC, lobby phone, or conference room? Per-device licensing is different — read this", target: "info_per_device_licensing" },
    rationale: {
      why: "Apps for Business is a separate Business-family SKU sold at the same 300-seat cap as the Basic / Standard / Premium tier — but excludes every Microsoft cloud service except 1 TB OneDrive. Many small businesses run Google Workspace for email + chat and just need Office apps for documents — those orgs over-pay if they buy Business Standard or Premium.",
      yes: "user needs cloud Exchange / Teams / SharePoint — continue to the Business Basic / Standard / Premium tree.",
      no: "user only needs installed Office apps + OneDrive — buy Microsoft 365 Apps for Business."
    },
    examples: [
      "Yes example: 40-person law firm that wants Outlook + Teams + a shared SharePoint document library + Word / Excel on every laptop. Continue to the Business tree.",
      "Yes example: 80-person SaaS startup running Microsoft 365 for email and meetings; needs the full collaboration stack. Continue to the Business tree.",
      "No example: 25-person agency on Google Workspace for Gmail + Google Meet that just needs installed Word / Excel for client deliverables. M365 Apps for Business is the right SKU.",
      "No example: 12-person CPA firm that uses on-premises Exchange + an old SharePoint server but wants modern Office desktop apps + cloud OneDrive on laptops. M365 Apps for Business.",
      "No example: 60-person manufacturing back-office on Slack + Gmail; documents live on a NAS but employees need Excel. Apps for Business covers it."
    ],
    techDocs: [
      ["Microsoft 365 Apps for Business — overview", "https://www.microsoft.com/microsoft-365/business/microsoft-365-apps-for-business"],
      ["Compare Microsoft 365 Business plans (Apps for Business + Basic / Standard / Premium)", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Office applications service description (Apps for Business install rights)", "https://learn.microsoft.com/office365/servicedescriptions/office-applications-service-description/office-applications-service-description"],
      ["Microsoft 365 Business 300-seat limit (applies to Apps for Business too)", "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan"]
    ],
    yes: "q_smb_office",
    no: "result_smb_apps"
  },
  q_smb_office: {
    step: { major: 2, sub: 2, subTotal: 3, label: "SMB tier" },
    question: "Do users need the desktop Office apps installed (Word / Excel / PowerPoint / Outlook running on Windows or Mac), or is Office for the web enough?",
    help: "Business Basic = web/mobile Office only. Business Standard = Basic + installed desktop apps. Business Premium = Standard + Defender for Business + Intune + Entra ID P1.",
    rationale: {
      why: "Microsoft prices the three Business SKUs by what's installed. Web-only is the cheapest tier; installed desktop apps and security each step up the price.",
      yes: "users need installed desktop Office — Standard or Premium tier next.",
      no: "users are fine with Office for the web — Basic or Premium tier next."
    },
    techDocs: [
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft 365 Business 300-seat limit", "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan"]
    ],
    yes: "q_smb_security",
    no: "q_smb_security_basic"
  },
  q_smb_security: {
    step: { major: 2, sub: 3, subTotal: 3, label: "SMB tier" },
    question: "Do you need Microsoft Defender for Business + Microsoft Intune device management + Microsoft Entra ID P1 (Conditional Access + MFA enforcement + group-based licensing)?",
    help: "Business Premium is the only Business SKU that bundles serious security + device management + Conditional Access.",
    rationale: {
      why: "Defender for Business + Intune + Entra ID P1 together cost more as separate add-ons than the Business Premium delta over Business Standard.",
      yes: "buy Business Premium — bundles all three.",
      no: "buy Business Standard — installed Office without the security uplift."
    },
    techDocs: [
      ["Microsoft 365 Business Premium overview", "https://learn.microsoft.com/microsoft-365/business-premium/"],
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft Defender for Business — overview", "https://learn.microsoft.com/defender-business/mdb-overview"]
    ],
    yes: "result_smb_premium",
    no: "result_smb_standard"
  },
  q_smb_security_basic: {
    step: { major: 2, sub: 3, subTotal: 3, label: "SMB tier" },
    question: "Do you need Microsoft Defender for Business + Microsoft Intune device management + Microsoft Entra ID P1 (Conditional Access + MFA enforcement + group-based licensing)?",
    help: "Business Premium is the only Business SKU that bundles serious security + device management + Conditional Access. It includes installed Office too.",
    rationale: {
      why: "Defender for Business + Intune + Entra ID P1 together cost more as separate add-ons than the Business Premium delta — and Premium also includes installed Office.",
      yes: "buy Business Premium — bundles all three (and installed Office).",
      no: "buy Business Basic — web/mobile Office without security uplift."
    },
    techDocs: [
      ["Microsoft 365 Business Premium overview", "https://learn.microsoft.com/microsoft-365/business-premium/"],
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft Defender for Business — overview", "https://learn.microsoft.com/defender-business/mdb-overview"]
    ],
    yes: "result_smb_premium",
    no: "result_smb_basic"
  },
  q_frontline_eligibility: {
    step: { major: 2, sub: 1, subTotal: 14, label: "Frontline · eligibility · role" },
    question: "Does this user's PRIMARY work involve serving customers / the public directly — OR are they involved in services, support, selling products, manufacturing, or distribution?",
    help: "First of THREE frontline-eligibility criteria. Microsoft's frontline definition opens with a role / industry criterion: workers who 'work directly with customers or the general public — they provide services, support, and sell products, or are directly involved in the manufacturing and distribution of products and services.' This question isolates that role / industry test. The next two questions cover the workplace pattern and the explicit exclusions.",
    rationale: {
      why: "Microsoft Learn frames frontline as a role / industry category before anything else: customer-facing service, support, sales, or manufacturing / distribution work. If the user's primary job is none of those (e.g. HQ knowledge work, IT admin, software development) they almost certainly do NOT belong on F.",
      yes: "the role / industry criterion is met — continue to the workplace-pattern check (criterion 2 of 3).",
      no: "this user's role does NOT match Microsoft's frontline category. Drop straight to the information-worker tree to land on E3 / E3 + Copilot / E5 / E7."
    },
    examples: [
      "Yes example: Retail store associate at a POS interacting with shoppers, running returns, looking up product info.",
      "Yes example: Hospital nurse, paramedic, or clinical aide providing patient care.",
      "Yes example: Warehouse picker, factory-line operator, delivery driver, freight handler — manufacturing / distribution work.",
      "Yes example: Hotel front-desk agent, restaurant server, barista, hospitality concierge, bank teller — service / support.",
      "Yes example: Field service technician on a customer site installing or repairing equipment.",
      "No example: HQ marketing manager authoring campaign decks and creative briefs all day.",
      "No example: Backend engineer writing code; SRE running production infrastructure.",
      "No example: Finance analyst building forecasts in Excel; HR generalist managing benefits and policies."
    ],
    techDocs: [
      ["Understand frontline worker user types and licensing (Microsoft's definition + role criteria)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/flw-licensing-options?view=o365-worldwide"],
      ["Microsoft 365 for frontline workers — overview", "https://learn.microsoft.com/en-us/microsoft-365/frontline/?view=o365-worldwide"],
      ["Microsoft 365 Frontline — plans & pricing (F1 / F3 comparison)", "https://www.microsoft.com/en-us/microsoft-365/enterprise/frontline-plans-and-pricing"]
    ],
    frontline: {
      no: { ineligible: true }
    },
    yes: "q_frontline_workplace",
    no: "q_iw_platform"
  },
  q_frontline_workplace: {
    step: { major: 2, sub: 2, subTotal: 14, label: "Frontline · eligibility · workplace pattern" },
    question: "Does this user typically work AWAY from a dedicated headquarters desk — on shop floors, customer sites, vehicles, hospital wards, retail floors, warehouses, kitchens, manufacturing lines — usually on mobile devices, shared kiosks, or rugged handhelds rather than a personal laptop / workstation?",
    help: "Second of THREE frontline-eligibility criteria. Microsoft's frontline definition emphasizes the WORK PATTERN: 'workers who are on the go, often on mobile devices.' F1 and F3 are priced and feature-shaped around that pattern — Teams Walkie Talkie, Shifts, Tasks, shared-device sign-in, mobile / web Office. A user who SITS at a dedicated HQ desk with a personal laptop is typically NOT frontline even if their job involves customer interaction — they're a knowledge worker who happens to talk to customers.",
    helpLink: { label: "Profiling a SHARED device (kiosk, lobby phone, classroom PC, conference room) instead of a user? Read this first", target: "info_per_device_licensing" },
    rationale: {
      why: "F SKUs are scoped to a deskless / on-the-go / shared-device work pattern. Microsoft polices F misassignment to HQ desk workers during licensing reviews. A customer-facing user who works from an assigned desk with a dedicated laptop and a 50 GB mailbox is a knowledge worker on E, not a frontline worker on F.",
      yes: "the workplace-pattern criterion is met — continue to the final exclusion check (criterion 3 of 3).",
      no: "this user works primarily from a dedicated desk and doesn't match Microsoft's frontline pattern. Drop to the information-worker tree even though the role criterion was met."
    },
    examples: [
      "Yes example: Store associate signing in to a shared iPad at the POS for their shift, then signing out at the end of shift.",
      "Yes example: Nurse using a workstation-on-wheels and a hospital-issued mobile phone, no dedicated laptop.",
      "Yes example: Field service technician working from a phone and rugged tablet, visiting different customer sites each day.",
      "Yes example: Warehouse picker with a handheld scanner; truck driver with a delivery phone and Teams Walkie Talkie.",
      "No example: HQ customer-success manager sitting at an assigned desk with a laptop and dual monitors all day.",
      "No example: Call-center agent with a dedicated PC at a contact-center desk — typically licensed at E-tier; if it's a Microsoft-platform contact center, evaluate Digital Contact Center Platform separately.",
      "No example: Branch-office banker with a dedicated workstation and personal Outlook desktop — knowledge worker on E, even though they meet customers."
    ],
    techDocs: [
      ["Understand frontline worker user types and licensing (work-pattern definition)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/flw-licensing-options?view=o365-worldwide"],
      ["Changing from a Microsoft 365 E plan to a Microsoft 365 F plan (when re-licensing makes sense vs. when it doesn't)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide"],
      ["Shared device sign-in for frontline workers", "https://learn.microsoft.com/en-us/microsoft-365/frontline/flw-shared-devices?view=o365-worldwide"]
    ],
    frontline: {
      no: { ineligible: true }
    },
    yes: "q_frontline_exclusion",
    no: "q_iw_platform"
  },
  q_frontline_exclusion: {
    step: { major: 2, sub: 3, subTotal: 14, label: "Frontline · eligibility · exclusions" },
    question: "Is this user clearly NOT a headquarters information worker, IT administrator, or software developer?",
    help: "Third of THREE frontline-eligibility criteria — the final exclusion gate. Microsoft explicitly EXCLUDES three categories from F licensing regardless of how mobile they are: (a) information workers (HQ knowledge workers authoring documents and analysis at a desk), (b) IT administrators (helpdesk, sysadmins, identity / security / Intune / Exchange admins), and (c) software developers. These users may TOUCH frontline tooling (e.g. an IT admin configuring Teams Shifts for store staff) but they themselves must be licensed at E-tier, not F. When unsure, default to NO — the compliance cost of mis-licensing F to an HQ user is far higher than the price difference of buying E.",
    rationale: {
      why: "Microsoft's frontline Use Rights explicitly exclude information workers, IT administrators, and software developers. Mis-licensing these categories with F is a Product Terms compliance issue that surfaces in Microsoft licensing reviews and audits — and it's the single most common F-misassignment finding.",
      yes: "the user is NOT a HQ knowledge worker, IT admin, or developer — all three eligibility criteria are now met. Continue through the E-vs-F feature wizard to land on F1 / F3 (plus any approved add-ons) or, if too many features push past F's ceiling, an E uplift.",
      no: "the user IS a HQ knowledge worker, IT admin, or developer — they must be licensed at E-tier. Drop to the information-worker tree to land on E3 / E3 + Copilot / E5 / E7."
    },
    examples: [
      "Yes example: Retail store associate — not HQ, not IT, not developer. Continues to F.",
      "Yes example: Hospital nurse — not HQ, not IT, not developer. Continues to F.",
      "Yes example: Delivery driver, factory-line worker, warehouse picker — none are HQ / IT / developer. Continue to F.",
      "Yes example: Hotel housekeeper, restaurant server, security guard — service workers, not HQ / IT / developer.",
      "No example: HR generalist at HQ — information worker, must license at E (not F) regardless of mobility.",
      "No example: IT helpdesk technician — IT admin. License at E and check the admin tree — they may also be a privileged admin needing Entra ID P2.",
      "No example: Backend engineer or data engineer writing code — developer, license at E.",
      "No example: Solution architect, consultant, or pre-sales engineer who travels but produces architecture docs and proposals — knowledge worker, license at E."
    ],
    techDocs: [
      ["Understand frontline worker user types and licensing (definition + exclusions)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/flw-licensing-options?view=o365-worldwide"],
      ["Microsoft 365 Enterprise — plans & pricing (E3 / E5 alternatives when F doesn't fit)", "https://www.microsoft.com/en-us/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (frontline Use Rights + exclusions)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["Microsoft 365 — Licensing Resources and Documents (canonical hub: plan comparisons, service descriptions, Product Terms)", "https://www.microsoft.com/licensing/docs/view/Microsoft-365"]
    ],
    frontline: {
      yes: { flag: { key: "eligible", value: true } },
      no: { ineligible: true }
    },
    yes: "q_frontline_desktop_apps",
    no: "q_iw_platform"
  },
  q_frontline_desktop_apps: {
    step: { major: 2, sub: 4, subTotal: 14, label: "Frontline · feature gap" },
    question: "Does this user need the installed Microsoft 365 desktop apps (Word, Excel, PowerPoint, OneNote, Outlook, Access, Publisher) on a Windows or Mac PC?",
    help: "F1 and F3 do NOT include the desktop Office client apps — by design. F3 includes Office for the web and Office mobile apps; F1 is read-only for both. If this user authors documents on a desktop PC, that's an E-tier requirement and a hard fail for any F SKU.",
    rationale: {
      why: "Per Microsoft Learn's E-vs-F comparison table, the desktop client apps (Word, Excel, PowerPoint, OneNote, Outlook, Access, Publisher) are an E-tier benefit — they are explicitly NOT in any F plan and cannot be added as a frontline add-on.",
      yes: "this is a hard fail for F SKUs — no Microsoft add-on bolts the installed desktop apps onto F1 / F3. Switch to E3 (or higher) as the baseline.",
      no: "stay in the F evaluation — Office for the web (F3) or read-only access (F1) is enough."
    },
    examples: [
      "Yes example: User edits Excel macros (.xlsm) regularly — macros do not run in Excel for the web.",
      "Yes example: User uses Outlook desktop with .pst archives and 50+ MB attachments — F has no Outlook desktop.",
      "No example: Store manager reviews policy PDFs and submits a weekly form in Word for the web — F3 covers this."
    ],
    techDocs: [
      ["Changing from E to F — Microsoft 365 apps table", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#microsoft-365-apps"],
      ["Office for the web service description", "https://learn.microsoft.com/en-us/office365/servicedescriptions/office-online-service-description/office-online-service-description"]
    ],
    frontline: {
      yes: { hardFail: { key: "desktop_apps", reason: "User needs installed desktop Office apps (Word / Excel / PowerPoint / Outlook etc.). No frontline add-on bolts desktop Office onto F1 / F3 — this is an E-tier benefit.", upgrade: "e3" } }
    },
    yes: "q_frontline_screen_size",
    no: "q_frontline_screen_size"
  },
  q_frontline_screen_size: {
    step: { major: 2, sub: 5, subTotal: 14, label: "Frontline · feature gap" },
    question: "Will this user run the Microsoft 365 mobile apps on a device with a screen LARGER than 10.9 inches (iPad Pro 12.9″, Surface Pro, larger Android tablets, etc.)?",
    help: "F1 / F3 mobile-app commercial-use rights are explicitly capped at devices with integrated screens UNDER 10.9 inches. Larger tablets that run Office mobile apps cross into Office desktop licensing territory and require an E SKU.",
    rationale: {
      why: "Microsoft Learn states in the E-vs-F comparison: 'F plans are limited to devices with integrated screens smaller than 10.9 inches on Microsoft 365 for mobile apps.' Above that line, the device counts as a primary work device and requires Microsoft 365 Apps / E3 / E5 commercial-use rights.",
      yes: "hard fail for F — there is no add-on that grants commercial-use rights on >10.9″ devices to an F user. Recommend E3.",
      no: "stay in F evaluation — phones and smaller tablets are exactly the F target form factor."
    },
    examples: [
      "Yes example: Field engineer issued a 12.9″ iPad Pro to author inspection reports — over the 10.9″ limit, must be E.",
      "No example: Sales associate with a 10.2″ iPad shared across the team — under the limit, F is fine."
    ],
    techDocs: [
      ["E vs F differences — mobile apps (10.9″ cap is footnote 1)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#microsoft-365-apps"],
      ["Microsoft 365 mobile apps commercial-use rights", "https://www.microsoft.com/en-us/microsoft-365/mobile"]
    ],
    frontline: {
      yes: { hardFail: { key: "screen_size", reason: "User runs M365 mobile apps on a device with a screen >10.9″ (iPad Pro / Surface Pro / large Android tablet). Microsoft caps F-plan mobile commercial-use rights at <10.9″ screens — there is no add-on. Requires E3 or higher.", upgrade: "e3" } }
    },
    yes: "q_frontline_mailbox",
    no: "q_frontline_mailbox"
  },
  q_frontline_mailbox: {
    step: { major: 2, sub: 6, subTotal: 14, label: "Frontline · mailbox" },
    question: "Does this user need their own personal Exchange Online mailbox (user@domain.com), as opposed to communicating only via shared mailboxes / Teams / Viva Engage?",
    help: "F1 has NO personal mailbox per the Exchange Online service-description limits — Microsoft provisions Exchange Online Kiosk-class plan only so the Teams calendar / free-busy works, and Microsoft recommends disabling Outlook on the web for F1 users. F3 includes a 2 GB Exchange Online mailbox (no archive mailbox; Recoverable Items quota 30 GB normal / 100 GB on hold) accessible via Outlook on the web and Outlook mobile.",
    rationale: {
      why: "The mailbox question is the single biggest F1 → F3 driver. F3 roughly quadruples the F1 list price ($2.25 → $8.00) because of the 2 GB mailbox + mobile Office uplift.",
      yes: "needs a personal mailbox — F3 base is the floor (we'll check mailbox size next to see if you need to swap to Exchange Online Plan 2).",
      no: "F1 base is the floor — they can use shared inboxes (free) and Teams for communications."
    },
    examples: [
      "Yes example: Store manager who corresponds with vendors by email at firstname@retailco.com.",
      "Yes example: Healthcare nurse who receives shift schedules and PHI-tagged emails personally.",
      "No example: Warehouse picker who only uses Teams chat + Walkie Talkie + Shifts on a shared device — never receives email."
    ],
    techDocs: [
      ["E vs F differences — Email section (F1 has no mailbox rights)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#email"],
      ["Compare frontline plans (F1 vs F3)", "https://learn.microsoft.com/microsoft-365/frontline/flw-licensing-options"],
      ["Exchange Online service-description limits (mailbox storage table: F1 / F3 / E3 / E5 sizes)", "https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits#mailbox-storage-limits"]
    ],
    frontline: {
      yes: { flag: { key: "needsMailbox", value: true } }
    },
    yes: "q_frontline_mailbox_size",
    no: "q_frontline_archive_mailbox"
  },
  q_frontline_mailbox_size: {
    step: { major: 2, sub: 7, subTotal: 14, label: "Frontline · mailbox" },
    question: "Will this user's mailbox stay UNDER 2 GB?",
    help: "F3's mailbox is capped at 2 GB per the Exchange Online service-description limits (Prohibit Send/Receive at 2 GB, Prohibit Send at 1.98 GB, Warning at 1.96 GB). If the user receives more than 2 GB of mail (typical for managers / heavy email recipients), they need Exchange Online Plan 2 ($8 / user / month, 100 GB mailbox + 100 GB → 1.5 TB auto-expanding archive) layered over F3 — OR you should re-evaluate against E3 which already includes a 100 GB mailbox. Note: Exchange Online Protection (EOP) is the free email security service included in every M365 plan; what you actually buy to bump the mailbox is Exchange Online Plan 2. Message size limit is 150 MB Outlook / 112 MB OWA / 33 MB Outlook mobile regardless of plan.",
    rationale: {
      why: "Over 2 GB the F3 mailbox is the bottleneck. F + Exchange Online Plan 2 = $8 + $8 = $16; that's still well under E3 ($36). But once you start stacking add-ons, the total climbs and E3 may win on value.",
      yes: "stay on F3's bundled 2 GB mailbox — no add-on needed.",
      no: "add Exchange Online Plan 2 (100 GB primary + 100 GB → 1.5 TB auto-expanding archive) — the wizard tracks the +$8 / user / month."
    },
    examples: [
      "Yes example: Store associate who gets a few internal emails per day and Teams notifications — well under 2 GB.",
      "No example: District manager copied on every vendor PO and HR escalation — burns through 2 GB in a quarter."
    ],
    techDocs: [
      ["E vs F mailbox sizes table", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#email"],
      ["Exchange Online plans & pricing", "https://www.microsoft.com/en-us/microsoft-365/exchange/compare-microsoft-exchange-online-plans"],
      ["Exchange Online service-description limits — mailbox storage & capacity alerts (exact 2 GB / 50 GB / 100 GB / 1.5 TB tier numbers)", "https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits#mailbox-storage-limits"]
    ],
    frontline: {
      no: { addon: { key: "exchange_online_p2" } }
    },
    yes: "q_frontline_archive_mailbox",
    no: "q_frontline_archive_mailbox"
  },
  q_frontline_archive_mailbox: {
    step: { major: 2, sub: 8, subTotal: 14, label: "Frontline · compliance" },
    question: "Does this user need an Exchange Online archive mailbox or delegate-access mailbox features (delegated calendars, send-on-behalf-of, shared-mailbox delegation)?",
    help: "F1 and F3 do NOT include an archive mailbox OR delegate access — both are E-tier features per the E-vs-F comparison and the Exchange Online service-description limits (Archive mailbox row: Frontline = 'Not available'; Kiosk = N/A; Plan 1 = 50 GB; Plan 2 = 1.5 TB auto-expanding from initial 100 GB). Adding Exchange Online Plan 2 ($8) on top of F3 brings the 100 GB → 1.5 TB auto-expanding archive plus delegate access. Recoverable Items quotas: 30 GB normal, 100 GB on hold (primary mailbox); 1.5 TB inside the auto-expanding archive when Plan 2 is in effect.",
    rationale: {
      why: "Archive + delegate-access are part of Exchange Online Plan 2 — they don't exist as standalone add-ons on F SKUs. If both mailbox size > 2 GB AND archive are needed, EOP2 covers both with the same $8 add-on.",
      yes: "ensure Exchange Online Plan 2 is in the cart (the wizard adds it automatically) — if it's already there from the mailbox-size step, no double-charge.",
      no: "no archive add-on needed."
    },
    examples: [
      "Yes example: Compliance-sensitive role (healthcare, finance) where retention policies require multi-year mailbox archive.",
      "No example: Frontline associate who clears their inbox weekly and never delegates."
    ],
    techDocs: [
      ["E vs F email features (Archive mailbox / Delegate access rows)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#email"],
      ["Exchange Online Plan 2 — service description", "https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-service-description"],
      ["Exchange Online limits — mailbox folder & archive storage (100 GB → 1.5 TB auto-expanding behaviour, Recoverable Items 30 GB / 100 GB on hold)", "https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits#mailbox-folder-limits"],
      ["Overview of auto-expanding archiving (how the 100 GB → 1.5 TB ramp is triggered)", "https://learn.microsoft.com/en-us/purview/autoexpanding-archiving"]
    ],
    frontline: {
      yes: { addon: { key: "exchange_online_p2" } }
    },
    yes: "q_frontline_onedrive",
    no: "q_frontline_onedrive"
  },
  q_frontline_onedrive: {
    step: { major: 2, sub: 9, subTotal: 14, label: "Frontline · storage" },
    question: "Will this user need MORE than 2 GB of personal OneDrive storage?",
    help: "F1 and F3 are capped at 2 GB of OneDrive. There is no per-user OneDrive add-on for F SKUs that lifts the cap — Microsoft directs you to E3 (1+ TB OneDrive) if the cap is a blocker. Important workaround: most frontline workers can use SharePoint document libraries or Teams channel files instead of personal OneDrive.",
    rationale: {
      why: "OneDrive cap is a hard ceiling on F. The fix is either 'move files to SharePoint / Teams' (free) or 'switch to E3' (extra $28 / user / month over F3 just for storage).",
      yes: "hard fail for F — no per-user OneDrive add-on lifts the cap. Recommend E3.",
      no: "stay in F evaluation — 2 GB is enough."
    },
    examples: [
      "Yes example: Field photographer storing weekly site photos in personal OneDrive — easily over 2 GB.",
      "No example: Worker who edits documents in shared SharePoint sites and Teams channels (the org's actual storage, not personal OneDrive)."
    ],
    techDocs: [
      ["E vs F OneDrive table (2 GB cap, OneDrive becomes read-only over cap)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#onedrive"]
    ],
    frontline: {
      yes: { hardFail: { key: "onedrive_storage", reason: "User needs >2 GB OneDrive. F1 / F3 are capped at 2 GB and there is no per-user OneDrive add-on. The fix is either move files to SharePoint / Teams or recommend E3 (1+ TB included).", upgrade: "e3" } }
    },
    yes: "q_frontline_teams_phone",
    no: "q_frontline_teams_phone"
  },
  q_frontline_teams_phone: {
    step: { major: 2, sub: 10, subTotal: 14, label: "Frontline · communications" },
    question: "Does this user need Teams Phone (PSTN calling — dial public phone numbers from Teams)?",
    help: "F1 / F3 with Teams include chat, channels, meetings, and apps — but NOT Teams Phone (PSTN calling). Microsoft sells a dedicated frontline add-on: Teams Phone Standard for Frontline Workers (~$4 / user / month), authorised for F1 / F3 users specifically. Pair with a Calling Plan or Direct Routing for PSTN dial tone.",
    rationale: {
      why: "Teams Phone is a per-user add-on. Microsoft created the 'Standard for Frontline Workers' SKU specifically so F users can have calling without uplift to E5 (which bundles Teams Phone).",
      yes: "add Teams Phone Standard for Frontline Workers (the wizard adds +$4).",
      no: "no calling add-on needed."
    },
    examples: [
      "Yes example: Store manager who answers customer calls forwarded from the store's main number.",
      "No example: Floor associate who only uses Teams chat and Walkie Talkie."
    ],
    techDocs: [
      ["E vs F Teams Phone Standard for Frontline Workers row", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#teams"],
      ["Teams add-on licensing — Phone for Frontline Workers", "https://learn.microsoft.com/en-us/microsoftteams/teams-add-on-licensing/microsoft-teams-add-on-licensing"]
    ],
    frontline: {
      yes: { addon: { key: "teams_phone_frontline" } }
    },
    yes: "q_frontline_meetings",
    no: "q_frontline_meetings"
  },
  q_frontline_meetings: {
    step: { major: 2, sub: 11, subTotal: 14, label: "Frontline · communications" },
    question: "Does this user need to HOST town halls, webinars, or large-audience structured meetings (not just join them)?",
    help: "Hosting town halls and webinars requires the Teams Enterprise add-on on top of F SKUs. Joining a town hall / webinar that someone else organised does NOT require the add-on. The Microsoft 365 + Teams 2025 packaging update introduced this layer.",
    rationale: {
      why: "Per the E-vs-F comparison, town hall and webinar hosting are 'Available by adding Teams Enterprise or Teams EEA' on F plans. The Teams Enterprise add-on lists at $5.25 / user / month.",
      yes: "add Teams Enterprise add-on (+$5.25).",
      no: "F's bundled Teams chat / channels / regular meetings is enough."
    },
    examples: [
      "Yes example: Field operations lead who runs monthly all-hands town halls for 500 frontline staff — needs to host.",
      "No example: Frontline employee who joins the company town hall from a tablet — no host license needed."
    ],
    techDocs: [
      ["E vs F Teams (Town hall / Webinars rows)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide#teams"],
      ["Microsoft 365 + Teams 2025 packaging update", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ],
    frontline: {
      yes: { addon: { key: "teams_enterprise_addon" } }
    },
    yes: "q_frontline_defender_endpoint",
    no: "q_frontline_defender_endpoint"
  },
  q_frontline_defender_endpoint: {
    step: { major: 2, sub: 12, subTotal: 14, label: "Frontline · security" },
    question: "Does this user's device need Microsoft Defender for Endpoint (next-gen AV + attack-surface reduction + EDR)?",
    help: "F1 / F3 do NOT bundle Defender for Endpoint. Add Defender for Endpoint Plan 1 (~$3 / user / month) for next-gen AV + ASR + manual response; add Plan 2 (~$5.20) for EDR + automated investigation + threat hunting + vulnerability management. Microsoft also sells a frontline-specific 'Defender Suite FLW' bundle (Defender XDR for F1 / F3 users) that may be cheaper than stacking individual Defender add-ons — confirm availability and pricing with your Microsoft account team (it is not publicly listed).",
    rationale: {
      why: "Defender for Endpoint is per-user (with per-device fallback for kiosk scenarios). Plan 1 is the minimum any Microsoft-managed Windows device should run; Plan 2 is the SOC-grade tier.",
      yes: "add Defender for Endpoint Plan 1 (the wizard adds +$3 — bump to P2 manually if you need EDR + threat hunting, or ask about the Defender Suite FLW bundle).",
      no: "no endpoint AV add-on (verify the device is protected by another vendor's AV)."
    },
    examples: [
      "Yes example: Windows POS terminal that browses the internet for product lookups — Plan 1 minimum.",
      "Yes example: Shared workstation that handles PII / PHI — Plan 2 for EDR + auto-response.",
      "No example: Locked-down kiosk that only runs one signed Teams app — already protected by Windows Defender baseline."
    ],
    techDocs: [
      ["Microsoft Defender for Endpoint Plan 1 vs Plan 2", "https://learn.microsoft.com/en-us/defender-endpoint/defender-endpoint-plan-1-2"],
      ["Defender for Endpoint licensing options for frontline / F SKUs", "https://learn.microsoft.com/en-us/defender-endpoint/minimum-requirements"],
      ["Modern Work Plan Comparison PDF — Defender Suite FLW row (frontline-specific Defender bundle)", "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/education/Modern-Work-Plan-Comparison-Enterprise-5-1-2026.pdf"]
    ],
    frontline: {
      yes: { addon: { key: "defender_endpoint_p1" } }
    },
    yes: "q_frontline_defender_office",
    no: "q_frontline_defender_office"
  },
  q_frontline_defender_office: {
    step: { major: 2, sub: 13, subTotal: 14, label: "Frontline · security" },
    question: "Does this user need Microsoft Defender for Office 365 Plan 2 (Threat Explorer, Attack Simulation Training, Threat Trackers, Campaign Views — i.e. SOC-grade email security)?",
    help: "F3 already includes Defender for Office 365 Plan 1 (Safe Links + Safe Attachments). F1 has no mailbox so Defender for Office doesn't apply. Plan 2 (+$5 over P1) layers SOC tooling on top.",
    rationale: {
      why: "Plan 2 is what a security team uses to investigate phishing campaigns and run user simulation training. Most frontline cohorts can live on P1 (already bundled in F3).",
      yes: "add Defender for Office 365 Plan 2 (+$5).",
      no: "F3's bundled Plan 1 is enough (F1 has no mailbox so this doesn't apply)."
    },
    examples: [
      "Yes example: Healthcare role where the SOC needs Threat Explorer to investigate spear-phishing against named clinicians.",
      "No example: Retail associate whose mailbox is low-risk and only used for HR comms."
    ],
    techDocs: [
      ["Microsoft Defender for Office 365 — Plan 1 vs Plan 2", "https://learn.microsoft.com/en-us/defender-office-365/mdo-about"]
    ],
    frontline: {
      yes: { addon: { key: "defender_office_p2" } }
    },
    yes: "q_frontline_purview",
    no: "q_frontline_purview"
  },
  q_frontline_purview: {
    step: { major: 2, sub: 14, subTotal: 14, label: "Frontline · compliance & AI" },
    question: "Does this user need Microsoft Purview E5 Compliance — full DLP across endpoints / SharePoint / OneDrive, Insider Risk Management, Communication Compliance, eDiscovery Premium, Customer Lockbox?",
    help: "F1 / F3 do NOT include Purview E5 features. You can layer the Microsoft 365 E5 Compliance add-on (~$12 / user / month) on top of F SKUs, but at that price point + F3 base + likely other add-ons, the math almost always favours uplifting to M365 E5 ($57) which bundles Purview E5 + Defender XDR + Entra ID P2 + Power BI Pro + Teams Phone. Microsoft also sells frontline-specific 'Purview Suite FLW' and combined 'Defender + Purview Suite FLW' bundles (Purview E5 features for F1 / F3 users) — these are not publicly priced; ask your Microsoft account team whether they apply before assuming an E5 uplift.",
    rationale: {
      why: "Purview E5 is the highest-priced add-on Microsoft sells for compliance. It exists as an F-compatible add-on, but the cumulative F + Phone + EOP2 + Defender P2 + Office P2 + Purview stack usually crosses the E5 list price. The wizard will flag the cheaper recommendation in the final result.",
      yes: "this is borderline — the wizard records it and the final result will tell you whether F3 + add-ons or M365 E5 is cheaper. Likely E5 (or the Purview Suite FLW bundle if your account team confirms it).",
      no: "no Purview add-on — F's bundled basic eDiscovery / retention is enough."
    },
    examples: [
      "Yes example: Frontline cohort in a regulated industry (financial advice, healthcare) where IRM and Comm Compliance are mandatory across the workforce.",
      "No example: Retail floor staff whose only sensitive data is the schedule and the price list."
    ],
    techDocs: [
      ["Microsoft 365 E5 Compliance add-on (Purview plans)", "https://www.microsoft.com/en-us/security/business/compliance/compliance-plans"],
      ["Purview service description — which users need a licence", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#which-users-need-a-license"],
      ["Modern Work Plan Comparison PDF — Purview Suite FLW & Defender+Purview Suite FLW rows (frontline-specific compliance bundles)", "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/education/Modern-Work-Plan-Comparison-Enterprise-5-1-2026.pdf"]
    ],
    frontline: {
      yes: { addon: { key: "purview_dlp" }, softFlag: { key: "considerE5" } }
    },
    yes: "q_frontline_copilot",
    no: "q_frontline_copilot"
  },
  q_frontline_copilot: {
    step: { major: 2, sub: 14, subTotal: 14, label: "Frontline · compliance & AI", secondary: true },
    question: "Does this user need Microsoft 365 Copilot (AI in Office, Teams, and Copilot Chat)?",
    help: "Microsoft 365 Copilot lists at $30 / user / month as a per-user add-on. Microsoft has begun authorising Copilot for select frontline scenarios — verify availability for F1 / F3 with your account team before purchasing. Copilot for Frontline is being rolled out in 2025–2026 packaging updates.",
    rationale: {
      why: "Copilot is the single most expensive per-user add-on in the M365 catalog. On F3 it almost doubles total seat cost. AI-assisted summary at the end of the wizard surfaces whether Copilot pushes you past E5 + Copilot list price (where E7 / Frontier may win).",
      yes: "add Microsoft 365 Copilot (+$30). The wizard's final summary will compare against E5 + Copilot.",
      no: "no Copilot add-on."
    },
    examples: [
      "Yes example: Store manager piloting Copilot in Outlook to draft customer-issue responses faster.",
      "No example: Frontline associate whose workload is fully task-driven (Shifts / Walkie Talkie) and doesn't author content."
    ],
    techDocs: [
      ["Microsoft 365 Copilot — plans & pricing", "https://www.microsoft.com/en-us/microsoft-365/copilot/copilot-for-work"],
      ["Microsoft 365 Copilot service description", "https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-licensing"]
    ],
    frontline: {
      yes: { addon: { key: "copilot_m365" } }
    },
    yes: "result_frontline_computed",
    no: "result_frontline_computed"
  },
  q_edu_security: {
    step: { major: 2, sub: 1, subTotal: 2, label: "Education tier" },
    question: "Does the institution need E5-tier security and compliance for these users — Defender XDR, Defender for Endpoint, Defender for Identity, Defender for Cloud Apps, Purview E5 (IRM / eDiscovery Premium / Audit Premium), or Entra ID P2 (PIM / Identity Protection)?",
    help: "A5 mirrors commercial E5 at academic pricing. A3 mirrors E3. A1 is web/mobile only with no installed desktop apps (free for qualifying students).",
    rationale: {
      why: "A5 layers Defender Suite + Purview E5 + Entra ID P2 on A3 — same delta as commercial E5 over E3, at academic pricing.",
      yes: "buy A5 — the top education SKU with full security stack.",
      no: "drop into the A1 vs A3 disambiguation next."
    },
    techDocs: [
      ["Compare M365 Education plans (A1 / A3 / A5)", "https://www.microsoft.com/education/products/office"],
      ["Microsoft 365 Education service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education"]
    ],
    yes: "result_edu_a5",
    no: "q_edu_office"
  },
  q_edu_office: {
    step: { major: 2, sub: 2, subTotal: 2, label: "Education tier" },
    question: "Do users need the desktop Office apps installed, Exchange Online mailboxes, and Microsoft Intune device management?",
    help: "A3 includes desktop Office + Exchange + Intune + Entra ID P1 + AIP P1 + Defender for Office P1. A1 is web/mobile Office only and is free for qualifying students.",
    rationale: {
      why: "A1 is the entry tier (free for students); A3 is the standard paid academic SKU with installed Office and security baseline.",
      yes: "buy A3 — installed Office + Exchange + Intune.",
      no: "buy A1 — web/mobile only; free for qualifying students."
    },
    techDocs: [
      ["Compare M365 Education plans (A1 / A3 / A5)", "https://www.microsoft.com/education/products/office"],
      ["Microsoft 365 Education service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education"]
    ],
    yes: "result_edu_a3",
    no: "result_edu_a1"
  },
  q_gov_profile_cloud: {
    choice: true,
    step: { major: 2, sub: 1, subTotal: 2, label: "Government tier" },
    question: "Which US sovereign cloud will this user run in?",
    help: "Each US sovereign cloud has different accreditation, feature parity, and cross-cloud collaboration rules. Pick once — all downstream answers and links adapt to the cloud.",
    helpLink: { label: "Background — sovereign cloud feature parity & compliance", target: "info_sovereign_cloud" },
    choices: [
      { label: "GCC", sublabel: "FedRAMP High / DoD IL2 — most US civilian and SLG.", icon: "1", tone: "primary", value: "gcc", target: "q_gov_profile_tier" },
      { label: "GCC High", sublabel: "FedRAMP High / DoD IL4 / DFARS 7012 / ITAR — DIB & CMMC L2+.", icon: "2", tone: "primary", value: "gcc_high", target: "q_gov_profile_tier" },
      { label: "DoD", sublabel: "DoD IL5 — US Department of Defense only.", icon: "3", tone: "primary", value: "dod", target: "q_gov_profile_tier" },
      { label: "Air-Gapped (Top Secret / DoD IL6)", sublabel: "Classified workloads on physically separated infrastructure — verify every SKU against the Air-Gapped product page.", icon: "4", tone: "primary", value: "il6", target: "result_gov_il6" }
    ]
  },
  q_gov_profile_tier: {
    choice: true,
    step: { major: 2, sub: 2, subTotal: 2, label: "Government tier" },
    question: "Which security and compliance tier does this user need?",
    help: "The G-series mirrors the commercial E-series: G1 ≈ E1 (web/mobile only), G3 ≈ E3 (installed Office + Intune + Entra ID P1), G5 ≈ E5 (G3 + Defender XDR + Purview E5 + Entra ID P2).",
    choices: [
      { label: "G1 — web/mobile only, no premium security", sublabel: "Equivalent to E1. No installed Office.", icon: "1", tone: "primary", value: "g1", target: "result_gov_g1" },
      { label: "G3 — installed Office + Intune + Entra ID P1 + Defender for Office P1", sublabel: "Equivalent to E3.", icon: "3", tone: "primary", value: "g3", target: "result_gov_g3" },
      { label: "G5 — G3 + Defender XDR + Purview E5 + Entra ID P2", sublabel: "Equivalent to E5. The top G-series SKU.", icon: "5", tone: "primary", value: "g5", target: "result_gov_g5" }
    ]
  },
  q_npo_seats: {
    step: { major: 2, sub: 1, subTotal: 2, label: "Nonprofit tier" },
    question: "Is the nonprofit at or below 300 seats? (the Business SKU family has a hard 300-seat cap across all Business plans combined)",
    help: "≤ 300 seats → Business Premium with up to 10 free grant seats + additional seats at Nonprofit Staff Pricing. > 300 seats → switch to Enterprise (E3 / E5) at NSP.",
    rationale: {
      why: "Microsoft enforces a 300-seat cap across all Business SKUs combined. The Business Premium Nonprofit grant covers up to 10 seats free per validated nonprofit; additional seats are NSP.",
      yes: "buy Business Premium for Nonprofits — grant covers up to 10 free seats.",
      no: "drop into the E3 vs E5 disambiguation for nonprofits at enterprise scale."
    },
    techDocs: [
      ["Microsoft 365 Business Premium grant eligibility", "https://learn.microsoft.com/microsoft-365/nonprofit/microsoft-365-business-premium-grant"],
      ["Microsoft for Nonprofits — products & pricing", "https://www.microsoft.com/nonprofits"]
    ],
    yes: "result_npo_business_premium",
    no: "q_npo_e5_tier"
  },
  q_npo_e5_tier: {
    step: { major: 2, sub: 2, subTotal: 2, label: "Nonprofit tier" },
    question: "Does the nonprofit need E5-tier security or compliance — Defender XDR, Defender for Endpoint P2, Defender for Identity, Defender for Cloud Apps, or Purview E5 (IRM / Communication Compliance / premium eDiscovery / Audit Premium)?",
    help: "M365 E5 at Nonprofit Staff Pricing is the right SKU when E5-tier security/compliance is required. M365 E3 NSP is the cheaper baseline when it isn't.",
    rationale: {
      why: "E5 at NSP bundles Defender Suite + Purview E5 + Entra ID P2 — same feature shape as commercial E5 at deeply discounted pricing.",
      yes: "buy M365 E5 at Nonprofit Staff Pricing — bundles the full security/compliance stack.",
      no: "buy M365 E3 at Nonprofit Staff Pricing — the enterprise baseline at NSP rates."
    },
    techDocs: [
      ["Microsoft for Nonprofits — products & pricing", "https://www.microsoft.com/nonprofits"],
      ["Microsoft 365 for nonprofits — get started", "https://learn.microsoft.com/microsoft-365/nonprofit/"]
    ],
    yes: "result_npo_e5",
    no: "result_npo_e3"
  },
  q_extid_features: {
    choice: true,
    step: { major: 2, sub: 1, subTotal: 1, label: "External ID tier" },
    question: "What's the actual use case for these external identities?",
    help: "External ID is a family of products with separate billing meters. Pick the scenario that matches your use case — pricing and feature sets differ.",
    choices: [
      { label: "Basic B2B collaboration only", sublabel: "Invite guests, share files, join Teams — no risk-based CA, no PIM, no Verified ID.", icon: "1", tone: "primary", value: "free", target: "result_extid_free" },
      { label: "Premium identity features (risk-based CA, Identity Protection, PIM)", sublabel: "Premium detections + risk-based CA evaluated against guest sign-ins.", icon: "2", tone: "primary", value: "p2", target: "result_extid_p2" },
      { label: "Issue Microsoft Entra Verified ID credentials", sublabel: "Decentralized verifiable credentials for high-trust scenarios.", icon: "3", tone: "primary", value: "verified", target: "result_extid_verified" },
      { label: "Customer-facing app (CIAM) — sign-up / sign-in / social IdPs", sublabel: "For end customers — NOT B2B partners. Replaces Azure AD B2C for new tenants.", icon: "4", tone: "primary", value: "ciam", target: "result_extid_ciam" }
    ]
  },

  // ---------- Results ----------
  // Previously a terminal "result" with fuzzy "E3 or Business Premium
  // or F1/F3" wording. Now an info / stepping-stone node: explains that
  // the admin needs a real user license too, then routes through the
  // knowledge-worker disambiguation (q_iw_security → q_iw_copilot_*)
  // so the user lands on a SPECIFIC SKU (M365 E3 / E3+Copilot / E5 / E7).
  result_service: {
    info: true,
    badge: "License needed",
    badgeClass: "badge-warning",
    title: "This admin needs a real user license too",
    sub: "Microsoft 365 services are per-user licensed — anyone who reads mail, joins Teams, or opens Office docs needs a base plan, not just an admin role.",
    paragraphs: [
      "Best practice (Microsoft's own recommendation): keep a separate admin-only account that doesn't read mail, doesn't join Teams meetings, and doesn't open Office documents. That account often needs only Entra ID Free — much cheaper than a full M365 user license.",
      "Because you said this account does consume Microsoft 365 services, it needs a per-user service license on top of whatever admin work it does. The next two quick questions narrow that down to a specific SKU (Microsoft 365 E3, E3 + Copilot, E5, or E7).",
      "If your tenant is on Business Premium, Frontline, Education, Government, or Nonprofit, the E3 / E5 / E7 answer maps directly to your equivalent SKU (Business Premium ≈ E3, A3 ≈ E3, A5 ≈ E5, G3 ≈ E3, G5 ≈ E5, NSP E3 ≈ E3, NSP E5 ≈ E5)."
    ],
    docs: [
      ["Microsoft Entra licensing overview", "https://learn.microsoft.com/entra/fundamentals/licensing"],
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Why separate admin accounts matter", "https://learn.microsoft.com/entra/identity/role-based-access-control/best-practices"]
    ],
    actions: [
      { label: "Find the exact license →", target: "q_iw_platform", tone: "primary" },
      { label: "← Back to question", target: "start", tone: "secondary" }
    ]
  },
  result_service_principal: {
    result: true,
    badge: "No user license",
    badgeClass: "badge-success",
    title: "No user license required",
    sub: "Use a managed identity or service principal — they don't consume Microsoft 365 user licenses.",
    license: "None per-user. Optional: Workload Identities Premium (per workload identity) for risk detection and Conditional Access on service principals",
    decisionBasis: "You answered Yes to this being a non-interactive identity (service principal / managed identity / workload identity). Per Microsoft's workload identities documentation, these are billed differently from human users — no per-user Microsoft 365 license is required. Optional Workload Identities Premium adds risk detection and CA for workload identities.",
    bullets: [
      "Prefer managed identities for Azure workloads and replace service-account passwords where possible.",
      "Service principals are excluded from user-targeted Conditional Access; use Conditional Access for workload identities instead.",
      "For advanced workload protection (risk detection on service principals, CA for workload identities), license with Workload Identities Premium."
    ],
    docs: [
      ["Managed identities for Azure resources", "https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview"],
      ["Workload Identities", "https://learn.microsoft.com/entra/workload-id/workload-identities-faqs"],
      ["Conditional Access for workload identities", "https://learn.microsoft.com/entra/identity/conditional-access/workload-identity"]
    ]
  },
  result_teams_premium: {
    result: true,
    badge: "Teams Premium add-on",
    badgeClass: "badge-info",
    title: "Microsoft Teams Premium required",
    sub: "Per-user add-on on top of any plan that already includes Teams.",
    license: "Microsoft Teams Premium add-on, per user that organizes or attends premium meetings (not bundled with E3, E5, or E7)",
    decisionBasis: "You answered Yes to using Teams Premium features (advanced webinars, town halls premium, intelligent recap, branded meetings, premium virtual appointments, etc.). The Microsoft Teams add-on licensing page lists Teams Premium as a separate per-user SKU — it is not bundled with E3, E5, or E7. Only license users who actually host / attend these meetings.",
    bullets: [
      "Teams Premium covers advanced webinars, town halls premium, intelligent meeting recap, real-time translation, branded meetings, sensitivity-labeled meetings, and premium virtual appointments.",
      "It is NOT bundled with M365 E3 or E5. E7 (Frontier Suite) at GA does not include Teams Premium either — buy it as a separate add-on for users who need these features.",
      "License only the users who organize or attend Teams Premium-protected events; ad-hoc attendees do not need it.",
      "If the same admin is also in PIM / Identity Protection, layer Entra ID P2 on top — Teams Premium is feature-scoped, not identity-tier."
    ],
    docs: [
      ["Teams Premium licensing", "https://learn.microsoft.com/microsoftteams/teams-add-on-licensing/licensing-enhance-teams"],
      ["Teams Premium overview", "https://learn.microsoft.com/microsoftteams/enhanced-teams-experience"],
      ["M365 Maps — Teams Premium SKU", "https://m365maps.com/Microsoft%20Teams%20Premium.htm"]
    ]
  },
  result_id_governance: {
    result: true,
    badge: "Entra ID Governance",
    badgeClass: "badge-premium",
    title: "Microsoft Entra ID Governance license required",
    sub: "Lifecycle Workflows and Entitlement Management access packages sit above P2.",
    license: "Microsoft Entra ID Governance per user (target, approver, or reviewer in a governance flow) — also included in the Microsoft Entra Suite and M365 E7",
    decisionBasis: "You answered Yes to using advanced governance features (Entitlement Management access packages, Lifecycle Workflows, ML access-review recommendations, or Privileged Access Group governance). The Entra ID Governance licensing fundamentals page lists these as exclusive to Entra ID Governance (or the Entra Suite, which bundles Governance with Internet/Private Access and Verified ID).",
    bullets: [
      "Entitlement Management (access packages with multi-stage approvals), Lifecycle Workflows, machine-learning recommendations on access reviews, and Privileged Access Groups governance require the Entra ID Governance SKU.",
      "Entra ID Governance includes Entra ID P2 — one license covers both PIM and Governance.",
      "Also included in the Microsoft Entra Suite and Microsoft 365 E7 (Frontier Suite).",
      "Per Microsoft licensing: license each user who is a target, approver, or reviewer in a governance flow."
    ],
    docs: [
      ["Entra ID Governance licensing", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals"],
      ["Lifecycle Workflows overview", "https://learn.microsoft.com/entra/id-governance/what-are-lifecycle-workflows"],
      ["Entitlement Management overview", "https://learn.microsoft.com/entra/id-governance/entitlement-management-overview"],
      ["M365 security &amp; compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["Microsoft Entra service description", "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory"],
      ["M365 Maps — Entra ID Governance", "https://m365maps.com/Microsoft%20Entra%20ID%20Governance.htm"]
    ]
  },
  result_entra_suite: {
    result: true,
    badge: "Entra Suite required",
    badgeClass: "badge-premium",
    title: "Microsoft Entra Suite required",
    sub: "Bundles P2 + ID Governance + Internet Access + Private Access + Verified ID.",
    license: "Microsoft Entra Suite per user in scope (bundles P2 + Governance + Internet Access + Private Access + Verified ID) — also included in M365 E7",
    decisionBasis: "You answered Yes to operating Entra Suite features (Global Secure Access — Internet Access / Private Access — Verified ID issuance, or unified network-identity CA). The Microsoft Entra Suite documentation packages these into a single per-user SKU that also includes P2 and Governance. M365 E7 includes the Entra Suite outright.",
    bullets: [
      "The Microsoft Entra Suite is required for Global Secure Access (Internet Access + Private Access), Verified ID issuance, and unified network + identity Conditional Access.",
      "It includes Entra ID P2 and Entra ID Governance — one license satisfies PIM, Identity Protection, Governance, and Entra Suite scenarios.",
      "Microsoft 365 E7 (Frontier Suite) includes the Entra Suite outright — the simplest path if you also need Copilot.",
      "License per-user for everyone in scope of Internet/Private Access policies."
    ],
    docs: [
      ["What is Global Secure Access?", "https://learn.microsoft.com/entra/global-secure-access/overview-what-is-global-secure-access"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"],
      ["Microsoft Entra Verified ID", "https://learn.microsoft.com/entra/verified-id/decentralized-identifier-overview"],
      ["M365 security &amp; compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["Microsoft Entra service description", "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory"],
      ["M365 Maps — Entra Suite", "https://m365maps.com/Microsoft%20Entra%20Suite.htm"]
    ]
  },
  result_break_glass: {
    result: true,
    badge: "No license required",
    badgeClass: "badge-success",
    title: "No license required — break-glass account",
    sub: "Microsoft recommends excluding emergency-access accounts from Conditional Access, PIM, and risk policies.",
    license: "None. Microsoft Entra ID Free (included with the tenant) is sufficient as long as the account stays excluded from CA, PIM, and Identity Protection",
    decisionBasis: "You confirmed this is a break-glass account explicitly excluded from Conditional Access, PIM, and Identity Protection. Microsoft's emergency-access guidance recommends that exclusion to avoid lockout; because the account is not in scope of those policies, it does not trigger the per-user premium-tier licensing requirement those policies normally create.",
    bullets: [
      "Keep the account excluded from CA, PIM, and Identity Protection to keep it license-free.",
      "Monitor sign-ins with an Azure Monitor / Sentinel alert; rotate credentials and review usage on a schedule.",
      "Recommended: at least two break-glass Global Administrator accounts, stored offline with FIDO2 keys.",
      "If your tenant adds these accounts back to PIM later, an Entra ID P2 license becomes required."
    ],
    docs: [
      ["Manage emergency access accounts", "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access"],
      ["Conditional Access best practices", "https://learn.microsoft.com/entra/identity/conditional-access/plan-conditional-access"],
      ["Microsoft Entra service description", "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory"]
    ]
  },
  result_no_license_admin: {
    result: true,
    badge: "No license required",
    badgeClass: "badge-success",
    title: "No license required — admin-only account",
    sub: "Global Administrators and Power Platform Administrators can administer without a license assigned.",
    license: "None. Microsoft Entra ID Free (included with the tenant) covers baseline directory / role work for an admin-only account",
    decisionBasis: "You answered No to every premium-tier trigger — no P1-audience features (Conditional Access targeting the admin, SSPR writeback, Application Proxy as a user, Cloud Discovery), no Copilot, no Purview E5, no Defender XDR, no Intune Suite, no Teams Premium, no PIM, no Identity Protection, no Governance, and no Entra Suite. Microsoft's Entra licensing page confirms that a privileged admin who is only doing baseline directory / role work can run on Entra ID Free, which is included with the tenant.",
    bullets: [
      "Microsoft Entra ID Free already covers user/group management, basic reports, SSO, Security Defaults, basic per-user MFA (Authenticator / FIDO2), cloud-user SSPR, and CA policy CONFIGURATION (role-gated) — no purchase needed.",
      "Unlicensed admins land in 'Administrative access mode' for Dynamics 365 / Power Platform with no end-user access.",
      "Add a license only if this admin needs to use a service (mailbox, Teams, etc.), becomes in-scope of a CA policy (P1), or crosses into PIM, ID Protection, Purview E5, or Defender Suite policies (E5).",
      "Still required: phishing-resistant MFA on every privileged role (free with Security Defaults / CA / Authentication Strengths)."
    ],
    docs: [
      ["Microsoft Entra ID Free", "https://learn.microsoft.com/azure/cost-management-billing/manage/microsoft-entra-id-free"],
      ["Global / Power Platform admins can administer without a license", "https://learn.microsoft.com/power-platform/admin/global-service-administrators-can-administer-without-license"],
      ["Microsoft Entra service description", "https://learn.microsoft.com/office365/servicedescriptions/azure-active-directory"],
      ["Microsoft Product Terms — Universal License Terms (admin-without-license rule)", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"],
      ["M365 Maps — Entra ID Free vs P1 vs P2", "https://m365maps.com/Microsoft%20Entra%20ID%20P1.htm"]
    ]
  },
  result_entra_id_p1_admin: {
    result: true,
    badge: "Entra ID P1",
    badgeClass: "badge-info",
    title: "Microsoft Entra ID P1 — admin in scope of a P1-audience feature",
    sub: "The admin's OWN account is the audience of a Conditional Access policy, SSPR with on-prem writeback, Application Proxy as a connecting user, or Cloud App Discovery on their device.",
    license: "Microsoft Entra ID P1, per user — assigned to the admin's own account. Already bundled in M365 E3 / E5 / Business Premium / A3 / A5 / G3 / G5 / EMS E3+; available standalone for pure Entra ID Free tenants.",
    decisionBasis: "You answered Yes to the Entra ID P1 audience question — the admin's own account is in scope of at least one Conditional Access policy, uses SSPR with on-prem writeback, connects through Entra Application Proxy as a user, or is in the Defender for Cloud Apps Cloud Discovery report. Per Microsoft's Conditional Access licensing FAQ, every user targeted by a CA policy must have Entra ID P1 assigned — including the admin's own account. This is the most-missed admin licensing trigger.",
    bullets: [
      "Microsoft Entra ID P1 is required on the admin's own account because they're in the audience scope of a P1 feature (most commonly: at least one CA policy targets them).",
      "P1 is bundled in M365 E3, M365 E5, M365 Business Premium, Microsoft 365 A3/A5/G3/G5, EMS E3, EMS E5, and Entra Suite — if the tenant already buys any of those for the admin, the requirement is satisfied.",
      "For pure Entra ID Free tenants where the admin needs P1 standalone, license at the Microsoft Entra ID P1 per-user price.",
      "Configuring CA policies, Authentication Strengths, Security Defaults, Application Proxy connectors, SSPR settings, and Cloud Discovery data collectors is all FREE (role-gated). The license requirement here is for the admin's account being the AUDIENCE of those policies — not for operating them.",
      "If the admin is later in scope of a P2 feature (PIM-eligible role, Identity Protection risk policy with remediation, Access Reviews), the higher P2 tier applies — see the PIM / Identity Protection / Governance questions later in the tree.",
      "Break-glass pattern: per Microsoft's emergency-access guidance, you should keep at least two break-glass accounts EXCLUDED from CA — those stay on Entra ID Free."
    ],
    docs: [
      ["Conditional Access licensing fundamentals (per-user-in-scope rule)", "https://learn.microsoft.com/entra/identity/conditional-access/overview#license-requirements"],
      ["Microsoft Entra plans & pricing (Free vs P1 vs P2 feature matrix)", "https://www.microsoft.com/security/business/microsoft-entra-pricing"],
      ["SSPR licensing — cloud users free, writeback needs P1", "https://learn.microsoft.com/entra/identity/authentication/concept-sspr-licensing"],
      ["Application Proxy licensing", "https://learn.microsoft.com/entra/identity/app-proxy/overview-what-is-app-proxy"],
      ["Microsoft Entra ID Free, P1, P2 feature comparison", "https://learn.microsoft.com/entra/fundamentals/whatis"],
      ["Emergency access accounts — CA exclusion pattern", "https://learn.microsoft.com/entra/identity/role-based-access-control/security-emergency-access"],
      ["M365 Maps — Microsoft Entra ID P1", "https://m365maps.com/Microsoft%20Entra%20ID%20P1.htm"],
      ["M365 Maps — Microsoft 365 E3 (includes P1)", "https://m365maps.com/Microsoft%20365%20E3.htm"],
      ["M365 Maps — Microsoft 365 Business Premium (includes P1)", "https://m365maps.com/Microsoft%20365%20Business%20Premium.htm"]
    ]
  },

  // ---------- Admin tree — disambiguated SKU results ----------
  result_copilot_addon: {
    result: true,
    badge: "Copilot add-on",
    badgeClass: "badge-info",
    title: "Microsoft 365 Copilot add-on",
    sub: "Per-user Copilot add-on layered on an eligible base plan — keeps the existing tenant SKU mix.",
    license: "Microsoft 365 Copilot add-on, per user, on top of an eligible base plan (E3 / E5 / Business Standard / Business Premium)",
    decisionBasis: "You answered Yes to Copilot but No to needing Entra Suite + Agent 365 in one bundle. The Copilot add-on is the lowest-cost path — it just layers Copilot on top of an eligible base plan without forcing a base-plan upgrade.",
    bullets: [
      "Add the Microsoft 365 Copilot per-user license to the existing base plan; no base-plan change required.",
      "Only license users who will actually use Copilot — license assignment gates access.",
      "Pay-as-you-go (Copilot Credits) is also available for limited agent access without a full Copilot license.",
      "E5 and E7 customers get Security Copilot capacity included at no extra cost."
    ],
    docs: [
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Copilot Studio licensing", "https://learn.microsoft.com/microsoft-copilot-studio/billing-licensing"],
      ["M365 Maps — Copilot SKU comparison", "https://m365maps.com/Microsoft%20365%20Copilot.htm"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update (eligible base-plan changes)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ]
  },
  result_e7_full: {
    result: true,
    badge: "M365 E7 (Frontier Suite)",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E7 (Frontier Suite)",
    sub: "Single bundled SKU that includes E5 + Copilot + Entra Suite + Agent 365.",
    license: "Microsoft 365 E7 (Frontier Suite), per user — bundles E5, Copilot, Entra Suite, and Agent 365 in one license",
    decisionBasis: "You answered Yes to Copilot AND Yes to also needing Entra Suite (Internet/Private Access, Verified ID) and Agent 365 governance. E7 (generally available since May 1, 2026) bundles all four into one per-user SKU and is typically cheaper than stacking the add-ons individually.",
    bullets: [
      "Microsoft 365 E7 includes Microsoft 365 E5 + Microsoft 365 Copilot + Microsoft Entra Suite + Agent 365.",
      "Pricing target is the bundle being meaningfully cheaper than E5 + Copilot + Entra Suite + Agent 365 priced individually — confirm with your Microsoft account team.",
      "E7 includes Entra ID P2 (via Entra Suite) — covers PIM, Identity Protection, and Governance use cases for the licensed users.",
      "E7 customers get Security Copilot capacity included at no extra cost."
    ],
    docs: [
      ["Microsoft 365 E7 (Frontier Suite) announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"],
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ]
  },
  result_e5_full: {
    result: true,
    badge: "Microsoft 365 E5",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E5",
    sub: "Single bundled SKU that covers both Purview E5 and the Microsoft Defender Suite (plus Entra ID P2).",
    license: "Microsoft 365 E5, per user — bundles Purview E5 + Defender Suite + Entra ID P2 + Power BI Pro + Teams Phone",
    decisionBasis: "You answered Yes to BOTH Purview E5 features and Defender XDR / Defender Suite features. M365 E5 is the single SKU that covers both at once — and it also includes Entra ID P2, so it satisfies PIM, Identity Protection, and Governance triggers for the same user.",
    bullets: [
      "Microsoft 365 E5 includes Microsoft Purview E5 (IRM, Communication Compliance, premium eDiscovery, Audit Premium, Customer Lockbox), the Microsoft Defender Suite (Defender XDR + Defender for Endpoint P2 + Defender for Identity + Defender for Cloud Apps + Defender for Office 365 P2), and Microsoft Entra ID P2.",
      "Buying E5 once is meaningfully cheaper than stacking E3 + E5 Compliance + Defender Suite + Entra ID P2 add-ons.",
      "M365 E7 (Frontier Suite) bundles E5 + Copilot + Entra Suite + Agent 365 if you also need those.",
      "License every user in scope of the policies — not just the policy author."
    ],
    docs: [
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["M365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"],
      ["M365 Maps — E5 comparison", "https://m365maps.com/Microsoft%20365%20E5.htm"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update (‘with Teams’ vs ‘no Teams’ SKUs)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ]
  },
  result_e5_compliance_only: {
    result: true,
    badge: "E5 Compliance add-on",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E5 Compliance add-on",
    sub: "Covers Purview E5 features without forcing a full E5 upgrade — keep your existing base plan.",
    license: "Microsoft 365 E5 Compliance add-on (or Microsoft Purview Suite), per user in scope of the Purview policy",
    decisionBasis: "You answered Yes to Purview E5 features but No to also needing Defender XDR / Defender Suite. The E5 Compliance add-on covers Purview without forcing you to buy full E5 — buy it on top of E3 / Business Premium for the in-scope users only.",
    bullets: [
      "Microsoft 365 E5 Compliance includes IRM, Communication Compliance, premium eDiscovery, endpoint DLP, Records Management, Customer Lockbox, Customer Key, Privileged Access Management for Office, Information Barriers, and Audit (Premium).",
      "It also includes Microsoft Entra ID P2 — same identity-tier benefit as full E5.",
      "License every user in scope of any covered Purview policy — not just the admin who configures it.",
      "If you later need Defender XDR / Endpoint P2 too, upgrading the user from E3 + E5 Compliance to full E5 is the cleanest path."
    ],
    docs: [
      ["Microsoft Purview eDiscovery licensing", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description#microsoft-purview-ediscovery"],
      ["Insider Risk Management — subscriptions & licensing", "https://learn.microsoft.com/purview/insider-risk-management-configure#subscriptions-and-licensing"],
      ["M365 Maps — E5 Compliance comparison", "https://m365maps.com/Microsoft%20365%20E5%20Compliance.htm"]
    ]
  },
  result_defender_suite_only: {
    result: true,
    badge: "Defender Suite add-on",
    badgeClass: "badge-premium",
    title: "Microsoft Defender Suite add-on",
    sub: "Covers Defender XDR + Defender for Endpoint P2 + Identity + Cloud Apps + Office P2 — without forcing a full E5 upgrade.",
    license: "Microsoft Defender Suite add-on (formerly E5 Security), per user — also includes Entra ID P2",
    decisionBasis: "You answered Yes to Defender XDR / Defender Suite features but No to also needing Purview E5. The Defender Suite add-on covers the security workloads without forcing you to buy full E5 — buy it on top of E3 / Business Premium for the SOC analyst / security admins only.",
    bullets: [
      "Microsoft Defender Suite includes Defender for Endpoint Plan 2, Defender for Identity, Defender for Cloud Apps, Defender for Office 365 Plan 2, and the Defender XDR portal.",
      "Defender Suite also includes Microsoft Entra ID P2 — covers PIM and Identity Protection for the same user.",
      "Microsoft Sentinel is billed in Azure per-GB and is a separate purchase, but Defender Suite + Sentinel is the standard unified SecOps combo.",
      "If you later need Purview E5 too, upgrading to full M365 E5 is the cleanest path."
    ],
    docs: [
      ["Microsoft Defender XDR overview", "https://learn.microsoft.com/defender-xdr/microsoft-365-defender"],
      ["Defender for Endpoint plans", "https://learn.microsoft.com/defender-endpoint/microsoft-defender-endpoint"],
      ["M365 Maps — E5 Security comparison", "https://m365maps.com/Microsoft%20365%20E5%20Security.htm"]
    ]
  },
  result_intune_suite_full: {
    result: true,
    badge: "Intune Suite add-on",
    badgeClass: "badge-premium",
    title: "Microsoft Intune Suite add-on",
    sub: "All six Intune premium features bundled — cheaper than stacking standalones.",
    license: "Microsoft Intune Suite add-on, per user that needs two or more premium endpoint features",
    decisionBasis: "You answered Yes to two or more Intune premium features. The Intune Suite bundles all six (EPM, Remote Help, Microsoft Tunnel for MAM, Cloud PKI, Enterprise App Management, Advanced Endpoint Analytics) for less than the sum of the individual standalone add-ons.",
    bullets: [
      "Bundles Endpoint Privilege Management, Remote Help, Microsoft Tunnel for MAM, Cloud PKI, Enterprise App Management, and Advanced Endpoint Analytics.",
      "Layers on top of base Intune (already included in M365 E3 / E5 / E7 / Business Premium / F3) — only license users that actually use the premium features.",
      "Intune Suite does NOT include Entra ID P2 — if those admins are also in PIM, license them with P2 (or M365 E5/E7) separately.",
      "Also bundled with some M365 + Intune Suite enterprise agreement offers — confirm with your Microsoft account team."
    ],
    docs: [
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"],
      ["Endpoint Privilege Management", "https://learn.microsoft.com/mem/intune/protect/epm-overview"],
      ["M365 Maps — Intune Suite", "https://m365maps.com/Microsoft%20Intune%20Suite.htm"]
    ]
  },
  // Per-feature Intune standalone result nodes — reached from
  // q_intune_which_one. Each gives a specific SKU and the rationale for
  // why a standalone is the cheaper path than the full Intune Suite.
  result_intune_epm: {
    result: true,
    badge: "Intune EPM standalone",
    badgeClass: "badge-info",
    title: "Microsoft Intune Endpoint Privilege Management standalone",
    sub: "Cheapest path when EPM is the only Intune premium feature this user needs.",
    license: "Microsoft Intune Endpoint Privilege Management (EPM) standalone add-on, per user",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (EPM). The EPM standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "EPM lets standard users elevate approved applications without holding local admin rights — reduces standing-admin attack surface on Windows endpoints.",
      "Base Intune (device management, app deployment, configuration profiles, compliance) is already included in M365 E3 / E5 / E7 / Business Premium / F3 — EPM standalone is the per-user uplift for elevation.",
      "If a second Intune premium feature (Remote Help, Tunnel for MAM, Cloud PKI, Enterprise App Management, Advanced Endpoint Analytics) later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Endpoint Privilege Management overview", "https://learn.microsoft.com/mem/intune/protect/epm-overview"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_intune_remote_help: {
    result: true,
    badge: "Intune Remote Help standalone",
    badgeClass: "badge-info",
    title: "Microsoft Intune Remote Help standalone",
    sub: "Cheapest path when Remote Help is the only Intune premium feature this user needs.",
    license: "Microsoft Intune Remote Help standalone add-on, per user (helpdesk technicians AND end users in scope of assistance sessions)",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (Remote Help). The Remote Help standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "Remote Help delivers secure, cloud-managed remote-control and view-only support sessions launched from the Intune admin center, with full audit trail.",
      "License every helpdesk technician who provides assistance AND every end user who receives assistance — Microsoft licenses both sides of the session.",
      "Base Intune is already included in M365 E3 / E5 / E7 / Business Premium / F3 — Remote Help standalone is the per-user uplift for the assistance capability.",
      "If a second Intune premium feature later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Remote Help overview", "https://learn.microsoft.com/mem/intune/fundamentals/remote-help"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_intune_tunnel: {
    result: true,
    badge: "Tunnel for MAM standalone",
    badgeClass: "badge-info",
    title: "Microsoft Tunnel for MAM standalone",
    sub: "Cheapest path when Microsoft Tunnel for MAM is the only Intune premium feature this user needs.",
    license: "Microsoft Tunnel for Mobile Application Management (MAM) standalone add-on, per user",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (Tunnel for MAM). The Tunnel for MAM standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "Microsoft Tunnel for MAM provides per-app VPN access on unmanaged iOS / Android devices — typically used for BYOD scenarios where MDM enrollment is not in scope.",
      "Base Microsoft Tunnel (for enrolled MDM devices) is already included in base Intune — only the MAM variant requires this standalone add-on.",
      "Base Intune is already included in M365 E3 / E5 / E7 / Business Premium / F3 — Tunnel for MAM standalone is the per-user uplift for the unmanaged-device VPN capability.",
      "If a second Intune premium feature later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Microsoft Tunnel for MAM", "https://learn.microsoft.com/mem/intune/protect/microsoft-tunnel-mam"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_intune_cloud_pki: {
    result: true,
    badge: "Cloud PKI standalone",
    badgeClass: "badge-info",
    title: "Microsoft Cloud PKI standalone",
    sub: "Cheapest path when Cloud PKI is the only Intune premium feature this user needs.",
    license: "Microsoft Cloud PKI standalone add-on, per user",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (Cloud PKI). The Cloud PKI standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "Microsoft Cloud PKI is a managed cloud PKI service that issues device and user certificates to Intune-managed endpoints — removes the need to run on-prem AD CS for certificate-based authentication.",
      "Issues certificates for Wi-Fi, VPN, SCEP, and 802.1X scenarios; integrates with Intune SCEP / PKCS profile policies.",
      "Base Intune is already included in M365 E3 / E5 / E7 / Business Premium / F3 — Cloud PKI standalone is the per-user uplift for the managed PKI service.",
      "If a second Intune premium feature later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Microsoft Cloud PKI overview", "https://learn.microsoft.com/mem/intune/protect/microsoft-cloud-pki-overview"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_intune_eam: {
    result: true,
    badge: "Enterprise App Mgmt standalone",
    badgeClass: "badge-info",
    title: "Microsoft Intune Enterprise App Management standalone",
    sub: "Cheapest path when Enterprise App Management is the only Intune premium feature this user needs.",
    license: "Microsoft Intune Enterprise App Management standalone add-on, per user",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (Enterprise App Management). The Enterprise App Management standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "Enterprise App Management provides a curated catalog of pre-packaged Win32 apps with built-in auto-update detection — removes the need to manually repackage and re-deploy each vendor update.",
      "Catalog apps are deployed via standard Intune Win32 app workflow; only the discovery / packaging / update-detection automation requires the standalone add-on.",
      "Base Intune is already included in M365 E3 / E5 / E7 / Business Premium / F3 — Enterprise App Management standalone is the per-user uplift for the catalog automation.",
      "If a second Intune premium feature later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Enterprise App Management overview", "https://learn.microsoft.com/mem/intune/apps/apps-enterprise-app-management"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_intune_aea: {
    result: true,
    badge: "Advanced Endpoint Analytics standalone",
    badgeClass: "badge-info",
    title: "Microsoft Intune Advanced Endpoint Analytics standalone",
    sub: "Cheapest path when Advanced Endpoint Analytics is the only Intune premium feature this user needs.",
    license: "Microsoft Intune Advanced Endpoint Analytics standalone add-on, per user",
    decisionBasis: "You answered Yes to needing Intune premium features, scoped down to exactly one (Advanced Endpoint Analytics). The Advanced Endpoint Analytics standalone add-on is cheaper than the full Intune Suite when no other premium Intune feature is in play.",
    bullets: [
      "Advanced Endpoint Analytics adds anomaly detection, per-device timeline, and proactive remediation scripts on top of the base Endpoint Analytics reporting included in Intune.",
      "Useful for proactive support — surfaces battery / boot / app reliability anomalies before users open tickets.",
      "Base Intune is already included in M365 E3 / E5 / E7 / Business Premium / F3 — Advanced Endpoint Analytics standalone is the per-user uplift for the anomaly / remediation features.",
      "If a second Intune premium feature later comes into scope for the same user, the Intune Suite becomes the cheaper path — re-evaluate.",
      "Standalone add-ons do NOT include Entra ID P2 — license separately if these admins are also in PIM."
    ],
    docs: [
      ["Advanced Endpoint Analytics", "https://learn.microsoft.com/mem/analytics/advanced-endpoint-analytics"],
      ["Microsoft Intune Suite & add-ons", "https://learn.microsoft.com/mem/intune/fundamentals/intune-add-ons"]
    ]
  },
  result_p2_standalone: {
    result: true,
    badge: "Entra ID P2 — standalone",
    badgeClass: "badge-premium",
    title: "Microsoft Entra ID P2 — standalone add-on",
    sub: "Cheapest path when the user isn't already on E5 / E7 / EMS E5 / Defender Suite / Entra Suite / Governance.",
    license: "Microsoft Entra ID P2 standalone, per user (admin + every approver / reviewer in PIM, and every user in scope of risk-based policies)",
    decisionBasis: "You answered Yes to a P2 trigger (PIM-eligible / approver / reviewer, OR in scope of Identity Protection / risk-based CA) AND the user is not on any SKU that already includes P2. Standalone Entra ID P2 is the cheapest path for these users.",
    bullets: [
      "License the admin AND every approver / reviewer in PIM workflows.",
      "For Identity Protection: license every user evaluated by the risk-based policy, not just the policy author.",
      "If you later upgrade users to M365 E5 / E7 / EMS E5 / Defender Suite / Entra Suite / Entra ID Governance, P2 is included — drop the standalone for those users.",
      "Standalone P2 does NOT include Governance — if you also need Lifecycle Workflows or Entitlement Management access packages, use Entra ID Governance instead."
    ],
    docs: [
      ["PIM licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
      ["Identity Protection — risks", "https://learn.microsoft.com/entra/id-protection/concept-identity-protection-risks"],
      ["M365 Maps — Entra ID", "https://m365maps.com/Microsoft%20Entra%20ID.htm"]
    ]
  },
  result_p2_already_included: {
    result: true,
    badge: "Already included",
    badgeClass: "badge-success",
    title: "Entra ID P2 — already included in the user's existing license",
    sub: "No additional purchase needed — provided every in-scope user is actually assigned a P2-inclusive SKU (not just covered by the tenant's license pool).",
    license: "No additional license. Entra ID P2 is already included in the SKU the user holds (M365 E5 or E7, EMS E5, Defender Suite, Entra Suite, or Entra ID Governance).",
    decisionBasis: "You confirmed that every user who will be a PIM eligible admin, approver, or reviewer — and every user in scope of a risk-based Conditional Access, user-risk, or sign-in-risk policy — is already assigned at least one P2-inclusive SKU. No new purchase is needed for those users. If you were uncertain about assignment, go back and answer No: buying standalone Entra ID P2 for a few extra admins is far cheaper than discovering at audit that PIM eligibility was non-compliant for the uncovered users.",
    paragraphs: [
      "Assignment vs entitlement — the distinction that matters at audit. The tenant owning a pool of E5 SKUs is not the same as a specific admin being assigned one. Auditors verify the license tick-box on each individual user account, not the tenant-wide pool. Before you rely on this answer, open the Microsoft 365 admin center, navigate to Users → the user → Licenses & apps, and confirm a P2-inclusive SKU is ticked.",
      "Entra ID P2 must remain assigned for the entire time the user is in scope. If you assign an E5 SKU long enough to flag a PIM eligibility, then later remove the SKU but leave the eligibility in place, the configuration is non-compliant from that moment on. The same rule applies to Identity Protection — every user evaluated by a risk-based policy must hold the license at the moment the risk is evaluated, not just at policy creation time.",
      "Entra ID Governance is a separate licensing dimension. PIM and Identity Protection are covered by any P2-inclusive SKU, but Entitlement Management access packages, Lifecycle Workflows, and ML-driven access reviews require an SKU that also bundles Entra ID Governance — only Microsoft Entra Suite, Microsoft 365 E7, and standalone Microsoft Entra ID Governance qualify. M365 E5, EMS E5, and Defender Suite do not."
    ],
    bullets: [
      "Verify the P2-inclusive SKU is actually assigned on every PIM-eligible admin, approver, and reviewer in the Microsoft 365 admin center — not just owned by the tenant.",
      "Identity Protection follows the same rule: every user evaluated by a risk-based Conditional Access, user-risk, or sign-in-risk policy must hold the SKU at the moment the risk is evaluated.",
      "Keep the SKU assigned for as long as the user is in scope. Removing the SKU while leaving the PIM eligibility or risk policy in place makes the configuration non-compliant.",
      "If you also need Entra ID Governance features later (Entitlement Management access packages, Lifecycle Workflows, ML-driven access reviews), only Microsoft Entra Suite, M365 E7, and standalone Microsoft Entra ID Governance include those — M365 E5, EMS E5, and Defender Suite do not.",
      "If even one in-scope admin is on a non-P2 SKU (for example M365 E3, Business Premium, an F-series plan, or Office 365 E5), go back and answer No — that admin needs standalone Entra ID P2."
    ],
    docs: [
      ["PIM licensing fundamentals", "https://learn.microsoft.com/entra/id-governance/licensing-fundamentals#privileged-identity-management"],
      ["Identity Protection — license requirements", "https://learn.microsoft.com/entra/id-protection/overview-identity-protection#license-requirements"],
      ["Assign or unassign licenses in the M365 admin center", "https://learn.microsoft.com/microsoft-365/admin/manage/assign-licenses-to-users"],
      ["M365 security & compliance licensing guidance", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance"]
    ]
  },

  // ---------- Profile flow — disambiguated SKU results ----------
  result_iw_e3: {
    result: true,
    badge: "Microsoft 365 E3",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E3",
    sub: "Baseline knowledge-worker SKU — desktop Office, Exchange P2, Teams, SharePoint, OneDrive, Intune, Entra ID P1, Defender for Office P1, AIP P1.",
    license: "Microsoft 365 E3, per user",
    decisionBasis: "You picked Information / knowledge worker, declined E5-tier security/compliance/identity, and don't need Copilot. M365 E3 is the smallest Enterprise SKU that includes desktop Office + Exchange + Teams + Intune + Entra ID P1 — the right baseline.",
    bullets: [
      "Includes desktop Office (Word/Excel/PowerPoint/Outlook), Exchange Online Plan 2 (100 GB mailbox), Teams, SharePoint, OneDrive (1 TB+).",
      "Includes Microsoft Intune, Microsoft Entra ID P1 (Conditional Access, MFA), Defender for Office 365 P1, AIP P1.",
      "Add Microsoft 365 Copilot per user if Copilot need emerges later — no base-plan change required.",
      "Step up to M365 E5 when you need Defender XDR / Purview E5 / Entra ID P2 for the same user."
    ],
    docs: [
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Microsoft 365 E3 service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["M365 Maps — Enterprise plan comparison", "https://m365maps.com/Microsoft%20365%20Enterprise.htm"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update (‘with Teams’ vs ‘no Teams’ SKUs)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_e3_copilot: {
    result: true,
    badge: "M365 E3 + Copilot",
    badgeClass: "badge-info",
    title: "Microsoft 365 E3 + Microsoft 365 Copilot add-on",
    sub: "E3 baseline with the Copilot add-on layered per user — no base-plan upgrade required.",
    license: "Microsoft 365 E3 per user PLUS the Microsoft 365 Copilot add-on per Copilot user",
    decisionBasis: "You picked Information / knowledge worker, declined E5-tier security/compliance/identity, but need Copilot. M365 E3 + Copilot add-on is cheaper than jumping to M365 E5 or E7 — and only the users who actually use Copilot need the add-on.",
    bullets: [
      "E3 covers the desktop Office + Exchange + Teams + Intune + Entra ID P1 baseline.",
      "Copilot add-on per user enables Copilot in Word/Excel/PowerPoint/Outlook/Teams + Copilot Studio grounded in tenant data + Microsoft 365 Chat.",
      "Only license the users that will actually use Copilot — license assignment is what gates access.",
      "If the user later needs E5-tier security/compliance/identity, swap E3 → E5 (keep the Copilot add-on); or move to E7 (bundles E5 + Copilot + Entra Suite + Agent 365)."
    ],
    docs: [
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["M365 Maps — Copilot SKU comparison", "https://m365maps.com/Microsoft%20365%20Copilot.htm"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update (eligible base-plan changes for Copilot)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_e5: {
    result: true,
    badge: "Microsoft 365 E5",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E5",
    sub: "Single bundled SKU that covers Defender Suite + Purview E5 + Entra ID P2 + Power BI Pro + Teams Phone.",
    license: "Microsoft 365 E5, per user — includes Defender Suite + Purview E5 + Entra ID P2",
    decisionBasis: "You picked Information / knowledge worker AND need E5-tier security / compliance / identity. M365 E5 is the single SKU that covers Defender XDR + Purview E5 + Entra ID P2 — usually cheaper than E3 + E5 Compliance + Defender Suite + P2 add-ons.",
    bullets: [
      "Includes Microsoft Defender Suite (Defender XDR + Endpoint P2 + Identity + Cloud Apps + Office P2), Microsoft Purview E5 (IRM, eDiscovery Premium, Audit Premium, Customer Lockbox, etc.), Microsoft Entra ID P2 (PIM, Identity Protection).",
      "Also includes Power BI Pro and Teams Phone Standard.",
      "Add Microsoft 365 Copilot per user if Copilot need emerges (or move to M365 E7).",
      "For Entra Suite features (Internet/Private Access, Verified ID) — buy Entra Suite add-on or move to E7."
    ],
    docs: [
      ["Compare Microsoft 365 Enterprise plans", "https://www.microsoft.com/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Microsoft 365 E5 service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["M365 Maps — E5 comparison", "https://m365maps.com/Microsoft%20365%20E5.htm"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ],
    actions: [
      { label: "Deep-dive: Teams Phone licensing", target: "info_teams_phone", tone: "secondary" },
      { label: "Deep-dive: Windows 365 / Cloud PC", target: "info_windows_365", tone: "secondary" },
      { label: "Deep-dive: Viva / Project / Visio / Power Platform / Copilot add-ons", target: "info_workload_addons", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_e7: {
    result: true,
    badge: "M365 E7 (Frontier Suite)",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E7 (Frontier Suite)",
    sub: "Single bundled SKU that includes E5 + Copilot + Entra Suite + Agent 365.",
    license: "Microsoft 365 E7 (Frontier Suite), per user — bundles E5, Copilot, Entra Suite, and Agent 365",
    decisionBasis: "You picked Information / knowledge worker AND need E5-tier security AND Copilot + Entra Suite + Agent 365 in a single bundle. E7 (GA 2026-05-01) bundles all of those — typically cheaper than E5 + Copilot + Entra Suite + Agent 365 priced individually.",
    bullets: [
      "Bundles Microsoft 365 E5 + Microsoft 365 Copilot + Microsoft Entra Suite + Agent 365 in one license.",
      "Covers Defender Suite + Purview E5 + Entra ID P2 + Internet/Private Access + Verified ID + Copilot + Agent governance — the most comprehensive M365 SKU.",
      "Security Copilot capacity included at no extra cost.",
      "Confirm pricing vs. E5 + Copilot + Entra Suite stacked individually with your Microsoft account team — E7 is normally cheaper when all three are needed."
    ],
    docs: [
      ["Microsoft 365 E7 (Frontier Suite) announcement", "https://learn.microsoft.com/partner-center/announcements/2026-may"],
      ["Microsoft 365 Copilot licensing", "https://learn.microsoft.com/microsoft-365/copilot/microsoft-365-copilot-licensing"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"],
      ["Microsoft Licensing — Microsoft 365 + Teams 2025 packaging update", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"]
    ],
    actions: [
      { label: "Deep-dive: Teams Phone licensing", target: "info_teams_phone", tone: "secondary" },
      { label: "Deep-dive: Windows 365 / Cloud PC", target: "info_windows_365", tone: "secondary" },
      { label: "Deep-dive: Viva / Project / Visio / Power Platform / Copilot add-ons", target: "info_workload_addons", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_apps: {
    result: true,
    badge: "M365 Apps for Enterprise",
    badgeClass: "badge-info",
    title: "Microsoft 365 Apps for Enterprise",
    sub: "Installed Office desktop apps as a per-user SKU — NO Exchange, Teams, SharePoint, or OneDrive cloud services.",
    license: "Microsoft 365 Apps for Enterprise, per user (~$12 / user / month)",
    decisionBasis: "You picked Information / knowledge worker, declined the full M365 bundle, AND said the user only needs the installed Office apps (no Microsoft cloud email / Teams / SharePoint). M365 Apps for Enterprise is the apps-only SKU — meaningfully cheaper than any Office 365 E-tier when the user gets mail / chat / file-share from a third-party service.",
    bullets: [
      "Installed Office desktop apps (Word / Excel / PowerPoint / Outlook / OneNote / Access / Publisher on Windows; Word / Excel / PowerPoint / Outlook on Mac) on up to 5 PCs/Macs + 5 tablets + 5 phones per user.",
      "Includes 1 TB OneDrive for Business storage for the user — this is the ONE cloud service bundled.",
      "Does NOT include Exchange Online (no mailbox), Microsoft Teams, SharePoint Online, Loop, or Forms cloud services. Mail and collaboration must come from a third party (Google Workspace, on-prem Exchange, IBM Notes, etc.) or be added as standalone SKUs.",
      "Does NOT include Windows licence, Microsoft Intune, Microsoft Entra ID P1, or any Defender / Purview features.",
      "EEA (European Economic Area) tenants: the apps-only SKU is sold under the same name worldwide \u2014 no separate \"No Teams\" variant needed because there's no Teams to unbundle.",
      "Step up to Office 365 E1 / E3 / E5 if cloud collab (Exchange / Teams / SharePoint) is needed, OR to Microsoft 365 E3 / E5 if Windows + Intune are also needed."
    ],
    docs: [
      ["Microsoft 365 Apps for Enterprise \u2014 overview", "https://learn.microsoft.com/microsoft-365-apps/deploy/about-microsoft-365-apps"],
      ["Office applications service description", "https://learn.microsoft.com/office365/servicedescriptions/office-applications-service-description/office-applications-service-description"],
      ["M365 Maps \u2014 Apps for Enterprise", "https://m365maps.com/Microsoft%20365%20Apps%20for%20enterprise.htm"],
      ["Microsoft 365 Apps for Enterprise pricing", "https://www.microsoft.com/microsoft-365/business/microsoft-365-apps-for-enterprise"]
    ],
    actions: [
      { label: "\u2190 Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_o1: {
    result: true,
    badge: "Office 365 E1",
    badgeClass: "badge-info",
    title: "Office 365 E1",
    sub: "Cheapest Enterprise O365 tier \u2014 cloud collab (Exchange 50 GB + Teams + SharePoint + OneDrive) with Office for the web / mobile only. NO installed desktop Office apps.",
    license: "Office 365 E1, per user (~$10 / user / month)",
    decisionBasis: "You picked Information / knowledge worker, declined the full M365 bundle, picked O365 cloud collab over apps-only, declined O5-tier premium services, AND said installed desktop Office apps are not required. Office 365 E1 is the cheapest O365 SKU that includes cloud collab \u2014 the user lives in the browser + mobile apps.",
    bullets: [
      "Exchange Online Plan 1 (50 GB mailbox), Microsoft Teams, SharePoint Online, OneDrive for Business (1 TB), Office for the web (Word / Excel / PowerPoint / Outlook / OneNote in the browser).",
      "Office mobile apps with commercial-use rights on devices with a screen \u2264 10.9 inches \u2014 iPhones and most Android phones qualify; iPads and Surface tablets generally do NOT (Microsoft's service description rule).",
      "NO installed desktop Office apps (no installed Outlook / Word / Excel / PowerPoint on Windows or Mac). If installed apps are needed, step up to Office 365 E3.",
      "NO Windows licence, NO Microsoft Intune, NO Microsoft Entra ID P1. Add EMS E3 (~$10.60 / user / month) or buy Entra ID P1 standalone if Conditional Access / Intune is needed.",
      "EEA tenants (post EU antitrust ruling): buy the \"Office 365 E1 (no Teams) EEA\" SKU + Microsoft Teams Enterprise as a separate per-user SKU.",
      "Step up to Office 365 E3 when installed desktop apps are needed (or to a 100 GB mailbox)."
    ],
    docs: [
      ["Compare Office 365 plans (E1 / E3 / E5)", "https://www.microsoft.com/microsoft-365/business/compare-office-365-plans"],
      ["Office 365 service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["Office mobile apps \u2014 10.9-inch screen rule", "https://learn.microsoft.com/office365/servicedescriptions/office-applications-service-description/office-applications-service-description"],
      ["Microsoft Licensing \u2014 Microsoft 365 + Teams 2025 packaging update (EEA No-Teams SKUs)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"],
      ["M365 Maps \u2014 Office 365 E1", "https://m365maps.com/Office%20365%20E1.htm"]
    ],
    actions: [
      { label: "\u2190 Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_o3: {
    result: true,
    badge: "Office 365 E3",
    badgeClass: "badge-premium",
    title: "Office 365 E3",
    sub: "Office cloud productivity \u2014 Exchange 100 GB + Teams + SharePoint + OneDrive + installed desktop Office apps. NO Windows / Intune / Entra ID P1.",
    license: "Office 365 E3, per user (~$23 / user / month) \u2014 about $13 / user / month less than Microsoft 365 E3",
    decisionBasis: "You picked Information / knowledge worker, declined the full M365 bundle, picked O365 cloud collab, declined O5-tier premium services, AND said installed desktop Office apps ARE needed. Office 365 E3 is the workhorse O365 tier \u2014 same Office productivity as M365 E3 minus the Windows + Intune + Entra P1 bundle.",
    bullets: [
      "Installed Office desktop apps (Word / Excel / PowerPoint / Outlook / OneNote / Access / Publisher) on up to 5 PCs / Macs + 5 tablets + 5 phones per user.",
      "Exchange Online Plan 2 (100 GB mailbox + unlimited online archive), Microsoft Teams, SharePoint Online, OneDrive (1 TB+, expandable).",
      "Includes Microsoft Purview baseline (manual sensitivity labels, basic eDiscovery, baseline DLP, Office Message Encryption), Microsoft Defender for Office 365 Plan 1 (Safe Links / Safe Attachments / anti-phish basic), Azure Information Protection P1.",
      "NO Windows licence, NO Microsoft Intune, NO Microsoft Entra ID P1 \u2014 add EMS E3 (~$10.60 / user / month) if Intune + Conditional Access are needed (Office 365 E3 + EMS E3 \u2248 Microsoft 365 E3 in features but you pay for them as two separate line items).",
      "NO Defender for Endpoint, NO Defender for Identity, NO Defender for Cloud Apps, NO Purview E5 (IRM / Audit Premium / eDiscovery Premium / Communication Compliance), NO Entra ID P2 (PIM / Identity Protection).",
      "EEA tenants: buy the \"Office 365 E3 (no Teams) EEA\" SKU + Microsoft Teams Enterprise as a separate per-user SKU.",
      "Step up to Office 365 E5 when Defender for Office P2 / Purview E5 / Power BI Pro / Teams Phone are needed; switch to Microsoft 365 E3 when Windows + Intune + Entra P1 should be bundled."
    ],
    docs: [
      ["Compare Office 365 plans (E1 / E3 / E5)", "https://www.microsoft.com/microsoft-365/business/compare-office-365-plans"],
      ["Office 365 service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-platform-service-description"],
      ["Enterprise Mobility + Security (EMS) plans", "https://www.microsoft.com/microsoft-365/enterprise-mobility-security/compare-plans-and-pricing"],
      ["Microsoft Licensing \u2014 Microsoft 365 + Teams 2025 packaging update (EEA No-Teams SKUs)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"],
      ["M365 Maps \u2014 Office 365 E3", "https://m365maps.com/Office%20365%20E3.htm"]
    ],
    actions: [
      { label: "\u2190 Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_iw_o5: {
    result: true,
    badge: "Office 365 E5",
    badgeClass: "badge-premium",
    title: "Office 365 E5",
    sub: "O5 = O3 + Defender for Office 365 P2 + Microsoft Purview E5 + Power BI Pro + Teams Phone Standard. Still NO Windows / Intune / Entra ID P2.",
    license: "Office 365 E5, per user (~$38 / user / month) \u2014 about $20 / user / month less than Microsoft 365 E5",
    decisionBasis: "You picked Information / knowledge worker, declined the full M365 bundle, picked O365 cloud collab, AND need O5-tier premium services. Office 365 E5 bundles DfO P2 + Purview E5 + Power BI Pro + Teams Phone \u2014 cheaper than buying O3 + those four as add-ons, and meaningfully cheaper than M365 E5 if Windows / Intune / Entra P2 are licensed separately.",
    bullets: [
      "Everything in Office 365 E3 (installed Office apps + 100 GB Exchange + Teams + SharePoint + OneDrive + DfO P1 + AIP P1).",
      "Microsoft Defender for Office 365 Plan 2 \u2014 Safe Links / Safe Attachments / anti-phish impersonation + Threat Explorer + Automated Investigation and Response (AIR) + Attack Simulation Training.",
      "Microsoft Purview E5 \u2014 Insider Risk Management, Communication Compliance, eDiscovery Premium (custodian / hold / review), Audit Premium (1-year retention + MailItemsAccessed crucial events), Customer Lockbox, Customer Key (HSM-backed), Information Barriers, Privileged Access Management for Office, automatic labelling.",
      "Power BI Pro per user \u2014 publish / share / consume Pro workspaces and reports.",
      "Microsoft Teams Phone Standard \u2014 PSTN calling control plane (calling plan / direct routing / operator connect minutes are EXTRA).",
      "Does NOT include Defender for Endpoint, Defender for Identity, Defender for Cloud Apps, Microsoft Entra ID P2 (PIM / Identity Protection), Microsoft Intune, or Windows licence \u2014 add EMS E5 (~$16.40 / user / month) for those, OR step up to Microsoft 365 E5 to bundle everything.",
      "EEA tenants: buy the \"Office 365 E5 (no Teams) EEA\" SKU + Microsoft Teams Enterprise as a separate per-user SKU \u2014 Teams Phone Standard still ships separately in the EEA bundle.",
      "Common stack: Office 365 E5 + EMS E5 = the OLD \"Microsoft 365 E5\" buy pattern from before M365 was bundled \u2014 still valid and sometimes priced better than M365 E5 depending on EA / CSP terms."
    ],
    docs: [
      ["Compare Office 365 plans (E1 / E3 / E5)", "https://www.microsoft.com/microsoft-365/business/compare-office-365-plans"],
      ["Microsoft Purview service description \u2014 E5 features", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-purview-service-description"],
      ["Microsoft Defender for Office 365 P2 service description", "https://learn.microsoft.com/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description#microsoft-defender-for-office-365"],
      ["Power BI Pro licensing", "https://learn.microsoft.com/power-bi/fundamentals/service-features-license-type"],
      ["Microsoft Licensing \u2014 Microsoft 365 + Teams 2025 packaging update (EEA No-Teams SKUs)", "https://www.microsoft.com/en-us/licensing/news/Microsoft365-Teams-2025"],
      ["M365 Maps \u2014 Office 365 E5", "https://m365maps.com/Office%20365%20E5.htm"]
    ],
    actions: [
      { label: "Deep-dive: Teams Phone licensing", target: "info_teams_phone", tone: "secondary" },
      { label: "Deep-dive: Viva / Project / Visio / Power Platform / Copilot add-ons", target: "info_workload_addons", tone: "secondary" },
      { label: "\u2190 Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_smb_apps: {
    result: true,
    badge: "M365 Apps for Business",
    badgeClass: "badge-info",
    title: "Microsoft 365 Apps for Business",
    sub: "Installed Office desktop apps — Word / Excel / PowerPoint / Outlook on Windows or Mac, plus 1 TB OneDrive. NO Exchange / Teams / SharePoint cloud services.",
    license: "Microsoft 365 Apps for Business, per user (≤ 300 seat hard cap shared with the other Business SKUs)",
    decisionBasis: "You picked SMB and said the user does NOT need Microsoft cloud collaboration (Exchange / Teams / SharePoint). M365 Apps for Business is the apps-only Business-tier SKU — cheaper than Business Basic / Standard / Premium when the org gets email and chat from a third party (Google Workspace, on-prem Exchange, etc.) or doesn't need them at all.",
    bullets: [
      "Installed Office desktop apps (Word / Excel / PowerPoint / Outlook / OneNote on Windows; Word / Excel / PowerPoint / Outlook on Mac) on up to 5 PCs/Macs + 5 tablets + 5 phones per user. Includes Access and Publisher on Windows.",
      "Includes 1 TB OneDrive for Business storage. This is the ONE cloud service bundled.",
      "Does NOT include Exchange Online (no mailbox), Microsoft Teams, SharePoint Online, Loop, Bookings, Clipchamp, or Stream cloud services. Mail and collaboration must come from a third party (Google Workspace, on-prem Exchange, etc.) or be added as standalone SKUs.",
      "Does NOT include Microsoft Defender for Business, Microsoft Intune, Microsoft Entra ID P1, or any of the security / device-management uplifts in Business Premium.",
      "Hard 300-seat cap is shared across ALL Business-tier SKUs combined (Apps for Business + Basic + Standard + Premium). At 301 seats Microsoft requires Enterprise SKUs (Microsoft 365 Apps for Enterprise or E3 / E5 / E7).",
      "Step up to Business Basic / Standard / Premium when the org adopts Microsoft cloud collab; step up to Microsoft 365 Apps for Enterprise (no seat cap, same apps-only scope) when you exceed 300 seats."
    ],
    docs: [
      ["Microsoft 365 Apps for Business — overview", "https://www.microsoft.com/microsoft-365/business/microsoft-365-apps-for-business"],
      ["Office applications service description", "https://learn.microsoft.com/office365/servicedescriptions/office-applications-service-description/office-applications-service-description"],
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft 365 Business 300-seat limit (applies to Apps for Business too)", "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan"],
      ["M365 Maps — Apps for Business", "https://m365maps.com/Microsoft%20365%20Apps%20for%20business.htm"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_smb_basic: {
    result: true,
    badge: "Business Basic",
    badgeClass: "badge-info",
    title: "Microsoft 365 Business Basic",
    sub: "Web/mobile Office only — Exchange + Teams + SharePoint + OneDrive without installed desktop apps.",
    license: "Microsoft 365 Business Basic, per user (≤ 300 seat hard cap across all Business SKUs combined)",
    decisionBasis: "You picked SMB, declined desktop Office apps, and declined Defender for Business + Intune + Entra ID P1. Business Basic is the smallest Business SKU and covers web/mobile Office + Exchange (50 GB) + Teams + SharePoint + OneDrive.",
    bullets: [
      "Includes Exchange Online (50 GB), Teams, SharePoint, OneDrive, Office for the web. No installed desktop apps.",
      "Hard 300-seat cap across all Business SKUs combined — at 301 seats Microsoft requires Enterprise (E) SKUs.",
      "Step up to Business Standard when users need installed Word/Excel/PowerPoint/Outlook desktop apps.",
      "Step up to Business Premium when you need Defender for Business + Intune + Entra ID P1."
    ],
    docs: [
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft 365 Business 300-seat limit", "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan"],
      ["Microsoft Product Terms — Microsoft 365 Business Online Services (300-seat cap is a Product Terms Use Right)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["M365 Maps — Business plans", "https://m365maps.com/"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_smb_standard: {
    result: true,
    badge: "Business Standard",
    badgeClass: "badge-info",
    title: "Microsoft 365 Business Standard",
    sub: "Business Basic + installed desktop Office apps (Word/Excel/PowerPoint/Outlook on Windows or Mac).",
    license: "Microsoft 365 Business Standard, per user (≤ 300 seat hard cap across all Business SKUs combined)",
    decisionBasis: "You picked SMB, need installed desktop Office apps, but don't need Defender for Business + Intune + Entra ID P1. Business Standard adds installed Office to the Basic feature set without bundling security / device management.",
    bullets: [
      "Business Basic + installed Word, Excel, PowerPoint, Outlook, OneNote (and Access / Publisher on Windows).",
      "Includes Microsoft Loop, Microsoft Bookings, and Clipchamp.",
      "Hard 300-seat cap across all Business SKUs combined.",
      "Step up to Business Premium when you need Defender for Business + Intune + Entra ID P1 — that's the smallest Business tier with serious security."
    ],
    docs: [
      ["Compare Microsoft 365 Business plans", "https://www.microsoft.com/microsoft-365/business/compare-all-plans"],
      ["Microsoft 365 Business Standard overview", "https://www.microsoft.com/microsoft-365/business/microsoft-365-business-standard"],
      ["Microsoft Product Terms — Microsoft 365 Business Online Services (300-seat cap is a Product Terms Use Right)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["M365 Maps — Business plans", "https://m365maps.com/"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_smb_premium: {
    result: true,
    badge: "Business Premium",
    badgeClass: "badge-premium",
    title: "Microsoft 365 Business Premium",
    sub: "Business Standard + Defender for Business + Microsoft Intune + Entra ID P1 + Defender for Office 365 P1 + AIP P1.",
    license: "Microsoft 365 Business Premium, per user (≤ 300 seat hard cap across all Business SKUs combined)",
    decisionBasis: "You picked SMB and need Defender for Business + Intune + Entra ID P1. Business Premium is the smallest Business SKU that bundles serious endpoint security, device management, and Conditional Access — and is the right baseline for any SMB serious about security.",
    bullets: [
      "Includes everything in Business Standard plus Microsoft Defender for Business, Microsoft Intune (MDM/MAM), Microsoft Entra ID P1 (Conditional Access + MFA), Defender for Office 365 P1, and AIP P1.",
      "Hard 300-seat cap across all Business SKUs combined.",
      "Add Microsoft 365 Copilot per user as needed (or upgrade to M365 Copilot Business).",
      "Add Microsoft Defender Suite for Business Premium to layer Entra ID P2 + Defender XDR + Purview Suite features on top.",
      "At 301 seats Microsoft requires you to switch the whole tenant to Enterprise SKUs — plan the cutover before 280 seats."
    ],
    docs: [
      ["Microsoft 365 Business Premium overview", "https://learn.microsoft.com/microsoft-365/business-premium/"],
      ["Microsoft Defender Suite for Business Premium", "https://learn.microsoft.com/defender-xdr/microsoft-defender-suite-for-business-premium"],
      ["Microsoft 365 Business 300-seat limit", "https://learn.microsoft.com/microsoft-365/commerce/subscriptions/upgrade-to-different-plan"],
      ["Microsoft Product Terms — Microsoft 365 Business Online Services (300-seat cap is a Product Terms Use Right)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "Deep-dive: Teams Phone licensing", target: "info_teams_phone", tone: "secondary" },
      { label: "Deep-dive: Windows 365 / Cloud PC", target: "info_windows_365", tone: "secondary" },
      { label: "Deep-dive: Viva / Project / Visio / Power Platform / Copilot add-ons", target: "info_workload_addons", tone: "secondary" },
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_frontline_f1: {
    result: true,
    badge: "Microsoft 365 F1",
    badgeClass: "badge-info",
    title: "Microsoft 365 F1",
    sub: "Mailbox-less frontline tier — Teams + SharePoint browse + Stream + Intune + Entra ID P1.",
    license: "Microsoft 365 F1, per frontline user (eligibility-gated to deskless / shared-device workers, per-tenant cap)",
    decisionBasis: "You picked Frontline and confirmed the user does NOT need their own Exchange mailbox. F1 is the entry frontline tier — Teams-first, no mailbox, no installed Office apps — and is the cheapest Microsoft 365 SKU.",
    bullets: [
      "Includes Teams, SharePoint (browse), Yammer / Viva Engage, Stream, Office for the web (view-only), Intune, Entra ID P1.",
      "NO mailbox, NO installed Office apps — by design.",
      "Eligibility-gated to workers who don't primarily work at a desk, aren't assigned a personal computer, and often share a device. Microsoft audits assignment.",
      "Step up to F3 when the worker needs their own mailbox or mobile Office apps.",
      "Frontline add-ons: Teams Phone with Calling Plan, Microsoft 365 Copilot for Frontline (where licensed), Defender for Endpoint P1 (frontline-specific tier)."
    ],
    docs: [
      ["Compare frontline plans (F1 vs F3)", "https://learn.microsoft.com/microsoft-365/frontline/flw-licensing-options"],
      ["Frontline worker license eligibility", "https://learn.microsoft.com/microsoft-365/frontline/flw-licensing-options#frontline-worker-license-eligibility"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (frontline Use Rights & eligibility)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["M365 Comparison table — Enterprise & Frontline plans (PDF)", "https://aka.ms/M365EnterprisePlans"]
    ],
    actions: [
      { label: "Deep-dive: Teams Phone licensing", target: "info_teams_phone", tone: "secondary" },
      { label: "Deep-dive: Windows 365 / Cloud PC", target: "info_windows_365", tone: "secondary" },
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_frontline_f3: {
    result: true,
    badge: "Microsoft 365 F3",
    badgeClass: "badge-info",
    title: "Microsoft 365 F3",
    sub: "F1 + 2 GB Exchange Online mailbox + mobile Office apps + Defender for Office P1 + AIP P1.",
    license: "Microsoft 365 F3, per frontline user (eligibility-gated to deskless / shared-device workers, per-tenant cap)",
    decisionBasis: "You picked Frontline and confirmed the user needs their own Exchange mailbox. F3 adds a 2 GB mailbox + mobile Office to F1 — the right SKU for frontline workers who actually receive email.",
    bullets: [
      "Includes everything in F1 plus a 2 GB Exchange Online mailbox, Office mobile apps (commercial-use rights), Defender for Office 365 P1, AIP P1, Power Apps / Power Automate for F3 use rights.",
      "Still eligibility-gated to deskless / shared-device workers — same per-tenant cap as F1.",
      "Frontline add-ons: Teams Phone with Calling Plan, Microsoft 365 Copilot for Frontline (where licensed), Defender for Endpoint P1.",
      "Do NOT assign F SKUs to information workers, IT admins, or anyone with a dedicated desk and personal PC — Microsoft audits assignment."
    ],
    docs: [
      ["Compare frontline plans (F1 vs F3)", "https://learn.microsoft.com/microsoft-365/frontline/flw-licensing-options"],
      ["Microsoft 365 for frontline workers — overview", "https://learn.microsoft.com/microsoft-365/frontline/flw-overview"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (frontline Use Rights & eligibility)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"],
      ["M365 Comparison table — Enterprise & Frontline plans (PDF)", "https://aka.ms/M365EnterprisePlans"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_frontline_computed: {
    result: true,
    computed: "frontline",
    badge: "AI-assisted recommendation",
    badgeClass: "badge-info",
    title: "Your best-value frontline recommendation",
    sub: "Computed live from your answers — base SKU + every Microsoft-approved add-on you flagged, totalled and compared against E3 and E5 list prices so you get the cheapest licensing posture that still meets every requirement.",
    decisionBasis: "You completed the step-by-step frontline qualification wizard. The recommendation below is computed from your eligibility check, the per-feature E-vs-F gap walkthrough, and the Microsoft list prices for every add-on you said Yes to.",
    paragraphs: [
      "This card is generated by an AI-assisted calculator that aggregates every Yes you gave through the wizard into one of four outcomes: (1) F1 base, (2) F3 base, (3) F3 + Microsoft-approved add-ons, or (4) E3 / E5 uplift because either a hard-fail feature gap was flagged OR the cumulative F + add-on cost exceeded the corresponding E SKU list price.",
      "Cost figures are Microsoft public list prices on annual commitment in USD. Your actual CSP / EA / EES / partner-channel pricing will differ — always confirm with your Microsoft account team before purchase.",
      "Run the wizard again from a different starting point to see how a single requirement (e.g. mailbox > 2 GB, Copilot, Defender Plan 2) shifts the breakeven against E3 / E5."
    ],
    docs: [
      ["Changing from a Microsoft 365 E plan to a Microsoft 365 F plan (canonical E-vs-F gap reference)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/switch-from-enterprise-to-frontline?view=o365-worldwide"],
      ["Understand frontline worker user types and licensing (eligibility definition)", "https://learn.microsoft.com/en-us/microsoft-365/frontline/flw-licensing-options?view=o365-worldwide"],
      ["Microsoft 365 — Licensing Resources and Documents (canonical hub: plan comparisons, service descriptions, Product Terms)", "https://www.microsoft.com/licensing/docs/view/Microsoft-365"],
      ["Microsoft 365 frontline plans & pricing", "https://www.microsoft.com/en-us/microsoft-365/enterprise/frontline-plans-and-pricing"],
      ["Microsoft 365 Enterprise plans & pricing", "https://www.microsoft.com/en-us/microsoft-365/enterprise/microsoft365-plans-and-pricing"],
      ["Modern Work Plan Comparison — Enterprise (May 2026 PDF: authoritative per-feature matrix incl. Defender Suite FLW & Purview Suite FLW)", "https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/education/Modern-Work-Plan-Comparison-Enterprise-5-1-2026.pdf"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (frontline Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "Re-run frontline wizard", target: "q_frontline_eligibility", tone: "primary" },
      { label: "Deep-dive: Microsoft 365 F1 details", target: "result_frontline_f1", tone: "secondary" },
      { label: "Deep-dive: Microsoft 365 F3 details", target: "result_frontline_f3", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_edu_a1: {
    result: true,
    badge: "Microsoft 365 A1",
    badgeClass: "badge-info",
    title: "Microsoft 365 A1",
    sub: "Web/mobile-only education tier — Office for the web + Teams for Education + SharePoint + OneDrive (capped). Free for qualifying students.",
    license: "Microsoft 365 A1, per user (qualifying academic institution; faculty paid, student often free)",
    decisionBasis: "You picked Education, declined E5-tier security/compliance, and declined the need for installed desktop Office + Exchange + Intune. A1 is the entry academic SKU — web/mobile only — and is free for qualifying students.",
    bullets: [
      "Includes Office for the web, Teams for Education, SharePoint, OneDrive (capped storage), basic Intune for Education, Entra ID P1 (faculty) or Entra ID Free (student).",
      "Free for qualifying students at validated academic institutions; faculty A1 is paid.",
      "Step up to A3 when faculty / students need installed Office + Exchange Online + full Intune.",
      "Step up to A5 when you need E5-tier security/compliance (Defender XDR / Purview E5 / Entra ID P2)."
    ],
    docs: [
      ["Compare M365 Education plans (A1 / A3 / A5)", "https://www.microsoft.com/education/products/office"],
      ["Microsoft 365 Education service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education"],
      ["Education academic eligibility", "https://www.microsoft.com/education/how-to-buy/academic-eligibility"],
      ["Microsoft Product Terms — Microsoft 365 Education Online Services (Qualified Educational User definition)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_edu_a3: {
    result: true,
    badge: "Microsoft 365 A3",
    badgeClass: "badge-premium",
    title: "Microsoft 365 A3",
    sub: "Academic equivalent of E3 — installed Office + Exchange + Intune + Entra ID P1 + AIP P1 + Defender for Office P1.",
    license: "Microsoft 365 A3, per user (qualifying academic institution; faculty / student SKUs differ)",
    decisionBasis: "You picked Education, need installed desktop Office + Exchange + Intune, but don't need E5-tier security/compliance. A3 mirrors commercial E3 at academic pricing and is the most common paid education baseline.",
    bullets: [
      "Includes desktop Office apps, Exchange Online, Microsoft Intune, Entra ID P1, AIP P1, Defender for Office 365 P1.",
      "Faculty A3 includes Power BI Pro; student A3 does not.",
      "Step up to A5 when you need Defender XDR / Defender for Endpoint / Defender for Identity / Defender for Cloud Apps / Purview E5 / Entra ID P2.",
      "Education-specific add-ons: Microsoft 365 Copilot for Education (faculty / student where available), Minecraft Education, Reading Coach / Reflect / Insights."
    ],
    docs: [
      ["Compare M365 Education plans (A1 / A3 / A5)", "https://www.microsoft.com/education/products/office"],
      ["Microsoft 365 Education service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education"],
      ["Microsoft 365 Copilot for Education", "https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-education"],
      ["Microsoft Product Terms — Microsoft 365 Education Online Services (Qualified Educational User definition)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_edu_a5: {
    result: true,
    badge: "Microsoft 365 A5",
    badgeClass: "badge-premium",
    title: "Microsoft 365 A5",
    sub: "Academic equivalent of E5 — A3 + Defender XDR + Defender for Endpoint + Defender for Identity + Defender for Cloud Apps + Purview E5 + Entra ID P2.",
    license: "Microsoft 365 A5, per user (qualifying academic institution; faculty / student SKUs differ)",
    decisionBasis: "You picked Education AND need E5-tier security / compliance / identity for the institution. A5 mirrors commercial E5 at academic pricing and is the top education SKU.",
    bullets: [
      "Includes everything in A3 plus Defender XDR, Defender for Endpoint, Defender for Identity, Defender for Cloud Apps, Purview E5 (eDiscovery Premium, IRM, Audit Premium), Entra ID P2 (PIM, Identity Protection).",
      "Faculty A5 includes Power BI Pro and Teams Phone; student A5 does not.",
      "Standalone A5 Security and A5 Compliance add-ons exist as a bump from A3 if you only need one half of the E5 stack.",
      "Education-specific add-ons: Microsoft 365 Copilot for Education, Minecraft Education, Reading Coach / Reflect / Insights."
    ],
    docs: [
      ["Compare M365 Education plans (A1 / A3 / A5)", "https://www.microsoft.com/education/products/office"],
      ["Microsoft 365 Education service description", "https://learn.microsoft.com/office365/servicedescriptions/office-365-platform-service-description/office-365-education"],
      ["Microsoft 365 Copilot for Education", "https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-education"],
      ["Microsoft Product Terms — Microsoft 365 Education Online Services (Qualified Educational User definition)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "Deep-dive: Per-device & shared-workstation licensing", target: "info_per_device_licensing", tone: "secondary" },
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_gov_g1: {
    result: true,
    badge: "Microsoft 365 G1",
    badgeClass: "badge-warning",
    title: "Microsoft 365 G1 (Government)",
    sub: "Web/mobile only — equivalent to commercial E1. Sovereign-cloud caveats apply (see banner above).",
    license: "Microsoft 365 G1, per user (in the sovereign cloud you selected — feature parity differs by cloud)",
    decisionBasis: "You picked Government, chose a sovereign cloud, and need the basic web/mobile tier. G1 mirrors commercial E1 with US government accreditation in the chosen cloud — verify feature availability against the government cloud service description before purchase.",
    bullets: [
      "Includes Exchange Online (50 GB), Teams, SharePoint, OneDrive, Office for the web. No installed desktop apps.",
      "Sovereign cloud feature parity differs from commercial — Copilot, Entra Suite, Defender XDR availability varies by cloud (see banner above).",
      "Step up to G3 when users need installed desktop Office, Intune, Entra ID P1.",
      "Step up to G5 when you need Defender XDR / Purview E5 / Entra ID P2 in the same cloud."
    ],
    docs: [
      ["Microsoft 365 Government — overview & plans", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government"],
      ["Compare Microsoft 365 Government plans (GCC / GCC High / DoD)", "https://www.microsoft.com/microsoft-365/government"],
      ["GCC vs GCC High vs DoD feature differences", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government-gcc-high"],
      ["Microsoft Product Terms — Microsoft 365 Government Online Services (sovereign-cloud Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_gov_g3: {
    result: true,
    badge: "Microsoft 365 G3",
    badgeClass: "badge-premium",
    title: "Microsoft 365 G3 (Government)",
    sub: "Equivalent to commercial E3 — installed Office + Exchange + Intune + Entra ID P1. Sovereign-cloud caveats apply.",
    license: "Microsoft 365 G3, per user (in the sovereign cloud you selected — feature parity differs by cloud)",
    decisionBasis: "You picked Government, chose a sovereign cloud, and need the E3-equivalent tier. G3 mirrors commercial E3 with US government accreditation in the chosen cloud — confirm Defender for Office P1 and Intune availability against the cloud's service description.",
    bullets: [
      "Includes desktop Office, Exchange Online Plan 2, Teams, SharePoint, OneDrive, Microsoft Intune, Entra ID P1, AIP P1, Defender for Office 365 P1 (where available in the cloud).",
      "Sovereign cloud feature parity differs — verify Defender, Copilot, Entra Suite, and Purview Premium availability for your cloud before buying.",
      "Step up to G5 when you need Defender XDR / Purview E5 / Entra ID P2.",
      "Cross-tenant collaboration with commercial M365 tenants is restricted in GCC High / DoD — plan B2B carefully."
    ],
    docs: [
      ["Microsoft 365 Government — overview & plans", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government"],
      ["GCC vs GCC High vs DoD feature differences", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government-gcc-high"],
      ["Microsoft Defender for Government", "https://learn.microsoft.com/defender-xdr/usgov"],
      ["Microsoft Product Terms — Microsoft 365 Government Online Services (sovereign-cloud Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_gov_g5: {
    result: true,
    badge: "Microsoft 365 G5",
    badgeClass: "badge-premium",
    title: "Microsoft 365 G5 (Government)",
    sub: "Equivalent to commercial E5 — G3 + Defender XDR + Purview E5 + Entra ID P2. Sovereign-cloud caveats apply.",
    license: "Microsoft 365 G5, per user (in the sovereign cloud you selected — feature parity differs by cloud)",
    decisionBasis: "You picked Government, chose a sovereign cloud, AND need E5-tier security / compliance / identity. G5 mirrors commercial E5 with US government accreditation — confirm every premium SKU's availability against the cloud's service description.",
    bullets: [
      "Includes everything in G3 plus Defender XDR, Defender for Endpoint P2, Defender for Identity, Defender for Cloud Apps, Defender for Office 365 P2, Purview E5 (eDiscovery Premium, IRM, Audit Premium, Customer Lockbox where available), Entra ID P2.",
      "Sovereign cloud feature parity differs — some Defender XDR and Purview features lag commercial in GCC High / DoD. Verify per workload.",
      "Copilot availability in government clouds is rolling out gradually — confirm Copilot for Government availability in your cloud before relying on it.",
      "Entra Suite (Global Secure Access, Verified ID) availability is limited in GCC High / DoD — verify before relying on it."
    ],
    docs: [
      ["Microsoft 365 Government — overview & plans", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government"],
      ["Microsoft Defender for Government", "https://learn.microsoft.com/defender-xdr/usgov"],
      ["Microsoft Purview for US Government", "https://learn.microsoft.com/purview/purview-fairfax"],
      ["Microsoft 365 Copilot for Government", "https://learn.microsoft.com/microsoft-365-copilot/microsoft-365-copilot-government"],
      ["Microsoft Product Terms — Microsoft 365 Government Online Services (sovereign-cloud Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_gov_il6: {
    result: true,
    badge: "M365 Air-Gapped (IL6)",
    badgeClass: "badge-warning",
    title: "Microsoft 365 Air-Gapped (Top Secret / DoD IL6)",
    sub: "Classified workloads on physically separated infrastructure. Verify every premium SKU against the Air-Gapped product page before purchasing.",
    license: "Microsoft 365 Air-Gapped (Top Secret / DoD IL6) — verify SKU availability against the Air-Gapped product page; engage Microsoft FedCiv account team",
    decisionBasis: "You picked Government and chose Microsoft 365 Air-Gapped. This is a separately-architected, physically-isolated cloud for classified workloads — commercial-feature parity is intentionally limited and SKU availability is gated. Pricing and entitlements are negotiated directly with the Microsoft FedCiv team.",
    bullets: [
      "Air-Gapped operates on physically separated infrastructure — most commercial features either lag significantly or are unavailable.",
      "Verify every premium SKU (Copilot, Defender XDR, Purview Premium, Entra Suite, Teams Premium) against the Air-Gapped product page before assuming it's available.",
      "Engage the Microsoft FedCiv / Federal Civilian account team early — eligibility, provisioning, and procurement happen through Microsoft directly, not standard CSP partners.",
      "Cross-cloud collaboration (to commercial / GCC / GCC High / DoD) is heavily restricted by design."
    ],
    docs: [
      ["Microsoft 365 Government — overview & plans", "https://learn.microsoft.com/microsoft-365/enterprise/microsoft-365-us-government"],
      ["Compare Microsoft 365 Government plans", "https://www.microsoft.com/microsoft-365/government"],
      ["Compliance between Commercial, Government, DoD & Secret offerings", "https://techcommunity.microsoft.com/blog/publicsectorblog/understanding-compliance-between-commercial-government-dod--secret-offerings---m/4225436"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_npo_business_premium: {
    result: true,
    badge: "Nonprofit Business Premium",
    badgeClass: "badge-premium",
    title: "Microsoft 365 Business Premium — Nonprofit (grant + NSP)",
    sub: "Up to 10 free seats per validated nonprofit as a grant; additional seats at Nonprofit Staff Pricing (NSP).",
    license: "Microsoft 365 Business Premium for Nonprofits — first 10 seats free as a grant; additional seats at NSP rates (≤ 300 seat hard cap)",
    decisionBasis: "You picked Nonprofit and are at or below 300 seats. Business Premium is the right Business-family SKU and is also the Microsoft Nonprofits grant SKU — qualifying nonprofits get up to 10 free seats as a grant, with additional seats priced at NSP.",
    bullets: [
      "Up to 10 free Business Premium seats per validated nonprofit as a Microsoft for Nonprofits grant.",
      "Additional seats beyond the grant are priced at Nonprofit Staff Pricing (steeply discounted from commercial).",
      "Hard 300-seat cap across all Business SKUs combined — above 300 seats move to E3/E5 NSP.",
      "Requires active Microsoft Nonprofits enrollment and annual re-validation (TechSoup in the US, or equivalent partner in other markets).",
      "Common add-ons NOT free under the grant: Microsoft 365 Copilot, Teams Phone, Defender Suite for Business Premium — priced at NSP."
    ],
    docs: [
      ["Microsoft 365 Business Premium grant eligibility", "https://learn.microsoft.com/microsoft-365/nonprofit/microsoft-365-business-premium-grant"],
      ["Microsoft for Nonprofits — products & pricing", "https://www.microsoft.com/nonprofits"],
      ["Microsoft Nonprofits eligibility guidelines", "https://www.microsoft.com/nonprofits/eligibility"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (Nonprofit Staff Pricing Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_npo_e3: {
    result: true,
    badge: "M365 E3 — Nonprofit",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E3 — Nonprofit Staff Pricing",
    sub: "Enterprise E3 at NSP rates — for nonprofits above the 300-seat Business cap, without E5-tier security needs.",
    license: "Microsoft 365 E3 at Nonprofit Staff Pricing, per user (no seat cap)",
    decisionBasis: "You picked Nonprofit, are above 300 seats, and don't need E5-tier security. M365 E3 at NSP rates is the enterprise-tier baseline for larger nonprofits — same entitlements as commercial E3 at deeply discounted pricing.",
    bullets: [
      "Same feature shape as commercial E3 — installed Office, Exchange P2, Teams, Intune, Entra ID P1.",
      "No seat cap — replaces Business SKUs once the org exceeds 300 seats.",
      "Add Microsoft 365 Copilot at NSP rates per user as needed.",
      "Requires active Microsoft Nonprofits enrollment and annual re-validation.",
      "If you later need Defender XDR / Purview E5 / Entra ID P2, step up to M365 E5 at NSP."
    ],
    docs: [
      ["Microsoft for Nonprofits — products & pricing", "https://www.microsoft.com/nonprofits"],
      ["Microsoft 365 for nonprofits — get started", "https://learn.microsoft.com/microsoft-365/nonprofit/"],
      ["Microsoft Nonprofits eligibility guidelines", "https://www.microsoft.com/nonprofits/eligibility"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (Nonprofit Staff Pricing Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_npo_e5: {
    result: true,
    badge: "M365 E5 — Nonprofit",
    badgeClass: "badge-premium",
    title: "Microsoft 365 E5 — Nonprofit Staff Pricing",
    sub: "Enterprise E5 at NSP rates — for nonprofits above 300 seats that need Defender XDR + Purview E5 + Entra ID P2.",
    license: "Microsoft 365 E5 at Nonprofit Staff Pricing, per user (no seat cap)",
    decisionBasis: "You picked Nonprofit, are above 300 seats, AND need E5-tier security / compliance / identity. M365 E5 at NSP rates is the enterprise-tier security-and-compliance SKU for larger nonprofits — same entitlements as commercial E5.",
    bullets: [
      "Same feature shape as commercial E5 — Defender Suite + Purview E5 + Entra ID P2 bundled in.",
      "No seat cap — the right tier for nonprofits >300 seats with serious security / compliance needs.",
      "Add Microsoft 365 Copilot at NSP rates per user as needed (or evaluate M365 E7 if also adding Entra Suite + Agent 365).",
      "Requires active Microsoft Nonprofits enrollment and annual re-validation."
    ],
    docs: [
      ["Microsoft for Nonprofits — products & pricing", "https://www.microsoft.com/nonprofits"],
      ["Microsoft 365 for nonprofits — get started", "https://learn.microsoft.com/microsoft-365/nonprofit/"],
      ["Microsoft Nonprofits eligibility guidelines", "https://www.microsoft.com/nonprofits/eligibility"],
      ["Microsoft Product Terms — Microsoft 365 Online Services (Nonprofit Staff Pricing Use Rights)", "https://www.microsoft.com/licensing/terms/productoffering/MicrosoftOffice365/EAEAS"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_extid_free: {
    result: true,
    badge: "External ID — free MAU tier",
    badgeClass: "badge-success",
    title: "Entra External ID — Free MAU tier",
    sub: "Basic B2B collaboration. First 50,000 Monthly Active Users (MAU) per tenant are free; no per-seat M365 license needed.",
    license: "No per-seat license. Microsoft Entra External ID free MAU tier (first 50,000 MAU per tenant free)",
    decisionBasis: "You picked External ID and confirmed basic B2B collaboration is enough — no risk-based CA, no PIM, no Verified ID. The free MAU tier covers normal guest collaboration scenarios for most tenants.",
    bullets: [
      "First 50,000 Monthly Active Users (MAU) per tenant are free — covers basic B2B invitations + shared content access.",
      "Includes B2B Collaboration (invite guests from other Entra tenants) and B2B Direct Connect (Teams shared channels) at the basic tier.",
      "Guests do NOT need an M365 service license to consume shared Teams / SharePoint content — they use the inviting tenant's licensed resources.",
      "Beyond 50,000 MAU per tenant, billed monthly at the free-tier per-MAU rate.",
      "Step up to External ID P1/P2 only when you actually need premium features (risk-based CA, Identity Protection, PIM for guests, Verified ID)."
    ],
    docs: [
      ["Microsoft Entra External ID — overview", "https://learn.microsoft.com/entra/external-id/external-identities-overview"],
      ["External ID pricing & billing model (MAU)", "https://learn.microsoft.com/entra/external-id/external-identities-pricing"],
      ["B2B collaboration overview", "https://learn.microsoft.com/entra/external-id/what-is-b2b"],
      ["2024 update to the 'External Users' definition (Microsoft Licensing News)", "https://www.microsoft.com/en-us/licensing/news/Update-to-external-users-2024"],
      ["Microsoft Product Terms — Universal License Terms (External Users)", "https://www.microsoft.com/licensing/terms/product/UniversalLicenseTerms/all"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_extid_p2: {
    result: true,
    badge: "External ID — P2 MAU",
    badgeClass: "badge-premium",
    title: "Entra External ID — Premium P2 MAU pricing",
    sub: "Premium features (risk-based CA, Identity Protection, PIM for guests) priced per active MAU.",
    license: "Microsoft Entra External ID Premium P2 — per Monthly Active User in scope of premium policies",
    decisionBasis: "You picked External ID and need premium identity features for guests — risk-based Conditional Access, Identity Protection, or PIM for external users. External ID P2 MAU pricing covers premium features per active guest user.",
    bullets: [
      "External ID Premium P2 enables risk-based Conditional Access, premium risk detections, and PIM workflows scoped to external identities.",
      "Billed per Monthly Active User in scope of the premium policy — not a flat per-tenant fee.",
      "External ID P1 (risk-based CA without Identity Protection's premium detections) is a cheaper option if you don't need P2's risk evaluation.",
      "Free MAU tier (first 50,000 per tenant) still applies to the underlying B2B collaboration — premium pricing is purely the uplift for premium feature scope."
    ],
    docs: [
      ["External ID pricing & billing model (MAU)", "https://learn.microsoft.com/entra/external-id/external-identities-pricing"],
      ["Microsoft Entra External ID — overview", "https://learn.microsoft.com/entra/external-id/external-identities-overview"],
      ["Identity Protection — risks", "https://learn.microsoft.com/entra/id-protection/concept-identity-protection-risks"],
      ["2024 update to the 'External Users' definition (Microsoft Licensing News)", "https://www.microsoft.com/en-us/licensing/news/Update-to-external-users-2024"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_extid_verified: {
    result: true,
    badge: "External ID — Verified ID",
    badgeClass: "badge-info",
    title: "Microsoft Entra Verified ID — per credential issued",
    sub: "Decentralized verifiable credentials for high-trust scenarios. Priced per credential issued.",
    license: "Microsoft Entra Verified ID — per verifiable credential issued (separate from MAU pricing)",
    decisionBasis: "You picked External ID and need to issue Microsoft Entra Verified ID credentials. Verified ID is priced separately from the MAU model — per verifiable credential issued — and is the right SKU for decentralized identifier scenarios.",
    bullets: [
      "Verified ID lets you issue verifiable credentials (W3C VCs) to guests, employees, or customers for high-trust scenarios (employment verification, partner attestation, etc.).",
      "Pricing is per credential issued, not per MAU — separate billing meter from External ID free/P1/P2.",
      "If you also need premium identity features (risk-based CA, PIM) for the same guests, layer External ID P1 or P2 on top.",
      "Microsoft Entra Suite bundles Verified ID + Internet Access + Private Access + Governance + P2 — evaluate Entra Suite when scaling Verified ID for many user populations."
    ],
    docs: [
      ["Microsoft Entra Verified ID", "https://learn.microsoft.com/entra/verified-id/decentralized-identifier-overview"],
      ["External ID pricing & billing model (MAU)", "https://learn.microsoft.com/entra/external-id/external-identities-pricing"],
      ["Microsoft Entra Suite overview", "https://learn.microsoft.com/entra/fundamentals/entra-suite"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  },
  result_extid_ciam: {
    result: true,
    badge: "External ID for customers (CIAM)",
    badgeClass: "badge-info",
    title: "Microsoft Entra External ID for customers (CIAM)",
    sub: "Customer-facing apps with sign-up / sign-in / social identity providers. Separate product and pricing from B2B.",
    license: "Microsoft Entra External ID for customers (CIAM) — separate MAU-based pricing tier from B2B; see External ID pricing page",
    decisionBasis: "You picked External ID and confirmed the use case is customer-facing apps (CIAM), not B2B partners. External ID for customers is a separate product line with its own pricing and feature set, optimized for consumer sign-up / sign-in / social IdPs.",
    bullets: [
      "Use for customer-facing apps that need sign-up / sign-in / social identity providers (Google, Facebook, Apple, Microsoft Account).",
      "Separate billing meter from B2B External ID — see the External ID pricing page for current CIAM MAU rates.",
      "Custom branded sign-up / sign-in pages, user attribute collection, and self-service password reset are included.",
      "Replaces the legacy Azure AD B2C product line for new tenants.",
      "B2B partners and CIAM customers are separately licensed — do not mix the two scenarios in the same MAU bucket."
    ],
    docs: [
      ["External ID for customers (CIAM)", "https://learn.microsoft.com/entra/external-id/customers/overview-customers-ciam"],
      ["External ID pricing & billing model (MAU)", "https://learn.microsoft.com/entra/external-id/external-identities-pricing"],
      ["Microsoft Entra External ID — overview", "https://learn.microsoft.com/entra/external-id/external-identities-overview"],
      ["2024 update to the 'External Users' definition (Microsoft Licensing News)", "https://www.microsoft.com/en-us/licensing/news/Update-to-external-users-2024"]
    ],
    actions: [
      { label: "← Back to profile selector", target: "start_choice", tone: "secondary" }
    ]
  }
};

// Total major phases of the assessment journey.
export const TOTAL_MAJOR_STEPS = 5;

// Default entry node for the assessment.
export const START_NODE_ID = 'start_choice';
