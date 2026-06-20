import { describe, expect, it } from "vitest";
import {
  canIncludeSubdomains,
  patternsToRows,
  rowsToPatterns,
  wildcardForOriginPattern,
} from "../src/shared/pattern-rows";

describe("wildcardForOriginPattern", () => {
  it("derives a subdomain wildcard from an origin pattern", () => {
    expect(wildcardForOriginPattern("https://example.com")).toBe(
      "*.example.com",
    );
    expect(wildcardForOriginPattern("http://localhost:8093")).toBe(
      "*.localhost",
    );
  });

  it("returns null for wildcard-only patterns", () => {
    expect(wildcardForOriginPattern("*.example.com")).toBeNull();
  });
});

describe("canIncludeSubdomains", () => {
  it("is true only for origin patterns", () => {
    expect(canIncludeSubdomains("example.com")).toBe(true);
    expect(canIncludeSubdomains("*example.com")).toBe(false);
  });
});

describe("patternsToRows / rowsToPatterns", () => {
  it("collapses origin + wildcard into one row with checkbox checked", () => {
    const rows = patternsToRows([
      "https://example.com",
      "*.example.com",
    ]);
    expect(rows).toEqual([
      { base: "https://example.com", includeSubdomains: true },
    ]);
  });

  it("round-trips multiple URL rows", () => {
    const rows = [
      { base: "https://example.com", includeSubdomains: true },
      { base: "http://localhost:8093", includeSubdomains: false },
    ];
    expect(rowsToPatterns(rows)).toEqual([
      "https://example.com",
      "*.example.com",
      "http://localhost:8093",
    ]);
    expect(patternsToRows(rowsToPatterns(rows))).toEqual(rows);
  });

  it("keeps standalone wildcard patterns as their own row", () => {
    const rows = patternsToRows(["*.other.test"]);
    expect(rows).toEqual([{ base: "*.other.test", includeSubdomains: false }]);
  });

  it("returns one empty row when no patterns exist", () => {
    expect(patternsToRows([""])).toEqual([
      { base: "", includeSubdomains: false },
    ]);
  });
});
