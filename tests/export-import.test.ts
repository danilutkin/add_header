import { describe, expect, it } from "vitest";
import {
  createExportBundle,
  exportFilename,
  mergeSettings,
  parseExportJson,
  replaceSettings,
  serializeExport,
  siteRulePatternsKey,
} from "../src/shared/export-import";
import { ExtensionSettings } from "../src/shared/types";

function sampleSettings(): ExtensionSettings {
  return {
    globalEnabled: true,
    siteRules: [
      {
        id: "site-1",
        patterns: ["https://example.com"],
        enabled: true,
        activeProfileId: "profile-1",
        profiles: [
          {
            id: "profile-1",
            name: "Free user",
            description: "",
            headers: [
              { id: "h1", name: "X-Role", value: "free", enabled: true },
            ],
          },
        ],
      },
    ],
  };
}

describe("siteRulePatternsKey", () => {
  it("ignores pattern order, casing, and shorthand", () => {
    expect(
      siteRulePatternsKey(["*example.com", "example.com"]),
    ).toBe(siteRulePatternsKey(["https://example.com", "*.example.com"]));
  });
});

describe("serializeExport / parseExportJson", () => {
  it("round-trips settings through the export bundle", () => {
    const settings = sampleSettings();
    const parsed = parseExportJson(serializeExport(settings));

    expect(parsed.globalEnabled).toBe(true);
    expect(parsed.siteRules).toHaveLength(1);
    expect(parsed.siteRules[0].patterns).toEqual(["https://example.com"]);
    expect(parsed.siteRules[0].profiles[0].headers[0]).toMatchObject({
      name: "X-Role",
      value: "free",
    });
  });

  it("accepts raw settings JSON for portability", () => {
    const parsed = parseExportJson(JSON.stringify(sampleSettings()));
    expect(parsed.siteRules).toHaveLength(1);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseExportJson("{")).toThrow(/valid JSON/i);
  });
});

describe("createExportBundle", () => {
  it("uses the add_header format envelope", () => {
    const bundle = createExportBundle(sampleSettings());
    expect(bundle.format).toBe("add_header");
    expect(bundle.version).toBe(1);
    expect(bundle.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("exportFilename", () => {
  it("includes the export date", () => {
    expect(exportFilename(new Date("2026-06-20T12:00:00Z"))).toBe(
      "request-headers-export-2026-06-20.json",
    );
  });
});

describe("mergeSettings", () => {
  it("adds imported site rules that do not exist locally", () => {
    const current = sampleSettings();
    const imported: ExtensionSettings = {
      globalEnabled: false,
      siteRules: [
        {
          id: "site-2",
          patterns: ["https://other.test"],
          enabled: true,
          activeProfileId: "profile-2",
          profiles: [
            {
              id: "profile-2",
              name: "Admin",
              description: "",
              headers: [
                { id: "h2", name: "X-Role", value: "admin", enabled: true },
              ],
            },
          ],
        },
      ],
    };

    const merged = mergeSettings(current, imported);
    expect(merged.globalEnabled).toBe(true);
    expect(merged.siteRules).toHaveLength(2);
    expect(merged.siteRules[1].patterns).toEqual(["https://other.test"]);
    expect(merged.siteRules[1].id).not.toBe("site-2");
  });

  it("merges profiles into a matching site rule and renames conflicts", () => {
    const current = sampleSettings();
    const imported: ExtensionSettings = {
      globalEnabled: false,
      siteRules: [
        {
          id: "site-import",
          patterns: ["https://example.com"],
          enabled: true,
          activeProfileId: "profile-import",
          profiles: [
            {
              id: "profile-import",
              name: "Free user",
              description: "duplicate name",
              headers: [
                { id: "h3", name: "X-Debug", value: "1", enabled: true },
              ],
            },
            {
              id: "profile-import-2",
              name: "Admin",
              description: "",
              headers: [
                { id: "h4", name: "X-Role", value: "admin", enabled: true },
              ],
            },
          ],
        },
      ],
    };

    const merged = mergeSettings(current, imported);
    expect(merged.siteRules).toHaveLength(1);
    expect(merged.siteRules[0].profiles.map((profile) => profile.name)).toEqual([
      "Free user",
      "Free user (imported)",
      "Admin",
    ]);
  });
});

describe("replaceSettings", () => {
  it("replaces local settings with imported ones using fresh ids", () => {
    const replaced = replaceSettings({
      globalEnabled: false,
      siteRules: [
        {
          id: "site-old",
          patterns: ["https://replace.test"],
          enabled: true,
          activeProfileId: "profile-old",
          profiles: [
            {
              id: "profile-old",
              name: "1",
              description: "",
              headers: [
                { id: "h-old", name: "X-Test", value: "yes", enabled: true },
              ],
            },
          ],
        },
      ],
    });

    expect(replaced.globalEnabled).toBe(false);
    expect(replaced.siteRules[0].id).not.toBe("site-old");
    expect(replaced.siteRules[0].profiles[0].id).not.toBe("profile-old");
  });
});
