import rulesData from "../../data/rules/tw-cosmetics-rules.json";
import termIndexData from "../../data/knowledge/term-index.json";
import { buildReviewActionPlan, type ReviewActionPlan } from "./review-action-plan";

export type ReviewStatus = "pass" | "warn" | "fail" | "needs_info";

export type ParsedIngredient = {
  raw: string;
  name: string;
  percent?: number;
};

export type Finding = {
  id: string;
  status: ReviewStatus;
  area: "성분" | "라벨" | "효능표현" | "서류" | "통관" | "식품표시" | "식품접촉재" | "알레르겐" | "영양표시";
  title: string;
  severity: "낮음" | "중간" | "높음" | "low" | "medium" | "high";
  why: string;
  fix: string[];
  source: string;
  sourceUrl: string;
  evidence?: string;
};

export type ReviewInput = {
  productName: string;
  productType: string;
  ingredientsText: string;
  labelText: string;
  origin: string;
  manufacturer: string;
  hsCode?: string;
  incoterms?: string;
  shipmentPurpose?: string;
  invoiceValue?: string;
};

export type ReviewResult = {
  status: ReviewStatus;
  score: number;
  generatedAt: string;
  ruleVersion: string;
  parsedIngredients: ParsedIngredient[];
  findings: Finding[];
  actionPlan: ReviewActionPlan;
  summary: {
    fail: number;
    warn: number;
    pass: number;
    needsInfo: number;
  };
};

const SOURCE_ACT = "Cosmetic Hygiene and Safety Act, Articles 6, 7, 10";
const SOURCE_ACT_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030013";
const SOURCE_PIF = "TFDA PIF phased implementation notice, 2025-08-14";
const SOURCE_PIF_URL = "https://www.fda.gov.tw/eng/newsContent.aspx?id=31164";
const SOURCE_COSMETIC_PRODUCT_NOTIFICATION = "TFDA cosmetic product registration zone";
const SOURCE_COSMETIC_PRODUCT_NOTIFICATION_URL = "https://www.fda.gov.tw/tc/sitecontent.aspx?sid=3435";
const SOURCE_COSMETIC_GMP = "TFDA cosmetics announcements and GMP implementation information";
const SOURCE_COSMETIC_GMP_URL = "https://www.fda.gov.tw/TC/sitelist.aspx?sid=1894";
const SOURCE_COSMETIC_POSTMARKET = "TFDA cosmetics management framework";
const SOURCE_COSMETIC_POSTMARKET_URL = "https://www.fda.gov.tw/eng/siteContent.aspx?sid=10347";
const SOURCE_COSMETIC_ADVERSE_REPORTING = "Regulations for Reporting Cosmetics Serious Adverse Effects and Hazards to Hygiene and Safety";
const SOURCE_COSMETIC_ADVERSE_REPORTING_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030090";
const SOURCE_COSMETIC_RECALL = "Regulations for Cosmetics Recall";
const SOURCE_COSMETIC_RECALL_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030091";
const SOURCE_COSMETIC_SOURCE_FLOW = "Regulations Governing the Source and the Flow Data of Cosmetic Products";
const SOURCE_COSMETIC_SOURCE_FLOW_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030089";
const SOURCE_OPEN_DATA = "TFDA cosmetics open datasets, InfoId 199-203";
const SOURCE_OPEN_DATA_URL = "https://data.gov.tw/dataset/173684";
const SOURCE_FOOD_ACT = "Act Governing Food Safety and Sanitation, Articles 3 and 22";
const SOURCE_FOOD_ACT_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040001";
const SOURCE_FOOD_NUTRITION = "TFDA Regulations on Nutrition Labeling for Prepackaged Food Products";
const SOURCE_FOOD_NUTRITION_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1633";
const SOURCE_FOOD_NUTRITION_CLAIM = "TFDA Revised Regulations on Nutrition Claim for Prepackaged Food Products";
const SOURCE_FOOD_NUTRITION_CLAIM_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3522";
const SOURCE_HEALTH_FOOD_ACT = "Health Food Governing Act, Articles 6, 7, 13, and 14";
const SOURCE_HEALTH_FOOD_ACT_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040012";
const SOURCE_HEALTH_FOOD_ENFORCEMENT = "TFDA Enforcement Rules of Health Food Control Act";
const SOURCE_HEALTH_FOOD_ENFORCEMENT_URL = "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=552";
const SOURCE_FORMULA_CERTAIN_DISEASE = "TFDA Formula for Certain Disease labeling requirements";
const SOURCE_FORMULA_CERTAIN_DISEASE_URL = "https://www.fda.gov.tw/eng/newsContent.aspx?id=31233";
const SOURCE_FOOD_INGREDIENT_PLATFORM = "TFDA Food Ingredient Integration Query Platform";
const SOURCE_FOOD_INGREDIENT_PLATFORM_URL = "https://www.fda.gov.tw/eng/newsContent.aspx?id=30794";
const SOURCE_FOOD_CONTACT_LABELING = "TFDA Regulations on the Labeling of Food Utensils, Food Containers, or Packaging";
const SOURCE_FOOD_CONTACT_LABELING_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3090";
const SOURCE_FOOD_CONTACT_REQUIRED_ITEMS = "TFDA food utensils, containers or packaging required labeling items";
const SOURCE_FOOD_CONTACT_REQUIRED_ITEMS_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3089";
const SOURCE_FOOD_CONTACT_SANITATION = "Sanitation Standards for Food Utensils, Containers and Packages";
const SOURCE_FOOD_CONTACT_SANITATION_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040019";
const SOURCE_FOOD_CONTAINER_SMART_USE = "TFDA smart use guidance for food containers, 2026-05-05";
const SOURCE_FOOD_CONTAINER_SMART_USE_URL = "https://www.fda.gov.tw/eng/newsContent.aspx?id=31513";
const SOURCE_FOOD_ALLERGEN = "TFDA Regulation of Food Allergen Labeling";
const SOURCE_FOOD_ALLERGEN_URL = "https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f636826556478322315";
const SOURCE_FOOD_RECOMMENDED_ALLERGEN = "TFDA Regulations Governing Food Allergen Labeling on the Recommended Labeling Allergens";
const SOURCE_FOOD_RECOMMENDED_ALLERGEN_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3407";
const SOURCE_FOOD_ADDITIVE = "TFDA Standards for Specification, Scope, Application and Limitation of Food Additives";
const SOURCE_FOOD_ADDITIVE_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=308";
const SOURCE_FOOD_ADDITIVE_COMMON_NAMES = "TFDA Common Names of Food Additives";
const SOURCE_FOOD_ADDITIVE_COMMON_NAMES_URL = "https://www.fda.gov.tw/TC/siteContent.aspx?sid=10159";
const SOURCE_FOOD_ADDITIVE_REGISTRATION = "TFDA food additive inspection registration materials";
const SOURCE_FOOD_ADDITIVE_REGISTRATION_URL = "https://www.fda.gov.tw/tc/sitelist.aspx?sid=3895";
const SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS = "TFDA compound food additive import document notice";
const SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS_URL = "https://www.fda.gov.tw/tc/newsContent.aspx?cid=4&id=19405";
const SOURCE_FOOD_IMPORT_INSPECTION = "Regulations of Inspection of Imported Foods and Related Products, Articles 3, 4, 6, and 8";
const SOURCE_FOOD_IMPORT_INSPECTION_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040017";
const SOURCE_FOOD_BUSINESS_REGISTRATION = "TFDA food business registration for import business operators";
const SOURCE_FOOD_BUSINESS_REGISTRATION_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1681";
const SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE = "TFDA HS 0307 shellfish health certificate notice";
const SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE_URL = "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3095";
const SOURCE_FOOD_SYSTEMATIC_INSPECTION = "Regulations for Systematic Inspection of Imported Food";
const SOURCE_FOOD_SYSTEMATIC_INSPECTION_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1607";
const SOURCE_FOOD_TRACEABILITY = "Regulations Governing Traceability of Foods and Relevant Products";
const SOURCE_FOOD_TRACEABILITY_URL = "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=2804";
const SOURCE_FOOD_RECALL_DESTRUCTION = "Regulations of Recall and Destruction for Food and Related Products";
const SOURCE_FOOD_RECALL_DESTRUCTION_URL = "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040095";
const SOURCE_WCO_HS = "World Customs Organization Harmonized System reference";
const SOURCE_WCO_HS_URL = "https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx";
const SOURCE_TW_TRADE = "Taiwan International Trade Administration import/export regulations";
const SOURCE_TW_TRADE_URL = "https://www.trade.gov.tw/english/Pages/Detail.aspx?nodeID=100&pid=741476";
const SOURCE_TW_ORIGIN = "Taiwan Customs origin labeling notices";
const SOURCE_TW_ORIGIN_URL = "https://web.customs.gov.tw/ekeelung/singlehtml/1444?cntId=9d9cf376a43c481faef23b3f584f782c";
const SOURCE_TW_SHTC = "Taiwan Strategic High-tech Commodities export control regulations";
const SOURCE_TW_SHTC_URL = "https://www.trade.gov.tw/english/Pages/List.aspx?nodeID=298";
const PIF_EFFECTIVE_AT = Date.parse("2026-07-01T00:00:00+08:00");

type RegulatoryRule = {
  id: string;
  category: "prohibited" | "restricted" | "colorant" | "preservative" | "sunscreen";
  source_info_id: number;
  source_title: string;
  source_url: string;
  source_record_id: string;
  ingredient_name: string;
  inci_names: string[];
  cas_numbers: string[];
  color_index_numbers: string[];
  aliases: string[];
  product_scope: string;
  limit_text: string;
  limit_percent_values: number[];
  max_limit_percent: number | null;
  restriction_text: string;
  caution_text: string;
  notes: string;
};

type IndexedAlias = {
  value: string;
  normalized?: string;
  type?: string;
  language?: string;
  jurisdiction?: string;
  confidence?: number;
  note?: string | null;
  source?: string;
};

type RuleAliasIndex = {
  rule_id: string;
  term_ids: string[];
  aliases: IndexedAlias[];
};

type IndexedKnowledgeTerm = {
  id: string;
  canonical_name: string;
  category?: string;
  aliases?: IndexedAlias[];
  source_keys?: string[];
  notes?: string;
};

const officialRules = (rulesData.rules as RegulatoryRule[]).filter((rule) => rule.aliases.length > 0);
const indexedAliasesByRule = new Map(
  ((termIndexData.rule_aliases ?? []) as RuleAliasIndex[]).map((entry) => [entry.rule_id, entry.aliases])
);
const foodAdditiveTerms = ((termIndexData.terms ?? []) as IndexedKnowledgeTerm[]).filter(
  (term) => term.category === "food_additive"
);
const foodAdvisoryAllergenTerms = ((termIndexData.terms ?? []) as IndexedKnowledgeTerm[]).filter(
  (term) => term.category === "food_allergen_advisory"
);

const labelRequirements = [
  { id: "name", label: "제품명", patterns: [/品名|產品名|product name|제품명/i] },
  { id: "purpose", label: "용도", patterns: [/用途|用法|purpose|usage|사용법|용도/i] },
  { id: "net", label: "내용량", patterns: [/容量|淨重|net|ml|g|내용량|중량/i] },
  { id: "ingredients", label: "전성분", patterns: [/全成分|ingredients|成分|전성분/i] },
  { id: "cautions", label: "주의사항", patterns: [/注意|警語|caution|warning|주의/i] },
  { id: "maker", label: "제조사/수입자 연락처", patterns: [/製造商|進口商|manufacturer|importer|전화|tel|地址|address/i] },
  { id: "origin", label: "원산지", patterns: [/原產地|country of origin|made in|원산지|韓國|Korea/i] },
  { id: "date", label: "제조일/사용기한", patterns: [/製造日期|有效日期|保存期限|expiry|expiration|제조일|사용기한|EXP/i] },
  { id: "lot", label: "로트번호", patterns: [/批號|lot|batch|로트|제조번호/i] }
];

const medicalClaimPatterns = [
  /治療|療效|醫療|藥用|항염|치료|아토피|여드름\s*치료|eczema|acne cure|anti-inflammatory/i,
  /cell regeneration|세포\s*재생|상처\s*치유|wound healing/i
];

