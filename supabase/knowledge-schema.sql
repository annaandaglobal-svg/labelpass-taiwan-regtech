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
  extract text,
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

drop policy if exists "knowledge_sources_authenticated_read" on public.knowledge_sources;
create policy "knowledge_sources_authenticated_read"
on public.knowledge_sources for select
to authenticated
using (is_active = true or public.is_reviewer_or_admin());

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

drop policy if exists "knowledge_terms_authenticated_read" on public.knowledge_terms;
create policy "knowledge_terms_authenticated_read"
on public.knowledge_terms for select
to authenticated
using (true);

drop policy if exists "term_aliases_authenticated_read" on public.term_aliases;
create policy "term_aliases_authenticated_read"
on public.term_aliases for select
to authenticated
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
