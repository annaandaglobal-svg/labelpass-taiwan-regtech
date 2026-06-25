-- Operational queue for official regulatory source changes.
-- Detection is automatic; rule changes still require human approval.

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

drop trigger if exists trg_regulatory_update_candidates_updated_at on public.regulatory_update_candidates;
create trigger trg_regulatory_update_candidates_updated_at
before update on public.regulatory_update_candidates
for each row execute function public.set_updated_at();

create index if not exists idx_regulatory_update_candidates_status_severity
  on public.regulatory_update_candidates (status, severity, detected_at desc);

create index if not exists idx_regulatory_update_candidates_source
  on public.regulatory_update_candidates (source_key, detected_at desc);

create index if not exists idx_regulatory_update_candidates_terms
  on public.regulatory_update_candidates using gin (affected_terms);

create index if not exists idx_regulatory_update_candidates_products
  on public.regulatory_update_candidates using gin (affected_products);

alter table public.regulatory_update_candidates enable row level security;

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
