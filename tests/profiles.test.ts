import { describe, expect, it } from "vitest";
import {
  createProfile,
  duplicateProfile,
  getActiveProfile,
  mergeHeaderEntries,
  removeProfileFromSiteRule,
  resolveHeadersForSiteRule,
} from "../src/shared/profiles";
import type { SiteRule } from "../src/shared/types";

function makeSiteRule(overrides?: Partial<SiteRule>): SiteRule {
  const profile = createProfile({
    name: "1",
    headers: [{ id: "h1", name: "X-Site", value: "site", enabled: true }],
  });
  return {
    id: "site-1",
    patterns: ["https://example.com"],
    enabled: true,
    profiles: [profile],
    activeProfileId: profile.id,
    ...overrides,
  };
}

describe("createProfile", () => {
  it("creates profile with defaults", () => {
    const profile = createProfile();
    expect(profile.name).toBe("1");
    expect(profile.headers).toHaveLength(1);
  });
});

describe("duplicateProfile", () => {
  it("copies name, description, and header values with new ids", () => {
    const original = createProfile({
      name: "Admin",
      description: "Full access",
      headers: [{ id: "h1", name: "Authorization", value: "Bearer x", enabled: true }],
    });
    const copy = duplicateProfile(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Admin (copy)");
    expect(copy.headers[0].id).not.toBe("h1");
  });
});

describe("getActiveProfile", () => {
  it("returns profile when activeProfileId matches on site rule", () => {
    const profile = createProfile({ name: "QA" });
    const siteRule = makeSiteRule({
      profiles: [profile],
      activeProfileId: profile.id,
    });
    expect(getActiveProfile(siteRule).name).toBe("QA");
  });

  it("falls back to first profile when active id is missing", () => {
    const first = createProfile({ name: "First" });
    const second = createProfile({ name: "Second" });
    const siteRule = makeSiteRule({
      profiles: [first, second],
      activeProfileId: "missing",
    });
    expect(getActiveProfile(siteRule).name).toBe("First");
  });
});

describe("mergeHeaderEntries", () => {
  it("merges headers, later wins on same name", () => {
    const merged = mergeHeaderEntries(
      [{ id: "1", name: "X-A", value: "base", enabled: true }],
      [{ id: "2", name: "x-a", value: "profile", enabled: true }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].value).toBe("profile");
  });
});

describe("resolveHeadersForSiteRule", () => {
  it("returns active profile headers only", () => {
    const siteRule = makeSiteRule();
    expect(resolveHeadersForSiteRule(siteRule)).toBe(siteRule.profiles[0].headers);
  });

  it("switches headers when active profile changes", () => {
    const first = createProfile({
      headers: [{ id: "p1", name: "X-One", value: "1", enabled: true }],
    });
    const second = createProfile({
      headers: [{ id: "p2", name: "X-Two", value: "2", enabled: true }],
    });
    const siteRule = makeSiteRule({
      profiles: [first, second],
      activeProfileId: second.id,
    });
    const resolved = resolveHeadersForSiteRule(siteRule);
    expect(resolved[0].name).toBe("X-Two");
  });
});

describe("removeProfileFromSiteRule", () => {
  it("does not remove the last profile", () => {
    const profile = createProfile();
    const siteRule = makeSiteRule({
      profiles: [profile],
      activeProfileId: profile.id,
    });
    removeProfileFromSiteRule(siteRule, profile.id);
    expect(siteRule.profiles).toHaveLength(1);
  });

  it("switches active profile when removing active one", () => {
    const first = createProfile({ name: "First" });
    const second = createProfile({ name: "Second" });
    const siteRule = makeSiteRule({
      profiles: [first, second],
      activeProfileId: second.id,
    });
    removeProfileFromSiteRule(siteRule, second.id);
    expect(siteRule.profiles).toHaveLength(1);
    expect(siteRule.activeProfileId).toBe(first.id);
  });
});
