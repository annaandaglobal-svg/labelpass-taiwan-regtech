export type KnowledgeVerdictTone = "green" | "blue" | "gold" | "red" | "neutral";

export type KnowledgeTermForVerdict = {
  id: string;
  canonicalName: string;
  category: string;
  sourceKeys?: string[];
  notes?: string;
};

export type KnowledgeVerdict = {
  label: string;
  detail: string;
  tone: KnowledgeVerdictTone;
  chips: string[];
  actions: string[];
};

const verdictOverrides: Record<string, KnowledgeVerdict> = {
  "potassium-glycerophosphate-food-additive": {
    label: "첨가물 용도 사용불가",
    detail:
      "금지목록 성분으로 확인된 것은 아니지만, 대만 식품첨가물/영양첨가물 포지티브 리스트에서 Potassium Glycerophosphate 정확명 등재가 확인되지 않습니다. 따라서 첨가물 용도라면 현재 근거로는 사용 불가로 판단하고, 일반 식품원료라고 주장하려면 TFDA 원료조회/공식 분류, 허가증, 중문명, 정확한 염 형태, 최종 식품군, 사용량 근거가 필요합니다.",
    tone: "red",
    chips: ["첨가물 용도 사용불가", "금지목록 금지와 구분", "포지티브리스트 미등재", "일반원료는 별도 입증"],
    actions: [
      "식품첨가물/영양첨가물 용도라면 허가증 또는 공식 분류 근거가 나오기 전까지 승인하지 마세요.",
      "일반 식품원료 주장 시 TFDA 원료조회 결과, 중문명, 염 형태, 사용량, 최종 식품군, 규격서를 받아 재판정하세요."
    ]
  },
  "aspergillus-oryzae-fermented-powder": {
    label: "원료 분류 필요",
    detail:
      "대만에서 바로 허용 원료로 단정할 수 없습니다. 발효분말은 균종, 균주, 배지/기질, 효소 활성, 살아있는 균 포함 여부, 최종 식품군에 따라 일반 식품원료, 효소제/가공보조제, 첨가물, 건강식품 원료로 갈릴 수 있습니다. TFDA 원료조회 또는 공식 분류 근거 없이 통관 승인으로 판단하면 안 됩니다.",
    tone: "gold",
    chips: ["분류 필요", "균주·기질 확인", "TFDA 원료조회 필요", "효소/첨가물 가능성"],
    actions: [
      "균주명, 배지/기질, 제조공정, 살아있는 균 포함 여부, 효소 활성, COA를 먼저 받으세요.",
      "TFDA 원료조회나 공식 분류 근거로 일반 식품원료인지 첨가물/가공보조제인지 분리하세요."
    ]
  },
  "aspergillus-niger-culture": {
    label: "원료 분류 필요",
    detail:
      "대만에서 바로 허용 원료로 단정할 수 없습니다. Aspergillus niger 배양물은 균주, 생산물, 효소 활성, 잔류 균체/독소 관리, 배지/기질, 사용 목적에 따라 일반 원료가 아니라 효소제, 가공보조제, 식품첨가물 또는 별도 안전성 검토 대상으로 갈릴 수 있습니다.",
    tone: "gold",
    chips: ["분류 필요", "균주·독소 관리", "효소/가공보조제 가능", "공식 근거 필요"],
    actions: [
      "균주 증명, 독소/오염 관리, 배지/기질, 효소 활성, 최종 제품 내 잔류 여부를 확인하세요.",
      "일반 원료 주장만으로 승인하지 말고 TFDA 원료조회 또는 공식 분류 근거를 확보하세요."
    ]
  },
  "steviol-glycosides-food-additive": {
    label: "첨가물 조건부 허용",
    detail:
      "스테비아 원물명으로 검색되더라도 대만 실무에서는 대개 감미료인 Steviol Glycosides 정체성 확인이 먼저입니다. 허용 여부는 첨가물 기준의 사용범위, 한도, 최종 식품군, 표시명, 사용량을 맞춰야 판단할 수 있습니다. 원물 추출물인지 정제 감미료인지 구분하지 않으면 승인하면 안 됩니다.",
    tone: "gold",
    chips: ["감미료 정체성 확인", "사용범위·한도 필요", "식품군 확인", "표시명 확인"],
    actions: [
      "스테비아 원물/추출물/Steviol Glycosides 중 무엇인지 규격서와 COA로 분리하세요.",
      "최종 식품군과 사용량을 첨가물 기준에 대조한 뒤 라벨 표시명을 확정하세요."
    ]
  }
};

