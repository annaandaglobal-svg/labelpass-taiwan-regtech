# Regulatory Terms Glossary

This glossary is the starting vocabulary for LabelPass. Each term should eventually map to source-backed evidence in `data/knowledge/index.json`.

## Taiwan

- Commodity labeling: consumer-facing product information required under Taiwan commodity labeling rules.
- Chinese label: Taiwan-facing label content in Traditional Chinese. English or other languages may supplement it, but Chinese content should not be less complete for Taiwan sales.
- Cosmetic claims criteria: Taiwan cosmetic label, promotion, and advertisement standard used to distinguish ordinary cosmetic claims from false, exaggerated, insufficiently supported, or medical-efficacy claims.
- Food claim criteria: Taiwan food label, promotion, and advertisement standard used to distinguish ordinary food claims from false, exaggerated, misleading, insufficiently supported, or medical-efficacy claims.
- Origin labeling: country or place of origin marking. For selected imported goods, origin can be required at import and must not be false or misleading.
- PIF: Product Information File for cosmetics. It includes product details, ingredient names and concentrations, manufacturing process, toxicological data, stability information, and safety assessment evidence.
- SHTC: Strategic High-Tech Commodities. Export/import controlled goods, including dual-use or sensitive high-technology items, that may require permits.
- TFDA: Taiwan Food and Drug Administration.
- MOEA: Ministry of Economic Affairs.
- BSMI: Bureau of Standards, Metrology and Inspection.

## Global Trade And Labeling

- Technical regulation: a mandatory product-related requirement. Under WTO TBT terminology, it can include terminology, symbols, packaging, marking, or labeling requirements.
- Standard: a voluntary product-related rule or guideline unless made mandatory by law or contract.
- Conformity assessment: procedures such as testing, certification, inspection, or verification that determine whether a product meets requirements.
- HS code: Harmonized System classification code administered internationally through WCO nomenclature and used by customs administrations.
- INCI: International Nomenclature Cosmetic Ingredient name, used to identify cosmetic ingredients internationally.
- CAS RN: CAS Registry Number, a chemical substance identifier that connects chemical names and nomenclature systems.

## LabelPass Normalization Rules

- Keep original-language legal text and translated business-facing summaries separate.
- Preserve source URL and content hash for every extracted fact.
- Do not merge INCI, CAS, and trade names into one identifier; link them as aliases with source confidence.
- Treat customs classification, product category, ingredient rule, label claim, and document requirement as separate rule dimensions.
