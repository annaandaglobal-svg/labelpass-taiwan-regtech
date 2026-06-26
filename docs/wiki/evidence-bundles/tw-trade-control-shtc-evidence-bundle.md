# Taiwan SHTC and import/export control screening

- Template ID: `tw_trade_control_shtc_evidence_bundle`
- Route ID: `tw_trade_control_shtc`
- Product family: `trade_control`
- Query examples: SHTC; 輸出許可證; dual-use; export control; CCC code

## Required Inputs

- CCC code
- technical specification
- end use
- destination
- shipper/consignee
- export/import permit status

## Citation Slots

- Primary Taiwan authority or legal source
- Term or alias normalization evidence
- Product-specific label/import document evidence
- Freshness or browser-capture status

## Top Terms

- **Import and Export Permit** (`import-export-permit`): 輸入許可證; 輸出許可證; export permit; import permit
- **Customs Declaration** (`customs-declaration`): 出口報單; 進口報單; customs declaration; export declaration
- **HS Code Classification** (`hs-code-classification`): CCC code; CCC碼; Harmonized System; HS code
- **Shipment Purpose** (`shipment-purpose`): shipment purpose; 출하 목적; 自用; 進口目的
- **Taiwan Importer and Responsible Firm** (`taiwan-importer-responsible-firm`): 進口商; Taiwan importer; 대만 수입자; 수입자
- **Exporter and Importer Registration** (`exporter-importer-registration`): 出進口廠商登記; exporter and importer registration; registration of exporters and importers; 수출입업자 등록

## Required Sources

- **Taiwan Import Regulation Code Search Instructions** (`tw-trade-import-regulation-code-instruction`) - International Trade Administration, Ministry of Economic Affairs; fresh; html
- **TFDA Import Regulation 508 Food Additive Commodity List Notice** (`tw-tfda-import-regulation-508-food-additive-commodity-list-2026`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA F01 and F02 Import Regulation Commodity Table Notice** (`tw-tfda-import-regulation-f01-f02-commodity-table-2026`) - Taiwan Food and Drug Administration; fresh; html
- **TFDA Imported Food Inspection Application Forms** (`tw-tfda-imported-food-inspection-forms`) - Taiwan Food and Drug Administration; fresh; html
- **Regulations of Inspection of Imported Foods and Related Products** (`tw-tfda-imported-food-inspection-regulations`) - Taiwan Food and Drug Administration; fresh; cache
- **Regulations for Systematic Inspection of Imported Food** (`tw-tfda-systematic-inspection-imported-food`) - Taiwan Food and Drug Administration; fresh; cache

## Answer Skeleton

- Classify the product as trade_control and confirm the routing assumptions.
- Normalize key names with the selected term cards: Import and Export Permit, Customs Declaration, HS Code Classification.
- Cite the strongest Taiwan sources: tw-trade-import-regulation-code-instruction, tw-tfda-import-regulation-508-food-additive-commodity-list-2026, tw-tfda-import-regulation-f01-f02-commodity-table-2026.
- Return blockers first, then required documents, then optional follow-up checks.

## Caveats

- This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.
- Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.
- Stale or manual-fallback sources require source refresh or browser evidence before rule mutation.

## Stop Conditions

- end use unknown
- CCC code missing
- destination risk unresolved
- permit applicability unknown

## Next Action

Escalate to trade-control review when CCC, destination, or technical specs match SHTC signals.
