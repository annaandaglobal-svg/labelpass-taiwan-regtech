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

- **Import and Export Permit** (`import-export-permit`): export permit; import permit; 輸入許可證; 輸出許可證
- **Customs Declaration** (`customs-declaration`): customs declaration; export declaration; import declaration; 出口報單
- **HS Code Classification** (`hs-code-classification`): CCC code; CCC碼; HS code; HS코드
- **Shipment Purpose** (`shipment-purpose`): shipment purpose; 출하 목적; import purpose; 自用
- **Taiwan Importer and Responsible Firm** (`taiwan-importer-responsible-firm`): Taiwan importer; 進口商; 대만 수입자; 수입자

## Required Sources

- **GC453 Tariff Database Download** (`tw-customs-tariff-database-download`) - Customs Administration / CPT Single Window; fresh; browser_capture
- **Import and Export Regulations by CCC Code** (`tw-trade-ccc-import-export-regulations`) - International Trade Administration, MOEA; fresh; browser_capture
- **Kaohsiung Customs origin packaging notice** (`tw-customs-export-origin-packaging`) - Taiwan Customs Administration; fresh; cache
- **Taiwan Import Regulation Code Search Instructions** (`tw-trade-import-regulation-code-instruction`) - International Trade Administration, Ministry of Economic Affairs; fresh; html
- **Food Additive Permit Data Query** (`tw-tfda-food-additive-permit-query`) - Taiwan Food and Drug Administration / Consumer Knowledge Service Network; fresh; browser_capture
- **TFDA Import Regulation 508 Food Additive Commodity List Notice** (`tw-tfda-import-regulation-508-food-additive-commodity-list-2026`) - Taiwan Food and Drug Administration; fresh; html

## Answer Skeleton

- Classify the product as trade_control and confirm the routing assumptions.
- Normalize key names with the selected term cards: Import and Export Permit, Customs Declaration, HS Code Classification.
- Cite the strongest Taiwan sources: tw-customs-tariff-database-download, tw-trade-ccc-import-export-regulations, tw-customs-export-origin-packaging.
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
