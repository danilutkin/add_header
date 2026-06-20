/** A single HTTP header to inject on matched requests. */
export interface HeaderEntry {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

/** Header profile — tab 1 is the default; each tab is a full header set for QA. */
export interface HeaderProfile {
  id: string;
  name: string;
  description: string;
  headers: HeaderEntry[];
}

/**
 * Per-site rule set. Each pattern is either:
 * - exact origin: `https://example.com` or `example.com`
 * - subdomain wildcard: `*.example.com` or `*example.com` (matches foo.example.com, not example.com)
 */
export interface SiteRule {
  id: string;
  patterns: string[];
  enabled: boolean;
  /** At least one profile; profile 1 replaces the old “base headers”. */
  profiles: HeaderProfile[];
  /** Selected profile — headers are injected for this profile immediately. */
  activeProfileId: string;
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
