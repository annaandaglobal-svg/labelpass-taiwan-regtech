# LabelPass Platform Roadmap

LabelPass should grow from a Taiwan-first labeling reviewer into an operating platform for import/export compliance, expert services, logistics matching, shipment execution, and tracking. The current review engine and reusable knowledge base remain the core; the next layer should organize people, companies, products, reviews, experts, logistics partners, and shipments around that core.

## Product Direction

- Keep Taiwan cosmetics and Taiwan food labeling as the first regulated workflows.
- Add a multi-tenant workspace so each company can manage users, products, documents, reviews, and settings.
- Add an operator admin console for support, quality control, data correction, source review, and manual case routing.
- Add paid expert matching for regulatory review, label correction, document preparation, and market-entry questions.
- Add logistics partner matching for import/export execution after label, document, and customs readiness checks.
- Add shipment tracking so compliance review results remain attached to the actual shipment lifecycle.

## Suggested Routes

- `/workspace`: customer work hub for products, reviews, documents, shipments, and expert conversations.
- `/admin`: internal operations dashboard.
- `/admin/companies`: company and tenant management.
- `/admin/users`: user, role, and invitation management.
- `/admin/reviews`: review queue, escalation, quality control, and manual assignments.
- `/experts`: expert marketplace and profiles.
- `/matches`: expert and logistics matching status.
- `/chats/[threadId]`: paid expert conversations tied to review cases.
- `/logistics`: logistics partner discovery and quote requests.
- `/shipments`: shipment requests, active shipments, and compliance-linked tracking.
- `/tracking/[shipmentId]`: shipment event timeline and document status.
- `/billing`: subscriptions, invoices, payments, and expert-session charges.
- `/settings`: organization settings, notifications, source-update preferences, and archive policies.

## Supabase Entities

The existing schema already has a useful base: `profiles`, `products`, `reviews`, `findings`, `review_queue`, `audit_logs`, `regulatory_sources`, `rules`, `rule_versions`, knowledge tables, and regulatory update candidates.

Add these entities in phases:

- `organizations`: customer company tenants.
- `organization_members`: user membership, role, invitation, and status.
- `organization_settings`: company-level locale, market, notification, archive, and compliance settings.
- `product_documents`: labels, PIF files, invoices, packing lists, certificates, and shipment documents.
- `expert_profiles`: expert region, category, language, license, price, and availability.
- `expert_matches`: review-to-expert matching, assignment, status, SLA, and result summary.
- `chat_threads`: paid conversation containers linked to organizations, products, reviews, and expert matches.
- `chat_messages`: messages, attachments, system events, payment gates, and moderation status.
- `logistics_companies`: forwarders, customs brokers, carriers, cold-chain partners, and warehouses.
- `logistics_matches`: logistics recommendations, quotes, assignments, and rejection reasons.
- `shipment_requests`: customer request before a logistics partner accepts the job.
- `shipments`: active shipment records with Incoterms, route, carrier, documents, and customs state.
- `shipment_events`: tracking milestones, document events, customs events, and exception notes.
- `subscriptions`, `invoices`, `payments`: platform billing and paid expert/logistics service charges.
- `notification_preferences`: user and organization alert settings.

All new tables should follow Supabase row-level security by organization membership. Internal admin overrides must write `audit_logs` entries.

## High-Risk Flows

- Organization creation, invitation, and role changes can expose or hide customer data if RLS is wrong.
- Paid expert chat needs clear states for pre-payment, active session, completion, cancellation, refund, and archived advice.
- Logistics matching needs separation between recommendation, quote, booking, shipment, and tracking.
- Manual admin edits must be auditable; source-backed regulatory findings should not be silently overwritten.
- Browser-local review history needs a deliberate migration path into multi-user Supabase records.
- Expert and logistics partner records must separate public marketplace data from private contract, payout, and performance data.

## Smallest Next Slice

Build the platform shell before building the marketplace:

1. Add `organizations`, `organization_members`, and `organization_settings`.
2. Link future `products` and `reviews` to `organization_id`.
3. Add `/admin` with overview cards for companies, users, reviews, source updates, and failed jobs.
4. Add `/admin/companies`, `/admin/users`, and `/admin/reviews` as read-first screens.
5. Add audit logging for admin review status changes.

This slice creates the base needed for expert matching, paid chat, logistics matching, and shipment tracking without forcing those larger workflows into the first admin release.
