import {
  bindHeaderRow,
  getHeaderRowElements,
  syncHeaderRowFromDom,
  syncSiteRuleHeadersFromDom,
  type HeaderRowElements,
} from "./header-dom";
import { createHeaderEntry } from "./site-rules";
import type { HeaderEntry } from "./types";

export function headerHasContent(header: HeaderEntry): boolean {
  return header.name.trim() !== "" || header.value.trim() !== "";
}

export function isDraftHeader(header: HeaderEntry): boolean {
  return header.name.trim() === "";
}

/** Configured headers plus one empty draft row at the bottom. */
export function normalizeEditableHeaders(headers: HeaderEntry[]): HeaderEntry[] {
  const kept = headers.filter(headerHasContent);
  return [...kept, createHeaderEntry({ enabled: false })];
}

export function applyHeaderRowDraftState(
  elements: HeaderRowElements,
  isDraft: boolean,
  header: HeaderEntry,
): void {
  elements.row.classList.toggle("header-row--draft", isDraft);
  elements.enabledInput.disabled = isDraft;
  if (isDraft) {
    elements.enabledInput.checked = false;
    header.enabled = false;
  } else {
    elements.enabledInput.checked = header.enabled;
  }
  elements.deleteBtn.hidden = isDraft;
}

export function activateHeaderRow(
  header: HeaderEntry,
  elements: HeaderRowElements,
): void {
  header.enabled = true;
  applyHeaderRowDraftState(elements, false, header);
  elements.enabledInput.checked = true;
}

export interface EditableHeaderListOptions {
  container: HTMLElement;
  rowTemplate: HTMLTemplateElement;
  getHeaders: () => HeaderEntry[];
  schedulePersist: () => void;
  flushPersist: () => void;
}

export function syncEditableHeadersFromDom(
  container: HTMLElement,
  headers: HeaderEntry[],
): void {
  syncSiteRuleHeadersFromDom(container, { headers });
  const normalized = normalizeEditableHeaders(headers);
  headers.splice(0, headers.length, ...normalized);
}

export function renderEditableHeaderList(options: EditableHeaderListOptions): void {
  const headers = options.getHeaders();
  if (options.container.querySelector(".header-row")) {
    syncEditableHeadersFromDom(options.container, headers);
  } else {
    const list = normalizeEditableHeaders(headers);
    headers.splice(0, headers.length, ...list);
  }

  const list = headers;
  options.container.replaceChildren();
  list.forEach((header) => {
    const isDraft = isDraftHeader(header) && header === list[list.length - 1];
    options.container.append(
      createEditableHeaderRow(header, isDraft, options),
    );
  });
}

function createEditableHeaderRow(
  header: HeaderEntry,
  isDraft: boolean,
  options: EditableHeaderListOptions,
): HTMLElement {
  const row = options.rowTemplate.content.firstElementChild!.cloneNode(
    true,
  ) as HTMLElement;
  const elements = getHeaderRowElements(row);

  bindHeaderRow(
    header,
    elements,
    () => {
      syncHeaderRowFromDom(row, header);
      options.schedulePersist();
    },
    () => {
      syncHeaderRowFromDom(row, header);
      void options.flushPersist();
    },
  );

  applyHeaderRowDraftState(elements, isDraft, header);

  elements.nameInput.addEventListener("input", () => {
    if (
      elements.row.classList.contains("header-row--draft") &&
      elements.nameInput.value.trim() !== ""
    ) {
      activateHeaderRow(header, elements);

      const headers = options.getHeaders();
      const newDraft = createHeaderEntry({ enabled: false });
      headers.push(newDraft);
      options.container.append(
        createEditableHeaderRow(newDraft, true, options),
      );
    }
    syncHeaderRowFromDom(row, header);
    options.schedulePersist();
  });

  elements.deleteBtn.addEventListener("click", () => {
    const headers = options.getHeaders();
    const next = headers.filter((h) => h.id !== header.id);
    headers.splice(0, headers.length, ...next);
    renderEditableHeaderList(options);
    void options.flushPersist();
  });

  return row;
}
