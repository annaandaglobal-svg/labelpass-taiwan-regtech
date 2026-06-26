# LabelPass Regulatory Sources

Last verified: 2026-06-26

This document records the official Taiwan TFDA and data.gov.tw sources that LabelPass should treat as the canonical basis for Taiwan cosmetics screening. It is a product and engineering reference, not legal advice.

## Source Hierarchy

1. Binding law and official notices from Taiwan authorities.
2. Official TFDA datasets published through data.gov.tw and `data.fda.gov.tw`.
3. Internal LabelPass normalized rules derived from those sources.

Third-party summaries should not be used as rule authority. They may be used only to discover official links, and the official source must then be verified directly.

## Official Ingredient Datasets

| Rule family | Official data.gov.tw source | TFDA InfoId | JSON export used by tooling | LabelPass use |
| --- | --- | --- | --- | --- |
| Prohibited ingredients | [Cosmetics prohibited ingredients](https://data.gov.tw/dataset/173684) | 203 | `https://data.fda.gov.tw/data/opendata/export/203/json` | Hard-block rules. A confident ingredient/CAS match should produce a failing finding unless the source text defines a narrow exception. |
| Restricted ingredients | [Cosmetics restricted ingredients](https://data.gov.tw/dataset/173685) | 199 | `https://data.fda.gov.tw/data/opendata/export/199/json` | Concentration, product-scope, labeling, and use-condition rules. |
| Colorants | [Cosmetics colorants](https://data.gov.tw/dataset/173686) | 200 | `https://data.fda.gov.tw/data/opendata/export/200/json` | Colorant category rules, including eye-area, mucous-membrane, and rinse-off restrictions. |
| Preservatives | [Cosmetics preservatives](https://data.gov.tw/dataset/173682) | 201 | `https://data.fda.gov.tw/data/opendata/export/201/json` | Preservative-specific allow/limit rules such as Triclosan, MIT, Chlorphenesin, and Phenoxyethanol. |
| Sunscreens | [Cosmetics sunscreen ingredients](https://data.gov.tw/dataset/173683) | 202 | `https://data.fda.gov.tw/data/opendata/export/202/json` | Sunscreen active checks and SPF/PIF evidence prompts. |

### Expected Normalized Fields

The raw datasets use Traditional Chinese field names. LabelPass should preserve each raw JSON record exactly, then normalize into typed rule fields so the app does not depend on localized column names.

| Dataset | Normalized fields |
| --- | --- |
| InfoId 203 | `source_record_id`, `ingredient_name`, `cas_numbers`, `notes` |
| InfoId 199 | `source_record_id`, `ingredient_name`, `inci_names`, `cas_numbers`, `product_scope`, `limit_text`, `restriction_text`, `caution_text` |
| InfoId 200 | `source_record_id`, `color_index_numbers`, `ingredient_name`, `product_scope`, `restriction_text`, `notes` |
| InfoId 201 | `source_record_id`, `ingredient_name`, `inci_names`, `cas_numbers`, `product_scope`, `limit_text`, `restriction_text`, `caution_text` |
| InfoId 202 | `source_record_id`, `ingredient_name`, `inci_names`, `cas_numbers`, `product_scope`, `limit_text`, `restriction_text`, `caution_text` |

## Law And Implementation Notices

| Topic | Official source | Key points for LabelPass |
| --- | --- | --- |
| Cosmetic Hygiene and Safety Act | [MOJ Laws and Regulations Database](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030013); [TFDA English law page](https://www.fda.gov.tw/ENG/lawContent.aspx?cid=5062&id=600) | Article 6 provides the basis for prohibited and restricted ingredient announcements. Article 7 defines core labeling items. Article 10 controls deceptive, exaggerated, and medical efficacy claims. |
| Cosmetic claim criteria | [Regulations Governing Criteria for the Label, Promotion, Advertisement with Deception, Exaggeration, or Medical efficacy of Cosmetic Products](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030099) | Determines false/exaggerated and medical-efficacy cosmetic claims by overall presentation. Flags claims with no or insufficient evidence, non-factual wording, scope/category mismatch, physiological-function wording, disease treatment, or drug/medical-equipment-like efficacy. |
| Cosmetic product notification | [Regulations Governing Notification of Cosmetic Products](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030097) | Requires platform notification by manufacturers/importers and records product names, category, usage, manufacturer/importer details, full components, restricted-component content, and notification validity. |
| Cosmetic PIF management | [Regulations for Cosmetic Product Information File Management](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030098) | Defines the 16-file PIF evidence set, including full ingredient names/content, labels or leaflets, GMP evidence, stability/microbiology reports, functional support, and safety evaluation signatory requirements. |
| PIF phased implementation | [TFDA PIF phased implementation notice](https://www.fda.gov.tw/TC/siteListContent.aspx?id=46948&sid=1894) | PIF applies in phases: 2024-07-01 for specific-purpose categories; 2025-07-01 for baby, lip, eye, non-medicated toothpaste, and mouthwash cosmetics; 2026-07-01 for other cosmetics except handmade solid soaps from manufacturing places exempt from factory registration. |
| PIF guidance hub | [TFDA PIF regulations and guidance page](https://www.fda.gov.tw/TC/siteContent.aspx?sid=12524) | Official index for PIF management rules, guidance, checklists, and examples. |
| English PIF summary | [TFDA English news: PIFs to be implemented in phases](https://www.fda.gov.tw/eng/newsContent.aspx?id=31164) | Useful English confirmation of phased dates and the 16-item PIF expectation, while the Chinese notice remains the primary implementation source. |

## Taiwan Food Labeling Sources

| Topic | Official source | Key points for LabelPass |
| --- | --- | --- |
| Food safety and sanitation law | [Act Governing Food Safety and Sanitation](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040001) | Defines foods, food additives, labels, nutrition labels, food business operators, import/export scope, and the general basis for food labeling and advertising controls. |
| Nutrition labeling | [Regulations on Nutrition Labeling for Prepackaged Food Products](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1633) | Core nutrition label structure, serving basis, daily reference values, nutrient declaration, tolerances, and label character-size constraints. |
| Nutrition claims | [Revised Regulations on Nutrition Claim for Prepackaged Food Products](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3522) | Nutrition claim review source for on-pack claims that go beyond basic nutrition facts. |
| Food claim criteria | [Regulations Governing Criteria for the Label, Promotion and Advertisement of Foods and Food Products Identified as False, Exaggerated, Misleading or Having Medical Efficacy](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3424) | Article 28 claim criteria. Flags medical-efficacy expressions, no or insufficient evidence, physiological-function wording, and misleading use of health-related product names without a health-food permit. |
| Sweetness claims | [Regulation for the Labeling of Slightly Sweet, Not Sweet or other Sweetness Claim on Prepackaged Food](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3416) | Specific Taiwan rule for sweetness wording that may mislead consumers about sugar content unless aligned with nutrition claim criteria. |
| Nutrition label exemptions | [Regulations on Prepackaged Food Products Exempted from the Nutrition Labeling](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3393) | Exception source for products such as plain water, uncombined tea/coffee/herbs, spices, and non-consumer raw materials. |
| Allergen labeling | [Regulation of Food Allergen Labeling](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f636826556478322315) | Prepackaged foods must warn for specified allergen categories, including crustacea, mango, peanut, milk, egg, nuts, sesame, gluten cereals, soybean, fish, and sulphites above the stated threshold. |
| Recommended allergen labeling | [Regulations Governing Food Allergen Labeling on the Recommended Labeling Allergens](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3407) | Advisory source for cephalopods, spiral shells, seeds, kiwi, and cross-contamination precaution language. |
| Food additive standards | [Standards for Specification, Scope, Application and Limitation of Food Additives](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=308) | Legal backbone for permitted food additive scope, application, and limitations. |
| Food additive common names | [Common Names of Food Additives](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f637862488954749366) and [TFDA HTML table](https://www.fda.gov.tw/TC/siteContent.aspx?sid=10159) | Alias source for additive names such as MSG, benzoates, sorbates, baking soda, glycine, amino acids, gums, and vitamins. The PDF is paired with the HTML table for evidence-grade extraction. |
| Food additive permit query | [Food Additive Permit Data Query](https://consumer.fda.gov.tw/Food/InfoFoodAdd.aspx?nodeID=162) | Direct TFDA query surface for food-additive permits, registration numbers, license numbers, and product-level permit checks. |
| Food ingredient direct query | [Food Ingredient Integration Query Platform](https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160) | Direct TFDA ingredient lookup for Chinese, English, or scientific names, with safety status, permitted product types, usage limits, and cautionary notes. |
| Food business query links | [TFDA food business information query links](https://www.fda.gov.tw/tc/sitelist.aspx?sid=51) | Index hub for ingredient, permit, registration, and food-business query systems that should be used as crawl seeds for volatile lookup pages. |
| Front-of-package nutrition | [Guidelines for Front of Package Nutrition Labeling of Food Products](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f637862485315287265) | Voluntary FoP nutrition guidance for packaged foods, including calories, saturated fat, sugar, sodium, optional nutrients, serving basis, and display principles. |
| Fish species product names | [Labeling Requirements on Food Products that Use Specific Fish Species as Product Names](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3414) | Product-name normalization source for foods sold under specific fish species names. |
| Small prepackaged foods | [Regulations Governing the Labeling of Small Prepackaged Food](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3408) | Small-package exceptions and alternative QR-code/electronic disclosure paths for constrained package surfaces. |
| Bulk foods | [Regulations on Bulk Food Labeling](https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3398) | Labeling requirements for bulk foods where ordinary prepackaged labeling may not apply. |

## Taiwan Food Import And Operational Sources

| Topic | Official source | Key points for LabelPass |
| --- | --- | --- |
| Imported food inspection | [Regulations of Inspection of Imported Foods and Related Products](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040017) | Primary source for border inspection, inspection application timing, applicants, document review, batch grouping, sampling, and inspection outcomes. |
| Food import inspection exemptions | [TFDA food import inspection exemption notices](https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3371) | Routes low-risk, personal-use, sample, and special-purpose imports where inspection application may be exempted or handled by specific customs codes. |
| Systematic imported food inspection | [Regulations for Systematic Inspection of Imported Food](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1607) | Evidence source for exporting-country food safety system review, document review, and on-site inspection. |
| Food business importer registration | [Food business registration for import business operators](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1681) | Importers may need registration, product category details, insurance evidence, storage/repackaging activity information, and traceability records. |
| HS 0307 shellfish certificate | [TFDA shellfish health certificate notice](https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3095) | Health certificate and harvest-area evidence source for shellfish imports under HS 0307. |
| Compound food additive import documents | [TFDA compound food additive import document notice](https://www.fda.gov.tw/tc/newsContent.aspx?cid=4&id=19405) | Links compound additive imports with product composition reports, official health certificates, free-sale evidence, and related import-document checks. |

## Taiwan Customs, Origin, And Import/Export Controls

| Topic | Official source | Key points for LabelPass |
| --- | --- | --- |
| Customs declaration | [Customs Act](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=G0350001) | Core basis for import/export declaration, invoice, packing list, permits, online/CPT single-window filings, correction evidence, and post-clearance audit. |
| HS/CCC classification | [GC453 Tariff Database Download](https://portal.sw.nat.gov.tw/APGQ/GC453), [Customs tariff system](https://web.customs.gov.tw/en/multiplehtml/3349), and [Import and Export Regulations by CCC Code](https://fbfh.trade.gov.tw/fh/indexE.jsp) | CCC code and tariff classification drive TFDA, customs, permit, duty, SHTC, and agency-routing checks. |
| Advance tariff classification ruling | [Customs advance tariff classification ruling](https://web.customs.gov.tw/ekeelung/singlehtml/e6735b1fe2114e34af5d13e170c74138) | Use when mixed composition, kits, claims, or use cases make a product's CCC code uncertain before import. |
| Origin marking and certificates | [Keelung Customs origin labeling notice](https://web.customs.gov.tw/ekeelung/singlehtml/1444?cntId=9d9cf376a43c481faef23b3f584f782c) and [origin labeling guidance for imported textiles](https://www.trade.gov.tw/english/Pages/Detail.aspx?nodeID=4655&pid=762248) | Search axis for made-in wording, country-of-origin marking, certificate-of-origin evidence, and misleading-origin risk. |
| Import/export administration | [Foreign Trade Act](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=J0090004), [Regulations Governing Import of Commodities](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=J0090007), and [Regulations Governing Registration of Exporters and Importers](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=J0090006) | Operator registration, import/export restrictions, permit routing, negative-list checks, and trade-order obligations. |
| Strategic high-tech commodities | [Regulations Governing the Export and Import of Strategic High-tech Commodities](https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=J0090013) and [MOEA SHTC export-control index](https://www.trade.gov.tw/english/Pages/List.aspx?nodeID=298) | SHTC export permits, dual-use screening, end-use/end-user evidence, import certificates, written assurances, delivery verification, and AI-hardware risk routing. |

## Operational Search Categories

| Term category | Use in LabelPass search and review |
| --- | --- |
| `cosmetic_compliance` | Cosmetic PIF, product notification, GMP, imported-cosmetics inspection, INCI naming, and cosmetic labeling/claims. |
| `food_labeling` | Nutrition labeling, allergen labeling, business-use food labeling, and label-specific food statements. |
| `food_import` | Imported-food inspection, exemptions, health certificates, product information sheets, importer registration, and compound additive import documents. |
| `food_safety` | Pesticide/veterinary-drug residues, contaminants, microbiology, traceability, and food GHP evidence. |
| `origin_marking` | Country-of-origin marking, made-in statements, and certificate-of-origin evidence. |
| `customs_classification` | HS/CCC code classification, tariff lookup, and advance classification ruling. |
| `customs_document` | Customs declarations, commercial invoices, packing lists, and single-window filing evidence. |
| `trade_document` | Incoterms and shipment-purpose terms that determine responsibility and document routing. |
| `trade_operator` | Taiwan importer, responsible firm, agent, consignee, and category-specific responsible business operator terms. |
| `import_export_control` | Foreign trade law, operator registration, permits, SHTC controls, import certificates, and end-use/end-user screening. |

## LabelPass Rule Modeling Notes

- `regulatory_sources` stores official source metadata: authority, title, URL, InfoId or notice number, verification date, and update cadence.
- `rules` stores normalized rule families such as `prohibited`, `restricted`, `colorant`, `preservative`, `sunscreen`, `labeling`, or `pif`.
- `rule_versions` stores source snapshots and normalized conditions. Every upstream dataset or notice change should create a new version rather than mutating past review evidence.
- `findings` should always point to the exact `rule_version_id` used during a review when a match is produced.
- PIF dates are product-category compliance gates. They are not ingredient bans.

## Ingestion And Review Rules

1. Preserve the official URL, InfoId or notice number, retrieval timestamp, and raw record for every ingested rule version.
2. Normalize ingredient names by exact source name, INCI name, CAS number, aliases, and Color Index number where available.
3. Do not collapse preservative, sunscreen, colorant, and general restricted-ingredient rules into a single limit without preserving the source category.
4. If a source row contains conditional scope text, keep the original Chinese text and add structured conditions only as a derived layer.
5. When a product fails, warns, or needs manual review, show the source title and the rule version date/snapshot used for that decision.
6. Official open datasets come before PDF crawling. PDF or HTML notices are crawled only when no structured official dataset exists for that rule family.
7. Publish regulatory data through `draft -> staging -> reviewed -> production`, with rollback to the previous production rule version.