export function parseIngredients(text: string): ParsedIngredient[] {
  return text
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((raw) => {
      const percentMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
      const percent = percentMatch ? Number(percentMatch[1]) : undefined;
      const name = raw
        .replace(/\([^)]*\)/g, " ")
        .replace(/\d+(?:\.\d+)?\s*%/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { raw, name, percent };
    });
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function foldMatchSeparators(value: string) {
  return value.replace(/[\s._-]+/g, "");
}

function hasFoldedAlias(value: string, normalizedAlias: string) {
  const foldedValue = foldMatchSeparators(value);
  const foldedAlias = foldMatchSeparators(normalizedAlias);
  return foldedAlias.length > 3 && foldedValue.includes(foldedAlias);
}

function aliasesForRule(rule: RegulatoryRule): IndexedAlias[] {
  const indexedAliases = indexedAliasesByRule.get(rule.id) ?? [];
  const officialAliases: IndexedAlias[] = [
    rule.ingredient_name,
    ...(rule.inci_names ?? []),
    ...(rule.cas_numbers ?? []),
    ...(rule.color_index_numbers ?? []),
    ...(rule.aliases ?? [])
  ]
    .filter(Boolean)
    .map((value) => ({
      value,
      confidence: 0.9,
      source: "tfda-rule"
    }));

  const seen = new Set<string>();
  return [...indexedAliases, ...officialAliases].filter((alias) => {
    const normalized = alias.normalized ?? normalizeForMatch(alias.value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function matchedAlias(ingredient: ParsedIngredient, aliases: IndexedAlias[]) {
  const value = normalizeForMatch(`${ingredient.raw} ${ingredient.name}`);

  return aliases.find((alias) => {
    const normalizedAlias = alias.normalized ?? normalizeForMatch(alias.value);
    if (!normalizedAlias) return false;

    const isLatinShortAlias = /^[a-z0-9.+-]+$/i.test(normalizedAlias) && normalizedAlias.length <= 3;
    const isLowConfidence = typeof alias.confidence === "number" && alias.confidence < 0.75;

    if (isLatinShortAlias || isLowConfidence) {
      return new RegExp(`(^|\\s)${escapeRegex(normalizedAlias)}($|\\s)`, "u").test(value);
    }

    if (normalizedAlias.length < 2) return false;
    return value.includes(normalizedAlias) || hasFoldedAlias(value, normalizedAlias);
  });
}

function matchedAliasInText(text: string, aliases: IndexedAlias[]) {
  const value = normalizeForMatch(text);

  return aliases.find((alias) => {
    const normalizedAlias = alias.normalized ?? normalizeForMatch(alias.value);
    if (!normalizedAlias) return false;

    const isLatinAlias = /^[a-z0-9.+-]+$/i.test(normalizedAlias);
    const isLatinShortAlias = isLatinAlias && normalizedAlias.length <= 3;
    const isLowConfidence = typeof alias.confidence === "number" && alias.confidence < 0.75;

    if (isLatinAlias || isLatinShortAlias || isLowConfidence) {
      const exactWord = new RegExp(`(^|\\s)${escapeRegex(normalizedAlias)}($|\\s)`, "u").test(value);
      return exactWord || (!isLatinShortAlias && !isLowConfidence && hasFoldedAlias(value, normalizedAlias));
    }

    if (normalizedAlias.length < 2) return false;
    return value.includes(normalizedAlias) || hasFoldedAlias(value, normalizedAlias);
  });
}

function isMouthwash(input: ReviewInput) {
  return /mouthwash|漱口|구강|치약|tooth/i.test(`${input.productType} ${input.labelText}`);
}

function isLeaveOn(input: ReviewInput) {
  return /leave-on|크림|로션|토너|에센스|cream|lotion|toner|serum|駐留|免沖洗/i.test(`${input.productType} ${input.productName} ${input.labelText}`);
}

function isRinseOnlyRule(rule: RegulatoryRule) {
  return /立即沖洗|rinse/i.test(`${rule.product_scope} ${rule.restriction_text}`);
}

function sourceLabel(rule: RegulatoryRule) {
  return `${rule.source_title} InfoId ${rule.source_info_id}, row ${rule.source_record_id || rule.id}`;
}

function ingredientEvidence(ingredient: ParsedIngredient, rule: RegulatoryRule, alias?: IndexedAlias) {
  const parts = [
    `input: ${ingredient.raw}`,
    alias?.value ? `matched alias: ${alias.value}` : "",
    rule.ingredient_name ? `official: ${rule.ingredient_name}` : "",
    rule.inci_names?.[0] ? `INCI: ${rule.inci_names[0]}` : "",
    rule.cas_numbers?.[0] ? `CAS: ${rule.cas_numbers[0]}` : "",
    rule.color_index_numbers?.[0] ? `CI: ${rule.color_index_numbers[0]}` : ""
  ].filter(Boolean);

  return parts.join(" / ");
}

function fixOptions(rule: RegulatoryRule, limit?: number) {
  const options = [];
  if (typeof limit === "number") {
    options.push(`${limit}% 이하인지 제조사 조성표 또는 COA로 확인`);
  }
  if (rule.category === "prohibited") {
    options.push("처방에서 제거하고 대체 원료 적용 후 안정성/방부력 재시험");
  }
  if (rule.product_scope) {
    options.push(`제품 유형/사용 범위 확인: ${rule.product_scope}`);
  }
  if (rule.caution_text) {
    options.push(`라벨 주의문구 반영: ${rule.caution_text}`);
  }
  if (rule.restriction_text) {
    options.push(`제한 조건 검토: ${rule.restriction_text}`);
  }
  options.push("애매한 용도 또는 복합원료는 전문가 검수로 넘기기");
  return options.slice(0, 4);
}

function isFoodProduct(input: ReviewInput) {
  return /food|snack|beverage|drink|tea|coffee|sauce|powder|candy|chocolate|supplement|capsule|tablet|probiotic|functional food|health food|formula for certain disease|special dietary|medical nutrition|medical food|cracker|cookie|protein|low sugar|sugar free|squid|kiwi|shellfish|mollusk|mollusc|clam|oyster|mussel|scallop|abalone|식품|음료|과자|소스|분말|차|커피|건강기능|건강식품|기능성 식품|프로바이오틱스|캡슐|정제|특정 질환용 조제식품|특수의료용도식품|쿠키|쌀과자|단백질|고단백|저당|무당|오징어|키위|패류|조개|굴|홍합|가리비|전복|食品|飲料|餅乾|糖果|茶|咖啡|米餅|高蛋白|低糖|無糖|健康食品|保健食品|保健功效|膠囊|錠劑|益生菌|特定疾病配方食品|特殊營養食品|魷魚|奇異果|貝類|貝|牡蠣|蛤|扇貝|鮑魚/i.test(
    `${input.productName} ${input.productType} ${input.labelText}`
  );
}

function isCosmeticProduct(input: ReviewInput) {
  return /cosmetic|cosmetics|skin care|skincare|toner|cream|lotion|serum|cleanser|sunscreen|spf|soap|shampoo|mouthwash|toothpaste|화장품|스킨케어|토너|크림|로션|세럼|클렌저|클렌징|자외선|비누|샴푸|치약|구강|化粧品|化妝品|護膚|护肤|化妝水|化粧水|精華|精华|乳液|面霜|防曬|防晒|洗面|洗髮|洗发|牙膏/i.test(
    `${input.productName} ${input.productType} ${input.labelText}`
  );
}

function reviewText(input: ReviewInput) {
  return `${input.productName} ${input.productType} ${input.ingredientsText} ${input.labelText} ${input.origin} ${input.manufacturer} ${input.hsCode ?? ""} ${input.incoterms ?? ""} ${input.shipmentPurpose ?? ""} ${input.invoiceValue ?? ""}`;
}

function matchedFoodAdditiveEntries(input: ReviewInput, limit = 12) {
  const entries: Array<{ term: IndexedKnowledgeTerm; ingredient: ParsedIngredient; alias: IndexedAlias }> = [];
  const emitted = new Set<string>();

  for (const ingredient of parseIngredients(input.ingredientsText)) {
    for (const term of foodAdditiveTerms) {
      if (emitted.has(term.id)) continue;
      const alias = matchedAlias(ingredient, term.aliases ?? []);
      if (!alias) continue;
      emitted.add(term.id);
      entries.push({ term, ingredient, alias });
      if (entries.length >= limit) return entries;
    }
  }

  return entries;
}

function isFoodAdditiveProduct(input: ReviewInput) {
  const identityText = `${input.productName} ${input.productType}`;
  const labelUseText = `${input.labelText} ${input.productType}`;

  return (
    /food additive|additive product|additive raw material|additive premix|additive blend|processing aid|flavou?r enhancer|preservative powder|食品添加物|食品添加劑|食品添加剂|食添|식품\s*첨가물|식품\s*첨가제|첨가물\s*(원료|제품|혼합제|프리믹스)|單方食品添加物|单方食品添加剂|複方食品添加物|复配食品添加剂/i.test(identityText) ||
    /(?:用途|用於|用于|purpose|intended use).{0,28}(?:food additive|食品添加物|食品添加劑|食品添加剂|식품\s*첨가물)|(?:food additive|食品添加物|食品添加劑|食品添加剂|식품\s*첨가물).{0,28}(?:用途|用於|用于|purpose|intended use)/i.test(labelUseText)
  );
}

function isCompoundFoodAdditiveProduct(input: ReviewInput) {
  const text = reviewText(input);
  if (/compound food additive|compound additive|additive premix|additive blend|food additive blend|複方食品添加物|复配食品添加剂|複合食品添加物|复合食品添加剂|복방\s*식품\s*첨가물|복합\s*식품\s*첨가물|혼합\s*식품\s*첨가물|첨가물\s*프리믹스/i.test(text)) {
    return true;
  }

  return isFoodAdditiveProduct(input) && matchedFoodAdditiveEntries(input, 3).length >= 2 && /blend|premix|compound|複方|复配|複合|复合|混合|配方|혼합|복합|복방|프리믹스/i.test(text);
}

function hasFoodAdditiveRegistrationEvidence(input: ReviewInput) {
  return /inspection registration|registration permit|permit document|food additive permit|food additive license|查驗登記|查验登记|食品添加物查驗登記|食品添加剂查验登记|許可證|许可证|登記證|登记证|登錄字號|登录字号|許可字號|许可证号|permit no\.?|license no\.?|등록증|등록번호|허가서|허가번호|검사등록|사전\s*허가/i.test(reviewText(input));
}

function hasCompoundFoodAdditiveCompositionReport(input: ReviewInput) {
  return /composition report|composition statement|product composition report|ingredient composition report|formula sheet|formulation sheet|成分報告|成分报告|產品成分報告|产品成分报告|產品成分表|产品成分表|成分比例|配方表|제품\s*성분\s*보고|제품\s*조성\s*보고|조성표|배합비|배합\s*비율/i.test(reviewText(input));
}

function hasCosmeticProductNotification(input: ReviewInput) {
  return /product notification|cosmetic notification|cosmetic product registration|product registration|fadenbook|產品登錄|產品登記|产品登录|产品登记|化粧品產品登錄|化妝品產品登錄|化妆品产品登录|登錄編號|登錄字號|登录编号|notification no\.?|registration no\.?|제품\s*등록|제품\s*신고|화장품\s*제품\s*등록|화장품\s*등록|등록번호/i.test(reviewText(input));
}

function hasCosmeticPifEvidence(input: ReviewInput) {
  return /\bPIF\b|product information file|產品資訊檔案|產品資訊檔|产品信息档案|产品资料档案|安全性評估|安全性评估|safety assessment|safety assessor|제품\s*정보\s*파일|제품정보파일|제품\s*정보\s*문서|안전성\s*평가/i.test(reviewText(input));
}

function hasCosmeticGmpEvidence(input: ReviewInput) {
  return /\bGMP\b|good manufacturing practice|ISO\s*22716|化粧品GMP|化妝品GMP|化妆品GMP|優良製造準則|优良制造准则|화장품\s*GMP|우수\s*화장품\s*제조|제조\s*품질\s*관리/i.test(reviewText(input));
}

function hasCosmeticAdverseReportingReadiness(input: ReviewInput) {
  return /adverse event|serious adverse|adverse effect|hygiene and safety hazard|defective product report|qms|15[-\s]?day|within 15 days|consumer complaint|safety alert|不良事件|嚴重不良反應|衛生安全危害|十五日|15日|通報|客訴|安全警訊|이상사례|중대한\s*이상반응|위생안전|15일|보고\s*SOP|소비자\s*불만|안전성\s*모니터링/i.test(reviewText(input));
}

function hasCosmeticRecallReadiness(input: ReviewInput) {
  return /recall|recall SOP|recall procedure|recall plan|recall operation|seller notification|CAPA|corrective action|Class\s*[123]\s*recall|回收|回收作業|回收計畫|通知販賣者|矯正措施|預防措施|一級回收|二級回收|三級回收|리콜|회수\s*SOP|회수\s*계획|판매자\s*통지|시정조치|예방조치/i.test(reviewText(input));
}

function hasCosmeticSourceFlowRecords(input: ReviewInput) {
  const text = reviewText(input);
  if (/source and flow|source-flow|traceability ledger|direct supply sources and destinations|five[-\s]?year retention|supply chain records|供應來源及流向資料|供應來源|流向資料|保存五年|화장품\s*공급원|유통흐름|5년\s*보관|추적관리\s*대장/i.test(text)) return true;

  const hasLotSignal = /lot|batch|批號|批号|제조번호|로트|lot\s*no\.?|batch\s*no\.?/i.test(text);
  const hasFlowSignal = /receiver|recipient|destination|delivery date|shipment date|import declaration|customs declaration|invoice no|purchase order|供應|流向|收貨|交貨|進口報單|報單號碼|수령처|납품처|공급처|수입신고|통관번호|보관/i.test(text);
  return hasLotSignal && hasFlowSignal;
}

function hasHsClassification(input: ReviewInput) {
  if (input.hsCode?.trim()) return true;
  return /\b(?:HS|H\.S\.|CCC|tariff|customs code)\b\s*[:#-]?\s*\d{4,10}|HS코드|세번|稅則號列|稅號|商品編碼|商品编码|統計品目番号/i.test(reviewText(input));
}

function hasTaiwanImporter(input: ReviewInput) {
  return /taiwan importer|importer co|進口商|輸入業者|輸入商|台灣.*進口|臺灣.*進口|대만\s*수입자|수입원/i.test(
    `${input.manufacturer} ${input.labelText}`
  );
}

function hasInvoiceValue(input: ReviewInput) {
  const normalizedValue = String(input.invoiceValue ?? "").replace(/[,\s]/g, "");
  return Number.isFinite(Number(normalizedValue)) && Number(normalizedValue) > 0;
}

function hasIncoterms(input: ReviewInput) {
  return Boolean(input.incoterms?.trim()) || /\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b|Incoterms|인코텀즈|貿易條件|贸易条件/i.test(reviewText(input));
}

function hasShipmentPurpose(input: ReviewInput) {
  return Boolean(input.shipmentPurpose?.trim()) || /commercial|sale|sample|demo|return|repair|testing|gift|personal use|판매|상업|샘플|견본|데모|반품|수리|시험|개인사용|樣品|样品|銷售|销售|展示|測試|测试|維修|维修/i.test(reviewText(input));
}

function hasOriginSignal(input: ReviewInput) {
  return Boolean(input.origin.trim()) || /country of origin|origin|made in|原產地|原产地|產地|원산지|제조국/i.test(input.labelText);
}

function hasStrategicGoodsSignal(input: ReviewInput) {
  return /ai accelerator|gpu|npu|semiconductor|server|encryption|cryptographic|sensor|drone|laser|shtc|dual-use|strategic high-tech|전략물자|이중용도|반도체|서버|암호화|센서|드론|레이저|半導體|半导体|伺服器|服务器|加密|感測器|传感器|無人機|无人机|雷射/i.test(
    reviewText(input)
  );
}

function hsCodeText(input: ReviewInput) {
  return `${input.hsCode ?? ""} ${reviewText(input)}`;
}

function hsCodeStartsWith(input: ReviewInput, prefixes: string[]) {
  const compact = hsCodeText(input).replace(/[.\-\s]/g, "");
  return prefixes.some((prefix) => new RegExp(`(?:^|\\D)${prefix}\\d*`, "i").test(compact));
}

function hasCommercialShipmentSignal(input: ReviewInput) {
  return /commercial|sale|resale|retail|wholesale|business|B2B|판매|상업|도매|소매|유통|영업|銷售|销售|商業|商业|零售|批發|批发/i.test(
    reviewText(input)
  );
}

function isImportedFoodContext(input: ReviewInput) {
  return (
    hasCommercialShipmentSignal(input) ||
    hasHsClassification(input) ||
    hasTaiwanImporter(input) ||
    hasInvoiceValue(input) ||
    hasIncoterms(input)
  );
}

function hasFoodInspectionApplication(input: ReviewInput) {
  return /inspection application|application form for inspection|apply for inspection|查驗申請|查验申请|輸入食品查驗|输入食品查验|수입식품\s*검사\s*신청|검사신청서|수입검사\s*신청/i.test(
    reviewText(input)
  );
}

function hasProductInformationSheet(input: ReviewInput) {
  return /product information sheet|product information declaration|declaration form of product information|產品資訊表|产品资讯表|產品資料表|产品资料表|產品資訊申報|제품정보표|제품\s*정보\s*신고|제품정보\s*선언/i.test(
    reviewText(input)
  );
}

function hasImportDeclarationCopy(input: ReviewInput) {
  return /import declaration|application for import declaration|customs declaration|進口報單|进口报单|進口申報|进口申报|수입신고서|수입\s*신고\s*사본|통관신고/i.test(
    reviewText(input)
  );
}

function hasFoodBusinessRegistration(input: ReviewInput) {
  return /food business registration|food business operator registration|食品業者登錄|食品業者登記|食品业者登记|食品業者登錄字號|輸入業者登錄|輸入業者登記|식품업자\s*등록|식품영업자\s*등록|수입식품\s*영업등록|영업등록번호/i.test(
    reviewText(input)
  );
}

function hasProductLiabilityInsurance(input: ReviewInput) {
  return /product liability insurance|PL insurance|liability insurance|產品責任保險|产品责任保险|製造物責任|제조물책임보험|생산물배상책임|PL보험/i.test(
    reviewText(input)
  );
}

function hasFoodTraceabilityReadiness(input: ReviewInput) {
  const text = reviewText(input);
  if (/food traceability|traceability system|trace the source|track the flow|source tracking|flow tracking|traceability ledger|食品追溯追蹤|追溯追蹤|식품\s*이력추적|식품\s*추적관리/i.test(text)) return true;

  const hasLot = /lot|batch|serial|unique mark|批號|批号|ロット|제조번호|로트|배치/i.test(text);
  const hasSource = /supplier|raw material source|exporter|manufacturer|food business registration|country of origin|receiving date|import inspection application|customs release|供應商|原料來源|食品業者登錄|輸入查驗|通關放行|원료\s*출처|공급처|수출자|제조사|원산지|입고일|수입검사/i.test(text);
  const hasFlow = /recipient|receiver|distributor|delivery date|shipment date|downstream|inventory|returned products|inferior products|product flow|收貨|配送|交貨日期|出貨|庫存|退貨|不良品|수령처|납품처|배송일|출고일|하류|재고|반품|부적합품/i.test(text);

  return hasLot && hasSource && hasFlow;
}

function hasFoodRecallDestructionReadiness(input: ReviewInput) {
  const text = reviewText(input);
  if (/food recall|recall and destruction|recall destruction|recall plan|destruction plan|recall progress report|standing task force|downstream counterparties|segregate recalled products|final disposal|destruction approval|five[-\s]?year recall records|食品回收|食品回收銷毀|回收銷毀|回收計畫|銷毀計畫|回收進度|下游業者|下游廠商|隔離標示|最終處置|五年保存|식품\s*회수|식품\s*리콜|폐기\s*계획|회수\s*진행\s*보고|하류\s*거래처|격리\s*표시|최종\s*처분|5년\s*보관/i.test(text)) return true;

  const hasRecallAction = /recall|withdrawal|market withdrawal|回收|召回|리콜|회수/i.test(text);
  const hasRecallRecord = /batch|lot|inventory|downstream|notification|progress report|disposal|destruction|records|批號|庫存|下游|通知|進度報告|銷毀|紀錄|로트|재고|하류|통지|보고|폐기|기록/i.test(text);

  return hasRecallAction && hasRecallRecord;
}

function hasHealthFoodSignal(input: ReviewInput) {
  return /health food|functional food|health care effect|approved health care effect|supplement|dietary supplement|probiotic|immune support|supports immunity|cholesterol|blood sugar|body fat|gut health|건강식품|기능성\s*식품|기능성\s*표시|건강기능|프로바이오틱스|면역|콜레스테롤|혈당|체지방|健康食品|保健食品|保健功效|機能性|益生菌|免疫|膽固醇|血糖|體脂肪/i.test(
    reviewText(input)
  );
}

function hasHealthFoodPermitSignal(input: ReviewInput) {
  return /health food permit|product registration permit|inspection and registration|permit number|registration permit|permit no\.?|license no\.?|衛部健食字|衛署健食字|健康食品許可證|許可證|許可字號|건강식품\s*허가|허가번호|등록허가|등록번호/i.test(
    reviewText(input)
  );
}

function hasHealthFoodLogoSignal(input: ReviewInput) {
  return /standard logo|health food logo|health food legend|health food mark|健康食品標章|健康食品字樣|健康食品標準圖樣|標章|標準圖樣|건강식품\s*표준로고|건강식품\s*문구|로고/i.test(
    reviewText(input)
  );
}

function hasHealthFoodIntakeWarningSignal(input: ReviewInput) {
  return /recommended intake|daily intake|serving recommendation|important message|warning|possible health risk|建議攝取量|每日攝取量|重要訊息|警語|注意事項|권장섭취량|일일섭취량|섭취\s*주의|경고|주의/i.test(
    reviewText(input)
  );
}

function hasApprovedHealthCareEffectSignal(input: ReviewInput) {
  return /approved health care effect|approved effect|registered claim|approval scope|保健功效|核准功效|核准範圍|승인\s*효능|허가\s*효능|승인\s*기능성/i.test(
    reviewText(input)
  );
}

function hasFormulaForCertainDiseaseSignal(input: ReviewInput) {
  return /formula for certain disease|formula food for certain disease|special dietary food|medical nutrition|renal formula|diabetic formula|oncology nutrition|特定疾病配方食品|特殊營養食品|腎臟病配方|糖尿病配方|특정\s*질환용\s*조제식품|특수의료용도식품|환자용\s*식품|질환용\s*식품|신장\s*환자|당뇨\s*환자/i.test(
    reviewText(input)
  );
}

function hasFormulaLabelPhrase(input: ReviewInput) {
  return /formula for certain disease|特定疾病配方食品|특정\s*질환용\s*조제식품/i.test(input.labelText);
}

function hasFormulaWarningSignal(input: ReviewInput) {
  return /not suitable for the general population|doctor or registered dietitian|not for intravenous use|increasing the dosage will not help|physician|dietitian|不適合一般人|醫師|營養師|不得供靜脈注射|增加使用量|일반인에게\s*적합하지|의사|영양사|정맥\s*주사용|섭취량을\s*늘려도/i.test(
    input.labelText
  );
}

function hasFoodMedicalEfficacySignal(input: ReviewInput) {
  return /\b(?:cure|treat|treatment|heals?|therapeutic)\b|medical efficacy|prevent diabetes|cancer|hypertension|renal failure|kidney disease|eczema|acne cure|治療|療效|治癒|醫療效能|癌症|糖尿病|高血壓|腎臟病|치료|완치|의학적\s*효능|암|당뇨|고혈압|신장병|아토피|여드름\s*치료/i.test(
    reviewText(input)
  );
}

function hasIngredientSafetyReviewSignal(input: ReviewInput) {
  return /extract|botanical|herbal|probiotic|strain|enzyme|novel ingredient|new ingredient|萃取|草本|益生菌|菌株|酵素|新原料|추출|허브|균주|효소|신규\s*원료/i.test(
    reviewText(input)
  );
}

function hasNonFoodContactUseSignal(input: ReviewInput) {
  return /not\s+(?:for|intended for)\s+food[-\s]?contact|not food safe|non[-\s]?food|非食品用|不得接觸食品|식품용\s*아님|비식품용/i.test(
    `${input.productName} ${input.productType} ${input.labelText}`
  );
}

function isFoodContactMaterialProduct(input: ReviewInput) {
  const primaryText = `${input.productName} ${input.productType}`;
  const fullText = `${primaryText} ${input.labelText}`;
  if (hasNonFoodContactUseSignal(input)) return false;
  const directFoodContactSignal =
    /food[-\s]?contact|food utensil|food container|food packaging|food wrap|food storage|food service ware|tableware|lunch box|bento box|microwave container|食品器具|食品容器|食品包裝|食品器具容器包裝|餐具|便當盒|保鮮膜|食物容器|식품\s*접촉|식품용\s*(?:기구|용기|포장|포장재)|식품\s*포장재|식품접촉재|도시락\s*용기|비닐랩|전자레인지\s*용기/i.test(fullText);
  const genericContainerSignal =
    /\b(?:cup|straw|tray|bottle|container|wrap|film|packaging|utensil|fork|spoon|knife|chopsticks|lid|box|bag|pouch)\b|杯|吸管|托盤|瓶|容器|包裝|袋|盒|컵|빨대|트레이|병|용기|랩|포장재|포장|봉투|파우치/i.test(primaryText);
  const foodUseContext =
    /\b(?:food|meal|beverage|drink|soup|lunch|microwave|oven|freezer|dishwasher)\b|食品|食物|餐|微波|식품|음식|식사용|전자레인지|냉동/i.test(fullText) ||
    hasFoodContactUsePhrase(input);

  return directFoodContactSignal || (genericContainerSignal && foodUseContext);
}

function hasFoodContactUsePhrase(input: ReviewInput) {
  return /for food contact use|food contact use|food safe|for food use|食品接觸用|供食品接觸用|食品用|可供食品接觸|식품용|식품\s*접촉용|식품에\s*접촉/i.test(
    input.labelText
  );
}

function hasPlasticFoodContactSignal(input: ReviewInput) {
  return /plastic|polypropylene|\bPP\b|polyethylene|\bPE\b|PET|polystyrene|\bPS\b|polycarbonate|\bPC\b|PLA|melamine|silicone|塑膠|塑料|聚丙烯|聚乙烯|聚苯乙烯|聚碳酸酯|矽膠|美耐皿|플라스틱|폴리프로필렌|폴리에틸렌|폴리스티렌|폴리카보네이트|실리콘|멜라민/i.test(
    reviewText(input)
  );
}

function hasMaterialAndHeatSignal(input: ReviewInput) {
  return /material|materials|heat resistance|heat-resistant|temperature|耐熱|耐热|材質|材料|溫度|温度|내열|내열온도|재질|소재|온도/i.test(
    input.labelText
  );
}

function hasReusableDisposableSignal(input: ReviewInput) {
  return /reusable|disposable|single[-\s]?use|one[-\s]?time use|reuse|do not reuse|重複性使用|重複使用|一次性使用|一次性|可重複|不可重複|不得重複|재사용|반복\s*사용|일회용|1회용|재사용\s*금지/i.test(
    input.labelText
  );
}

function hasPvcPvdcSignal(input: ReviewInput) {
  return /\bPVC\b|\bPVDC\b|polyvinyl chloride|vinylidene chloride|聚氯乙烯|聚偏二氯乙烯|염화비닐|폴리염화비닐|폴리염화비닐리덴/i.test(
    reviewText(input)
  );
}

function hasPvcPvdcWarning(input: ReviewInput) {
  return /not directly contact.*(?:high[-\s]?fat|high[-\s]?temperature)|high[-\s]?fat.*high[-\s]?temperature|不得直接接觸高油脂及高溫食品|不得直接接觸.*高油脂|高油脂.*高溫|高脂.*高温|고지방.*고온|고온.*고지방|직접\s*접촉\s*금지/i.test(
    input.labelText
  );
}

function hasFoodContactHighHeatUseSignal(input: ReviewInput) {
  return /microwave|oven|hot food|hot soup|high[-\s]?temperature|boiling|freezer|dishwasher|微波|烤箱|高溫|高温|熱食|熱湯|冷凍|洗碗機|전자레인지|오븐|고온|뜨거운|열탕|냉동|식기세척기/i.test(
    reviewText(input)
  );
}

function hasFoodContactSanitationEvidence(input: ReviewInput) {
  return /sanitation\/migration test report|migration test report|sanitation test report|standard tests?|certificate of analysis|\bCOA\b|material safety file|material safety report|BPA[-\s]?free|bisphenol A free|phthalate[-\s]?free|DEHP[-\s]?free|DNOP[-\s]?free|DBP[-\s]?free|BBP[-\s]?free|no discoloration|off[-\s]?odor|foreign matter|(?:檢驗報告|卫生标准|衛生標準|溶出試驗|雙酚A|不含雙酚A|鄰苯二甲酸酯|不得添加|시험성적서|위생기준|용출시험|재질\s*시험|BPA\s*프리|프탈레이트\s*프리|무첨가|불검출|확보|보유|준비)/i.test(
    reviewText(input)
  );
}

function hasRecycledPlasticFoodRepackagingRisk(input: ReviewInput) {
  const text = reviewText(input);
  const recycled = /recycled|recycle|post[-\s]?consumer|\bPCR\b|reused plastic|回收|再生塑膠|再生塑料|재활용|재생\s*플라스틱|재사용\s*플라스틱/i.test(text);
  const repackaging = /repackag|re-packag|pack food|food packing|重新包裝食品|回收.*包裝食品|食品.*重新包裝|식품\s*재포장|식품\s*소분\s*포장|재포장용/i.test(text);
  return recycled && repackaging;
}

function hasInfantBottleSignal(input: ReviewInput) {
  return /infant feeding bottle|baby bottle|feeding bottle|baby milk bottle|嬰兒奶瓶|婴儿奶瓶|奶瓶|유아용\s*젖병|영아용\s*젖병|젖병/i.test(
    reviewText(input)
  );
}

function hasBpaFreeSignal(input: ReviewInput) {
  return /BPA[-\s]?free|bisphenol A free|not contain(?:s)? BPA|no BPA|不含雙酚A|不得含雙酚A|無雙酚A|无双酚A|BPA無添加|BPA\s*프리|비스페놀\s*A\s*불검출|비스페놀A\s*무첨가/i.test(
    reviewText(input)
  );
}

function hasBpaPresentRiskSignal(input: ReviewInput) {
  if (hasBpaFreeSignal(input)) return false;
  return /(?:contains?|with|含有|添加|함유|첨가).{0,30}(?:BPA|bisphenol A|雙酚A|双酚A|비스페놀\s*A)|(?:BPA|bisphenol A|雙酚A|双酚A|비스페놀\s*A).{0,30}(?:contains?|added|plasticizer|含有|添加|함유|첨가)/i.test(
    reviewText(input)
  );
}

function hasChildrenUnderThreeSignal(input: ReviewInput) {
  return /children under three|children under 3|under three years|under 3 years|toddler|infant utensil|baby utensil|baby tableware|三歲以下|三岁以下|嬰幼兒|婴幼儿|유아용|영유아|3세\s*미만|세\s*살\s*미만/i.test(
    reviewText(input)
  );
}

function hasPhthalateFreeEvidence(input: ReviewInput) {
  return /phthalate[-\s]?free|DEHP[-\s]?free|DNOP[-\s]?free|DBP[-\s]?free|BBP[-\s]?free|no\s+(?:DEHP|DNOP|DBP|BBP|phthalates?)|not\s+detected.{0,30}(?:DEHP|DNOP|DBP|BBP|phthalate)|不含(?:DEHP|DNOP|DBP|BBP|鄰苯二甲酸酯)|未檢出(?:DEHP|DNOP|DBP|BBP|鄰苯二甲酸酯)|不得添加(?:DEHP|DNOP|DBP|BBP)|프탈레이트\s*프리|프탈레이트\s*무첨가|(?:DEHP|DNOP|DBP|BBP)\s*불검출/i.test(
    reviewText(input)
  );
}

function hasRestrictedPhthalateRiskSignal(input: ReviewInput) {
  if (hasPhthalateFreeEvidence(input)) return false;
  return /(?:contains?|with|added|plasticizer|含有|添加|增塑劑|塑化劑|함유|첨가|가소제).{0,40}(?:DEHP|DNOP|DBP|BBP|phthalate|鄰苯二甲酸酯|邻苯二甲酸酯|프탈레이트)|(?:DEHP|DNOP|DBP|BBP|phthalate|鄰苯二甲酸酯|邻苯二甲酸酯|프탈레이트).{0,40}(?:contains?|added|plasticizer|含有|添加|增塑劑|塑化劑|함유|첨가|가소제)/i.test(
    reviewText(input)
  );
}

function hasImporterOperatingDetails(input: ReviewInput) {
  return /imported product category|product category|storage place|warehouse|repackag(?:e|ing)|no repackaging|no re-packaging|輸入產品類別|輸入產品項目|貯存場所|儲存場所|倉儲|分裝|無分裝|无分装|수입\s*제품\s*범주|제품\s*카테고리|보관장소|창고|소분|재포장|소분\s*없음|재포장\s*없음/i.test(
    reviewText(input)
  );
}

function hasShellfishSignal(input: ReviewInput) {
  return /shellfish|mollusk|mollusc|clam|oyster|mussel|scallop|abalone|cockle|aquatic invertebrate|squid|cuttlefish|octopus|패류|조개|굴|홍합|가리비|전복|오징어|문어|貝類|貝|牡蠣|蛤|蛤蜊|淡菜|扇貝|鮑魚|魷魚|烏賊|章魚/i.test(
    reviewText(input)
  );
}

function isHs0307Shellfish(input: ReviewInput) {
  if (hsCodeStartsWith(input, ["0307"])) return true;
  return hasShellfishSignal(input) && !hasHsClassification(input);
}

function hasHealthCertificate(input: ReviewInput) {
  return /health certificate|sanitary certificate|official certificate|catching area|harvest area|competent authority|衛生證明|卫生证明|官方證明|官方证明|捕撈區域|捕捞区域|採收區域|采收区域|主管機關|主管机关|위생증명서|보건증명서|채취\s*해역|어획\s*해역|수출국\s*기관/i.test(
    reviewText(input)
  );
}

function hasSystematicInspectionClearance(input: ReviewInput) {
  return /systematic inspection approval|market access approval|approved establishment|establishment approval|document review completed|systematic inspection exemption|bilateral agreement|系統性查核.*核准|系統性檢查.*核准|市場准入|核准輸入|合格名單|제도검사\s*승인|시스템\s*검사\s*승인|시장접근\s*승인|승인\s*작업장|면제/i.test(
    reviewText(input)
  );
}

function isPotentialSystematicInspectionFood(input: ReviewInput) {
  const scopeText = `${input.productName} ${input.productType} ${input.hsCode ?? ""}`;
  return (
    hsCodeStartsWith(input, ["02", "03", "04"]) ||
    /meat|beef|pork|poultry|livestock|seafood|fishery|aquatic|shellfish|mollusk|dairy product|egg product|육류|소고기|돼지고기|가금|축산|수산|해산물|패류|유제품|난제품|肉|牛肉|豬肉|禽|畜產|水產|海鮮|貝類|乳品|蛋品/i.test(scopeText)
  );
}

function addTradeFindings(input: ReviewInput, findings: Finding[]) {
  if (hasHsClassification(input)) {
    findings.push({
      id: "trade-hs-present",
      status: "pass",
      area: "통관",
      title: "HS/CCC 분류 정보가 입력되어 있습니다",
      severity: "low",
      why: "수입 신고, 관세율, 식품·화장품 품목별 규제 연결은 HS 또는 대만 CCC 코드 확인에서 시작됩니다.",
      fix: ["인보이스, 패킹리스트, 수입신고 초안의 HS/CCC 코드가 같은지 확인", "제품 용도와 성분 기준으로 관세사 또는 대만 수입자와 최종 분류 대조"],
      source: SOURCE_WCO_HS,
      sourceUrl: SOURCE_WCO_HS_URL,
      evidence: "HS/CCC"
    });
  } else {
    findings.push({
      id: "trade-hs-needed",
      status: "needs_info",
      area: "통관",
      title: "HS/CCC 코드 분류 확인 필요",
      severity: "medium",
      why: "대만 수입 전에는 제품의 HS 또는 대만 CCC 분류를 확정해야 관세, 검사 대상, 식품·화장품 관련 수입 요건을 연결할 수 있습니다.",
      fix: ["제품명, 용도, 전성분, 제조공정, 포장 형태를 기준으로 HS 후보를 1개 이상 입력", "대만 수입자 또는 관세사와 CCC 세번 및 검사 대상 여부 확인"],
      source: SOURCE_WCO_HS,
      sourceUrl: SOURCE_WCO_HS_URL
    });
  }

  if (hasOriginSignal(input)) {
    findings.push({
      id: "trade-origin-present",
      status: "pass",
      area: "통관",
      title: "원산지 정보가 입력되어 있습니다",
      severity: "low",
      why: "원산지는 라벨, 인보이스, 포장, 수입 신고 정보가 서로 다르면 통관 보류나 수정 요청으로 이어질 수 있습니다.",
      fix: ["원산지 문구가 라벨, 인보이스, 포장 박스, 원산지 증명 자료에서 일치하는지 확인"],
      source: SOURCE_TW_ORIGIN,
      sourceUrl: SOURCE_TW_ORIGIN_URL,
      evidence: input.origin || "label origin"
    });
  } else {
    findings.push({
      id: "trade-origin-needed",
      status: "needs_info",
      area: "통관",
      title: "원산지 표시와 증빙 확인 필요",
      severity: "medium",
      why: "대만 수입·판매 과정에서는 라벨 원산지와 통관 서류 원산지가 서로 맞아야 합니다.",
      fix: ["제조국, 최종 실질변형 국가, 원산지 증명 가능 여부를 입력", "라벨의 Made in 문구와 인보이스 원산지를 일치시킴"],
      source: SOURCE_TW_ORIGIN,
      sourceUrl: SOURCE_TW_ORIGIN_URL
    });
  }

  if (hasTaiwanImporter(input)) {
    findings.push({
      id: "trade-importer-present",
      status: "pass",
      area: "통관",
      title: "대만 수입자/책임업자 정보가 입력되어 있습니다",
      severity: "low",
      why: "대만 시장 유통 전에는 수입자 또는 책임업자의 표시·신고·서류 보관 역할이 중요합니다.",
      fix: ["수입자 상호, 주소, 연락처가 중국어 라벨과 신고 자료에서 일치하는지 확인"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL,
      evidence: "Taiwan importer"
    });
  } else {
    findings.push({
      id: "trade-importer-needed",
      status: "needs_info",
      area: "통관",
      title: "대만 수입자/책임업자 정보 확인 필요",
      severity: "medium",
      why: "식품과 화장품 모두 실제 수입·판매 단계에서 대만 측 책임 주체와 연락처가 라벨, 신고, 서류 보관 흐름에 연결됩니다.",
      fix: ["대만 수입자 상호, 주소, 연락처를 확보", "라벨 표시명과 신고 주체가 같은지 확인"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL
    });
  }

  if (!hasInvoiceValue(input)) {
    findings.push({
      id: "trade-invoice-value-needed",
      status: "needs_info",
      area: "통관",
      title: "인보이스 금액 확인 필요",
      severity: "medium",
      why: "통관 검토에는 제품 수량, 거래조건, 인보이스 금액, 샘플/판매품 여부가 함께 필요합니다.",
      fix: ["상업송장 금액, 통화, Incoterms, 샘플 여부를 입력", "라벨 검토 결과와 출하 서류의 제품명이 일치하는지 확인"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL
    });
  }

  if (hasIncoterms(input)) {
    findings.push({
      id: "trade-incoterms-present",
      status: "pass",
      area: "통관",
      title: "거래조건(Incoterms)이 입력되어 있습니다",
      severity: "low",
      why: "운임, 보험, 통관 책임 범위는 서류 준비와 비용 산정에 직접 연결됩니다.",
      fix: ["상업송장, 견적서, 물류 의뢰서의 Incoterms가 같은지 확인"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL,
      evidence: input.incoterms || "Incoterms"
    });
  } else {
    findings.push({
      id: "trade-incoterms-needed",
      status: "needs_info",
      area: "통관",
      title: "거래조건(Incoterms) 확인 필요",
      severity: "medium",
      why: "수출입 비용, 보험, 운송 책임, 수입자 부담 범위를 판단하려면 EXW, FOB, CIF, DAP, DDP 같은 거래조건이 필요합니다.",
      fix: ["상업송장 또는 견적서 기준 Incoterms와 도착지를 입력", "샘플 발송이라도 운임·보험·수입자 부담 범위를 명시"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL
    });
  }

  if (hasShipmentPurpose(input)) {
    findings.push({
      id: "trade-shipment-purpose-present",
      status: "pass",
      area: "통관",
      title: "출하 목적이 입력되어 있습니다",
      severity: "low",
      why: "판매품, 샘플, 데모, 시험용, 반품/수리품 여부는 신고 문구와 요구 서류를 바꿀 수 있습니다.",
      fix: ["인보이스의 목적 문구와 실제 출하 목적이 일치하는지 확인"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL,
      evidence: input.shipmentPurpose || "shipment purpose"
    });
  } else {
    findings.push({
      id: "trade-shipment-purpose-needed",
      status: "needs_info",
      area: "통관",
      title: "출하 목적 확인 필요",
      severity: "medium",
      why: "상업 판매, 샘플, 데모, 시험용, 반품/수리품 여부에 따라 인보이스 문구와 통관 서류가 달라질 수 있습니다.",
      fix: ["판매품/샘플/데모/시험용/반품 중 하나로 목적을 입력", "무료 샘플도 합리적인 신고 금액과 용도를 문서화"],
      source: SOURCE_TW_TRADE,
      sourceUrl: SOURCE_TW_TRADE_URL
    });
  }

  if (hasStrategicGoodsSignal(input)) {
    findings.push({
      id: "trade-shtc-review-needed",
      status: "needs_info",
      area: "통관",
      title: "전략물자/SHTC 수출통제 검토 필요",
      severity: "high",
      why: "AI 가속기, 반도체, 암호화, 센서, 드론, 레이저 등은 식품·화장품과 별도로 전략물자 또는 이중용도 수출통제 검토가 필요할 수 있습니다.",
      fix: ["제품 사양서와 ECCN/전략물자 판정 이력을 확보", "대만 SHTC 및 수출국 통제 목록을 함께 대조", "최종 사용자와 최종 용도 확인서를 별도 보관"],
      source: SOURCE_TW_SHTC,
      sourceUrl: SOURCE_TW_SHTC_URL
    });
  }
}

function addFoodImportFindings(input: ReviewInput, findings: Finding[]) {
  if (!isImportedFoodContext(input)) return;

  const missingInspectionDocs = [
    !hasFoodInspectionApplication(input) ? "수입식품 검사 신청서" : null,
    !hasProductInformationSheet(input) ? "제품정보표 또는 제품정보 신고서" : null,
    !hasImportDeclarationCopy(input) ? "수입신고서 사본" : null
  ].filter(Boolean) as string[];

  if (missingInspectionDocs.length > 0) {
    findings.push({
      id: "food-import-inspection-docs-needed",
      status: "needs_info",
      area: "서류",
      title: "수입식품 검사 신청 서류 묶음 확인 필요",
      severity: "medium",
      why: "대만 수입식품 검사는 입항 전 신청과 함께 검사 신청서, 제품정보 신고서, 수입신고서 사본 및 TFDA가 요구하는 자료를 제출하는 구조입니다.",
      fix: [
        `${missingInspectionDocs.join(", ")} 준비 여부 확인`,
        "입항 예정일 15일 전부터 신청 가능한 일정인지 수입자·관세사와 확인",
        "전자파일 제출본의 제품명, 원산지, 제조자, HS/CCC 코드가 송장·라벨과 일치하는지 대조"
      ],
      source: SOURCE_FOOD_IMPORT_INSPECTION,
      sourceUrl: SOURCE_FOOD_IMPORT_INSPECTION_URL,
      evidence: missingInspectionDocs.join(" / ")
    });
  } else {
    findings.push({
      id: "food-import-inspection-docs-present",
      status: "pass",
      area: "서류",
      title: "수입식품 검사 신청 핵심 서류가 입력되어 있습니다",
      severity: "low",
      why: "검사 신청서, 제품정보 신고서, 수입신고서 사본 신호가 함께 확인되어 수입검사 신청 패킷의 기본 뼈대가 갖춰진 상태입니다.",
      fix: ["TFDA 추가 요청 자료와 원본 서류 파일명을 출하 lot 기준으로 보관", "전자 제출본과 인보이스·라벨·포장 박스의 제품 식별값을 마지막으로 대조"],
      source: SOURCE_FOOD_IMPORT_INSPECTION,
      sourceUrl: SOURCE_FOOD_IMPORT_INSPECTION_URL,
      evidence: "inspection application / product information / import declaration"
    });
  }

  const missingRegistrationItems = [
    !hasFoodBusinessRegistration(input) ? "식품업자 등록 또는 등록번호" : null,
    !hasProductLiabilityInsurance(input) ? "제품책임보험" : null,
    !hasImporterOperatingDetails(input) ? "수입 품목 범주·보관장소·소분/재포장 정보" : null
  ].filter(Boolean) as string[];

  if (missingRegistrationItems.length > 0) {
    findings.push({
      id: "food-importer-registration-needed",
      status: "needs_info",
      area: "통관",
      title: "대만 식품 수입업자 등록 정보 확인 필요",
      severity: "medium",
      why: "식품 수입업자는 일반 수입자 표시와 별개로 식품업자 등록, 제품책임보험, 수입 품목 범주, 보관·소분 활동 정보를 갖춰야 합니다.",
      fix: [
        `${missingRegistrationItems.join(", ")}를 대만 수입자에게 요청`,
        "라벨의 수입자명과 식품업자 등록 주체가 같은지 확인",
        "보관장소와 소분/재포장 여부가 실제 물류 흐름과 일치하는지 문서화"
      ],
      source: SOURCE_FOOD_BUSINESS_REGISTRATION,
      sourceUrl: SOURCE_FOOD_BUSINESS_REGISTRATION_URL,
      evidence: missingRegistrationItems.join(" / ")
    });
  } else {
    findings.push({
      id: "food-importer-registration-present",
      status: "pass",
      area: "통관",
      title: "식품 수입업자 등록·보험·운영 정보가 입력되어 있습니다",
      severity: "low",
      why: "식품업자 등록, 제품책임보험, 수입 품목 범주와 보관 또는 소분 흐름이 함께 확인되어 수입자 측 운영 정보가 연결되어 있습니다.",
      fix: ["등록번호, 보험 증권, 보관장소 자료를 출하 lot 문서철에 함께 보관", "변경 시 라벨 책임업자 정보와 신고 자료를 동시에 업데이트"],
      source: SOURCE_FOOD_BUSINESS_REGISTRATION,
      sourceUrl: SOURCE_FOOD_BUSINESS_REGISTRATION_URL,
      evidence: "food business registration / liability insurance / operating details"
    });
  }

  if (isHs0307Shellfish(input)) {
    if (hasHealthCertificate(input)) {
      findings.push({
        id: "food-import-hs0307-health-certificate-present",
        status: "pass",
        area: "서류",
        title: "HS 0307 패류 위생증명서 신호가 확인되었습니다",
        severity: "low",
        why: "HS 0307로 분류되는 식용 패류는 수출국 권한기관이 발급한 위생증명서와 채취 또는 어획 해역 정보가 요구됩니다.",
        fix: ["증명서 발급기관, 채취/어획 해역, 제품명, lot 번호가 수입신고 자료와 맞는지 확인"],
        source: SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE,
        sourceUrl: SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE_URL,
        evidence: "health certificate / harvest area"
      });
    } else {
      findings.push({
        id: "food-import-hs0307-health-certificate-needed",
        status: "needs_info",
        area: "서류",
        title: "HS 0307 패류 위생증명서 필요 여부 확인",
        severity: "high",
        why: "식용으로 수입되는 HS 0307 패류는 수출국 공식 권한기관이 발급한 위생증명서와 채취 또는 어획 해역 정보를 동반해야 합니다.",
        fix: [
          "수출국 권한기관 발급 위생증명서 확보",
          "채취/어획 해역, 제품명, lot 번호, 제조자 정보가 서류 전체에서 일치하는지 확인",
          "HS/CCC 코드가 0307 계열인지 관세사와 재확인"
        ],
        source: SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE,
        sourceUrl: SOURCE_FOOD_SHELLFISH_HEALTH_CERTIFICATE_URL,
        evidence: input.hsCode || "shellfish or mollusk signal"
      });
    }
  }

  if (hasHsClassification(input)) {
    findings.push({
      id: "food-import-batch-consistency-review",
      status: "needs_info",
      area: "통관",
      title: "동일 검사 신청 묶음의 CCC·제품 식별값 일치 확인",
      severity: "low",
      why: "대만 수입식품 검사 신청의 같은 선적 묶음은 수입신고, CCC 코드, 제품명, 성분, 브랜드, 생산자, 원산지가 일치해야 합니다.",
      fix: ["인보이스·패킹리스트·라벨·제품정보표의 CCC 코드와 제품 식별값 비교", "혼재 선적이면 검사 신청을 나누어야 하는 품목이 있는지 확인"],
      source: SOURCE_FOOD_IMPORT_INSPECTION,
      sourceUrl: SOURCE_FOOD_IMPORT_INSPECTION_URL,
      evidence: input.hsCode || "HS/CCC"
    });
  }

  if (isPotentialSystematicInspectionFood(input)) {
    findings.push({
      id: hasSystematicInspectionClearance(input)
        ? "food-systematic-inspection-approval-present"
        : "food-systematic-inspection-approval-needed",
      status: hasSystematicInspectionClearance(input) ? "pass" : "needs_info",
      area: "통관",
      title: hasSystematicInspectionClearance(input)
        ? "제도검사 승인 또는 면제 신호가 확인되었습니다"
        : "제도검사 대상 식품 여부 확인 필요",
      severity: hasSystematicInspectionClearance(input) ? "low" : "medium",
      why: "일부 축산물·수산물·유제품 등은 개별 선적의 수입검사 이전에 수출국 식품안전 관리체계에 대한 문서심사 또는 현장심사 승인 흐름이 연결될 수 있습니다.",
      fix: hasSystematicInspectionClearance(input)
        ? ["승인 작업장, 적용 품목, 유효 범위가 현재 제품과 같은지 확인"]
        : ["HS/CCC와 제품 유형이 제도검사 범위에 들어가는지 확인", "수출국 또는 지정 작업장 승인·면제 이력을 수입자에게 요청"],
      source: SOURCE_FOOD_SYSTEMATIC_INSPECTION,
      sourceUrl: SOURCE_FOOD_SYSTEMATIC_INSPECTION_URL
    });
  }
}

function addFoodAdditiveProductFindings(input: ReviewInput, findings: Finding[]) {
  if (!isFoodAdditiveProduct(input)) return;

  const additiveEntries = matchedFoodAdditiveEntries(input, 6);
  const additiveEvidence = additiveEntries
    .map((entry) => `${entry.term.canonical_name} / ${entry.alias.value}`)
    .join(" · ");

  if (hasFoodAdditiveRegistrationEvidence(input)) {
    findings.push({
      id: "food-additive-inspection-registration-present",
      status: "pass",
      area: "서류",
      title: "식품첨가물 查驗登記 또는 허가 신호가 확인되었습니다",
      severity: "low",
      why: "제품 자체가 식품첨가물 또는 식품첨가물 원료로 보이며, 입력 자료에서 대만 식품첨가물 검사등록·허가증·등록번호 신호가 확인되었습니다.",
      fix: ["허가증의 품명, 성분명, 제조자, 수입자가 인보이스·라벨·제품정보표와 같은지 대조", "허가 유효기간과 적용 범위가 현재 lot와 맞는지 확인"],
      source: SOURCE_FOOD_ADDITIVE_REGISTRATION,
      sourceUrl: SOURCE_FOOD_ADDITIVE_REGISTRATION_URL,
      evidence: additiveEvidence || "food additive registration signal"
    });
  } else {
    findings.push({
      id: "food-additive-inspection-registration-needed",
      status: "needs_info",
      area: "서류",
      title: "식품첨가물 제품의 查驗登記/허가 필요 여부 확인",
      severity: "high",
      why: "대만에서 식품첨가물 원료 또는 첨가물 제품으로 수입·판매되는 경우 일반 가공식품 라벨 검토와 별도로 식품첨가물 검사등록, 허가 문서, 품목별 적용 범위 확인이 필요합니다.",
      fix: [
        "대만 수입자에게 식품첨가물 查驗登記 또는 허가증 보유 여부 요청",
        "단방/복방 여부, 사용 목적, 식품 유형, 성분 함량을 제품정보표와 조성표에 맞춰 정리",
        "허가 대상이 아니라는 판단이면 예외 근거와 공식 회신을 lot 문서철에 보관"
      ],
      source: SOURCE_FOOD_ADDITIVE_REGISTRATION,
      sourceUrl: SOURCE_FOOD_ADDITIVE_REGISTRATION_URL,
      evidence: additiveEvidence || "food additive product identity"
    });
  }

  if (!isCompoundFoodAdditiveProduct(input)) return;

  const missingCompoundDocs = [
    !hasCompoundFoodAdditiveCompositionReport(input) ? "제품 성분 보고서 또는 조성표" : null,
    !hasHealthCertificate(input) ? "수출국 공식 위생증명서" : null
  ].filter(Boolean) as string[];

  if (missingCompoundDocs.length > 0) {
    findings.push({
      id: "compound-food-additive-import-docs-needed",
      status: "needs_info",
      area: "서류",
      title: "복방 식품첨가물 수입서류 확인 필요",
      severity: "high",
      why: "복방 식품첨가물은 일반 식품첨가물 등록 확인과 별도로 제품 성분 보고서, 공식 위생증명서 등 수입 단계에서 요구될 수 있는 자료를 묶어 확인해야 합니다.",
      fix: [
        `${missingCompoundDocs.join(", ")} 확보 여부를 대만 수입자와 확인`,
        "성분별 함량, 기능, 식품첨가물 통용명, 제조국 발급기관 정보를 제품정보표와 일치시킴",
        "복방 첨가물명과 개별 첨가물명이 중국어 라벨·송장·허가문서에서 같은 체계로 쓰였는지 대조"
      ],
      source: SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS,
      sourceUrl: SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS_URL,
      evidence: missingCompoundDocs.join(" / ")
    });
  } else {
    findings.push({
      id: "compound-food-additive-import-docs-present",
      status: "pass",
      area: "서류",
      title: "복방 식품첨가물 핵심 수입서류 신호가 확인되었습니다",
      severity: "low",
      why: "복방 식품첨가물로 보이는 제품에 대해 성분 보고서와 공식 위생증명서 신호가 함께 확인되어 수입 서류 패킷의 핵심 축이 잡혀 있습니다.",
      fix: ["발급기관, 제품명, 조성비, lot, 제조자가 모든 수입 서류에서 일치하는지 최종 대조", "대만 수입자가 요구하는 추가 TFDA 보완자료가 있는지 입항 전 확인"],
      source: SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS,
      sourceUrl: SOURCE_COMPOUND_FOOD_ADDITIVE_IMPORT_DOCS_URL,
      evidence: "composition report / official health certificate"
    });
  }
}

function addCosmeticMarketAccessFindings(input: ReviewInput, findings: Finding[]) {
  if (!isCosmeticProduct(input)) return;

  if (hasCosmeticProductNotification(input)) {
    findings.push({
      id: "cosmetic-product-notification-present",
      status: "pass",
      area: "서류",
      title: "화장품 제품등록/제품통보 신호가 확인되었습니다",
      severity: "low",
      why: "대만 화장품은 제품 공급 전 제품등록 또는 제품통보 흐름과 수입자 책임 정보를 맞춰야 합니다. 입력 자료에서 등록번호 또는 제품등록 플랫폼 신호가 확인되었습니다.",
      fix: ["등록 제품명, 제조자, 수입자, 전성분명이 라벨과 PIF 자료에서 일치하는지 확인", "변경사항이 있으면 등록 자료와 라벨을 같은 버전으로 관리"],
      source: SOURCE_COSMETIC_PRODUCT_NOTIFICATION,
      sourceUrl: SOURCE_COSMETIC_PRODUCT_NOTIFICATION_URL,
      evidence: "product notification / registration"
    });
  } else {
    findings.push({
      id: "cosmetic-product-notification-needed",
      status: "needs_info",
      area: "서류",
      title: "화장품 제품등록/제품통보 자료 확인 필요",
      severity: "medium",
      why: "대만 화장품 공급 전에는 제품등록 또는 제품통보 흐름, 수입자 책임자 정보, 제품명·제조자·전성분 자료의 일치 여부를 확인해야 합니다.",
      fix: ["대만 수입자에게 化粧品產品登錄 번호 또는 등록 진행 상태 요청", "제품명, 제조자, 책임업자, 전성분명이 중문 라벨·PIF와 같은지 대조"],
      source: SOURCE_COSMETIC_PRODUCT_NOTIFICATION,
      sourceUrl: SOURCE_COSMETIC_PRODUCT_NOTIFICATION_URL
    });
  }

  if (hasCosmeticPifEvidence(input)) {
    findings.push({
      id: "cosmetic-pif-readiness-present",
      status: "pass",
      area: "서류",
      title: "PIF 또는 안전성 평가 자료 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 제품정보파일(PIF), 안전성 평가 또는 관련 보유 자료 신호가 확인되었습니다.",
      fix: ["전성분·함량, 제조공정, 품질규격, 안정성, 안전성 평가 서명 자료가 빠짐없이 묶였는지 확인", "PIF 보관 주체와 대만 수입자 연락 정보를 제품등록 자료와 맞춤"],
      source: SOURCE_PIF,
      sourceUrl: SOURCE_PIF_URL,
      evidence: "PIF / safety assessment"
    });
  } else {
    findings.push({
      id: "cosmetic-pif-readiness-needed",
      status: "needs_info",
      area: "서류",
      title: "PIF 준비도 확인 필요",
      severity: Date.now() >= PIF_EFFECTIVE_AT ? "high" : "medium",
      why: "대만 PIF 확대 시행 일정에 맞춰 제품정보파일, 안전성 평가, 원료·제조·품질 자료 보유 여부를 판매 전 확인해야 합니다.",
      fix: ["PIF 체크리스트로 전성분 함량, 제조공정, 안정성, 독성, 기능 근거, 안전성 평가 서명 자료를 회수", "수제 고형비누 등 예외 가능성이 있으면 예외 근거를 별도 문서로 보관"],
      source: SOURCE_PIF,
      sourceUrl: SOURCE_PIF_URL
    });
  }

  if (hasCosmeticGmpEvidence(input)) {
    findings.push({
      id: "cosmetic-gmp-readiness-present",
      status: "pass",
      area: "서류",
      title: "화장품 GMP 또는 ISO 22716 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 화장품 GMP, 우수 제조관리 또는 ISO 22716 신호가 확인되어 제조 품질관리 증빙 축이 잡혀 있습니다.",
      fix: ["GMP/ISO 22716 인증 범위가 현재 제조소와 제품군에 적용되는지 확인", "인증서 유효기간과 제조소 주소가 PIF·라벨의 제조자 정보와 같은지 대조"],
      source: SOURCE_COSMETIC_GMP,
      sourceUrl: SOURCE_COSMETIC_GMP_URL,
      evidence: "GMP / ISO 22716"
    });
  } else {
    findings.push({
      id: "cosmetic-gmp-readiness-needed",
      status: "needs_info",
      area: "서류",
      title: "화장품 GMP/제조품질 증빙 확인 필요",
      severity: "medium",
      why: "대만 화장품 공급 준비에서는 제조소의 GMP 또는 제조품질관리 증빙과 PIF·제품등록 자료의 제조자 정보가 맞는지 확인해야 합니다.",
      fix: ["제조사에 화장품 GMP, ISO 22716 또는 동등한 제조품질관리 증빙 요청", "인증 범위, 제조소 주소, 제품군, 유효기간을 PIF와 제품등록 자료에 연결"],
      source: SOURCE_COSMETIC_GMP,
      sourceUrl: SOURCE_COSMETIC_GMP_URL
    });
  }
}

function addCosmeticPostMarketFindings(input: ReviewInput, findings: Finding[]) {
  if (!isCosmeticProduct(input)) return;

  if (hasCosmeticAdverseReportingReadiness(input)) {
    findings.push({
      id: "cosmetic-adverse-reporting-present",
      status: "pass",
      area: "서류",
      title: "화장품 이상반응·위생안전 위해 통보 체계 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 이상사례/중대한 이상반응, 15일 내 보고, QMS 또는 소비자 불만 모니터링 신호가 확인되어 판매 후 감시 축이 잡혀 있습니다.",
      fix: ["대만 수입자와 보고 책임자, 접수 채널, 15일 내 통보 기준, 긴급 위해 시 즉시 통보 흐름을 운영 SOP에 연결"],
      source: SOURCE_COSMETIC_ADVERSE_REPORTING,
      sourceUrl: SOURCE_COSMETIC_ADVERSE_REPORTING_URL,
      evidence: "adverse event / reporting procedure"
    });
  } else {
    findings.push({
      id: "cosmetic-adverse-reporting-needed",
      status: "needs_info",
      area: "서류",
      title: "화장품 이상반응·위생안전 위해 통보 절차 확인 필요",
      severity: "medium",
      why: "대만 화장품 영업자는 중대한 이상반응이나 위생안전 위해를 알게 된 경우 관할 시스템으로 통보하고 관련 기록을 관리해야 합니다.",
      fix: ["소비자 불만/이상사례 접수 SOP, 중대한 이상반응 판단 기준, 15일 내 보고 책임자, 긴급 위해 즉시 통보 연락망을 수입자와 확정"],
      source: SOURCE_COSMETIC_ADVERSE_REPORTING,
      sourceUrl: SOURCE_COSMETIC_ADVERSE_REPORTING_URL
    });
  }

  if (hasCosmeticRecallReadiness(input)) {
    findings.push({
      id: "cosmetic-recall-procedure-present",
      status: "pass",
      area: "서류",
      title: "화장품 회수·리콜 절차 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 회수 SOP, 회수 계획, 판매자 통지 또는 CAPA 신호가 확인되어 위해 발생 시 회수 실행 구조를 연결할 수 있습니다.",
      fix: ["회수 등급, 대상 로트, 판매처 통보, 회수 수량 집계, 완료보고서 양식을 제품별 운영 파일에 묶어 두세요."],
      source: SOURCE_COSMETIC_RECALL,
      sourceUrl: SOURCE_COSMETIC_RECALL_URL,
      evidence: "recall procedure / CAPA"
    });
  } else {
    findings.push({
      id: "cosmetic-recall-procedure-needed",
      status: "needs_info",
      area: "서류",
      title: "화장품 회수·리콜 운영 절차 확인 필요",
      severity: "medium",
      why: "대만 화장품 회수 규정은 위해 등급별 회수 조치, 판매자 통지, 회수 계획·기록·완료보고 흐름을 요구합니다.",
      fix: ["Class 1/2/3 회수 판단 기준, 회수 책임자, 판매처 통지 문안, 회수 계획서와 완료보고서 템플릿을 제품 출시 전에 준비"],
      source: SOURCE_COSMETIC_RECALL,
      sourceUrl: SOURCE_COSMETIC_RECALL_URL
    });
  }

  if (hasCosmeticSourceFlowRecords(input)) {
    findings.push({
      id: "cosmetic-source-flow-records-present",
      status: "pass",
      area: "서류",
      title: "공급원·유통흐름 추적 기록 신호가 확인되었습니다",
      severity: "low",
      why: "로트/배치, 수입신고, 공급처 또는 납품처 기록 신호가 있어 대만 공급원·유통흐름 자료 보관 요구에 연결할 수 있습니다.",
      fix: ["제조·수입·출고 로트, 수량, 수령자, 수입신고 번호, 거래일자를 5년 보관 기준으로 정리"],
      source: SOURCE_COSMETIC_SOURCE_FLOW,
      sourceUrl: SOURCE_COSMETIC_SOURCE_FLOW_URL,
      evidence: "source-flow / lot traceability"
    });
  } else {
    findings.push({
      id: "cosmetic-source-flow-records-needed",
      status: "needs_info",
      area: "서류",
      title: "공급원·유통흐름 자료 5년 보관 확인 필요",
      severity: "medium",
      why: "대만 화장품 영업자는 제조·수입·공급원·직접 공급 대상 자료를 로트와 수량 단위로 관리하고 5년 이상 보관해야 합니다.",
      fix: ["제품명, 제조/수입일자, 수량, 로트번호, 공급처·수령처, 수입신고번호와 보관 책임자를 출고 자료에 추가"],
      source: SOURCE_COSMETIC_SOURCE_FLOW,
      sourceUrl: SOURCE_COSMETIC_SOURCE_FLOW_URL
    });
  }
}

const foodLabelRequirements = [
  {
    id: "food-name",
    label: "식품명",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) => Boolean(input.productName.trim()) || /product name|品名|食品名稱|제품명|식품명/i.test(input.labelText)
  },
  {
    id: "food-ingredients",
    label: "원재료명 또는 성분",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) => Boolean(input.ingredientsText.trim()) || /ingredients|成分|原料|원재료|성분/i.test(input.labelText)
  },
  {
    id: "food-net-contents",
    label: "내용량",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) => /net|contents|weight|volume|內容量|净含量|淨重|重量|용량|중량|\b\d+(?:\.\d+)?\s*(g|kg|ml|l)\b/i.test(input.labelText)
  },
  {
    id: "food-expiry",
    label: "유통기한 또는 소비기한",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) => /expiry|expiration|best before|use by|EXP|有效日期|保存期限|賞味期限|유통기한|소비기한/i.test(input.labelText)
  },
  {
    id: "food-origin",
    label: "원산지",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) => Boolean(input.origin.trim()) || /country of origin|origin|made in|原產地|原产地|產地|원산지|제조국/i.test(input.labelText)
  },
  {
    id: "food-responsible-firm",
    label: "제조업자/수입업자 정보",
    source: SOURCE_FOOD_ACT,
    sourceUrl: SOURCE_FOOD_ACT_URL,
    present: (input: ReviewInput) =>
      Boolean(input.manufacturer.trim()) || /manufacturer|importer|address|tel|製造|進口商|輸入|地址|電話|제조원|수입원|주소|전화/i.test(input.labelText)
  },
  {
    id: "food-nutrition",
    label: "영양표시",
    source: SOURCE_FOOD_NUTRITION,
    sourceUrl: SOURCE_FOOD_NUTRITION_URL,
    present: (input: ReviewInput) => /nutrition|calories|kcal|protein|fat|carbohydrate|sugar|sodium|營養|熱量|蛋白質|脂肪|碳水化合物|糖|鈉|영양|열량|단백질|지방|탄수화물|나트륨/i.test(input.labelText)
  }
];

const taiwanFoodAllergens = [
  { id: "crustacea", label: "crustacea", pattern: /crustacea|shrimp|crab|shellfish|갑각류|새우|게|甲殼|蝦|蟹/i },
  { id: "mango", label: "mango", pattern: /mango|망고|芒果/i },
  { id: "peanut", label: "peanut", pattern: /peanut|땅콩|花生|落花生/i },
  { id: "milk", label: "milk", pattern: /milk|goat milk|casein|lactose|우유|유청|카제인|乳|牛奶|羊奶|酪蛋白/i },
  { id: "egg", label: "egg", pattern: /egg|albumin|난류|계란|달걀|雞蛋|蛋類|蛋黃|蛋白(?!質)|卵白|(?:^|[、,，;；\s])蛋(?:$|[、,，;；\s])/i },
  { id: "nuts", label: "tree nuts", pattern: /almond|walnut|cashew|hazelnut|pistachio|macadamia|견과|아몬드|호두|캐슈|堅果|杏仁|核桃|腰果/i },
  { id: "sesame", label: "sesame", pattern: /sesame|참깨|芝麻/i },
  { id: "gluten", label: "gluten cereals", pattern: /\b(?:wheat|barley|rye|oats?|gluten)\b|밀|보리|호밀|귀리|글루텐|小麥|大麥|黑麥|燕麥|麩質/i },
  { id: "soy", label: "soybean", pattern: /soy|soybean|soya|대두|콩|大豆|黃豆/i },
  { id: "fish", label: "fish", pattern: /fish|gelatine|gelatin|생선|어류|魚|明膠/i },
  { id: "sulphites", label: "sulphites", pattern: /sulphite|sulfite|so2|sulfur dioxide|아황산|이산화황|亞硫酸|二氧化硫/i }
];

const nutritionClaimPatterns = [
  {
    id: "sugar",
    label: "sugar claim",
    pattern: /\b(?:low|no|zero|reduced|less)\s+sugar\b|\bsugar[-\s]?free\b|低糖|無糖|减糖|減糖|無添加糖|무당|무가당|저당|당류\s*(?:제로|0|무첨가|낮춤)/i
  },
  {
    id: "fat",
    label: "fat claim",
    pattern: /\b(?:low|no|zero|reduced|less)\s+fat\b|\bfat[-\s]?free\b|低脂|無脂|減脂|저지방|무지방|지방\s*(?:제로|0|낮춤)/i
  },
  {
    id: "protein",
    label: "protein claim",
    pattern: /\b(?:high|rich in|source of)\s+protein\b|高蛋白|蛋白質來源|고단백|단백질\s*(?:강화|풍부|함유|보충|소스)/i
  },
  {
    id: "fiber",
    label: "fiber claim",
    pattern: /\b(?:high|rich in|source of)\s+fib(?:er|re)\b|高纖|膳食纖維來源|고식이섬유|식이섬유\s*(?:강화|풍부|함유)/i
  },
  {
    id: "sodium",
    label: "sodium claim",
    pattern: /\b(?:low|no|zero|reduced|less)\s+sodium\b|\bsodium[-\s]?free\b|低鈉|減鈉|無鈉|저나트륨|나트륨\s*(?:제로|0|낮춤)/i
  },
  {
    id: "calorie",
    label: "calorie claim",
    pattern: /\b(?:low|reduced|less)\s+(?:calorie|calories|kcal)\b|\blight\b|低熱量|低卡|減熱量|저칼로리|라이트/i
  }
];

function addHealthFoodFindings(input: ReviewInput, findings: Finding[]) {
  const healthFood = hasHealthFoodSignal(input);
  const formulaForCertainDisease = hasFormulaForCertainDiseaseSignal(input);

  if (healthFood) {
    if (hasHealthFoodPermitSignal(input)) {
      findings.push({
        id: "health-food-permit-present",
        status: "pass",
        area: "서류",
        title: "대만 건강식품 허가번호 신호 확인",
        severity: "low",
        why: "대만 건강식품은 제조 또는 수입 전에 검사·등록과 허가가 필요하며, 라벨에는 허가번호가 표시되어야 합니다.",
        fix: ["허가번호가 실제 TFDA 등록 제품과 일치하는지 원문 허가증, 라벨 시안, 광고 문안을 함께 대조하세요."],
        source: SOURCE_HEALTH_FOOD_ACT,
        sourceUrl: SOURCE_HEALTH_FOOD_ACT_URL,
        evidence: "health food permit / permit number"
      });
    } else {
      findings.push({
        id: "health-food-permit-needed",
        status: "needs_info",
        area: "서류",
        title: "대만 건강식품 허가번호 확인 필요",
        severity: "medium",
        why: "건강식품 또는 기능성 효능 표현 신호가 있지만, 대만 건강식품 허가번호나 검사·등록 근거가 입력되지 않았습니다.",
        fix: [
          "TFDA 건강식품 허가증 또는 제품등록 허가번호를 확보하세요.",
          "허가가 없는 제품은 라벨·광고에서 건강식품, 승인 효능, 표준로고를 사용하지 않도록 문안을 분리하세요.",
          "수입 전 성분, 규격, 효능, 제조공정 요약, 시험자료, 라벨 시안 제출 범위를 확인하세요."
        ],
        source: SOURCE_HEALTH_FOOD_ACT,
        sourceUrl: SOURCE_HEALTH_FOOD_ACT_URL,
        evidence: "health food / functional claim signal without permit number"
      });
    }

    if (!hasHealthFoodLogoSignal(input) || !hasHealthFoodIntakeWarningSignal(input) || !hasApprovedHealthCareEffectSignal(input)) {
      findings.push({
        id: "health-food-label-items-review",
        status: "warn",
        area: "식품표시",
        title: "건강식품 필수 라벨 항목 검토 필요",
        severity: "medium",
        why: "건강식품 라벨은 일반 포장식품 표시 외에 승인 보건효능, 허가번호, 건강식품 문구와 표준로고, 권장섭취량, 경고문, 영양성분을 함께 확인해야 합니다.",
        fix: [
          "허가번호, 건강식품 문구, 표준로고, 승인 효능 범위, 권장섭취량, 주의·경고문, 영양성분을 라벨 시안에 매핑하세요.",
          "승인 효능과 광고 문안이 등록 범위를 넘지 않는지 별도 검토하세요.",
          "Article 13 항목 중 일반 식품 표시와 겹치는 항목은 포장식품 표시 규정과 함께 대조하세요."
        ],
        source: SOURCE_HEALTH_FOOD_ENFORCEMENT,
        sourceUrl: SOURCE_HEALTH_FOOD_ENFORCEMENT_URL,
        evidence: [
          hasHealthFoodLogoSignal(input) ? "logo/legend present" : "logo/legend missing",
          hasApprovedHealthCareEffectSignal(input) ? "approved effect present" : "approved effect missing",
          hasHealthFoodIntakeWarningSignal(input) ? "intake/warning present" : "intake/warning missing"
        ].join(" / ")
      });
    }

    if (hasFoodMedicalEfficacySignal(input) && !formulaForCertainDisease) {
      findings.push({
        id: "health-food-medical-claim-prohibited",
        status: "fail",
        area: "효능표현",
        title: "건강식품 의료 효능 암시 표현 삭제 필요",
        severity: "high",
        why: "대만 건강식품 라벨과 광고는 승인 효능 범위를 넘어서는 허위·과장 표현이나 의료 효능 암시를 사용할 수 없습니다.",
        fix: [
          "치료, 완치, 질병명 직접 개선, 의학적 효능 표현을 삭제하거나 승인된 보건효능 범위 안의 표현으로 재작성하세요.",
          "광고 문안, 상세페이지, 수입자 제출 라벨을 같은 기준으로 일괄 정리하세요."
        ],
        source: SOURCE_HEALTH_FOOD_ACT,
        sourceUrl: SOURCE_HEALTH_FOOD_ACT_URL,
        evidence: "medical efficacy / disease treatment signal"
      });
    }
  }

  if (formulaForCertainDisease) {
    if (hasFormulaLabelPhrase(input) && hasFormulaWarningSignal(input)) {
      findings.push({
        id: "formula-certain-disease-label-present",
        status: "pass",
        area: "식품표시",
        title: "특수질환식품 핵심 표시 신호 확인",
        severity: "low",
        why: "특정 질환용 조제식품 문구와 의사 또는 등록영양사 지시 경고문 신호가 함께 확인되었습니다.",
        fix: ["적용 대상, 개봉 전후 보관법, 사용·섭취방법, 정맥주사용 아님 등의 상세 경고문까지 최종 시안에서 확인하세요."],
        source: SOURCE_FORMULA_CERTAIN_DISEASE,
        sourceUrl: SOURCE_FORMULA_CERTAIN_DISEASE_URL,
        evidence: "formula phrase / doctor or dietitian warning"
      });
    } else {
      findings.push({
        id: "formula-certain-disease-label-needed",
        status: "needs_info",
        area: "식품표시",
        title: "특수질환식품 주표시면·경고문 확인 필요",
        severity: "medium",
        why: "특정 질환용 조제식품 신호가 있지만, 주표시면의 'Formula for Certain Disease' 표시 또는 의사·등록영양사 지시 경고문이 충분히 확인되지 않았습니다.",
        fix: [
          "주표시면에 Formula for Certain Disease 또는 현지 공식 문구를 눈에 띄게 배치하세요.",
          "적용 대상, 개봉 전후 보관법, 사용·섭취방법, 의사/등록영양사 지시 경고, 정맥주사용 아님, 증량해도 질환 개선에 도움이 되지 않는다는 취지의 경고를 확인하세요.",
          "사전 심사·등록 제품인지 허가 자료와 라벨 시안을 함께 검토하세요."
        ],
        source: SOURCE_FORMULA_CERTAIN_DISEASE,
        sourceUrl: SOURCE_FORMULA_CERTAIN_DISEASE_URL,
        evidence: [
          hasFormulaLabelPhrase(input) ? "principal phrase present" : "principal phrase missing",
          hasFormulaWarningSignal(input) ? "doctor/dietitian warning present" : "doctor/dietitian warning missing"
        ].join(" / ")
      });
    }
  }

  if ((healthFood || formulaForCertainDisease) && hasIngredientSafetyReviewSignal(input)) {
    findings.push({
      id: "food-ingredient-platform-review",
      status: "needs_info",
      area: "성분",
      title: "TFDA 식품 원료 통합 조회 필요",
      severity: "medium",
      why: "추출물, 균주, 효소, 신규 원료 또는 기능성 원료 신호가 있어 대만 식품 원료 통합 조회 플랫폼에서 허용 제품 유형, 사용 제한, 주의사항을 확인해야 합니다.",
      fix: [
        "중문명, 영문명, 학명, 균주명 등 가능한 모든 동의어로 TFDA Food Ingredient Integration Query Platform을 검색하세요.",
        "사용량 제한, 허용 제품 유형, 주의문구가 있으면 라벨 경고와 배합 검토표에 반영하세요."
      ],
      source: SOURCE_FOOD_INGREDIENT_PLATFORM,
      sourceUrl: SOURCE_FOOD_INGREDIENT_PLATFORM_URL,
      evidence: "extract / probiotic / novel ingredient signal"
    });
  }
}

function addFoodContactMaterialFindings(input: ReviewInput, findings: Finding[]) {
  if (!isFoodContactMaterialProduct(input)) return;

  const plastic = hasPlasticFoodContactSignal(input);
  const infantBottle = hasInfantBottleSignal(input);
  const childrenUnderThree = hasChildrenUnderThreeSignal(input);
  const sanitationEvidence = hasFoodContactSanitationEvidence(input);

  findings.push({
    id: sanitationEvidence ? "food-contact-sanitation-evidence-present" : "food-contact-sanitation-evidence-needed",
    status: sanitationEvidence ? "pass" : "needs_info",
    area: "식품접촉재",
    title: sanitationEvidence ? "식품접촉재 위생·재질 시험자료 신호 확인" : "식품접촉재 위생·재질 시험자료 확인 필요",
    severity: sanitationEvidence ? "low" : "medium",
    why: sanitationEvidence
      ? "식품용 기구·용기·포장 위생기준에 연결할 수 있는 재질 안전, 용출/위생시험 또는 COA 신호가 확인되었습니다."
      : "식품접촉재는 표시사항뿐 아니라 변색·이취·오염·곰팡이·이물 없음, 재질별 표준시험, BPA/프탈레이트 제한 등 위생기준 근거가 제품 파일에 필요합니다.",
    fix: sanitationEvidence
      ? ["시험성적서의 시험 대상 재질, 식품접촉면, 내열조건, 제조 로트가 실제 수출 제품과 일치하는지 확인하세요."]
      : [
          "재질 구성표, 용출/위생 시험성적서, COA, 변색·이취·오염·곰팡이·이물 없음 확인자료를 제품 파일에 추가하세요.",
          "플라스틱, 유아용, 고온 사용, 재활용 원료 신호가 있으면 해당 부속표 시험 항목과 제한물질 검토를 별도 표시하세요."
        ],
    source: SOURCE_FOOD_CONTACT_SANITATION,
    sourceUrl: SOURCE_FOOD_CONTACT_SANITATION_URL,
    evidence: sanitationEvidence ? "sanitation / migration / material safety evidence" : "sanitation evidence not found"
  });

  if (hasRecycledPlasticFoodRepackagingRisk(input)) {
    findings.push({
      id: "food-contact-recycled-plastic-repackaging-risk",
      status: "fail",
      area: "식품접촉재",
      title: "재활용 플라스틱 식품 재포장 위험",
      severity: "high",
      why: "대만 위생기준은 플라스틱 식품용 기구·용기·포장을 회수해 식품을 다시 포장하여 판매하는 것을 금지합니다.",
      fix: [
        "재활용 또는 회수 플라스틱이 식품 재포장·소분 포장에 쓰인다는 문구를 삭제하세요.",
        "식품접촉면이 신규 적합 재질임을 제조사 재질증명서와 시험성적서로 분리해 증빙하세요."
      ],
      source: SOURCE_FOOD_CONTACT_SANITATION,
      sourceUrl: SOURCE_FOOD_CONTACT_SANITATION_URL,
      evidence: "recycled plastic + food repackaging signal"
    });
  }

  if (infantBottle) {
    const bpaFree = hasBpaFreeSignal(input);
    const bpaRisk = hasBpaPresentRiskSignal(input);

    findings.push({
      id: bpaRisk ? "food-contact-infant-bottle-bpa-risk" : bpaFree ? "food-contact-infant-bottle-bpa-free-present" : "food-contact-infant-bottle-bpa-free-needed",
      status: bpaRisk ? "fail" : bpaFree ? "pass" : "needs_info",
      area: "식품접촉재",
      title: bpaRisk ? "플라스틱 젖병 BPA 함유 위험" : bpaFree ? "플라스틱 젖병 BPA 불검출 신호 확인" : "플라스틱 젖병 BPA 불검출 근거 필요",
      severity: bpaRisk ? "high" : bpaFree ? "low" : "high",
      why: bpaRisk
        ? "대만 위생기준은 플라스틱 유아용 젖병에 BPA가 포함되어서는 안 된다고 봅니다."
        : bpaFree
          ? "유아용 젖병 신호와 함께 BPA-free 또는 불검출 근거 신호가 확인되었습니다."
          : "유아용 플라스틱 젖병은 BPA 불검출 또는 BPA-free 근거가 제품 파일과 표시 시안에 연결되어야 합니다.",
      fix: bpaRisk
        ? ["BPA 함유 또는 BPA 사용을 암시하는 재질·마케팅 문구를 즉시 제거하고, BPA 불검출 시험성적서를 확보하세요."]
        : bpaFree
          ? ["BPA-free 문구가 시험성적서, 재질명, 로트 정보와 일치하는지 확인하세요."]
          : ["BPA 불검출 시험성적서, 재질 증명서, 라벨 또는 상세페이지의 BPA-free 근거 문구를 확보하세요."],
      source: SOURCE_FOOD_CONTACT_SANITATION,
      sourceUrl: SOURCE_FOOD_CONTACT_SANITATION_URL,
      evidence: bpaRisk ? "BPA present signal" : bpaFree ? "BPA-free signal" : "infant feeding bottle without BPA-free evidence"
    });
  }

  if (childrenUnderThree) {
    const phthalateFree = hasPhthalateFreeEvidence(input);
    const phthalateRisk = hasRestrictedPhthalateRiskSignal(input);

    findings.push({
      id: phthalateRisk ? "food-contact-child-phthalate-risk" : phthalateFree ? "food-contact-child-phthalate-free-present" : "food-contact-child-phthalate-evidence-needed",
      status: phthalateRisk ? "fail" : phthalateFree ? "pass" : "needs_info",
      area: "식품접촉재",
      title: phthalateRisk ? "3세 미만 식기 프탈레이트 첨가 위험" : phthalateFree ? "3세 미만 식기 프탈레이트 제한 근거 확인" : "3세 미만 식기 프탈레이트 제한 근거 필요",
      severity: phthalateRisk ? "high" : phthalateFree ? "low" : "high",
      why: phthalateRisk
        ? "대만 위생기준은 3세 미만 아동용 식품용 기구·용기에 DEHP, DNOP, DBP, BBP를 첨가하지 못하도록 합니다."
        : phthalateFree
          ? "3세 미만 아동용 식품접촉재 신호와 함께 프탈레이트 무첨가 또는 불검출 근거 신호가 확인되었습니다."
          : "3세 미만 아동용 식품접촉재는 DEHP, DNOP, DBP, BBP 무첨가·불검출 근거 확인이 필요합니다.",
      fix: phthalateRisk
        ? ["DEHP/DNOP/DBP/BBP 또는 프탈레이트 가소제 첨가 재질을 배제하고, 대체 재질과 불검출 시험성적서를 확보하세요."]
        : phthalateFree
          ? ["무첨가·불검출 문구가 시험 대상 재질과 제품 사용 연령에 맞는지 확인하세요."]
          : ["DEHP, DNOP, DBP, BBP 무첨가·불검출 시험성적서와 재질 증명서를 제품 파일에 추가하세요."],
      source: SOURCE_FOOD_CONTACT_SANITATION,
      sourceUrl: SOURCE_FOOD_CONTACT_SANITATION_URL,
      evidence: phthalateRisk ? "restricted phthalate added signal" : phthalateFree ? "phthalate-free signal" : "children-under-three food-contact product without phthalate evidence"
    });
  }

  if (hasFoodContactUsePhrase(input) && hasMaterialAndHeatSignal(input)) {
    findings.push({
      id: "food-contact-label-core-present",
      status: "pass",
      area: "식품표시",
      title: "식품접촉 포장재 핵심 표시 신호 확인",
      severity: "low",
      why: "식품용 기구·용기·포장재 라벨에서 식품접촉용 문구와 재질/내열 관련 표시 신호가 확인되었습니다.",
      fix: ["중문 라벨에서 제품명, 재질명, 내열온도, 수량, 국내 책임업자 정보, 원산지, 용도·주의사항까지 최종 대조하세요."],
      source: SOURCE_FOOD_CONTACT_LABELING,
      sourceUrl: SOURCE_FOOD_CONTACT_LABELING_URL,
      evidence: "for food contact use / material or heat resistance"
    });
  } else {
    findings.push({
      id: "food-contact-label-core-needed",
      status: "needs_info",
      area: "식품표시",
      title: "식품용 기구·용기·포장재 표시 확인 필요",
      severity: "medium",
      why: "식품접촉 포장재 신호가 있지만, 대만 라벨의 '식품접촉용' 문구 또는 재질·내열온도 정보가 충분히 확인되지 않았습니다.",
      fix: [
        "중문 라벨에 제품명, 재질명과 내열온도, 순중량/용량/수량, 국내 책임업자명·전화·주소, 원산지, 용도·주의사항을 매핑하세요.",
        "식품과 직접 접촉하는 면의 재질이 복합재라면 각 재질명을 분리해 표시하세요.",
        "식품접촉용 또는 동등 문구가 빠져 있으면 판매 전 라벨 시안에 추가하세요."
      ],
      source: SOURCE_FOOD_CONTACT_LABELING,
      sourceUrl: SOURCE_FOOD_CONTACT_LABELING_URL,
      evidence: [
        hasFoodContactUsePhrase(input) ? "food-contact phrase present" : "food-contact phrase missing",
        hasMaterialAndHeatSignal(input) ? "material/heat signal present" : "material/heat signal missing"
      ].join(" / ")
    });
  }

  if (plastic) {
    findings.push({
      id: hasReusableDisposableSignal(input) ? "food-contact-plastic-use-status-present" : "food-contact-plastic-use-status-needed",
      status: hasReusableDisposableSignal(input) ? "pass" : "needs_info",
      area: "식품표시",
      title: hasReusableDisposableSignal(input) ? "플라스틱 포장재 재사용/일회용 표시 확인" : "플라스틱 포장재 재사용/일회용 표시 필요",
      severity: hasReusableDisposableSignal(input) ? "low" : "medium",
      why: "대만은 식품접촉면에 플라스틱이 있는 식품용 기구·용기·포장재에 재사용 또는 일회용 등 동등 문구 표시를 요구합니다.",
      fix: hasReusableDisposableSignal(input)
        ? ["재사용/일회용 문구가 실제 제품 용도, 내열온도, 사용방법과 충돌하지 않는지 확인하세요."]
        : ["라벨에 reusable/disposable 또는 중문 동등 문구를 추가하고, 반복 사용 가능 여부를 사용방법과 일치시키세요."],
      source: SOURCE_FOOD_CONTACT_REQUIRED_ITEMS,
      sourceUrl: SOURCE_FOOD_CONTACT_REQUIRED_ITEMS_URL,
      evidence: hasReusableDisposableSignal(input) ? "reusable/disposable" : "plastic food contact surface without use-status phrase"
    });
  }

  if (hasPvcPvdcSignal(input)) {
    findings.push({
      id: hasPvcPvdcWarning(input) ? "food-contact-pvc-pvdc-warning-present" : "food-contact-pvc-pvdc-warning-needed",
      status: hasPvcPvdcWarning(input) ? "pass" : "fail",
      area: "식품표시",
      title: hasPvcPvdcWarning(input) ? "PVC/PVDC 고온·고지방 접촉 경고 확인" : "PVC/PVDC 고온·고지방 접촉 경고 누락",
      severity: hasPvcPvdcWarning(input) ? "low" : "high",
      why: "PVC 또는 PVDC가 식품접촉면에 있는 경우 고지방 및 고온 식품에 직접 접촉하지 말라는 취지의 경고문이 필요합니다.",
      fix: hasPvcPvdcWarning(input)
        ? ["경고문이 중문 라벨과 외포장에 명확히 보이는지 확인하세요."]
        : ["PVC/PVDC 식품접촉면이 있으면 '고지방 및 고온 식품에 직접 접촉 금지' 동등 문구를 중문 라벨에 추가하세요.", "고온 조리·전자레인지 사용 가능처럼 보이는 문구가 있으면 즉시 삭제하거나 재질 시험자료와 일치하게 수정하세요."],
      source: SOURCE_FOOD_CONTACT_LABELING,
      sourceUrl: SOURCE_FOOD_CONTACT_LABELING_URL,
      evidence: hasPvcPvdcWarning(input) ? "PVC/PVDC warning" : "PVC/PVDC without required warning"
    });
  }

  if (hasFoodContactHighHeatUseSignal(input) && !hasMaterialAndHeatSignal(input)) {
    findings.push({
      id: "food-contact-heat-use-review",
      status: "needs_info",
      area: "식품표시",
      title: "고온·전자레인지 사용 표시 근거 확인 필요",
      severity: "medium",
      why: "전자레인지, 고온, 뜨거운 식품 사용 신호가 있으나 재질과 내열온도 표시가 충분하지 않습니다.",
      fix: [
        "재질별 내열온도와 사용 제한을 라벨에 표시하세요.",
        "전자레인지 가능, 오븐 가능, 식기세척기 가능 등 사용 문구는 시험자료와 실제 재질 제한에 맞춰 조정하세요."
      ],
      source: SOURCE_FOOD_CONTAINER_SMART_USE,
      sourceUrl: SOURCE_FOOD_CONTAINER_SMART_USE_URL,
      evidence: "microwave / high-temperature use signal"
    });
  }
}

function addFoodPostMarketFindings(input: ReviewInput, findings: Finding[]) {
  if (!isFoodProduct(input)) return;

  if (hasFoodTraceabilityReadiness(input)) {
    findings.push({
      id: "food-traceability-records-present",
      status: "pass",
      area: "서류",
      title: "식품 이력추적 기록 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 로트/배치, 원료 출처, 공급처 또는 출고·수령 흐름 신호가 확인되어 대만 식품 추적관리 요구에 연결할 수 있습니다.",
      fix: ["원료 공급자, 제품 책임업체, 로트/배치, 수량, 입고일, 통관일, 출고일, 수령처, 재고·반품·부적합품 처리 기록을 5년 보관 기준으로 묶어 두세요."],
      source: SOURCE_FOOD_TRACEABILITY,
      sourceUrl: SOURCE_FOOD_TRACEABILITY_URL,
      evidence: "traceability / lot-flow records"
    });
  } else {
    findings.push({
      id: "food-traceability-records-needed",
      status: "needs_info",
      area: "서류",
      title: "식품 이력추적·출처/흐름 기록 확인 필요",
      severity: "medium",
      why: "대만 식품 추적관리 규정은 식품 및 관련 제품에 대해 원료 출처, 제품 정보, 식별 정보, 제품 흐름, 재고와 폐기/반품 관련 기록을 요구합니다.",
      fix: ["원료 공급자와 식품업자 등록번호, 원료/제품명, 로트·배치, 유통기한·제조일, 원산지, 수입검사 신청번호, 출고 수량·수령처·배송일 기록을 제품 파일에 추가"],
      source: SOURCE_FOOD_TRACEABILITY,
      sourceUrl: SOURCE_FOOD_TRACEABILITY_URL
    });
  }

  if (hasFoodRecallDestructionReadiness(input)) {
    findings.push({
      id: "food-recall-destruction-plan-present",
      status: "pass",
      area: "서류",
      title: "식품 회수·폐기 계획 신호가 확인되었습니다",
      severity: "low",
      why: "입력 자료에서 회수/폐기 계획, 하류 거래처 통지, 회수 진행 보고, 격리·처분 또는 5년 기록 보관 신호가 확인되었습니다.",
      fix: ["회수 대상 제품 식별, 하류 거래처 비상 연락처, 회수 완료 예정일, 보관 장소, 최종 처분 방식, 진행 보고 주기와 5년 기록 보관 책임자를 운영 SOP에 연결"],
      source: SOURCE_FOOD_RECALL_DESTRUCTION,
      sourceUrl: SOURCE_FOOD_RECALL_DESTRUCTION_URL,
      evidence: "recall/destruction procedure"
    });
  } else {
    findings.push({
      id: "food-recall-destruction-plan-needed",
      status: "needs_info",
      area: "서류",
      title: "식품 회수·폐기 운영계획 확인 필요",
      severity: "medium",
      why: "대만 식품 회수·폐기 규정은 제조자, 판매자 또는 수입자가 회수 전담반을 두고 회수·폐기 계획, 진행 보고, 격리 표시, 폐기 승인과 5년 기록 보관을 준비하도록 요구합니다.",
      fix: ["회수 전담반/소집 책임자, 회수·폐기 계획서, 하류 거래처 통지 절차, 회수 진행 보고 양식, 회수품 격리 표시, 폐기 승인 요청과 기록 보관 체계를 수입자와 확정"],
      source: SOURCE_FOOD_RECALL_DESTRUCTION,
      sourceUrl: SOURCE_FOOD_RECALL_DESTRUCTION_URL
    });
  }
}

function addFoodFindings(input: ReviewInput, findings: Finding[]) {
  for (const requirement of foodLabelRequirements) {
    if (!requirement.present(input)) {
      findings.push({
        id: `food-label-${requirement.id}`,
        status: requirement.id === "food-nutrition" ? "needs_info" : "warn",
        area: requirement.id === "food-nutrition" ? "영양표시" : "식품표시",
        title: `대만 식품 라벨 필수 항목 확인 필요: ${requirement.label}`,
        severity: requirement.id === "food-nutrition" ? "medium" : "low",
        why: "대만 식품 라벨은 식품명, 성분, 내용량, 원산지, 제조/수입업자, 유통기한 또는 소비기한, 영양표시 같은 핵심 항목을 제품과 포장 형태에 맞게 확인해야 합니다.",
        fix: [
          `${requirement.label} 항목을 중국어 라벨 또는 수입 스티커에 명확히 추가`,
          "원문 라벨, 번역 라벨, 수입자 정보, 포장 면적 기준을 함께 재검토"
        ],
        source: requirement.source,
        sourceUrl: requirement.sourceUrl
      });
    }
  }

  const combinedText = `${input.ingredientsText} ${input.labelText}`;
  const matchedAllergens = taiwanFoodAllergens.filter((allergen) => allergen.pattern.test(combinedText));
  const hasAllergenWarning = /allergen|contains|may contain|本產品含|含有|過敏|알레르기|함유|주의/i.test(input.labelText);

  for (const allergen of matchedAllergens) {
    findings.push({
      id: `food-allergen-${allergen.id}`,
      status: hasAllergenWarning ? "pass" : "fail",
      area: "알레르겐",
      title: hasAllergenWarning ? `대만 알레르겐 표시 확인됨: ${allergen.label}` : `대만 알레르겐 경고 누락 가능성: ${allergen.label}`,
      severity: hasAllergenWarning ? "low" : "high",
      why: "대만 TFDA 알레르겐 표시 규정은 민감한 소비자에게 알레르기 반응을 일으킬 수 있는 지정 원료가 들어간 사전포장식품에 경고 문구를 요구합니다.",
      fix: hasAllergenWarning
        ? ["알레르겐 경고 문구가 실제 원료와 일치하는지 중국어 라벨에서 최종 확인"]
        : [`${allergen.label} 함유 경고를 중국어 라벨에 추가`, "교차오염 가능성이 있으면 별도 advisory 문구 적용 여부 검토"],
      source: SOURCE_FOOD_ALLERGEN,
      sourceUrl: SOURCE_FOOD_ALLERGEN_URL,
      evidence: allergen.label
    });
  }

  if (matchedAllergens.length === 0 && input.ingredientsText.trim()) {
    findings.push({
      id: "food-allergen-screen-clear",
      status: "pass",
      area: "알레르겐",
      title: "대만 지정 알레르겐 1차 키워드 매칭 없음",
      severity: "low",
      why: "입력된 성분 텍스트에서 대만 알레르겐 표시 규정의 대표 키워드는 발견되지 않았습니다. 원료 공급사 사양서와 교차오염 정보는 별도로 확인해야 합니다.",
      fix: ["원료명, 향료, 복합원료, 가공보조제, 교차오염 정보를 공급사 문서와 대조"],
      source: SOURCE_FOOD_ALLERGEN,
      sourceUrl: SOURCE_FOOD_ALLERGEN_URL
    });
  }

  const matchedAdvisoryAllergens = foodAdvisoryAllergenTerms
    .map((term) => ({
      term,
      alias: matchedAliasInText(combinedText, term.aliases ?? [])
    }))
    .filter((entry) => entry.alias);

  for (const { term, alias } of matchedAdvisoryAllergens) {
    findings.push({
      id: `food-recommended-allergen-${term.id}`,
      status: "needs_info",
      area: "알레르겐",
      title: `대만 권장 알레르겐 표시 검토 필요: ${term.canonical_name}`,
      severity: "medium",
      why: "대만 TFDA는 일부 원료에 대해 의무 알레르겐과 별도로 권장 알레르겐 표시 또는 교차오염 advisory 검토를 안내합니다. 자동 판정은 차단이 아니라 라벨 문구와 공급사 자료 확인 대상으로 분류합니다.",
      fix: [
        "원료 규격서에서 해당 권장 알레르겐 유래 여부와 정제/가공 상태 확인",
        "중국어 라벨에 권장 알레르겐 또는 교차오염 advisory 문구가 필요한지 대만 수입자와 검토",
        "의무 알레르겐과 혼동되지 않도록 라벨 문구를 분리해서 관리"
      ],
      source: SOURCE_FOOD_RECOMMENDED_ALLERGEN,
      sourceUrl: SOURCE_FOOD_RECOMMENDED_ALLERGEN_URL,
      evidence: alias ? `${term.canonical_name} / ${alias.value}` : term.canonical_name
    });
  }

  const claimText = `${input.productName} ${input.labelText}`;
  const matchedNutritionClaims = nutritionClaimPatterns.filter((claim) => claim.pattern.test(claimText));

  for (const claim of matchedNutritionClaims) {
    findings.push({
      id: `food-nutrition-claim-${claim.id}`,
      status: "needs_info",
      area: "영양표시",
      title: `대만 영양 강조표시 기준 확인 필요: ${claim.label}`,
      severity: "medium",
      why: "제품명 또는 라벨 문구에서 영양 강조표시가 탐지되었습니다. 대만 사전포장식품 영양 강조표시는 영양성분 함량, 1회 제공량 기준, 비교 표현, 중국어 문구가 기준에 맞는지 확인해야 합니다.",
      fix: [
        "시험성적서 또는 배합 기준으로 강조한 영양성분 수치와 제공량 기준 확인",
        "대만 영양 강조표시 기준의 claim threshold와 비교표시 요건 대조",
        "중국어 라벨의 강조 문구가 수치·영양표시와 충돌하지 않는지 최종 검수"
      ],
      source: SOURCE_FOOD_NUTRITION_CLAIM,
      sourceUrl: SOURCE_FOOD_NUTRITION_CLAIM_URL,
      evidence: claim.label
    });
  }

  const emittedAdditives = new Set<string>();
  for (const ingredient of parseIngredients(input.ingredientsText)) {
    for (const term of foodAdditiveTerms) {
      if (emittedAdditives.has(term.id)) continue;
      const alias = matchedAlias(ingredient, term.aliases ?? []);
      if (!alias) continue;

      emittedAdditives.add(term.id);
      findings.push({
        id: `food-additive-${term.id}`,
        status: "needs_info",
        area: "식품표시",
        title: `대만 식품첨가물 기준 확인 필요: ${term.canonical_name}`,
        severity: "medium",
        why: "입력 원재료에서 대만 TFDA 식품첨가물 통용명 또는 동의어가 탐지되었습니다. 첨가물은 식품 유형, 사용 목적, 사용량, 표시명에 따라 허용 범위와 한도 확인이 필요합니다.",
        fix: [
          "대만 식품첨가물 사용범위 및 한도 기준에서 해당 식품 유형과 용도 확인",
          "중국어 라벨의 첨가물 명칭이 TFDA 통용명 또는 허용 표시명과 맞는지 확인",
          "제조사 배합표에서 실제 투입량과 기능을 받아 보관"
        ],
        source: term.source_keys?.includes("tw-tfda-food-additive-common-names-table")
          ? SOURCE_FOOD_ADDITIVE_COMMON_NAMES
          : SOURCE_FOOD_ADDITIVE,
        sourceUrl: term.source_keys?.includes("tw-tfda-food-additive-common-names-table")
          ? SOURCE_FOOD_ADDITIVE_COMMON_NAMES_URL
          : SOURCE_FOOD_ADDITIVE_URL,
        evidence: `${ingredient.raw} / ${alias.value}`
      });

      if (emittedAdditives.size >= 8) break;
    }
    if (emittedAdditives.size >= 8) break;
  }

  addFoodPostMarketFindings(input, findings);
  addHealthFoodFindings(input, findings);
}

export function evaluateReview(input: ReviewInput): ReviewResult {
  const parsedIngredients = parseIngredients(input.ingredientsText);
  const findings: Finding[] = [];
  const foodContactMaterialProduct = isFoodContactMaterialProduct(input);
  const foodProduct = !foodContactMaterialProduct && !hasNonFoodContactUseSignal(input) && isFoodProduct(input);

  if (!foodProduct && !foodContactMaterialProduct) {
  for (const ingredient of parsedIngredients) {
    const matchedRules = officialRules
      .map((rule) => ({ rule, alias: matchedAlias(ingredient, aliasesForRule(rule)) }))
      .filter((entry): entry is { rule: RegulatoryRule; alias: IndexedAlias } => Boolean(entry.alias));
    const emitted = new Set<string>();

    for (const { rule, alias } of matchedRules) {
      if (emitted.has(rule.id)) continue;
      emitted.add(rule.id);

      if (rule.category === "prohibited") {
        findings.push({
          id: `prohibited-${rule.id}-${ingredient.raw}`,
          status: "fail",
          area: "성분",
          title: `${ingredient.name || ingredient.raw} 사용 금지 가능성`,
          severity: "높음",
          why: "대만 화장품 금지 성분 데이터셋에 포함된 성분입니다. 불가피한 미량 잔류 기준은 별도 증빙 영역이며 의도적 배합으로 보이면 출고 전 중단해야 합니다.",
          fix: fixOptions(rule),
          source: sourceLabel(rule),
          sourceUrl: rule.source_url,
          evidence: ingredientEvidence(ingredient, rule, alias)
        });
        continue;
      }

      const limit = rule.max_limit_percent ?? undefined;
      if (ingredient.percent === undefined) {
        findings.push({
          id: `missing-concentration-${rule.id}-${ingredient.raw}`,
          status: "needs_info",
          area: "성분",
          title: `${ingredient.name || ingredient.raw} 함량 확인 필요`,
          severity: "중간",
          why: "대만 제한 성분 또는 특수 용도 성분으로 보이지만 입력에 농도가 없어 자동 판정을 확정할 수 없습니다.",
          fix: fixOptions(rule, limit),
          source: sourceLabel(rule),
          sourceUrl: rule.source_url,
          evidence: ingredientEvidence(ingredient, rule, alias)
        });
      } else if (typeof limit === "number" && ingredient.percent > limit) {
        findings.push({
          id: `over-limit-${rule.id}-${ingredient.raw}`,
          status: "fail",
          area: "성분",
          title: `${ingredient.name || ingredient.raw} ${ingredient.percent}%: 제한 ${limit}% 초과`,
          severity: "높음",
          why: "공식 제한 기준보다 높은 함량으로 입력되었습니다. 실제 제품 유형과 용도에 따라 더 낮은 기준이 적용될 수 있습니다.",
          fix: fixOptions(rule, limit),
          source: sourceLabel(rule),
          sourceUrl: rule.source_url,
          evidence: ingredientEvidence(ingredient, rule, alias)
        });
      } else if (isRinseOnlyRule(rule) && isLeaveOn(input)) {
        findings.push({
          id: `scope-risk-${rule.id}-${ingredient.raw}`,
          status: "fail",
          area: "성분",
          title: `${ingredient.name || ingredient.raw}는 즉시 씻어내는 제품 범위 확인 필요`,
          severity: "높음",
          why: "입력 제품이 leave-on 제품으로 보이는데, 해당 방부제는 즉시 씻어내는 제품 범위로 제한되어 있습니다.",
          fix: fixOptions(rule, limit),
          source: sourceLabel(rule),
          sourceUrl: rule.source_url,
          evidence: ingredientEvidence(ingredient, rule, alias)
        });
      } else if (typeof limit === "number") {
        findings.push({
          id: `within-limit-${rule.id}-${ingredient.raw}`,
          status: "pass",
          area: "성분",
          title: `${ingredient.name || ingredient.raw} ${ingredient.percent}%: 기준 내`,
          severity: "낮음",
          why: "입력된 함량 기준으로는 공식 제한 기준 이내입니다. 제품 유형, 사용 부위, 주의문구 조건은 최종 라벨에서 함께 확인해야 합니다.",
          fix: ["조성표와 라벨 전성분명이 일치하는지 확인", "원료명/INCI/CAS 식별자를 함께 보관"],
          source: sourceLabel(rule),
          sourceUrl: rule.source_url,
          evidence: ingredientEvidence(ingredient, rule, alias)
        });
      }
    }
  }

  for (const requirement of labelRequirements) {
    const present = requirement.patterns.some((pattern) => pattern.test(input.labelText));
    if (!present) {
      findings.push({
        id: `label-${requirement.id}`,
        status: "warn",
        area: "라벨",
        title: `중문 라벨 필수 항목 누락 가능성: ${requirement.label}`,
        severity: "중간",
        why: "대만 화장품 라벨은 제품명, 용도, 사용·보관 방법, 내용량, 전성분, 주의사항, 제조사/수입자 정보와 원산지, 날짜, 로트번호 등을 표시해야 합니다.",
        fix: [`라벨 OCR/문구에 ${requirement.label} 항목 추가`, "면적이 작으면 라벨·첨부문서·기타 방식으로 제공 가능 여부 검토"],
        source: SOURCE_ACT,
        sourceUrl: SOURCE_ACT_URL
      });
    }
  }

  if (!input.origin.trim()) {
    findings.push({
      id: "origin-missing",
      status: "needs_info",
      area: "서류",
      title: "원산지 정보가 비어 있습니다",
      severity: "중간",
      why: "수입 화장품은 제조사/수입자 정보와 원산지를 함께 점검해야 하며, 통관 서류와 라벨 표기가 어긋나면 보류 위험이 생깁니다.",
      fix: ["인보이스/COO의 원산지와 라벨 원산지 일치 확인", "제조소와 브랜드 본사 표기가 다른 경우 근거 서류 첨부"],
      source: SOURCE_ACT,
      sourceUrl: SOURCE_ACT_URL
    });
  }

  if (!input.manufacturer.trim()) {
    findings.push({
      id: "manufacturer-missing",
      status: "needs_info",
      area: "서류",
      title: "제조사 또는 수입자 정보가 필요합니다",
      severity: "중간",
      why: "대만 라벨 필수 항목과 수입 책임 구조를 확인하려면 제조사/수입자 이름, 주소, 연락처가 필요합니다.",
      fix: ["라벨 표기명, 실제 제조소, 대만 수입자 정보를 분리해 입력", "PIF/제품등록 자료와 이름이 같은지 확인"],
      source: SOURCE_ACT,
      sourceUrl: SOURCE_ACT_URL
    });
  }

  for (const pattern of medicalClaimPatterns) {
    const match = input.labelText.match(pattern);
    if (match) {
      findings.push({
        id: "medical-claim",
        status: "fail",
        area: "효능표현",
        title: "의약품 효능으로 보일 수 있는 표현",
        severity: "높음",
        why: "화장품 표시·홍보·광고는 기만·과장되어서는 안 되며 의료 효능을 표시할 수 없습니다.",
        fix: ["치료·재생·항염 등 의료 효능 표현 삭제", "보습, 피부결 개선, 세정 등 화장품 범위의 표현으로 완화", "광고 문구는 전문가 검수로 별도 확인"],
        source: SOURCE_ACT,
        sourceUrl: SOURCE_ACT_URL,
        evidence: match[0]
      });
    }
  }

  if (/spf|防曬|자외선|sun/i.test(input.labelText)) {
    findings.push({
      id: "spf-pif",
      status: "needs_info",
      area: "서류",
      title: "자외선 차단 효능 근거자료 확인 필요",
      severity: "중간",
      why: "자외선 차단 계수 또는 관련 효능을 표시하면 제품정보파일에 기능성 근거자료를 보관해야 합니다.",
      fix: ["SPF/PA 시험성적서 확보", "PIF에 효능 근거자료 포함", "방 sunscreen 성분 제한 기준과 함께 검토"],
      source: "TFDA sunscreen dataset InfoId 202 and PIF notice",
      sourceUrl: "https://data.gov.tw/dataset/173683"
    });
  }

  addCosmeticMarketAccessFindings(input, findings);
  addCosmeticPostMarketFindings(input, findings);

  if (isCosmeticProduct(input) && Date.now() >= PIF_EFFECTIVE_AT && !hasCosmeticPifEvidence(input)) {
    findings.push({
      id: "pif-2026",
      status: "needs_info",
      area: "서류",
      title: "제품정보파일(PIF) 보유 확인 필요",
      severity: "중간",
      why: "2026년 7월 1일부터 수제 고형비누 일부 예외를 제외한 모든 화장품은 판매·제공 전 PIF를 갖춰야 합니다.",
      fix: ["전성분명과 함량, 제조공정, 안정성, 독성, 안전성 평가 서명 자료 보유 여부 체크", "LabelPass에서는 우선 PIF 준비도 체크리스트로 연결"],
      source: SOURCE_PIF,
      sourceUrl: SOURCE_PIF_URL
    });
  }
  } else {
    if (foodProduct) {
      addFoodFindings(input, findings);
      addFoodAdditiveProductFindings(input, findings);
    }
    addFoodContactMaterialFindings(input, findings);
    addFoodImportFindings(input, findings);
  }

  addTradeFindings(input, findings);

  if (findings.length === 0) {
    findings.push({
      id: "basic-pass",
      status: "pass",
      area: foodProduct || foodContactMaterialProduct ? "식품표시" : "성분",
      title: foodProduct || foodContactMaterialProduct ? "대만 식품 라벨 1차 필수 항목에서 즉시 탐지된 문제 없음" : "입력 성분에서 즉시 탐지된 금지/초과 항목 없음",
      severity: "낮음",
      why: foodProduct || foodContactMaterialProduct
        ? "입력된 식품 라벨 텍스트 기준으로 필수 항목과 대표 알레르겐 키워드의 즉시 위험은 발견되지 않았습니다."
        : "현재 내장 샘플 룰셋 기준으로 자동 탐지된 금지 성분이나 제한 초과는 없습니다.",
      fix: foodProduct || foodContactMaterialProduct
        ? ["원문 라벨 이미지, 중국어 번역 라벨, 수입자 정보, 영양표시 값을 원본 서류와 대조"]
        : [`공식 TFDA 룰셋 ${officialRules.length}개 기준으로 재검토`, "라벨 이미지 OCR과 원본 서류로 2차 확인"],
      source: foodProduct || foodContactMaterialProduct ? SOURCE_FOOD_ACT : SOURCE_OPEN_DATA,
      sourceUrl: foodProduct || foodContactMaterialProduct ? SOURCE_FOOD_ACT_URL : SOURCE_OPEN_DATA_URL
    });
    if (foodContactMaterialProduct && !foodProduct) {
      findings[0] = {
        ...findings[0],
        area: "식품접촉재",
        title: "대만 식품용 기구·용기·포장재 표시 1차 필수 항목에서 즉시 탐지된 문제 없음",
        why: "식품접촉재로 분류된 품목 기준으로 food contact use, 재사용·일회용, PVC/PVDC 고지방·고온 경고 신호를 1차 확인했습니다.",
        fix: ["라벨 원문/OCR과 재질·내열온도·사용조건을 보관하고, 실제 수입 전 TFDA 원문 기준으로 2차 검수하세요."],
        source: SOURCE_FOOD_CONTACT_LABELING,
        sourceUrl: SOURCE_FOOD_CONTACT_LABELING_URL
      };
    }
  }

  const summary = {
    fail: findings.filter((item) => item.status === "fail").length,
    warn: findings.filter((item) => item.status === "warn").length,
    pass: findings.filter((item) => item.status === "pass").length,
    needsInfo: findings.filter((item) => item.status === "needs_info").length
  };

  const status: ReviewStatus = summary.fail > 0 ? "fail" : summary.needsInfo > 0 ? "needs_info" : summary.warn > 0 ? "warn" : "pass";
  const score = Math.max(0, 100 - summary.fail * 24 - summary.warn * 8 - summary.needsInfo * 10);
  const ruleVersion = foodProduct || foodContactMaterialProduct ? "TW-FOOD-2026.06-draft" : "TW-COS-2026.06-draft";

  return {
    status,
    score,
    generatedAt: new Date().toISOString(),
    ruleVersion,
    parsedIngredients,
    findings,
    actionPlan: buildReviewActionPlan(findings, ruleVersion),
    summary
  };
}
