-- Speeds review archive idempotency checks for app-created review records.
create index if not exists idx_reviews_app_review_id
  on public.reviews ((source_version_summary->>'app_review_id'))
  where source_version_summary ? 'app_review_id';
