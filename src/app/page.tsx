"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  Loader2,
  PackageCheck,
  Search,
  ShieldCheck,
  Ship,
  Sparkles,
  UploadCloud,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Finding, ReviewInput, ReviewResult, ReviewStatus } from "@/lib/compliance";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge-evidence";
import { AppSidebar } from "@/components/app-sidebar";

type RouteId =
  | "tw_cosmetic"
  | "tw_food_label"
  | "tw_food_additive"
  | "tw_food_import"
  | "tw_health_food"
  | "tw_food_packaging"
  | "tw_trade";

type RoutePreset = {
  id: RouteId;
  label: string;
  shortLabel: string;
  productType: string;
  family: "cosmetics" | "food" | "trade";
  icon: "cosmetic" | "food" | "additive" | "import" | "health" | "packaging" | "trade";
  description: string;
  primaryQuestion: string;
  query: string;
  requiredInputs: string[];
  expectedDocs: string[];
};

type SampleReview = {
  id: string;
  label: string;
  routeId: RouteId;
  input: ReviewInput;
};

const emptyInput: ReviewInput = {
  productName: "",
  productType: "",
  ingredientsText: "",
  labelText: "",
  origin: "",
  manufacturer: "",
  hsCode: "",
  incoterms: "",
  shipmentPurpose: "",
  invoiceValue: ""
};

const routePresets: RoutePreset[] = [
  {
    id: "tw_cosmetic",
    label: "대만 화장품 라벨·PIF",
    shortLabel: "화장품",
    productType: "cosmetic / skincare / Taiwan import",
    family: "cosmetics",
    icon: "cosmetic",
    description: "성분 제한, 중문 라벨, 효능 표현, PIF와 제품등록 준비 상태를 같이 봅니다.",
    primaryQuestion: "대만에서 판매 가능한 화장품 라벨과 PIF 증빙이 준비됐나요?",
    query: "Taiwan cosmetic PIF prohibited ingredient label",
    requiredInputs: ["제품 유형", "전성분", "중문 라벨 문안", "제조사·수입자", "효능 표현"],
    expectedDocs: ["PIF", "제품등록/통보", "GMP 또는 ISO 22716", "COA·안전성 자료", "이상사례·회수 SOP"]
  },
  {
    id: "tw_food_label",
    label: "대만 식품 라벨",
    shortLabel: "식품",
    productType: "prepackaged food / Taiwan import",
    family: "food",
    icon: "food",
    description: "품명, 원재료, 알레르기, 영양표시, 원산지, 수입자 정보를 한 번에 확인합니다.",
    primaryQuestion: "대만 중문 식품 라벨의 필수 항목이 빠지지 않았나요?",
    query: "Taiwan food labeling allergen nutrition",
    requiredInputs: ["제품명", "원재료", "중문 라벨", "원산지", "수입자"],
    expectedDocs: ["중문 라벨", "영양성분표", "알레르기 검토표", "원산지 증빙", "회수·추적관리 기록"]
  },
  {
    id: "tw_food_additive",
    label: "식품첨가물·복합첨가물",
    shortLabel: "첨가물",
    productType: "food additive / compound food additive / Taiwan import",
    family: "food",
    icon: "additive",
    description: "첨가물 허용범위, 사용기준, 등록번호, 복합첨가물 수입서류를 확인합니다.",
    primaryQuestion: "첨가물 성분과 사용목적이 대만 허용범위 안에 있나요?",
    query: "Taiwan food additive permit compound additive documents",
    requiredInputs: ["첨가물명", "사용 목적", "함량", "적용 식품", "등록번호"],
    expectedDocs: ["첨가물 허가/등록 자료", "성분 조성표", "공식 위생증명", "사용기준 검토", "수입신고 자료"]
  },
  {
    id: "tw_food_import",
    label: "식품 수입검사·통관",
    shortLabel: "수입검사",
    productType: "imported food / border inspection / Taiwan",
    family: "food",
    icon: "import",
    description: "HS/CCC, 수입검사 신청, 위생증명, 수입자 등록과 서류 흐름을 점검합니다.",
    primaryQuestion: "수입검사에서 보류될 수 있는 서류 공백이 있나요?",
    query: "Taiwan imported food inspection HS 0307 health certificate",
    requiredInputs: ["HS/CCC 코드", "원산지", "제조사", "수입자", "운송 목적"],
    expectedDocs: ["수입검사 신청서", "인보이스·패킹리스트", "위생증명", "수입자 등록", "제품 정보서"]
  },
  {
    id: "tw_health_food",
    label: "건강식품·기능성 표현",
    shortLabel: "건강식품",
    productType: "health food / supplement / Taiwan",
    family: "food",
    icon: "health",
    description: "건강식품 허가, 기능성·의학적 표현, 영양/효능 근거를 분리해서 봅니다.",
    primaryQuestion: "건강·면역·혈당 같은 표현이 허가 범위를 넘지 않나요?",
    query: "Taiwan health food permit claim labeling",
    requiredInputs: ["효능 표현", "성분", "섭취 방법", "근거자료", "허가번호"],
    expectedDocs: ["건강식품 허가자료", "기능성 근거", "영양표시", "광고 문안 검토", "부작용 대응 기록"]
  },
  {
    id: "tw_food_packaging",
    label: "식품용 포장재·용기",
    shortLabel: "포장재",
    productType: "food contact packaging / Taiwan import",
    family: "food",
    icon: "packaging",
    description: "식품 접촉 용도, 재질, 사용조건, 표시사항, 위생규격 증빙을 확인합니다.",
    primaryQuestion: "포장재 재질과 사용조건이 대만 식품용 기준에 맞나요?",
    query: "Taiwan food contact packaging labeling sanitation standards",
    requiredInputs: ["재질", "식품 접촉 용도", "온도 조건", "라벨", "시험성적서"],
    expectedDocs: ["재질·용도 표시", "위생/용출 시험", "사용조건", "원산지", "수입자 정보"]
  },
  {
    id: "tw_trade",
    label: "HS/CCC·수출입 규제",
    shortLabel: "통관",
    productType: "import export / HS CCC / Taiwan",
    family: "trade",
    icon: "trade",
    description: "HS/CCC 분류, 원산지 표시, 수출통제, 허가 코드가 필요한지 확인합니다.",
    primaryQuestion: "품목분류와 허가 코드가 라벨·서류와 맞게 연결됐나요?",
    query: "Taiwan CCC import export regulation HS code",
    requiredInputs: ["HS/CCC 코드", "상품 설명", "원산지", "거래조건", "수출입 목적"],
    expectedDocs: ["HS/CCC 근거", "인보이스", "원산지 표시", "허가 코드 검토", "수출통제 확인"]
  }
];

