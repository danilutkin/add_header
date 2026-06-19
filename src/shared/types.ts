/** A single HTTP header to inject on matched requests. */
export interface HeaderEntry {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

/**
 * Per-site rule. Pattern is either:
 * - exact origin: `https://example.com`
 * - subdomain wildcard: `*.example.com` (matches foo.example.com, not example.com)
 */
export interface SiteRule {
  id: string;
  pattern: string;
  enabled: boolean;
  headers: HeaderEntry[];
}

export interface ExtensionSettings {
  globalEnabled: boolean;
  siteRules: SiteRule[];
}

export const STORAGE_KEY = "add_header_settings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  globalEnabled: true,
  siteRules: [],
};

export function createId(): string {
  return crypto.randomUUID();
}
