# Taiwan food additive or ingredient permissibility

- Template ID: `tw_food_additive_ingredient_evidence_bundle`
- Route ID: `tw_food_additive_ingredient`
- Product family: `food_additive`
- Query examples: food additive; 食品添加物; permit number; common name; 複方食品添加物

## Required Inputs

- substance/common name
- CAS or local name
- functional class
- use level
- food category
- compound additive status

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Food Labeling and Claims** (`food-labeling-claims`): 食品標示廣告; food claims; food labeling claims; 식품 표시광고
- **Food Allergen Labeling** (`food-allergen-labeling`): 過敏原標示; allergen labeling; 알레르기 표시; 致過敏性內容物
- **Food Label Required Items** (`food-label-required-items`): 食品標示; 食品標示手冊; 食品標示法規手冊; food labeling regulations handbook
- **Nutrition Labeling** (`nutrition-labeling`): 營養標示; nutrition label; 영양성분표; 营养标签
- **Food Additive Functional Classes** (`food-additive-functional-classes`): food additive functional class; 防腐劑; 甜味劑; food additive function
- **Benzoic Acid and Benzoates** (`benzoates-food-additives`): CAS 65-85-0; CAS 532-32-1; CAS 582-25-2; 苯甲酸

## Required Sources

- **Food Ingredient Integration Query Platform Direct Query** (`tw-tfda-food-ingredient-query-platform-direct`) - Taiwan Food and Drug Administration / Consumer Knowledge Service Network; fresh; cache
- **TFDA Food Business Information Query Links** (`tw-tfda-food-business-info-query-links`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations Governing Criteria for Food Labels, Promotion and Advertisement Identified as False, Exaggerated, Misleading or Having Medical Efficacy** (`tw-tfda-food-false-exaggerated-medical-efficacy-claims`) - Taiwan Food and Drug Administration; fresh; cache
- **TFDA Food Guidance, Law and Regulations Index** (`tw-tfda-food-law-regulations-index`) - Taiwan Food and Drug Administration; fresh; html
- **Regulations on Nutrition Labeling for Prepackaged Food Products** (`tw-tfda-food-nutrition-labeling`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulation of Food Allergen Labeling English Page** (`tw-tfda-food-allergen-labeling-en`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as food_additive and confirm the routing assumptions.
- Normalize key names with the selected term cards: Food Labeling and Claims, Food Allergen Labeling, Food Label Required Items.
- Cite the strongest Taiwan sources: tw-tfda-food-ingredient-query-platform-direct, tw-tfda-food-business-info-query-links, tw-tfda-food-false-exaggerated-medical-efficacy-claims.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- common name not matched
- food category not provided
- use level missing
- compound additive status unclear

## Next Action

Confirm additive/common-name status before treating the substance as allowed on a food label.
