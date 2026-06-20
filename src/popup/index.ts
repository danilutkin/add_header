import {
  syncSiteRuleHeadersFromDom,
} from "../shared/header-dom";
import { renderEditableHeaderList } from "../shared/header-list";
import {
  persistSettings,
  persistSettingsFireAndForget,
} from "../shared/persist";
import {
  createProfileForSiteRule,
  getActiveProfile,
  getProfileTabColor,
  profileTabLabel,
  removeProfileFromSiteRule,
} from "../shared/profiles";
import {
  findOrCreateSiteRule,
  siteRuleHasConfiguredHeaders,
} from "../shared/site-rules";
import { loadSettings } from "../shared/storage";
import { ExtensionSettings, SiteRule } from "../shared/types";
import { findSiteRuleForUrl, getOriginFromTabUrl } from "../shared/url-match";

const globalEnabledEl = document.getElementById(
  "global-enabled",
) as HTMLInputElement;
const profileTabsEl = document.getElementById("profile-tabs")!;
const profileNameEl = document.getElementById("profile-name")!;
const deleteProfileBtn = document.getElementById("delete-profile");
const reloadTabBtn = document.getElementById("reload-tab");
const currentOriginEl = document.getElementById("current-origin")!;
const siteEnabledWrap = document.getElementById("site-enabled-wrap")!;
const siteEnabledEl = document.getElementById("site-enabled") as HTMLInputElement;
const headersSection = document.getElementById("headers-section")!;
const headersListEl = document.getElementById("headers-list")!;
const addProfileTabBtn = document.getElementById("add-profile-tab")!;
const emptySection = document.getElementById("empty-section")!;
const emptyMessageEl = document.getElementById("empty-message")!;
const openOptionsBtn = document.getElementById("open-options")!;
const headerRowTemplate = document.getElementById(
  "header-row-template",
) as HTMLTemplateElement;

let settings: ExtensionSettings;
let tabUrl: string | undefined;
let origin: string | null = null;
let activeRule: SiteRule | undefined;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let targetTabId: number | undefined;

function syncHeadersFromDom(): void {
  if (!activeRule) return;
  syncSiteRuleHeadersFromDom(headersListEl, getActiveProfile(activeRule));
}

function syncSettingsFromDom(): void {
  settings.globalEnabled = globalEnabledEl.checked;

  if (activeRule) {
    activeRule.enabled = siteEnabledEl.checked;
    syncHeadersFromDom();
  }
}

function schedulePersist(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistSettings(settings, { tabId: targetTabId });
  }, 350);
}

async function flushPersist(): Promise<void> {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = undefined;
  await persistSettings(settings, { tabId: targetTabId });
}

function persistOnClose(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistSettingsFireAndForget(settings, { tabId: targetTabId });
}

function getMatchingRule(): SiteRule | undefined {
  if (!tabUrl) return undefined;
  return findSiteRuleForUrl(tabUrl, settings.siteRules);
}

function renderProfileTabs(): void {
  if (!activeRule) return;

  profileTabsEl.replaceChildren();
  const activeId = activeRule.activeProfileId;

  activeRule.profiles.forEach((profile, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "profile-tab";
    tab.dataset.profileId = profile.id;
    tab.title = profile.name;
    tab.style.setProperty("--tab-color", getProfileTabColor(index));

    const label = document.createElement("span");
    label.textContent = profileTabLabel(profile, index);
    tab.append(label);

    if (profile.id === activeId) {
      tab.classList.add("profile-tab--active");
      tab.setAttribute("aria-selected", "true");
    } else {
      tab.setAttribute("aria-selected", "false");
    }

    tab.addEventListener("click", () => {
      if (!activeRule) return;
      syncSettingsFromDom();
      activeRule.activeProfileId = profile.id;
      void flushPersist().then(() => render());
    });

    profileTabsEl.append(tab);
  });

  const active = getActiveProfile(activeRule);
  profileNameEl.textContent = active.name;

  if (deleteProfileBtn) {
    deleteProfileBtn.hidden = activeRule.profiles.length <= 1;
  }
}

function setPanelVisibility(mode: "inactive" | "edit"): void {
  headersSection.hidden = mode !== "edit";
  emptySection.hidden = mode !== "inactive";
  siteEnabledWrap.hidden = mode === "inactive";
}

function renderHeaders(): void {
  if (!activeRule) return;

  renderEditableHeaderList({
    container: headersListEl,
    rowTemplate: headerRowTemplate,
    getHeaders: () => getActiveProfile(activeRule!).headers,
    schedulePersist,
    flushPersist,
  });
}

function render(): void {
  if (activeRule && headersListEl.querySelector(".header-row")) {
    syncHeadersFromDom();
  }

  currentOriginEl.textContent = origin ?? "Not a web page";
  activeRule = getMatchingRule();

  if (!settings.globalEnabled) {
    setPanelVisibility("inactive");
    emptyMessageEl.textContent = "Extension is off globally.";
    return;
  }

  if (!origin || !tabUrl) {
    setPanelVisibility("inactive");
    emptyMessageEl.textContent = "Open a website to manage headers.";
    return;
  }

  if (!activeRule) {
    setPanelVisibility("inactive");
    emptyMessageEl.textContent = "Could not set up headers for this page.";
    return;
  }

  setPanelVisibility("edit");
  siteEnabledEl.checked = activeRule.enabled;
  renderProfileTabs();
  renderHeaders();
}

async function ensureSiteRule(): Promise<void> {
  if (!settings.globalEnabled || !tabUrl || !origin) return;

  const existing = findSiteRuleForUrl(tabUrl, settings.siteRules);
  if (existing) {
    activeRule = existing;
    if (siteRuleHasConfiguredHeaders(existing)) {
      existing.enabled = true;
    }
    return;
  }

  const result = findOrCreateSiteRule(settings.siteRules, tabUrl, origin);
  settings.siteRules = result.siteRules;
  activeRule = result.rule;
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  targetTabId = tab?.id;
  tabUrl = tab?.url;
  origin = getOriginFromTabUrl(tabUrl);
  settings = await loadSettings();
  globalEnabledEl.checked = settings.globalEnabled;
  await ensureSiteRule();
  if (activeRule?.enabled) {
    await persistSettings(settings, { tabId: targetTabId });
  }
  render();
}

globalEnabledEl.addEventListener("change", () => {
  settings.globalEnabled = globalEnabledEl.checked;
  void flushPersist().then(() => ensureSiteRule()).then(() => render());
});

siteEnabledEl.addEventListener("change", () => {
  if (!activeRule) return;
  activeRule.enabled = siteEnabledEl.checked;
  void flushPersist();
});

addProfileTabBtn.addEventListener("click", () => {
  if (!activeRule) return;
  syncSettingsFromDom();
  const profile = createProfileForSiteRule(activeRule);
  activeRule.profiles.push(profile);
  activeRule.activeProfileId = profile.id;
  void flushPersist().then(() => render());
});

deleteProfileBtn?.addEventListener("click", () => {
  if (!activeRule || activeRule.profiles.length <= 1) return;
  syncSettingsFromDom();
  removeProfileFromSiteRule(activeRule, activeRule.activeProfileId);
  void flushPersist().then(() => render());
});

openOptionsBtn.addEventListener("click", () => {
  void flushPersist().then(() => {
    void chrome.runtime.openOptionsPage();
  });
});

reloadTabBtn?.addEventListener("click", () => {
  void flushPersist().then(async () => {
    if (targetTabId === undefined) return;
    await chrome.tabs.reload(targetTabId);
  });
});

window.addEventListener("pagehide", persistOnClose);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistOnClose();
  }
});

void init();
