# Taiwan health food permit, label and approved effect wording

- Template ID: `tw_health_food_claims_evidence_bundle`
- Route ID: `tw_health_food_claims`
- Product family: `health_food`
- Query examples: 健康食品; 許可證字號; 保健功效; health food permit; approved effect

## Required Inputs

- permit status
- permit number
- approved effect
- functional ingredient
- label copy
- dosage/use instructions

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Health Food** (`health-food`): 健康食品; Health Food; 保健功效; health care effects
- **Health Food Application Permit** (`health-food-application-permit`): 健康食品查驗登記; health food application permit; 安全評估報告; 保健功效成分
- **Health Food Permit** (`health-food-permit`): 健康食品許可證; 許可證; health food permit; product registration permit
- **Health Food Approved Effect Vocabulary** (`health-food-approved-effect-vocabulary`): approved health care effects; 免疫調節; 胃腸功能改善; 骨質保健
- **Health Food Label Required Items** (`health-food-label-required-items`): 健康食品字樣; 健康食品標示; 健康食品標示規定; health food labeling regulations
- **Novel Food Ingredient Safety Assessment** (`novel-food-ingredient-safety-assessment`): 非傳統食品原料; 新興食品原料; 安全性評估資料表; non-traditional food ingredient

## Required Sources

- **Health Food Governing Act** (`tw-moj-health-food-governing-act`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Health Food Application Permit Regulations** (`tw-tfda-health-food-application-permit-regulations`) - Taiwan Food and Drug Administration; fresh; pdf
- **Enforcement Rules of Health Food Control Act** (`tw-tfda-health-food-enforcement-rules`) - Taiwan Food and Drug Administration; fresh; cache
- **Health Food Health Care Effect Item Notice** (`tw-tfda-health-food-health-care-effect-items-2025`) - Taiwan Food and Drug Administration; fresh; html
- **Health Food Labeling Regulations** (`tw-tfda-health-food-labeling-regulations`) - Taiwan Food and Drug Administration; fresh; pdf
- **Health Food Effect Assessment Methods Hub** (`tw-tfda-health-food-effect-assessment-methods-hub`) - Taiwan Food and Drug Administration; fresh; html

## Answer Skeleton

- Classify the product as health_food and confirm the routing assumptions.
- Normalize key names with the selected term cards: Health Food, Health Food Application Permit, Health Food Permit.
- Cite the strongest Taiwan sources: tw-moj-health-food-governing-act, tw-tfda-health-food-application-permit-regulations, tw-tfda-health-food-enforcement-rules.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- no permit number
- effect wording outside approval
- functional ingredient content missing
- medical claim wording present

## Next Action

Confirm permit scope before allowing any health-food wording or approved-effect claim.
