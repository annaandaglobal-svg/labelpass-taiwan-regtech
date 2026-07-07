export type KnowledgeVerdictTone = "green" | "blue" | "gold" | "red" | "neutral";

// Normalized decision state so the UI never blurs "허용 확인 안 됨" into "금지".
export type KnowledgeVerdictState =
  | "allowed_confirmed" // 허용 근거 확인
  | "conditional" // 조건부 가능
  | "needs_check" // 추가 확인 필요
  | "restricted_risk" // 제한·금지 가능성
  | "prohibited_confirmed"; // 금지 근거 확인

export const verdictStateLabels: Record<KnowledgeVerdictState, string> = {
  allowed_confirmed: "허용 근거 확인",
  conditional: "조건부 가능",
  needs_check: "추가 확인 필요",
  restricted_risk: "제한·금지 가능성",
  prohibited_confirmed: "금지 근거 확인"
};

// Plain, beginner-facing "can I export this?" answer for each state. The technical labels
// ("조건부 가능", "추가 확인 필요") don't tell a first-time exporter whether to ship — these do.
export const verdictPlainAnswer: Record<KnowledgeVerdictState, { icon: string; text: string }> = {
  allowed_confirmed: {
    icon: "✅",
    text: "지금 기준 사용 가능 — 확인된 허용 근거가 있습니다. 라벨·서류만 갖추면 됩니다."
  },
  conditional: {
    icon: "⚠️",
    text: "조건을 맞추면 가능 — 아래 함량 한도·경고문·용도 조건을 지키면 쓸 수 있습니다. 초과·위반하면 불가."
  },
  needs_check: {
    icon: "❓",
    text: "아직 ‘된다/안된다’ 확정 아님 — 금지는 아니지만, 함량·용도·서류를 확인해야 최종 판단됩니다. (금지 뜻 아님)"
  },
  restricted_risk: {
    icon: "⛔",
    text: "제한·금지될 수 있음 — 예외 용도·한도에 정확히 맞지 않으면 사용 불가입니다. 전문가 확인을 권장합니다."
  },
  prohibited_confirmed: {
    icon: "❌",
    text: "그대로는 사용 불가 — 금지 근거가 확인됩니다. 성분을 빼거나, CAS로 다른 물질임을 입증해야 합니다."
  }
};

// Map the 5 verdict states onto the 시안's 3 semantic colors (green/amber/red) — the three
// "caution" states share amber; differentiation comes from the label, not a 4th/5th hue.
export const verdictStateTone: Record<KnowledgeVerdictState, KnowledgeVerdictTone> = {
  allowed_confirmed: "green",
  conditional: "gold",
  needs_check: "gold",
  restricted_risk: "gold",
  prohibited_confirmed: "red"
};

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
  // Filled by resolveVerdictState so every verdict carries a normalized state and an
  // explicit uncertainty note. Overrides may set these directly for precision.
  state?: KnowledgeVerdictState;
  uncertainty?: string;
};

const verdictOverrides: Record<string, KnowledgeVerdict> = {
  "potassium-glycerophosphate-food-additive": {
    label: "첨가물 용도 사용불가",
    detail:
      "금지목록 성분으로 확인된 것은 아니지만, 대만 식품첨가물/영양첨가물 포지티브 리스트에서 Potassium Glycerophosphate 정확명 등재가 확인되지 않습니다. 따라서 첨가물 용도라면 현재 근거로는 사용 불가로 판단하고, 일반 식품원료라고 주장하려면 TFDA 원료조회/공식 분류, 허가증, 중문명, 정확한 염 형태, 최종 식품군, 사용량 근거가 필요합니다.",
    tone: "gold",
    state: "restricted_risk",
    uncertainty:
      "‘금지 근거 확인’이 아니라 ‘허용 근거 미확인’입니다. 포지티브 리스트 미등재라 첨가물 용도로는 통관 리스크가 크지만, 일반 식품원료 근거가 나오면 판정이 바뀔 수 있습니다.",
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
    state: "needs_check",
    uncertainty: "허용/금지 어느 쪽도 확정되지 않았습니다. 균종·균주·기질·효소 활성에 따라 분류가 달라져 추가 자료 없이는 판단 불가입니다.",
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
    state: "needs_check",
    uncertainty: "허용/금지 어느 쪽도 확정되지 않았습니다. 균주·독소 관리·효소 활성·사용 목적에 따라 경로가 달라져 추가 자료 없이는 판단 불가입니다.",
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
    state: "conditional",
    uncertainty: "감미료 Steviol Glycosides로 확인되면 첨가물 기준의 사용범위·한도·식품군을 맞추는 조건부 허용입니다. 원물/추출물 여부가 확정되지 않으면 판단이 달라집니다.",
    chips: ["감미료 정체성 확인", "사용범위·한도 필요", "식품군 확인", "표시명 확인"],
    actions: [
      "스테비아 원물/추출물/Steviol Glycosides 중 무엇인지 규격서와 COA로 분리하세요.",
      "최종 식품군과 사용량을 첨가물 기준에 대조한 뒤 라벨 표시명을 확정하세요."
    ]
  }
};

