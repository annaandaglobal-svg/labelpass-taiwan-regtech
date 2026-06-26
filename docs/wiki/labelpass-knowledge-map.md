# LabelPass Knowledge Map

LabelPass knowledge is managed as a reusable regulatory memory, not as one-off web search.

## Storage Layers

1. Source registry
   - File: `data/knowledge/source-registry.json`
   - Purpose: canonical list of official and high-trust sources, refresh cadence, tags, and jurisdiction.

2. Raw cache
   - Folder: `data/knowledge/raw/`
   - Purpose: cached original pages or binary documents.
   - Git: ignored, because these files can be large and are reproducible.

3. Markdown knowledge documents
   - Folder: `data/knowledge/documents/`
   - Purpose: Obsidian/LLM friendly source extracts with metadata and content hash.

4. Browser captures
   - Folder: `data/knowledge/browser-captures/`
   - Purpose: saved text and screenshots for official pages that block automated fetches or require manual verification.

5. Structured source index
   - File: `data/knowledge/index.json`
   - Purpose: crawl status, hashes, source freshness, failures, and generated document paths.

6. Term index
   - Files: `data/knowledge/term-registry.json`, `data/knowledge/term-index.json`
   - Purpose: multilingual ingredient aliases, identifiers, and links to official TFDA rule codes.

7. Reusable knowledge memory
   - Files: `data/knowledge/knowledge-memory.json`, `docs/wiki/knowledge-memory.md`
   - Purpose: generated LLM/Obsidian working map that folds coverage groups, selected source cards, selected term cards, alias ambiguity, refresh queues, and retrieval playbooks into a stable reusable layer.

8. Product routing and evidence templates
   - Files: `data/knowledge/product-routing-matrix.json`, `data/knowledge/evidence-bundle-templates.json`, `docs/wiki/product-routing-matrix.md`, `docs/wiki/evidence-bundles/`
   - Purpose: generated workflow layer that maps searches and product reviews to Taiwan cosmetic, food label, food additive, food import, health food, food-contact packaging, customs/origin, and SHTC/trade-control routes.

9. Supabase evidence tables
   - Tables: `regulatory_sources`, `rules`, `rule_versions`, `knowledge_sources`, `knowledge_snapshots`, `knowledge_terms`, `term_aliases`, `term_rule_links`
   - Purpose: app runtime explainability, official rule lookups, reusable knowledge retrieval, and search normalization.

## Source Families

- Taiwan general labeling: Commodity Labeling Act, customs origin notices, MOEA trade notices.
- Taiwan cosmetics: Cosmetic Hygiene and Safety Act, cosmetic claim criteria, TFDA ingredient datasets, PIF notices, PIF guidance, and cosmetics safety requirements.
- Taiwan food and product labeling: TFDA food/nutrition labeling, BSMI commodity inspection, inspection marks, and origin rules.
- Taiwan food ingredient/additive lookup: TFDA Food Ingredient Integration Query Platform, food-additive permit query, food-additive standards, common-name tables, registration materials, and registration announcements.
- Taiwan trade/export control: International Trade Administration import/export regulations, SHTC regulations, and dual-use list notices.
- Global terminology: WTO TBT, WCO Harmonized System, UNECE GHS, Codex food labeling, INCI, CAS, and Wassenaar.
- Comparison markets: EU, United States, Japan, Korea, China, and ASEAN source families for terminology and regulatory alignment.

## Refresh Policy

- TFDA ingredient open data: refresh when the ruleset needs release or scheduled weekly crawler detects changes.
- TFDA dynamic food ingredient and additive permit query pages: refresh every 7-14 days, and keep slim markdown summaries plus raw/browser captures where automated extraction is noisy.
- Taiwan law pages: refresh monthly or before production rule release.
- Customs/trade notices: refresh weekly for origin and export/import operational changes.
- Global terminology references: refresh quarterly unless a source announces a major update.

## Retrieval Policy

- Use official Taiwan sources first.
- Use global terminology sources to normalize words such as technical regulation, standard, HS code, INCI, CAS, and conformity assessment.
- Use curated term aliases to normalize ingredients across INCI, CAS RN, English, Korean, Traditional Chinese, Simplified Chinese, and Japanese.
- Use `docs/wiki/knowledge-memory.md` for fast operator/agent orientation before searching individual extracts.
- Use `docs/wiki/product-routing-matrix.md` and `docs/wiki/evidence-bundles/` to decide which workflow, required inputs, citation slots, and stop conditions apply before drafting a final answer.
- Use secondary government guides only as navigation aids; never let them override primary Taiwan law or TFDA/MOEA/Customs notices.
- Store every automated answer with source URL, source hash, generated timestamp, and rule version.
