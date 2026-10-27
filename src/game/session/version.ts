/** Keeps players who haven't entered a name yet on the latest deployed build. */

const RUNNING = process.env.NEXT_PUBLIC_APP_VERSION;
/** The build we last reloaded for, so a stale cache can't cause a reload loop. */
const GUARD_KEY = "mt-reloaded-for";
/** Cache-busting query parameter added to the reload (removed again on boot). */
export const VERSION_PARAM = "v";

async function deployedVersion(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    const body = (await res.json()) as { version?: unknown };
    return res.ok && typeof body.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

/** Hard-refreshes onto the deployed build if this tab runs an older one. True if reloading. */
export async function reloadIfOutdated(): Promise<boolean> {
  const latest = await deployedVersion();
  if (!latest || latest === RUNNING) return false;
  try {
    if (sessionStorage.getItem(GUARD_KEY) === latest) return false;
    sessionStorage.setItem(GUARD_KEY, latest);
  } catch {
    return false;
  }
  const url = new URL(window.location.href);
  url.searchParams.set(VERSION_PARAM, latest);
  window.location.replace(url);
  return true;
}