function deriveVerdictState(verdict: KnowledgeVerdict): KnowledgeVerdictState {
  const text = `${verdict.label} ${verdict.chips.join(" ")}`;
  // Positive-list non-listing or "허용 확인 안 됨" must read as risk, never a confirmed ban.
  if (/미등재|확인\s*안|확인되지|허용\s*근거\s*(없|미)/.test(text)) return "restricted_risk";
  if (verdict.tone === "red") {
    if (/금지|사용불가|불가|표현불가|필수/.test(text)) return "prohibited_confirmed";
    return "restricted_risk";
  }
  if (verdict.tone === "green") return "allowed_confirmed";
  if (/조건부|허용/.test(text)) return "conditional";
  if (/분류|확인|필요|서류|검토/.test(text)) return "needs_check";
  return verdict.tone === "blue" ? "needs_check" : "conditional";
}

function resolveVerdictState(verdict: KnowledgeVerdict): KnowledgeVerdict {
  const state = verdict.state ?? deriveVerdictState(verdict);
  const uncertainty =
    verdict.uncertainty ??
    (state === "prohibited_confirmed"
      ? "동명이물질·염 형태·CAS가 다르면 판정이 달라질 수 있으니 정확한 물질 동정이 필요합니다."
      : state === "allowed_confirmed"
        ? "공식 근거 확인 시점 기준입니다. 제품 유형·함량·용도가 다르면 재확인이 필요합니다."
        : "허용/금지가 확정되지 않았습니다. 아래 다음 행동으로 통관 판단에 필요한 근거를 먼저 확보하세요.");
  return { ...verdict, state, uncertainty };
}

export function verdictForKnowledgeTerm(term: KnowledgeTermForVerdict): KnowledgeVerdict | null {
  const base = baseVerdictForKnowledgeTerm(term);
  return base ? resolveVerdictState(base) : null;
}

