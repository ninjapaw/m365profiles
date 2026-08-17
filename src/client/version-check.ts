import { withBase } from "@lib/paths";
import { STORAGE_KEYS } from "@lib/site";
import { APP_VERSION } from "@lib/version";

const versionUrl = withBase("/version.json");

function clearVersionParameter(): void {
  try {
    const currentUrl = new URL(location.href);
    if (currentUrl.searchParams.get("_v") === APP_VERSION) {
      currentUrl.searchParams.delete("_v");
      history.replaceState(null, "", currentUrl.toString());
    }
  } catch {
    // A malformed location should not block the site.
  }
}

function replaceWithLatestVersion(version: string): void {
  try {
    sessionStorage.clear();
    localStorage.setItem(STORAGE_KEYS.knownVersion, version);
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set("_v", version);
    location.replace(nextUrl.toString());
  } catch {
    location.reload();
  }
}

async function checkVersion(): Promise<void> {
  if (!("fetch" in window)) return;

  try {
    const response = await fetch(`${versionUrl}?t=${Date.now()}`, { cache: "no-store" });
    const data = response.ok ? ((await response.json()) as { version?: unknown }) : null;
    if (typeof data?.version !== "string" || !data.version) return;

    let knownVersion: string | null = null;
    try {
      knownVersion = localStorage.getItem(STORAGE_KEYS.knownVersion);
    } catch {
      // Storage can be blocked by browser privacy settings.
    }

    if (knownVersion && knownVersion !== data.version && data.version !== APP_VERSION) {
      replaceWithLatestVersion(data.version);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.knownVersion, data.version);
    } catch {
      // Storage can be blocked by browser privacy settings.
    }
  } catch {
    // Offline or filtered version checks are non-fatal.
  }
}

clearVersionParameter();
void checkVersion();