const sampleReviews: SampleReview[] = [
  {
    id: "cosmetic-risk",
    label: "화장품 리스크 예시",
    routeId: "tw_cosmetic",
    input: {
      productName: "Hydrating Repair Toner 300ml",
      productType: "leave-on toner / cosmetic / Taiwan import",
      origin: "Korea",
      manufacturer: "ANNAANDA Beauty Lab, Seoul",
      hsCode: "3304.99",
      incoterms: "DAP Taipei",
      shipmentPurpose: "commercial sale",
      invoiceValue: "4200",
      ingredientsText: "Water, Glycerin 4%, Butylene Glycol 3%, Niacinamide 2%, Salicylic acid 2.2%, Triclosan 0.5%, Phenoxyethanol 0.8%",
      labelText:
        "Product name: Hydrating Repair Toner. Net content: 300ml. Ingredients: Water, Glycerin, Butylene Glycol, Niacinamide, Salicylic Acid, Triclosan, Phenoxyethanol. Made in Korea. Lot C26TW01. EXP 2029-05-14. Claims: repairs acne and inflammation."
    }
  },
  {
    id: "cosmetic-ready",
    label: "PIF 준비 예시",
    routeId: "tw_cosmetic",
    input: {
      productName: "Cica Barrier Cream 50ml",
      productType: "leave-on cream / cosmetic / Taiwan import",
      origin: "Korea",
      manufacturer: "ANNAANDA Beauty Lab, Seoul / Taiwan Importer Co.",
      hsCode: "3304.99",
      incoterms: "DDP Taipei",
      shipmentPurpose: "commercial sale",
      invoiceValue: "1800",
      ingredientsText: "Water, Glycerin 5%, Centella Asiatica Extract, Panthenol 1%, Phenoxyethanol 0.7%, Chlorphenesin 0.2%",
      labelText:
        "Product name: Cica Barrier Cream. Net content: 50ml. Ingredients: Water, Glycerin, Centella Asiatica Extract, Panthenol, Phenoxyethanol, Chlorphenesin. Taiwan importer: Taiwan Importer Co. Made in Korea. Lot C26TW02. EXP 2029-06-01. Claim substantiation file, PIF, safety assessment, GMP certificate, adverse-event SOP, recall SOP, and source-flow ledger are prepared."
    }
  },
  {
    id: "food-allergen",
    label: "식품 알레르기 예시",
    routeId: "tw_food_label",
    input: {
      productName: "Peanut Butter Cookie 120g",
      productType: "prepackaged food / snack / Taiwan import",
      origin: "Korea",
      manufacturer: "ANNAANDA Foods, Seoul",
      hsCode: "1905.31",
      incoterms: "CIF Keelung",
      shipmentPurpose: "commercial sale",
      invoiceValue: "900",
      ingredientsText: "Wheat flour, Peanut, Milk powder, Butter, Sugar, Salt",
      labelText:
        "Product name: Peanut Butter Cookie. Net weight: 120g. Ingredients: wheat flour, peanut, milk powder, butter, sugar, salt. Made in Korea. EXP 2027-01-01. Nutrition facts: 500 kcal, protein 5g, fat 20g, carbohydrate 60g, sodium 300mg."
    }
  },
  {
    id: "shellfish-import",
    label: "수입검사 예시",
    routeId: "tw_food_import",
    input: {
      productName: "Frozen Oyster Meat 1kg",
      productType: "prepackaged food / frozen shellfish / HS 0307 / Taiwan import",
      origin: "Korea",
      manufacturer: "ANNAANDA Seafood, Tongyeong / Taiwan Importer Co.",
      hsCode: "0307.12",
      incoterms: "CIF Keelung",
      shipmentPurpose: "commercial sale",
      invoiceValue: "2400",
      ingredientsText: "Frozen oyster meat, Salt",
      labelText:
        "Product name: Frozen Oyster Meat. Net weight: 1kg. Ingredients: oyster meat, salt. Made in Korea. Taiwan importer: Taiwan Importer Co. EXP 2027-02-01. Nutrition facts prepared. Official health certificate and harvest-area statement pending."
    }
  },
  {
    id: "food-additive",
    label: "첨가물 예시",
    routeId: "tw_food_additive",
    input: {
      productName: "Seasoning Base 5kg",
      productType: "compound food additive / Taiwan import",
      origin: "Korea",
      manufacturer: "ANNAANDA Ingredients, Seoul / Taiwan Importer Co.",
      hsCode: "2106.90",
      incoterms: "CIF Keelung",
      shipmentPurpose: "commercial sale",
      invoiceValue: "1500",
      ingredientsText: "Sodium benzoate, Potassium sorbate, Citric acid, Dextrose carrier",
      labelText:
        "Product name: Seasoning Base. Net weight: 5kg. Ingredients: Sodium benzoate, Potassium sorbate, Citric acid, Dextrose. Use: food additive blend. Taiwan importer: Taiwan Importer Co. Composition report prepared. Official health certificate pending."
    }
  }
];

