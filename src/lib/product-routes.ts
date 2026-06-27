export type ProductRouteId =
  | "tw_cosmetic_label_pif"
  | "tw_food_label_allergen"
  | "tw_food_additive_ingredient"
  | "tw_food_import_inspection"
  | "tw_health_food_claims"
  | "tw_food_contact_packaging"
  | "tw_customs_origin_hs"
  | "tw_trade_control_shtc";

export type StartRouteIcon = "cosmetic" | "food" | "additive" | "import" | "health" | "packaging" | "customs" | "trade";

export type StartRouteOption = {
  id: ProductRouteId;
  icon: StartRouteIcon;
  label: string;
  detail: string;
  productFamily: string;
  productType: string;
  query: string;
  shipmentPurpose?: string;
  hsCode?: string;
  inputs: string[];
  tags: string[];
};

export type ProductRouteHintLike = {
  routeId: string;
  label: string;
  nextAction: string;
  openQuestions?: string[];
  requiredInputs: string[];
};

export const startRouteOptions: StartRouteOption[] = [
  {
    id: "tw_cosmetic_label_pif",
    icon: "cosmetic",
    label: "화장품 라벨·PIF",
    detail: "전성분, 제품 등록, PIF, 표시 문구를 먼저 묶어 라벨 검토로 연결합니다.",
    productFamily: "cosmetic",
    productType: "cosmetic / 일반 화장품",
    query: "PIF",
    inputs: ["제품명", "화장품 분류", "사용 방식"],
    tags: ["INCI", "PIF", "제품 등록"]
  },
  {
    id: "tw_food_label_allergen",
    icon: "food",
    label: "포장식품 표시",
    detail: "식품 유형, 원재료, 알레르겐, 영양·표시 문구를 먼저 좁힙니다.",
    productFamily: "food",
    productType: "prepackaged food / 식품",
    query: "allergen labeling",
    inputs: ["식품 유형", "원재료명", "알레르겐"],
    tags: ["알레르겐", "영양표시", "표시 문구"]
  },
  {
    id: "tw_food_additive_ingredient",
    icon: "additive",
    label: "식품첨가물·원료",
    detail: "공식 명칭, 기능군, 사용량, 적용 식품을 기준으로 허용 여부를 봅니다.",
    productFamily: "food_additive",
    productType: "food additive / 식품첨가물",
    query: "food additive",
    inputs: ["공식 명칭", "기능군", "사용량"],
    tags: ["첨가물", "CAS", "사용 기준"]
  },
  {
    id: "tw_food_import_inspection",
    icon: "import",
    label: "식품 수입·통관",
    detail: "HS/CCC, 수입 목적, 원산지, 검사 서류를 통관 경로에 맞춰 확인합니다.",
    productFamily: "food_import",
    productType: "food import / 수입식품",
    query: "imported food inspection",
    shipmentPurpose: "commercial import / 상업 수입",
    inputs: ["HS/CCC", "원산지", "수입자"],
    tags: ["수입검사", "통관", "서류"]
  },
  {
    id: "tw_health_food_claims",
    icon: "health",
    label: "건강식품 허가·효능",
    detail: "허가번호와 승인 효능 범위를 확인한 뒤 표시 문구를 제한합니다.",
    productFamily: "health_food",
    productType: "health food / 건강식품",
    query: "health food permit",
    inputs: ["허가번호", "승인 효능", "기능성 원료"],
    tags: ["허가번호", "효능 문구", "건강식품"]
  },
  {
    id: "tw_food_contact_packaging",
    icon: "packaging",
    label: "식품접촉 포장·용기",
    detail: "재질, 식품접촉 용도, 사용 조건, 시험성적서를 먼저 확인합니다.",
    productFamily: "food_contact",
    productType: "food contact packaging / 식품접촉재",
    query: "food contact packaging",
    inputs: ["재질", "식품접촉 용도", "시험성적서"],
    tags: ["포장재", "용기", "시험 기준"]
  },
  {
    id: "tw_trade_control_shtc",
    icon: "trade",
    label: "SHTC·수출입 통제",
    detail: "CCC 코드, 기술 사양, 목적지, 최종 용도로 통제 선별 여부를 봅니다.",
    productFamily: "trade_control",
    productType: "trade control / 수출입 통제",
    query: "SHTC",
    shipmentPurpose: "export control screening / 수출입 통제 선별",
    inputs: ["CCC 코드", "기술 사양", "목적지"],
    tags: ["SHTC", "CCC", "최종 용도"]
  }
];

const routeLabels: Record<ProductRouteId, string> = {
  tw_cosmetic_label_pif: "대만 화장품 라벨·PIF·시장진입",
  tw_food_label_allergen: "대만 포장식품 표시·알레르겐·영양",
  tw_food_additive_ingredient: "대만 식품첨가물·원료 허용성",
  tw_food_import_inspection: "대만 식품 수입검사·통관 서류",
  tw_health_food_claims: "대만 건강식품 허가·효능 문구",
  tw_food_contact_packaging: "대만 식품접촉 포장·용기 표시",
  tw_customs_origin_hs: "대만 HS/CCC·원산지·통관 표시",
  tw_trade_control_shtc: "대만 SHTC·수출입 통제 선별"
};

