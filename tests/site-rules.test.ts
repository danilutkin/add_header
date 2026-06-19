import { describe, expect, it } from "vitest";
import { findOrCreateSiteRule } from "../src/shared/site-rules";
import type { SiteRule } from "../src/shared/types";

describe("findOrCreateSiteRule", () => {
  const existing: SiteRule[] = [
    {
      id: "site-1",
      pattern: "https://httpbin.org",
      enabled: true,
      headers: [
        { id: "h1", name: "X-Test", value: "1", enabled: true },
      ],
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
    expect(result.rule.pattern).toBe("https://example.com");
    expect(result.rule.headers).toHaveLength(1);
  });
});
