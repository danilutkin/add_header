import { canonicalizePattern, parsePattern } from "./url-match";

export interface PatternRowState {
  base: string;
  includeSubdomains: boolean;
}

export function wildcardForOriginPattern(pattern: string): string | null {
  const parsed = parsePattern(pattern);
  if (!parsed || parsed.kind !== "origin") return null;
  return `*.${parsed.hostname}`;
}

export function canIncludeSubdomains(pattern: string): boolean {
  return wildcardForOriginPattern(pattern) !== null;
}

/** Collapse stored patterns into editable rows (origin + optional subdomain pair). */
export function patternsToRows(patterns: string[]): PatternRowState[] {
  const canonical = [
    ...new Set(
      patterns.map((pattern) => canonicalizePattern(pattern.trim())).filter(Boolean),
    ),
  ];
  const remaining = new Set(canonical);
  const rows: PatternRowState[] = [];

  for (const pattern of canonical) {
    if (!remaining.has(pattern)) continue;
    const parsed = parsePattern(pattern);
    if (!parsed || parsed.kind === "subdomain") continue;

    remaining.delete(pattern);
    const wildcard = wildcardForOriginPattern(pattern);
    const includeSubdomains = wildcard !== null && remaining.has(wildcard);
    if (includeSubdomains && wildcard) {
      remaining.delete(wildcard);
    }
    rows.push({ base: pattern, includeSubdomains });
  }

  for (const pattern of remaining) {
    rows.push({ base: pattern, includeSubdomains: false });
  }

  if (rows.length === 0) {
    return [{ base: "", includeSubdomains: false }];
  }

  return rows;
}

export function rowsToPatterns(rows: PatternRowState[]): string[] {
  const patterns: string[] = [];

  for (const row of rows) {
    const trimmed = row.base.trim();
    if (!trimmed) continue;

    const base = canonicalizePattern(trimmed);
    patterns.push(base);

    if (row.includeSubdomains) {
      const wildcard = wildcardForOriginPattern(base);
      if (wildcard) patterns.push(wildcard);
    }
  }

  return patterns.length > 0 ? patterns : [""];
}
