import {
  bindHeaderRow,
  getHeaderRowElements,
  syncHeaderRowFromDom,
  syncSiteRuleHeadersFromDom,
} from "../shared/header-dom";
import {
  persistSettings,
  persistSettingsFireAndForget,
} from "../shared/persist";
import {
  createHeaderEntry,
  findOrCreateSiteRule,
} from "../shared/site-rules";
import { loadSettings } from "../shared/storage";
import { ExtensionSettings, HeaderEntry, SiteRule } from "../shared/types";
import { findSiteRuleForUrl, getOriginFromTabUrl } from "../shared/url-match";

const globalEnabledEl = document.getElementById(
  "global-enabled",
) as HTMLInputElement;
const currentOriginEl = document.getElementById("current-origin")!;
const siteEnabledWrap = document.getElementById("site-enabled-wrap")!;
const siteEnabledEl = document.getElementById("site-enabled") as HTMLInputElement;
const headersSection = document.getElementById("headers-section")!;
const headersListEl = document.getElementById("headers-list")!;
const addHeaderBtn = document.getElementById("add-header")!;
const emptySection = document.getElementById("empty-section")!;
const emptyMessageEl = document.getElementById("empty-message")!;
const setupSiteBtn = document.getElementById("setup-site")!;
const openOptionsBtn = document.getElementById("open-options")!;
const headerRowTemplate = document.getElementById(
  "header-row-template",
) as HTMLTemplateElement;

let settings: ExtensionSettings;
let tabUrl: string | undefined;
let origin: string | null = null;
let activeRule: SiteRule | undefined;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function syncSettingsFromDom(): void {
  settings.globalEnabled = globalEnabledEl.checked;

  if (activeRule) {
    activeRule.enabled = siteEnabledEl.checked;
    syncSiteRuleHeadersFromDom(headersListEl, activeRule);
  }
}

function schedulePersist(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistSettings(settings);
  }, 350);
}

async function flushPersist(): Promise<void> {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = undefined;
  await persistSettings(settings);
}

function persistOnClose(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistSettingsFireAndForget(settings);
}

function getMatchingRule(): SiteRule | undefined {
  if (!tabUrl) return undefined;
  return findSiteRuleForUrl(tabUrl, settings.siteRules);
}

function setPanelVisibility(mode: "inactive" | "empty" | "edit"): void {
  headersSection.hidden = mode !== "edit";
  emptySection.hidden = mode !== "empty";
  siteEnabledWrap.hidden = mode === "inactive";
}

function renderHeaders(): void {
  headersListEl.replaceChildren();
  if (!activeRule) return;

  for (const header of activeRule.headers) {
    headersListEl.append(createHeaderRow(header));
  }
}

function createHeaderRow(header: HeaderEntry): HTMLElement {
  const row = headerRowTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLElement;
  const elements = getHeaderRowElements(row);

  bindHeaderRow(
    header,
    elements,
    () => {
      syncHeaderRowFromDom(row, header);
      schedulePersist();
    },
    () => {
      syncHeaderRowFromDom(row, header);
      void flushPersist();
    },
  );

  elements.deleteBtn.addEventListener("click", () => {
    if (!activeRule) return;
    activeRule.headers = activeRule.headers.filter((h) => h.id !== header.id);
    row.remove();
    void flushPersist();
  });

  return row;
}

function render(): void {
  currentOriginEl.textContent = origin ?? "Not a web page";
  activeRule = getMatchingRule();

  if (!settings.globalEnabled) {
    setPanelVisibility("inactive");
    emptySection.hidden = false;
    emptyMessageEl.textContent = "Extension is off globally.";
    setupSiteBtn.hidden = true;
    return;
  }

  if (!origin || !tabUrl) {
    setPanelVisibility("inactive");
    emptySection.hidden = false;
    emptyMessageEl.textContent = "Open a website to manage headers.";
    setupSiteBtn.hidden = true;
    return;
  }

  if (!activeRule) {
    setPanelVisibility("empty");
    emptyMessageEl.textContent = "No headers for this site yet.";
    setupSiteBtn.hidden = false;
    return;
  }

  setPanelVisibility("edit");
  siteEnabledEl.checked = activeRule.enabled;
  renderHeaders();
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabUrl = tab?.url;
  origin = getOriginFromTabUrl(tabUrl);
  settings = await loadSettings();
  globalEnabledEl.checked = settings.globalEnabled;
  render();
}

async function setupSiteRule(): Promise<void> {
  if (!tabUrl || !origin) return;

  const result = findOrCreateSiteRule(settings.siteRules, tabUrl, origin);
  settings.siteRules = result.siteRules;
  activeRule = result.rule;
  await flushPersist();
  render();
}

globalEnabledEl.addEventListener("change", () => {
  settings.globalEnabled = globalEnabledEl.checked;
  void flushPersist();
  render();
});

siteEnabledEl.addEventListener("change", () => {
  if (!activeRule) return;
  activeRule.enabled = siteEnabledEl.checked;
  void flushPersist();
});

setupSiteBtn.addEventListener("click", () => {
  void setupSiteRule();
});

addHeaderBtn.addEventListener("click", () => {
  if (!activeRule) return;
  const header = createHeaderEntry();
  activeRule.headers.push(header);
  headersListEl.append(createHeaderRow(header));
  schedulePersist();
  const nameInput = headersListEl.lastElementChild?.querySelector(
    ".header-row__name",
  ) as HTMLInputElement | null;
  nameInput?.focus();
});

openOptionsBtn.addEventListener("click", () => {
  void flushPersist().then(() => {
    void chrome.runtime.openOptionsPage();
  });
});

window.addEventListener("pagehide", persistOnClose);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistOnClose();
  }
});

void init();
