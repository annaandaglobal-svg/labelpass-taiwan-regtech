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

- **Cosmetic Product Information File** (`cosmetic-product-information-file`): Product Information File; 產品資訊檔案; 대만 화장품 PIF; 화장품 PIF
- **Cosmetic Labeling and Claims** (`cosmetic-labeling-claims`): cosmetic labeling; 化粧品標示; 화장품 표시; cosmetic advertising claims
- **Cosmetic PIF and Product Registration Categories** (`cosmetic-pif-product-registration-categories`): cosmetic product registration; 應完成產品登錄之化粧品種類; 應建立產品資訊檔案之化粧品種類及實施日期; 產品登錄
- **Cosmetic Product Notification** (`cosmetic-product-notification`): cosmetic product notification; 台灣化粧品產品登錄; Taiwan cosmetic product notification; 化粧品產品登錄
- **Cosmetic Label Required Items** (`cosmetic-label-required-items`): INCI; cosmetic outer package, container, label and package insert marking; 中文品名; 全成分
- **Spray and Aerosol Cosmetic Safety** (`cosmetic-spray-aerosol-safety`): 噴霧狀化粧品; aerosol cosmetics; spray cosmetics; 使用安全指引

## Required Sources

- **Taiwan Cosmetic Hygiene and Safety Act** (`tw-moj-cosmetic-hygiene-safety-act`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Regulations Governing Notification of Cosmetic Products** (`tw-moj-cosmetic-product-notification`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **TFDA Post-Market Quality Management System** (`tw-tfda-cosmetic-adverse-event-qms-platform`) - Taiwan Food and Drug Administration; fresh; browser_capture
- **TFDA Cosmetic Latest Announcements** (`tw-tfda-cosmetic-announcements`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA Food and Drug Business Registration Platform** (`tw-tfda-cosmetic-fadenbook-platform`) - Taiwan Food and Drug Administration; fresh; browser_capture
- **Cosmetic Outer Package, Container, Label and Package Insert Marking Rules** (`tw-tfda-cosmetic-label-leaflet-packaging-marking`) - Taiwan Food and Drug Administration; fresh; pdf

## Answer Skeleton

- Classify the product as cosmetic and confirm the routing assumptions.
- Normalize key names with the selected term cards: Cosmetic Product Information File, Cosmetic Labeling and Claims, Cosmetic PIF and Product Registration Categories.
- Cite the strongest Taiwan sources: tw-moj-cosmetic-hygiene-safety-act, tw-moj-cosmetic-product-notification, tw-tfda-cosmetic-adverse-event-qms-platform.
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
