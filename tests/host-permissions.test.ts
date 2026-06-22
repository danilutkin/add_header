import { describe, expect, it } from "vitest";
import {
  collectPatternsNeedingHostAccess,
  patternToHostPermission,
  patternsToHostPermissions,
} from "../src/shared/host-permissions";
import { createProfile } from "../src/shared/profiles";
import type { ExtensionSettings } from "../src/shared/types";

describe("patternToHostPermission", () => {
  it("maps origin patterns to host permissions", () => {
    expect(patternToHostPermission("https://example.com")).toBe(
      "https://example.com/*",
    );
    expect(patternToHostPermission("http://localhost:3000")).toBe(
      "http://localhost:3000/*",
    );
  });

  it("maps subdomain wildcards", () => {
    expect(patternToHostPermission("*.example.com")).toBe(
      "*://*.example.com/*",
    );
  });

  it("returns null for invalid patterns", () => {
    expect(patternToHostPermission("")).toBeNull();
    expect(patternToHostPermission("not a url")).toBeNull();
  });
});

describe("patternsToHostPermissions", () => {
  it("deduplicates permissions", () => {
    expect(
      patternsToHostPermissions([
        "https://example.com",
        "example.com",
        "*.example.com",
      ]),
    ).toEqual(["https://example.com/*", "*://*.example.com/*"]);
  });
});

describe("collectPatternsNeedingHostAccess", () => {
  it("includes patterns only for enabled rules with headers", () => {
    const profile = createProfile({
      headers: [{ id: "h1", name: "X-Test", value: "1", enabled: true }],
    });
    const settings: ExtensionSettings = {
      globalEnabled: true,
      siteRules: [
        {
          id: "on",
          patterns: ["https://on.test"],
          enabled: true,
          profiles: [profile],
          activeProfileId: profile.id,
        },
        {
          id: "off",
          patterns: ["https://off.test"],
          enabled: false,
          profiles: [profile],
          activeProfileId: profile.id,
        },
        {
          id: "empty",
          patterns: ["https://empty.test"],
          enabled: true,
          profiles: [createProfile()],
          activeProfileId: profile.id,
        },
      ],
    };

    expect(collectPatternsNeedingHostAccess(settings)).toEqual([
      "https://on.test",
    ]);
  });
});
