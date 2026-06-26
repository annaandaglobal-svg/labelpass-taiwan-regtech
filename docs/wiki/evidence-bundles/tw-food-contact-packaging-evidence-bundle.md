# Taiwan food-contact packaging and container labeling

- Template ID: `tw_food_contact_packaging_evidence_bundle`
- Route ID: `tw_food_contact_packaging`
- Product family: `food_contact`
- Query examples: food contact packaging; 食品器具容器包裝; sanitation standards; BSMI; 食品容器

## Required Inputs

- material
- food-contact intent
- temperature/use condition
- import purpose
- label text
- test report

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Taiwan Import Regulation Codes F01, F02 and 508** (`import-regulation-f01-f02-508`): 508; 輸入規定508; 輸入規定F01; 輸入規定F02
- **Food Business Registration for Importers** (`food-business-registration-importer`): 食品業者登錄; food business registration; 식품업자 등록; 產品責任保險
- **Imported Food Inspection Forms** (`imported-food-inspection-forms`): 食品及相關產品資料表; 食品及相關產品輸入查驗申請書; 產品資料表; 報驗義務人
- **Imported Food Inspection** (`imported-food-inspection`): 輸入食品查驗; imported food inspection; 수입식품 검사; food import inspection
- **Product Information Sheet** (`product-information-sheet`): product information sheet; 產品資訊表; application form for inspection; declaration form of product information
- **Systematic Inspection of Imported Food** (`systematic-imported-food-inspection`): systematic inspection of imported food; 系統性查核; document review; on-site inspection

## Required Sources

- **TFDA F01 and F02 Import Regulation Commodity Table Notice** (`tw-tfda-import-regulation-f01-f02-commodity-table-2026`) - Taiwan Food and Drug Administration; fresh; html
- **Regulations Governing the Registration of Food Business** (`tw-tfda-food-business-registration-importers`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Import Regulation 508 Food Additive Commodity List Notice** (`tw-tfda-import-regulation-508-food-additive-commodity-list-2026`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA Imported Food Inspection Application Forms** (`tw-tfda-imported-food-inspection-forms`) - Taiwan Food and Drug Administration; fresh; html
- **Regulations of Inspection of Imported Foods and Related Products** (`tw-tfda-imported-food-inspection-regulations`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations for Systematic Inspection of Imported Food** (`tw-tfda-systematic-inspection-imported-food`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as food_contact and confirm the routing assumptions.
- Normalize key names with the selected term cards: Taiwan Import Regulation Codes F01, F02 and 508, Food Business Registration for Importers, Imported Food Inspection Forms.
- Cite the strongest Taiwan sources: tw-tfda-import-regulation-f01-f02-commodity-table-2026, tw-tfda-food-business-registration-importers, tw-tfda-import-regulation-508-food-additive-commodity-list-2026.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- food-contact intent unclear
- material unknown
- no use-condition evidence
- test report missing for regulated material

## Next Action

Classify food-contact status before applying ordinary food label or customs routing.
