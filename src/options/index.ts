import {
  syncSiteRuleHeadersFromDom,
} from "../shared/header-dom";
import {
  ExportParseError,
  exportFilename,
  mergeSettings,
  parseExportJson,
  replaceSettings,
  serializeExport,
} from "../shared/export-import";
import { renderEditableHeaderList } from "../shared/header-list";
import { persistSettings, persistSettingsFireAndForget } from "../shared/persist";
import {
  createProfileForSiteRule,
  defaultProfileName,
  duplicateProfile,
  getActiveProfile,
  getProfileTabColor,
  profileTabLabel,
  removeProfileFromSiteRule,
} from "../shared/profiles";
import { formatHostPermissionDeniedMessage } from "../shared/host-permissions";
import { createEmptySiteRule } from "../shared/site-rules";
import {
  ExtensionSettings,
  SiteRule,
  STORAGE_KEY,
} from "../shared/types";
import { loadSettings, normalizeSettings } from "../shared/storage";
import {
  canIncludeSubdomains,
  patternsToRows,
  rowsToPatterns,
  type PatternRowState,
} from "../shared/pattern-rows";
import { parsePattern } from "../shared/url-match";

const globalEnabledEl = document.getElementById(
  "global-enabled",
) as HTMLInputElement;
const rulesListEl = document.getElementById("rules-list")!;
const addSiteBtn = document.getElementById("add-site")!;
const exportBtn = document.getElementById("export-settings")!;
const importBtn = document.getElementById("import-settings")!;
const importFileEl = document.getElementById("import-file") as HTMLInputElement;
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

function syncPatternRowsFromDom(node: HTMLElement): PatternRowState[] {
  const rows: PatternRowState[] = [];
  for (const patternRow of node.querySelectorAll<HTMLElement>(".pattern-row")) {
    rows.push({
      base: (
        patternRow.querySelector(".pattern-row__input") as HTMLInputElement
      ).value,
      includeSubdomains: (
        patternRow.querySelector(".pattern-row__subdomains") as HTMLInputElement
      ).checked,
    });
  }
  return rows;
}

function updatePatternRowSubdomainsControl(
  input: HTMLInputElement,
  subdomainsCheckbox: HTMLInputElement,
): void {
  const canWildcard = canIncludeSubdomains(input.value.trim());
  subdomainsCheckbox.disabled = !canWildcard;
  if (!canWildcard) {
    subdomainsCheckbox.checked = false;
  }
}

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

    siteRule.patterns = rowsToPatterns(
      syncPatternRowsFromDom(node),
    );

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
    const result = await persistSettings(settings);
    settings = result.settings;
    if (result.deniedPatterns.length > 0) {
      window.alert(formatHostPermissionDeniedMessage());
    }
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
      "No site rule sets yet. Add one — e.g. https://example.com and *.example.com.";
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
  const duplicateProfileBtn = node.querySelector(".duplicate-profile-tab")!;
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

  function repaintPatternRows(rows: PatternRowState[]): void {
    patternsListEl.replaceChildren();
    rows.forEach((state, index) =>
      renderPatternRow(state, index, rows.length),
    );
  }

  function renderPatternRow(
    state: PatternRowState,
    index: number,
    rowCount: number,
  ): void {
    const row = patternRowTemplate.content.firstElementChild!.cloneNode(
      true,
    ) as HTMLElement;
    const input = row.querySelector(".pattern-row__input") as HTMLInputElement;
    const subdomainsCheckbox = row.querySelector(
      ".pattern-row__subdomains",
    ) as HTMLInputElement | null;
    const deleteBtn = row.querySelector(".pattern-row__delete") as HTMLButtonElement;
    input.value = state.base;
    if (subdomainsCheckbox) {
      subdomainsCheckbox.checked = state.includeSubdomains;
    }
    deleteBtn.hidden = rowCount <= 1;

    function refreshPatternInputState(): void {
      input.setCustomValidity(
        !input.value.trim() || parsePattern(input.value.trim()) ? "" : "Invalid pattern",
      );
      if (subdomainsCheckbox) {
        updatePatternRowSubdomainsControl(input, subdomainsCheckbox);
      }
    }

    input.addEventListener("input", () => {
      refreshPatternInputState();
      schedulePersist();
    });

    subdomainsCheckbox?.addEventListener("change", () => {
      schedulePersist();
    });

    deleteBtn.addEventListener("click", () => {
      syncSettingsFromDom();
      const rows = syncPatternRowsFromDom(node);
      if (rows.length <= 1) return;
      rows.splice(index, 1);
      siteRule.patterns = rowsToPatterns(rows);
      void flushPersist();
      render();
    });

    refreshPatternInputState();
    patternsListEl.append(row);
  }

  repaintPatternRows(patternsToRows(siteRule.patterns));

  addPatternBtn.addEventListener("click", () => {
    syncSettingsFromDom();
    const rows = syncPatternRowsFromDom(node);
    rows.push({ base: "", includeSubdomains: false });
    repaintPatternRows(rows);
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

  duplicateProfileBtn.addEventListener("click", () => {
    syncSettingsFromDom();
    const copy = duplicateProfile(getActiveProfile(siteRule));
    siteRule.profiles.push(copy);
    siteRule.activeProfileId = copy.id;
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

function downloadExport(): void {
  syncSettingsFromDom();
  const blob = new Blob([serializeExport(settings)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFilename();
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImportFile(file: File): Promise<void> {
  const text = await file.text();
  let imported;
  try {
    imported = parseExportJson(text);
  } catch (error) {
    const message =
      error instanceof ExportParseError
        ? error.message
        : "Could not read the import file";
    window.alert(message);
    return;
  }

  const ruleCount = imported.siteRules.length;
  if (ruleCount === 0) {
    window.alert("The import file has no site rules to add.");
    return;
  }

  const merge = window.confirm(
    `Import ${ruleCount} site rule set${ruleCount === 1 ? "" : "s"}?\n\n` +
      "OK = Merge with your current settings (duplicate profile names get \"(imported)\")\n" +
      "Cancel = Replace all current settings",
  );

  if (merge) {
    settings = mergeSettings(settings, imported);
  } else {
    const replace = window.confirm(
      "Replace all current settings? This cannot be undone.",
    );
    if (!replace) return;
    settings = replaceSettings(imported);
    settings.globalEnabled = globalEnabledEl.checked;
  }

  await flushPersist();
  render();
}

exportBtn.addEventListener("click", () => {
  downloadExport();
});

importBtn.addEventListener("click", () => {
  importFileEl.value = "";
  importFileEl.click();
});

importFileEl.addEventListener("change", () => {
  const file = importFileEl.files?.[0];
  if (!file) return;
  void handleImportFile(file);
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
