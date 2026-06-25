# LabelPass Regulatory Sources

Last verified: 2026-06-25

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
| Allergen labeling | [Regulation of Food Allergen Labeling](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f636826556478322315) | Prepackaged foods must warn for specified allergen categories, including crustacea, mango, peanut, milk, egg, nuts, sesame, gluten cereals, soybean, fish, and sulphites above the stated threshold. |
| Food additive common names | [Common Names of Food Additives](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f637862488954749366) | Alias source for additive names such as MSG, benzoates, sorbates, baking soda, glycine, amino acids, gums, and vitamins. The current PDF extract is flagged for manual quality cleanup. |
| Front-of-package nutrition | [Guidelines for Front of Package Nutrition Labeling of Food Products](https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f637862485315287265) | Voluntary FoP nutrition guidance for packaged foods, including calories, saturated fat, sugar, sodium, optional nutrients, serving basis, and display principles. |
| Small prepackaged foods | [Regulations Governing the Labeling of Small Prepackaged Food](https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3408) | Small-package exceptions and alternative QR-code/electronic disclosure paths for constrained package surfaces. |
| Bulk foods | [Regulations on Bulk Food Labeling](https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3398) | Labeling requirements for bulk foods where ordinary prepackaged labeling may not apply. |

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
