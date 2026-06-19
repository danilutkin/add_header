import type { ExtensionSettings } from "./types";
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
  void chrome.storage.local.set({ [STORAGE_KEY]: cloneSettings(settings) });
}

let persistChain = Promise.resolve();

async function sendPersist(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): Promise<void> {
  const snapshot = cloneSettings(settings);
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

export async function persistSettings(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): Promise<void> {
  saveSettingsImmediately(settings);
  persistChain = persistChain
    .then(() => sendPersist(settings, options))
    .catch((error) => {
      throw error;
    });
  return persistChain;
}

export function persistSettingsFireAndForget(
  settings: ExtensionSettings,
  options?: { tabId?: number; reload?: boolean },
): void {
  saveSettingsImmediately(settings);
  persistChain = persistChain
    .then(() => sendPersist(settings, options))
    .catch(() => undefined);
}
