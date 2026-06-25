-- Public read-only knowledge search surface for the deployed app.
-- This does not expose review archives or regulatory update triage rows.

grant select on public.knowledge_sources to anon, authenticated;
grant select on public.knowledge_snapshots to anon, authenticated;
grant select on public.knowledge_terms to anon, authenticated;
grant select on public.term_aliases to anon, authenticated;
grant select on public.term_rule_links to anon, authenticated;

drop policy if exists "knowledge_sources_public_read" on public.knowledge_sources;
create policy "knowledge_sources_public_read"
on public.knowledge_sources for select
to anon, authenticated
using (is_active = true);

drop policy if exists "knowledge_snapshots_public_read" on public.knowledge_snapshots;
create policy "knowledge_snapshots_public_read"
on public.knowledge_snapshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.knowledge_sources
    where knowledge_sources.source_key = knowledge_snapshots.source_key
      and knowledge_sources.is_active = true
  )
);

drop policy if exists "knowledge_terms_public_read" on public.knowledge_terms;
create policy "knowledge_terms_public_read"
on public.knowledge_terms for select
to anon, authenticated
using (true);

drop policy if exists "term_aliases_public_read" on public.term_aliases;
create policy "term_aliases_public_read"
on public.term_aliases for select
to anon, authenticated
using (true);

drop policy if exists "term_rule_links_public_read" on public.term_rule_links;
create policy "term_rule_links_public_read"
on public.term_rule_links for select
to anon, authenticated
using (true);

create or replace function public.normalize_knowledge_search_query(raw_query text)
returns text
language sql
immutable
as $$
  select lower(
    btrim(
      regexp_replace(
        regexp_replace(coalesce(raw_query, ''), '[\(\)\[\]\{\}]', ' ', 'g'),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

create or replace function public.escape_knowledge_like(raw_query text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(raw_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
$$;

create or replace function public.knowledge_search_totals_public()
returns table (
  sources integer,
  terms integer,
  aliases integer,
  rule_links integer
)
language sql
stable
set search_path = public
as $$
  select
    (select count(*)::integer from public.knowledge_sources where is_active = true) as sources,
    (select count(*)::integer from public.knowledge_terms) as terms,
    (select count(*)::integer from public.term_aliases) as aliases,
    (select count(*)::integer from public.term_rule_links) as rule_links;
$$;

create or replace function public.search_knowledge_terms_public(raw_query text, result_limit integer default 10)
returns table (
  term_key text,
  canonical_name text,
  category text,
  identifiers jsonb,
  source_keys jsonb,
  notes text,
  score integer
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      left(public.normalize_knowledge_search_query(raw_query), 120) as query,
      regexp_replace(left(public.normalize_knowledge_search_query(raw_query), 120), '[[:space:]_.-]+', '', 'g') as folded_query,
      public.escape_knowledge_like(left(public.normalize_knowledge_search_query(raw_query), 120)) as escaped_query,
      greatest(1, least(coalesce(result_limit, 10), 30)) as safe_limit
  ),
  flags as (
    select
      query,
      folded_query,
      escaped_query,
      safe_limit,
      (char_length(query) > 2) as can_use_contains,
      (char_length(folded_query) > 3) as can_use_folded
    from params
  ),
  alias_scores as (
    select
      a.term_key,
      max(
        case
          when a.normalized_alias = flags.query then 130
          when flags.can_use_folded and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') = flags.folded_query then 122
          when flags.can_use_contains and a.normalized_alias like (flags.escaped_query || '%') escape '\' then 108
          when flags.can_use_contains and a.normalized_alias like ('%' || flags.escaped_query || '%') escape '\' then 92
          when flags.can_use_folded and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like (flags.folded_query || '%') then 84
          when flags.can_use_folded and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like ('%' || flags.folded_query || '%') then 70
          when char_length(a.normalized_alias) > 4 and flags.query like ('%' || a.normalized_alias || '%') then 68
          else 0
        end + round(a.confidence * 10)::integer
      ) as score
    from public.term_aliases a
    cross join flags
    where
      flags.query <> ''
      and (
        a.normalized_alias = flags.query
        or (flags.can_use_contains and a.normalized_alias like ('%' || flags.escaped_query || '%') escape '\')
        or (flags.can_use_folded and regexp_replace(a.normalized_alias, '[[:space:]_.-]+', '', 'g') like ('%' || flags.folded_query || '%'))
        or (char_length(a.normalized_alias) > 4 and flags.query like ('%' || a.normalized_alias || '%'))
      )
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
          when lower(t.canonical_name) = flags.query then 118
          when flags.can_use_folded and regexp_replace(lower(t.canonical_name), '[[:space:]_.-]+', '', 'g') = flags.folded_query then 110
          when flags.can_use_contains and lower(t.canonical_name) like ('%' || flags.escaped_query || '%') escape '\' then 82
          else 0
        end
      )::integer as score
    from public.knowledge_terms t
    cross join flags
    left join alias_scores a on a.term_key = t.term_key
  )
  select
    term_key,
    canonical_name,
    category,
    identifiers,
    source_keys,
    notes,
    score
  from term_scores, flags
  where score > 0
  order by score desc, canonical_name asc
  limit (select safe_limit from flags);
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
        case when flags.can_use_contains and lower(coalesce(latest_snapshot.extract, '')) like ('%' || flags.escaped_query || '%') escape '\' then 58 else 0 end
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

create or replace function public.list_knowledge_sources_public(source_keys text[])
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
    latest_snapshot.extract as "extract",
    latest_snapshot.metadata,
    0::integer as score
  from public.knowledge_sources s
  left join latest_snapshot on latest_snapshot.source_key = s.source_key
  where s.is_active = true
    and s.source_key = any(coalesce(source_keys, array[]::text[]));
$$;

grant execute on function public.knowledge_search_totals_public() to anon, authenticated;
grant execute on function public.search_knowledge_terms_public(text, integer) to anon, authenticated;
grant execute on function public.search_knowledge_sources_public(text, integer) to anon, authenticated;
grant execute on function public.list_knowledge_sources_public(text[]) to anon, authenticated;