const routeActions: Record<ProductRouteId, string> = {
  tw_cosmetic_label_pif: "화장품 분류, PIF/제품등록, 전성분 근거를 먼저 묶은 뒤 라벨 검토로 넘기세요.",
  tw_food_label_allergen: "식품 유형, 원재료, 알레르겐, 영양·표시 문구를 먼저 확정하세요.",
  tw_food_additive_ingredient: "공식 명칭, 기능군, 사용량, 식품 유형을 확인한 뒤 허용 여부를 판단하세요.",
  tw_food_import_inspection: "HS/CCC, 수입 목적, 원산지, 수입자와 검사 서류를 먼저 맞추세요.",
  tw_health_food_claims: "허가번호와 승인된 보건효능 범위를 확인한 뒤 표시 문구를 제한하세요.",
  tw_food_contact_packaging: "식품접촉 여부, 재질, 사용 조건, 시험성적서를 먼저 확인하세요.",
  tw_customs_origin_hs: "HS/CCC와 원산지 증빙을 먼저 맞춘 뒤 표시와 수출입 서류를 정리하세요.",
  tw_trade_control_shtc: "CCC 코드, 기술 사양, 용도, 목적지로 SHTC 통제 여부를 먼저 선별하세요."
};

const questionLabels: Record<string, string> = {
  "Is the product a general cosmetic, specific-purpose cosmetic, spray/aerosol, or borderline product?": "일반 화장품, 특정용도 화장품, 스프레이/에어로졸, 경계 품목 중 어디에 해당하나요?",
  "Is the product prepackaged food, bulk food, additive, health food, special dietary food, or food-contact packaging?": "포장식품, 벌크식품, 첨가물, 건강식품, 특수영양식품, 식품접촉재 중 어디에 해당하나요?",
  "Is the material a food ingredient, single food additive, compound food additive, flavor, or processing aid?": "원료, 단일 첨가물, 복합 첨가물, 향료, 가공보조제 중 무엇인가요?",
  "Is this commercial import, sample, testing, personal use, return, repair, or exhibition shipment?": "상업 수입, 샘플, 시험, 개인사용, 반품, 수리, 전시 중 어떤 목적의 화물인가요?",
  "Is the product legally registered as Taiwan health food?": "대만 건강식품으로 허가·등록된 제품인가요?",
  "Is the article intended for direct food contact?": "제품이 식품에 직접 닿는 용도인가요?",
  "Which HS/CCC code is declared and does an advance ruling exist?": "신고할 HS/CCC 코드와 사전심사 근거가 있나요?",
  "Does the CCC code, technical spec, destination, or end use trigger SHTC screening?": "CCC 코드, 기술 사양, 목적지, 최종용도가 SHTC 선별 대상인가요?"
};

const inputLabels: Record<string, string> = {
  "product name": "제품명",
  "cosmetic category": "화장품 분류",
  "leave-on/rinse-off/spray": "사용 방식",
  "specific-purpose function": "특정용도 기능",
  "ingredient list": "전성분",
  "Taiwan label text": "대만 라벨 문구",
  "food category": "식품 유형",
  "ingredient statement": "원재료명",
  "allergen sources": "알레르겐 원료",
  "nutrition facts": "영양성분",
  "claim wording": "표시·광고 문구",
  "package size": "포장 용량",
  "substance/common name": "물질·공식 명칭",
  "CAS or local name": "CAS·현지명",
  "functional class": "기능군",
  "use level": "사용량",
  "compound additive status": "복합첨가물 여부",
  "HS/CCC code": "HS/CCC 코드",
  "HS/CCC": "HS/CCC 코드",
  "origin": "원산지",
  "importer": "수입자",
  "shipment purpose": "수입 목적",
  "invoice value": "송장 금액",
  "documents": "서류",
  "permit status": "허가 상태",
  "permit number": "허가번호",
  "approved effect": "승인 효능",
  "functional ingredient": "기능성 원료",
  "label copy": "라벨 문안",
  "dosage/use instructions": "섭취·사용 방법",
  "material": "재질",
  "food-contact intent": "식품접촉 용도",
  "temperature/use condition": "온도·사용 조건",
  "import purpose": "수입 목적",
  "label text": "표시 문구",
  "test report": "시험성적서",
  "incoterms": "인코텀즈",
  "importer/exporter": "수입자·수출자",
  "label origin": "라벨 원산지",
  "CCC code": "CCC 코드",
  "technical specification": "기술 사양",
  "end use": "최종 용도",
  "destination": "목적지",
  "shipper/consignee": "송하인·수하인",
  "export/import permit status": "수출입 허가 상태"
};

export function isProductRouteId(value?: string): value is ProductRouteId {
  return Boolean(value && value in routeLabels);
}

export function getStartRouteOption(routeId?: string) {
  return startRouteOptions.find((route) => route.id === routeId) ?? startRouteOptions[0];
}

export function formatProductRouteLabel(routeId: string, fallback: string) {
  return isProductRouteId(routeId) ? routeLabels[routeId] : fallback;
}

export function formatProductRouteAction(routeId: string, fallback: string) {
  return isProductRouteId(routeId) ? routeActions[routeId] : fallback;
}

export function formatProductRouteInput(value: string) {
  return inputLabels[value] ?? value;
}

export function formatProductRouteQuestion(value: string) {
  return questionLabels[value] ?? value;
}

export function productRouteCopyForHint(route: ProductRouteHintLike) {
  return {
    label: formatProductRouteLabel(route.routeId, route.label),
    nextAction: formatProductRouteAction(route.routeId, route.nextAction),
    openQuestion: formatProductRouteQuestion(route.openQuestions?.[0] ?? route.nextAction),
    requiredInputs: route.requiredInputs.map(formatProductRouteInput)
  };
}
