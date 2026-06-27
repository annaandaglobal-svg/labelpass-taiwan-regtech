-- LabelPass platform operations layer.
-- Adds multi-tenant organization data plus the first expert, logistics, shipment, and chat records.

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

alter table public.products
  add column if not exists organization_id uuid references public.organizations (id) on delete set null;

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

create index if not exists idx_organizations_owner_profile_id on public.organizations (owner_profile_id);
create index if not exists idx_organizations_status on public.organizations (status);
create index if not exists idx_organization_members_profile_id on public.organization_members (profile_id);
create index if not exists idx_organization_members_org_role on public.organization_members (organization_id, role, status);
create index if not exists idx_products_organization_id on public.products (organization_id);
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

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_settings enable row level security;
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

-- Organization tenancy policies.
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

-- Update product tenancy policies to include organization-scoped access.
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

-- Platform workflow policies.
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
