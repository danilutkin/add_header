import type { ExtensionSettings } from "./types";
import { prepareSettingsForSave } from "./site-rules";
import { ensureSettingsHostPermissions } from "./host-permissions";
import { STORAGE_KEY } from "./types";

export interface PersistMessage {
  type: "persist";
  settings: ExtensionSettings;
  tabId?: number;
  reload?: boolean;
}

export function cloneSettings(settings: ExtensionSettings): ExtensionSettings {
  return structuredClone(settings);
}

/** Direct storage write — survives popup teardown better than messaging alone. */
export function saveSettingsImmediately(settings: ExtensionSettings): void {
  const prepared = prepareSettingsForSave(settings);
  void chrome.storage.local.set({ [STORAGE_KEY]: cloneSettings(prepared) });
}

let persistChain = Promise.resolve();

export interface PersistResult {
  settings: ExtensionSettings;
  deniedPatterns: string[];
}

async function sendPersist(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): Promise<void> {
  const snapshot = cloneSettings(prepareSettingsForSave(settings));
  const response = await chrome.runtime.sendMessage({
    type: "persist",
    settings: snapshot,
    tabId: options?.tabId,
    reload: options?.reload ?? false,
  } satisfies PersistMessage);

  if (response && !response.ok) {
    throw new Error(response.error ?? "Failed to persist settings");
  }
}

async function persistWithHostAccess(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): Promise<PersistResult> {
  const { settings: adjusted, deniedPatterns } =
    await ensureSettingsHostPermissions(settings);
  saveSettingsImmediately(adjusted);
  persistChain = persistChain
    .then(() => sendPersist(adjusted, options))
    .catch((error) => {
      throw error;
    });
  await persistChain;
  return { settings: adjusted, deniedPatterns };
}

export async function persistSettings(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): Promise<PersistResult> {
  return persistWithHostAccess(settings, options);
}

export function persistSettingsFireAndForget(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): void {
  void persistWithHostAccess(settings, options).catch(() => undefined);
}