function baseVerdictForKnowledgeTerm(term: KnowledgeTermForVerdict): KnowledgeVerdict | null {
  const override = verdictOverrides[term.id];
  if (override) return override;

  const category = term.category;

  if (category === "prohibited" || category === "prohibited_substance") {
    return {
      label: "화장품 사용불가",
      detail:
        "대만 화장품 금지성분 목록에 연결된 항목입니다. 화장품 원료로는 사용 불가로 판단하고, 동명이물질·염 형태·CAS가 다른 경우에만 별도 확인하세요.",
      tone: "red",
      chips: ["금지성분", "화장품 사용불가", "CAS/염 형태 확인"],
      actions: ["화장품 배합표에서 제거하거나, 다른 물질임을 CAS/규격서로 입증하세요."]
    };
  }

  if (category === "restricted_substance") {
    return {
      label: "성분 첨가 제한·한도 관리",
      detail:
        "대만 화장품에서 성분으로 의도 첨가가 제한되거나, 중금속·불순물처럼 엄격한 한도가 적용되는 항목입니다(예: 수은·납·비소). 원료로 넣는 용도라면 사용 불가로 보고, 불순물이라면 규격 한도 이내 시험 근거가 필요합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "‘의도적 첨가’와 ‘불순물 한도 관리’는 다릅니다. 성분으로 넣었다면 사용 불가 가능성이 크고, 불순물이라면 한도 이내임을 COA로 입증해야 합니다.",
      chips: ["첨가 제한", "중금속·불순물 한도", "COA 필요", "용도 확인"],
      actions: [
        "이 물질을 성분으로 의도 첨가했는지, 불순물로 존재하는지 먼저 구분하세요.",
        "불순물이라면 대만 중금속·불순물 한도 이내임을 시험성적서(COA)로 확인하세요."
      ]
    };
  }

  if (
    [
      "restricted",
      "preservative",
      "colorant",
      "sunscreen",
      "ph_adjuster",
      "alkalizing_agent",
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

  if (category === "cosmetic_medicinal_restricted") {
    return {
      label: "화장품 사용 제한 (약용·中藥材)",
      detail:
        "何首烏(하수오) 같은 일부 한약재는 대만에서 의약품 성분(中藥材)으로 관리되어 화장품·식품 사용이 제한·금지될 수 있습니다. 화장품 원료로 쓰려면 이 성분이 화장품에 허용되는 형태·부위·함량인지, 의약품 전용은 아닌지 반드시 확인해야 합니다. 근거 없이 사용하면 위반·회수 위험이 있습니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "이 성분이 대만 화장품에 허용되는지, 의약품 전용 성분(藥用)은 아닌지 확인하세요. 불명확하면 사용 전 전문가 검토가 필요합니다.",
      chips: ["中藥材·약용 가능성", "화장품 허용 여부 확인", "의약품 오인 주의"],
      actions: [
        "대만 화장품 사용 가능 성분인지, 의약품 전용 성분인지 확인하세요.",
        "필요하면 전문가에게 성분 적격성 검토를 의뢰하세요."
      ]
    };
  }

  if (category === "banned_drug_ingredient") {
    return {
      label: "식품·보충제 사용 불가 (약품·비식품 성분)",
      detail:
        "멜라토닌(褪黑激素)·DHEA·마황(麻黃/ephedra)·요힘빈(育亨賓)·카바(kava)·컴프리(comfrey) 등은 대만에서 의약품이거나 식품 원료로 인정되지 않아 일반식품·건강식품에 넣어 판매할 수 없습니다. 특히 멜라토닌은 대만에서 처방의약품이라 식품·보충제로 수입·판매 시 藥事法 위반(중형)입니다. 한국의 흔한 수면·에너지·스포츠 보충제 성분이 여기 해당하니 반드시 확인하세요.",
      tone: "red",
      state: "prohibited_confirmed",
      uncertainty: "이 성분이 대만에서 의약품/비식품 원료로 분류되는지 확인하세요. 해당하면 식품·보충제로는 표시·판매가 불가합니다.",
      chips: ["약품 성분", "식품 원료 불가", "멜라토닌=처방약", "수입·판매 금지"],
      actions: [
        "멜라토닌·DHEA·마황·요힘빈 등은 식품·보충제 성분에서 제외하세요(대만 의약품/비식품).",
        "대만 '可供食品原料' 목록으로 원료의 식품 적격성을 확인하세요."
      ]
    };
  }

  if (category === "nutrient_upper_limit") {
    return {
      label: "비타민·미네랄 함량 상한 확인",
      detail:
        "비타민·미네랄은 대만에서 1일 섭취 상한이 있으며 초과 시 의약품으로 분류되어 식품으로 수입·판매가 반려될 수 있습니다(예: 비타민A>10,000 IU, D>800 IU, 나이아신>100mg, 철>45mg 등 — 정확한 현행 상한표 확인 필요). 한국의 고함량 제품이 자주 초과합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제품의 1일 섭취량 기준 함량이 대만 상한을 넘지 않는지 확인하세요. 초과하면 약품 분류·통관 반려 위험이 있습니다.",
      chips: ["1일 상한", "초과 시 약품 분류", "고함량 주의"],
      actions: ["대만 비타민·미네랄 1일 상한(每日上限)과 제품 함량을 대조하세요."]
    };
  }

  if (category === "capsule_tablet_food") {
    return {
      label: "정·캡슐 형태 식품 표시 규정 (錠狀膠囊食品)",
      detail:
        "정제·캡슐 형태 식품은 분말·액상 일반식품, 그리고 健康食品(허가제)과도 다른 별도 규정을 따릅니다. 1회 건의섭취량(정수) 기준 영양표시, 그리고 비타민·미네랄 강화 시 경고문 '一日請勿超過○粒(1일 ○정 초과 금지)'·'多食無益(많이 먹어도 무익)' 표기가 필수입니다. 한국의 알약형 건강기능식품이 대개 여기 해당합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "정·캡슐 형태면 건의섭취량 기준 표시와 경고문(多食無益 등)을 갖췄는지 확인하세요.",
      chips: ["錠狀膠囊食品", "건의섭취량 표시", "경고문 필수", "健康食品과 별개"],
      actions: ["정·캡슐 식품 영양표시(건의섭취량 기준)와 필수 경고문을 확인하세요."]
    };
  }

  if (category === "novel_food_ingredient") {
    return {
      label: "신규 식품원료 (新型態食品原料) — 사전 안전성평가",
      detail:
        "대만에서 1999-12-31 이전 국내 식용 이력이 없는 원료(새로운 식물·발효·추출 성분 등)는 판매 전 TFDA 안전성 평가가 필요합니다(新型態食品原料 안전성평가 원칙, 2026-01-27 시행). 평가·인정 전에는 식품 사용이 불가합니다. 한국의 신소재·신규 추출물이 해당될 수 있습니다.",
      tone: "gold",
      state: "restricted_risk",
      uncertainty: "원료에 대만 내 식용 이력이 없다면 사전 안전성평가 대상인지 확인하세요. 평가 전에는 사용 불가입니다.",
      chips: ["新型態食品原料", "사전 안전성평가", "식용 이력 확인"],
      actions: ["대만 식용 이력이 없는 원료는 TFDA 신규 식품원료 안전성평가 대상인지 확인하세요."]
    };
  }

  if (category === "prohibited_medical_claim") {
    return {
      label: "의료효능·질병 표현 금지 (誇大醫療效能)",
      detail:
        "화장품·식품에 '치료·예방·개선(질병)'을 연상시키는 의료효능 표현은 금지됩니다. 화장품 금지 예: 換膚(각질 벗김)·醫美/醫學美容·藥用·除疤(흉터)·抗過敏·消炎·豐胸·瘦身/塑身·拉提/V臉·毛髮生長. 식품 금지 예: 治療·預防·특정 질병 개선. 위반 시 화장품 NT$40,000~5,000,000, 식품 최대 NT$5,000,000 벌금 대상입니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "표현이 질병 치료·예방·의약품을 연상시키는지 확인하세요. 해당하면 표시·광고 불가입니다.",
      chips: ["의료효능 표현 금지", "換膚·藥用·除疤·豐胸·瘦身", "고액 벌금"],
      actions: ["換膚·醫美·藥用·除疤·豐胸·瘦身·治療·預防 등 의료·질병 표현을 라벨·광고에서 제거하세요."]
    };
  }

  if (category === "heavy_metal_limit") {
    return {
      label: "중금속 잔류 한도 (重金屬殘留限量)",
      detail:
        "화장품 중금속은 첨가 금지이며 불가피한 불순물로만 미량 허용됩니다 — 대만 한도: 수은(汞) 1ppm, 납(鉛) 10ppm, 비소(砷) 3ppm, 카드뮴(鎘) 5ppm. 색조·립 제품에서 특히 문제되며, 초과 시 회수·행정처분 대상입니다. COA(중금속 시험성적서)로 적합성을 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "완제품 중금속(汞·鉛·砷·鎘)이 대만 한도 이내인지 시험성적서로 확인하세요.",
      chips: ["汞1·鉛10·砷3·鎘5 ppm", "첨가 금지", "COA 필요"],
      actions: ["완제품 중금속 시험성적서로 대만 한도(汞1/鉛10/砷3/鎘5 ppm) 적합성을 확인하세요."]
    };
  }

  if (category === "microplastic_ban") {
    return {
      label: "미세플라스틱(塑膠微粒) 금지 — 씻어내는 화장품",
      detail:
        "대만은 環境部(환경부) 규정으로 씻어내는(rinse-off) 화장품 6종(샴푸·바디워시·페이셜클렌저·비누·치약·스크럽)에 미세플라스틱(塑膠微粒, PE/PP/PMMA 등 마이크로비드) 제조·판매를 금지합니다. TFDA가 아닌 環境部 소관이라 화장품 기준만 보면 누락됩니다. 스크럽·필링 제품의 알갱이가 플라스틱이면 대체가 필요합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "씻어내는 제품에 플라스틱 마이크로비드가 들어있는지 확인하세요. 있으면 판매 금지입니다.",
      chips: ["塑膠微粒 금지", "環境部 소관", "씻어내는 제품 6종"],
      actions: ["씻어내는 화장품의 스크럽/각질 알갱이가 플라스틱(마이크로비드)인지 확인하고, 해당 시 천연 대체제로 교체하세요."]
    };
  }

  if (category === "food_gmo_labeling") {
    return {
      label: "유전자변형(基因改造/GMO) 표시 의무",
      detail:
        "대두·옥수수·카놀라 등 유전자변형(GMO) 원료를 3% 초과 함유하거나 의도적으로 사용하면 '基因改造/含基因改造' 표시가 의무입니다(TFDA 基因改造食品標示規定). 고도 정제품(대두유·간장·콘시럽 등 잔류 DNA가 없어도)도 표시 대상입니다. Non-GMO 원료 증빙이 없으면 표시가 필요할 수 있습니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대두·옥수수 계열 원료의 GMO 여부와 3% 기준을 확인하고, 해당하면 中文 '基因改造' 표시를 하세요.",
      chips: ["基因改造 표시", "3% 초과·의도적 사용", "정제품도 대상"],
      actions: ["대두·옥수수 계열 원료의 GMO 여부(비유전자변형 증빙)를 확인하고, 해당 시 '基因改造' 표시를 추가하세요."]
    };
  }

  if (category === "caffeine_labeling") {
    return {
      label: "카페인 함량 표시 (咖啡因含量標示)",
      detail:
        "카페인 함유 포장음료는 함량 표시가 의무입니다 — 100mL당 20mg 이상이면 실제 함량과 함께 '每日限量300mg，孩童及孕哺婦慎用(1일 300mg 한도·어린이·임산부 주의)' 문구를, 20mg 미만이면 '20mg/100mL以下'를 표기합니다. 차·커피·에너지/기능성 음료가 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "카페인 함유 음료면 100mL당 함량과 주의 문구 표기 요건을 확인하세요.",
      chips: ["咖啡因 함량 표시", "20mg/100mL 기준", "주의 문구"],
      actions: ["카페인 음료의 100mL당 함량과 '每日限量300mg' 주의 문구를 라벨에 표기하세요."]
    };
  }

  if (category === "vegetarian_labeling") {
    return {
      label: "채식(素食) 표시 — 5분류 표기",
      detail:
        "'素食(채식/비건)'을 표방하는 식품은 대만 규정상 5가지 분류 중 하나를 명시해야 합니다: 全素/純素·蛋素·奶素·奶蛋素·植物五辛素. 위반 시 NT$30,000~3,000,000 벌금 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "채식/비건 표방 시 5분류(全素·蛋素·奶素·奶蛋素·植物五辛素) 중 정확한 유형을 표기했는지 확인하세요.",
      chips: ["素食 5분류", "全素·蛋素·奶素·奶蛋素·五辛素"],
      actions: ["채식 표방 제품은 대만 素食 5분류 중 해당 유형을 라벨에 명시하세요."]
    };
  }

  if (category === "device_import_regulation") {
    return {
      label: "미용기기·전자제품 — TFDA 밖 인증 다수 (BSMI·NCC·醫療器材)",
      detail:
        "미용기기·전자제품은 화장품이 아니라 여러 부처의 별도 인증 대상입니다. ① 전기·전자 안전: 經濟部 標準檢驗局(BSMI)의 商品檢驗 등록·검사·BSMI 마크가 필요하며 미검사 시 통관 불가. ② 무선기능(WiFi·블루투스·RF): 國家通訊傳播委員會(NCC)의 형식인증·수입 승인 필요. ③ 의료기기 해당 여부: EMS·RF·IPL·레이저·미세전류를 쓰거나 치료·생리적 효능을 표방하면 醫療器材(의료기기)로 재분류되어 TFDA 醫療器材 등록·QMS·대만 대리인이 필요합니다. 화장품 기준만 보면 이 세 가지가 모두 누락됩니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "기능·전원·무선 여부에 따라 BSMI·NCC·醫療器材 중 무엇이 필요한지 달라집니다. 기기는 화장품과 별개로 반드시 확인하세요.",
      chips: ["BSMI 商品檢驗", "NCC 무선 인증", "醫療器材 재분류?", "TFDA 밖 규제"],
      actions: [
        "전기·전자 제품은 經濟部 標準檢驗局(BSMI) 商品檢驗 대상인지 확인하세요(마크·검사 없으면 통관 불가).",
        "WiFi·블루투스·RF 기능이 있으면 NCC 형식인증·수입 승인을 받으세요.",
        "EMS·RF·IPL·레이저·미세전류 또는 치료 표방이면 醫療器材(의료기기) 등록·QMS·대만 대리인이 필요한지 확인하세요."
      ]
    };
  }

  if (category === "environment_recycling") {
    return {
      label: "資源回收標誌·회수비 (環境部)",
      detail:
        "대만은 지정 용기·포장·전지·전기전자제품의 수입자를 '責任業者'로 보아 등록·회수처리비(回收清除處理費) 납부와 제품/포장에 資源回收標誌(재활용 마크)+재질코드 표기를 의무화합니다(廢棄物清理法, 環境部). 대상: 금속·유리·플라스틱·종이 용기(대부분 포장식품·음료·화장품), 건전지, IT·가전, 램프 등. 전지는 수은 5ppm 초과 시 수입·판매 금지 + 함량확인문서가 필요합니다. TFDA가 아닌 環境部 소관이라 흔히 누락됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "포장·용기·전지·가전이 대만 회수 대상이면 責任業者 등록·회수비·재활용 마크 표기 여부를 확인하세요.",
      chips: ["資源回收標誌", "責任業者 등록·회수비", "전지 수은 5ppm", "環境部 소관"],
      actions: [
        "포장·용기·전지·가전이 대만 지정 회수품목인지 확인하고, 責任業者 등록·회수처리비·재활용 마크 표기를 준비하세요.",
        "건전지는 수은 함량(≤5ppm) 확인문서와 회수 표시가 필요합니다."
      ]
    };
  }

  if (category === "commodity_labeling") {
    return {
      label: "일반상품 중문 표시 (商品標示法 · 經濟部)",
      detail:
        "식품·화장품·의약품이 아닌 일반상품(의류·생활용품·문구·전자·잡화)은 經濟部 商品標示法에 따라 판매 전 中文 표시가 의무입니다: 품명·수입자 중문 명칭·주소·전화·원산지·주요 성분/재질·중량/용량/수량·제조일자 등. 섬유·의류는 성분(≥5%)·취급·치수·원산지 표시와 유아용 甲醛(포름알데히드) 한도(유아 20ppm 등)가 추가됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "일반상품이면 商品標示法 중문 표시(품명·수입자·원산지·재질 등) 요건을 확인하세요.",
      chips: ["商品標示法", "일반상품 중문표시", "섬유=성분·甲醛"],
      actions: ["일반상품은 판매 전 중문 표시(품명·수입자·원산지·재질·용량)를 부착하세요. 섬유·유아용은 甲醛 한도도 확인하세요."]
    };
  }

  if (category === "alcohol_tobacco_licence") {
    return {
      label: "주류·담배 수입 허가·세금 (菸酒管理法 · 財政部)",
      detail:
        "주류(술)를 수입하려면 財政部 國庫署의 菸酒進口業許可執照(수입업 허가)가 사전에 필요하고 菸酒稅(주세)가 부과됩니다. TFDA 식품 규정과 별개(다른 부처)입니다. 술·리큐르뿐 아니라 알코올 도수가 있는 음료성 제품도 해당될 수 있습니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "주류/알코올 음료면 財政部 수입업 허가와 주세 대상인지 확인하세요.",
      chips: ["菸酒 수입허가", "財政部 관할", "주세(菸酒稅)"],
      actions: ["주류·알코올 음료는 財政部 國庫署 菸酒 수입업 허가와 주세 요건을 사전에 확인하세요."]
    };
  }

  if (category === "energy_efficiency_label") {
    return {
      label: "에너지효율 표시·MEPS (能源署)",
      detail:
        "지정 가전(냉장고·에어컨·제습기·TV 등)은 經濟部 能源署의 능원효율 등급표시(1~5급)와 최저효율기준(MEPS, 容許耗用能源基準)이 의무입니다. 기준 미달 제품은 수입·판매 불가입니다. 이는 '자발적' 節能標章(에너지절약 마크)과 다른 '의무' 규제입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "지정 가전이면 능원효율 등급표시·MEPS 충족 여부를 확인하세요(의무). 節能標章과 혼동하지 마세요.",
      chips: ["能源效率標示", "MEPS 최저효율", "지정 가전 의무"],
      actions: ["가전이 能源署 지정품목이면 효율등급 표시와 MEPS 기준 충족 여부를 확인하세요."]
    };
  }

  if (category === "environmental_agent_pesticide") {
    return {
      label: "환경용약·의약품 경계 확인 (환경용약/소독·방충)",
      detail:
        "방충제(모기 기피제)·환경 소독제는 環境部 化學物質管理署의 환경용약(環境用藥) 허가 대상일 수 있고, 살균·소독을 표방하는 손소독제는 의약품(TFDA)으로 분류될 수 있습니다. 아무 효능도 표방하지 않는 세정 제품만 일반상품입니다. 세 갈래 분류를 표현·용도에 따라 반드시 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "소독·살균·방충 표방 여부에 따라 환경용약(環境部)·의약품(TFDA)·일반상품으로 분류가 갈립니다. 확인하세요.",
      chips: ["環境用藥", "살균=의약품 가능", "표현별 분류"],
      actions: ["방충·소독·살균 표방 제품은 환경용약(環境部) 또는 의약품(TFDA) 분류 대상인지 확인하세요."]
    };
  }

  if (category === "cites_endangered") {
    return {
      label: "CITES 멸종위기종 수출입 허가",
      detail:
        "멸종위기종(CITES) 유래 원료 — 일부 한약재(침향 沉香·사향 麝香·석곡 石斛 등)·동물 유래 성분·악어/파충류 가죽·산호/조개 등 — 은 瀕臨絕種野生動植物國際貿易法에 따라 수출입 허가(貿易署 발급, 林業及自然保育署 관할)가 필요합니다. 허가 없이는 통관이 불가합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "원료·소재가 CITES 대상 동식물 유래인지 확인하세요. 해당하면 수출입 허가가 필요합니다.",
      chips: ["CITES 허가", "멸종위기 한약재·가죽·산호", "무허가 통관 불가"],
      actions: ["CITES 대상 동식물 유래 원료·소재는 수출입 허가(林業及自然保育署/貿易署)를 확보하세요."]
    };
  }

  if (category === "toy_inspection") {
    return {
      label: "완구 상품검사·프탈레이트 (BSMI)",
      detail:
        "완구·어린이용품은 經濟部 標準檢驗局(BSMI)의 商品檢驗(CNS 4797/15138) 등록·검사와 마크가 의무이며, 프탈레이트 6종(DEHP·DBP·BBP·DINP·DIDP·DNOP) 합계 0.1% 이하 기준을 지켜야 합니다. 미검사 완구는 통관·판매가 불가합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "완구·어린이용품이면 BSMI 상품검사와 프탈레이트 한도(합계 ≤0.1%) 충족 여부를 확인하세요.",
      chips: ["BSMI 商品檢驗", "프탈레이트 ≤0.1%", "완구·어린이용품"],
      actions: ["완구·어린이용품은 BSMI 상품검사·마크와 프탈레이트 6종 한도를 확인하세요."]
    };
  }

  if (category === "animal_plant_quarantine") {
    return {
      label: "동식물 검역 대상 (輸入檢疫)",
      detail:
        "동물성(새우·육류·유제품 등)·식물성(종자·일부 식물 원료) 식품 원료는 식품 위생검사와 별개로 農業部 動植物防疫檢疫署(APHIA, 구 BAPHIQ)의 수입 검역(輸入檢疫) 대상일 수 있습니다. 수출국 주무기관이 발급한 공식 위생/식물검역 증명서(민간 증명서 불가)가 필요하며, ASF(아프리카돼지열병) 등으로 다수 육류 제품은 반입 자체가 금지됩니다. 이는 알레르겐 표시와는 별개의 통관 전 관문입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty:
        "동물성·식물성 원료 포함 시 검역 대상 여부와 수출국 공식 증명서 필요 여부를 통관 전 확인하세요.",
      chips: ["動植物防疫檢疫署(APHIA)", "수입 검역", "공식 검역증명 필요", "육류=반입제한 다수"],
      actions: [
        "동물성·식물성 원료가 農業部 APHIA 수입 검역 대상인지 확인하세요.",
        "수출국 주무기관 발급 위생/식물검역 증명서(공식)를 확보하세요 — 민간 증명서는 불가합니다.",
        "육류·특정 축산물은 ASF 등으로 반입 금지일 수 있으니 사전 확인하세요."
      ]
    };
  }

  if (category === "food_organic_certification") {
    return {
      label: "유기농(有機) 표시 — 인증·수입 검증 필수",
      detail:
        "대만에서 식품에 '有機(유기농)'을 표시하려면 有機農業促進法(2019.5.30 시행, 소관 農業部 農糧署)에 따라 인증이 반드시 필요합니다. 수입품은 수출국이 대만과 '유기 동등성 협정'을 맺은 경우에만 자국 인증으로 표시할 수 있습니다(현재 동등성 국가: 일본·미국·캐나다·호주·뉴질랜드·인도·파라과이·영국). 한국은 동등성 국가가 아니므로 한국 유기 인증만으로는 대만에서 '有機' 표시가 불가능합니다 — 대만이 인정하는 인증기관의 인증을 받고, 수입 시 검증(查驗)·표시 심사를 거쳐야 합니다. 인증·검증 없이 유기 표시를 하면 有機農業促進法 위반으로 제재(벌금·과태료) 대상입니다. (화장품 등 비식품의 '有機' 표현도 실증·인증 근거 없이 쓰면 부당표시입니다.)",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "한국은 대만 유기 동등성 국가가 아닙니다. 대만 인정 인증기관 인증 + 수입 검증이 확보됐는지 확인하고, 없으면 라벨·광고에서 '유기농'을 빼거나 인증부터 진행하세요.",
      chips: ["有機農業促進法", "인증 필수", "한국=동등성 아님", "수입 검증 필요"],
      actions: [
        "대만 유기 동등성 국가 여부를 확인하세요 — 한국은 미포함(동등성: 일본·미국·캐나다·호주·뉴질랜드·인도·파라과이·영국). 소관: 農業部 農糧署.",
        "동등성이 없으면 대만이 인정하는 인증기관의 유기 인증 + 수입 검증(查驗)·표시 심사를 받으세요.",
        "인증·검증 전에는 라벨·광고에서 '有機/유기농/organic'을 사용하지 마세요 (무인증 유기 표시는 위반)."
      ]
    };
  }

  if (category === "cosmetic_marketing_claim") {
    return {
      label: "표시·광고 주의 (부당표시 위험)",
      detail:
        "천연·유기농·무첨가·저자극 같은 표현은 대만 화장품 표시·광고 규정상 객관적 근거 없이 쓰면 과대·부당표시(誇大不實)로 제재될 수 있습니다. 표현의 정의·기준(예: 유기농 인증, 무첨가의 대상 성분)과 이를 뒷받침하는 실증 자료를 갖춰야 하며, 질병 예방·치료 등 의약품 오인 표현은 금지입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty:
        "이 표현을 뒷받침할 정의·인증·실증 자료가 있는지 확인하세요. 근거 없이 쓰면 부당표시로 제재될 수 있습니다.",
      chips: ["표시·광고 규정", "실증 근거 필요", "의약품 오인 금지"],
      actions: [
        "표현의 정의·기준과 실증 자료(인증·시험 등)를 확보했는지 확인하세요.",
        "질병·의약품을 연상시키는 과대 표현이 아닌지 검토하세요."
      ]
    };
  }

  if (category === "cosmetic_special_use_claim") {
    return {
      label: "특정용도 화장품 표현",
      detail:
        "미백·자외선차단·주름개선·여드름·염모·제한 같은 특정용도(特定用途) 표현입니다. 일반 화장품보다 요건이 강합니다 — 대만이 인정한 성분(허용목록)만 쓸 수 있고, 함량·경고문·안전성/효능 시험자료, 특정용도 화장품 등록·통보가 필요합니다. 인정 성분·근거 없이 이 효능을 표기하면 위반입니다.",
      tone: "gold",
      state: "restricted_risk",
      uncertainty:
        "이 효능을 광고·라벨에 쓰려면 대만 인정 성분 + 시험자료 + 등록이 갖춰졌는지 확인하세요. 없으면 표현 불가입니다.",
      chips: ["특정용도", "인정 성분 필요", "시험자료·등록", "근거 없으면 표기 불가"],
      actions: [
        "이 효능이 대만 특정용도 화장품 인정 성분·기준에 맞는지 확인하세요.",
        "안전성·효능 시험자료와 특정용도 화장품 등록/통보 여부를 확인하세요."
      ]
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

  if (
    [
      "customs_trade",
      "trade_control",
      "customs_classification",
      "customs_document",
      "trade_document",
      "trade_operator",
      "origin_marking",
      "import_export_control",
      "product_certification"
    ].includes(category)
  ) {
    return {
      label: "통관분류·서류 확인",
      detail:
        "통관·무역관리 용어에 연결된 항목입니다. 허용/금지 판단 전에 HS/CCC 코드, 원산지증명, 수입규정 코드(輸入規定), 수출입 허가, 전략물자 여부, 필요 서류를 확정해야 합니다.",
      tone: "blue",
      state: "needs_check",
      chips: ["HS/CCC", "원산지", "수입규정", "필요 서류"],
      actions: [
        "HS/CCC(11자리)와 연결된 수입규정 코드(輸入規定), 원산지, 최종 용도를 확인하세요.",
        "인보이스·패킹리스트·원산지증명 등 통관 서류가 표기와 일치하는지 대조하세요."
      ]
    };
  }

  if (category === "food_safety") {
    return {
      label: "식품안전·수입검사 확인",
      detail:
        "대만 식품 안전·위생 관리 또는 수입검사 경로에 연결된 항목입니다. 품목 허용 여부와 별개로 위생기준, 검사 방식, 수입자 등록, 위생증명 등 안전관리 요건을 확인해야 합니다.",
      tone: "gold",
      state: "needs_check",
      chips: ["식품안전", "수입검사", "위생기준", "서류 확인"],
      actions: ["해당 위생·안전 기준과 수입검사 방식(逐批/抽批/驗批), 필요 증빙을 확인하세요."]
    };
  }

  if (category === "cosmetic_postmarket") {
    return {
      label: "사후관리·통보 확인",
      detail:
        "대만 화장품 사후관리(이상사례 통보, 회수, 제품등록/통보) 요건에 연결된 항목입니다. 판매 후 운영 의무가 준비됐는지 확인하세요.",
      tone: "gold",
      state: "needs_check",
      chips: ["제품등록/통보", "이상사례 통보", "회수 SOP"],
      actions: ["제품 등록/통보 상태, 이상사례 통보 절차, 회수 SOP 준비 여부를 확인하세요."]
    };
  }

  if (category === "regulatory_concept") {
    return {
      label: "규정 개념·요건 확인",
      detail:
        "특정 성분이 아니라 규정상 개념·절차에 연결된 항목입니다. 관련 요건이 이 제품·품목에 적용되는지 공식 근거로 확인하세요.",
      tone: "blue",
      state: "needs_check",
      chips: ["규정 개념", "적용 여부 확인", "공식 근거"],
      actions: ["이 개념·요건이 해당 품목·용도에 적용되는지 공식 근거와 전문가로 확인하세요."]
    };
  }

  return null;
}
