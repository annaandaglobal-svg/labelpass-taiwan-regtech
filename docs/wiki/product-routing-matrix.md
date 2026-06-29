# Product Routing Matrix

Generated from `data/knowledge/knowledge-memory.json`. Use this to route a product or shipment into the right Taiwan labeling/import review workflow before drafting an answer.

## Routes

| Route | Family | Sources | Terms | First action |
| --- | --- | ---: | ---: | --- |
| Taiwan cosmetic label, PIF and market access | cosmetic | 9 | 10 | Run the cosmetic review, then attach PIF/notification and ingredient evidence before expert approval. |
| Taiwan prepackaged food label, allergens, nutrition and claims | food | 9 | 10 | Run food label review and resolve allergen/nutrition/claim blockers before shipment release. |
| Taiwan food additive or ingredient permissibility | food_additive | 9 | 10 | Confirm additive/common-name status before treating the substance as allowed on a food label. |
| Taiwan food import inspection and customs packet | food_import | 9 | 10 | Route to food import inspection checklist before final label or logistics approval. |
| Taiwan health food permit, label and approved effect wording | health_food | 9 | 6 | Confirm permit scope before allowing any health-food wording or approved-effect claim. |
| Taiwan food-contact packaging and container labeling | food_contact | 9 | 10 | Classify food-contact status before applying ordinary food label or customs routing. |
| Taiwan customs, HS/CCC, origin and trade label routing | customs_trade | 9 | 10 | Resolve HS/CCC and origin before final Taiwan label or import/export document release. |
| Taiwan SHTC and import/export control screening | trade_control | 9 | 10 | Escalate to trade-control review when CCC, destination, or technical specs match SHTC signals. |


## Taiwan cosmetic label, PIF and market access

- Route ID: `tw_cosmetic_label_pif`
- Product family: `cosmetic`
- Coverage group: `tw_cosmetics_labeling_market_access`
- Classification inputs: product name; cosmetic category; leave-on/rinse-off/spray; specific-purpose function; ingredient list; Taiwan label text
- Stop conditions: unknown product category; specific-purpose claim without registration context; unidentified ingredient over threshold; no Chinese label text
- Required documents: Taiwan Chinese label; ingredient composition; PIF or safety file; COA/specification; GMP/manufacturer document; importer/responsible firm data
- Evidence template IDs: `tw_cosmetic_label_pif_evidence_bundle`
- Source IDs: `tw-moj-cosmetic-hygiene-safety-act`, `tw-moj-cosmetic-product-notification`, `tw-tfda-cosmetic-adverse-event-qms-platform`, `tw-tfda-cosmetic-announcements`, `tw-tfda-cosmetic-fadenbook-platform`, `tw-tfda-cosmetic-label-leaflet-packaging-marking`, `tw-tfda-cosmetic-pif-category-implementation-2024`, `tw-tfda-cosmetic-product-registration-categories-2024`, `tw-tfda-cosmetic-product-registration-system`
- Term IDs: `cosmetic-product-information-file`, `cosmetic-labeling-claims`, `cosmetic-pif-product-registration-categories`, `cosmetic-product-notification`, `cosmetic-label-required-items`, `cosmetic-spray-aerosol-safety`, `specific-purpose-cosmetics-transition`, `cosmetic-claims-criteria`, `benzalkonium-chloride-family`, `centella-asiatica-cosmetic-ingredient`

### Entry Questions

- Is the product a general cosmetic, specific-purpose cosmetic, spray/aerosol, or borderline product?
- Is there a Taiwan product registration or PIF implementation obligation for this product category and date?
- Are the ingredient names mapped to INCI, CAS, local Traditional Chinese terms, or TFDA restricted/prohibited lists?
- Does the label or marketing copy imply medical efficacy, deception, exaggeration, or unsupported effect claims?

### Checks

- Label: Chinese product name; full ingredients; purpose/use; manufacturer/importer; origin; batch/expiry; warnings and small-package rules
- Ingredient: INCI/CAS normalization; prohibited ingredients; restricted ingredients; preservatives; colorants; sunscreens; spray/aerosol safety
- Claim: medical efficacy; false/exaggerated claims; substantiation evidence; specific-purpose transition wording
- Import/customs: product notification; PIF file readiness; GMP/manufacturer evidence; responsible firm/importer consistency

## Taiwan prepackaged food label, allergens, nutrition and claims

