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
    // NOTE: preservative / cosmetic_ingredient_restriction / colorant_uv_filter / uv_filter /
    // oxidizing_agent / skin_lightening_agent / hair_dye_ingredient are handled by dedicated
    // branches below (染髮 patch-test, 美白, 防曬 UV filter, 방부제 positive-list, …) — do NOT add
    // them here or this generic branch will shadow them.
    [
      "restricted",
      "colorant",
      "sunscreen",
      "ph_adjuster",
      "alkalizing_agent"
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
        "카페인 함유 포장음료는 함량 표시가 의무입니다 — 100mL당 20mg 이상이면 실제 함량과 함께 '每日建議攝取量300mg，孩童及孕哺婦慎用(1일 권장 섭취 300mg 이하·어린이·임산부 주의)' 문구를, 20mg 미만이면 '20mg/100mL以下'를 표기합니다. 차·커피·에너지/기능성 음료가 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "카페인 함유 음료면 100mL당 함량과 주의 문구 표기 요건을 확인하세요.",
      chips: ["咖啡因 함량 표시", "20mg/100mL 기준", "주의 문구"],
      actions: ["카페인 음료의 100mL당 함량과 '每日建議攝取量300mg' 주의 문구를 라벨에 표기하세요."]
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

  if (category === "hair_dye_ingredient") {
    return {
      label: "염모 성분 (染髮) — 특정용도·패치테스트 경고",
      detail:
        "PPD(p-페닐렌디아민)·톨루엔-2,5-디아민·레조르시놀 등 산화 염모 성분은 대만 特定用途(染髮) 화장품 성분으로, 인정 목록·혼합 후 최대 함량 이내에서만 쓸 수 있습니다. 라벨에 알레르기 경고와 '사용 48시간 전 피부 감작성(패치) 시험' 문구, 만 16세 미만 사용 금지, 속눈썹·눈썹 염색 금지 문구가 의무입니다. 제품 등록·PIF도 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "염모 성분의 혼합 후 함량이 한도 이내인지, 패치테스트·연령·부위 경고문이 있는지 확인하세요.",
      chips: ["染髮 특정용도", "패치테스트 경고", "16세 미만 금지", "혼합 후 한도"],
      actions: ["염모 성분 함량을 인정 한도로 맞추고 패치테스트·연령·부위 경고문과 제품 등록·PIF를 준비하세요."]
    };
  }

  if (category === "skin_lightening_agent") {
    return {
      label: "미백 성분 (美白) — 특정용도·인정목록",
      detail:
        "코직산·알부틴·나이아신아마이드 등 미백 소구 성분은 대만 特定用途(美白) 화장품에 해당하여, 대만이 인정한 미백 성분 목록과 함량 이내에서만 쓸 수 있고 제품 등록·PIF·안전성/효능 자료가 필요합니다. 인정 성분·근거 없이 '美白/미백' 효능을 표기하면 위반입니다. (하이드로퀴논은 화장품 금지.)",
      tone: "gold",
      state: "needs_check",
      uncertainty: "미백 성분이 대만 인정 목록·한도 이내인지, 美白 표현 근거(등록·자료)가 있는지 확인하세요.",
      chips: ["美白 특정용도", "인정 성분·한도", "하이드로퀴논 금지"],
      actions: ["미백 성분을 대만 인정 목록·한도로 확인하고 特定用途(美白) 등록·PIF를 준비하세요."]
    };
  }

  if (category === "uv_filter") {
    return {
      label: "자외선 차단 성분 (防曬 UV필터)",
      detail:
        "옥시벤존·아보벤존·옥토크릴렌·산화아연·이산화티타늄 등 자외선 차단 성분은 대만 特定用途(防曬) 화장품의 인정 UV필터 목록·최대 함량 이내에서만 쓸 수 있습니다(예: 아보벤존 5% 등 — 정확 한도는 성분표로 확인). SPF/PA 표시는 시험자료 근거가 필요하고, 나노 형태(nano ZnO/TiO₂)는 별도 표기·규격을 확인해야 합니다. 제품 등록·PIF 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "UV필터가 인정 목록·최대 함량 이내인지, SPF/PA 근거와 나노 표기를 확인하세요.",
      chips: ["防曬 특정용도", "UV필터 최대 함량", "SPF/PA 시험근거", "나노 표기"],
      actions: ["UV필터 종류·함량을 대만 防曬 인정 목록·한도로 대조하고 SPF/PA 시험자료·등록을 준비하세요."]
    };
  }

  if (category === "oxidizing_agent") {
    return {
      label: "산화제 (과산화수소 등) — 한도·경고",
      detail:
        "과산화수소 등 산화제는 염모·펌·미백 등 용도별로 최대 함량이 제한되고(예: 두발용 과산화수소 등급별 한도) 경고문이 필요합니다. 인정 용도·함량 이내인지, 어린이 접근 금지 등 주의문구가 있는지 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "산화제의 용도별 최대 함량과 경고문이 대만 기준에 맞는지 확인하세요.",
      chips: ["용도별 함량 한도", "경고문 필요"],
      actions: ["산화제 함량을 용도별 한도로 맞추고 주의문구·등록 요건을 확인하세요."]
    };
  }

  if (category === "colorant_uv_filter") {
    return {
      label: "화장품 색소·자외선산란제 (positive list)",
      detail:
        "이산화티타늄·마이카·산화철(CI 77xxx) 등 색소·물리 자외선산란제는 대만 화장품 색소 성분 사용제한표의 인정 목록·용도(눈 주위 등)·함량 이내에서만 쓸 수 있습니다. 나노 형태는 별도 규격·표기를 확인해야 합니다. 목록에 없는 색소는 사용 불가입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "색소가 대만 화장품 색소 인정 목록·용도·함량 이내인지, 나노 표기가 필요한지 확인하세요.",
      chips: ["색소 positive list", "용도·함량 제한", "나노 표기"],
      actions: ["색소를 대만 化粧品色素成分使用限制表로 대조하고 나노 규격·표기를 확인하세요."]
    };
  }

  if (category === "preservative") {
    return {
      label: "화장품 방부제 — positive list·한도",
      detail:
        "화장품 방부제는 대만 化粧品防腐劑成分使用限制表의 인정 목록·최대 함량·사용 조건(리브온/린스오프, 점막 사용 금지 등) 이내에서만 쓸 수 있습니다. 예: 페녹시에탄올 1%, MIT 리브온 금지·린스오프 15ppm 등(정확 한도는 성분표로 확인). 목록에 없는 방부제나 한도 초과는 위반입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "방부제가 대만 인정 목록·최대 함량·사용조건 이내인지 성분표로 확인하세요.",
      chips: ["방부제 positive list", "최대 함량", "리브온/린스오프 조건"],
      actions: ["방부제 종류·함량을 대만 化粧品防腐劑成分使用限制表로 대조하세요."]
    };
  }

  if (category === "cosmetic_ingredient_restriction") {
    return {
      label: "화장품 제한 성분 — 한도·경고문",
      detail:
        "대만 化粧品成分使用限制表에 함량·사용조건·경고문이 정해진 제한 성분입니다(예: 살리실산 3세 미만 금지 경고, AHA pH≥3.5 등). 인정 한도·조건·경고문을 지켜야 하며, 정확한 수치는 성분표로 최종 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제한 성분의 함량·사용조건·경고문이 대만 성분 사용제한표에 맞는지 확인하세요.",
      chips: ["함량·조건 제한", "경고문 필요", "성분표 확인"],
      actions: ["제한 성분의 한도·경고문을 化粧品成分使用限制表로 대조하세요."]
    };
  }

  if (category === "medical_device_import") {
    return {
      label: "의료기기 등록 필요 (콘택트렌즈·탐폰·콘돔·의료용 마스크)",
      detail:
        "콘택트렌즈(컬러렌즈 포함)·탐폰·월경컵·콘돔·수술용/의료용 마스크는 화장품·일반상품이 아니라 醫療器材(의료기기)로, TFDA 査驗登記 + 醫療器材許可證 + 수입 자격의 판매업 허가가 필요합니다. 위험등급: 일반 의료용 마스크는 1등급, 수술용 마스크·탐폰·콘돔·콘택트렌즈는 대개 2등급(일부 3등급). 2·3등급은 온라인 판매 제한이 있습니다. 반면 외부용 생리대(패드)·일반(비의료) 마스크는 의료기기가 아니라 일반상품(商品標示法)입니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "제품이 의료기기 몇 등급인지 확인하고, 査驗登記·許可證·판매업 허가를 갖췄는지 확인하세요.",
      chips: ["醫療器材 등록", "許可證·판매업 허가", "2·3등급 온라인 제한"],
      actions: ["콘택트렌즈·탐폰·콘돔·수술용 마스크는 TFDA 醫療器材 査驗登記·許可證을 확보하세요(등급 확인)."]
    };
  }

  if (category === "tobacco_vape") {
    return {
      label: "담배·전자담배 — 전자담배 전면 금지",
      detail:
        "菸害防制法(2023-03-22 개정) 관할은 衛福部 국민건강서(HPA)입니다. ⚠️ 電子煙(전자담배/類菸품)은 제조·수입·판매·사용이 전면 금지입니다 — 수입 경로 자체가 없습니다(벌금 최대 NT$5,000만). 加熱菸(가열담배)는 HPA 건강위해평가 심사를 통과한 제품만 수입 가능하며(기기와 함께 심사), 2025-10 최초 승인 제품이 나왔습니다. 일반 궐련·담배도 별도 규제·세금(菸酒稅) 대상입니다.",
      tone: "red",
      state: "prohibited_confirmed",
      uncertainty: "전자담배(액상형·CSV 포함)는 수입 불가입니다. 가열담배는 HPA 심사 승인 여부를 확인하세요.",
      chips: ["電子煙 전면 금지", "加熱菸 심사 필요", "HPA 관할"],
      actions: ["전자담배는 대만 수입·판매가 금지이니 진행하지 마세요. 가열담배는 HPA 건강위해평가 승인 여부를 확인하세요."]
    };
  }

  if (category === "pet_food") {
    return {
      label: "반려동물 사료 — 農業部 申報·검역",
      detail:
        "반려동물 사료(寵物食品)는 TFDA가 아니라 農業部(MOA) 관할입니다. ① 動物保護法에 따라 사료를 수입 전 業者 申報(신고, petfood.moa.gov.tw) — 허가제가 아닌 신고제 — 하고, ② 동물성 원료를 포함하면 犬貓食品輸入檢疫條件에 따라 動植物防疫檢疫署(APHIA)의 수입 검역을 받아야 합니다. 표시·성분 기준도 별도입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "반려동물 사료면 農業部 業者 申報와 동물성 원료 수입검역(APHIA) 요건을 확인하세요(TFDA 아님).",
      chips: ["農業部 관할", "業者 申報(신고제)", "동물성=검역"],
      actions: ["반려동물 사료는 農業部 petfood 業者 申報와 APHIA 수입검역(동물성 원료 시)을 진행하세요."]
    };
  }

  if (category === "disinfectant_classification") {
    return {
      label: "살균·소독·방충 — 표방에 따라 관할 3분류",
      detail:
        "소독·살균·방충 제품은 '무엇에 쓰고 무엇을 표방하는가'로 관할이 갈립니다: ① 환경·표면·해충용(공간 소독·모기 기피 등) → 環境用藥(環境部 화학물질관리서) 환경용약 허가. ② 인체 질병 예방·살균 표방(피부 소독제 등) → 의약품(TFDA 藥事法). ③ 아무 소독·살균 표방 없이 세정만 → 화장품/일반상품. 한국식 '99.9% 살균' 손소독제는 표방에 따라 의약품/환경용약이 될 수 있으니 반드시 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대상(환경/인체)과 살균·소독 표방 여부로 환경용약(環境部)·의약품(TFDA)·화장품 중 무엇인지 확인하세요.",
      chips: ["環境用藥(環境部)", "인체 살균=의약품", "무표방=화장품/일반"],
      actions: ["소독·살균 제품은 대상·표방으로 환경용약(環境部)/의약품(TFDA)/화장품 분류를 먼저 확정하세요."]
    };
  }

  if (category === "cosmetic_oral_care") {
    return {
      label: "치약·구강청결제·비누 — 화장품 관리",
      detail:
        "대만에서 비약용 치약(2019.7~)·구강청결제·인체 세정용 비누는 화장품으로 관리되어 제품 등록·PIF 대상입니다(일반 화장품 PIF는 2026.7 전면 시행). 불소치약은 불소 1500ppm 미만이면 화장품, 1500ppm 이상이거나 毒劇 미백성분 포함이면 의약품(화장품 범위 밖)입니다. 불소·어린이 관련 주의문구도 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "치약·구강청결제·비누는 화장품 등록·PIF 대상입니다. 불소 함량(1500ppm 경계)으로 화장품/의약품 구분을 확인하세요.",
      chips: ["치약·구강청결제·비누=화장품", "PIF 대상", "불소 1500ppm 경계"],
      actions: ["치약·구강청결제·비누는 화장품 제품등록·PIF를 준비하고, 불소 1500ppm 이상이면 의약품 분류를 확인하세요."]
    };
  }

  if (category === "cosmetic_restricted_active") {
    return {
      label: "화장품 제한 성분·경고문 (한도 확인)",
      detail:
        "K뷰티 주력 성분 중 사용 한도·경고문 대상: 레티놀(비타민A) — 2027-10 개정으로 바디 리브온 0.05% RE·기타 0.3% RE 한도 + '비타민A 함유' 문구; 알파-아르부틴 — 2027-10 얼굴 리브온 2%·바디 0.5% + 하이드로퀴논 불순물 ≤20ppm; 살리실산 — 만 3세 미만 사용 금지 경고(샴푸 제외); AHA(글리콜산·젖산) — pH 3.5 이상 + 자외선 주의 문구; 페녹시에탄올 방부제 1% 한도; DMDM히단토인 등 포름알데히드 유리제 — 함량·경고문. 정확한 한도·문구는 화장품 성분 사용제한표(化粧品成分使用限制表)로 최종 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제한 성분의 함량·pH·경고문(살리실산 유아 금지, AHA pH≥3.5 등)이 대만 성분 사용제한표에 맞는지 확인하세요.",
      chips: ["레티놀·아르부틴 2027 한도", "살리실산 유아 경고", "AHA pH≥3.5", "포름알데히드 유리제"],
      actions: ["제한 성분의 함량·경고문을 化粧品成分使用限制表로 대조하세요(레티놀/아르부틴 2027 한도, 살리실산 3세 미만 금지, AHA pH≥3.5)."]
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

  if (category === "infant_additive_restriction") {
    return {
      label: "영유아식 첨가물 — 포지티브 리스트 (附表一)",
      detail:
        "대만 첨가물 기준(附表一)은 포지티브 리스트입니다 — 영유아식(嬰兒配方·較大嬰兒·嬰兒(보조)식품)에는 附表一에 해당 식품군이 명시된 첨가물만 사용할 수 있고, 명시되지 않은 것은 금지입니다(第2條 '非表列之食品品項，不得使用'). [허용 예] 영양강화제(비타민·미네랄, 영유아 상한 있음 — 비타민C ≤60mg·철 ≤15mg·칼슘 ≤750mg 등)·항산화제 L-아스코르빈산/토코페롤·유화제 지방산글리세리드. [금지 예] 당알코올 감미료(소르비톨·자일리톨·만니톨·말티톨·이소말트·락티톨 — '嬰兒食品不得使用' 명시)·인공감미료(아스파탐·아세설팜K·수크랄로스·사카린)·보존료(소르빈산·안식향산·파라벤)·합성 타르색소·아질산/질산염·카페인. 조제식 등 특수영양식품은 중앙기관 사전 심사가 별도로 필요합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "영유아식에 附表一가 영유아 식품군에 허용한 첨가물만 썼는지 확인하세요. 당알코올·인공감미료·보존료·합성색소·아질산염·카페인은 금지입니다.",
      chips: ["附表一 포지티브 리스트", "당알코올·인공감미료 금지", "보존료·색소·아질산염 금지", "영양강화제 상한 내 허용"],
      actions: [
        "영유아식은 附表一에 영유아 식품군이 명시된 첨가물만 사용하세요(비표기 = 금지).",
        "당알코올(소르비톨·자일리톨)·인공감미료(아스파탐·아세설팜·수크랄로스·사카린)·보존료·합성색소·아질산염·카페인을 영유아식 배합에서 제거하세요.",
        "비타민·미네랄 강화제는 영유아 상한(비타민C 60mg·철 15mg·칼슘 750mg 등)을 지키세요."
      ]
    };
  }

  if (category === "school_food") {
    return {
      label: "학교 판매 식품 기준 (校園飲品及點心販售範圍)",
      detail:
        "국중(중학교) 이하 학교 매점(福利社/合作社)에서 판매 가능한 음료는 7종(100% 주스·생우유·멸균우유·두유·발효유·포장수·광천수)으로 제한되며, 간식은 1회 제공량 기준 열량 ≤250kcal, 지방 ≤30%·포화지방 ≤10%·첨가당 ≤10%(열량 대비), 나트륨 ≤400mg를 넘으면 안 됩니다(2025-03-12 개정, 教育部·衛福部). 고교는 탄산음료 금지, CAS/TQF/TAP 등 인증이 필요합니다. 통관을 막지는 않지만 이 기준을 넘으면 학교 판매 채널이 막힙니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "학교(校園) 판매를 노린다면 음료 7종 범위·간식 열량/당/나트륨 기준과 인증(CAS/TQF/TAP)을 확인하세요.",
      chips: ["校園 판매기준", "음료 7종 제한", "간식 열량·당·나트륨", "학교 채널"],
      actions: [
        "학교 판매용이면 校園飲品及點心販售範圍 기준(음료 7종, 간식 ≤250kcal·나트륨 ≤400mg 등) 충족 여부를 확인하세요.",
        "고교 판매는 탄산음료 금지·CAS/TQF/TAP 인증을 확인하세요."
      ]
    };
  }

  if (category === "toddler_formula") {
    return {
      label: "幼兒(1~3세) 조제식 — 별도 허가 없음(일반식품)",
      detail:
        "대만의 조제식 査驗登記 허가는 0~12개월(嬰兒·較大嬰兒)만 대상입니다. 1~3세 幼兒 성장기 조제식(growing-up milk)은 별도 허가·CNS 조성기준이 없는 일반식품으로 취급됩니다. 다만 '조제식(配方)'으로 표방하거나 조제분유 마케팅과 연계(후광 광고)하면 조제식·모유대용품 규제에 걸릴 수 있으니 표시·광고에 주의하세요. 일반식품 표시·오염물 한도는 그대로 적용됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "1~3세 성장기 조제식은 별도 허가는 없지만, '조제식' 표방·조제분유 후광 마케팅은 규제 대상입니다. 표시·광고를 확인하세요.",
      chips: ["幼兒(1-3세)", "별도 허가 없음", "일반식품", "조제식 표방 주의"],
      actions: ["1~3세 성장기 조제식은 일반식품 표시로 진행하되, 조제분유(嬰兒配方) 표방·후광 광고를 피하세요."]
    };
  }

  if (category === "infant_formula_permit") {
    return {
      label: "영유아 조제식 — 査驗登記 허가 필수 (特殊營養食品)",
      detail:
        "嬰兒配方食品(영아 조제분유 0~6개월)·較大嬰兒配方輔助食品(6~12개월)·특수의료용도 영아조제식은 일반식품이 아니라 特殊營養食品으로, 대만에서 제조·수입 전 TFDA 査驗登記 허가(許可證)가 반드시 필요합니다(食安法 §21). 조성 기준(CNS 6849/13235/15224) 충족 + 배합표·공정·해외판매증명·중문라벨 등 서류 심사(약 6개월)를 거칩니다. 허가 없이 수입하면 NT$3만~300만 벌금·반입 불가입니다. 한국의 일반 수입신고(報驗)로는 안 됩니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "영아·특수의료용도 조제식이면 査驗登記 허가(許可證)를 취득했는지 확인하세요. 없으면 수입 불가입니다.",
      chips: ["査驗登記 허가", "特殊營養食品", "허가 없으면 수입불가", "CNS 조성기준"],
      actions: [
        "조제분유·조제식은 TFDA 査驗登記 허가(許可證)를 사전에 취득하세요(일반 수입신고 불가).",
        "CNS 6849/13235/15224 조성 기준과 심사 서류(배합표·공정·해외판매증명)를 준비하세요."
      ]
    };
  }

  if (category === "infant_formula_marketing") {
    return {
      label: "모유대용품 광고·판촉 금지 (母乳代用品)",
      detail:
        "0~6개월 영아 조제분유(모유대용품)는 광고가 원칙 금지이며(학술·의료용 자료만 예외), 모유와 같거나 우수하다는 표현, 무료 샘플·사은품·할인·쿠폰·묶음판매·특별진열 판촉이 모두 금지됩니다(食安法 §28, 嬰兒與較大嬰兒配方食品廣告及促銷管理辦法). '母乳是嬰兒最佳的營養來源(모유가 최고)' 표기 의무. 위반 시 NT$4만~500만. 한국식 이상적 이미지·샘플·포인트 마케팅은 위법입니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "조제분유(0~6개월)면 광고·샘플·사은품·할인 판촉이 금지됩니다. 마케팅 계획을 확인하세요.",
      chips: ["母乳代用品 광고금지", "샘플·사은품 금지", "모유 우수 표현 금지"],
      actions: [
        "0~6개월 조제분유는 광고·무료샘플·사은품·할인·묶음판촉을 하지 마세요.",
        "라벨·자료에 '母乳是嬰兒最佳的營養來源' 문구를 넣고, 모유보다 우수하다는 표현을 피하세요."
      ]
    };
  }

  if (category === "infant_food_labeling") {
    return {
      label: "영유아식 표시 의무 (2025 개정)",
      detail:
        "嬰兒·較大嬰兒 조제식 표시 의무 항목이 2025-01-01(민국114년)부터 강화됐습니다: 조제·보관법, '調配不當將對嬰兒健康造成危害(부적절 조제 시 위해)', 6개월+ 이유 보충 안내, 조제분유의 모유 우수성 문구, 식별문구 '母乳是嬰兒最佳的營養來源', 영양표시(CNS 2925). 이유식·副食品은 適用月齡(적용 월령) 표시가 필수입니다. 한국 라벨에는 이 정확한 중문 문구가 없어 미준수가 흔합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "영유아식 라벨에 2025 개정 필수 문구(母乳最佳·調配不當 경고·적용 월령)가 정확히 들어갔는지 확인하세요.",
      chips: ["2025 표시 개정", "母乳最佳 문구", "調配不當 경고", "적용 월령"],
      actions: ["영유아식 중문 라벨에 조제·보관법, 調配不當 경고, 母乳最佳 문구, 適用月齡을 반영하세요."]
    };
  }

  if (category === "infant_food_safety_limit") {
    return {
      label: "영유아식 강화 오염물·첨가물 한도",
      detail:
        "영유아식은 성인 식품보다 오염물 한도가 엄격합니다 — 이유식/穀物 보충식 납(鉛) 0.05ppm(일반 곡물 0.2), 카드뮴(鎘) 0.04ppm(일반 0.4), 영아용 쌀 원료 총비소(砷) 0.1mg/kg, 조제분유 아플라톡신 M1 0.025µg/kg. 또 다수 감미료(소르비톨·자일리톨 등)·일부 보존료·색소는 영유아식에 사용 불가이며 카페인이 엄격 제한됩니다. 한국 기준은 통과해도 대만 영유아 강화 한도를 초과하면 통관검사에서 반려됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "영유아식이면 대만의 강화 오염물 한도(鉛0.05·鎘0.04ppm 등)와 영유아 금지 첨가물을 시험성적서로 확인하세요.",
      chips: ["鉛0.05·鎘0.04ppm", "아플라톡신M1 0.025", "감미료·색소 제한", "강화 한도"],
      actions: [
        "영유아식은 대만 강화 오염물 한도(납0.05·카드뮴0.04ppm·비소0.1·아플라톡신M1 0.025)를 시험으로 확인하세요.",
        "영유아식에 금지된 감미료·보존료·색소·카페인이 없는지 배합을 점검하세요."
      ]
    };
  }

  if (category === "children_food_marketing") {
    return {
      label: "어린이 대상 식품 광고·판촉 제한 (不適合兒童長期食用)",
      detail:
        "다음 기준을 하나라도 초과하는 과자·사탕·음료·빙과·외식 식품 — 지방 ≥30%(열량 대비)·포화지방 ≥10%(열량 대비)·나트륨 ≥400mg/1회 제공량·첨가당 ≥10%(열량 대비) — 은 만 12세 미만 어린이 대상 '장기 섭취 부적합 식품'으로, 광고·판촉이 제한됩니다(食安法 §28(3), 不適合兒童長期食用之食品廣告及促銷管理辦法, 2016 시행): 어린이 TV 채널 17~21시 광고 금지, '식사 대체' 표현 금지, 어린이 대상 장난감 사은품·끼워팔기 금지. 위반 시 食安法 §45 최대 NT$400만. 어린이 스낵·음료 마케팅에 직접 적용됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "고지방·고당·고나트륨 어린이 식품이면 광고·장난감 사은품·식사대체 표현 제한을 확인하세요.",
      chips: ["어린이 광고 제한", "장난감 사은품 금지", "고지방·고당·고나트륨", "17-21시 금지"],
      actions: [
        "어린이 대상 고지방·고당·고나트륨 식품은 어린이 채널 광고·식사대체 표현·장난감 사은품 판촉을 피하세요."
      ]
    };
  }

  if (category === "food_safety_contaminant") {
    return {
      label: "식품 오염물·잔류물 한도 (수입검사)",
      detail:
        "곰팡이독소(아플라톡신 등)·벤조피렌(훈제·고온)·중금속(납·카드뮴·수은)·농약잔류·동물용의약품(잔류항생제)·방사능은 대만 식품위생표준(食品中污染物質及毒素/農藥/動物用藥 殘留標準)에 한도가 있고, 수입 시 국경검사(逐批/抽批)에서 초과하면 반려·회수 대상입니다. 특히 견과·곡류·향신료(아플라톡신), 훈제·구이(벤조피렌), 수산·축산(중금속·잔류항생제)이 고위험입니다. 시험성적서로 한도 적합성을 확보하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "해당 오염물(곰팡이독소·중금속·잔류농약·잔류항생제 등)이 대만 한도 이내인지 시험성적서로 확인하세요.",
      chips: ["곰팡이독소·중금속·잔류물", "수입 국경검사", "시험성적 필요"],
      actions: ["고위험 원료는 대만 한도(아플라톡신·중금속·농약·동물용약 잔류) 대비 시험성적서를 확보하세요."]
    };
  }

  if (category === "honey_naming") {
    return {
      label: "꿀 품명 기준 (蜂蜜)",
      detail:
        "대만은 꿀 품명을 함량으로 규제합니다: 100% 벌꿀만 '蜂蜜(꿀)', 벌꿀 ≥60%에 당 첨가면 '加糖蜂蜜(가당 벌꿀)', 60% 미만이면 '蜂蜜口味/風味(꿀맛/풍미)'로 표기해야 합니다. 함량 미달 제품에 '蜂蜜/꿀' 단독 명칭을 쓰면 허위표시(최대 NT$400만)입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "벌꿀 함량에 맞는 품명(蜂蜜/加糖蜂蜜/風味)을 썼는지 확인하세요.",
      chips: ["蜂蜜=100%", "加糖蜂蜜 ≥60%", "60%미만=風味"],
      actions: ["벌꿀 함량으로 품명(蜂蜜/加糖蜂蜜/蜂蜜風味)을 맞추세요."]
    };
  }

  if (category === "food_synthetic_color") {
    return {
      label: "합성 식용색소 — 포지티브 리스트(허용 8종)",
      detail:
        "대만은 합성(타르) 식용색소를 포지티브 리스트로 관리하며 허용은 8종뿐입니다: 藍色1號(Blue 1)·藍色2號(Blue 2)·綠色3號(Green 3)·黃色4號(Tartrazine)·黃色5號(Sunset Yellow)·紅色6號(Red 6)·紅色7號(Red 7)·紅色40號(Allura Red). 목록에 없는 색소는 금지입니다 — 한국에서 흔한 적색2호(아마란스)·적색3호(에리트로신)·적색102호(뉴콕신)는 대만 허용 목록에 없어 사용 불가입니다. 또 색소는 생선·생육·신선 채소·된장·간장·차·김 등 특정 식품엔 아예 사용 금지이며, 허용 색소도 식품별 사용량 한도가 있습니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "사용 색소가 대만 허용 8종 안에 있는지 확인하세요. 적색2호·3호·102호 등은 금지입니다. 색소별·식품별 한도도 확인하세요.",
      chips: ["허용 8종만", "적색2호·3호·102호 금지", "생선·차·간장엔 색소 금지"],
      actions: ["사용 합성색소가 대만 허용 8종(Blue1·2/Green3/Yellow4·5/Red6·7·40)인지 대조하세요 — 그 외는 금지."]
    };
  }

  if (category === "chocolate_naming") {
    return {
      label: "초콜릿 품명 기준 (代可可脂 제한)",
      detail:
        "대만 巧克力 품명 기준(2022-01-01): 다크 총 카카오고형분 ≥35%(카카오버터 ≥18%·무지고형분 ≥14%), 밀크 ≥25%+유고형분 ≥12%, 화이트 카카오버터 ≥20%+유고형분 ≥14%. 식물성 유지(代可可脂/CBS)가 총중량의 5%를 넘으면 '巧克力(초콜릿)' 명칭 자체를 쓸 수 없고, 5% 이하라도 품명 옆에 '添加植物油(식물유 첨가)'를 표기해야 합니다. 한국의 대용/코팅 초콜릿은 대개 5%를 넘어 명칭 위반이 됩니다(허위표시 최대 NT$400만).",
      tone: "gold",
      state: "needs_check",
      uncertainty: "카카오고형분·유지방이 품명 기준을 충족하는지, 식물유지가 5%를 넘는지 확인하세요.",
      chips: ["다크 카카오 ≥35%", "代可可脂 >5%=초콜릿 명칭 불가", "植物油 표기"],
      actions: ["카카오 고형분·식물유지 비율로 '巧克力' 명칭 사용 가능 여부와 添加植物油 표기 필요를 확인하세요."]
    };
  }

  if (category === "juice_naming") {
    return {
      label: "과즙 함량 표시·품명 (果汁/果汁飲料)",
      detail:
        "대만 과채음료 표시 규정: 과즙 ≥10%면 '果汁(주스)', 10% 미만이면 '果汁飲料(주스음료)', 0%면 '風味/口味(맛)' + '無果汁'로 표기해야 하고, 果汁含量率(과즙 함량률)을 표시해야 합니다. 또 '鮮榨(착즙)/천연'은 직접 착즙·비희석·비발효·7℃ 미만 보관 제품에만 쓸 수 있어, 농축환원(還原) 제품에 '천연/착즙'을 쓰면 위반입니다. 한국의 '100%/과채주스' 표현이 이 기준에 자주 걸립니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "과즙 함량(%)에 맞는 품명(果汁 vs 果汁飲料 vs 風味)과 함량률 표시, '천연/착즙' 사용 조건을 확인하세요.",
      chips: ["果汁 ≥10%", "果汁飲料 <10%", "함량률 표시", "還原에 '착즙' 금지"],
      actions: ["과즙 함량으로 품명(果汁/果汁飲料/風味)과 果汁含量率 표시를 맞추고, 농축환원이면 '천연·착즙' 표현을 빼세요."]
    };
  }

  if (category === "food_process_contaminant") {
    return {
      label: "가공 생성 오염물 (3-MCPD·아크릴아마이드)",
      detail:
        "가공 중 생성되는 오염물에 주의해야 합니다. ① 3-MCPD·1,3-DCP(클로로프로판올): 간장·산분해간장(HVP)·복합조미료에서 생성 — 대만 위생표준상 한도가 있어 초과 시 통관 반려. ② 아크릴아마이드(丙烯醯胺): 감자칩·유탕과자·비스킷·시리얼·커피 등 고온 조리 전분식품 — 대만은 지표값(예: 감자칩 1000 ppb, 감자튀김 600, 커피 450) 가이드라인을 두고 반복 초과 시 관리·회수 압박이 있습니다. 원료·공정으로 저감하고 시험성적을 확보하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "간장·조미료면 3-MCPD 한도, 고온 조리 전분식품이면 아크릴아마이드 지표값 대비 시험값을 확인하세요.",
      chips: ["3-MCPD(간장·HVP)", "아크릴아마이드 지표값", "시험성적 필요"],
      actions: ["간장·복합조미료는 3-MCPD/1,3-DCP 시험성적을, 고온 조리 전분식품은 아크릴아마이드 저감·시험을 확보하세요."]
    };
  }

  if (category === "trans_fat_pho_ban") {
    return {
      label: "경화유(氫化油) — 부분경화유 금지·완전경화유 확인",
      detail:
        "대만은 2018-07-01부터 식품에 不完全氫化油(부분경화유, PHO) 사용을 금지합니다(食用氫化油之使用限制, 食安法 §15). ⚠️ 금지되는 것은 '부분(不完全)' 경화유이며, 完全氫化油(완전경화유, 트랜스지방 거의 0)는 허용됩니다. 따라서 라벨에 '경화유/氫化油/hydrogenated'만 적혀 있으면 부분인지 완전인지 반드시 확인해야 합니다 — 부분경화유면 마가린·쇼트닝·식물성 크림/奶精·베이커리 등 수입·판매 불가(위반 NT$3만~300만). 또 포장식품 영양표시에 트랜스지방 함량 표기가 의무이고, '트랜스지방 0'은 100g당 0.3g 이하 등 조건을 충족할 때만 표기할 수 있습니다.",
      tone: "gold",
      state: "restricted_risk",
      uncertainty: "제품의 경화유가 부분(不完全)인지 완전(完全)인지 공급자 사양서로 확인하세요. 부분경화유면 대만 수입·판매가 금지입니다(완전경화유는 허용).",
      chips: ["부분경화유 금지", "완전경화유는 허용", "2018 시행", "트랜스지방 0 조건"],
      actions: [
        "경화유가 부분(不完全)인지 완전(完全)인지 공급자에게 확인하세요 — 부분경화유는 완전경화유·비경화 유지로 대체.",
        "영양표시의 트랜스지방 값을 확인하고 '0' 표기는 ≤0.3g/100g 조건을 지키세요."
      ]
    };
  }

  if (category === "food_edible_oil") {
    return {
      label: "식용 유지 — 품질기준·경화 여부 확인",
      detail:
        "해바라기유·코코넛유·대두유·팜유 등 식용 유지는 대만에서 식품원료로 사용 가능하나, 산가·과산화물가 등 품질기준(食用油脂 위생표준)과 중문 표시·원산지 표시를 지켜야 합니다. 특히 경화(hydrogenated) 처리된 유지라면 부분경화유(不完全氫化油, PHO)는 2018년부터 사용 금지이니 완전/부분 경화 여부를 반드시 확인하세요. 팜유·코코넛유 등은 원산지·지속가능성 요구가 붙기도 합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "유지가 경화 처리됐다면 부분경화유(PHO) 여부를 확인하세요. 품질기준(산가·과산화물가)·원산지 표시도 점검하세요.",
      chips: ["식용 유지", "품질기준(산가·과산화물)", "경화 시 PHO 확인", "원산지 표시"],
      actions: [
        "유지의 경화 처리 여부와 부분경화유(PHO) 포함 여부를 공급자 사양서로 확인하세요.",
        "산가·과산화물가 등 대만 식용유지 위생표준과 중문·원산지 표시를 점검하세요."
      ]
    };
  }

  if (category === "dairy_fat_naming") {
    return {
      label: "버터·크림·마가린 품명·유지방 기준",
      detail:
        "대만 品名 기준(2017-07-01): 奶油(버터)=유지방 ≥80%, 鮮奶油(크림)=유지방 10%~80% 미만, 人造奶油/乳瑪琳(마가린)=지방 ≥80%, 脂肪抹醬(스프레드)=지방 10%~80% 미만. 식물성 유지 제품은 '植物性奶油/植物性鮮奶油' 등 버터·크림을 연상시키는 명칭을 쓸 수 없습니다. 한국의 '식물성 생크림' 식 명칭은 위반이며, 허위표시는 食安法 §28 최대 NT$400만입니다. 또한 유제품(버터·크림·우유)은 農業部 APHIA 동물검역과 수출국(MAFRA/APQA) 위생증명이 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "유지방 함량이 품명 기준(奶油≥80%·鮮奶油 10~80%)에 맞는지, 식물성 제품이 버터·크림 명칭을 쓰지 않는지 확인하세요.",
      chips: ["奶油≥80% 유지방", "鮮奶油 10~80%", "植物性 명칭 금지", "유제품=동물검역"],
      actions: [
        "유지방 함량으로 품명(奶油/鮮奶油/人造奶油/脂肪抹醬)이 맞는지 확인하세요.",
        "식물성 유지 제품은 '植物性奶油/植物性鮮奶油' 등 버터·크림 연상 명칭을 쓰지 마세요.",
        "유제품이면 APHIA 동물검역·수출국 위생증명을 확보하세요."
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
        "미백(美白)·자외선차단(防曬)·염모(染髮)·펌(燙髮)·제한(止汗制臭)·여드름 방지(面皰) 같은 특정용도(特定用途) 표현입니다(대만 특정용도 화장품 범주). 일반 화장품보다 요건이 강합니다 — 대만이 인정한 성분(허용목록)만 쓸 수 있고, 함량·경고문·안전성/효능 시험자료와 제품 등록·PIF가 필요합니다(특정용도 許可證은 2024년 폐지, 등록+PIF로 전환). 인정 성분·근거 없이 이 효능을 표기하면 위반입니다. ※ 주름개선(抗皺)은 대만에서 특정용도가 아니라 일반 화장품 표현이며, 근거 없는 과대표현만 주의하면 됩니다.",
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
