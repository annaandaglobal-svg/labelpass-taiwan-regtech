import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import type { KnowledgeSearchResult } from "./knowledge-search";
import { foldKnowledgeSeparators, normalizeKnowledgeQuery } from "./knowledge-search";

type DbClient = ReturnType<typeof postgres>;
type RemoteClient = ReturnType<typeof createClient>;
type RpcCapableClient = RemoteClient & {
  rpc: (fn: string, args?: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
};

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
  cache_days: number | null;
  document_path: string | null;
  fetched_at: Date | string | null;
  from_cache: boolean | null;
  extract: string | null;
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;
let client: DbClient | null = null;
let remoteClient: RemoteClient | null = null;
let totalsCache: { value: KnowledgeSearchResult["totals"]; expiresAt: number } | null = null;
let remoteTotalsCache: { value: KnowledgeSearchResult["totals"]; expiresAt: number } | null = null;

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

function getRemoteClient() {
  if (!supabaseUrl || !supabasePublicKey) return null;
  remoteClient ??= createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return remoteClient;
}

function asRpcClient(supabase: RemoteClient) {
  return supabase as RpcCapableClient;
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

function timestamp(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cacheExpiry(fetchedAt: string | null, cacheDays: number | null | undefined) {
  if (!fetchedAt || !cacheDays) return null;
  return new Date(Date.parse(fetchedAt) + cacheDays * 24 * 60 * 60 * 1000).toISOString();
}

function cacheStatus(cacheExpiresAt: string | null) {
  if (!cacheExpiresAt) return "unknown";
  return Date.parse(cacheExpiresAt) < Date.now() ? "stale" : "fresh";
}

function priorityRank(priority: string) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function sourceBoostsFor(termRows: TermRow[]) {
  const sourceBoosts = new Map<string, number>();
  for (const term of termRows.slice(0, 6)) {
    jsonArray(term.source_keys).forEach((sourceKey, index) => {
      const boost = Math.max(36, term.score - 8 - index * 2);
      sourceBoosts.set(sourceKey, Math.max(sourceBoosts.get(sourceKey) ?? 0, boost));
    });
  }
  return sourceBoosts;
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
  const foldedQuery = foldKnowledgeSeparators(query);
  const canUseContains = query.length > 2 || /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(query);
  const canUseFolded = foldedQuery.length > 3;

  return sql<TermRow[]>`
    with alias_scores as (
      select
        a.term_key,
        max(
          case
            when a.normalized_alias = ${query} then 130
            when ${canUseFolded} and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') = ${foldedQuery} then 122
            when ${canUseContains} and a.normalized_alias like ${prefix} escape '\\' then 108
            when ${canUseContains} and a.normalized_alias like ${contains} escape '\\' then 92
            when ${canUseFolded} and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like (${foldedQuery} || '%') then 84
            when ${canUseFolded} and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like ('%' || ${foldedQuery} || '%') then 70
            when length(a.normalized_alias) > 4 and ${query} like ('%' || a.normalized_alias || '%') then 68
            else 0
          end + round(a.confidence * 10)::integer
        ) as score
      from public.term_aliases a
      where
        a.normalized_alias = ${query}
        or (${canUseContains} and a.normalized_alias like ${contains} escape '\\')
        or (${canUseFolded} and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like ('%' || ${foldedQuery} || '%'))
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
            when ${canUseFolded} and regexp_replace(lower(t.canonical_name), '[[:space:]_.-]+', '', 'g') = ${foldedQuery} then 110
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
        fetched_at,
        from_cache,
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
        s.cache_days,
        latest_snapshot.document_path,
        latest_snapshot.fetched_at,
        latest_snapshot.from_cache,
        latest_snapshot.extract,
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
    limit ${Math.max(4, Math.min(limit, 30))}
  `;
}

async function readSourceRowsByKeys(sql: DbClient, sourceKeys: string[]) {
  if (!sourceKeys.length) return [];

  return sql<SourceRow[]>`
    with latest_snapshot as (
      select distinct on (source_key)
        source_key,
        document_path,
        fetched_at,
        from_cache,
        metadata,
        extract
      from public.knowledge_snapshots
      order by source_key, fetched_at desc
    )
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
      s.cache_days,
      latest_snapshot.document_path,
      latest_snapshot.fetched_at,
      latest_snapshot.from_cache,
      latest_snapshot.extract,
      latest_snapshot.metadata,
      0::integer as score
    from public.knowledge_sources s
    left join latest_snapshot on latest_snapshot.source_key = s.source_key
    where s.is_active = true
      and s.source_key in ${sql(sourceKeys)}
  `;
}

async function readRemoteTotals(supabase: RemoteClient): Promise<KnowledgeSearchResult["totals"]> {
  const now = Date.now();
  if (remoteTotalsCache && remoteTotalsCache.expiresAt > now) return remoteTotalsCache.value;

  const { data, error } = await supabase.rpc("knowledge_search_totals_public");
  if (error) throw new Error(error.message);
  const row = (data as TotalsRow[] | null)?.[0];

  const value = {
    sources: row?.sources ?? 0,
    terms: row?.terms ?? 0,
    aliases: row?.aliases ?? 0,
    ruleLinks: row?.rule_links ?? 0
  };

  remoteTotalsCache = { value, expiresAt: now + 60_000 };
  return value;
}

async function readRemoteTermRows(supabase: RemoteClient, query: string, limit: number) {
  const { data, error } = await asRpcClient(supabase).rpc("search_knowledge_terms_public", {
    raw_query: query,
    result_limit: limit
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TermRow[];
}

async function readRemoteAliases(supabase: RemoteClient, termKeys: string[]) {
  if (!termKeys.length) return [];

  const { data, error } = await supabase
    .from("term_aliases")
    .select("term_key, alias_value, normalized_alias, alias_type, language, jurisdiction, confidence, source, note")
    .in("term_key", termKeys)
    .order("confidence", { ascending: false })
    .order("alias_value", { ascending: true })
    .limit(600);

  if (error) throw new Error(error.message);
  return (data ?? []) as AliasRow[];
}

async function readRemoteRuleLinks(supabase: RemoteClient, termKeys: string[]) {
  if (!termKeys.length) return [];

  const { data, error } = await supabase
    .from("term_rule_links")
    .select("term_key, rule_code, jurisdiction, match_basis, confidence")
    .in("term_key", termKeys)
    .order("confidence", { ascending: false })
    .order("rule_code", { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);
  return (data ?? []) as RuleRow[];
}

async function readRemoteSourceRows(supabase: RemoteClient, query: string, limit: number) {
  const { data, error } = await asRpcClient(supabase).rpc("search_knowledge_sources_public", {
    raw_query: query,
    result_limit: Math.min(limit * 2, 30)
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceRow[];
}

async function readRemoteSourceRowsByKeys(supabase: RemoteClient, sourceKeys: string[]) {
  if (!sourceKeys.length) return [];

  const { data, error } = await asRpcClient(supabase).rpc("list_knowledge_sources_public", {
    source_keys: sourceKeys
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SourceRow[];
}

function buildKnowledgeSearchResult(params: {
  query: string;
  totals: KnowledgeSearchResult["totals"];
  limit: number;
  termRows: TermRow[];
  aliasRows: AliasRow[];
  ruleRows: RuleRow[];
  directSourceRows: SourceRow[];
  boostedSourceRows: SourceRow[];
  sourceBoosts: Map<string, number>;
}): KnowledgeSearchResult {
  const { query, totals, limit, termRows, aliasRows, ruleRows, directSourceRows, boostedSourceRows, sourceBoosts } = params;

  const aliasesByTerm = new Map<string, AliasRow[]>();
  for (const alias of aliasRows) {
    aliasesByTerm.set(alias.term_key, [...(aliasesByTerm.get(alias.term_key) ?? []), alias]);
  }

  const rulesByTerm = new Map<string, RuleRow[]>();
  for (const rule of ruleRows) {
    rulesByTerm.set(rule.term_key, [...(rulesByTerm.get(rule.term_key) ?? []), rule]);
  }

  const sourceRowsByKey = new Map<string, SourceRow>();
  for (const source of [...directSourceRows, ...boostedSourceRows]) {
    const boost = sourceBoosts.get(source.source_key) ?? 0;
    const score = Math.max(source.score, boost);
    const existing = sourceRowsByKey.get(source.source_key);
    if (!existing || score > existing.score) {
      sourceRowsByKey.set(source.source_key, { ...source, score });
    }
  }

  const sourceRows = [...sourceRowsByKey.values()]
    .sort((a, b) => b.score - a.score || priorityRank(a.priority) - priorityRank(b.priority) || a.title.localeCompare(b.title))
    .slice(0, Math.max(4, Math.floor(limit / 2)));

  return {
    query,
    totals,
    ambiguity: null,
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
      ambiguousAliases: [],
      sourceKeys: jsonArray(term.source_keys),
      notes: term.notes ?? "",
      rules: (rulesByTerm.get(term.term_key) ?? []).slice(0, 12).map((rule) => ({
        ruleCode: rule.rule_code,
        jurisdiction: rule.jurisdiction,
        basis: rule.match_basis,
        confidence: numeric(rule.confidence)
      }))
    })),
    sources: sourceRows.map((source) => {
      const fetchedAt = timestamp(source.fetched_at);
      const cacheExpiresAt = cacheExpiry(fetchedAt, source.cache_days);
      return {
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
        fetchedAt,
        fromCache: Boolean(source.from_cache),
        cacheDays: source.cache_days ?? null,
        cacheExpiresAt,
        cacheStatus: cacheStatus(cacheExpiresAt),
        excerpt: source.extract ?? "",
        browserCapture: Boolean(source.metadata?.browser_capture),
        manualFallback: Boolean(source.metadata?.manual_fallback),
        documentPath: source.document_path,
        score: source.score
      };
    })
  };
}

async function searchDirectPostgresKnowledge(rawQuery: string, limit: number): Promise<KnowledgeSearchResult | null> {
  const sql = getClient();
  if (!sql) return null;

  const query = normalizeKnowledgeQuery(rawQuery).slice(0, 120);
  const totals = await readTotals(sql);

  if (!query) {
    return { query: "", totals, ambiguity: null, terms: [], sources: [] };
  }

  const termRows = await readTermRows(sql, query, limit);
  const termKeys = termRows.map((term) => term.term_key);
  const sourceBoosts = sourceBoostsFor(termRows);

  const [aliasRows, ruleRows, directSourceRows, boostedSourceRows] = await Promise.all([
    readAliases(sql, termKeys),
    readRuleLinks(sql, termKeys),
    readSourceRows(sql, query, limit),
    readSourceRowsByKeys(sql, [...sourceBoosts.keys()])
  ]);

  return buildKnowledgeSearchResult({
    query,
    totals,
    limit,
    termRows,
    aliasRows,
    ruleRows,
    directSourceRows,
    boostedSourceRows,
    sourceBoosts
  });
}

async function searchRemoteSupabaseKnowledge(rawQuery: string, limit: number): Promise<KnowledgeSearchResult | null> {
  const supabase = getRemoteClient();
  if (!supabase) return null;

  const query = normalizeKnowledgeQuery(rawQuery).slice(0, 120);
  const totals = await readRemoteTotals(supabase);

  if (!query) {
    return { query: "", totals, ambiguity: null, terms: [], sources: [] };
  }

  const termRows = await readRemoteTermRows(supabase, query, limit);
  const termKeys = termRows.map((term) => term.term_key);
  const sourceBoosts = sourceBoostsFor(termRows);

  const [aliasRows, ruleRows, directSourceRows, boostedSourceRows] = await Promise.all([
    readRemoteAliases(supabase, termKeys),
    readRemoteRuleLinks(supabase, termKeys),
    readRemoteSourceRows(supabase, query, limit),
    readRemoteSourceRowsByKeys(supabase, [...sourceBoosts.keys()])
  ]);

  return buildKnowledgeSearchResult({
    query,
    totals,
    limit,
    termRows,
    aliasRows,
    ruleRows,
    directSourceRows,
    boostedSourceRows,
    sourceBoosts
  });
}

export async function searchSupabaseKnowledge(rawQuery: string, limit = 10): Promise<KnowledgeSearchResult | null> {
  return (await searchDirectPostgresKnowledge(rawQuery, limit)) ?? searchRemoteSupabaseKnowledge(rawQuery, limit);
}
