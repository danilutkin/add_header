import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/shared/storage";

describe("normalizeSettings", () => {
  it("migrates legacy site rule pattern and headers into profiles", () => {
    const settings = normalizeSettings({
      globalEnabled: true,
      siteRules: [
        {
          id: "site-legacy",
          pattern: "https://example.com",
          enabled: true,
          headers: [
            { id: "h1", name: "X-Legacy", value: "old", enabled: true },
          ],
        },
      ],
    });

    expect(settings.siteRules).toHaveLength(1);
    expect(settings.siteRules[0].patterns).toEqual(["https://example.com"]);
    expect(settings.siteRules[0].profiles[0].headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "X-Legacy", value: "old" }),
      ]),
    );
  });

  it("drops empty site rules after normalization", () => {
    const settings = normalizeSettings({
      globalEnabled: true,
      siteRules: [
        {
          id: "empty",
          patterns: ["https://empty.test"],
          enabled: true,
          profiles: [
            {
              id: "p1",
              name: "1",
              description: "",
              headers: [{ id: "h1", name: "", value: "", enabled: false }],
            },
          ],
          activeProfileId: "p1",
        },
      ],
    });

    expect(settings.siteRules).toHaveLength(0);
  });
});
