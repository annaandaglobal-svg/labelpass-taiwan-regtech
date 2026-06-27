-- LabelPass initial Supabase schema
-- Scope: Taiwan cosmetics regulatory review workflow.
--
-- RLS posture:
--   1. Row level security is enabled on every application table.
--   2. No permissive client policies are created in this starter schema.
--   3. Add policies after the app finalizes owner/reviewer/admin behavior.
--   4. Ingestion jobs and audit writes should run through trusted server-side code
--      or the Supabase service role, not directly from browser clients.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- App profiles are tied one-to-one with Supabase auth users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  role text not null default 'member'
    check (role in ('member', 'reviewer', 'admin')),
  locale text not null default 'ko-KR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User profile linked to auth.users. RLS should let users read/update their own profile, while admins can manage all profiles.';

-- Customer company tenants for workspace, admin, expert, logistics, and shipment operations.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles (id) on delete set null,
  name text not null,
  legal_name text,
  country text not null default 'KR',
  primary_market text not null default 'TW',
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended', 'archived')),
  billing_status text not null default 'trial'
    check (billing_status in ('trial', 'active', 'past_due', 'paused', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is
  'Customer company tenant. Products, reviews, documents, experts, logistics matches and shipments are grouped by organization.';

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'operator'
    check (role in ('owner', 'admin', 'operator', 'reviewer', 'viewer', 'expert', 'logistics')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references public.profiles (id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

comment on table public.organization_members is
  'Organization membership and role state. RLS uses this table to scope company data.';

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  default_locale text not null default 'ko-KR',
  markets jsonb not null default '["TW"]'::jsonb,
  review_archive_enabled boolean not null default false,
  expert_matching_enabled boolean not null default false,
  logistics_matching_enabled boolean not null default false,
  notification_channels jsonb not null default '["email"]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organization_settings is
  'Organization-level defaults for markets, archive behavior, expert matching, logistics matching, and notifications.';

-- Product records submitted for LabelPass regulatory review.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  brand text,
  category text,
  sku text,
  barcode text,
  market text not null default 'TW',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'in_review', 'needs_action', 'approved', 'rejected', 'archived')),
  ingredients_text text,
  ingredients_json jsonb not null default '[]'::jsonb,
  label_text text,
  pif_status text not null default 'unknown'
    check (pif_status in ('unknown', 'not_required', 'required_missing', 'required_present', 'verified')),
  pif_required_on date,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Product master record. RLS should let owners access their products and let reviewers/admins access products assigned to review workflows.';

-- Registry of official regulatory sources, including TFDA datasets, laws, notices, and guidance.
create table if not exists public.regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  authority text not null default 'TFDA',
  jurisdiction text not null default 'TW',
  source_type text not null
    check (source_type in ('dataset', 'law', 'notice', 'guideline', 'other')),
  title text not null,
  source_url text not null unique,
  external_id text,
  info_id integer,
  dataset_id text,
  notice_number text,
  source_format text,
  update_frequency text,
  license text,
  published_on date,
  effective_on date,
  last_metadata_updated_at timestamptz,
  last_checked_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.regulatory_sources is
  'Official source registry. RLS should usually allow app read access to active sources, with writes restricted to admins or trusted ingestion jobs.';

-- Normalized rule headers derived from official sources.
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.regulatory_sources (id) on delete restrict,
  rule_code text not null unique,
  title text not null,
  category text not null
    check (category in ('prohibited', 'restricted', 'colorant', 'preservative', 'sunscreen', 'pif', 'labeling', 'other')),
  jurisdiction text not null default 'TW',
  match_strategy text not null default 'ingredient'
    check (match_strategy in ('ingredient', 'cas', 'color_index', 'product_category', 'label_text', 'manual')),
  status text not null default 'active'
    check (status in ('draft', 'active', 'retired')),
  scope jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rules is
  'Normalized rule header. RLS should expose active rules as read-only data to the app and restrict writes to admins/ingestion jobs.';

-- Versioned rule text, structured conditions, and source snapshots.
create table if not exists public.rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.rules (id) on delete cascade,
  source_id uuid not null references public.regulatory_sources (id) on delete restrict,
  version_label text not null,
  source_record_id text,
  source_hash text,
  effective_from date,
  effective_to date,
  is_current boolean not null default true,
  rule_text text not null,
  ingredient_names jsonb not null default '[]'::jsonb,
  cas_numbers jsonb not null default '[]'::jsonb,
  color_index_numbers jsonb not null default '[]'::jsonb,
  product_scope text,
  limit_text text,
  restriction_text text,
  caution_text text,
  conditions jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (rule_id, version_label)
);

create unique index if not exists rule_versions_one_current_per_rule
  on public.rule_versions (rule_id)
  where is_current;

comment on table public.rule_versions is
  'Versioned regulatory evidence. RLS should make current and historical versions readable for explainability, while writes remain ingestion/admin only.';

-- Review outcomes for a product at a specific point in time.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  verdict text
    check (verdict in ('pass', 'warn', 'fail', 'needs_review')),
  risk_score numeric(5,2) check (risk_score is null or (risk_score >= 0 and risk_score <= 100)),
  summary text,
  source_version_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.reviews is
  'Review history and outcome. RLS should let owners read decisions for their products and let assigned reviewers/admins create or update reviews.';

-- Ingredient, label, PIF, and rule hits discovered during analysis.
create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete cascade,
  rule_id uuid references public.rules (id) on delete set null,
  rule_version_id uuid references public.rule_versions (id) on delete set null,
  source_id uuid references public.regulatory_sources (id) on delete set null,
  finding_type text not null
    check (finding_type in ('ingredient', 'labeling', 'pif', 'source_quality', 'manual')),
  severity text not null
    check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'accepted', 'resolved', 'false_positive')),
  ingredient_name text,
  inci_name text,
  cas_number text,
  matched_text text,
  rule_summary text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.findings is
  'Structured evidence for rule hits. RLS should follow the parent product and review visibility, with reviewer/admin write access.';

