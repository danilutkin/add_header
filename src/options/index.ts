import {
  bindHeaderRow,
  getHeaderRowElements,
  syncSiteRuleHeadersFromDom,
} from "../shared/header-dom";
import { persistSettings, persistSettingsFireAndForget } from "../shared/persist";
import {
  createId,
  ExtensionSettings,
  HeaderEntry,
  SiteRule,
  STORAGE_KEY,
} from "../shared/types";
import { loadSettings, normalizeSettings } from "../shared/storage";
import { parsePattern } from "../shared/url-match";

const globalEnabledEl = document.getElementById(
  "global-enabled",
) as HTMLInputElement;
const rulesListEl = document.getElementById("rules-list")!;
const addSiteBtn = document.getElementById("add-site")!;
const siteRuleTemplate = document.getElementById(
  "site-rule-template",
) as HTMLTemplateElement;
const headerRowTemplate = document.getElementById(
  "header-row-template",
) as HTMLTemplateElement;

let settings: ExtensionSettings;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
/** Skip storage.onChanged re-render while this page initiated the save. */
let suppressStorageRender = false;

function syncSettingsFromDom(): void {
  settings.globalEnabled = globalEnabledEl.checked;

  for (const node of rulesListEl.querySelectorAll<HTMLElement>(".site-rule")) {
    const ruleId = node.dataset.ruleId;
    if (!ruleId) continue;

    const siteRule = settings.siteRules.find((r) => r.id === ruleId);
    if (!siteRule) continue;

    siteRule.pattern = (
      node.querySelector(".site-rule__pattern") as HTMLInputElement
    ).value.trim();
    siteRule.enabled = (
      node.querySelector(".site-rule__enabled") as HTMLInputElement
    ).checked;

    const headersEl = node.querySelector(".headers")!;
    syncSiteRuleHeadersFromDom(headersEl, siteRule);
  }
}

function schedulePersist(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    suppressStorageRender = true;
    void persistSettings(settings).finally(() => {
      suppressStorageRender = false;
    });
  }, 350);
}

async function flushPersist(): Promise<void> {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  persistTimer = undefined;
  suppressStorageRender = true;
  try {
    await persistSettings(settings);
  } finally {
    suppressStorageRender = false;
  }
}

function persistOnClose(): void {
  syncSettingsFromDom();
  clearTimeout(persistTimer);
  suppressStorageRender = true;
  persistSettingsFireAndForget(settings);
  suppressStorageRender = false;
}

async function init(): Promise<void> {
  settings = await loadSettings();
  globalEnabledEl.checked = settings.globalEnabled;
  render();
}

function render(): void {
  rulesListEl.replaceChildren();

  if (settings.siteRules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No site rules yet. Add one to inject headers on matching requests.";
    rulesListEl.append(empty);
    return;
  }

  for (const siteRule of settings.siteRules) {
    rulesListEl.append(createSiteRuleElement(siteRule));
  }
}

function createSiteRuleElement(siteRule: SiteRule): HTMLElement {
  const node = siteRuleTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLElement;
  node.dataset.ruleId = siteRule.id;

  const patternInput = node.querySelector(
    ".site-rule__pattern",
  ) as HTMLInputElement;
  const enabledInput = node.querySelector(
    ".site-rule__enabled",
  ) as HTMLInputElement;
  const deleteBtn = node.querySelector(".site-rule__delete")!;
  const headersEl = node.querySelector(".headers")!;
  const addHeaderBtn = node.querySelector(".add-header")!;

  patternInput.value = siteRule.pattern;
  enabledInput.checked = siteRule.enabled;

  patternInput.addEventListener("input", () => {
    patternInput.setCustomValidity(
      parsePattern(patternInput.value.trim()) ? "" : "Invalid pattern",
    );
    schedulePersist();
  });

  enabledInput.addEventListener("change", () => {
    void flushPersist();
  });

  deleteBtn.addEventListener("click", () => {
    settings.siteRules = settings.siteRules.filter((r) => r.id !== siteRule.id);
    void flushPersist();
    render();
  });

  for (const header of siteRule.headers) {
    headersEl.append(createHeaderRow(siteRule, header));
  }

  addHeaderBtn.addEventListener("click", () => {
    const header: HeaderEntry = {
      id: createId(),
      name: "",
      value: "",
      enabled: true,
    };
    siteRule.headers.push(header);
    headersEl.append(createHeaderRow(siteRule, header));
    schedulePersist();
  });

  return node;
}

function createHeaderRow(siteRule: SiteRule, header: HeaderEntry): HTMLElement {
  const row = headerRowTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLElement;
  const elements = getHeaderRowElements(row);

  bindHeaderRow(
    header,
    elements,
    () => schedulePersist(),
    () => void flushPersist(),
  );

  elements.deleteBtn.addEventListener("click", () => {
    siteRule.headers = siteRule.headers.filter((h) => h.id !== header.id);
    row.remove();
    void flushPersist();
  });

  return row;
}

globalEnabledEl.addEventListener("change", () => {
  void flushPersist();
});

addSiteBtn.addEventListener("click", () => {
  settings.siteRules.push({
    id: createId(),
    pattern: "",
    enabled: true,
    headers: [
      {
        id: createId(),
        name: "",
        value: "",
        enabled: true,
      },
    ],
  });
  void flushPersist();
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (suppressStorageRender) return;
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  settings = normalizeSettings(
    changes[STORAGE_KEY].newValue as Partial<ExtensionSettings>,
  );
  globalEnabledEl.checked = settings.globalEnabled;
  render();
});

void init();

window.addEventListener("pagehide", persistOnClose);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistOnClose();
  }
});
