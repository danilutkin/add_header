import { describe, expect, it } from "vitest";
import {
  createEmptySiteRule,
  findOrCreateSiteRule,
  prepareSettingsForSave,
  siteRuleHasConfiguredHeaders,
} from "../src/shared/site-rules";
import type { ExtensionSettings, SiteRule } from "../src/shared/types";

describe("findOrCreateSiteRule", () => {
  const existing: SiteRule[] = [
    {
      id: "site-1",
      patterns: ["https://httpbin.org"],
      enabled: true,
      profiles: [
        {
          id: "p1",
          name: "1",
          description: "",
          headers: [
            { id: "h1", name: "X-Test", value: "1", enabled: true },
          ],
        },
      ],
      activeProfileId: "p1",
    },
  ];

  it("returns existing rule when tab matches", () => {
    const result = findOrCreateSiteRule(
      existing,
      "https://httpbin.org/headers",
      "https://httpbin.org",
    );
    expect(result.isNew).toBe(false);
    expect(result.rule.id).toBe("site-1");
    expect(result.siteRules).toHaveLength(1);
  });

  it("creates rule for origin when none matches", () => {
    const result = findOrCreateSiteRule(
      existing,
      "https://example.com/page",
      "https://example.com",
    );
    expect(result.isNew).toBe(true);
    expect(result.siteRules).toHaveLength(2);
    expect(result.rule.patterns).toEqual(["https://example.com"]);
    expect(result.rule.profiles).toHaveLength(1);
  });
});

describe("siteRuleHasConfiguredHeaders", () => {
  it("is false when all header names are empty", () => {
    const rule = createEmptySiteRule();
    rule.patterns = ["https://httpbin.org"];
    expect(siteRuleHasConfiguredHeaders(rule)).toBe(false);
  });

  it("is true when any profile has a named header", () => {
    const rule = createEmptySiteRule();
    rule.profiles[0].headers[0].name = "X-Test";
    expect(siteRuleHasConfiguredHeaders(rule)).toBe(true);
  });
});

describe("prepareSettingsForSave", () => {
  it("removes site rules without configured headers", () => {
    const empty = createEmptySiteRule();
    empty.patterns = ["https://httpbin.org"];
    const configured: SiteRule = {
      ...createEmptySiteRule(),
      id: "configured",
      patterns: ["http://localhost:8093"],
    };
    configured.profiles[0].headers[0].name = "x2";

    const settings: ExtensionSettings = {
      globalEnabled: true,
      siteRules: [empty, configured],
    };

    const prepared = prepareSettingsForSave(settings);
    expect(prepared.siteRules).toHaveLength(1);
    expect(prepared.siteRules[0].id).toBe("configured");
  });

  it("keeps enabled flag on configured site rules", () => {
    const configured: SiteRule = {
      ...createEmptySiteRule(),
      id: "configured",
      enabled: true,
      patterns: ["http://localhost:8093"],
    };
    configured.profiles[0].headers[0].name = "x2";

    const prepared = prepareSettingsForSave({
      globalEnabled: true,
      siteRules: [configured],
    });

    expect(prepared.siteRules[0].enabled).toBe(true);
  });
});
