# Taiwan prepackaged food label, allergens, nutrition and claims

- Template ID: `tw_food_label_allergen_evidence_bundle`
- Route ID: `tw_food_label_allergen`
- Product family: `food`
- Query examples: allergen labeling; 甲殼類; nutrition labeling; 低糖; 食品標示

## Required Inputs

- food category
- ingredient statement
- allergen sources
- nutrition facts
- claim wording
- package size

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Food Labeling and Claims** (`food-labeling-claims`): food claims; food labeling claims; 食品標示廣告; 식품 표시광고
- **Food Allergen Labeling** (`food-allergen-labeling`): allergen labeling; 過敏原標示; 알레르기 표시; allergen warning
- **Food Label Required Items** (`food-label-required-items`): food labeling regulations handbook; 食品標示; 食品標示手冊; 食品標示法規手冊
- **Nutrition Labeling** (`nutrition-labeling`): nutrition label; 營養標示; 영양성분표; nutrition facts
- **Sulphites Allergen** (`sulfites-allergen`): Sulfites; Sulphites; 亞硫酸鹽類; 10 mg/kg
- **Crustacea Allergen** (`crustacea-allergen`): Crustacea; 甲殼類; crustacean; 갑각류

## Required Sources

- **Act Governing Food Safety and Sanitation** (`tw-moj-food-safety-sanitation-act`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Regulation of Food Allergen Labeling** (`tw-tfda-food-allergen-labeling`) - Taiwan Food and Drug Administration; fresh; cache
- **Prepackaged Food Allergen Labeling Notice** (`tw-tfda-food-allergen-labeling-consumer-notice`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations Governing Criteria for Food Labels, Promotion and Advertisement Identified as False, Exaggerated, Misleading or Having Medical Efficacy** (`tw-tfda-food-false-exaggerated-medical-efficacy-claims`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Food Labeling Manuals and Handbook Hub** (`tw-tfda-food-labeling-handbook-2026`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Food Guidance, Law and Regulations Index** (`tw-tfda-food-law-regulations-index`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as food and confirm the routing assumptions.
- Normalize key names with the selected term cards: Food Labeling and Claims, Food Allergen Labeling, Food Label Required Items.
- Cite the strongest Taiwan sources: tw-moj-food-safety-sanitation-act, tw-tfda-food-allergen-labeling, tw-tfda-food-allergen-labeling-consumer-notice.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- allergen source unknown
- nutrition claim without analysis
- health effect wording without permit context
- missing importer/responsible firm

## Next Action

Run food label review and resolve allergen/nutrition/claim blockers before shipment release.
