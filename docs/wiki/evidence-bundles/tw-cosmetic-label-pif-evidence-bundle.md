# Taiwan cosmetic label, PIF and market access

- Template ID: `tw_cosmetic_label_pif_evidence_bundle`
- Route ID: `tw_cosmetic_label_pif`
- Product family: `cosmetic`
- Query examples: PIF; INCI; 化粧品標示; cosmetic claims; 產品登錄

## Required Inputs

- product name
- cosmetic category
- leave-on/rinse-off/spray
- specific-purpose function
- ingredient list
- Taiwan label text

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Cosmetic Product Information File** (`cosmetic-product-information-file`): 產品資訊檔案; Product Information File; 대만 화장품 PIF; 화장품 PIF
- **Cosmetic Labeling and Claims** (`cosmetic-labeling-claims`): 化粧品標示; cosmetic labeling; 화장품 표시; 化粧品廣告
- **Cosmetic PIF and Product Registration Categories** (`cosmetic-pif-product-registration-categories`): 產品登錄; 應完成產品登錄之化粧品種類; 應建立產品資訊檔案之化粧品種類及實施日期; cosmetic product registration
- **Cosmetic Product Notification** (`cosmetic-product-notification`): 台灣化粧品產品登錄; cosmetic product notification; 化粧品產品登錄; 화장품 신고
- **Cosmetic Label Required Items** (`cosmetic-label-required-items`): 中文品名; 化粧品外包裝、容器、標籤或仿單之標示規定; 化粧品標示; 全成分
- **Spray and Aerosol Cosmetic Safety** (`cosmetic-spray-aerosol-safety`): 噴霧狀化粧品; 使用安全指引; aerosol cosmetics; spray cosmetics

## Required Sources

- **Taiwan Cosmetic Hygiene and Safety Act** (`tw-moj-cosmetic-hygiene-safety-act`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Regulations Governing Notification of Cosmetic Products** (`tw-moj-cosmetic-product-notification`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Cosmetic Outer Package, Container, Label and Package Insert Marking Rules** (`tw-tfda-cosmetic-label-leaflet-packaging-marking`) - Taiwan Food and Drug Administration; fresh; pdf
- **Cosmetic PIF Category Implementation Notice** (`tw-tfda-cosmetic-pif-category-implementation-2024`) - Taiwan Food and Drug Administration; fresh; html
- **Cosmetic Product Registration Category Notice** (`tw-tfda-cosmetic-product-registration-categories-2024`) - Taiwan Food and Drug Administration; fresh; html
- **Cosmetic Product Information Files to Be Implemented in Phases** (`tw-tfda-pif-implementation`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as cosmetic and confirm the routing assumptions.
- Normalize key names with the selected term cards: Cosmetic Product Information File, Cosmetic Labeling and Claims, Cosmetic PIF and Product Registration Categories.
- Cite the strongest Taiwan sources: tw-moj-cosmetic-hygiene-safety-act, tw-moj-cosmetic-product-notification, tw-tfda-cosmetic-label-leaflet-packaging-marking.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- unknown product category
- specific-purpose claim without registration context
- unidentified ingredient over threshold
- no Chinese label text

## Next Action

Run the cosmetic review, then attach PIF/notification and ingredient evidence before expert approval.
