import {
  syncSiteRuleHeadersFromDom,
} from "../shared/header-dom";
import { renderEditableHeaderList } from "../shared/header-list";
import { persistSettings, persistSettingsFireAndForget } from "../shared/persist";
import {
  createProfileForSiteRule,
  defaultProfileName,
  getActiveProfile,
  getProfileTabColor,
  profileTabLabel,
  removeProfileFromSiteRule,
} from "../shared/profiles";
import { createEmptySiteRule } from "../shared/site-rules";
import {
  ExtensionSettings,
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
const patternRowTemplate = document.getElementById(
  "pattern-row-template",
) as HTMLTemplateElement;
const headerRowTemplate = document.getElementById(
  "header-row-template",
) as HTMLTemplateElement;

let settings: ExtensionSettings;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let suppressStorageRender = false;

function syncSettingsFromDom(): void {
  settings.globalEnabled = globalEnabledEl.checked;

  for (const node of rulesListEl.querySelectorAll<HTMLElement>(".site-rule")) {
    const ruleId = node.dataset.ruleId;
    if (!ruleId) continue;

    const siteRule = settings.siteRules.find((r) => r.id === ruleId);
    if (!siteRule) continue;

    siteRule.enabled = (
      node.querySelector(".site-rule__enabled") as HTMLInputElement
    ).checked;

    siteRule.patterns = [];
    for (const patternRow of node.querySelectorAll<HTMLElement>(".pattern-row")) {
      const value = (
        patternRow.querySelector(".pattern-row__input") as HTMLInputElement
      ).value.trim();
      siteRule.patterns.push(value);
    }
    if (siteRule.patterns.length === 0) {
      siteRule.patterns = [""];
    }

    const profile = getActiveProfile(siteRule);
    const profileIndex = siteRule.profiles.findIndex(
      (p) => p.id === siteRule.activeProfileId,
    );
    profile.name = (
      node.querySelector(".profile-editor__name") as HTMLInputElement
    ).value.trim() || defaultProfileName(profileIndex >= 0 ? profileIndex : 0);
    profile.description = (
      node.querySelector(".profile-editor__description") as HTMLInputElement
    ).value;

    const headersEl = node.querySelector(".headers")!;
    syncSiteRuleHeadersFromDom(headersEl, profile);
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
  if (rulesListEl.querySelector(".site-rule")) {
    syncSettingsFromDom();
  }

  rulesListEl.replaceChildren();

  if (settings.siteRules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No site rule sets yet. Add one — e.g. https://ati.st and *.ati.st.";
    rulesListEl.append(empty);
    return;
  }

  for (const siteRule of settings.siteRules) {
    rulesListEl.append(createSiteRuleElement(siteRule));
  }
}

function renderProfileEditor(
  node: HTMLElement,
  siteRule: SiteRule,
): void {
  const profile = getActiveProfile(siteRule);
  const tabsEl = node.querySelector(".profile-tabs")!;
  const nameInput = node.querySelector(".profile-editor__name") as HTMLInputElement;
  const descriptionInput = node.querySelector(
    ".profile-editor__description",
  ) as HTMLInputElement;
  const headersEl = node.querySelector(".headers") as HTMLElement;
  const removeProfileBtn = node.querySelector(".remove-profile-tab") as HTMLButtonElement;

  tabsEl.replaceChildren();
  siteRule.profiles.forEach((p, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "profile-tab";
    tab.dataset.profileId = p.id;
    tab.title = p.name;
    tab.textContent = profileTabLabel(p, index);
    tab.style.setProperty("--tab-color", getProfileTabColor(index));
    if (p.id === siteRule.activeProfileId) {
      tab.classList.add("profile-tab--active");
    }
    tab.addEventListener("click", () => {
      syncSettingsFromDom();
      siteRule.activeProfileId = p.id;
      void flushPersist().then(() => render());
    });
    tabsEl.append(tab);
  });

  nameInput.value = profile.name;
  descriptionInput.value = profile.description;
  removeProfileBtn.hidden = false;
  removeProfileBtn.disabled = siteRule.profiles.length <= 1;
  removeProfileBtn.title =
    siteRule.profiles.length <= 1
      ? "At least one profile is required"
      : "Delete the active profile";

  headersEl.replaceChildren();
  renderEditableHeaderList({
    container: headersEl,
    rowTemplate: headerRowTemplate,
    getHeaders: () => profile.headers,
    schedulePersist,
    flushPersist,
  });
}

function createSiteRuleElement(siteRule: SiteRule): HTMLElement {
  const node = siteRuleTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLElement;
  node.dataset.ruleId = siteRule.id;

  const enabledInput = node.querySelector(
    ".site-rule__enabled",
  ) as HTMLInputElement;
  const deleteBtn = node.querySelector(".site-rule__delete")!;
  const patternsListEl = node.querySelector(".patterns-list")!;
  const addPatternBtn = node.querySelector(".add-pattern")!;
  const addProfileTabBtn = node.querySelector(".add-profile-tab")!;
  const removeProfileBtn = node.querySelector(".remove-profile-tab")!;
  const nameInput = node.querySelector(".profile-editor__name") as HTMLInputElement;
  const descriptionInput = node.querySelector(
    ".profile-editor__description",
  ) as HTMLInputElement;

  enabledInput.checked = siteRule.enabled;

  enabledInput.addEventListener("change", () => {
    void flushPersist();
  });

  deleteBtn.addEventListener("click", () => {
    settings.siteRules = settings.siteRules.filter((r) => r.id !== siteRule.id);
    void flushPersist();
    render();
  });

  function renderPatternRow(pattern: string, index: number): void {
    const row = patternRowTemplate.content.firstElementChild!.cloneNode(
      true,
    ) as HTMLElement;
    const input = row.querySelector(".pattern-row__input") as HTMLInputElement;
    input.value = pattern;

    input.addEventListener("input", () => {
      input.setCustomValidity(
        !input.value.trim() || parsePattern(input.value.trim()) ? "" : "Invalid pattern",
      );
      schedulePersist();
    });

    row.querySelector(".pattern-row__delete")!.addEventListener("click", () => {
      if (siteRule.patterns.length <= 1) return;
      siteRule.patterns.splice(index, 1);
      void flushPersist();
      render();
    });

    patternsListEl.append(row);
  }

  patternsListEl.replaceChildren();
  siteRule.patterns.forEach((pattern, index) => renderPatternRow(pattern, index));

  addPatternBtn.addEventListener("click", () => {
    siteRule.patterns.push("");
    void flushPersist();
    render();
  });

  nameInput.addEventListener("input", () => schedulePersist());
  descriptionInput.addEventListener("input", () => schedulePersist());

  addProfileTabBtn.addEventListener("click", () => {
    syncSettingsFromDom();
    const profile = createProfileForSiteRule(siteRule);
    siteRule.profiles.push(profile);
    siteRule.activeProfileId = profile.id;
    void flushPersist().then(() => render());
  });

  removeProfileBtn.addEventListener("click", () => {
    if (siteRule.profiles.length <= 1) return;
    removeProfileFromSiteRule(siteRule, siteRule.activeProfileId);
    void flushPersist();
    render();
  });

  renderProfileEditor(node, siteRule);

  return node;
}

globalEnabledEl.addEventListener("change", () => {
  void flushPersist();
});

addSiteBtn.addEventListener("click", () => {
  settings.siteRules.push(createEmptySiteRule());
  void flushPersist();
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (suppressStorageRender) return;
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  settings = normalizeSettings(
    changes[STORAGE_KEY].newValue as Partial<ExtensionSettings> & {
      profiles?: unknown[];
      activeProfileId?: string | null;
    },
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
