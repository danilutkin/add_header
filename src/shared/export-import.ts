import { cloneHeaderEntries } from "./profiles";
import { canonicalizePattern } from "./url-match";
import { normalizeSettings } from "./storage";
import { prepareSettingsForSave } from "./site-rules";
import { createId, ExtensionSettings, SiteRule } from "./types";

export const EXPORT_FORMAT = "add_header" as const;
export const EXPORT_VERSION = 1;

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  settings: ExtensionSettings;
}

export class ExportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportParseError";
  }
}

export function siteRulePatternsKey(patterns: string[]): string {
  return patterns
    .map((pattern) => canonicalizePattern(pattern).toLowerCase())
    .filter(Boolean)
    .sort()
    .join("\0");
}

function cloneSiteRule(rule: SiteRule): SiteRule {
  return {
    ...structuredClone(rule),
    id: createId(),
    profiles: rule.profiles.map((profile) => ({
      ...structuredClone(profile),
      id: createId(),
      headers: cloneHeaderEntries(profile.headers),
    })),
    activeProfileId: "",
  };
}

function rebindActiveProfileId(rule: SiteRule): void {
  const first = rule.profiles[0];
  if (!first) return;
  if (!rule.profiles.some((profile) => profile.id === rule.activeProfileId)) {
    rule.activeProfileId = first.id;
  }
}

function freshSiteRules(rules: SiteRule[]): SiteRule[] {
  return rules.map((rule) => {
    const cloned = cloneSiteRule(rule);
    cloned.activeProfileId = cloned.profiles[0]?.id ?? "";
    return cloned;
  });
}

export function createExportBundle(settings: ExtensionSettings): ExportBundle {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: prepareSettingsForSave(settings),
  };
}

export function serializeExport(settings: ExtensionSettings): string {
  return JSON.stringify(createExportBundle(settings), null, 2);
}

export function exportFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `request-headers-export-${stamp}.json`;
}

export function parseExportJson(text: string): ExtensionSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ExportParseError("File is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ExportParseError("Unrecognized export format");
  }

  const record = parsed as Record<string, unknown>;

  if (record.format === EXPORT_FORMAT) {
    if (record.version !== EXPORT_VERSION) {
      throw new ExportParseError(`Unsupported export version: ${String(record.version)}`);
    }
    if (!record.settings || typeof record.settings !== "object") {
      throw new ExportParseError("Export bundle is missing settings");
    }
    return normalizeSettings(record.settings as Partial<ExtensionSettings>);
  }

  if ("globalEnabled" in record || "siteRules" in record) {
    return normalizeSettings(record as Partial<ExtensionSettings>);
  }

  throw new ExportParseError("Unrecognized export format");
}

function uniqueProfileName(
  desired: string,
  taken: Set<string>,
): string {
  if (!taken.has(desired.trim().toLowerCase())) {
    taken.add(desired.trim().toLowerCase());
    return desired;
  }

  for (let suffix = 2; ; suffix += 1) {
    const candidate =
      suffix === 2 ? `${desired} (imported)` : `${desired} (imported ${suffix})`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

export function mergeSettings(
  current: ExtensionSettings,
  imported: ExtensionSettings,
): ExtensionSettings {
  const merged: ExtensionSettings = {
    globalEnabled: current.globalEnabled,
    siteRules: structuredClone(current.siteRules),
  };

  for (const importedRule of imported.siteRules) {
    const key = siteRulePatternsKey(importedRule.patterns);
    const existing = merged.siteRules.find(
      (rule) => siteRulePatternsKey(rule.patterns) === key,
    );

    if (!existing) {
      const [freshRule] = freshSiteRules([importedRule]);
      if (freshRule) merged.siteRules.push(freshRule);
      continue;
    }

    const takenNames = new Set(
      existing.profiles.map((profile) => profile.name.trim().toLowerCase()),
    );

    for (const importedProfile of importedRule.profiles) {
      const name = uniqueProfileName(importedProfile.name, takenNames);
      const profile = {
        ...structuredClone(importedProfile),
        id: createId(),
        name,
        headers: cloneHeaderEntries(importedProfile.headers),
      };
      existing.profiles.push(profile);
    }

    rebindActiveProfileId(existing);
  }

  return prepareSettingsForSave(merged);
}

export function replaceSettings(imported: ExtensionSettings): ExtensionSettings {
  return prepareSettingsForSave(
    normalizeSettings({
      ...imported,
      siteRules: freshSiteRules(imported.siteRules),
    }),
  );
}
