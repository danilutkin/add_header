import type { HeaderEntry, SiteRule } from "./types";

export function syncHeaderRowFromDom(row: HTMLElement, header: HeaderEntry): void {
  header.enabled = (
    row.querySelector(".header-row__enabled") as HTMLInputElement
  ).checked;
  header.name = (
    row.querySelector(".header-row__name") as HTMLInputElement
  ).value;
  header.value = (
    row.querySelector(".header-row__value") as HTMLInputElement
  ).value;
}

export function syncSiteRuleHeadersFromDom(
  container: ParentNode,
  siteRule: SiteRule,
): void {
  for (const row of container.querySelectorAll<HTMLElement>(".header-row")) {
    const headerId = row.dataset.headerId;
    if (!headerId) continue;
    const header = siteRule.headers.find((h) => h.id === headerId);
    if (header) syncHeaderRowFromDom(row, header);
  }
}

export interface HeaderRowElements {
  row: HTMLElement;
  enabledInput: HTMLInputElement;
  nameInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  deleteBtn: HTMLButtonElement;
}

export function getHeaderRowElements(row: HTMLElement): HeaderRowElements {
  return {
    row,
    enabledInput: row.querySelector(".header-row__enabled") as HTMLInputElement,
    nameInput: row.querySelector(".header-row__name") as HTMLInputElement,
    valueInput: row.querySelector(".header-row__value") as HTMLInputElement,
    deleteBtn: row.querySelector(".header-row__delete") as HTMLButtonElement,
  };
}

export function bindHeaderRow(
  header: HeaderEntry,
  elements: HeaderRowElements,
  onChange: () => void,
  onImmediateChange?: () => void,
): void {
  elements.row.dataset.headerId = header.id;
  elements.enabledInput.checked = header.enabled;
  elements.nameInput.value = header.name;
  elements.valueInput.value = header.value;

  const immediate = onImmediateChange ?? onChange;

  elements.enabledInput.addEventListener("change", immediate);
  elements.nameInput.addEventListener("input", onChange);
  elements.valueInput.addEventListener("input", onChange);
  elements.nameInput.addEventListener("change", onChange);
  elements.valueInput.addEventListener("change", onChange);
  elements.nameInput.addEventListener("blur", immediate);
  elements.valueInput.addEventListener("blur", immediate);
}
