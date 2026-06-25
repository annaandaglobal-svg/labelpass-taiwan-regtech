-- Improve public knowledge source search for multi-token date/keyphrase queries.
-- Example: "April 1 2026 tariff" should match the Japan Customs tariff schedule extract.

create or replace function public.knowledge_all_query_tokens_match(raw_text text, raw_query text)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      public.normalize_knowledge_search_query(raw_text) as haystack,
      public.normalize_knowledge_search_query(raw_query) as query
  ),
  tokens as (
    select distinct split.token
    from normalized,
      regexp_split_to_table(normalized.query, '\s+') as split(token)
    where char_length(split.token) > 1
  )
  select
    (select count(*) from tokens) > 1
    and not exists (
      select 1
      from tokens
      cross join normalized
      where normalized.haystack not like ('%' || public.escape_knowledge_like(tokens.token) || '%') escape '\'
    );
$$;

create or replace function public.search_knowledge_sources_public(raw_query text, result_limit integer default 10)
returns table (
  source_key text,
  title text,
  source_url text,
  authority text,
  jurisdiction text,
  domain text,
  source_type text,
  priority text,
  tags jsonb,
  cache_days integer,
  document_path text,
  fetched_at timestamptz,
  from_cache boolean,
  "extract" text,
  metadata jsonb,
  score integer
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      left(public.normalize_knowledge_search_query(raw_query), 120) as query,
      public.escape_knowledge_like(left(public.normalize_knowledge_search_query(raw_query), 120)) as escaped_query,
      greatest(4, least(coalesce(result_limit, 10), 30) / 2) as safe_limit
  ),
  flags as (
    select
      query,
      escaped_query,
      safe_limit,
      (char_length(query) > 2) as can_use_contains
    from params
  ),
  latest_snapshot as (
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
      latest_snapshot.extract as "extract",
      latest_snapshot.metadata,
      greatest(
        case when flags.can_use_contains and lower(s.title) like ('%' || flags.escaped_query || '%') escape '\' then 94 else 0 end,
        case when flags.can_use_contains and lower(s.source_url) like ('%' || flags.escaped_query || '%') escape '\' then 88 else 0 end,
        case when flags.can_use_contains and lower(coalesce(s.authority, '')) like ('%' || flags.escaped_query || '%') escape '\' then 78 else 0 end,
        case when flags.can_use_contains and lower(s.domain || ' ' || s.source_type || ' ' || s.jurisdiction) like ('%' || flags.escaped_query || '%') escape '\' then 74 else 0 end,
        case when flags.can_use_contains and lower(s.tags::text) like ('%' || flags.escaped_query || '%') escape '\' then 72 else 0 end,
        case when flags.can_use_contains and lower(coalesce(latest_snapshot.extract, '')) like ('%' || flags.escaped_query || '%') escape '\' then 58 else 0 end,
        case when public.knowledge_all_query_tokens_match(
          concat_ws(
            ' ',
            s.title,
            s.source_url,
            s.authority,
            s.jurisdiction,
            s.domain,
            s.source_type,
            s.priority,
            s.tags::text,
            coalesce(latest_snapshot.extract, ''),
            coalesce(latest_snapshot.metadata::text, '')
          ),
          flags.query
        ) then 58 else 0 end
      )::integer as score
    from public.knowledge_sources s
    cross join flags
    left join latest_snapshot on latest_snapshot.source_key = s.source_key
    where s.is_active = true
  )
  select
    source_key,
    title,
    source_url,
    authority,
    jurisdiction,
    domain,
    source_type,
    priority,
    tags,
    cache_days,
    document_path,
    fetched_at,
    from_cache,
    "extract",
    metadata,
    score
  from source_scores
  where score > 0
  order by score desc, case priority when 'high' then 0 when 'medium' then 1 else 2 end, title asc
  limit (select safe_limit from flags);
$$;

grant execute on function public.knowledge_all_query_tokens_match(text, text) to anon, authenticated;
grant execute on function public.search_knowledge_sources_public(text, integer) to anon, authenticated;
