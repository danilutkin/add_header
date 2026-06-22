import { siteRuleHasConfiguredHeaders } from "./site-rules";
import type { ExtensionSettings } from "./types";
import { canonicalizePattern, parsePattern } from "./url-match";

/** Chrome host permission origin for a site-rule URL pattern. */
export function patternToHostPermission(pattern: string): string | null {
  const parsed = parsePattern(pattern);
  if (!parsed) return null;

  if (parsed.kind === "subdomain") {
    return `*://*.${parsed.hostname}/*`;
  }

  const scheme = parsed.scheme ?? "https";
  let host = parsed.hostname;
  try {
    const url = new URL(pattern.includes("://") ? pattern : `${scheme}://${pattern}`);
    if (url.port) {
      host = `${url.hostname}:${url.port}`;
    }
  } catch {
    // keep parsed hostname
  }
  return `${scheme}://${host}/*`;
}

export function patternsToHostPermissions(patterns: string[]): string[] {
  const permissions = patterns
    .map(patternToHostPermission)
    .filter((permission): permission is string => permission !== null);
  return [...new Set(permissions)];
}

export function collectPatternsNeedingHostAccess(
  settings: ExtensionSettings,
): string[] {
  const patterns: string[] = [];

  for (const rule of settings.siteRules) {
    if (!rule.enabled || !siteRuleHasConfiguredHeaders(rule)) continue;
    for (const pattern of rule.patterns) {
      const trimmed = pattern.trim();
      if (trimmed) patterns.push(trimmed);
    }
  }

  return patterns;
}

export async function getMissingHostPermissions(
  origins: string[],
): Promise<string[]> {
  const missing: string[] = [];
  for (const origin of origins) {
    const hasPermission = await chrome.permissions.contains({
      origins: [origin],
    });
    if (!hasPermission) missing.push(origin);
  }
  return missing;
}

export async function ensureHostPermissionsForPatterns(
  patterns: string[],
): Promise<boolean> {
  const origins = patternsToHostPermissions(patterns);
  const missing = await getMissingHostPermissions(origins);
  if (missing.length === 0) return true;
  return chrome.permissions.request({ origins: missing });
}

/**
 * Request host access for enabled rules with configured headers.
 * Disables rules the user denies; returns adjusted settings.
 */
export async function ensureSettingsHostPermissions(
  settings: ExtensionSettings,
): Promise<{ settings: ExtensionSettings; deniedPatterns: string[] }> {
  const next = structuredClone(settings);
  const deniedPatterns: string[] = [];

  for (const rule of next.siteRules) {
    if (!rule.enabled || !siteRuleHasConfiguredHeaders(rule)) continue;

    const patterns = rule.patterns.filter((pattern) => pattern.trim());
    const granted = await ensureHostPermissionsForPatterns(patterns);
    if (granted) continue;

    rule.enabled = false;
    deniedPatterns.push(...patterns);
  }

  return { settings: next, deniedPatterns };
}

/** Patterns with granted host permission (canonical keys). */
export async function buildGrantedPatternSet(
  settings: ExtensionSettings,
): Promise<Set<string>> {
  const granted = new Set<string>();

  for (const rule of settings.siteRules) {
    if (!rule.enabled) continue;
    for (const pattern of rule.patterns) {
      const trimmed = pattern.trim();
      if (!trimmed) continue;

      const permission = patternToHostPermission(trimmed);
      if (!permission) continue;

      const hasPermission = await chrome.permissions.contains({
        origins: [permission],
      });
      if (hasPermission) {
        granted.add(canonicalizePattern(trimmed));
      }
    }
  }

  return granted;
}

export function formatHostPermissionDeniedMessage(): string {
  return "Site access was denied. Headers won't apply until you allow access for this site.";
}
