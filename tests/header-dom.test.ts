import { describe, expect, it } from "vitest";
import {
  syncHeaderRowFromDom,
  syncSiteRuleHeadersFromDom,
} from "../src/shared/header-dom";

describe("header-dom sync", () => {
  it("syncs checkbox state from DOM into header model", () => {
    document.body.innerHTML = `
      <div class="header-row" data-header-id="h1">
        <input class="header-row__enabled" type="checkbox" />
        <input class="header-row__name" value="Authorization" />
        <input class="header-row__value" value="123" />
      </div>
    `;

    const row = document.querySelector(".header-row") as HTMLElement;
    const header = {
      id: "h1",
      name: "",
      value: "",
      enabled: true,
    };

    (row.querySelector(".header-row__enabled") as HTMLInputElement).checked =
      false;
    syncHeaderRowFromDom(row, header);

    expect(header.enabled).toBe(false);
    expect(header.name).toBe("Authorization");
    expect(header.value).toBe("123");
  });

  it("syncs all headers in a site rule container", () => {
    document.body.innerHTML = `
      <div class="headers">
        <div class="header-row" data-header-id="h1">
          <input class="header-row__enabled" type="checkbox" checked />
          <input class="header-row__name" value="X-Test" />
          <input class="header-row__value" value="one" />
        </div>
        <div class="header-row" data-header-id="h2">
          <input class="header-row__enabled" type="checkbox" />
          <input class="header-row__name" value="X-Off" />
          <input class="header-row__value" value="two" />
        </div>
      </div>
    `;

    const profile = {
      headers: [
        { id: "h1", name: "", value: "", enabled: false },
        { id: "h2", name: "", value: "", enabled: true },
      ],
    };

    syncSiteRuleHeadersFromDom(
      document.querySelector(".headers")!,
      profile,
    );

    expect(profile.headers[0].enabled).toBe(true);
    expect(profile.headers[1].enabled).toBe(false);
  });
});
