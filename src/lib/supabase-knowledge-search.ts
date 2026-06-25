import postgres from "postgres";
import type { KnowledgeSearchResult } from "./knowledge-search";
import { normalizeKnowledgeQuery } from "./knowledge-search";

type DbClient = ReturnType<typeof postgres>;

type TermRow = {
  term_key: string;
  canonical_name: string;
  category: string | null;
  identifiers: {
    cas?: string[];
    inci?: string[];
    color_index?: string[];
  } | null;
  source_keys: string[] | null;
  notes: string | null;
  score: number;
};

type AliasRow = {
  term_key: string;
  alias_value: string;
  normalized_alias: string;
  alias_type: string;
  language: string;
  jurisdiction: string;
  confidence: string | number;
  source: string | null;
  note: string | null;
};

type RuleRow = {
  term_key: string;
  rule_code: string;
  jurisdiction: string;
  match_basis: string;
  confidence: string | number;
};

type SourceRow = {
  source_key: string;
  title: string;
  source_url: string;
  authority: string | null;
  jurisdiction: string;
  domain: string;
  source_type: string;
  priority: string;
  tags: string[] | null;
  document_path: string | null;
  metadata: {
    format?: string;
    browser_capture?: boolean;
    manual_fallback?: boolean;
  } | null;
  score: number;
};

type TotalsRow = {
  sources: number;
  terms: number;
  aliases: number;
  rule_links: number;
};

const databaseUrl = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
let client: DbClient | null = null;
let totalsCache: { value: KnowledgeSearchResult["totals"]; expiresAt: number } | null = null;

