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
  return normalizeSettings(raw as Partial<ExtensionSettings>);
}

export async function saveSettings(
  settings: ExtensionSettings,
): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export function normalizeSettings(
  partial: Partial<ExtensionSettings>,
): ExtensionSettings {
  return {
    globalEnabled: partial.globalEnabled ?? DEFAULT_SETTINGS.globalEnabled,
    siteRules: Array.isArray(partial.siteRules) ? partial.siteRules : [],
  };
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
    if (next) listener(normalizeSettings(next));
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
