import { describe, expect, it } from "vitest";
import { compileSettingsToDnrRules } from "../src/shared/dnr-compile";
import type { ExtensionSettings } from "../src/shared/types";
import {
  parsePattern,
  patternToUrlFilter,
  urlMatchesPattern,
  urlMatchesSiteRule,
} from "../src/shared/url-match";

describe("parsePattern", () => {
  it("parses exact origin", () => {
    expect(parsePattern("https://example.com")).toEqual({
      kind: "origin",
      hostname: "example.com",
      scheme: "https",
    });
  });

  it("parses subdomain wildcard", () => {
    expect(parsePattern("*.example.com")).toEqual({
      kind: "subdomain",
      hostname: "example.com",
    });
  });

  it("rejects invalid patterns", () => {
    expect(parsePattern("")).toBeNull();
    expect(parsePattern("not-a-url")).toBeNull();
    expect(parsePattern("*.")).toBeNull();
  });
});

describe("urlMatchesPattern", () => {
  it("matches exact origin", () => {
    expect(
      urlMatchesPattern("https://example.com/path", "https://example.com"),
    ).toBe(true);
    expect(
      urlMatchesPattern("http://example.com/path", "https://example.com"),
    ).toBe(false);
  });

  it("matches subdomain wildcard", () => {
    expect(
      urlMatchesPattern("https://api.example.com/x", "*.example.com"),
    ).toBe(true);
    expect(
      urlMatchesPattern("https://example.com/x", "*.example.com"),
    ).toBe(false);
  });
});

describe("patternToUrlFilter", () => {
  it("builds origin filter", () => {
    expect(patternToUrlFilter("https://httpbin.org")).toBe(
      "https://httpbin.org^",
    );
  });

  it("builds subdomain filter", () => {
    expect(patternToUrlFilter("*.example.com")).toBe("||example.com^");
  });
});

describe("urlMatchesSiteRule", () => {
  it("matches when any pattern matches", () => {
    expect(
      urlMatchesSiteRule("https://ati.st/page", {
        patterns: ["https://ati.st", "*.ati.st"],
      }),
    ).toBe(true);
    expect(
      urlMatchesSiteRule("https://app.ati.st/page", {
        patterns: ["https://ati.st", "*.ati.st"],
      }),
    ).toBe(true);
    expect(
      urlMatchesSiteRule("https://other.com", {
        patterns: ["https://ati.st", "*.ati.st"],
      }),
    ).toBe(false);
  });
});

describe("compileSettingsToDnrRules", () => {
  const baseSettings: ExtensionSettings = {
    globalEnabled: true,
    siteRules: [
      {
        id: "1",
        patterns: ["https://httpbin.org"],
        enabled: true,
        profiles: [
          {
            id: "p-default",
            name: "1",
            description: "",
            headers: [
              {
                id: "h1",
                name: "X-Test",
                value: "hello",
                enabled: true,
              },
            ],
          },
        ],
        activeProfileId: "p-default",
      },
    ],
  };

  it("returns empty when globally disabled", () => {
    expect(
      compileSettingsToDnrRules({ ...baseSettings, globalEnabled: false }),
    ).toEqual([]);
  });

  it("compiles enabled headers into modifyHeaders rules", () => {
    const rules = compileSettingsToDnrRules(baseSettings);
    expect(rules).toHaveLength(1);
    expect(rules[0].action.requestHeaders).toEqual([
      {
        header: "X-Test",
        operation: "set",
        value: "hello",
      },
    ]);
    expect(rules[0].condition.urlFilter).toBe("https://httpbin.org^");
  });

  it("skips disabled site rules and headers", () => {
    const rules = compileSettingsToDnrRules({
      ...baseSettings,
      siteRules: [
        {
          ...baseSettings.siteRules[0],
          enabled: false,
        },
      ],
    });
    expect(rules).toHaveLength(0);
  });

  it("uses only the active profile headers", () => {
    const rules = compileSettingsToDnrRules({
      ...baseSettings,
      siteRules: [
        {
          ...baseSettings.siteRules[0],
          profiles: [
            baseSettings.siteRules[0].profiles[0],
            {
              id: "p1",
              name: "Admin",
              description: "",
              headers: [
                { id: "ph1", name: "X-Role", value: "admin", enabled: true },
              ],
            },
          ],
          activeProfileId: "p1",
        },
      ],
    });
    expect(rules).toHaveLength(1);
    expect(rules[0].action.requestHeaders).toEqual([
      { header: "X-Role", operation: "set", value: "admin" },
    ]);
  });

  it("compiles rules for each pattern in a site rule set", () => {
    const rules = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [
        {
          id: "1",
          patterns: ["https://ati.st", "*.ati.st"],
          enabled: true,
          profiles: [
            {
              id: "p1",
              name: "1",
              description: "",
              headers: [
                { id: "h1", name: "X-Test", value: "v", enabled: true },
              ],
            },
          ],
          activeProfileId: "p1",
        },
      ],
    });
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(
      expect.arrayContaining(["https://ati.st^", "||ati.st^"]),
    );
  });

  it("assigns unique rule ids across site rules", () => {
    const rules = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [
        baseSettings.siteRules[0],
        {
          id: "2",
          patterns: ["https://example.com"],
          enabled: true,
          profiles: [
            {
              id: "p2",
              name: "1",
              description: "",
              headers: [
                { id: "h2", name: "X-Other", value: "v", enabled: true },
              ],
            },
          ],
          activeProfileId: "p2",
        },
      ],
    });
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
