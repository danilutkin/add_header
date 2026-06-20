/**
 * URL matching for site rules.
 *
 * Supported patterns:
 * - `https://example.com` — exact origin match
 * - `*.example.com` — any subdomain (not the apex)
 */

export interface ParsedPattern {
  kind: "origin" | "subdomain";
  hostname: string;
  scheme?: string;
}

export function parsePattern(pattern: string): ParsedPattern | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("*.")) {
    const hostname = trimmed.slice(2).toLowerCase();
    if (!isValidHostname(hostname)) return null;
    return { kind: "subdomain", hostname };
  }

  try {
    const url = new URL(trimmed);
    if (!url.hostname) return null;
    return {
      kind: "origin",
      hostname: url.hostname.toLowerCase(),
      scheme: url.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
  const parsed = parsePattern(pattern);
  if (!parsed) return false;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }

  const hostname = target.hostname.toLowerCase();

  if (parsed.kind === "origin") {
    if (parsed.scheme && target.protocol.replace(":", "") !== parsed.scheme) {
      return false;
    }
    return hostname === parsed.hostname;
  }

  // subdomain wildcard: foo.example.com matches, example.com does not
  return (
    hostname.endsWith("." + parsed.hostname) &&
    hostname !== parsed.hostname
  );
}

export function getOriginFromTabUrl(tabUrl: string | undefined): string | null {
  if (!tabUrl) return null;
  try {
    const url = new URL(tabUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.includes("/") || hostname.includes(":")) {
    return false;
  }
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
    hostname,
  );
}

export function patternToUrlFilter(pattern: string): string | null {
  const parsed = parsePattern(pattern);
  if (!parsed) return null;

  if (parsed.kind === "origin") {
    const prefix = parsed.scheme ? `${parsed.scheme}://` : "*://";
    return `${prefix}${parsed.hostname}^`;
  }

  return `||${parsed.hostname}^`;
}

export function findSiteRuleForUrl<T extends { patterns: string[] }>(
  url: string,
  rules: T[],
): T | undefined {
  return rules.find((rule) => urlMatchesSiteRule(url, rule));
}

export function urlMatchesSiteRule(
  url: string,
  rule: { patterns: string[] },
): boolean {
  return rule.patterns.some((pattern) => urlMatchesPattern(url, pattern));
}

export function findMatchingSiteRule<
  T extends { patterns: string[]; enabled: boolean },
>(url: string, rules: T[]): T | undefined {
  return rules.find((rule) => rule.enabled && urlMatchesSiteRule(url, rule));
}
