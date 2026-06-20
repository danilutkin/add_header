import { normalizeProfile } from "./profiles";
import { normalizeSiteRule, prepareSettingsForSave } from "./site-rules";
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  STORAGE_KEY,
} from "./types";

export async function loadSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY];
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  return normalizeSettings(raw as Partial<ExtensionSettings> & LegacySettings);
}

export async function saveSettings(
  settings: ExtensionSettings,
): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

/** Pre–per-site-profiles storage shape. */
interface LegacySettings {
  profiles?: unknown[];
  activeProfileId?: string | null;
  siteRules?: unknown[];
}

export function normalizeSettings(
  partial: Partial<ExtensionSettings> & LegacySettings,
): ExtensionSettings {
  const legacyProfiles = Array.isArray(partial.profiles)
    ? partial.profiles
        .map((p) => normalizeProfile(p as Parameters<typeof normalizeProfile>[0]))
        .filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  const legacyActiveProfileId =
    typeof partial.activeProfileId === "string" ? partial.activeProfileId : null;

  let siteRules = Array.isArray(partial.siteRules)
    ? partial.siteRules
        .map((rule) =>
          normalizeSiteRule(rule as unknown as Record<string, unknown>),
        )
        .filter((rule): rule is NonNullable<typeof rule> => rule !== null)
    : [];

  if (legacyProfiles.length > 0 && siteRules.length > 0) {
    const first = siteRules[0];
    siteRules = [
      {
        ...first,
        profiles: [...first.profiles, ...legacyProfiles],
        activeProfileId: legacyActiveProfileId ?? first.profiles[0]?.id ?? first.activeProfileId,
      },
      ...siteRules.slice(1),
    ];
  }

  return prepareSettingsForSave({
    globalEnabled: partial.globalEnabled ?? DEFAULT_SETTINGS.globalEnabled,
    siteRules,
  });
}

export function onSettingsChanged(
  listener: (settings: ExtensionSettings) => void,
): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== "local" || !changes[STORAGE_KEY]) return;
    const next = changes[STORAGE_KEY].newValue as ExtensionSettings | undefined;
    if (next) listener(normalizeSettings(next as Partial<ExtensionSettings> & LegacySettings));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