function getClient() {
  if (!databaseUrl) return null;
  client ??= postgres(databaseUrl, {
    max: 2,
    ssl: "require",
    idle_timeout: 10,
    connect_timeout: 8,
    prepare: false
  });
  return client;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function numeric(value: string | number | null | undefined, fallback = 0.85) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

async function readTotals(sql: DbClient): Promise<KnowledgeSearchResult["totals"]> {
  const now = Date.now();
  if (totalsCache && totalsCache.expiresAt > now) return totalsCache.value;

  const [row] = await sql<TotalsRow[]>`
    select
      (select count(*)::integer from public.knowledge_sources where is_active = true) as sources,
      (select count(*)::integer from public.knowledge_terms) as terms,
      (select count(*)::integer from public.term_aliases) as aliases,
      (select count(*)::integer from public.term_rule_links) as rule_links
  `;

  const value = {
    sources: row?.sources ?? 0,
    terms: row?.terms ?? 0,
    aliases: row?.aliases ?? 0,
    ruleLinks: row?.rule_links ?? 0
  };

  totalsCache = { value, expiresAt: now + 60_000 };
  return value;
}

async function readTermRows(sql: DbClient, query: string, limit: number) {
  const escaped = escapeLike(query);
  const contains = `%${escaped}%`;
  const prefix = `${escaped}%`;
  const canUseContains = query.length > 2 || /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(query);

  return sql<TermRow[]>`
    with alias_scores as (
      select
        a.term_key,
        max(
          case
            when a.normalized_alias = ${query} then 130
            when ${canUseContains} and a.normalized_alias like ${prefix} escape '\\' then 108
            when ${canUseContains} and a.normalized_alias like ${contains} escape '\\' then 92
            when length(a.normalized_alias) > 4 and ${query} like ('%' || a.normalized_alias || '%') then 68
            else 0
          end + round(a.confidence * 10)::integer
        ) as score
      from public.term_aliases a
      where
        a.normalized_alias = ${query}
        or (${canUseContains} and a.normalized_alias like ${contains} escape '\\')
        or (length(a.normalized_alias) > 4 and ${query} like ('%' || a.normalized_alias || '%'))
      group by a.term_key
    ),
    term_scores as (
      select
        t.term_key,
        t.canonical_name,
        t.category,
        t.identifiers,
        t.source_keys,
        t.notes,
        greatest(
          coalesce(a.score, 0),
          case
            when lower(t.canonical_name) = ${query} then 118
            when ${canUseContains} and lower(t.canonical_name) like ${contains} escape '\\' then 82
            else 0
          end
        )::integer as score
      from public.knowledge_terms t
      left join alias_scores a on a.term_key = t.term_key
    )
    select *
    from term_scores
    where score > 0
    order by score desc, canonical_name asc
    limit ${limit}
  `;
}

async function readAliases(sql: DbClient, termKeys: string[]) {
  if (!termKeys.length) return [];

  return sql<AliasRow[]>`
    select
      term_key,
      alias_value,
      normalized_alias,
      alias_type,
      language,
      jurisdiction,
      confidence,
      source,
      note
    from public.term_aliases
    where term_key in ${sql(termKeys)}
    order by confidence desc, length(alias_value) asc, alias_value asc
  `;
}

async function readRuleLinks(sql: DbClient, termKeys: string[]) {
  if (!termKeys.length) return [];

  return sql<RuleRow[]>`
    select term_key, rule_code, jurisdiction, match_basis, confidence
    from public.term_rule_links
    where term_key in ${sql(termKeys)}
    order by confidence desc, rule_code asc
  `;
}

async function readSourceRows(sql: DbClient, query: string, limit: number) {
  const escaped = escapeLike(query);
  const contains = `%${escaped}%`;
  const canUseContains = query.length > 2 || /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(query);

  if (!canUseContains) return [];

  return sql<SourceRow[]>`
    with latest_snapshot as (
      select distinct on (source_key)
        source_key,
        document_path,
        metadata,
        extract
      from public.knowledge_snapshots
      order by source_key, fetched_at desc
    ),
    source_scores as (
      select
        s.source_key,
        s.title,
        s.source_url,
        s.authority,
        s.jurisdiction,
        s.domain,
        s.source_type,
        s.priority,
        s.tags,
        latest_snapshot.document_path,
        latest_snapshot.metadata,
        greatest(
          case when lower(s.title) like ${contains} escape '\\' then 94 else 0 end,
          case when lower(s.source_url) like ${contains} escape '\\' then 88 else 0 end,
          case when lower(coalesce(s.authority, '')) like ${contains} escape '\\' then 78 else 0 end,
          case when lower(s.domain || ' ' || s.source_type || ' ' || s.jurisdiction) like ${contains} escape '\\' then 74 else 0 end,
          case when lower(s.tags::text) like ${contains} escape '\\' then 72 else 0 end,
          case when lower(coalesce(latest_snapshot.extract, '')) like ${contains} escape '\\' then 58 else 0 end
        )::integer as score
      from public.knowledge_sources s
      left join latest_snapshot on latest_snapshot.source_key = s.source_key
      where s.is_active = true
    )
    select *
    from source_scores
    where score > 0
    order by score desc, case priority when 'high' then 0 when 'medium' then 1 else 2 end, title asc
    limit ${Math.max(4, Math.floor(limit / 2))}
  `;
}

export async function searchSupabaseKnowledge(rawQuery: string, limit = 10): Promise<KnowledgeSearchResult | null> {
  const sql = getClient();
  if (!sql) return null;

  const query = normalizeKnowledgeQuery(rawQuery).slice(0, 120);
  const totals = await readTotals(sql);

  if (!query) {
    return { query: "", totals, terms: [], sources: [] };
  }

  const termRows = await readTermRows(sql, query, limit);
  const termKeys = termRows.map((term) => term.term_key);
  const [aliasRows, ruleRows, sourceRows] = await Promise.all([
    readAliases(sql, termKeys),
    readRuleLinks(sql, termKeys),
    readSourceRows(sql, query, limit)
  ]);

  const aliasesByTerm = new Map<string, AliasRow[]>();
  for (const alias of aliasRows) {
    aliasesByTerm.set(alias.term_key, [...(aliasesByTerm.get(alias.term_key) ?? []), alias]);
  }

  const rulesByTerm = new Map<string, RuleRow[]>();
  for (const rule of ruleRows) {
    rulesByTerm.set(rule.term_key, [...(rulesByTerm.get(rule.term_key) ?? []), rule]);
  }

  return {
    query,
    totals,
    terms: termRows.map((term) => ({
      id: term.term_key,
      canonicalName: term.canonical_name,
      category: term.category ?? "term",
      score: term.score,
      identifiers: {
        cas: jsonArray(term.identifiers?.cas),
        inci: jsonArray(term.identifiers?.inci),
        colorIndex: jsonArray(term.identifiers?.color_index)
      },
      aliases: (aliasesByTerm.get(term.term_key) ?? []).slice(0, 8).map((alias) => ({
        value: alias.alias_value,
        normalized: alias.normalized_alias,
        type: alias.alias_type,
        language: alias.language,
        jurisdiction: alias.jurisdiction,
        confidence: numeric(alias.confidence),
        note: alias.note,
        source: alias.source ?? undefined
      })),
      aliasCount: aliasesByTerm.get(term.term_key)?.length ?? 0,
      sourceKeys: jsonArray(term.source_keys),
      notes: term.notes ?? "",
      rules: (rulesByTerm.get(term.term_key) ?? []).slice(0, 12).map((rule) => ({
        ruleCode: rule.rule_code,
        jurisdiction: rule.jurisdiction,
        basis: rule.match_basis,
        confidence: numeric(rule.confidence)
      }))
    })),
    sources: sourceRows.map((source) => ({
      id: source.source_key,
      title: source.title,
      url: source.source_url,
      authority: source.authority ?? "",
      jurisdiction: source.jurisdiction,
      domain: source.domain,
      sourceType: source.source_type,
      priority: source.priority,
      tags: jsonArray(source.tags),
      format: source.metadata?.format ?? "html",
      browserCapture: Boolean(source.metadata?.browser_capture),
      manualFallback: Boolean(source.metadata?.manual_fallback),
      documentPath: source.document_path,
      score: source.score
    }))
  };
}
