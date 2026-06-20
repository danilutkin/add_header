import { describe, expect, it } from "vitest";
import { getHeaderRowElements } from "../src/shared/header-dom";
import {
  activateHeaderRow,
  headerHasContent,
  isDraftHeader,
  normalizeEditableHeaders,
  syncEditableHeadersFromDom,
} from "../src/shared/header-list";
import { createHeaderEntry } from "../src/shared/site-rules";

describe("normalizeEditableHeaders", () => {
  it("keeps configured headers and appends one draft row", () => {
    const configured = createHeaderEntry({
      name: "X-Test",
      value: "1",
      enabled: true,
    });
    const result = normalizeEditableHeaders([configured]);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("X-Test");
    expect(isDraftHeader(result[1])).toBe(true);
    expect(result[1].enabled).toBe(false);
  });

  it("collapses multiple empty rows into a single draft", () => {
    const result = normalizeEditableHeaders([
      createHeaderEntry(),
      createHeaderEntry(),
    ]);
    expect(result).toHaveLength(1);
    expect(isDraftHeader(result[0])).toBe(true);
  });
});

describe("headerHasContent", () => {
  it("is false for a blank draft row", () => {
    expect(headerHasContent(createHeaderEntry())).toBe(false);
  });

  it("is true when only the name is set", () => {
    expect(headerHasContent(createHeaderEntry({ name: "Authorization" }))).toBe(
      true,
    );
  });
});

describe("activateHeaderRow", () => {
  it("enables the header and checks the checkbox", () => {
    document.body.innerHTML = `
      <div class="header-row">
        <input class="header-row__enabled" type="checkbox" />
        <input class="header-row__name" value="X-Test" />
        <input class="header-row__value" value="" />
        <button class="header-row__delete"></button>
      </div>
    `;

    const row = document.querySelector(".header-row") as HTMLElement;
    const elements = getHeaderRowElements(row);
    const header = createHeaderEntry({ enabled: false });

    activateHeaderRow(header, elements);

    expect(header.enabled).toBe(true);
    expect(elements.enabledInput.checked).toBe(true);
    expect(elements.enabledInput.disabled).toBe(false);
  });
});

describe("syncEditableHeadersFromDom", () => {
  it("pulls row values from the DOM into the header model", () => {
    document.body.innerHTML = `
      <div class="headers">
        <div class="header-row" data-header-id="h1">
          <input class="header-row__enabled" type="checkbox" checked />
          <input class="header-row__name" value="X-Test" />
          <input class="header-row__value" value="one" />
        </div>
      </div>
    `;

    const headers = [{ id: "h1", name: "", value: "", enabled: false }];
    const container = document.querySelector(".headers") as HTMLElement;

    syncEditableHeadersFromDom(container, headers);

    expect(headers[0].name).toBe("X-Test");
    expect(headers[0].value).toBe("one");
    expect(headers[0].enabled).toBe(true);
    expect(isDraftHeader(headers[headers.length - 1])).toBe(true);
  });
});
