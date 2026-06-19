import { createId, ExtensionSettings, HeaderEntry, SiteRule } from "./types";
import { findSiteRuleForUrl } from "./url-match";

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
    id: createId(),
    pattern: origin,
    enabled: true,
    headers: [
      {
        id: createId(),
        name: "",
        value: "",
        enabled: true,
      },
    ],
  };

  return { siteRules: [...siteRules, rule], rule, isNew: true };
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

export function createHeaderEntry(partial?: Partial<HeaderEntry>): HeaderEntry {
  return {
    id: createId(),
    name: partial?.name ?? "",
    value: partial?.value ?? "",
    enabled: partial?.enabled ?? true,
  };
}
