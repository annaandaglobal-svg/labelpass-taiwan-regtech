# Taiwan food import inspection and customs packet

- Template ID: `tw_food_import_inspection_evidence_bundle`
- Route ID: `tw_food_import_inspection`
- Product family: `food_import`
- Query examples: HS 0307 health certificate; 輸入食品查驗; product information sheet; CCC code; 食品業者登錄

## Required Inputs

- HS/CCC code
- food category
- origin
- importer
- shipment purpose
- invoice value
- documents

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Imported Food Inspection** (`imported-food-inspection`): imported food inspection; 輸入食品查驗; 수입식품 검사; food import inspection
- **Product Information Sheet** (`product-information-sheet`): product information sheet; application form for inspection; declaration form of product information; 產品資訊表
- **Systematic Inspection of Imported Food** (`systematic-imported-food-inspection`): systematic inspection of imported food; document review; on-site inspection; systematic inspection
- **Imported Food Inspection Forms** (`imported-food-inspection-forms`): 食品及相關產品資料表; 食品及相關產品輸入查驗申請書; imported food inspection application; 報驗義務人
- **Taiwan Import Regulation Codes F01, F02 and 508** (`import-regulation-f01-f02-508`): 508; F01; F02; 輸入規定508
- **Food Business Registration for Importers** (`food-business-registration-importer`): food business registration; 食品業者登錄; 식품업자 등록; food importer registration

## Required Sources

- **GC453 Tariff Database Download** (`tw-customs-tariff-database-download`) - Customs Administration / CPT Single Window; fresh; browser_capture
- **TFDA Import Regulation 508 Food Additive Commodity List Notice** (`tw-tfda-import-regulation-508-food-additive-commodity-list-2026`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA F01 and F02 Import Regulation Commodity Table Notice** (`tw-tfda-import-regulation-f01-f02-commodity-table-2026`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Imported Food Inspection Application Forms** (`tw-tfda-imported-food-inspection-forms`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations of Inspection of Imported Foods and Related Products** (`tw-tfda-imported-food-inspection-regulations`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Inspections Guidance, Law and Regulations Index** (`tw-tfda-inspections-law-regulations-index`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as food_import and confirm the routing assumptions.
- Normalize key names with the selected term cards: Imported Food Inspection, Product Information Sheet, Systematic Inspection of Imported Food.
- Cite the strongest Taiwan sources: tw-customs-tariff-database-download, tw-tfda-import-regulation-508-food-additive-commodity-list-2026, tw-tfda-import-regulation-f01-f02-commodity-table-2026.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- HS/CCC uncertain
- origin/shipper inconsistency
- health certificate missing for high-risk category
- commercial shipment without importer registration

## Next Action

Route to food import inspection checklist before final label or logistics approval.
