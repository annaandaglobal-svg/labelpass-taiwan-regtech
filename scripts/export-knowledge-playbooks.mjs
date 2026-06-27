import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const paths = {
  memory: path.join(root, "data", "knowledge", "knowledge-memory.json"),
  routingJson: path.join(root, "data", "knowledge", "product-routing-matrix.json"),
  templatesJson: path.join(root, "data", "knowledge", "evidence-bundle-templates.json"),
  routingMarkdown: path.join(root, "docs", "wiki", "product-routing-matrix.md"),
  bundleDir: path.join(root, "docs", "wiki", "evidence-bundles")
};

function compareStable(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

const routeConfigs = [
  {
    id: "tw_cosmetic_label_pif",
    label: "Taiwan cosmetic label, PIF and market access",
    product_family: "cosmetic",
    coverage_id: "tw_cosmetics_labeling_market_access",
    source_domains: ["cosmetics", "general_labeling"],
    source_keywords: ["cosmetic", "PIF", "label", "package", "product registration", "claims"],
    term_keywords: ["cosmetic", "PIF", "product information", "label", "claim", "INCI", "specific purpose", "spray"],
    allowed_categories: ["cosmetic_compliance", "cosmetic_ingredient", "preservative", "colorant"],
    classification_inputs: ["product name", "cosmetic category", "leave-on/rinse-off/spray", "specific-purpose function", "ingredient list", "Taiwan label text"],
    entry_questions: [
      "Is the product a general cosmetic, specific-purpose cosmetic, spray/aerosol, or borderline product?",
      "Is there a Taiwan product registration or PIF implementation obligation for this product category and date?",
      "Are the ingredient names mapped to INCI, CAS, local Traditional Chinese terms, or TFDA restricted/prohibited lists?",
      "Does the label or marketing copy imply medical efficacy, deception, exaggeration, or unsupported effect claims?"
    ],
    label_checks: ["Chinese product name", "full ingredients", "purpose/use", "manufacturer/importer", "origin", "batch/expiry", "warnings and small-package rules"],
    ingredient_checks: ["INCI/CAS normalization", "prohibited ingredients", "restricted ingredients", "preservatives", "colorants", "sunscreens", "spray/aerosol safety"],
    claim_checks: ["medical efficacy", "false/exaggerated claims", "substantiation evidence", "specific-purpose transition wording"],
    import_checks: ["product notification", "PIF file readiness", "GMP/manufacturer evidence", "responsible firm/importer consistency"],
    documents: ["Taiwan Chinese label", "ingredient composition", "PIF or safety file", "COA/specification", "GMP/manufacturer document", "importer/responsible firm data"],
    stop_conditions: ["unknown product category", "specific-purpose claim without registration context", "unidentified ingredient over threshold", "no Chinese label text"],
    next_actions: ["Run the cosmetic review, then attach PIF/notification and ingredient evidence before expert approval."],
    query_examples: ["PIF", "INCI", "化粧品標示", "cosmetic claims", "產品登錄"]
  },
  {
    id: "tw_food_label_allergen",
    label: "Taiwan prepackaged food label, allergens, nutrition and claims",
    product_family: "food",
    coverage_id: "tw_food_labeling_allergen",
    source_domains: ["food", "food_labeling", "food_safety"],
    source_keywords: ["food labeling", "allergen", "nutrition", "claim", "prepackaged"],
    term_keywords: ["food label", "allergen", "nutrition", "claim", "milk", "casein", "shellfish", "mango", "sulfite"],
    allowed_categories: ["food_labeling", "food_allergen", "food_safety", "food_additive"],
    classification_inputs: ["food category", "ingredient statement", "allergen sources", "nutrition facts", "claim wording", "package size"],
    entry_questions: [
      "Is the product prepackaged food, bulk food, additive, health food, special dietary food, or food-contact packaging?",
      "Which allergen families are present directly or through compound ingredients?",
      "Does the package require nutrition labeling or qualify for a small-package rule?",
      "Do nutrition, sweetness, disease, or functional claims exceed allowed wording?"
    ],
    label_checks: ["product name", "ingredients", "net content", "manufacturer/importer", "origin", "expiry", "nutrition labeling", "allergen warning"],
    ingredient_checks: ["allergen mapping", "compound ingredient disclosure", "additive names", "residue/contaminant context if relevant"],
    claim_checks: ["nutrition claims", "sweetness claims", "disease/medical efficacy", "health-food wording"],
    import_checks: ["food business operator registration", "product liability insurance", "import inspection routing if shipped to Taiwan"],
    documents: ["finished label", "ingredient specification", "allergen statement", "nutrition analysis", "claim substantiation", "importer data"],
    stop_conditions: ["allergen source unknown", "nutrition claim without analysis", "health effect wording without permit context", "missing importer/responsible firm"],
    next_actions: ["Run food label review and resolve allergen/nutrition/claim blockers before shipment release."],
    query_examples: ["allergen labeling", "甲殼類", "nutrition labeling", "低糖", "食品標示"]
  },
  {
    id: "tw_food_additive_ingredient",
    label: "Taiwan food additive or ingredient permissibility",
    product_family: "food_additive",
    coverage_id: "tw_food_labeling_allergen",
    source_domains: ["food_additives", "food", "food_safety"],
    source_keywords: ["food additive", "permit", "common name", "registration", "ingredient"],
    term_keywords: ["food additive", "preservative", "sweetener", "common name", "permit", "compound additive"],
    allowed_categories: ["food_additive", "food_import", "food_labeling"],
    classification_inputs: ["substance/common name", "CAS or local name", "functional class", "use level", "food category", "compound additive status"],
    entry_questions: [
      "Is the material a food ingredient, single food additive, compound food additive, flavor, or processing aid?",
      "Is the Taiwan common name or permit number available?",
      "What is the food category and proposed use level?",
      "Does the ingredient need registration material or import documents?"
    ],
    label_checks: ["additive common name", "functional class if required", "compound additive disclosure", "permit/registration number when applicable"],
    ingredient_checks: ["common-name matching", "functional-class matching", "use limit", "food category scope", "compound additive registration"],
    claim_checks: ["no unauthorized health or disease effect from ingredient function"],
    import_checks: ["registration materials", "official hygiene certificate where required", "product information sheet", "import inspection application"],
    documents: ["specification", "COA", "common-name evidence", "permit or registration data", "formula/use-level statement", "supplier declaration"],
    stop_conditions: ["common name not matched", "food category not provided", "use level missing", "compound additive status unclear"],
    next_actions: ["Confirm additive/common-name status before treating the substance as allowed on a food label."],
    query_examples: ["food additive", "食品添加物", "permit number", "common name", "複方食品添加物"]
  },
  {
    id: "tw_food_import_inspection",
    label: "Taiwan food import inspection and customs packet",
    product_family: "food_import",
    coverage_id: "tw_food_import_routing",
    source_domains: ["food_import", "food_safety", "customs"],
    source_keywords: ["import inspection", "cargo clearance", "tariff", "health certificate", "importer registration"],
    term_keywords: ["import inspection", "CCC", "HS", "health certificate", "product information sheet", "import declaration", "systematic inspection"],
    allowed_categories: ["food_import", "customs_classification", "customs_document", "trade_document", "trade_operator", "import_export_control", "food_safety"],
    classification_inputs: ["HS/CCC code", "food category", "origin", "importer", "shipment purpose", "invoice value", "documents"],
    entry_questions: [
      "Is this commercial import, sample, testing, personal use, return, repair, or exhibition shipment?",
      "Which HS/CCC code and TFDA import regulation code applies?",
      "Are product information sheet, import declaration, invoice, and importer registration ready?",
      "Does the category need health certificate, systematic inspection, or origin-specific evidence?"
    ],
    label_checks: ["origin consistency", "Chinese label availability", "product name/category consistency", "batch and expiry consistency"],
    ingredient_checks: ["restricted food category", "residue/contaminant signal", "additive and allergen cross-check when food is labeled"],
    claim_checks: ["claims aligned with product category and permit status"],
    import_checks: ["import inspection application", "product information sheet", "import declaration", "food business registration", "product liability insurance", "HS/CCC ruling", "health certificate"],
    documents: ["invoice", "packing list", "product information sheet", "import declaration", "health certificate if required", "origin evidence", "importer registration"],
    stop_conditions: ["HS/CCC uncertain", "origin/shipper inconsistency", "health certificate missing for high-risk category", "commercial shipment without importer registration"],
    next_actions: ["Route to food import inspection checklist before final label or logistics approval."],
    query_examples: ["HS 0307 health certificate", "輸入食品查驗", "product information sheet", "CCC code", "食品業者登錄"]
  },
  {
    id: "tw_health_food_claims",
    label: "Taiwan health food permit, label and approved effect wording",
    product_family: "health_food",
    coverage_id: "tw_health_food_claims",
    source_domains: ["health_food", "food_labeling", "food"],
    source_keywords: ["health food", "permit", "approved effect", "logo", "claim"],
    term_keywords: ["health food", "permit", "approved health care effects", "logo", "許可證", "保健功效"],
    allowed_categories: ["health_food", "health_food_claim", "health_food_labeling", "food_safety"],
    classification_inputs: ["permit status", "permit number", "approved effect", "functional ingredient", "label copy", "dosage/use instructions"],
    entry_questions: [
      "Is the product legally registered as Taiwan health food?",
      "Which permit number and approved health-care effect are claimed?",
      "Does label wording stay within approved effect vocabulary?",
      "Are intake instructions, warnings, nutrition components, logo, and legend present?"
    ],
    label_checks: ["permit number", "standard logo", "health-food legend", "approved effect", "intake method", "warnings", "nutrition/functional components"],
    ingredient_checks: ["functional ingredient identity", "content amount", "safety assessment context", "new ingredient status"],
    claim_checks: ["approved effect only", "no medical efficacy", "no unapproved disease wording", "advertising consistency"],
    import_checks: ["permit holder/importer consistency", "application or registration evidence", "label version matching permit scope"],
    documents: ["permit record", "approved effect scope", "functional ingredient report", "safety/effect assessment", "label and product description"],
    stop_conditions: ["no permit number", "effect wording outside approval", "functional ingredient content missing", "medical claim wording present"],
    next_actions: ["Confirm permit scope before allowing any health-food wording or approved-effect claim."],
    query_examples: ["健康食品", "許可證字號", "保健功效", "health food permit", "approved effect"]
  },
  {
    id: "tw_food_contact_packaging",
    label: "Taiwan food-contact packaging and container labeling",
    product_family: "food_contact",
    coverage_id: "tw_food_import_routing",
    source_domains: ["food_safety", "general_labeling", "food_import"],
    source_keywords: ["food contact", "utensils", "containers", "packaging", "sanitation standard"],
    term_keywords: ["food contact", "container", "packaging", "utensil", "sanitation standard", "食品器具"],
    allowed_categories: ["food_safety", "food_import", "food_labeling", "customs_document"],
    classification_inputs: ["material", "food-contact intent", "temperature/use condition", "import purpose", "label text", "test report"],
    entry_questions: [
      "Is the article intended for direct food contact?",
      "Which material and use temperature applies?",
      "Is it packaging/container/utensil or non-food-contact merchandise?",
      "Are sanitation standard evidence and required commodity labels available?"
    ],
    label_checks: ["material", "use condition", "food-contact wording", "origin", "responsible firm/importer", "warnings"],
    ingredient_checks: ["material composition", "restricted migration context", "sanitation standard applicability"],
    claim_checks: ["avoid unsupported safety or health claims"],
    import_checks: ["food-related product import inspection", "BSMI/commodity-labeling signal", "test report and product information sheet"],
    documents: ["material declaration", "test report", "label artwork", "product information sheet", "importer data"],
    stop_conditions: ["food-contact intent unclear", "material unknown", "no use-condition evidence", "test report missing for regulated material"],
    next_actions: ["Classify food-contact status before applying ordinary food label or customs routing."],
    query_examples: ["food contact packaging", "食品器具容器包裝", "sanitation standards", "BSMI", "食品容器"]
  },
  {
    id: "tw_customs_origin_hs",
    label: "Taiwan customs, HS/CCC, origin and trade label routing",
    product_family: "customs_trade",
    coverage_id: "tw_food_import_routing",
    source_domains: ["customs", "trade", "general_labeling"],
    source_keywords: ["customs", "tariff", "origin", "CCC", "import", "export"],
    term_keywords: ["HS", "CCC", "origin", "importer", "shipment purpose", "tariff", "customs"],
    allowed_categories: ["customs_classification", "customs_document", "trade_document", "trade_operator", "import_export_control", "food_import"],
    classification_inputs: ["HS/CCC", "origin", "incoterms", "invoice value", "shipment purpose", "importer/exporter", "label origin"],
    entry_questions: [
      "Which HS/CCC code is declared and does an advance ruling exist?",
      "Does label origin match invoice, packing, and customs evidence?",
      "Is the shipment commercial, sample, repair/return, personal use, or exhibition?",
      "Are importer/exporter registration and trade-control checks needed?"
    ],
    label_checks: ["origin marking", "responsible firm/importer", "product name consistency", "outer carton marking"],
    ingredient_checks: ["regulated product category signal by HS/CCC", "food/cosmetic cross-route if product category triggers TFDA review"],
    claim_checks: ["origin or conformity claims must match documents"],
    import_checks: ["customs valuation", "advance tariff classification", "cargo clearance", "origin verification", "import/export restrictions"],
    documents: ["invoice", "packing list", "origin evidence", "HS/CCC evidence", "import/export permit if required", "shipping terms"],
    stop_conditions: ["HS/CCC uncertain", "origin mismatch", "shipment purpose unknown", "trade restriction signal unresolved"],
    next_actions: ["Resolve HS/CCC and origin before final Taiwan label or import/export document release."],
    query_examples: ["HS code", "CCC code", "origin labeling", "customs valuation", "advance ruling"]
  },
  {
    id: "tw_trade_control_shtc",
    label: "Taiwan SHTC and import/export control screening",
    product_family: "trade_control",
    coverage_id: "tw_food_import_routing",
    source_domains: ["trade_controls", "trade", "customs"],
    source_keywords: ["SHTC", "export control", "import commodities", "export commodities", "dual-use"],
    term_keywords: ["SHTC", "export permit", "import permit", "dual use", "strategic high-tech"],
    allowed_categories: ["import_export_control", "customs_classification", "customs_document", "trade_document", "trade_operator"],
    classification_inputs: ["CCC code", "technical specification", "end use", "destination", "shipper/consignee", "export/import permit status"],
    entry_questions: [
      "Does the CCC code, technical spec, destination, or end use trigger SHTC screening?",
      "Is this import or export and which permit path applies?",
      "Are consignee, end-user, and intended use documented?",
      "Does the product overlap food/cosmetic label review or pure trade-control review?"
    ],
    label_checks: ["controlled-use wording consistency", "origin and responsible firm", "technical product name"],
    ingredient_checks: ["chemical/material identity if control lists reference substance class"],
    claim_checks: ["avoid unsupported conformity/export-control statements"],
    import_checks: ["SHTC permit", "import/export restriction list", "end-use statement", "destination screening", "CCC classification"],
    documents: ["technical spec", "CCC classification", "end-use statement", "permit evidence", "invoice/packing list", "shipper/consignee data"],
    stop_conditions: ["end use unknown", "CCC code missing", "destination risk unresolved", "permit applicability unknown"],
    next_actions: ["Escalate to trade-control review when CCC, destination, or technical specs match SHTC signals."],
    query_examples: ["SHTC", "輸出許可證", "dual-use", "export control", "CCC code"]
  }
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compact(value, maxLength = 220) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function markdownDocument(content) {
  return `${content.trimEnd()}\n`;
}

function matchesAny(haystack, needles) {
  const text = String(haystack ?? "").toLowerCase();
  return needles.some((needle) => text.includes(String(needle).toLowerCase()));
}

function scoreSource(source, config, coverageSourceIds) {
  let score = 0;
  if (coverageSourceIds.has(source.id)) score += 1000;
  if (config.source_domains.includes(source.domain)) score += 180;
  if (source.priority === "high") score += 80;
  if (matchesAny(`${source.id} ${source.title} ${source.tags?.join(" ")} ${source.excerpt}`, config.source_keywords)) score += 140;
  return score;
}

function scoreTerm(term, config, coverageTermIds) {
  let score = 0;
  if (config.allowed_categories?.length && !config.allowed_categories.includes(term.category)) return 0;
  if (coverageTermIds.has(term.id)) score += 1000;
  if (matchesAny(`${term.id} ${term.canonical_name} ${term.category} ${term.aliases?.join(" ")} ${term.notes}`, config.term_keywords)) score += 180;
  if (term.score) score += Math.min(80, Math.round(term.score / 20));
  return score;
}

function selectSources(memory, config, coverage) {
  const coverageSourceIds = new Set(coverage?.source_ids ?? []);
  return memory.source_cards
    .map((source) => ({ source, score: scoreSource(source, config, coverageSourceIds) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compareStable(left.source.id, right.source.id))
    .slice(0, 9)
    .map((item) => ({
      id: item.source.id,
      title: item.source.title,
      authority: item.source.authority,
      domain: item.source.domain,
      priority: item.source.priority,
      cache_status: item.source.cache_status,
      evidence_mode: item.source.evidence_mode,
      document_path: item.source.document_path
    }));
}

function selectTerms(memory, config, coverage) {
  const coverageTermIds = new Set(coverage?.term_ids ?? []);
  return memory.term_cards
    .map((term) => ({ term, score: scoreTerm(term, config, coverageTermIds) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compareStable(left.term.id, right.term.id))
    .slice(0, 10)
    .map((item) => ({
      id: item.term.id,
      canonical_name: item.term.canonical_name,
      category: item.term.category,
      aliases: (item.term.aliases ?? []).slice(0, 6),
      source_keys: (item.term.source_keys ?? []).slice(0, 6)
    }));
}

function markdownTable(rows, columns) {
  if (!rows.length) return "No rows.\n";
  const header = `| ${columns.map((column) => column.label).join(" | ")} |\n`;
  const divider = `| ${columns.map((column) => (column.align === "right" ? "---:" : "---")).join(" | ")} |\n`;
  const body = rows
    .map((row) => `| ${columns.map((column) => String(column.value(row) ?? "").replaceAll("|", "\\|")).join(" | ")} |`)
    .join("\n");
  return `${header}${divider}${body}\n`;
}

function buildRoutes(memory) {
  const coverageById = new Map(memory.coverage_groups.map((group) => [group.id, group]));
  return routeConfigs.map((config) => {
    const coverage = coverageById.get(config.coverage_id);
    const sources = selectSources(memory, config, coverage);
    const terms = selectTerms(memory, config, coverage);
    return {
      id: config.id,
      label: config.label,
      jurisdiction: "TW",
      product_family: config.product_family,
      coverage_group_id: config.coverage_id,
      classification_inputs: config.classification_inputs,
      entry_questions: config.entry_questions,
      label_checks: config.label_checks,
      ingredient_checks: config.ingredient_checks,
      claim_checks: config.claim_checks,
      import_checks: config.import_checks,
      required_documents: config.documents,
      stop_conditions: config.stop_conditions,
      next_actions: config.next_actions,
      query_examples: config.query_examples,
      evidence_template_ids: [`${config.id}_evidence_bundle`],
      source_ids: sources.map((source) => source.id),
      term_ids: terms.map((term) => term.id),
      sources,
      terms
    };
  });
}

function buildTemplates(routes, memory) {
  return routes.map((route) => ({
    id: `${route.id}_evidence_bundle`,
    query_intent: route.label,
    product_route_id: route.id,
    product_family: route.product_family,
    match_domains: unique(route.sources.map((source) => source.domain)),
    match_categories: unique(route.terms.map((term) => term.category)),
    match_terms: route.term_ids,
    match_sources: route.source_ids,
    query_examples: route.query_examples,
    required_inputs: route.classification_inputs.slice(0, 8),
    top_terms: route.terms.slice(0, 6),
    required_sources: route.sources.slice(0, 6),
    citation_slots: [
      "Primary Taiwan authority or legal source",
      "Term or alias normalization evidence",
      "Product-specific label/import document evidence",
      "Freshness or browser-capture status"
    ],
    answer_skeleton: [
      `Classify the product as ${route.product_family} and confirm the routing assumptions.`,
      `Normalize key names with the selected term cards: ${route.terms.slice(0, 3).map((term) => term.canonical_name).join(", ") || "none"}.`,
      `Cite the strongest Taiwan sources: ${route.sources.slice(0, 3).map((source) => source.id).join(", ") || "none"}.`,
      `Return blockers first, then required documents, then optional follow-up checks.`
    ],
    caveats: [
      "This template is a retrieval and drafting guide; do not override primary Taiwan law or TFDA/MOEA/Customs source text.",
      "Alias matches require product category and jurisdiction confirmation when the alias review queue flags ambiguity.",
      "Stale or manual-fallback sources require source refresh or browser evidence before rule mutation."
    ],
    stop_conditions: route.stop_conditions,
    next_action: route.next_actions[0],
    generated_from_memory_at: memory.generated_at
  }));
}

function renderRoutingMarkdown(matrix) {
  return `# Product Routing Matrix

Generated from \`data/knowledge/knowledge-memory.json\`. Use this to route a product or shipment into the right Taiwan labeling/import review workflow before drafting an answer.

## Routes

${markdownTable(matrix.product_routes, [
  { label: "Route", value: (row) => row.label },
  { label: "Family", value: (row) => row.product_family },
  { label: "Sources", align: "right", value: (row) => row.source_ids.length },
  { label: "Terms", align: "right", value: (row) => row.term_ids.length },
  { label: "First action", value: (row) => row.next_actions[0] }
])}

${matrix.product_routes.map((route) => `## ${route.label}

- Route ID: \`${route.id}\`
- Product family: \`${route.product_family}\`
- Coverage group: \`${route.coverage_group_id}\`
- Classification inputs: ${route.classification_inputs.join("; ")}
- Stop conditions: ${route.stop_conditions.join("; ")}
- Required documents: ${route.required_documents.join("; ")}
- Evidence template IDs: ${route.evidence_template_ids.map((id) => `\`${id}\``).join(", ")}
- Source IDs: ${route.source_ids.map((id) => `\`${id}\``).join(", ")}
- Term IDs: ${route.term_ids.map((id) => `\`${id}\``).join(", ")}

### Entry Questions

${route.entry_questions.map((question) => `- ${question}`).join("\n")}

### Checks

- Label: ${route.label_checks.join("; ")}
- Ingredient: ${route.ingredient_checks.join("; ")}
- Claim: ${route.claim_checks.join("; ")}
- Import/customs: ${route.import_checks.join("; ")}
`).join("\n")}
`;
}

function renderBundleIndex(templates) {
  return `# Evidence Bundle Templates

Generated retrieval templates for LabelPass evidence bundles. Each template maps a search or review intent to required inputs, citation slots, top terms, and source cards.

${markdownTable(templates.templates, [
  { label: "Template", value: (row) => `[${row.query_intent}](./${row.id}.md)` },
  { label: "Family", value: (row) => row.product_family },
  { label: "Terms", align: "right", value: (row) => row.top_terms.length },
  { label: "Sources", align: "right", value: (row) => row.required_sources.length },
  { label: "Next action", value: (row) => row.next_action }
])}
`;
}

function renderTemplateMarkdown(template) {
  return `# ${template.query_intent}

- Template ID: \`${template.id}\`
- Route ID: \`${template.product_route_id}\`
- Product family: \`${template.product_family}\`
- Query examples: ${template.query_examples.join("; ")}

## Required Inputs

${template.required_inputs.map((input) => `- ${input}`).join("\n")}

## Citation Slots

${template.citation_slots.map((slot) => `- ${slot}`).join("\n")}

## Top Terms

${template.top_terms.map((term) => `- **${term.canonical_name}** (\`${term.id}\`): ${(term.aliases ?? []).slice(0, 4).join("; ")}`).join("\n") || "No terms selected."}

## Required Sources

${template.required_sources.map((source) => `- **${source.title}** (\`${source.id}\`) - ${source.authority}; ${source.cache_status}; ${source.evidence_mode}`).join("\n") || "No sources selected."}

## Answer Skeleton

${template.answer_skeleton.map((line) => `- ${line}`).join("\n")}

## Caveats

${template.caveats.map((line) => `- ${line}`).join("\n")}

## Stop Conditions

${template.stop_conditions.map((line) => `- ${line}`).join("\n")}

## Next Action

${template.next_action}
`;
}

const memory = await readJson(paths.memory);
const routes = buildRoutes(memory);
const matrix = {
  schema_version: 1,
  generated_at: memory.generated_at,
  generated_from: {
    knowledge_memory_generated_at: memory.generated_at,
    source_registry_version: memory.generated_from?.source_registry_version,
    selected_source_cards: memory.summary?.selected_source_cards,
    selected_term_cards: memory.summary?.selected_term_cards
  },
  product_routes: routes
};

const templates = {
  schema_version: 1,
  generated_at: memory.generated_at,
  generated_from: matrix.generated_from,
  templates: buildTemplates(routes, memory)
};

await mkdir(path.dirname(paths.routingJson), { recursive: true });
await mkdir(path.dirname(paths.routingMarkdown), { recursive: true });
await rm(paths.bundleDir, { recursive: true, force: true });
await mkdir(paths.bundleDir, { recursive: true });

await writeFile(paths.routingJson, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
await writeFile(paths.templatesJson, `${JSON.stringify(templates, null, 2)}\n`, "utf8");
await writeFile(paths.routingMarkdown, markdownDocument(renderRoutingMarkdown(matrix)), "utf8");
await writeFile(path.join(paths.bundleDir, "index.md"), markdownDocument(renderBundleIndex(templates)), "utf8");

for (const template of templates.templates) {
  await writeFile(path.join(paths.bundleDir, `${slug(template.id)}.md`), markdownDocument(renderTemplateMarkdown(template)), "utf8");
}

console.log(`Wrote ${path.relative(root, paths.routingJson)}, ${path.relative(root, paths.templatesJson)}, and ${path.relative(root, paths.bundleDir)}`);
