# Taiwan customs, HS/CCC, origin and trade label routing

- Template ID: `tw_customs_origin_hs_evidence_bundle`
- Route ID: `tw_customs_origin_hs`
- Product family: `customs_trade`
- Query examples: HS code; CCC code; origin labeling; customs valuation; advance ruling

## Required Inputs

- HS/CCC
- origin
- incoterms
- invoice value
- shipment purpose
- importer/exporter
- label origin

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Imported Food Inspection** (`imported-food-inspection`): 輸入食品查驗; imported food inspection; 수입식품 검사; food import inspection
- **Food Business Registration for Importers** (`food-business-registration-importer`): 食品業者登錄; food business registration; 식품업자 등록; 產品責任保險
- **Taiwan Import Regulation Codes F01, F02 and 508** (`import-regulation-f01-f02-508`): 508; 輸入規定508; 輸入規定F01; 輸入規定F02
- **Imported Food Inspection Forms** (`imported-food-inspection-forms`): 食品及相關產品資料表; 食品及相關產品輸入查驗申請書; 產品資料表; 報驗義務人
- **Product Information Sheet** (`product-information-sheet`): product information sheet; 產品資訊表; application form for inspection; declaration form of product information
- **Systematic Inspection of Imported Food** (`systematic-imported-food-inspection`): systematic inspection of imported food; 系統性查核; document review; on-site inspection

## Required Sources

- **Taiwan Import Regulation Code Search Instructions** (`tw-trade-import-regulation-code-instruction`) - International Trade Administration, Ministry of Economic Affairs; fresh; html
- **TFDA Import Regulation 508 Food Additive Commodity List Notice** (`tw-tfda-import-regulation-508-food-additive-commodity-list-2026`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA F01 and F02 Import Regulation Commodity Table Notice** (`tw-tfda-import-regulation-f01-f02-commodity-table-2026`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA Imported Food Inspection Application Forms** (`tw-tfda-imported-food-inspection-forms`) - Taiwan Food and Drug Administration; fresh; html
- **Regulations of Inspection of Imported Foods and Related Products** (`tw-tfda-imported-food-inspection-regulations`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations for Systematic Inspection of Imported Food** (`tw-tfda-systematic-inspection-imported-food`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as customs_trade and confirm the routing assumptions.
- Normalize key names with the selected term cards: Imported Food Inspection, Food Business Registration for Importers, Taiwan Import Regulation Codes F01, F02 and 508.
- Cite the strongest Taiwan sources: tw-trade-import-regulation-code-instruction, tw-tfda-import-regulation-508-food-additive-commodity-list-2026, tw-tfda-import-regulation-f01-f02-commodity-table-2026.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- HS/CCC uncertain
- origin mismatch
- shipment purpose unknown
- trade restriction signal unresolved

## Next Action

Resolve HS/CCC and origin before final Taiwan label or import/export document release.
