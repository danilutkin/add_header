import { loadSettings, onSettingsChanged, saveSettings } from "../shared/storage";
import type { ExtensionSettings } from "../shared/types";
import {
  compileSettingsToDnrRules,
  DNR_RULE_ID_BASE,
  managedRulesMatch,
} from "../shared/dnr-compile";

let applyChain = Promise.resolve();

function enqueueApply(task: () => Promise<void>): Promise<void> {
  applyChain = applyChain.then(task).catch(() => undefined);
  return applyChain;
}

async function applyRulesForSettings(settings: ExtensionSettings): Promise<void> {
  const newRules = compileSettingsToDnrRules(settings);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();

  if (managedRulesMatch(newRules, existing)) {
    return;
  }

  // Remove all managed rules first — addRules fails if an ID already exists.
  const removeRuleIds = existing
    .map((r) => r.id)
    .filter((id) => id >= DNR_RULE_ID_BASE);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: newRules,
  });
}

async function applyRules(): Promise<void> {
  await applyRulesForSettings(await loadSettings());
}

async function persistSettings(
  settings: ExtensionSettings,
  tabId?: number,
  reload = false,
): Promise<void> {
  await saveSettings(settings);
  await applyRulesForSettings(settings);

  if (reload && tabId !== undefined) {
    await chrome.tabs.reload(tabId);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "persist") return;

  void persistSettings(message.settings, message.tabId, message.reload ?? false)
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void enqueueApply(() => applyRules());
});

chrome.runtime.onStartup.addListener(() => {
  void enqueueApply(() => applyRules());
});

onSettingsChanged(() => {
  void enqueueApply(() => applyRules());
});

void enqueueApply(() => applyRules());
