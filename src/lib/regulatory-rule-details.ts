import rulesData from "../../data/rules/tw-cosmetics-rules.json";

// Surfaces the concrete concentration limits, warning statements, product scope, and the
// official TFDA source (URL + open-data id) that sit inside each regulatory rule, so a
// verdict can say "최대 0.3%" and cite where that comes from instead of a vague "제한표와 대조".

type RawRule = {
  id: string;
  category?: string;
  ingredient_name?: string;
  product_scope?: string;
  limit_text?: string;
  limit_percent_values?: number[];
  max_limit_percent?: number | null;
  restriction_text?: string;
  caution_text?: string;
  notes?: string;
  source_title?: string;
  source_url?: string;
  source_info_id?: number | string;
  source_record_id?: string;
};

export type OfficialSourceRef = {
  title: string;
  url: string;
  datasetId: string;
  recordId: string;
};

export type RegulatoryRuleDetail = {
  limits: string[];
  warnings: string[];
  productScopes: string[];
  officialSources: OfficialSourceRef[];
  // Exceptions attached to a *prohibited* rule (e.g. "使用於染髮產品除外" = allowed for hair
  // dye) — a prohibited entry with an exception is NOT an absolute ban.
  permittedExceptions: string[];
};

// Chinese markers that turn an otherwise-prohibited rule into a conditional one.
const EXCEPTION_MARKERS = /除外|例外|不在此限|得使用|除.{0,12}外/;

const rules: RawRule[] = Array.isArray((rulesData as { rules?: RawRule[] }).rules)
  ? ((rulesData as { rules: RawRule[] }).rules)
  : [];

const ruleById = new Map<string, RawRule>();
for (const rule of rules) {
  if (rule?.id) ruleById.set(rule.id, rule);
}

function cleanText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniquePush(list: string[], value: string, max: number) {
  const trimmed = cleanText(value);
  if (trimmed && !list.includes(trimmed) && list.length < max) list.push(trimmed);
}

// Build a clean Korean limit line. We keep the number in Korean and deliberately drop the
// raw Chinese scope/limit text from the primary line so a Korean user isn't reading 중문.
function limitLine(rule: RawRule): string {
  if (typeof rule.max_limit_percent === "number") {
    return `최대 함량 ${rule.max_limit_percent}%`;
  }
  if (Array.isArray(rule.limit_percent_values) && rule.limit_percent_values.length) {
    return `함량 기준 ${rule.limit_percent_values.join(", ")}%`;
  }
  const text = cleanText(rule.limit_text);
  return text ? `함량 기준: ${text}` : "";
}

export function regulatoryDetailFor(ruleCodes: string[]): RegulatoryRuleDetail {
  const limits: string[] = [];
  const warnings: string[] = [];
  const productScopes: string[] = [];
  const officialSources: OfficialSourceRef[] = [];
  const permittedExceptions: string[] = [];
  const seenSources = new Set<string>();

  for (const code of ruleCodes) {
    const rule = ruleById.get(code);
    if (!rule) continue;

    const line = limitLine(rule);
    if (line) uniquePush(limits, line, 4);

    uniquePush(warnings, rule.caution_text ?? "", 4);
    uniquePush(warnings, rule.restriction_text ?? "", 4);
    uniquePush(productScopes, rule.product_scope ?? "", 4);

    if (rule.category === "prohibited") {
      for (const candidate of [rule.notes, rule.restriction_text, rule.limit_text]) {
        if (candidate && EXCEPTION_MARKERS.test(candidate)) uniquePush(permittedExceptions, candidate, 3);
      }
    }

    const url = cleanText(rule.source_url);
    const datasetId = rule.source_info_id != null ? String(rule.source_info_id) : "";
    const key = `${url}:${datasetId}:${rule.source_record_id ?? ""}`;
    if (url && !seenSources.has(key) && officialSources.length < 4) {
      seenSources.add(key);
      officialSources.push({
        title: cleanText(rule.source_title) || "TFDA 공개 데이터",
        url,
        datasetId,
        recordId: cleanText(rule.source_record_id)
      });
    }
  }

  return { limits, warnings, productScopes, officialSources, permittedExceptions };
}

export function hasRegulatoryDetail(detail: RegulatoryRuleDetail): boolean {
  return Boolean(
    detail.limits.length || detail.warnings.length || detail.productScopes.length || detail.officialSources.length
  );
}
