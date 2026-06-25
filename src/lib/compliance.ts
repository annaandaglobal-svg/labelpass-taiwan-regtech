import rulesData from "../../data/rules/tw-cosmetics-rules.json";

export type ReviewStatus = "pass" | "warn" | "fail" | "needs_info";

export type ParsedIngredient = {
  raw: string;
  name: string;
  percent?: number;
};

export type Finding = {
  id: string;
  status: ReviewStatus;
  area: "성분" | "라벨" | "효능표현" | "서류" | "통관";
  title: string;
  severity: "낮음" | "중간" | "높음";
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
  invoiceValue?: string;
};

export type ReviewResult = {
  status: ReviewStatus;
  score: number;
  generatedAt: string;
  ruleVersion: string;
  parsedIngredients: ParsedIngredient[];
  findings: Finding[];
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
const SOURCE_OPEN_DATA = "TFDA cosmetics open datasets, InfoId 199-203";
const SOURCE_OPEN_DATA_URL = "https://data.gov.tw/dataset/173684";
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

const officialRules = (rulesData.rules as RegulatoryRule[]).filter((rule) => rule.aliases.length > 0);

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
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[()[\]{}]/g, "").trim();
}

function hasAlias(ingredient: ParsedIngredient, aliases: string[]) {
  const value = normalizeForMatch(`${ingredient.raw} ${ingredient.name}`);
  return aliases.some((alias) => {
    const normalizedAlias = normalizeForMatch(alias);
    if (normalizedAlias.length < 3) return false;
    return value.includes(normalizedAlias);
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

export function evaluateReview(input: ReviewInput): ReviewResult {
  const parsedIngredients = parseIngredients(input.ingredientsText);
  const findings: Finding[] = [];

  for (const ingredient of parsedIngredients) {
    const matchedRules = officialRules.filter((rule) => hasAlias(ingredient, rule.aliases));
    const emitted = new Set<string>();

    for (const rule of matchedRules) {
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
          evidence: ingredient.raw
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
          evidence: ingredient.raw
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
          evidence: ingredient.raw
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
          evidence: ingredient.raw
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
          evidence: ingredient.raw
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

  if (Date.now() >= PIF_EFFECTIVE_AT) {
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

  if (findings.length === 0) {
    findings.push({
      id: "basic-pass",
      status: "pass",
      area: "성분",
      title: "입력 성분에서 즉시 탐지된 금지/초과 항목 없음",
      severity: "낮음",
      why: "현재 내장 샘플 룰셋 기준으로 자동 탐지된 금지 성분이나 제한 초과는 없습니다.",
      fix: [`공식 TFDA 룰셋 ${officialRules.length}개 기준으로 재검토`, "라벨 이미지 OCR과 원본 서류로 2차 확인"],
      source: SOURCE_OPEN_DATA,
      sourceUrl: SOURCE_OPEN_DATA_URL
    });
  }

  const summary = {
    fail: findings.filter((item) => item.status === "fail").length,
    warn: findings.filter((item) => item.status === "warn").length,
    pass: findings.filter((item) => item.status === "pass").length,
    needsInfo: findings.filter((item) => item.status === "needs_info").length
  };

  const status: ReviewStatus = summary.fail > 0 ? "fail" : summary.needsInfo > 0 ? "needs_info" : summary.warn > 0 ? "warn" : "pass";
  const score = Math.max(0, 100 - summary.fail * 24 - summary.warn * 8 - summary.needsInfo * 10);

  return {
    status,
    score,
    generatedAt: new Date().toISOString(),
    ruleVersion: "TW-COS-2026.06-draft",
    parsedIngredients,
    findings,
    summary
  };
}