- Route ID: `tw_food_label_allergen`
- Product family: `food`
- Coverage group: `tw_food_labeling_allergen`
- Classification inputs: food category; ingredient statement; allergen sources; nutrition facts; claim wording; package size
- Stop conditions: allergen source unknown; nutrition claim without analysis; health effect wording without permit context; missing importer/responsible firm
- Required documents: finished label; ingredient specification; allergen statement; nutrition analysis; claim substantiation; importer data
- Evidence template IDs: `tw_food_label_allergen_evidence_bundle`
- Source IDs: `tw-moj-food-safety-sanitation-act`, `tw-tfda-food-allergen-labeling`, `tw-tfda-food-allergen-labeling-consumer-notice`, `tw-tfda-food-false-exaggerated-medical-efficacy-claims`, `tw-tfda-food-labeling-handbook-2026`, `tw-tfda-food-law-regulations-index`, `tw-tfda-food-nutrition-labeling`, `tw-tfda-illegal-advertising-query`, `tw-tfda-food-allergen-labeling-en`
- Term IDs: `food-labeling-claims`, `food-allergen-labeling`, `food-label-required-items`, `nutrition-labeling`, `sulfites-allergen`, `crustacea-allergen`, `fish-allergen`, `mango-allergen`, `tree-nuts-allergen`, `potassium-glycerophosphate-food-additive`

### Entry Questions

- Is the product prepackaged food, bulk food, additive, health food, special dietary food, or food-contact packaging?
- Which allergen families are present directly or through compound ingredients?
- Does the package require nutrition labeling or qualify for a small-package rule?
- Do nutrition, sweetness, disease, or functional claims exceed allowed wording?

### Checks

- Label: product name; ingredients; net content; manufacturer/importer; origin; expiry; nutrition labeling; allergen warning
- Ingredient: allergen mapping; compound ingredient disclosure; additive names; residue/contaminant context if relevant
- Claim: nutrition claims; sweetness claims; disease/medical efficacy; health-food wording
- Import/customs: food business operator registration; product liability insurance; import inspection routing if shipped to Taiwan

## Taiwan food additive or ingredient permissibility

- Route ID: `tw_food_additive_ingredient`
- Product family: `food_additive`
- Coverage group: `tw_food_labeling_allergen`
- Classification inputs: substance/common name; CAS or local name; functional class; use level; food category; compound additive status
- Stop conditions: common name not matched; food category not provided; use level missing; compound additive status unclear
- Required documents: specification; COA; common-name evidence; permit or registration data; formula/use-level statement; supplier declaration
- Evidence template IDs: `tw_food_additive_ingredient_evidence_bundle`
- Source IDs: `tw-tfda-food-ingredient-query-platform-direct`, `tw-tfda-food-business-info-query-links`, `tw-tfda-food-false-exaggerated-medical-efficacy-claims`, `tw-tfda-food-law-regulations-index`, `tw-tfda-food-nutrition-labeling`, `tw-tfda-food-allergen-labeling-en`, `tw-moj-food-safety-sanitation-act`, `tw-tfda-food-allergen-labeling`, `tw-tfda-food-allergen-labeling-consumer-notice`
- Term IDs: `food-labeling-claims`, `food-allergen-labeling`, `food-label-required-items`, `nutrition-labeling`, `potassium-glycerophosphate-food-additive`, `steviol-glycosides-food-additive`, `food-additive-functional-classes`, `benzoates-food-additives`, `sorbates-food-additives`, `calcium-lime-food-additives`

### Entry Questions

- Is the material a food ingredient, single food additive, compound food additive, flavor, or processing aid?
- Is the Taiwan common name or permit number available?
- What is the food category and proposed use level?
- Does the ingredient need registration material or import documents?

### Checks

- Label: additive common name; functional class if required; compound additive disclosure; permit/registration number when applicable
- Ingredient: common-name matching; functional-class matching; use limit; food category scope; compound additive registration
- Claim: no unauthorized health or disease effect from ingredient function
- Import/customs: registration materials; official hygiene certificate where required; product information sheet; import inspection application

## Taiwan food import inspection and customs packet

- Route ID: `tw_food_import_inspection`
- Product family: `food_import`
- Coverage group: `tw_food_import_routing`
- Classification inputs: HS/CCC code; food category; origin; importer; shipment purpose; invoice value; documents
- Stop conditions: HS/CCC uncertain; origin/shipper inconsistency; health certificate missing for high-risk category; commercial shipment without importer registration
- Required documents: invoice; packing list; product information sheet; import declaration; health certificate if required; origin evidence; importer registration
- Evidence template IDs: `tw_food_import_inspection_evidence_bundle`
- Source IDs: `tw-customs-tariff-database-download`, `tw-tfda-import-regulation-508-food-additive-commodity-list-2026`, `tw-tfda-import-regulation-f01-f02-commodity-table-2026`, `tw-tfda-imported-food-inspection-forms`, `tw-tfda-imported-food-inspection-regulations`, `tw-tfda-inspections-law-regulations-index`, `tw-tfda-systematic-inspection-imported-food`, `tw-customs-export-origin-packaging`, `tw-tfda-food-business-registration-importers`
- Term IDs: `imported-food-inspection`, `product-information-sheet`, `systematic-imported-food-inspection`, `imported-food-inspection-forms`, `import-regulation-f01-f02-508`, `food-business-registration-importer`, `hs-code-classification`, `import-export-permit`, `customs-declaration`, `advance-tariff-classification-ruling`