export function verdictForKnowledgeTerm(term: KnowledgeTermForVerdict): KnowledgeVerdict | null {
  const override = verdictOverrides[term.id];
  if (override) return override;

  const category = term.category;

  if (category === "prohibited") {
    return {
      label: "화장품 사용불가",
      detail:
        "대만 화장품 금지성분 목록에 연결된 항목입니다. 화장품 원료로는 사용 불가로 판단하고, 동명이물질·염 형태·CAS가 다른 경우에만 별도 확인하세요.",
      tone: "red",
      chips: ["금지성분", "화장품 사용불가", "CAS/염 형태 확인"],
      actions: ["화장품 배합표에서 제거하거나, 다른 물질임을 CAS/규격서로 입증하세요."]
    };
  }

  if (
    [
      "restricted",
      "preservative",
      "colorant",
      "sunscreen",
      "ph_adjuster",
      "cosmetic_ingredient_restriction",
      "colorant_uv_filter",
      "uv_filter",
      "oxidizing_agent",
      "skin_lightening_agent",
      "hair_dye_ingredient"
    ].includes(category)
  ) {
    return {
      label: "조건부 허용",
      detail:
        "대만 화장품 제한/허용 성분에 연결된 항목입니다. 허용 자체보다 제품 유형, 사용 목적, 최대 함량, 적용 부위, 주의문구, 금지 용도 조건을 맞추는지가 핵심입니다. 조건을 초과하면 사용 불가입니다.",
      tone: "gold",
      chips: ["함량 제한", "제품군 확인", "주의문구 확인", "초과 시 사용불가"],
      actions: ["제품 유형, 함량, 사용 목적, 적용 부위, 필수 주의문구를 TFDA 제한표와 대조하세요."]
    };
  }

  if (category === "food_additive") {
    return {
      label: "첨가물 조건부 허용",
      detail:
        "대만 식품첨가물은 포지티브 리스트 방식입니다. 목록에 연결된 일반 첨가물이라도 사용범위, 한도, 식품군, 첨가물 기능, 허가증/등록 필요 여부를 확인해야 허용 판단이 가능합니다. 목록·사용조건·허가증 근거가 없으면 승인하지 마세요.",
      tone: "gold",
      chips: ["포지티브 리스트", "사용범위·한도 확인", "식품군 확인", "허가증 가능성"],
      actions: ["최종 식품군, 사용량, 기능, 중문명, 허가증/등록 필요 여부를 TFDA 기준과 대조하세요."]
    };
  }

  if (category === "food_allergen") {
    return {
      label: "알레르겐 표시 필수",
      detail:
        "대만 식품 알레르겐 표시 대상에 연결된 항목입니다. 성분으로 존재하거나 유래 원료가 있으면 표시 누락이 주요 리스크입니다. 허용/금지 문제가 아니라 라벨 표시와 교차오염 문구 판단이 핵심입니다.",
      tone: "red",
      chips: ["표시 필수", "유래원료 확인", "교차오염 검토"],
      actions: ["원재료명, 복합원료 구성, 유래 성분, 알레르겐 강조 표시 여부를 확인하세요."]
    };
  }

  if (category === "food_allergen_advisory") {
    return {
      label: "알레르겐 권고표시",
      detail:
        "대만 권고 알레르겐 또는 소비자 주의 대상에 연결된 항목입니다. 법정 필수 표시와 구분하되, 원료 존재·교차오염·소비자 안전 리스크가 있으면 권고 표시를 검토해야 합니다.",
      tone: "gold",
      chips: ["권고표시", "교차오염 확인", "소비자 주의"],
      actions: ["필수 표시 대상인지 권고 표시 대상인지 분리하고, 교차오염 관리 문서를 확인하세요."]
    };
  }

  if (category === "fermented_food_ingredient") {
    return {
      label: "원료 분류 필요",
      detail:
        "발효·배양 유래 원료는 대만에서 일반 식품원료로 바로 단정하기 어렵습니다. 균주, 기질, 효소 활성, 살아있는 균 여부, 최종 사용 목적에 따라 첨가물/가공보조제/건강식품 원료 검토로 이동할 수 있습니다.",
      tone: "gold",
      chips: ["분류 필요", "균주 확인", "기질 확인", "공식 근거 필요"],
      actions: ["균주·기질·제조공정·잔류 여부·COA를 확보하고 TFDA 원료조회 또는 공식 분류 근거를 확인하세요."]
    };
  }

  if (category === "health_food" || category === "health_food_claim" || category === "health_food_labeling") {
    return {
      label: "허가 없으면 표현불가",
      detail:
        "대만 건강식품은 일반 건강 보조 표현과 구분되는 허가제 영역입니다. 건강식품 명칭, 로고, 승인 효능, 허가번호, 섭취/주의 문구는 허가 범위 안에서만 사용할 수 있습니다.",
      tone: "red",
      chips: ["허가제", "효능표현 제한", "허가번호 필요"],
      actions: ["건강식품 허가번호와 승인 효능 범위를 확인하고, 미허가 제품은 건강식품 표현을 제거하세요."]
    };
  }

  if (category === "food_labeling") {
    return {
      label: "라벨 필수검토",
      detail:
        "대만 식품 라벨 필수 항목 또는 표시·광고 리스크에 연결된 항목입니다. 허용/금지보다 제품명, 원재료, 알레르겐, 영양성분, 원산지, 수입자, 유통기한, 효능표현의 완성도가 핵심입니다.",
      tone: "blue",
      chips: ["라벨 항목 확인", "효능표현 검토", "원산지·수입자 확인"],
      actions: ["중문 라벨 초안을 기준으로 필수 항목과 효능표현 리스크를 검토하세요."]
    };
  }

  if (category === "food_import") {
    return {
      label: "수입검사 서류필요",
      detail:
        "대만 식품 수입검사 또는 수입자 등록 경로에 연결된 항목입니다. 품목 허용 여부와 별개로 HS/CCC, 수입검사 신청, 수입자 등록, 제품정보표, 위생증명서 등 서류가 준비되어야 통관 판단이 가능합니다.",
      tone: "gold",
      chips: ["수입검사", "HS/CCC 확인", "수입자 등록", "서류 필요"],
      actions: ["HS/CCC, 수입자 등록, 제품정보표, 위생증명서 필요 여부를 먼저 확정하세요."]
    };
  }

  if (category === "cosmetic_compliance") {
    return {
      label: "화장품 등록·PIF 확인",
      detail:
        "대만 화장품 등록, PIF, GMP, 안전성 자료 의무에 연결된 항목입니다. 제품 유형과 시행일에 따라 등록·PIF·안전성 평가 자료 준비 여부가 달라집니다.",
      tone: "gold",
      chips: ["PIF", "제품등록", "GMP", "안전성자료"],
      actions: ["제품 유형, 출시일, 책임업자, PIF 보유 여부, 안전성 평가 자료를 확인하세요."]
    };
  }

  if (category === "cosmetic_ingredient") {
    return {
      label: "화장품 원료 확인",
      detail:
        "일반 화장품 원료로 연결된 항목입니다. 금지/제한 성분으로 바로 판정된 것은 아니지만, INCI/CAS, 기능, 함량, 제품 유형, 효능 표현, PIF 안전성 자료에 따라 제한성분·의약적 효능표현 리스크가 생길 수 있습니다.",
      tone: "blue",
      chips: ["INCI/CAS 확인", "함량 확인", "효능표현 확인", "PIF 근거 필요"],
      actions: ["INCI/CAS, 배합량, 기능, 제품 유형, 효능표현, PIF 안전성 자료를 함께 확인하세요."]
    };
  }

  if (category === "botanical_ingredient") {
    return {
      label: "식물성 원료 분류필요",
      detail:
        "식물성 원료는 원물, 추출물, 농축물, 기능성 지표성분, 건강식품 주장 여부에 따라 일반 식품/화장품 원료, 건강식품, 효능표현 리스크로 갈릴 수 있습니다. 원료명만으로 허용을 단정하지 마세요.",
      tone: "gold",
      chips: ["원물/추출물 구분", "지표성분 확인", "효능표현 주의", "분류 필요"],
      actions: ["사용 부위, 추출용매, 지표성분, 농축비, 최종 용도, 효능표현을 받아 분류하세요."]
    };
  }

  if (category === "food_ingredient") {
    return {
      label: "식품원료 분류확인",
      detail:
        "일반 식품원료 후보에 연결된 항목입니다. 허용을 단정하려면 TFDA 원료조회, 식품군, 사용량, 제조공정, 균주/기질 같은 정체성 자료가 필요합니다. 첨가물 또는 건강식품 기능성 원료로 보이면 별도 경로로 이동해야 합니다.",
      tone: "gold",
      chips: ["원료조회", "식품군 확인", "사용량 확인", "첨가물 여부 확인"],
      actions: ["TFDA 원료조회, 규격서, 제조공정, 최종 식품군과 사용량을 확인하세요."]
    };
  }

  if (category === "food_cosmetic_ingredient") {
    return {
      label: "용도별 분리판정",
      detail:
        "식품과 화장품 양쪽에서 쓰일 수 있는 원료입니다. 같은 명칭이라도 식품 섭취용, 화장품 외용, 기능성/효능 표현, 첨가물 여부에 따라 규정이 달라지므로 제품 용도를 먼저 고정해야 합니다.",
      tone: "gold",
      chips: ["식품/화장품 분리", "효능표현 확인", "규격서 필요"],
      actions: ["최종 제품 용도, 섭취/외용 여부, 함량, 효능표현, 규격서를 기준으로 식품·화장품 경로를 분리하세요."]
    };
  }

  if (category === "special_dietary_food") {
    return {
      label: "특수식품 허가·표시 확인",
      detail:
        "영아용 조제식품, 특정질환용 식품 등 특수영양/특수용도 식품 가능성이 있는 항목입니다. 일반 식품처럼 승인하면 안 되며, 사전 허가/등록, 조성 기준, 표시 기준, 수입검사 서류를 별도로 확인해야 합니다.",
      tone: "red",
      chips: ["특수식품", "허가/등록 확인", "조성 기준", "표시 기준"],
      actions: ["제품군이 특수영양/특수용도 식품인지 확인하고 허가/등록·조성·표시·수입검사 서류를 확보하세요."]
    };
  }

  if (["customs_trade", "trade_control"].includes(category)) {
    return {
      label: "통관분류 필요",
      detail:
        "통관·무역관리 용어에 연결된 항목입니다. 허용/금지 판단 전에 HS/CCC 코드, 원산지, 수입규정 코드, 수출입 허가, 전략물자 여부를 확정해야 합니다.",
      tone: "blue",
      chips: ["HS/CCC", "원산지", "수입규정", "허가 가능성"],
      actions: ["HS/CCC, 원산지, 수입규정 코드, 목적지와 최종 용도를 확인하세요."]
    };
  }

  return null;
}
