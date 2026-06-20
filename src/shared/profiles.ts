import { HeaderEntry, HeaderProfile, SiteRule } from "./types";
import { createHeaderEntry } from "./site-rules";
import { createId } from "./types";

/** Distinct tab colors — active tab uses its color as fill. */
export const PROFILE_TAB_COLORS = [
  "#4285f4",
  "#34a853",
  "#f9ab00",
  "#ea4335",
  "#9334e6",
  "#00acc1",
] as const;

export function getProfileTabColor(index: number): string {
  return PROFILE_TAB_COLORS[index % PROFILE_TAB_COLORS.length];
}

export function defaultProfileName(index: number): string {
  return String(index + 1);
}

export function createProfile(
  partial?: Partial<Pick<HeaderProfile, "name" | "description" | "headers">>,
): HeaderProfile {
  return {
    id: createId(),
    name: partial?.name ?? defaultProfileName(0),
    description: partial?.description ?? "",
    headers: partial?.headers ?? [createHeaderEntry({ enabled: false })],
  };
}

export function createDefaultProfile(
  headers?: HeaderEntry[],
): HeaderProfile {
  return createProfile({
    name: defaultProfileName(0),
    headers: headers ?? [createHeaderEntry({ enabled: false })],
  });
}

export function createProfileForSiteRule(siteRule: {
  profiles: HeaderProfile[];
}): HeaderProfile {
  return createProfile({ name: defaultProfileName(siteRule.profiles.length) });
}

export function duplicateProfile(profile: HeaderProfile): HeaderProfile {
  return {
    id: createId(),
    name: `${profile.name} (copy)`,
    description: profile.description,
    headers: cloneHeaderEntries(profile.headers),
  };
}

export function cloneHeaderEntries(headers: HeaderEntry[]): HeaderEntry[] {
  return headers.map((h) => ({
    id: createId(),
    name: h.name,
    value: h.value,
    enabled: h.enabled,
  }));
}

export function getActiveProfile(siteRule: SiteRule): HeaderProfile {
  const found = siteRule.profiles.find((p) => p.id === siteRule.activeProfileId);
  return found ?? siteRule.profiles[0];
}

export function resolveHeadersForSiteRule(siteRule: SiteRule): HeaderEntry[] {
  return getActiveProfile(siteRule).headers;
}

export function mergeHeaderEntries(
  base: HeaderEntry[],
  additional: HeaderEntry[],
): HeaderEntry[] {
  const order: string[] = [];
  const byKey = new Map<string, HeaderEntry>();

  for (const header of base) {
    const key = header.name.trim().toLowerCase();
    if (!key) continue;
    order.push(key);
    byKey.set(key, header);
  }

  for (const header of additional) {
    const key = header.name.trim().toLowerCase();
    if (!key) continue;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, header);
  }

  return order.map((key) => byKey.get(key)!);
}

export function normalizeProfile(raw: Partial<HeaderProfile>): HeaderProfile | null {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string") {
    return null;
  }
  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name : "Unnamed profile",
    description: typeof raw.description === "string" ? raw.description : "",
    headers: Array.isArray(raw.headers) ? raw.headers : [],
  };
}

export function removeProfileFromSiteRule(
  siteRule: SiteRule,
  profileId: string,
): void {
  if (siteRule.profiles.length <= 1) return;

  siteRule.profiles = siteRule.profiles.filter((p) => p.id !== profileId);
  if (siteRule.activeProfileId === profileId) {
    siteRule.activeProfileId = siteRule.profiles[0].id;
  }
}

export function profileTabLabel(profile: HeaderProfile, index: number): string {
  return String(index + 1);
}
