import { resolveHeadersForSiteRule } from "./profiles";
import type { ExtensionSettings, HeaderEntry, SiteRule } from "./types";
import { patternToUrlFilter } from "./url-match";

const DNR_RULE_ID_BASE = 1_000_000;

export { DNR_RULE_ID_BASE };

export type CompiledDnrRule = chrome.declarativeNetRequest.Rule;

const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
] as chrome.declarativeNetRequest.ResourceType[];

export function injectsAuthorizationHeader(headers: HeaderEntry[]): boolean {
  return headers.some(
    (header) =>
      header.enabled &&
      header.name.trim().toLowerCase() === "authorization" &&
      header.value.trim(),
  );
}

function createSuppressBasicAuthRule(
  id: number,
  urlFilter: string,
): CompiledDnrRule {
  return {
    id,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "www-authenticate",
          operation: "remove",
        },
      ],
    },
    condition: {
      urlFilter,
      resourceTypes: RESOURCE_TYPES,
    },
  } as CompiledDnrRule;
}

export function compileSettingsToDnrRules(
  settings: ExtensionSettings,
): CompiledDnrRule[] {
  if (!settings.globalEnabled) return [];

  const rules: CompiledDnrRule[] = [];
  let ruleIndex = 0;

  for (const siteRule of settings.siteRules) {
    if (!siteRule.enabled) continue;
    const compiled = compileSiteRule(siteRule, ruleIndex);
    rules.push(...compiled);
    ruleIndex += compiled.length;
  }

  return rules;
}

function compileSiteRule(
  siteRule: SiteRule,
  startIndex: number,
): CompiledDnrRule[] {
  const enabledHeaders = resolveHeadersForSiteRule(siteRule).filter(
    (h) => h.enabled && h.name.trim(),
  );
  if (enabledHeaders.length === 0) return [];

  const batches: (typeof enabledHeaders)[] = [];
  for (let i = 0; i < enabledHeaders.length; i += 20) {
    batches.push(enabledHeaders.slice(i, i + 20));
  }

  const rules: CompiledDnrRule[] = [];
  let index = startIndex;
  const suppressBasicAuth = injectsAuthorizationHeader(enabledHeaders);

  for (const pattern of siteRule.patterns) {
    const urlFilter = patternToUrlFilter(pattern);
    if (!urlFilter) continue;

    for (const batch of batches) {
      rules.push({
        id: DNR_RULE_ID_BASE + index,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: batch.map((h) => ({
            header: h.name.trim(),
            operation: "set",
            value: h.value,
          })),
        },
        condition: {
          urlFilter,
          resourceTypes: RESOURCE_TYPES,
        },
      } as CompiledDnrRule);
      index += 1;
    }

    if (suppressBasicAuth) {
      rules.push(createSuppressBasicAuthRule(DNR_RULE_ID_BASE + index, urlFilter));
      index += 1;
    }
  }

  return rules;
}

export function getManagedRuleIds(settings: ExtensionSettings): number[] {
  return compileSettingsToDnrRules(settings).map((r) => r.id);
}

type RuleComparable = Pick<CompiledDnrRule, "id" | "action" | "condition">;

function serializeRulesForCompare(rules: RuleComparable[]): string {
  return JSON.stringify(
    [...rules]
      .sort((a, b) => a.id - b.id)
      .map((rule) => ({
        id: rule.id,
        action: rule.action,
        condition: rule.condition,
      })),
  );
}

/** True when compiled rules match currently installed managed DNR rules. */
export function managedRulesMatch(
  next: CompiledDnrRule[],
  existing: chrome.declarativeNetRequest.Rule[],
): boolean {
  const managed = existing.filter((rule) => rule.id >= DNR_RULE_ID_BASE);
  return serializeRulesForCompare(next) === serializeRulesForCompare(managed);
}