### Entry Questions

- Is this commercial import, sample, testing, personal use, return, repair, or exhibition shipment?
- Which HS/CCC code and TFDA import regulation code applies?
- Are product information sheet, import declaration, invoice, and importer registration ready?
- Does the category need health certificate, systematic inspection, or origin-specific evidence?

### Checks

- Label: origin consistency; Chinese label availability; product name/category consistency; batch and expiry consistency
- Ingredient: restricted food category; residue/contaminant signal; additive and allergen cross-check when food is labeled
- Claim: claims aligned with product category and permit status
- Import/customs: import inspection application; product information sheet; import declaration; food business registration; product liability insurance; HS/CCC ruling; health certificate

## Taiwan health food permit, label and approved effect wording

- Route ID: `tw_health_food_claims`
- Product family: `health_food`
- Coverage group: `tw_health_food_claims`
- Classification inputs: permit status; permit number; approved effect; functional ingredient; label copy; dosage/use instructions
- Stop conditions: no permit number; effect wording outside approval; functional ingredient content missing; medical claim wording present
- Required documents: permit record; approved effect scope; functional ingredient report; safety/effect assessment; label and product description
- Evidence template IDs: `tw_health_food_claims_evidence_bundle`
- Source IDs: `tw-moj-health-food-governing-act`, `tw-tfda-health-food-application-permit-regulations`, `tw-tfda-health-food-enforcement-rules`, `tw-tfda-health-food-health-care-effect-items-2025`, `tw-tfda-health-food-labeling-regulations`, `tw-tfda-health-food-permit-query`, `tw-tfda-health-food-effect-assessment-methods-hub`, `tw-tfda-special-disease-food-permit-query`, `tw-tfda-novel-food-ingredient-safety-assessment-principles-2026`
- Term IDs: `health-food-permit`, `health-food`, `health-food-application-permit`, `health-food-approved-effect-vocabulary`, `health-food-label-required-items`, `novel-food-ingredient-safety-assessment`

### Entry Questions

- Is the product legally registered as Taiwan health food?
- Which permit number and approved health-care effect are claimed?
- Does label wording stay within approved effect vocabulary?
- Are intake instructions, warnings, nutrition components, logo, and legend present?

### Checks

- Label: permit number; standard logo; health-food legend; approved effect; intake method; warnings; nutrition/functional components
- Ingredient: functional ingredient identity; content amount; safety assessment context; new ingredient status
- Claim: approved effect only; no medical efficacy; no unapproved disease wording; advertising consistency
- Import/customs: permit holder/importer consistency; application or registration evidence; label version matching permit scope

## Taiwan food-contact packaging and container labeling

- Route ID: `tw_food_contact_packaging`
- Product family: `food_contact`
- Coverage group: `tw_food_import_routing`
- Classification inputs: material; food-contact intent; temperature/use condition; import purpose; label text; test report
- Stop conditions: food-contact intent unclear; material unknown; no use-condition evidence; test report missing for regulated material
- Required documents: material declaration; test report; label artwork; product information sheet; importer data
- Evidence template IDs: `tw_food_contact_packaging_evidence_bundle`
- Source IDs: `tw-tfda-import-regulation-f01-f02-commodity-table-2026`, `tw-tfda-food-business-registration-importers`, `tw-tfda-import-regulation-508-food-additive-commodity-list-2026`, `tw-tfda-imported-food-inspection-forms`, `tw-tfda-imported-food-inspection-regulations`, `tw-tfda-inspections-law-regulations-index`, `tw-tfda-systematic-inspection-imported-food`, `tw-tfda-imported-food-inspection-field-declaration-2024`, `tw-customs-export-origin-packaging`
- Term IDs: `import-regulation-f01-f02-508`, `food-business-registration-importer`, `imported-food-inspection-forms`, `imported-food-inspection`, `product-information-sheet`, `systematic-imported-food-inspection`, `food-labeling-claims`, `food-allergen-labeling`, `food-label-required-items`, `nutrition-labeling`