const statusCopy: Record<ReviewStatus, { label: string; tone: string; detail: string; icon: "fail" | "warn" | "info" | "pass" }> = {
  fail: {
    label: "출시 보류",
    tone: "danger",
    detail: "금지·초과·의학적 표현처럼 바로 수정해야 하는 항목이 있습니다.",
    icon: "fail"
  },
  warn: {
    label: "수정 권장",
    tone: "warn",
    detail: "판매 전 문구·라벨·증빙을 보강하면 통과 가능성이 높아집니다.",
    icon: "warn"
  },
  needs_info: {
    label: "자료 필요",
    tone: "info",
    detail: "판정을 확정하려면 함량, 수입자, 등록번호, 시험자료 등 추가 자료가 필요합니다.",
    icon: "info"
  },
  pass: {
    label: "진행 가능",
    tone: "pass",
    detail: "1차 자동검토에서는 큰 차단 항목이 보이지 않습니다. 공식 증빙은 계속 보관하세요.",
    icon: "pass"
  }
};

const knowledgeStats = [
  { label: "공식 소스", value: "166" },
  { label: "검색 별칭", value: "6,693" },
  { label: "규제 용어", value: "1,178" }
];

function routeIcon(icon: RoutePreset["icon"]) {
  if (icon === "cosmetic") return <FlaskConical size={18} />;
  if (icon === "food") return <PackageCheck size={18} />;
  if (icon === "additive") return <Sparkles size={18} />;
  if (icon === "import") return <Ship size={18} />;
  if (icon === "health") return <BadgeCheck size={18} />;
  if (icon === "packaging") return <FileText size={18} />;
  return <ShieldCheck size={18} />;
}

function statusIcon(status: ReviewStatus) {
  if (status === "fail") return <XCircle size={22} />;
  if (status === "pass") return <CheckCircle2 size={22} />;
  if (status === "warn") return <AlertTriangle size={22} />;
  return <ClipboardCheck size={22} />;
}

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function compact(value: string, maxLength = 160) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function findRoute(id: RouteId) {
  return routePresets.find((route) => route.id === id) ?? routePresets[0];
}

function routeFromInput(input: ReviewInput) {
  const text = `${input.productName} ${input.productType} ${input.ingredientsText} ${input.labelText} ${input.hsCode ?? ""}`.toLowerCase();
  if (/additive|sodium benzoate|potassium sorbate|compound/.test(text)) return findRoute("tw_food_additive");
  if (/shellfish|oyster|0307|import inspection|health certificate/.test(text)) return findRoute("tw_food_import");
  if (/health food|supplement|probiotic|immune|cholesterol|blood sugar/.test(text)) return findRoute("tw_health_food");
  if (/packaging|container|wrap|food contact|pvc|plastic/.test(text)) return findRoute("tw_food_packaging");
  if (/food|snack|beverage|cookie|tea|nutrition|allergen/.test(text)) return findRoute("tw_food_label");
  if (/hs|ccc|customs|export|import/.test(text) && !/cosmetic|food/.test(text)) return findRoute("tw_trade");
  return findRoute("tw_cosmetic");
}

async function requestReview(reviewInput: ReviewInput): Promise<ReviewResult> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reviewInput)
  });

  if (!response.ok) throw new Error("review_failed");
  return response.json();
}