-- Operational queue for initial reviews, re-reviews, and manual escalations.
create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'claimed', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority integer not null default 100,
  reason text,
  due_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.review_queue is
  'Review work queue. RLS should let reviewers see assigned/claimable work, owners see queue state for their products, and admins see all rows.';

-- Append-only audit trail for sensitive application and rule-management actions.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb not null default '{}'::jsonb,
  after_data jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit trail. RLS should deny direct client inserts and expose reads only to admins or narrowly scoped support workflows.';

create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  document_type text not null
    check (document_type in ('label', 'pif', 'coa', 'invoice', 'packing_list', 'certificate', 'shipment', 'other')),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'accepted', 'needs_revision', 'archived')),
  file_name text,
  storage_path text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_documents is
  'Documents attached to a product, review, expert match, or shipment workflow.';

create table if not exists public.expert_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  company_name text,
  regions jsonb not null default '["TW"]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  languages jsonb not null default '["ko", "zh-Hant", "en"]'::jsonb,
  hourly_rate numeric(12,2),
  currency text not null default 'USD',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expert_profiles is
  'Regulatory experts available for paid review, label correction, and market-entry consultation.';

create table if not exists public.expert_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  expert_profile_id uuid references public.expert_profiles (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null,
  service_type text not null default 'regulatory_review'
    check (service_type in ('regulatory_review', 'label_correction', 'document_pack', 'market_entry', 'other')),
  status text not null default 'requested'
    check (status in ('requested', 'matched', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded')),
  quoted_amount numeric(12,2),
  currency text not null default 'USD',
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expert_matches is
  'Paid expert matching workflow linked to an organization, product, review and chat thread.';

create table if not exists public.logistics_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries jsonb not null default '["KR", "TW"]'::jsonb,
  service_types jsonb not null default '[]'::jsonb,
  contact_email text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.logistics_companies is
  'Forwarders, customs brokers, carriers, warehouses, and cold-chain partners available for matching.';

create table if not exists public.shipment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  requested_by uuid references public.profiles (id) on delete set null,
  origin_country text not null default 'KR',
  destination_country text not null default 'TW',
  incoterms text,
  status text not null default 'draft'
    check (status in ('draft', 'requested', 'quoted', 'booked', 'cancelled')),
  cargo_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipment_requests is
  'Customer logistics request created after a product review or document readiness check.';

create table if not exists public.logistics_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  shipment_request_id uuid references public.shipment_requests (id) on delete cascade,
  logistics_company_id uuid references public.logistics_companies (id) on delete set null,
  status text not null default 'recommended'
    check (status in ('recommended', 'quoted', 'selected', 'rejected', 'expired')),
  quoted_amount numeric(12,2),
  currency text not null default 'USD',
  quote_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.logistics_matches is
  'Logistics partner recommendations, quotes, and assignment decisions for a shipment request.';

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  shipment_request_id uuid references public.shipment_requests (id) on delete set null,
  logistics_company_id uuid references public.logistics_companies (id) on delete set null,
  tracking_number text,
  status text not null default 'preparing'
    check (status in ('preparing', 'booked', 'in_transit', 'customs_hold', 'delivered', 'cancelled')),
  eta timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipments is
  'Booked shipment records linked to compliance reviews and logistics partners.';

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  shipment_id uuid references public.shipments (id) on delete cascade,
  event_type text not null
    check (event_type in ('created', 'document', 'pickup', 'departure', 'arrival', 'customs', 'exception', 'delivery', 'note')),
  status text,
  message text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.shipment_events is
  'Shipment tracking and document timeline events.';

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  review_id uuid references public.reviews (id) on delete set null,
  expert_match_id uuid references public.expert_matches (id) on delete set null,
  expert_profile_id uuid references public.expert_profiles (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'payment_required', 'active', 'closed', 'archived')),
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chat_threads is
  'Expert consultation threads linked to paid expert matching and product review work.';

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  sender_profile_id uuid references public.profiles (id) on delete set null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is
  'Messages and attachments exchanged in expert consultation threads.';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  expert_match_id uuid references public.expert_matches (id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled')),
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is
  'Payment records for expert sessions, logistics services, subscriptions, and invoices.';

-- Reusable crawled source registry for LLM/wiki/regulatory retrieval.
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

-- Updated-at triggers.
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists trg_organization_members_updated_at on public.organization_members;
create trigger trg_organization_members_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_organization_settings_updated_at on public.organization_settings;
create trigger trg_organization_settings_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_regulatory_sources_updated_at on public.regulatory_sources;
create trigger trg_regulatory_sources_updated_at
before update on public.regulatory_sources
for each row execute function public.set_updated_at();

drop trigger if exists trg_rules_updated_at on public.rules;
create trigger trg_rules_updated_at
before update on public.rules
for each row execute function public.set_updated_at();

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists trg_findings_updated_at on public.findings;
create trigger trg_findings_updated_at
before update on public.findings
for each row execute function public.set_updated_at();

drop trigger if exists trg_review_queue_updated_at on public.review_queue;
create trigger trg_review_queue_updated_at
before update on public.review_queue
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_documents_updated_at on public.product_documents;
create trigger trg_product_documents_updated_at
before update on public.product_documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_expert_profiles_updated_at on public.expert_profiles;
create trigger trg_expert_profiles_updated_at
before update on public.expert_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_expert_matches_updated_at on public.expert_matches;
create trigger trg_expert_matches_updated_at
before update on public.expert_matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_logistics_companies_updated_at on public.logistics_companies;
create trigger trg_logistics_companies_updated_at
before update on public.logistics_companies
for each row execute function public.set_updated_at();

drop trigger if exists trg_shipment_requests_updated_at on public.shipment_requests;
create trigger trg_shipment_requests_updated_at
before update on public.shipment_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_logistics_matches_updated_at on public.logistics_matches;
create trigger trg_logistics_matches_updated_at
before update on public.logistics_matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

drop trigger if exists trg_chat_threads_updated_at on public.chat_threads;
create trigger trg_chat_threads_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

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

-- Lookup and workflow indexes.
create index if not exists idx_organizations_owner_profile_id on public.organizations (owner_profile_id);
create index if not exists idx_organizations_status on public.organizations (status);
create index if not exists idx_organization_members_profile_id on public.organization_members (profile_id);
create index if not exists idx_organization_members_org_role on public.organization_members (organization_id, role, status);

create index if not exists idx_products_organization_id on public.products (organization_id);
create index if not exists idx_products_owner_id on public.products (owner_id);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_market_category on public.products (market, category);

create index if not exists idx_regulatory_sources_info_id on public.regulatory_sources (info_id);
create index if not exists idx_regulatory_sources_active on public.regulatory_sources (is_active);

create index if not exists idx_rules_source_id on public.rules (source_id);
create index if not exists idx_rules_category_status on public.rules (category, status);

create index if not exists idx_rule_versions_rule_current on public.rule_versions (rule_id, is_current);
create index if not exists idx_rule_versions_source_hash on public.rule_versions (source_hash);
create index if not exists idx_rule_versions_cas_numbers on public.rule_versions using gin (cas_numbers);
create index if not exists idx_rule_versions_ingredient_names on public.rule_versions using gin (ingredient_names);

create index if not exists idx_reviews_product_id on public.reviews (product_id);
create index if not exists idx_reviews_reviewer_id on public.reviews (reviewer_id);
create index if not exists idx_reviews_app_review_id
  on public.reviews ((source_version_summary->>'app_review_id'))
  where source_version_summary ? 'app_review_id';

create index if not exists idx_findings_product_id on public.findings (product_id);
create index if not exists idx_findings_review_id on public.findings (review_id);
create index if not exists idx_findings_rule_version_id on public.findings (rule_version_id);
create index if not exists idx_findings_severity_status on public.findings (severity, status);

create index if not exists idx_review_queue_status_priority on public.review_queue (status, priority desc, created_at asc);
create index if not exists idx_review_queue_assigned_to on public.review_queue (assigned_to);
create index if not exists idx_review_queue_product_id on public.review_queue (product_id);

create index if not exists idx_audit_logs_actor_profile_id on public.audit_logs (actor_profile_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_table, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

create index if not exists idx_product_documents_org_product on public.product_documents (organization_id, product_id);
create index if not exists idx_expert_profiles_status on public.expert_profiles (status);
create index if not exists idx_expert_matches_org_status on public.expert_matches (organization_id, status);
create index if not exists idx_logistics_companies_status on public.logistics_companies (status);
create index if not exists idx_shipment_requests_org_status on public.shipment_requests (organization_id, status);
create index if not exists idx_logistics_matches_org_status on public.logistics_matches (organization_id, status);
create index if not exists idx_shipments_org_status on public.shipments (organization_id, status);
create index if not exists idx_shipment_events_shipment_time on public.shipment_events (shipment_id, occurred_at desc);
create index if not exists idx_chat_threads_org_status on public.chat_threads (organization_id, status);
create index if not exists idx_chat_messages_thread_time on public.chat_messages (thread_id, created_at);
create index if not exists idx_payments_org_status on public.payments (organization_id, status);

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

-- RLS is enabled now so the database is deny-by-default until explicit policies are added.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_settings enable row level security;
alter table public.products enable row level security;
alter table public.regulatory_sources enable row level security;
alter table public.rules enable row level security;
alter table public.rule_versions enable row level security;
alter table public.reviews enable row level security;
alter table public.findings enable row level security;
alter table public.review_queue enable row level security;
alter table public.audit_logs enable row level security;
alter table public.product_documents enable row level security;
alter table public.expert_profiles enable row level security;
alter table public.expert_matches enable row level security;
alter table public.logistics_companies enable row level security;
alter table public.logistics_matches enable row level security;
alter table public.shipment_requests enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.payments enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_snapshots enable row level security;
alter table public.knowledge_terms enable row level security;
alter table public.term_aliases enable row level security;
alter table public.term_rule_links enable row level security;
alter table public.regulatory_update_candidates enable row level security;

-- Suggested policy shape for the app migration that follows:
--   profiles: users can select/update own row; admins can select/update all.
--   products: owners can CRUD own drafts/submissions; reviewers/admins can read assigned work.
--   reviews/findings/review_queue: owners can read product-linked rows; reviewers/admins can write workflow rows.
--   regulatory_sources/rules/rule_versions: authenticated app users can read active/current data; writes stay admin/service-role only.
--   audit_logs: clients do not insert directly; admin read only; writes through trusted server functions.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member')
$$;

create or replace function public.is_reviewer_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('reviewer', 'admin')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin'
$$;

create or replace function public.organization_member_role(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and profile_id = auth.uid()
    and status = 'active'
  order by case role
    when 'owner' then 1
    when 'admin' then 2
    when 'operator' then 3
    when 'reviewer' then 4
    when 'expert' then 5
    when 'logistics' then 6
    else 7
  end
  limit 1
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.organization_member_role(target_organization_id) is not null
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.organization_member_role(target_organization_id) in ('owner', 'admin')
$$;

create or replace function public.can_operate_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.organization_member_role(target_organization_id) in ('owner', 'admin', 'operator', 'reviewer')
$$;

create or replace function public.is_thread_participant(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads
    left join public.expert_profiles on expert_profiles.id = chat_threads.expert_profile_id
    where chat_threads.id = target_thread_id
      and (
        public.is_organization_member(chat_threads.organization_id)
        or expert_profiles.profile_id = auth.uid()
      )
  )
$$;

-- Profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Organization tenancy
drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select"
on public.organizations for select
to authenticated
using (public.is_organization_member(id));

drop policy if exists "organizations_owner_insert" on public.organizations;
create policy "organizations_owner_insert"
on public.organizations for insert
to authenticated
with check (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists "organizations_manager_update" on public.organizations;
create policy "organizations_manager_update"
on public.organizations for update
to authenticated
using (public.can_manage_organization(id))
with check (public.can_manage_organization(id));

drop policy if exists "organization_members_member_select" on public.organization_members;
create policy "organization_members_member_select"
on public.organization_members for select
to authenticated
using (profile_id = auth.uid() or public.can_manage_organization(organization_id));

drop policy if exists "organization_members_manager_insert" on public.organization_members;
create policy "organization_members_manager_insert"
on public.organization_members for insert
to authenticated
with check (
  public.can_manage_organization(organization_id)
  or (
    profile_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.organizations
      where organizations.id = organization_members.organization_id
        and organizations.owner_profile_id = auth.uid()
    )
  )
);

drop policy if exists "organization_members_manager_update" on public.organization_members;
create policy "organization_members_manager_update"
on public.organization_members for update
to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists "organization_settings_member_select" on public.organization_settings;
create policy "organization_settings_member_select"
on public.organization_settings for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "organization_settings_manager_write" on public.organization_settings;
create policy "organization_settings_manager_write"
on public.organization_settings for all
to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

-- Products
drop policy if exists "products_owner_or_reviewer_select" on public.products;
create policy "products_owner_or_reviewer_select"
on public.products for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_reviewer_or_admin()
  or public.is_organization_member(organization_id)
);

drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert"
on public.products for insert
to authenticated
with check (
  public.is_reviewer_or_admin()
  or (
    owner_id = auth.uid()
    and (organization_id is null or public.is_organization_member(organization_id))
  )
);

drop policy if exists "products_owner_or_reviewer_update" on public.products;
create policy "products_owner_or_reviewer_update"
on public.products for update
to authenticated
using (
  owner_id = auth.uid()
  or public.is_reviewer_or_admin()
  or public.can_operate_organization(organization_id)
)
with check (
  owner_id = auth.uid()
  or public.is_reviewer_or_admin()
  or public.can_operate_organization(organization_id)
);

-- Official regulatory data: readable by signed-in users, writable only through service role/admin SQL.
drop policy if exists "regulatory_sources_authenticated_read" on public.regulatory_sources;
create policy "regulatory_sources_authenticated_read"
on public.regulatory_sources for select
to authenticated
using (is_active = true or public.is_reviewer_or_admin());

drop policy if exists "rules_authenticated_read" on public.rules;
create policy "rules_authenticated_read"
on public.rules for select
to authenticated
using (status = 'active' or public.is_reviewer_or_admin());

drop policy if exists "rule_versions_authenticated_read" on public.rule_versions;
create policy "rule_versions_authenticated_read"
on public.rule_versions for select
to authenticated
using (is_current = true or public.is_reviewer_or_admin());

-- Reviews and findings
drop policy if exists "reviews_owner_or_reviewer_select" on public.reviews;
create policy "reviews_owner_or_reviewer_select"
on public.reviews for select
to authenticated
using (
  public.is_reviewer_or_admin()
  or exists (
    select 1 from public.products
    where products.id = reviews.product_id
      and products.owner_id = auth.uid()
  )
);

drop policy if exists "reviews_reviewer_insert_update" on public.reviews;
create policy "reviews_reviewer_insert_update"
on public.reviews for all
to authenticated
using (public.is_reviewer_or_admin())
with check (public.is_reviewer_or_admin());

drop policy if exists "findings_owner_or_reviewer_select" on public.findings;
create policy "findings_owner_or_reviewer_select"
on public.findings for select
to authenticated
using (
  public.is_reviewer_or_admin()
  or exists (
    select 1 from public.products
    where products.id = findings.product_id
      and products.owner_id = auth.uid()
  )
);

drop policy if exists "findings_reviewer_insert_update" on public.findings;
create policy "findings_reviewer_insert_update"
on public.findings for all
to authenticated
using (public.is_reviewer_or_admin())
with check (public.is_reviewer_or_admin());

-- Review queue
drop policy if exists "review_queue_owner_or_reviewer_select" on public.review_queue;
create policy "review_queue_owner_or_reviewer_select"
on public.review_queue for select
to authenticated
using (
  public.is_reviewer_or_admin()
  or exists (
    select 1 from public.products
    where products.id = review_queue.product_id
      and products.owner_id = auth.uid()
  )
);

drop policy if exists "review_queue_reviewer_manage" on public.review_queue;
create policy "review_queue_reviewer_manage"
on public.review_queue for all
to authenticated
using (public.is_reviewer_or_admin())
with check (public.is_reviewer_or_admin());

-- Audit logs are admin-readable only. Inserts should use trusted server code.
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
on public.audit_logs for select
to authenticated
using (public.is_admin());

-- Product documents and platform workflows
drop policy if exists "product_documents_org_select" on public.product_documents;
create policy "product_documents_org_select"
on public.product_documents for select
to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists "product_documents_org_write" on public.product_documents;
create policy "product_documents_org_write"
on public.product_documents for all
to authenticated
using (public.can_operate_organization(organization_id))
with check (public.can_operate_organization(organization_id));

drop policy if exists "expert_profiles_read_active_or_own" on public.expert_profiles;
create policy "expert_profiles_read_active_or_own"
on public.expert_profiles for select
to authenticated
using (status = 'active' or profile_id = auth.uid() or public.is_admin());

drop policy if exists "expert_profiles_manage_own_or_admin" on public.expert_profiles;
create policy "expert_profiles_manage_own_or_admin"
on public.expert_profiles for all
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists "expert_matches_org_or_expert_select" on public.expert_matches;
create policy "expert_matches_org_or_expert_select"
on public.expert_matches for select
to authenticated
using (
  public.is_organization_member(organization_id)
  or exists (
    select 1 from public.expert_profiles
    where expert_profiles.id = expert_matches.expert_profile_id
      and expert_profiles.profile_id = auth.uid()
  )
);

drop policy if exists "expert_matches_org_write" on public.expert_matches;
create policy "expert_matches_org_write"
on public.expert_matches for all
to authenticated
using (public.can_operate_organization(organization_id) or public.is_admin())
with check (public.can_operate_organization(organization_id) or public.is_admin());

drop policy if exists "logistics_companies_read_active" on public.logistics_companies;
create policy "logistics_companies_read_active"
on public.logistics_companies for select
to authenticated
using (status = 'active' or public.is_admin());

drop policy if exists "logistics_companies_admin_write" on public.logistics_companies;
create policy "logistics_companies_admin_write"
on public.logistics_companies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "shipment_requests_org_access" on public.shipment_requests;
create policy "shipment_requests_org_access"
on public.shipment_requests for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.can_operate_organization(organization_id));

drop policy if exists "logistics_matches_org_access" on public.logistics_matches;
create policy "logistics_matches_org_access"
on public.logistics_matches for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.can_operate_organization(organization_id));

drop policy if exists "shipments_org_access" on public.shipments;
create policy "shipments_org_access"
on public.shipments for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.can_operate_organization(organization_id));

drop policy if exists "shipment_events_org_access" on public.shipment_events;
create policy "shipment_events_org_access"
on public.shipment_events for all
to authenticated
using (public.is_organization_member(organization_id))
with check (public.can_operate_organization(organization_id));

drop policy if exists "chat_threads_participant_access" on public.chat_threads;
create policy "chat_threads_participant_access"
on public.chat_threads for all
to authenticated
using (
  public.is_organization_member(organization_id)
  or exists (
    select 1 from public.expert_profiles
    where expert_profiles.id = chat_threads.expert_profile_id
      and expert_profiles.profile_id = auth.uid()
  )
)
with check (
  public.can_operate_organization(organization_id)
  or exists (
    select 1 from public.expert_profiles
    where expert_profiles.id = chat_threads.expert_profile_id
      and expert_profiles.profile_id = auth.uid()
  )
);

drop policy if exists "chat_messages_thread_participant_access" on public.chat_messages;
create policy "chat_messages_thread_participant_access"
on public.chat_messages for all
to authenticated
using (public.is_thread_participant(thread_id))
with check (public.is_thread_participant(thread_id));

drop policy if exists "payments_org_or_admin_select" on public.payments;
create policy "payments_org_or_admin_select"
on public.payments for select
to authenticated
using (public.can_manage_organization(organization_id) or public.is_admin());

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write"
on public.payments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Knowledge registry is readable to signed-in users; writes stay in crawler/admin channels.
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
