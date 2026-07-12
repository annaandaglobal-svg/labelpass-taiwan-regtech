// Per-SKU organisation metadata (client/brand + assignee) kept in the browser, separate from the
// review payload so it survives re-reviews and the saved-review cap/merge. This is the no-auth
// half of "team assign / client grouping": it works today for a single operator (or a shared
// browser profile); true cross-device/team sync layers on top once real auth lands.
export type SkuMeta = {
  client?: string;
  assignee?: string;
};

export const SKU_META_KEY = "labelpass-sku-meta";

type SkuMetaMap = Record<string, SkuMeta>;

export function loadSkuMeta(): SkuMetaMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SKU_META_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: SkuMetaMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as SkuMeta;
      const meta: SkuMeta = {};
      if (typeof entry.client === "string" && entry.client.trim()) meta.client = entry.client.trim().slice(0, 80);
      if (typeof entry.assignee === "string" && entry.assignee.trim()) meta.assignee = entry.assignee.trim().slice(0, 80);
      if (meta.client || meta.assignee) clean[key] = meta;
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveSkuMeta(map: SkuMetaMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SKU_META_KEY, JSON.stringify(map));
}

// Set one field for a SKU, dropping the key entirely when both fields are cleared so the store
// stays small. Returns the next map (caller keeps it in React state).
export function setSkuMetaField(map: SkuMetaMap, key: string, field: keyof SkuMeta, value: string): SkuMetaMap {
  const trimmed = value.trim().slice(0, 80);
  const next: SkuMetaMap = { ...map };
  const entry: SkuMeta = { ...(next[key] ?? {}) };
  if (trimmed) entry[field] = trimmed;
  else delete entry[field];
  if (entry.client || entry.assignee) next[key] = entry;
  else delete next[key];
  saveSkuMeta(next);
  return next;
}

// Distinct client/brand names present in the store, for grouping and filter chips.
export function distinctClients(map: SkuMetaMap): string[] {
  const set = new Set<string>();
  for (const meta of Object.values(map)) if (meta.client) set.add(meta.client);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
}
