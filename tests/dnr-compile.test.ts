import { describe, expect, it } from "vitest";
import {
  compileSettingsToDnrRules,
  managedRulesMatch,
} from "../src/shared/dnr-compile";
import { createProfile } from "../src/shared/profiles";
import type { ExtensionSettings, SiteRule } from "../src/shared/types";

function makeSiteRule(overrides?: Partial<SiteRule>): SiteRule {
  const first = createProfile({
    name: "One",
    headers: [{ id: "h1", name: "Authorization", value: "Basic one", enabled: true }],
  });
  const second = createProfile({
    name: "Two",
    headers: [{ id: "h2", name: "Authorization", value: "Basic two", enabled: true }],
  });
  return {
    id: "site-1",
    patterns: ["http://example.com"],
    enabled: true,
    profiles: [first, second],
    activeProfileId: first.id,
    ...overrides,
  };
}

describe("compileSettingsToDnrRules", () => {
  it("uses active profile headers", () => {
    const settings: ExtensionSettings = {
      globalEnabled: true,
      siteRules: [makeSiteRule()],
    };
    const rules = compileSettingsToDnrRules(settings);
    expect(rules).toHaveLength(2);
    const requestRule = rules.find(
      (rule) =>
        (rule.action as chrome.declarativeNetRequest.RuleAction).requestHeaders,
    );
    const action = requestRule!.action as chrome.declarativeNetRequest.RuleAction & {
      requestHeaders?: Array<{ value: string }>;
    };
    expect(action.requestHeaders?.[0]?.value).toBe("Basic one");

    const suppressRule = rules.find(
      (rule) =>
        (rule.action as chrome.declarativeNetRequest.RuleAction).responseHeaders,
    );
    expect(
      (suppressRule!.action as chrome.declarativeNetRequest.RuleAction)
        .responseHeaders?.[0],
    ).toEqual({
      header: "www-authenticate",
      operation: "remove",
    });
  });

  it("does not suppress basic auth when Authorization header is absent", () => {
    const profile = createProfile({
      headers: [{ id: "h1", name: "X-Debug", value: "1", enabled: true }],
    });
    const settings: ExtensionSettings = {
      globalEnabled: true,
      siteRules: [
        {
          id: "site-1",
          patterns: ["http://example.com"],
          enabled: true,
          profiles: [profile],
          activeProfileId: profile.id,
        },
      ],
    };
    const rules = compileSettingsToDnrRules(settings);
    expect(rules).toHaveLength(1);
    expect(
      (rules[0].action as chrome.declarativeNetRequest.RuleAction).responseHeaders,
    ).toBeUndefined();
  });

  it("updates rules when active profile changes", () => {
    const siteRule = makeSiteRule();
    const first = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [siteRule],
    });
    siteRule.activeProfileId = siteRule.profiles[1].id;
    const second = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [siteRule],
    });
    expect(first).not.toEqual(second);
  });
});

describe("managedRulesMatch", () => {
  it("returns true for equivalent managed rules", () => {
    const settings: ExtensionSettings = {
      globalEnabled: true,
      siteRules: [makeSiteRule()],
    };
    const compiled = compileSettingsToDnrRules(settings);
    expect(managedRulesMatch(compiled, compiled)).toBe(true);
  });

  it("returns false when header values differ", () => {
    const siteRule = makeSiteRule();
    const existing = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [siteRule],
    });
    siteRule.activeProfileId = siteRule.profiles[1].id;
    const next = compileSettingsToDnrRules({
      globalEnabled: true,
      siteRules: [siteRule],
    });
    expect(managedRulesMatch(next, existing)).toBe(false);
  });
});