### Entry Questions

- Is the article intended for direct food contact?
- Which material and use temperature applies?
- Is it packaging/container/utensil or non-food-contact merchandise?
- Are sanitation standard evidence and required commodity labels available?

### Checks

- Label: material; use condition; food-contact wording; origin; responsible firm/importer; warnings
- Ingredient: material composition; restricted migration context; sanitation standard applicability
- Claim: avoid unsupported safety or health claims
- Import/customs: food-related product import inspection; BSMI/commodity-labeling signal; test report and product information sheet

## Taiwan customs, HS/CCC, origin and trade label routing

- Route ID: `tw_customs_origin_hs`
- Product family: `customs_trade`
- Coverage group: `tw_food_import_routing`
- Classification inputs: HS/CCC; origin; incoterms; invoice value; shipment purpose; importer/exporter; label origin
- Stop conditions: HS/CCC uncertain; origin mismatch; shipment purpose unknown; trade restriction signal unresolved
- Required documents: invoice; packing list; origin evidence; HS/CCC evidence; import/export permit if required; shipping terms
- Evidence template IDs: `tw_customs_origin_hs_evidence_bundle`
- Source IDs: `tw-customs-tariff-database-download`, `tw-customs-export-origin-packaging`, `tw-trade-import-regulation-code-instruction`, `tw-tfda-import-regulation-508-food-additive-commodity-list-2026`, `tw-tfda-import-regulation-f01-f02-commodity-table-2026`, `tw-tfda-imported-food-inspection-forms`, `tw-tfda-imported-food-inspection-regulations`, `tw-tfda-inspections-law-regulations-index`, `tw-tfda-systematic-inspection-imported-food`
- Term IDs: `imported-food-inspection`, `food-business-registration-importer`, `imported-food-inspection-forms`, `import-regulation-f01-f02-508`, `product-information-sheet`, `systematic-imported-food-inspection`, `hs-code-classification`, `import-export-permit`, `shipment-purpose`, `customs-declaration`

### Entry Questions

- Which HS/CCC code is declared and does an advance ruling exist?
- Does label origin match invoice, packing, and customs evidence?
- Is the shipment commercial, sample, repair/return, personal use, or exhibition?
- Are importer/exporter registration and trade-control checks needed?

### Checks

- Label: origin marking; responsible firm/importer; product name consistency; outer carton marking
- Ingredient: regulated product category signal by HS/CCC; food/cosmetic cross-route if product category triggers TFDA review
- Claim: origin or conformity claims must match documents
- Import/customs: customs valuation; advance tariff classification; cargo clearance; origin verification; import/export restrictions

## Taiwan SHTC and import/export control screening

- Route ID: `tw_trade_control_shtc`
- Product family: `trade_control`
- Coverage group: `tw_food_import_routing`
- Classification inputs: CCC code; technical specification; end use; destination; shipper/consignee; export/import permit status
- Stop conditions: end use unknown; CCC code missing; destination risk unresolved; permit applicability unknown
- Required documents: technical spec; CCC classification; end-use statement; permit evidence; invoice/packing list; shipper/consignee data
- Evidence template IDs: `tw_trade_control_shtc_evidence_bundle`
- Source IDs: `tw-customs-tariff-database-download`, `tw-trade-ccc-import-export-regulations`, `tw-customs-export-origin-packaging`, `tw-trade-import-regulation-code-instruction`, `tw-tfda-food-additive-permit-query`, `tw-tfda-import-regulation-508-food-additive-commodity-list-2026`, `tw-tfda-import-regulation-f01-f02-commodity-table-2026`, `tw-tfda-imported-food-inspection-forms`, `tw-tfda-imported-food-inspection-regulations`
- Term IDs: `shtc-export-permit`, `strategic-high-tech-commodities`, `import-export-permit`, `end-use-end-user`, `hs-code-classification`, `shipment-purpose`, `customs-declaration`, `exporter-importer-registration`, `taiwan-importer-responsible-firm`, `advance-tariff-classification-ruling`

### Entry Questions

- Does the CCC code, technical spec, destination, or end use trigger SHTC screening?
- Is this import or export and which permit path applies?
- Are consignee, end-user, and intended use documented?
- Does the product overlap food/cosmetic label review or pure trade-control review?

### Checks

- Label: controlled-use wording consistency; origin and responsible firm; technical product name
- Ingredient: chemical/material identity if control lists reference substance class
- Claim: avoid unsupported conformity/export-control statements
- Import/customs: SHTC permit; import/export restriction list; end-use statement; destination screening; CCC classification
