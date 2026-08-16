// Derived security-header strings used by Base.astro. Edit values in src/lib/config.js.

import { CONFIG } from "./config.js";

export const CSP_META: string = CONFIG.security.csp.join("; ");
export const REFERRER_POLICY: string = CONFIG.security.referrerPolicy;
export const PERMISSIONS_POLICY: string = CONFIG.security.permissionsPolicy;
