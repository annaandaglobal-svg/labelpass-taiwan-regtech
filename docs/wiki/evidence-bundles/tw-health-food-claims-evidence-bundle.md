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

- **Health Food Permit** (`health-food-permit`): health food permit; product registration permit; 健康食品許可證; 許可證
- **Health Food** (`health-food`): Health Food; 健康食品; health care effects; 保健功效
- **Health Food Application Permit** (`health-food-application-permit`): health food application permit; 健康食品查驗登記; health care effect assessment report; safety assessment report
- **Health Food Approved Effect Vocabulary** (`health-food-approved-effect-vocabulary`): approved health care effects; health food effect assessment methods; 免疫調節; 胃腸功能改善
- **Health Food Label Required Items** (`health-food-label-required-items`): health food labeling regulations; 健康食品字樣; 健康食品標示; 健康食品標示規定
- **Novel Food Ingredient Safety Assessment** (`novel-food-ingredient-safety-assessment`): 新興食品原料; 非傳統食品原料; non-traditional food ingredient; novel food ingredient

## Required Sources

- **Health Food Governing Act** (`tw-moj-health-food-governing-act`) - Ministry of Health and Welfare / MOJ Laws and Regulations Database; fresh; cache
- **Health Food Application Permit Regulations** (`tw-tfda-health-food-application-permit-regulations`) - Taiwan Food and Drug Administration; fresh; pdf
- **Enforcement Rules of Health Food Control Act** (`tw-tfda-health-food-enforcement-rules`) - Taiwan Food and Drug Administration; fresh; cache
- **Health Food Health Care Effect Item Notice** (`tw-tfda-health-food-health-care-effect-items-2025`) - Taiwan Food and Drug Administration; fresh; html
- **Health Food Labeling Regulations** (`tw-tfda-health-food-labeling-regulations`) - Taiwan Food and Drug Administration; fresh; pdf
- **Health Food Permit Data Query** (`tw-tfda-health-food-permit-query`) - Taiwan Food and Drug Administration / Consumer Knowledge Service Network; fresh; browser_capture

## Answer Skeleton

- Classify the product as health_food and confirm the routing assumptions.
- Normalize key names with the selected term cards: Health Food Permit, Health Food, Health Food Application Permit.
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