async function requestKnowledgeEvidence(query: string, route: RoutePreset): Promise<KnowledgeEvidenceBundle> {
  const params = new URLSearchParams({
    q: query,
    limit: "12",
    product_family: route.family,
    route_id: route.id
  });
  const response = await fetch(`/api/knowledge/evidence?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) throw new Error("knowledge_failed");
  return response.json();
}

function readinessFor(input: ReviewInput) {
  const required = [
    { label: "제품명", ready: hasText(input.productName) },
    { label: "제품 유형", ready: hasText(input.productType) },
    { label: "성분 또는 라벨", ready: hasText(input.ingredientsText) || hasText(input.labelText) },
    { label: "원산지", ready: hasText(input.origin) },
    { label: "제조사·수입자", ready: hasText(input.manufacturer) }
  ];
  const readyCount = required.filter((item) => item.ready).length;
  return {
    required,
    readyCount,
    total: required.length,
    canReview: readyCount >= 3
  };
}

function findingTone(status: ReviewStatus) {
  if (status === "fail") return "danger";
  if (status === "warn") return "warn";
  if (status === "pass") return "pass";
  return "info";
}

function extractFindingSubject(finding: Finding) {
  const evidence = finding.evidence ?? "";
  const fromEvidence = evidence.split("/")[0]?.replace(/^input:\s*/i, "").trim();
  if (fromEvidence && /[A-Za-z0-9\u3400-\u9fff]/u.test(fromEvidence)) return compact(fromEvidence, 64);
  const idParts = finding.id.split("-");
  const tail = idParts.slice(-2).join(" ").replace(/[^\p{Letter}\p{Number}%.+\s-]/gu, " ").trim();
  return tail && tail.length > 2 ? compact(tail, 64) : "해당 항목";
}

function readableFinding(finding: Finding) {
  const id = finding.id.toLowerCase();
  const subject = extractFindingSubject(finding);

  if (id.startsWith("prohibited-")) {
    return {
      area: "성분",
      title: `${subject} 금지 성분 가능성`,
      why: "대만 화장품 금지 성분 목록과 매칭되었습니다. 판매 전 성분 교체 또는 제품 적용범위 재확인이 필요합니다.",
      fixes: ["해당 원료를 대체하거나 처방에서 제거", "공식 TFDA 원문과 COA/성분표 대조", "수정 처방으로 라벨과 PIF 재생성"]
    };
  }

  if (id.startsWith("over-limit-")) {
    return {
      area: "성분",
      title: `${subject} 허용 함량 초과 가능성`,
      why: "제한 성분의 입력 함량이 대만 기준보다 높게 감지되었습니다.",
      fixes: ["함량을 기준 이하로 조정", "최종 제품 COA와 배합표 확보", "제품 유형별 제한조건 재검토"]
    };
  }

  if (id.startsWith("missing-concentration-")) {
    return {
      area: "성분",
      title: `${subject} 함량 확인 필요`,
      why: "제한 성분 후보가 있지만 함량이 없어 통과 여부를 확정할 수 없습니다.",
      fixes: ["원료별 함량 또는 배합비 추가", "CAS/INCI/중문 별칭을 함께 기재", "공급사 COA와 배합표 첨부"]
    };
  }

  if (id.includes("scope-risk")) {
    return {
      area: "성분",
      title: `${subject} 제품 적용범위 확인`,
      why: "원료가 특정 제품 유형에만 허용될 수 있습니다. leave-on, rinse-off, 구강용 등 사용범위를 확인하세요.",
      fixes: ["제품 사용 방식을 명확히 기재", "원료 제한조건과 라벨 사용법 대조", "필요 시 처방 또는 카테고리 조정"]
    };
  }

  if (id.startsWith("label-")) {
    return {
      area: "라벨",
      title: "중문 라벨 필수 항목 보강",
      why: "제품명, 용도, 전성분, 순량, 제조/수입자, 원산지, 제조번호, 유통기한 중 일부가 부족할 수 있습니다.",
      fixes: ["중문 라벨 OCR 또는 원문 추가", "수입자와 책임업체 정보를 확정", "제품명·순량·원산지·LOT·EXP를 같은 버전으로 정리"]
    };
  }

  if (id.includes("origin")) {
    return {
      area: "서류",
      title: "원산지 표시·증빙 확인",
      why: "대만 라벨과 통관 서류에서 원산지 정보가 일치해야 합니다.",
      fixes: ["원산지 문구를 라벨에 반영", "COO 또는 제조국 증빙 확보", "인보이스와 포장 문구 일치 확인"]
    };
  }

  if (id.includes("manufacturer")) {
    return {
      area: "서류",
      title: "제조사·수입자 정보 확인",
      why: "대만 책임업체 또는 수입자 정보가 라벨·수입서류에 필요합니다.",
      fixes: ["대만 수입자명, 주소, 연락처 확보", "제조사 정보와 PIF/제품자료 연결", "라벨 책임업체 표기 재검토"]
    };
  }

  if (id.includes("medical-claim")) {
    return {
      area: "표현",
      title: "의학적 효능 표현 삭제 필요",
      why: "치료, 염증 완화, 질병 개선 등으로 읽힐 수 있는 표현은 화장품/식품 표시에서 고위험입니다.",
      fixes: ["치료·질병 표현 제거", "일반적 보습·청결·영양 표현으로 완화", "효능 근거자료와 광고 문안 동시 검토"]
    };
  }

  if (id.includes("claim")) {
    return {
      area: "표현",
      title: "효능·광고 문구 근거 확인",
      why: "기능성, 영양, 건강 관련 표현은 대만 기준에 맞는 근거와 허가 범위를 확인해야 합니다.",
      fixes: ["표현별 근거자료 매핑", "과장·오인 가능 문구 제거", "허가번호 또는 시험자료 보관"]
    };
  }

  if (id.includes("pif") || id.includes("gmp") || id.includes("notification") || id.includes("recall") || id.includes("adverse") || id.includes("source-flow")) {
    return {
      area: "PIF",
      title: "PIF·등록·사후관리 증빙 확인",
      why: "대만 화장품은 제품 정보파일, 등록/통보, 제조품질, 추적·회수 체계를 함께 관리해야 합니다.",
      fixes: ["PIF 목차와 책임자 지정", "제품등록/통보 상태 확인", "GMP·이상사례·회수 SOP를 제품 버전에 연결"]
    };
  }

  if (id.includes("food-additive") || id.includes("compound-food-additive")) {
    return {
      area: "식품첨가물",
      title: "첨가물 허용범위·등록 확인",
      why: "대만 첨가물 기준은 사용 목적, 적용 식품, 함량, 등록 여부를 함께 봅니다.",
      fixes: ["첨가물명과 용도 확인", "허용 식품군·최대 사용량 대조", "등록번호·성분조성표·위생증명 확보"]
    };
  }

  if (id.includes("allergen")) {
    return {
      area: "알레르기",
      title: "알레르기 표시 확인",
      why: "대만 필수 또는 권고 알레르기 원료가 포함될 수 있습니다.",
      fixes: ["중문 알레르기 경고문 추가", "교차오염 가능성 확인", "원재료명과 강조표시 일치 확인"]
    };
  }

  if (id.includes("nutrition") || id.includes("health-food")) {
    return {
      area: "영양·건강표현",
      title: "영양표시·건강표현 검토",
      why: "영양성분표와 저당·고단백·면역 등 표현은 기준치와 허가 범위를 확인해야 합니다.",
      fixes: ["영양성분표 단위와 기준량 확인", "표현별 기준 충족 여부 확인", "건강식품 허가 필요성 검토"]
    };
  }

  if (id.includes("import") || id.includes("hs0307") || id.includes("systematic") || id.includes("traceability")) {
    return {
      area: "수입검사",
      title: "수입검사 서류 확인",
      why: "수입식품은 제품정보, 수입자 등록, 위생증명, 추적관리 자료가 필요할 수 있습니다.",
      fixes: ["HS/CCC와 제품 설명 일치 확인", "수입검사 신청 자료 준비", "공식 위생증명·추적관리 기록 확보"]
    };
  }

  if (id.includes("food-contact")) {
    return {
      area: "포장재",
      title: "식품용 포장재 표시·재질 확인",
      why: "식품 접촉 재질은 용도, 온도 조건, 위생규격 시험자료를 함께 확인해야 합니다.",
      fixes: ["재질과 사용조건 표기", "위생/용출 시험성적서 확보", "전자레인지·고온 사용 문구 재검토"]
    };
  }

  if (id.includes("trade") || id.includes("customs") || id.includes("shtc") || id.includes("ccc") || id.includes("hs")) {
    return {
      area: "통관",
      title: "HS/CCC·수출입 규제 확인",
      why: "품목분류와 허가 코드가 라벨, 인보이스, 수입신고 자료와 맞아야 합니다.",
      fixes: ["HS/CCC 코드 근거 확보", "수입/수출 허가 코드 확인", "원산지 표시와 서류 일치 검토"]
    };
  }

  if (finding.status === "pass") {
    return {
      area: "확인",
      title: "1차 검토 통과 항목",
      why: "자동검토에서 즉시 차단되는 신호는 낮습니다. 공식 문서와 제품 버전 연결은 계속 유지하세요.",
      fixes: ["증빙 원문 링크 저장", "라벨 버전과 검토 결과 연결", "수입 전 최종 원문 재확인"]
    };
  }

  return {
    area: "검토",
    title: "추가 확인 필요",
    why: "자동검토가 확인 신호를 찾았습니다. 공식 원문과 제품 자료를 대조해 확정하세요.",
    fixes: ["제품 자료 보강", "공식 원문 링크 확인", "전문가 검토 필요 여부 판단"]
  };
}

function sourceLabel(source: string) {
  return source && /[A-Za-z]/.test(source) ? compact(source, 96) : "공식 규정 원문";
}

function documentChecklist(route: RoutePreset, result: ReviewResult | null) {
  const failingIds = result?.findings.map((finding) => finding.id.toLowerCase()) ?? [];
  return route.expectedDocs.map((doc) => {
    const needsAttention =
      (doc.includes("PIF") && failingIds.some((id) => id.includes("pif"))) ||
      (doc.includes("라벨") && failingIds.some((id) => id.startsWith("label-"))) ||
      (doc.includes("알레르기") && failingIds.some((id) => id.includes("allergen"))) ||
      (doc.includes("첨가물") && failingIds.some((id) => id.includes("additive"))) ||
      (doc.includes("위생증명") && failingIds.some((id) => id.includes("certificate") || id.includes("import"))) ||
      (doc.includes("HS") && failingIds.some((id) => id.includes("hs") || id.includes("ccc")));
    return {
      label: doc,
      status: needsAttention ? "보강" : result ? "확인" : "대기",
      tone: needsAttention ? "warn" : result ? "pass" : "neutral"
    };
  });
}

function labelFor(value: string) {
  const labels: Record<string, string> = {
    TW: "대만",
    KR: "한국",
    JP: "일본",
    CN: "중국",
    US: "미국",
    EU: "EU",
    GLOBAL: "글로벌",
    cosmetics: "화장품",
    food: "식품",
    food_labeling: "식품 라벨",
    food_import: "식품 수입",
    food_safety: "식품 안전",
    food_additives: "식품첨가물",
    food_contact_materials: "식품용 포장재",
    health_food: "건강식품",
    trade: "무역",
    trade_controls: "수출입 규제",
    customs: "통관",
    export_control: "수출통제",
    chemical_labeling: "화학물질 라벨",
    terminology: "용어",
    general_labeling: "일반 라벨",
    law: "법령",
    regulation: "규정",
    notice: "고시",
    guidance: "가이드",
    dataset: "공개 데이터",
    cosmetic_ingredient: "화장품 원료",
    food_ingredient: "식품 원료",
    food_additive: "식품첨가물",
    label_claim: "표시·광고 표현",
    allergen: "알레르기",
    documentation: "서류",
    import_export: "수출입",
    term: "용어"
  };

  return labels[value] ?? String(value ?? "").replaceAll("_", " ");
}

function confidenceLabel(value?: string) {
  if (value === "high") return "높음";
  if (value === "medium") return "중간";
  if (value === "low") return "낮음";
  return "확인 중";
}

function nextActionFor(result: ReviewResult | null, route: RoutePreset) {
  if (!result) return `${route.shortLabel} 자료를 넣고 1차 검토를 시작하세요.`;
  if (result.status === "fail") return "금지·초과·의학적 표현 항목을 먼저 수정한 뒤 다시 검토하세요.";
  if (result.status === "needs_info") return "함량, 수입자, 등록번호, 시험자료처럼 빠진 증빙을 보강하세요.";
  if (result.status === "warn") return "라벨 문구와 공식 증빙을 정리한 뒤 최종 검토로 넘기세요.";
  return "제품 버전, 라벨, 증빙 원문을 묶어서 출시 기록으로 보관하세요.";
}

export default function Home() {
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>("tw_cosmetic");
  const [input, setInput] = useState<ReviewInput>(emptyInput);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [evidenceBundle, setEvidenceBundle] = useState<KnowledgeEvidenceBundle | null>(null);
  const [savedReviews, setSavedReviews] = useState<Array<{ id: string; input: ReviewInput; result: ReviewResult }>>([]);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSearchingEvidence, setIsSearchingEvidence] = useState(false);
  const [toast, setToast] = useState("");
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedRoute = useMemo(() => findRoute(selectedRouteId), [selectedRouteId]);
  const readiness = useMemo(() => readinessFor(input), [input]);
  const sortedFindings = useMemo(() => {
    if (!result) return [];
    const rank: Record<ReviewStatus, number> = { fail: 0, needs_info: 1, warn: 2, pass: 3 };
    const seen = new Set<string>();
    return [...result.findings]
      .sort((left, right) => rank[left.status] - rank[right.status])
      .filter((finding) => {
        const clean = readableFinding(finding);
        const key = `${finding.status}:${clean.area}:${clean.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [result]);
  const visibleFindings = sortedFindings.slice(0, 6);
  const docs = useMemo(() => documentChecklist(selectedRoute, result), [result, selectedRoute]);

  useEffect(() => {
    const raw = window.localStorage.getItem("labelpass-reviews");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedReviews(parsed.slice(0, 5));
    } catch {
      window.localStorage.removeItem("labelpass-reviews");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("knowledge") || params.get("q") || "";
    if (query.trim()) {
      setKnowledgeQuery(query.trim());
      void runKnowledgeSearch(query.trim(), selectedRoute);
    }
    const routeParam = params.get("route_id");
    if (routeParam && routePresets.some((route) => route.id === routeParam)) {
      setSelectedRouteId(routeParam as RouteId);
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateInput(field: keyof ReviewInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function selectRoute(route: RoutePreset) {
    setSelectedRouteId(route.id);
    setResult(null);
    setEvidenceBundle(null);
    setInput((current) => ({
      ...current,
      productType: current.productType || route.productType
    }));
    setKnowledgeQuery(route.query);
  }

  function loadSample(sample: SampleReview) {
    setSelectedRouteId(sample.routeId);
    setInput(sample.input);
    setResult(null);
    setEvidenceBundle(null);
    setKnowledgeQuery(findRoute(sample.routeId).query);
    setToast(`${sample.label}를 불러왔습니다.`);
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const names = Array.from(files).map((file) => file.name).join(", ");
    setInput((current) => ({
      ...current,
      labelText: [current.labelText, `첨부 파일명: ${names}`].filter(Boolean).join("\n")
    }));
    setToast("파일명은 검토 메모에 붙였습니다. 실제 OCR 연결은 다음 단계에서 붙이면 됩니다.");
  }

  async function runKnowledgeSearch(query: string, route = selectedRoute) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearchingEvidence(true);
    try {
      const bundle = await requestKnowledgeEvidence(trimmed, route);
      setEvidenceBundle(bundle);
    } catch {
      setToast("증빙 검색을 가져오지 못했습니다. 잠시 후 다시 확인하겠습니다.");
    } finally {
      setIsSearchingEvidence(false);
    }
  }

  async function runReview(nextInput = input) {
    const route = routeFromInput(nextInput);
    setSelectedRouteId(route.id);
    setIsReviewing(true);
    setActiveFindingId(null);
    try {
      const nextResult = await requestReview(nextInput);
      setResult(nextResult);
      const review = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        input: nextInput,
        result: nextResult
      };
      const nextSaved = [review, ...savedReviews.filter((item) => item.input.productName !== nextInput.productName)].slice(0, 5);
      setSavedReviews(nextSaved);
      window.localStorage.setItem("labelpass-reviews", JSON.stringify(nextSaved));
      const evidenceQuery = knowledgeQuery.trim() || nextInput.productName || route.query;
      setKnowledgeQuery(evidenceQuery);
      await runKnowledgeSearch(evidenceQuery, route);
      setToast("1차 검토가 완료됐습니다.");
    } catch {
      setToast("검토 중 오류가 났습니다. 입력값을 줄여 다시 시도하겠습니다.");
    } finally {
      setIsReviewing(false);
    }
  }

  const currentStatus = result ? statusCopy[result.status] : null;
  const summaryItems = [
    { label: "차단", value: result?.summary.fail ?? 0, tone: "danger" },
    { label: "자료필요", value: result?.summary.needsInfo ?? 0, tone: "info" },
    { label: "수정권장", value: result?.summary.warn ?? 0, tone: "warn" },
    { label: "통과", value: result?.summary.pass ?? 0, tone: "pass" }
  ];

  return (
    <main className="lp-shell">
      <AppSidebar active="review" />

      <section className="lp-main" id="review">
        <header className="lp-topbar">
          <div>
            <p>대만 화장품·식품 라벨링 검토</p>
            <h1>자료를 넣으면 리스크, 증빙, 다음 작업을 한 화면에서 정리합니다.</h1>
          </div>
          <div className="lp-top-actions">
            <Link className="lp-button secondary" href="/knowledge">
              <Database size={16} />
              지식베이스
            </Link>
            <a className="lp-button secondary" href="#intake">
              <ClipboardCheck size={16} />
              자료 입력
            </a>
          </div>
        </header>

        <section className="lp-route-band" aria-label="검토 경로">
          <div className="lp-section-head">
            <div>
              <span>시작 경로</span>
              <h2>제품군을 먼저 고르면 필요한 입력과 증빙 목록이 바로 좁혀집니다.</h2>
            </div>
            <small>{selectedRoute.primaryQuestion}</small>
          </div>
          <div className="lp-route-grid">
            {routePresets.map((route) => (
              <button
                key={route.id}
                className={route.id === selectedRoute.id ? "lp-route-card active" : "lp-route-card"}
                type="button"
                aria-label={route.label}
                onClick={() => selectRoute(route)}
              >
                <span>{routeIcon(route.icon)}</span>
                <b>{route.shortLabel}</b>
                <small>{route.description}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="lp-workbench">
          <section className="lp-intake-panel" id="intake">
            <div className="lp-panel-head">
              <div>
                <span>입력</span>
                <h2>{selectedRoute.label}</h2>
              </div>
              <em>{readiness.readyCount}/{readiness.total}</em>
            </div>

            <div className="lp-readiness">
              {readiness.required.map((item) => (
                <span key={item.label} className={item.ready ? "ready" : ""}>
                  {item.ready ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {item.label}
                </span>
              ))}
            </div>

            <div className="lp-field-grid">
              <label className="lp-field">
                <span>제품명</span>
                <input value={input.productName} onChange={(event) => updateInput("productName", event.target.value)} placeholder="예: Cica Barrier Cream 50ml" />
              </label>
              <label className="lp-field">
                <span>제품 유형</span>
                <input value={input.productType} onChange={(event) => updateInput("productType", event.target.value)} placeholder={selectedRoute.productType} />
              </label>
              <label className="lp-field">
                <span>원산지</span>
                <input value={input.origin} onChange={(event) => updateInput("origin", event.target.value)} placeholder="Korea" />
              </label>
              <label className="lp-field">
                <span>제조사·수입자</span>
                <input value={input.manufacturer} onChange={(event) => updateInput("manufacturer", event.target.value)} placeholder="제조사 / Taiwan importer" />
              </label>
              <label className="lp-field">
                <span>HS/CCC</span>
                <input value={input.hsCode ?? ""} onChange={(event) => updateInput("hsCode", event.target.value)} placeholder="예: 3304.99, 1905.31, 0307.12" />
              </label>
              <label className="lp-field">
                <span>거래조건</span>
                <input value={input.incoterms ?? ""} onChange={(event) => updateInput("incoterms", event.target.value)} placeholder="DAP Taipei / CIF Keelung" />
              </label>
            </div>

            <label className="lp-field lp-wide">
              <span>성분·원재료</span>
              <textarea value={input.ingredientsText} onChange={(event) => updateInput("ingredientsText", event.target.value)} placeholder="INCI, CAS, 중문명, 함량을 가능한 한 같이 넣어주세요." rows={6} />
            </label>

            <label className="lp-field lp-wide">
              <span>라벨·광고 문안</span>
              <textarea value={input.labelText} onChange={(event) => updateInput("labelText", event.target.value)} placeholder="중문 라벨, 영문/한국어 원문, 효능 표현, 주의사항, 유통기한 등을 붙여넣으세요." rows={7} />
            </label>

            <div className="lp-intake-actions">
              <input ref={fileInputRef} className="lp-file-input" type="file" multiple onChange={(event) => handleFiles(event.currentTarget.files)} />
              <button className="lp-button secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud size={16} />
                파일 메모
              </button>
              <button className="lp-button" type="button" onClick={() => void runReview()} disabled={!readiness.canReview || isReviewing}>
                {isReviewing ? <Loader2 className="lp-spin" size={16} /> : <ArrowRight size={16} />}
                검토 시작
              </button>
            </div>

            <details className="lp-sample-drawer">
              <summary>예시 데이터로 빠르게 확인</summary>
              <div>
                {sampleReviews.map((sample) => (
                  <button key={sample.id} type="button" onClick={() => loadSample(sample)}>
                    {sample.label}
                  </button>
                ))}
              </div>
            </details>
          </section>

          <section className="lp-result-panel">
            <div className="lp-panel-head">
              <div>
                <span>판정</span>
                <h2>{result ? "1차 검토 결과" : "아직 검토 전입니다"}</h2>
              </div>
              {result && <em>{result.score}/100</em>}
            </div>

            {result && currentStatus ? (
              <>
                <div className={`lp-verdict ${currentStatus.tone}`}>
                  <span>{statusIcon(result.status)}</span>
                  <div>
                    <b>{currentStatus.label}</b>
                    <p>{currentStatus.detail}</p>
                  </div>
                </div>

                <div className="lp-summary-row">
                  {summaryItems.map((item) => (
                    <span key={item.label} className={item.tone}>
                      <b>{item.value}</b>
                      {item.label}
                    </span>
                  ))}
                </div>

                <div className="lp-next-action">
                  <Sparkles size={18} />
                  <div>
                    <b>다음 작업</b>
                    <span>{nextActionFor(result, selectedRoute)}</span>
                  </div>
                </div>

                <div className="lp-finding-list">
                  {visibleFindings.map((finding) => {
                    const clean = readableFinding(finding);
                    const isActive = activeFindingId === finding.id;
                    return (
                      <article key={finding.id} className={`lp-finding ${findingTone(finding.status)}`}>
                        <button type="button" onClick={() => setActiveFindingId(isActive ? null : finding.id)}>
                          <span>{clean.area}</span>
                          <div>
                            <b>{clean.title}</b>
                            <small>{clean.why}</small>
                          </div>
                          <em>{statusCopy[finding.status].label}</em>
                        </button>
                        {isActive && (
                          <div className="lp-finding-detail">
                            <ul>
                              {clean.fixes.map((fix) => (
                                <li key={fix}>{fix}</li>
                              ))}
                            </ul>
                            <a href={finding.sourceUrl} target="_blank" rel="noreferrer">
                              {sourceLabel(finding.source)}
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {sortedFindings.length > visibleFindings.length && (
                    <div className="lp-muted-note">추가 항목 {sortedFindings.length - visibleFindings.length}개는 세부 보고서 화면에서 펼치도록 남겨두었습니다.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="lp-empty-state">
                <ShieldCheck size={28} />
                <b>자료를 넣고 검토를 시작하세요.</b>
                <span>처음부터 모든 경로가 보이지만, 선택한 경로의 필수 입력과 증빙만 먼저 정리됩니다.</span>
              </div>
            )}
          </section>

          <aside className="lp-side-panel">
            <section className="lp-mini-panel">
              <div className="lp-panel-head compact">
                <div>
                  <span>증빙</span>
                  <h2>공식 지식 확인</h2>
                </div>
                {isSearchingEvidence && <Loader2 className="lp-spin" size={16} />}
              </div>
              <label className="lp-search-box">
                <Search size={16} />
                <input value={knowledgeQuery} onChange={(event) => setKnowledgeQuery(event.target.value)} placeholder={selectedRoute.query} />
                <button type="button" onClick={() => void runKnowledgeSearch(knowledgeQuery || selectedRoute.query)}>
                  검색
                </button>
              </label>
              {evidenceBundle ? (
                <div className="lp-evidence-stack">
                  <div className="lp-evidence-score">
                    <span>신뢰도</span>
                    <b>{confidenceLabel(evidenceBundle.confidence)}</b>
                    <small>
                      용어 {evidenceBundle.terms.length}개, 공식 소스 {evidenceBundle.sources.length}개
                    </small>
                  </div>
                  <div className="lp-evidence-list">
                    {evidenceBundle.terms.slice(0, 3).map((term) => (
                      <span key={term.id}>
                        <b>{term.canonicalName}</b>
                        <small>{labelFor(term.category)}</small>
                      </span>
                    ))}
                    {evidenceBundle.sources.slice(0, 3).map((source) => (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                        <b>{source.title}</b>
                        <small>{source.authority} · {labelFor(source.domain)}</small>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lp-side-empty">
                  <BookOpen size={20} />
                  <span>제품명, 성분명, PIF, HS/CCC 같은 단어로 공식 소스를 바로 찾을 수 있습니다.</span>
                </div>
              )}
            </section>

            <section className="lp-mini-panel">
              <div className="lp-panel-head compact">
                <div>
                  <span>필수 증빙</span>
                  <h2>{selectedRoute.shortLabel} 체크리스트</h2>
                </div>
              </div>
              <div className="lp-doc-list">
                {docs.map((doc) => (
                  <span key={doc.label} className={doc.tone}>
                    <FileText size={15} />
                    <b>{doc.label}</b>
                    <em>{doc.status}</em>
                  </span>
                ))}
              </div>
            </section>

            <section className="lp-mini-panel">
              <div className="lp-panel-head compact">
                <div>
                  <span>운영 상태</span>
                  <h2>재사용 지식베이스</h2>
                </div>
              </div>
              <div className="lp-stat-grid">
                {knowledgeStats.map((stat) => (
                  <span key={stat.label}>
                    <b>{stat.value}</b>
                    {stat.label}
                  </span>
                ))}
              </div>
              <Link className="lp-inline-link" href="/knowledge">
                용어·규정 검색으로 이동
                <ArrowRight size={14} />
              </Link>
            </section>

            <section className="lp-mini-panel">
              <div className="lp-panel-head compact">
                <div>
                  <span>최근 검토</span>
                  <h2>브라우저 기록</h2>
                </div>
              </div>
              <div className="lp-history-list">
                {savedReviews.length ? (
                  savedReviews.map((review) => (
                    <button key={review.id} type="button" onClick={() => {
                      setInput(review.input);
                      setResult(review.result);
                      setSelectedRouteId(routeFromInput(review.input).id);
                    }}>
                      <History size={15} />
                      <span>
                        <b>{review.input.productName || "이름 없는 제품"}</b>
                        <small>{statusCopy[review.result.status].label} · {review.result.score}/100</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="lp-history-empty">검토 후 자동으로 여기에 남습니다.</span>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {toast && <div className="lp-toast">{toast}</div>}
    </main>
  );
}
