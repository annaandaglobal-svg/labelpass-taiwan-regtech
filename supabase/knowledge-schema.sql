-- LabelPass knowledge base tables for an existing Supabase project.

create table if not exists public.knowledge_sources (
  source_key text primary key,
  title text not null,
  source_url text not null unique,
  authority text,
  jurisdiction text not null default 'GLOBAL',
  domain text not null,
  source_type text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  tags jsonb not null default '[]'::jsonb,
  cache_days integer not null default 14,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.knowledge_sources is
  'Crawled source registry for reusable regulatory memory. Raw cache is stored locally; source metadata and snapshots are queryable in Supabase.';

create table if not exists public.knowledge_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.knowledge_sources (source_key) on delete cascade,
  content_hash text not null,
  fetched_at timestamptz not null,
  from_cache boolean not null default false,
  bytes integer not null default 0,
  text_chars integer not null default 0,
  document_path text not null,
  "extract" text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_key, content_hash)
);

comment on table public.knowledge_snapshots is
  'Content-hashed source snapshots used for LLM retrieval, diffing, and evidence traceability.';

create table if not exists public.knowledge_terms (
  term_key text primary key,
  canonical_name text not null,
  category text,
  identifiers jsonb not null default '{}'::jsonb,
  source_keys jsonb not null default '[]'::jsonb,
  notes text,
  registry_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.knowledge_terms is
  'Canonical ingredient, chemical, product, and trade terms used to bridge country-specific names, INCI, CAS, CI, and local-language aliases.';

create table if not exists public.term_aliases (
  id uuid primary key default gen_random_uuid(),
  term_key text not null references public.knowledge_terms (term_key) on delete cascade,
  alias_value text not null,
  normalized_alias text not null,
  alias_type text not null default 'alias',
  language text not null default 'und',
  jurisdiction text not null default 'GLOBAL',
  confidence numeric(4,3) not null default 0.850
    check (confidence >= 0 and confidence <= 1),
  source text,
  note text,
  created_at timestamptz not null default now(),
  unique (term_key, normalized_alias, language, jurisdiction, alias_type)
);

comment on table public.term_aliases is
  'Searchable aliases for a canonical term, including local names, INCI names, CAS numbers, color index numbers, abbreviations, and trade names.';

create table if not exists public.term_rule_links (
  term_key text not null references public.knowledge_terms (term_key) on delete cascade,
  rule_code text not null references public.rules (rule_code) on delete cascade,
  jurisdiction text not null default 'TW',
  match_basis text not null,
  confidence numeric(4,3) not null default 0.850
    check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (term_key, rule_code)
);

comment on table public.term_rule_links is
  'Links canonical terms and aliases to regulatory rules so synonym search can resolve back to source-backed compliance rules.';

create table if not exists public.regulatory_update_candidates (
  candidate_key text primary key,
  source_key text references public.knowledge_sources (source_key) on delete set null,
  title text not null,
  source_url text not null,
  authority text,
  jurisdiction text not null default 'TW',
  domain text not null,
  source_type text not null,
  source_priority text not null default 'medium'
    check (source_priority in ('low', 'medium', 'high')),
  change_type text not null
    check (change_type in (
      'baseline_watch',
      'content_changed',
      'fetch_failed',
      'fetch_or_parse_regressed',
      'source_expiring_soon',
      'source_stale'
    )),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  status text not null default 'detected'
    check (status in ('detected', 'pending_refresh', 'watching', 'triaged', 'approved', 'rejected', 'applied', 'superseded')),
  detected_at timestamptz not null,
  fetched_at timestamptz,
  cache_expires_at timestamptz,
  previous_hash text,
  current_hash text,
  affected_domains jsonb not null default '[]'::jsonb,
  affected_terms jsonb not null default '[]'::jsonb,
  affected_products jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  next_action text,
  reviewer_notes text,
  decision text,
  decided_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regulatory_update_candidates is
  'Detected official-source freshness and content-change candidates. These rows support human approval before any regulatory rule is changed.';

drop trigger if exists trg_knowledge_sources_updated_at on public.knowledge_sources;
create trigger trg_knowledge_sources_updated_at
before update on public.knowledge_sources
for each row execute function public.set_updated_at();

drop trigger if exists trg_knowledge_terms_updated_at on public.knowledge_terms;
create trigger trg_knowledge_terms_updated_at
before update on public.knowledge_terms
for each row execute function public.set_updated_at();

drop trigger if exists trg_regulatory_update_candidates_updated_at on public.regulatory_update_candidates;
create trigger trg_regulatory_update_candidates_updated_at
before update on public.regulatory_update_candidates
for each row execute function public.set_updated_at();

create index if not exists idx_knowledge_sources_domain_priority on public.knowledge_sources (domain, priority);
create index if not exists idx_knowledge_sources_tags on public.knowledge_sources using gin (tags);
create index if not exists idx_knowledge_snapshots_source_fetched on public.knowledge_snapshots (source_key, fetched_at desc);
create index if not exists idx_knowledge_snapshots_hash on public.knowledge_snapshots (content_hash);
create index if not exists idx_knowledge_terms_identifiers on public.knowledge_terms using gin (identifiers);
create index if not exists idx_term_aliases_normalized on public.term_aliases (normalized_alias);
create index if not exists idx_term_aliases_jurisdiction_language on public.term_aliases (jurisdiction, language);
create index if not exists idx_term_rule_links_rule_code on public.term_rule_links (rule_code);
create index if not exists idx_regulatory_update_candidates_status_severity on public.regulatory_update_candidates (status, severity, detected_at desc);
create index if not exists idx_regulatory_update_candidates_source on public.regulatory_update_candidates (source_key, detected_at desc);
create index if not exists idx_regulatory_update_candidates_terms on public.regulatory_update_candidates using gin (affected_terms);
create index if not exists idx_regulatory_update_candidates_products on public.regulatory_update_candidates using gin (affected_products);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_snapshots enable row level security;
alter table public.knowledge_terms enable row level security;
alter table public.term_aliases enable row level security;
alter table public.term_rule_links enable row level security;
alter table public.regulatory_update_candidates enable row level security;

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

drop policy if exists "knowledge_sources_authenticated_read" on public.knowledge_sources;
create policy "knowledge_sources_authenticated_read"
on public.knowledge_sources for select
to authenticated
using (is_active = true or public.is_reviewer_or_admin());

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

drop policy if exists "knowledge_snapshots_authenticated_read" on public.knowledge_snapshots;
create policy "knowledge_snapshots_authenticated_read"
on public.knowledge_snapshots for select
to authenticated
using (
  exists (
    select 1 from public.knowledge_sources
    where knowledge_sources.source_key = knowledge_snapshots.source_key
      and (knowledge_sources.is_active = true or public.is_reviewer_or_admin())
  )
);

drop policy if exists "knowledge_terms_public_read" on public.knowledge_terms;
create policy "knowledge_terms_public_read"
on public.knowledge_terms for select
to anon, authenticated
using (true);

drop policy if exists "knowledge_terms_authenticated_read" on public.knowledge_terms;
create policy "knowledge_terms_authenticated_read"
on public.knowledge_terms for select
to authenticated
using (true);

drop policy if exists "term_aliases_public_read" on public.term_aliases;
create policy "term_aliases_public_read"
on public.term_aliases for select
to anon, authenticated
using (true);

drop policy if exists "term_aliases_authenticated_read" on public.term_aliases;
create policy "term_aliases_authenticated_read"
on public.term_aliases for select
to authenticated
using (true);

drop policy if exists "term_rule_links_public_read" on public.term_rule_links;
create policy "term_rule_links_public_read"
on public.term_rule_links for select
to anon, authenticated
using (true);

drop policy if exists "term_rule_links_authenticated_read" on public.term_rule_links;
create policy "term_rule_links_authenticated_read"
on public.term_rule_links for select
to authenticated
using (true);

drop policy if exists "regulatory_update_candidates_reviewer_read" on public.regulatory_update_candidates;
create policy "regulatory_update_candidates_reviewer_read"
on public.regulatory_update_candidates for select
to authenticated
using (public.is_reviewer_or_admin());

drop policy if exists "regulatory_update_candidates_reviewer_manage" on public.regulatory_update_candidates;
create policy "regulatory_update_candidates_reviewer_manage"
on public.regulatory_update_candidates for all
to authenticated
using (public.is_reviewer_or_admin())
with check (public.is_reviewer_or_admin());

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
      greatest(4, least(coalesce(result_limit, 10), 30)) as safe_limit
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
grant execute on function public.knowledge_all_query_tokens_match(text, text) to anon, authenticated;
grant execute on function public.search_knowledge_terms_public(text, integer) to anon, authenticated;
grant execute on function public.search_knowledge_sources_public(text, integer) to anon, authenticated;
grant execute on function public.list_knowledge_sources_public(text[]) to anon, authenticated;
