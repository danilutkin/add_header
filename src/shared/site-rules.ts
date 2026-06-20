import {
  createDefaultProfile,
  mergeHeaderEntries,
  normalizeProfile,
} from "./profiles";
import { createId, ExtensionSettings, HeaderEntry, SiteRule } from "./types";
import { findSiteRuleForUrl } from "./url-match";

export function createHeaderEntry(partial?: Partial<HeaderEntry>): HeaderEntry {
  return {
    id: createId(),
    name: partial?.name ?? "",
    value: partial?.value ?? "",
    enabled: partial?.enabled ?? true,
  };
}

export function createEmptySiteRule(): SiteRule {
  const defaultProfile = createDefaultProfile();
  return {
    id: createId(),
    patterns: [""],
    enabled: true,
    profiles: [defaultProfile],
    activeProfileId: defaultProfile.id,
  };
}

export function normalizeSiteRule(raw: Record<string, unknown>): SiteRule | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
    return null;
  }

  let patterns: string[] = [];
  if (Array.isArray(raw.patterns)) {
    patterns = raw.patterns.filter((p): p is string => typeof p === "string");
  } else if (typeof raw.pattern === "string" && raw.pattern.trim()) {
    patterns = [raw.pattern];
  }
  if (patterns.length === 0) {
    patterns = [""];
  }

  const legacyHeaders = Array.isArray(raw.headers)
    ? (raw.headers as HeaderEntry[])
    : [];

  let profiles = Array.isArray(raw.profiles)
    ? raw.profiles
        .map((p) => normalizeProfile(p as Partial<import("./types").HeaderProfile>))
        .filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  if (profiles.length === 0) {
    profiles = [createDefaultProfile(legacyHeaders.length ? legacyHeaders : undefined)];
  } else if (legacyHeaders.some((h) => h.name?.trim() || h.value)) {
    profiles[0] = {
      ...profiles[0],
      headers: mergeHeaderEntries(legacyHeaders, profiles[0].headers),
    };
  }

  let activeProfileId =
    typeof raw.activeProfileId === "string" ? raw.activeProfileId : profiles[0].id;
  if (!profiles.some((p) => p.id === activeProfileId)) {
    activeProfileId = profiles[0].id;
  }

  return {
    id: raw.id,
    patterns,
    enabled: raw.enabled !== false,
    profiles,
    activeProfileId,
  };
}

export function findOrCreateSiteRule(
  siteRules: SiteRule[],
  tabUrl: string,
  origin: string,
): { siteRules: SiteRule[]; rule: SiteRule; isNew: boolean } {
  const existing = findSiteRuleForUrl(tabUrl, siteRules);
  if (existing) {
    return { siteRules, rule: existing, isNew: false };
  }

  const rule: SiteRule = {
    ...createEmptySiteRule(),
    patterns: [origin],
  };

  return { siteRules: [...siteRules, rule], rule, isNew: true };
}

export function siteRuleHasConfiguredHeaders(siteRule: SiteRule): boolean {
  return siteRule.profiles.some((profile) =>
    profile.headers.some((header) => header.name.trim() !== ""),
  );
}

/** Drop site rules with no header names — empty placeholders are not persisted. */
export function prepareSettingsForSave(
  settings: ExtensionSettings,
): ExtensionSettings {
  return {
    ...settings,
    siteRules: settings.siteRules.filter(siteRuleHasConfiguredHeaders),
  };
}

export function removeSiteRule(
  settings: ExtensionSettings,
  ruleId: string,
): ExtensionSettings {
  return {
    ...settings,
    siteRules: settings.siteRules.filter((r) => r.id !== ruleId),
  };
}
