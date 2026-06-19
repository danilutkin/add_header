import type { ExtensionSettings, SiteRule } from "./types";
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

export function compileSettingsToDnrRules(
  settings: ExtensionSettings,
): CompiledDnrRule[] {
  if (!settings.globalEnabled) return [];

  const rules: CompiledDnrRule[] = [];
  let ruleIndex = 0;

  for (const siteRule of settings.siteRules) {
    if (!siteRule.enabled) continue;
    const siteRules = compileSiteRule(siteRule, ruleIndex);
    rules.push(...siteRules);
    ruleIndex += siteRules.length;
  }

  return rules;
}

function compileSiteRule(siteRule: SiteRule, startIndex: number): CompiledDnrRule[] {
  const urlFilter = patternToUrlFilter(siteRule.pattern);
  if (!urlFilter) return [];

  const enabledHeaders = siteRule.headers.filter(
    (h) => h.enabled && h.name.trim(),
  );
  if (enabledHeaders.length === 0) return [];

  // DNR allows up to 20 request headers per rule; batch if needed
  const batches: typeof enabledHeaders[] = [];
  for (let i = 0; i < enabledHeaders.length; i += 20) {
    batches.push(enabledHeaders.slice(i, i + 20));
  }

  return batches.map((batch, batchIndex) => ({
    id: DNR_RULE_ID_BASE + startIndex + batchIndex,
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
  })) as CompiledDnrRule[];
}

export function getManagedRuleIds(settings: ExtensionSettings): number[] {
  return compileSettingsToDnrRules(settings).map((r) => r.id);
}
