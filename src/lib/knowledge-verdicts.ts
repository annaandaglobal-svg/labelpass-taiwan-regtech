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
      label: "화장품 사용 제한 (약용·한약재)",
      detail:
        "何首烏(하수오) 같은 일부 한약재는 대만에서 의약품 성분(中藥材)으로 관리되어 화장품·식품 사용이 제한·금지될 수 있습니다. 화장품 원료로 쓰려면 이 성분이 화장품에 허용되는 형태·부위·함량인지, 의약품 전용은 아닌지 반드시 확인해야 합니다. 근거 없이 사용하면 위반·회수 위험이 있습니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "이 성분이 대만 화장품에 허용되는지, 의약품 전용 성분(藥用)은 아닌지 확인하세요. 불명확하면 사용 전 전문가 검토가 필요합니다.",
      chips: ["한약재·약용 가능성", "화장품 허용 여부 확인", "의약품 오인 주의"],
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
        "비타민·미네랄 정제·캡슐 식품은 대만에서 1일 섭취 상한이 정해져 있고 초과 시 의약품으로 분류되어 식품 수입·판매가 반려됩니다. 현행 법정 상한(第八類 營養添加劑, L0040084): 비타민A 10,000 IU(3,000µg RE), D 800 IU(20µg), 나이아신 100mg NE, 철 45mg, B6 80mg, C 1,000mg, 아연 30mg, 칼슘 1,800mg(1일 섭취량 기준). 한국의 고함량 제품이 자주 초과합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제품의 1일 섭취량 기준 함량이 대만 상한을 넘지 않는지 확인하세요. 초과하면 약품 분류·통관 반려 위험이 있습니다.",
      chips: ["1일 상한", "초과 시 약품 분류", "고함량 주의"],
      actions: ["대만 비타민·미네랄 1일 상한(每日上限)과 제품 함량을 대조하세요."]
    };
  }

  if (category === "capsule_tablet_food") {
    return {
      label: "정·캡슐 형태 식품 표시 규정",
      detail:
        "정제·캡슐 형태 식품은 분말·액상 일반식품, 그리고 健康食品(허가제)과도 다른 별도 규정을 따릅니다. 1회 건의섭취량(정수) 기준 영양표시, 그리고 비타민·미네랄 강화 시 경고문 '一日請勿超過○粒(1일 ○정 초과 금지)'·'多食無益(많이 먹어도 무익)' 표기가 필수입니다. 한국의 알약형 건강기능식품이 대개 여기 해당합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "정·캡슐 형태면 건의섭취량 기준 표시와 경고문(多食無益 등)을 갖췄는지 확인하세요.",
      chips: ["정·캡슐 형태 식품", "건의섭취량 표시", "경고문 필수", "건강식품과 별개"],
      actions: ["정·캡슐 식품 영양표시(건의섭취량 기준)와 필수 경고문을 확인하세요."]
    };
  }

  if (category === "novel_food_ingredient") {
    return {
      label: "신규 식품원료 — 사전 안전성평가",
      detail:
        "대만에서 1999-12-31 이전 국내 식용 이력이 없는 원료(새로운 식물·발효·추출 성분 등)는 판매 전 TFDA 안전성 평가가 필요합니다(新型態食品原料 안전성평가 원칙, 2026-01-27 시행). 평가·인정 전에는 식품 사용이 불가합니다. 한국의 신소재·신규 추출물이 해당될 수 있습니다.",
      tone: "gold",
      state: "restricted_risk",
      uncertainty: "원료에 대만 내 식용 이력이 없다면 사전 안전성평가 대상인지 확인하세요. 평가 전에는 사용 불가입니다.",
      chips: ["신규 식품원료", "사전 안전성평가", "식용 이력 확인"],
      actions: ["대만 식용 이력이 없는 원료는 TFDA 신규 식품원료 안전성평가 대상인지 확인하세요."]
    };
  }

  if (category === "prohibited_medical_claim") {
    return {
      label: "의료효능·질병 표현 금지",
      detail:
        "화장품·식품에 '치료·예방·개선(질병)'을 연상시키는 의료효능 표현은 금지됩니다. 화장품 금지 예: 換膚(각질 벗김)·醫美/醫學美容·藥用·除疤(흉터)·抗過敏·消炎·豐胸·瘦身/塑身·拉提/V臉·毛髮生長. 식품 금지 예: 治療·預防·특정 질병 개선. 위반 시 화장품 NT$40,000~5,000,000, 식품 최대 NT$5,000,000 벌금 대상입니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "표현이 질병 치료·예방·의약품을 연상시키는지 확인하세요. 해당하면 표시·광고 불가입니다.",
      chips: ["의료효능 표현 금지", "각질박피·약용·흉터·체형관리 표현", "고액 벌금"],
      actions: ["換膚·醫美·藥用·除疤·豐胸·瘦身·治療·預防 등 의료·질병 표현을 라벨·광고에서 제거하세요."]
    };
  }

  if (category === "heavy_metal_limit") {
    return {
      label: "중금속 잔류 한도",
      detail:
        "화장품 중금속은 첨가 금지이며 불가피한 불순물로만 미량 허용됩니다 — 대만 한도: 수은(汞) 1ppm, 납(鉛) 10ppm, 비소(砷) 3ppm, 카드뮴(鎘) 5ppm. 색조·립 제품에서 특히 문제되며, 초과 시 회수·행정처분 대상입니다. COA(중금속 시험성적서)로 적합성을 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "완제품 중금속(汞·鉛·砷·鎘)이 대만 한도 이내인지 시험성적서로 확인하세요.",
      chips: ["수은1·납10·비소3·카드뮴5 ppm", "첨가 금지", "COA 필요"],
      actions: ["완제품 중금속 시험성적서로 대만 한도(汞1/鉛10/砷3/鎘5 ppm) 적합성을 확인하세요."]
    };
  }

  if (category === "microplastic_ban") {
    return {
      label: "미세플라스틱 금지 — 씻어내는 화장품",
      detail:
        "대만은 環境部(환경부) 규정으로 씻어내는(rinse-off) 화장품 6종(샴푸·바디워시·페이셜클렌저·비누·치약·스크럽)에 미세플라스틱(塑膠微粒, PE/PP/PMMA 등 마이크로비드) 제조·판매를 금지합니다. TFDA가 아닌 環境部 소관이라 화장품 기준만 보면 누락됩니다. 스크럽·필링 제품의 알갱이가 플라스틱이면 대체가 필요합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "씻어내는 제품에 플라스틱 마이크로비드가 들어있는지 확인하세요. 있으면 판매 금지입니다.",
      chips: ["미세플라스틱 금지", "환경부 소관", "씻어내는 제품 6종"],
      actions: ["씻어내는 화장품의 스크럽/각질 알갱이가 플라스틱(마이크로비드)인지 확인하고, 해당 시 천연 대체제로 교체하세요."]
    };
  }

  if (category === "food_gmo_labeling") {
    return {
      label: "유전자변형(GMO) 표시 의무",
      detail:
        "대두·옥수수·카놀라 등 유전자변형(GMO) 원료를 3% 초과 함유하거나 의도적으로 사용하면 '基因改造/含基因改造' 표시가 의무입니다(TFDA 基因改造食品標示規定). 고도 정제품(대두유·간장·콘시럽 등 잔류 DNA가 없어도)도 표시 대상입니다. Non-GMO 원료 증빙이 없으면 표시가 필요할 수 있습니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대두·옥수수 계열 원료의 GMO 여부와 3% 기준을 확인하고, 해당하면 中文 '基因改造' 표시를 하세요.",
      chips: ["유전자변형 표시", "3% 초과·의도적 사용", "정제품도 대상"],
      actions: ["대두·옥수수 계열 원료의 GMO 여부(비유전자변형 증빙)를 확인하고, 해당 시 '基因改造' 표시를 추가하세요."]
    };
  }

  if (category === "caffeine_labeling") {
    return {
      label: "카페인 함량 표시",
      detail:
        "카페인 함유 포장음료는 함량 표시가 의무입니다 — 100mL당 20mg 이상이면 실제 함량과 함께 '每日建議攝取量300mg，孩童及孕哺婦慎用(1일 권장 섭취 300mg 이하·어린이·임산부 주의)' 문구를, 20mg 미만이면 '20mg/100mL以下'를 표기합니다. 차·커피·에너지/기능성 음료가 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "카페인 함유 음료면 100mL당 함량과 주의 문구 표기 요건을 확인하세요.",
      chips: ["카페인 함량 표시", "20mg/100mL 기준", "주의 문구"],
      actions: ["카페인 음료의 100mL당 함량과 '每日建議攝取量300mg' 주의 문구를 라벨에 표기하세요."]
    };
  }

  if (category === "vegetarian_labeling") {
    return {
      label: "채식 표시 — 5분류 표기",
      detail:
        "'素食(채식/비건)'을 표방하는 식품은 대만 규정상 5가지 분류 중 하나를 명시해야 합니다: 全素/純素·蛋素·奶素·奶蛋素·植物五辛素. 위반 시 NT$30,000~3,000,000 벌금 대상입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "채식/비건 표방 시 5분류(全素·蛋素·奶素·奶蛋素·植物五辛素) 중 정확한 유형을 표기했는지 확인하세요.",
      chips: ["채식 5분류", "全素·蛋素·奶素·奶蛋素·五辛素"],
      actions: ["채식 표방 제품은 대만 素食 5분류 중 해당 유형을 라벨에 명시하세요."]
    };
  }

  if (category === "hair_dye_ingredient") {
    return {
      label: "염모 성분 — 특정용도·패치테스트 경고",
      detail:
        "PPD(p-페닐렌디아민)·톨루엔-2,5-디아민·레조르시놀 등 산화 염모 성분은 대만 特定用途(染髮) 화장품 성분으로, 인정 목록·혼합 후 최대 함량 이내에서만 쓸 수 있습니다(예: PPD 2% — 혼합 후 free base 기준). 라벨에는 대만 '染髮劑之標籤·仿單·包裝應標示事項' 공고 문구가 의무입니다 — 눈썹·속눈썹 등 두발 외 부위 사용 금지, 장갑 착용, 사용 전 피부 과민시험(패치) 권장, 염색 후 피부 이상 시 즉시 의료, 신장·혈액질환·임신 등은 사용 회피, 어린이 손 닿지 않는 곳 보관. ⚠️ '48시간 전 패치테스트'·'16세 미만 금지'는 EU 규정이며 대만 의무 문구가 아닙니다. 제품 등록·PIF도 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "염모 성분의 혼합 후 함량이 한도 이내인지, 패치테스트·연령·부위 경고문이 있는지 확인하세요.",
      chips: ["염모 특정용도", "눈썹·속눈썹 금지", "피부시험 권장", "혼합 후 한도"],
      actions: ["염모 성분 함량을 인정 한도로 맞추고 대만 染髮劑 공고 경고문(부위·시험·이상시 조치)과 제품 등록·PIF를 준비하세요. (48시간·16세 미만은 EU 규정)"]
    };
  }

  if (category === "skin_lightening_agent") {
    return {
      label: "미백 성분 — 특정용도·인정목록",
      detail:
        "코직산·알부틴·나이아신아마이드 등 미백 소구 성분은 대만 特定用途(美白) 화장품에 해당하여, 대만이 인정한 미백 성분 목록과 함량 이내에서만 쓸 수 있고 제품 등록·PIF·안전성/효능 자료가 필요합니다(예: 코직산 1% 얼굴·손 제품). 인정 성분·근거 없이 '美白/미백' 효능을 표기하면 위반입니다. (하이드로퀴논은 화장품 금지.)",
      tone: "gold",
      state: "needs_check",
      uncertainty: "미백 성분이 대만 인정 목록·한도 이내인지, 美白 표현 근거(등록·자료)가 있는지 확인하세요.",
      chips: ["미백 특정용도", "인정 성분·한도", "하이드로퀴논 금지"],
      actions: ["미백 성분을 대만 인정 목록·한도로 확인하고 特定用途(美白) 등록·PIF를 준비하세요."]
    };
  }

  if (category === "uv_filter") {
    return {
      label: "자외선 차단 성분 (UV필터)",
      detail:
        "자외선 차단 성분은 대만 化粧品防曬劑成分使用限制表의 인정 목록·최대 함량 이내에서만 쓸 수 있습니다: 옥티녹세이트(에칠헥실메톡시신나메이트) 10%, 아보벤존(뷰틸메톡시디벤조일메탄) 5%(광안정제 병용 권장), 호모살레이트 10%(대만은 EU의 7.34% 감축 미채택), 옥시벤존(BP-3) 6%(0.5% 초과 시 '本產品含二苯酮-3' 표기), 옥토크릴렌 10%, 산화아연 25%, 이산화티타늄 25%. SPF 표시는 50+까지·시험자료 근거가 필요하고, 나노(ZnO/TiO₂ 총 25% 초과·스프레이형)는 特定用途 등록·규격 확인이 필요합니다. 제품 등록·PIF 대상입니다(2024-07~ 사전허가 폐지·통보제).",
      tone: "gold",
      state: "needs_check",
      uncertainty: "UV필터가 인정 목록·최대 함량 이내인지, SPF/PA 근거와 나노 표기를 확인하세요.",
      chips: ["자외선차단 특정용도", "UV필터 최대 함량", "SPF/PA 시험근거", "나노 표기"],
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
        "화장품 방부제는 대만 化粧品防腐劑成分使用限制表의 인정 목록·최대 함량·사용 조건(리브온/린스오프, 점막 금지 등) 이내에서만 쓸 수 있습니다. 확정 한도: 페녹시에탄올 1.0%, MIT 단독 0.01%(100ppm)·린스오프 전용(리브온 불가), CMIT/MIT(3:1) 0.0015%(15ppm)·린스오프 전용, 포름알데히드 유리제(DMDM히단토인 등)는 유리 폼알데하이드 총 ≤1,000ppm·린스오프 전용. 목록에 없는 방부제나 한도 초과는 위반입니다.",
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
        "대만 化粧品成分使用限制表에 함량·조건·경고문이 정해진 제한 성분입니다. 확정: 살리실산 2%(일반)·3%(린스오프)·방부용 0.5% + '3세 미만 사용 금지'(샴푸 제외) 경고; AHA는 %상한 없이 pH≥3.5 + 자외선 민감·'사용 후 자외선 차단제' 경고; 붕산 현재 제한 0.1%(3세 미만·삼킴 금지)이나 2027-10-01 개정으로 완전 금지 예정(최종 관보 확인 필요). 2027-10-01 시행: 레티놀 0.05%(바디 리브온)·0.3%(기타) RE + '비타민A 함유' 문구, 알파-아르부틴 2%(얼굴)·0.5%(바디) + 하이드로퀴논 불순물 ≤20ppm.",
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
      chips: ["의료기기 등록", "허가증·판매업 허가", "2·3등급 온라인 제한"],
      actions: ["콘택트렌즈·탐폰·콘돔·수술용 마스크는 TFDA 醫療器材 査驗登記·許可證을 확보하세요(등급 확인)."]
    };
  }

  if (category === "tobacco_vape") {
    return {
      label: "담배·전자담배 — 전자담배 전면 금지",
      detail:
        "菸害防制法(2023-03-22 개정) 관할은 衛福部 국민건강서(HPA)입니다. ⚠️ 電子煙(전자담배/類菸품)은 제조·수입·판매·사용이 전면 금지입니다 — 수입 경로 자체가 없습니다(벌금 최대 NT$5,000만). 加熱菸(가열담배)는 HPA 건강위해평가 심사를 통과한 제품만 가능하며, 2개사 14개 제품이 승인(2025-07)돼 2025-10-11부터 합법 판매가 시작됐고 면세 수입 규정은 2026-02-01 시행(200개비 한도·허위신고 벌금)입니다. 일반 궐련·담배도 별도 규제·세금(菸酒稅) 대상입니다.",
      tone: "red",
      state: "prohibited_confirmed",
      uncertainty: "전자담배(액상형·CSV 포함)는 수입 불가입니다. 가열담배는 HPA 심사 승인 여부를 확인하세요.",
      chips: ["전자담배 전면 금지", "가열담배 심사 필요", "HPA 관할"],
      actions: ["전자담배는 대만 수입·판매가 금지이니 진행하지 마세요. 가열담배는 HPA 건강위해평가 승인 여부를 확인하세요."]
    };
  }

  if (category === "pet_food") {
    return {
      label: "반려동물 사료 — 농업부 신고·검역",
      detail:
        "반려동물 사료(寵物食品)는 TFDA가 아니라 農業部(MOA) 관할입니다. ① 動物保護法에 따라 사료를 수입 전 業者 申報(신고, petfood.moa.gov.tw) — 허가제가 아닌 신고제 — 하고, ② 동물성 원료를 포함하면 犬貓食品輸入檢疫條件에 따라 動植物防疫檢疫署(APHIA)의 수입 검역을 받아야 합니다. 표시·성분 기준도 별도입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "반려동물 사료면 農業部 業者 申報와 동물성 원료 수입검역(APHIA) 요건을 확인하세요(TFDA 아님).",
      chips: ["농업부 관할", "업자 신고(신고제)", "동물성=검역"],
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
      chips: ["환경용약(환경부)", "인체 살균=의약품", "무표방=화장품/일반"],
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
      label: "미용기기·전자제품 — TFDA 밖 인증 다수 (BSMI·NCC·의료기기)",
      detail:
        "미용기기·전자제품은 화장품이 아니라 여러 부처의 별도 인증 대상입니다. ① 전기·전자 안전: 經濟部 標準檢驗局(BSMI)의 商品檢驗 등록·검사·BSMI 마크가 필요하며 미검사 시 통관 불가. ② 무선기능(WiFi·블루투스·RF): 國家通訊傳播委員會(NCC)의 형식인증·수입 승인 필요. ③ 의료기기 해당 여부: EMS·RF·IPL·레이저·미세전류를 쓰거나 치료·생리적 효능을 표방하면 醫療器材(의료기기)로 재분류되어 TFDA 醫療器材 등록·QMS·대만 대리인이 필요합니다. 화장품 기준만 보면 이 세 가지가 모두 누락됩니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "기능·전원·무선 여부에 따라 BSMI·NCC·醫療器材 중 무엇이 필요한지 달라집니다. 기기는 화장품과 별개로 반드시 확인하세요.",
      chips: ["BSMI 상품검험", "NCC 무선 인증", "의료기기 재분류?", "TFDA 밖 규제"],
      actions: [
        "전기·전자 제품은 經濟部 標準檢驗局(BSMI) 商品檢驗 대상인지 확인하세요(마크·검사 없으면 통관 불가).",
        "WiFi·블루투스·RF 기능이 있으면 NCC 형식인증·수입 승인을 받으세요.",
        "EMS·RF·IPL·레이저·미세전류 또는 치료 표방이면 醫療器材(의료기기) 등록·QMS·대만 대리인이 필요한지 확인하세요."
      ]
    };
  }

  if (category === "environment_recycling") {
    return {
      label: "자원회수표지·회수비 (환경부)",
      detail:
        "대만은 지정 용기·포장·전지·전기전자제품의 수입자를 '責任業者'로 보아 등록·회수처리비(回收清除處理費) 납부와 제품/포장에 資源回收標誌(재활용 마크)+재질코드 표기를 의무화합니다(廢棄物清理法, 環境部). 대상: 금속·유리·플라스틱·종이 용기(대부분 포장식품·음료·화장품), 건전지, IT·가전, 램프 등. 전지는 수은 5ppm 초과 시 수입·판매 금지 + 함량확인문서가 필요합니다. TFDA가 아닌 環境部 소관이라 흔히 누락됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "포장·용기·전지·가전이 대만 회수 대상이면 責任業者 등록·회수비·재활용 마크 표기 여부를 확인하세요.",
      chips: ["자원회수표지", "책임업자 등록·회수비", "전지 수은 5ppm", "환경부 소관"],
      actions: [
        "포장·용기·전지·가전이 대만 지정 회수품목인지 확인하고, 責任業者 등록·회수처리비·재활용 마크 표기를 준비하세요.",
        "건전지는 수은 함량(≤5ppm) 확인문서와 회수 표시가 필요합니다."
      ]
    };
  }

  if (category === "commodity_labeling") {
    return {
      label: "일반상품 중문 표시 (상품표시법·경제부)",
      detail:
        "식품·화장품·의약품이 아닌 일반상품(의류·생활용품·문구·전자·잡화)은 經濟部 商品標示法에 따라 판매 전 中文 표시가 의무입니다: 품명·수입자 중문 명칭·주소·전화·원산지·주요 성분/재질·중량/용량/수량·제조일자 등. 섬유·의류는 성분(≥5%)·취급·치수·원산지 표시와 유아용 甲醛(포름알데히드) 한도(유아 20ppm 등)가 추가됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "일반상품이면 商品標示法 중문 표시(품명·수입자·원산지·재질 등) 요건을 확인하세요.",
      chips: ["상품표시법", "일반상품 중문표시", "섬유=성분·포름알데히드"],
      actions: ["일반상품은 판매 전 중문 표시(품명·수입자·원산지·재질·용량)를 부착하세요. 섬유·유아용은 甲醛 한도도 확인하세요."]
    };
  }

  if (category === "alcohol_tobacco_licence") {
    return {
      label: "주류·담배 수입 허가·세금 (주류관리법·재정부)",
      detail:
        "주류(술)를 수입하려면 財政部 國庫署의 菸酒進口業許可執照(수입업 허가)가 사전에 필요하고 菸酒稅(주세)가 부과됩니다. TFDA 식품 규정과 별개(다른 부처)입니다. 술·리큐르뿐 아니라 알코올 도수가 있는 음료성 제품도 해당될 수 있습니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "주류/알코올 음료면 財政部 수입업 허가와 주세 대상인지 확인하세요.",
      chips: ["주류 수입허가", "재정부 관할", "주세"],
      actions: ["주류·알코올 음료는 財政部 國庫署 菸酒 수입업 허가와 주세 요건을 사전에 확인하세요."]
    };
  }

  if (category === "energy_efficiency_label") {
    return {
      label: "에너지효율 표시·MEPS",
      detail:
        "지정 가전(냉장고·에어컨·제습기·TV 등)은 經濟部 能源署의 능원효율 등급표시(1~5급)와 최저효율기준(MEPS, 容許耗用能源基準)이 의무입니다. 기준 미달 제품은 수입·판매 불가입니다. 이는 '자발적' 節能標章(에너지절약 마크)과 다른 '의무' 규제입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "지정 가전이면 능원효율 등급표시·MEPS 충족 여부를 확인하세요(의무). 節能標章과 혼동하지 마세요.",
      chips: ["에너지효율 표시", "MEPS 최저효율", "지정 가전 의무"],
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
      chips: ["환경용약", "살균=의약품 가능", "표현별 분류"],
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
      chips: ["BSMI 상품검험", "프탈레이트 ≤0.1%", "완구·어린이용품"],
      actions: ["완구·어린이용품은 BSMI 상품검사·마크와 프탈레이트 6종 한도를 확인하세요."]
    };
  }

  if (category === "animal_plant_quarantine") {
    return {
      label: "동식물 검역 대상",
      detail:
        "동물성(새우·육류·유제품 등)·식물성(종자·일부 식물 원료) 식품 원료는 식품 위생검사와 별개로 農業部 動植物防疫檢疫署(APHIA, 구 BAPHIQ)의 수입 검역(輸入檢疫) 대상일 수 있습니다. 수출국 주무기관이 발급한 공식 위생/식물검역 증명서(민간 증명서 불가)가 필요하며, ASF(아프리카돼지열병) 등으로 다수 육류 제품은 반입 자체가 금지됩니다. 이는 알레르겐 표시와는 별개의 통관 전 관문입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty:
        "동물성·식물성 원료 포함 시 검역 대상 여부와 수출국 공식 증명서 필요 여부를 통관 전 확인하세요.",
      chips: ["동식물방역검역서(APHIA)", "수입 검역", "공식 검역증명 필요", "육류=반입제한 다수"],
      actions: [
        "동물성·식물성 원료가 農業部 APHIA 수입 검역 대상인지 확인하세요.",
        "수출국 주무기관 발급 위생/식물검역 증명서(공식)를 확보하세요 — 민간 증명서는 불가합니다.",
        "육류·특정 축산물은 ASF 등으로 반입 금지일 수 있으니 사전 확인하세요."
      ]
    };
  }

  if (category === "infant_additive_restriction") {
    return {
      label: "영유아식 첨가물 — 포지티브 리스트",
      detail:
        "대만 첨가물 기준(附表一)은 포지티브 리스트입니다 — 영유아식(嬰兒配方·較大嬰兒·嬰兒(보조)식품)에는 附表一에 해당 식품군이 명시된 첨가물만 사용할 수 있고, 명시되지 않은 것은 금지입니다(第2條 '非表列之食品品項，不得使用'). [허용 예] 영양강화제(비타민·미네랄, 영유아 상한 있음 — 비타민C ≤60mg·철 ≤15mg·칼슘 ≤750mg 등)·항산화제 L-아스코르빈산/토코페롤·유화제 지방산글리세리드. [금지 예] 당알코올 감미료(소르비톨·자일리톨·만니톨·말티톨·이소말트·락티톨 — '嬰兒食品不得使用' 명시)·인공감미료(아스파탐·아세설팜K·수크랄로스·사카린)·보존료(소르빈산·안식향산·파라벤)·합성 타르색소·아질산/질산염·카페인. 조제식 등 특수영양식품은 중앙기관 사전 심사가 별도로 필요합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "영유아식에 附表一가 영유아 식품군에 허용한 첨가물만 썼는지 확인하세요. 당알코올·인공감미료·보존료·합성색소·아질산염·카페인은 금지입니다.",
      chips: ["부표1 포지티브 리스트", "당알코올·인공감미료 금지", "보존료·색소·아질산염 금지", "영양강화제 상한 내 허용"],
      actions: [
        "영유아식은 附表一에 영유아 식품군이 명시된 첨가물만 사용하세요(비표기 = 금지).",
        "당알코올(소르비톨·자일리톨)·인공감미료(아스파탐·아세설팜·수크랄로스·사카린)·보존료·합성색소·아질산염·카페인을 영유아식 배합에서 제거하세요.",
        "비타민·미네랄 강화제는 영유아 상한(비타민C 60mg·철 15mg·칼슘 750mg 등)을 지키세요."
      ]
    };
  }

  if (category === "school_food") {
    return {
      label: "학교 판매 식품 기준",
      detail:
        "국중(중학교) 이하 학교 매점(福利社/合作社)에서 판매 가능한 음료는 7종(100% 주스·생우유·멸균우유·두유·발효유·포장수·광천수)으로 제한되며, 간식은 1회 제공량 기준 열량 ≤250kcal, 지방 ≤30%·포화지방 ≤10%·첨가당 ≤10%(열량 대비), 나트륨 ≤400mg를 넘으면 안 됩니다(2025-03-12 개정, 教育部·衛福部). 고교는 탄산음료 금지, CAS/TQF/TAP 등 인증이 필요합니다. 통관을 막지는 않지만 이 기준을 넘으면 학교 판매 채널이 막힙니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "학교(校園) 판매를 노린다면 음료 7종 범위·간식 열량/당/나트륨 기준과 인증(CAS/TQF/TAP)을 확인하세요.",
      chips: ["학교 판매기준", "음료 7종 제한", "간식 열량·당·나트륨", "학교 채널"],
      actions: [
        "학교 판매용이면 校園飲品及點心販售範圍 기준(음료 7종, 간식 ≤250kcal·나트륨 ≤400mg 등) 충족 여부를 확인하세요.",
        "고교 판매는 탄산음료 금지·CAS/TQF/TAP 인증을 확인하세요."
      ]
    };
  }

  if (category === "toddler_formula") {
    return {
      label: "유아(1~3세) 조제식 — 별도 허가 없음(일반식품)",
      detail:
        "대만의 조제식 査驗登記 허가는 0~12개월(嬰兒·較大嬰兒)만 대상입니다. 1~3세 幼兒 성장기 조제식(growing-up milk)은 별도 허가·CNS 조성기준이 없는 일반식품으로 취급됩니다. 다만 '조제식(配方)'으로 표방하거나 조제분유 마케팅과 연계(후광 광고)하면 조제식·모유대용품 규제에 걸릴 수 있으니 표시·광고에 주의하세요. 일반식품 표시·오염물 한도는 그대로 적용됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "1~3세 성장기 조제식은 별도 허가는 없지만, '조제식' 표방·조제분유 후광 마케팅은 규제 대상입니다. 표시·광고를 확인하세요.",
      chips: ["유아(1-3세)", "별도 허가 없음", "일반식품", "조제식 표방 주의"],
      actions: ["1~3세 성장기 조제식은 일반식품 표시로 진행하되, 조제분유(嬰兒配方) 표방·후광 광고를 피하세요."]
    };
  }

  if (category === "infant_formula_permit") {
    return {
      label: "영유아 조제식 — 심사등록 허가 필수 (특수영양식품)",
      detail:
        "嬰兒配方食品(영아 조제분유 0~6개월)·較大嬰兒配方輔助食品(6~12개월)·특수의료용도 영아조제식은 일반식품이 아니라 特殊營養食品으로, 대만에서 제조·수입 전 TFDA 査驗登記 허가(許可證)가 반드시 필요합니다(食安法 §21). 조성 기준(CNS 6849/13235/15224) 충족 + 배합표·공정·해외판매증명·중문라벨 등 서류 심사(약 6개월)를 거칩니다. 허가 없이 수입하면 NT$3만~300만 벌금·반입 불가입니다. 한국의 일반 수입신고(報驗)로는 안 됩니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "영아·특수의료용도 조제식이면 査驗登記 허가(許可證)를 취득했는지 확인하세요. 없으면 수입 불가입니다.",
      chips: ["심사등록 허가", "특수영양식품", "허가 없으면 수입불가", "CNS 조성기준"],
      actions: [
        "조제분유·조제식은 TFDA 査驗登記 허가(許可證)를 사전에 취득하세요(일반 수입신고 불가).",
        "CNS 6849/13235/15224 조성 기준과 심사 서류(배합표·공정·해외판매증명)를 준비하세요."
      ]
    };
  }

  if (category === "infant_formula_marketing") {
    return {
      label: "모유대용품 광고·판촉 금지",
      detail:
        "0~6개월 영아 조제분유(모유대용품)는 광고가 원칙 금지이며(학술·의료용 자료만 예외), 모유와 같거나 우수하다는 표현, 무료 샘플·사은품·할인·쿠폰·묶음판매·특별진열 판촉이 모두 금지됩니다(食安法 §28, 嬰兒與較大嬰兒配方食品廣告及促銷管理辦法). '母乳是嬰兒最佳的營養來源(모유가 최고)' 표기 의무. 위반 시 NT$4만~500만. 한국식 이상적 이미지·샘플·포인트 마케팅은 위법입니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "조제분유(0~6개월)면 광고·샘플·사은품·할인 판촉이 금지됩니다. 마케팅 계획을 확인하세요.",
      chips: ["모유대용품 광고금지", "샘플·사은품 금지", "모유 우수 표현 금지"],
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
      chips: ["2025 표시 개정", "모유 우수성 문구", "조제 부적절 경고", "적용 월령"],
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
      chips: ["납0.05·카드뮴0.04ppm", "아플라톡신M1 0.025", "감미료·색소 제한", "강화 한도"],
      actions: [
        "영유아식은 대만 강화 오염물 한도(납0.05·카드뮴0.04ppm·비소0.1·아플라톡신M1 0.025)를 시험으로 확인하세요.",
        "영유아식에 금지된 감미료·보존료·색소·카페인이 없는지 배합을 점검하세요."
      ]
    };
  }

  if (category === "children_food_marketing") {
    return {
      label: "어린이 대상 식품 광고·판촉 제한",
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

  if (category === "cosmetic_gmp") {
    return {
      label: "화장품 GMP(ISO 22716) 제조소 의무",
      detail:
        "대만은 化粧品優良製造準則(GMP, ISO 22716 기반)을 제조소에 단계적으로 의무화했습니다: 특정용도 2024-07-01, 영유아·립·아이·치약·구강청결제 2025-07-01, 그리고 ⚠️ 일반 화장품 전체 제조소 2026-07-01부터 의무(공장등록 면제 고형비누 제외). 한국 브랜드는 OEM/위탁 제조소가 GMP 적합성 검사 통과(또는 ISO 22716)를 보유했는지 확인해야 하며, 미적합 제조소 제품은 2026-07-01부터 부적합입니다. PIF 등록과는 별개 의무입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제조 위탁처(OEM)가 대만 화장품 GMP 적합성 검사(또는 ISO 22716)를 보유했는지 확인하세요 — 2026-07-01부터 일반 화장품 전체 의무.",
      chips: ["화장품GMP(ISO22716)", "일반 화장품 2026-07-01", "OEM 적합성 확인", "PIF와 별개"],
      actions: ["OEM/위탁 제조소의 대만 화장품 GMP 적합성 검사 통과(또는 ISO 22716) 여부를 확인·확보하세요."]
    };
  }

  if (category === "importer_monitoring_plan") {
    return {
      label: "수입자 식품안전 모니터링 계획 의무 (2026)",
      detail:
        "대만은 특정 식품업자에 식품안전 모니터링 계획·자가검사를 의무화했습니다. 2026-01-01부터 수입자 중 殼蛋(각란)·花生(땅콩) 및 그 제품, 그리고 ⚠️ CCC 세번(품목)이 국경검사에서 2회 불합격한 식품·첨가물의 수입자는 모니터링 계획을 수립하고 매 배치 또는 분기 검사(곰팡이독소·잔류농약·중금속·미생물·수의약품 잔류 등)를 실시하며 기록을 5년 보관해야 합니다. 반복 위반 품목은 재수입 시 검사 부담이 큽니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "땅콩·각란 또는 국경검사 2회 불합격 이력 품목이면 수입자 모니터링 계획·배치 검사 의무(2026-01-01)를 확인하세요.",
      chips: ["수입자 모니터링 계획", "땅콩·각란·2회 불합격", "배치/분기 검사", "2026-01-01"],
      actions: ["해당 품목이면 모니터링 계획을 수립하고 검사 주기·항목·5년 기록 보관을 준비하세요."]
    };
  }

  if (category === "pesticide_border_risk") {
    return {
      label: "고춧가루·고추 — 잔류농약 국경검사 집중(고위험)",
      detail:
        "한국산 고춧가루·고추 분말(番椒屬)은 2025~2026 대만 국경검사에서 잔류농약 위반이 반복돼 반려율이 높고(克美素 chlormequat·陶斯松 chlorpyrifos·2,4-D 등), 일부 한국 업체는 1개월 수입 중단 조치를 받았습니다. 고추 함유 가공식품(고추장·라면 스프 등)도 대상이 될 수 있습니다. 또 2025-03-11 農藥殘留容許量標準 개정으로 2,4-D·Captan이 채소·곡류·차류에서 삭제(사실상 불검출)되고 Prothiofos가 금지 목록에 추가돼, 한국산 차·채소·곡류도 잔류농약 위험이 커졌습니다. 선적 전 대만 농약잔류 허용기준 대비 시험성적서를 반드시 확보하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "고춧가루·고추 함유 제품은 잔류농약 시험성적서를 확보하고 대만 허용기준을 대조하세요 — 국경검사 집중 품목입니다.",
      chips: ["잔류농약 집중검사", "클로르메쿼트·클로르피리포스·2,4-D", "업체 수입중단 사례", "시험성적 필수"],
      actions: ["고추류·고추 함유 제품은 대만 농약잔류 기준 대비 시험성적서를 확보하고, 반복 위반 시 수입중단 위험을 인지하세요."]
    };
  }

  if (category === "fragrance_allergen_labeling") {
    return {
      label: "향료 알레르겐 개별 표시 (시행 예정)",
      detail:
        "대만은 향료 속 특정 알레르겐 성분(Limonene·Linalool·Citral·Coumarin·Geraniol·Eugenol·Benzyl Alcohol·Benzyl Salicylate 등 24종)을 리브온 0.001%·린스오프 0.01% 초과 시 '香料/Fragrance/Parfum'로 뭉뚱그리지 않고 개별 명칭으로 표시하도록 하는 규정을 예고했습니다(2025-01 예고, EU 알레르겐 규칙과 유사, 공고 1년 후 시행 — 2026년경 발효 가능성). ⚠️ 별개로 HICC·아트라놀(Atranol)·클로로아트라놀(Chloroatranol) 3종은 금지 목록에 추가돼 아예 사용 금지입니다(EU 2021 금지와 동일). 향료 알레르겐 함량 자료를 확보하고 이 3종은 제거하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "향료 알레르겐 24종의 함량을 파악하고 개별표시를 대비하세요(2026년경 시행 가능성). HICC·아트라놀·클로로아트라놀은 금지이니 제거하세요.",
      chips: ["향료 알레르겐 24종", "리브온 0.001%/린스오프 0.01%", "HICC·아트라놀 금지", "2026년경 시행"],
      actions: ["향료의 알레르겐 성분·함량 자료를 공급자에게 확보하고, 최종 公告 시행일을 확인해 개별표시를 준비하세요."]
    };
  }

  if (category === "infant_food_tariff") {
    return {
      label: "영유아식 인정 — 세번 분류로 관세 달라짐",
      detail:
        "영유아식으로 '인정'되면 관세 세번(CCC)과 세율이 달라집니다(財政部關務署 GC411 확인, 2026-07): 영유아용 조제품(소매) CCC 1901.10.00.11/90 = 관세 5%(MFN); 일반 조제분유 1901.90.22 = 12%; 원료 전지분유 0402.21 = 10%. 한국은 대만과 FTA가 없어 MFN(Column I)이 적용되므로, 영유아식 인정 시 일반 대비 약 5~7%p 낮은 관세입니다. ⚠️ 1901.10(5%) 조건: ① 조제품(단순 원료 아님), ② 조성상 영유아용, ③ 소매포장. 명칭만으로 안 되며 세관이 조성·라벨·소매형태로 판정합니다. 오분류(일반 분유를 영유아로 신고)는 관세 추징·벌금, 진짜 조제식을 0402 원료분유로 넣으면 분유 관세쿼터(고율)에 걸립니다. 또 영유아 조제식(嬰兒/較大嬰兒/특수의료용 配方)은 수입 전 TFDA 査驗登記 허가가 필요합니다(CNS 6849/13235/15224 기준, ~6개월). 영유아 곡물·이유식(副食品)은 허가 대신 일반 식품 표시·검사. 세번은 稅則預先審核(사전심사)으로 CCC를 확정하는 것을 권장합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "제품이 영유아용(1901.10, 관세 5%)에 해당하는지 조성·소매포장·라벨로 확인하고, 세번은 GC411 조회 또는 稅則預先審核으로 확정하세요. 配方 제품은 TFDA 査驗登記도 필요합니다.",
      chips: ["영유아용 1901.10 = 5%", "일반 조제분유 = 12%", "소매·조성 조건", "조제식은 심사등록"],
      actions: ["영유아식 세번(CCC)을 財政部關務署 GC411로 조회하고, 저관세(1901.10 5%) 적용 조건(조제품·영유아용 조성·소매포장)을 라벨·서류로 충족하세요. 조제식이면 TFDA 査驗登記 허가를 먼저 받으세요."]
    };
  }

  if (category === "inorganic_arsenic") {
    return {
      label: "무기비소 한도·검사 — 한국↔대만 수치 불일치 주의",
      detail:
        "한도(附表一, '무기비소' 기준 mg/kg): 영유아식 원료미 0.1, 백미 0.2, 현미 0.35, 해조 1.0, 어류·수산 0.5. (음용수 0.01·기타곡류 1·식용유 0.1은 '총비소' 기준.) 검사는 수입국(대만)이 국경검사에서 대만 공식법 '食品中無機砷之檢驗方法 MOHWH0034.00'(2023 시행·HPLC-ICP-MS 화학종분석·정량한계 0.02)으로 수행하며, 그 결과가 통관 판정의 법적 기준입니다(한국 사전 성적은 법적 효력 없음, COA 의무 아님·육/수산/란/유가공만 수출국 위생증명 필요). ⚠️ 한국 검사와 대만 재검사 수치가 다른 주요 원인: ① 총비소 vs 무기비소(가장 큼 — 총비소는 무독성 유기비소까지 포함해 크고, 무기비소 비율이 원료마다 달라 58~88%로 환산 불가), ② 추출·화학종분석법 차이(±10~30%), ③ 시료 불균질(쌀은 낟알·로트별 편차 → '여기 합격 저기 불합격'), ④ 측정불확도(0.1 근처 ±15~25% → 실값 0.10이 한 곳 0.09·다른 곳 0.11), ⑤ 시험소·표준물질(CRM)·건량/습량 기준 차이. 정합 방법: '무기비소'(총비소 아님)를 대만 한도 대비 시험 + 대만 공식법(MOHWH0034.00)과 동등한 ISO17025 화학종분석(가능하면 대만 TAF 인정 시험소 사전검사) + 저비소 원료미(백미>현미, 세척·도정으로 저감) + 안전마진(실값 0.06~0.07 목표, 0.09에서 선적 금지) + 로트별 소분시료 검사. ⚠️ 함정: 대만은 '원료미'에만 한도(0.1)를 두고 완제 유아 간식엔 아직 별도 한도가 없어, 완제 반려는 원료미 기준(0.1)을 적용한 것일 수 있으니 실제 반려통지의 적용기준을 확인하세요. (2024 消基會 조사: 한국산 유아 쌀제품 3건 무기비소 0.11/0.15/0.11로 초과.)",
      tone: "gold",
      state: "needs_check",
      uncertainty: "한국 성적과 대만 결과가 다르면 대개 '총비소↔무기비소' 또는 측정불확도 차이입니다. 대만 공식법(무기비소·MOHWH0034.00 동등)으로 실값 0.06~0.07 이하를 목표로 재검사하고, 대만 국경 결과가 법적 기준임을 인지하세요.",
      chips: ["무기비소≠총비소", "대만법 MOHWH0034.00", "불확도 ±20%→마진 0.06~0.07", "대만 국경결과가 기준"],
      actions: [
        "총비소가 아니라 '무기비소'를 대만 공식법(MOHWH0034.00) 동등 ISO17025 화학종분석으로 시험하세요(가능하면 대만 TAF 시험소 사전검사).",
        "측정불확도·시료편차를 감안해 실값 0.06~0.07 mg/kg 이하를 목표로(0.09에서 선적 금지), 저비소 원료미 선택·세척·도정으로 저감하고 로트별 소분시료를 검사하세요.",
        "완제 유아식 반려 시 실제 반려통지가 어느 기준(원료미 0.1)을 적용했는지 확인하세요 — 대만 국경 결과가 통관 판정의 법적 기준입니다."
      ]
    };
  }

  if (category === "food_enzyme") {
    return {
      label: "식품 효소 — 제품별 개별 허가(목록 없음)",
      detail:
        "⚠️ 대만은 식품첨가물 기준에 '酵素(효소)' 포지티브 목록 카테고리가 없습니다(1차 확인: 17개 첨가물 범주에 효소 항목 없음, 가공보조제 기준도 용제 7종만). 즉 브로멜라인·파파인·락타아제·펙티나아제·글루코아밀라아제 등 개별 효소가 '목록 등재'로 확인되지 않고, 효소 제제는 제품·제조사별 査驗登記(개별 허가·규격 심사)로 다뤄집니다. 트랜스글루타미나아제는 대만 등록(Streptomyces mobaraensis 급원)이 확인됩니다. 따라서 특정 효소 제품의 허용 여부는 TFDA 식품첨가물 許可證 DB에서 제품 단위로 확인해야 하며, 생산 급원(균주)·규격 서류를 갖추세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대만엔 효소 포지티브 목록이 없어 '목록 등재'로 확인 불가합니다 — 효소 제품은 제조사·제품별 査驗登記(허가증)로 확인하세요.",
      chips: ["효소 목록 없음", "제품별 査驗登記", "생산 급원 서류", "許可證 DB 확인"],
      actions: ["효소 제품은 TFDA 식품첨가물 許可證 데이터베이스에서 제품·제조사 단위로 허가를 확인하고 생산 급원(균주)·규격 서류를 확보하세요."]
    };
  }

  if (category === "exfoliating_acid_aha") {
    return {
      label: "각질제거 산(AHA/PHA) — 만델릭·락토바이오닉",
      detail:
        "만델릭애씨드(苦杏仁酸)·락토바이오닉애씨드(乳糖酸)는 대만 화장품 제한·금지 목록에 없어 허용입니다(1차 확인). 다만 만델릭은 AHA(α-하이드록시산)라 대만 제한표의 'AHA' 항목 규정을 따릅니다: 총 농도 상한은 없고 pH ≥ 3.5 조건 + 자극·자외선 민감 경고문이 의무입니다(씻어내는 헤어 제품은 AHA ≤3%면 pH 3.2~3.5 허용). 단 AHA ≤10%·pH ≥3.5로 pH 조절 목적으로만 쓰면 경고문 생략 가능합니다. 락토바이오닉은 PHA(AHA 아님)라 이 규정 밖이며 분자가 커 자외선 경고 요건이 완화됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "만델릭 등 AHA 제품은 총 농도 상한이 아니라 pH ≥ 3.5 + 자극·자외선 경고문 요건을 확인하세요(pH 조절용 AHA ≤10%·pH ≥3.5는 경고 생략).",
      chips: ["AHA는 pH≥3.5", "자극·자외선 경고", "총 농도 상한 없음", "PHA는 규정 밖"],
      actions: ["만델릭 등 AHA는 pH ≥ 3.5와 자극·자외선 경고문을 확인하세요(총 % 상한은 없음). 락토바이오닉(PHA)은 완화됩니다."]
    };
  }

  if (category === "cosmetic_general_active") {
    return {
      label: "화장품 일반 성분 — 금지·제한 목록 미등재(허용 추정)",
      detail:
        "대만 화장품은 네거티브 리스트라 금지 성분표(禁止使用成分表)·제한 성분표(成分使用限制表)에 없으면 허용(법정 함량 한도 없음)입니다. 이 성분들(소듐PCA·페룰산·이데베논·아르지렐린(아세틸헥사펩타이드)·에칠아스코빌에터 등)은 검색상 두 목록에서 확인되지 않아 일반 허용으로 추정되나, 최신 化粧品成分使用限制表(2027-10 개정판 포함)에서 정확한 INCI로 재확인하고 제품 통보 등록을 하세요. ⚠️ 미백 표현: 대만은 옛 미백성분 관리규정(2019 폐지)·특정용도 허가제(2024 폐지)가 없어져 '허용 미백성분 목록'이 성분 사용을 막는 게이트는 아닙니다. 13종 미백성분(알부틴 7%·코직산 2%·에칠아스코빌에터=3-O-에틸아스코빅애씨드 2%·트라넥삼산 3% 등)은 '멜라닌 생성 억제(抑制黑色素)' 같은 특정 메커니즘 표현을 쓸 수 있는 실증 부속서입니다. 목록 밖 성분으로 미백을 표방해도 약품은 아니며(일반 '美白/브라이트닝' 표현 가능) 다만 그 메커니즘 문구를 목록 밖 성분에 쓰면 허위·과대광고가 됩니다. 이데베논 등 고용량·의료 효능 표방은 약품 경계라 분류 확인이 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "금지·제한 목록 미등재로 일반 허용 추정이나 최신 목록 확인을 권장합니다. 미백 표방은 허용 미백성분 목록, 고용량·기능성은 약품 경계를 확인하세요.",
      chips: ["네거티브 리스트", "목록 미등재=허용추정", "미백은 허용목록 확인", "최신 제한표 확인"],
      actions: [
        "정확한 INCI로 최신 化粧品成分使用限制表·禁止表(2027 개정 포함)를 확인하고 제품 통보 등록을 하세요.",
        "미백 표방이면 대만 허용 미백성분 목록 등재를, 고용량·효능 표방이면 약품 분류를 확인하세요."
      ]
    };
  }

  if (category === "functional_fiber") {
    return {
      label: "기능성 식이섬유 — 차전자피·글루코만난",
      detail:
        "차전자피(車前子殼, Psyllium husk)는 대만 식품원료로 승인됐고(2024 공고) 일일 섭취 10.2g 한도와 경고문('충분한 물과 함께 섭취하세요, 車前子(질경이) 알레르기가 있으면 섭취하지 마세요')이 필요합니다. 글루코만난/곤약(蒟蒻)은 전통식품으로 널리 쓰이나, 분리·정제 원료이거나 알칼리 가교(cross-linked) 등 비전통 공정 형태는 非傳統性 식품원료 확인이 필요할 수 있고, 곤약젤리(蒟蒻果凍)는 대만의 질식 위험 경고·형태(크기) 규정을 따라야 합니다. 성분의 형태·용도에 맞춰 食品原料 플랫폼 등재·한도·경고를 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "차전자피는 승인(10.2g/일·경고문)이나, 글루코만난은 형태(전통 곤약 vs 분리·가교 원료)에 따라 非傳統性 여부가 달라집니다 — 확인하세요.",
      chips: ["차전자피 승인·10.2g/일", "차전자피 경고문 필수", "곤약젤리 질식경고", "분리·가교는 비전통성"],
      actions: [
        "차전자피는 10.2g/일 한도와 경고문(충분한 물·알레르기 주의)을 라벨에 반영하세요.",
        "글루코만난은 곤약젤리 질식경고·형태 규정을 지키고, 분리·가교 형태면 非傳統性 식품원료 여부를 확인하세요."
      ]
    };
  }

  if (category === "polyglutamic_acid") {
    return {
      label: "폴리글루타믹애씨드(γ-PGA) — 화장품 허용·식품은 용도별",
      detail:
        "화장품: 허용 보습제입니다(대만 금지·제한 성분 목록 미등재 → 법정 함량 한도 없음). 다만 최신 化粧品成分使用限制表(2027-10 개정판 포함)에서 정확한 INCI(Polyglutamic Acid/Sodium Polyglutamate)로 재확인하고 제품 등록(통보)을 하세요. 식품첨가물: 소듐 폴리글루타메이트(聚麩胺酸鈉)는 품질개량·양조·제조용제로 등재·허용이나 식품군별 한도가 있습니다(면류 ≤2%, 베이커리·건두부 ≤0.5%, 계란제품 ≤0.4%, 발효유 ≤0.13%, 분원·어묵·두부·미제품 ≤0.1%, 선초 ≤0.05% — 포지티브 리스트라 미등재 식품엔 사용 불가; 정확 수치는 附表一 확인). ⚠️ 분리된 γ-PGA를 '일반/건강 식품 원료'로 쓰는 경우는 可供食品原料 등재가 확인되지 않아 非傳統性(신소재) 식품원료 사전승인이 필요할 수 있습니다(食品原料整合查詢平臺에서 확인 필요). 칼슘 흡수 등 효능 표방은 健康食品 허가가 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "화장품은 허용(보습제)이나 최신 제한표 확인 권장. 식품은 '첨가물(용도별 한도)'인지 '분리 원료(非傳統性 승인 필요할 수 있음)'인지에 따라 다릅니다 — 식품 용도면 반드시 구분·확인하세요.",
      chips: ["화장품 허용(보습제)", "식품첨가물 용도별 한도", "분리원료는 비전통성 확인", "효능표방=건강식품"],
      actions: [
        "화장품이면 최신 금지·제한표(2027 개정 포함)에 정확한 INCI로 없음을 확인하고 제품 통보 등록을 하세요.",
        "식품 첨가물 용도면 대상 식품이 등재 범주·한도(附表一) 내인지 확인하고, 분리 원료면 食品原料 플랫폼 등재 또는 非傳統性 승인을, 효능 표방이면 健康食品 허가를 확인하세요."
      ]
    };
  }

  if (category === "cosmetic_device_boundary") {
    return {
      label: "화장품 아님 — 의료기기(컬러렌즈·미용기기)",
      detail:
        "일부 K-뷰티 품목은 화장품이 아니라 醫療器材(의료기기)라 화장품·일반 통관이 막힙니다: 컬러/서클렌즈(도수·무도수 모두 의료기기), 마이크로니들·더마롤러, LED마스크·고주파·냉온 미용기기, 특정 치아미백 키트, 의료용 마스크·체온계. 의료기기 허가증(醫療器材許可證 등록)이 대만 책임업자(LRP)를 통해 필요하고 제조사 GMP/QSD·본국 승인·기술문서가 요구됩니다(2등급 심사 ~140일). 애매하면 TFDA 分類分級 사전질의를 하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "컬러렌즈·마이크로니들·LED마스크·치아미백 등은 화장품이 아니라 의료기기 등록(醫療器材許可證)이 필요한지 확인하세요.",
      chips: ["컬러렌즈=의료기기", "미용기기 등록", "대만 LRP 필요", "TFDA 분류질의"],
      actions: ["컬러렌즈·미용기기·치아미백 등은 의료기기 해당 여부를 TFDA에 분류 질의하고, 해당하면 대만 책임업자를 통해 의료기기 허가를 받으세요."]
    };
  }

  if (category === "electrical_bsmi_ncc") {
    return {
      label: "전기 미용기기 — BSMI + 무선은 NCC",
      detail:
        "전기 미용기기(고주파·냉온·LED·헤어기기)와 어댑터·충전기는 BSMI 商品檢驗(안전·EMC) 대상이라 BSMI 검험마크가 없으면 통관 거부됩니다(충전기는 CNS15364 등). 블루투스·와이파이·무선충전 등 무선 기능이 있으면 BSMI와 별도로 NCC 型式認證(전파)이 추가로 필요하며, 없으면 같은 화물이 막힙니다. 대만 신청인을 지정해 BSMI 등록+검험마크를, 무선은 NCC ID를 확보하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "전기 미용기기·충전기는 BSMI 검험마크가 있는지, 무선 기능이 있으면 NCC 型式認證도 받았는지 확인하세요.",
      chips: ["BSMI 검험마크", "무선=NCC 추가", "충전기 포함", "대만 신청인"],
      actions: ["전기 미용기기·충전기는 BSMI 검험마크를 취득하고, 무선 기능이 있으면 NCC 형식인증(전파)을 별도로 받으세요."]
    };
  }

  if (category === "import_document_legalization") {
    return {
      label: "수입서류 인증 — 아포스티유 불가, TECO 영사인증",
      detail:
        "건강식품·특수영양식·정제/캡슐식품·의료기기 등 등록 품목은 自由銷售證明(Free Sale)·위생증명·원산지증명(CoO) 원본에 인증이 필요한데, 대만은 한국과 아포스티유 협약이 없어 한국 아포스티유가 거부되고 주한 타이베이대표부(TECO) 영사인증이 필요합니다. 발급처는 원산지증명=대한상의(KCCI), 식품 위생증명=식약처, 동물성 제품=농림축산검역본부(APQA)입니다. 또 인보이스·라벨·증명서·CoO의 제품명·제조사가 모두 일치해야 하며 불일치는 반려·재검사 사유입니다. 하나의 표준 제품명으로 통일하고 TECO 영사인증을 받으세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "Free Sale·위생·원산지 증명이 TECO 영사인증(아포스티유 아님)을 받았는지, 인보이스·라벨·증명서의 제품명·제조사가 일치하는지 확인하세요.",
      chips: ["아포스티유 불가", "TECO 영사인증", "서류 명칭 일치", "KCCI·식약처·APQA"],
      actions: ["Free Sale·위생·원산지 증명을 주한 TECO 영사인증으로 받고, 모든 서류·라벨의 제품명·제조사를 하나로 통일하세요."]
    };
  }

  if (category === "alcohol_import_regime") {
    return {
      label: "주류 — 재정부 관할(식품법 아님)+주세",
      detail:
        "소주·막걸리·맥주·과실주는 식품안전법이 아니라 재정부 국고서의 菸酒管理法 관할입니다. 별도 菸酒進口業許可執照(수입허가)가 필요하고(한국 브랜드 직접 수입 불가), 제품은 매건 進口酒類查驗(메탄올·SO₂·보존료·색소 검사)을 통과해야 합니다. 메탄올 한도(순알코올): 포도주·브랜디 2,000, 비포도 과실주 4,000, 맥주·곡물·청주·위스키 1,000 mg/L, SO₂ 맥주·곡물주 30mg/L. 라벨은 중문 品名·酒精濃度·원산지·수입자·경고문('飲酒過量,有害健康')이 필수이고 효능표방은 금지입니다. 또 酒稅(맥주 NT$26/L·증류주 NT$2.5/L×도수→소주40%≈NT$100/L·양조주 NT$7/L×도수·재제주 NT$185/L)가 관세·부가세에 더해지니, 소주(증류)·막걸리(양조)·리큐르(재제) 분류를 맞추세요(세액 배수 차이).",
      tone: "gold",
      state: "needs_check",
      uncertainty: "주류는 재정부 菸酒管理法 관할입니다 — 수입허가·매건 酒類查驗(메탄올/SO₂)·주세(도수당)·경고 라벨을 확인하고 식품 등록으로 처리하지 마세요.",
      chips: ["재정부 관할·수입허가", "매건 주류검사", "메탄올/SO₂ 한도", "주세(도수당)"],
      actions: ["주류는 식품이 아니라 菸酒管理法으로 처리하세요 — 菸酒進口業 허가·매건 查驗·경고 라벨·주세(분류별)를 확인하고 메탄올/SO₂를 사전 시험하세요."]
    };
  }

  if (category === "commodity_tax_beverage") {
    return {
      label: "음료 화물세 15% — 관세·부가세와 별개",
      detail:
        "공장제 음료(飲料品)는 관세·부가세 외에 화물세(貨物稅條例 §8)가 붙습니다: 희석 천연 과채주스 8%, 그 외 음료(차·스포츠/에너지·가당·탄산) 15% 종가세. 단 2025-08-05 개정으로 무가당·무감미료 음료와 CNS 기준 100% 순주스는 면제됩니다 — 즉 무가당 차·진짜 100%주스는 0%, 가당 버전은 15%입니다. 가당/감미료 여부·CNS 적합을 문서로 입증해 면제를 받으세요. (냉장고·에어컨·타이어·유류 등도 화물세 대상이라 비식품 수출도 확인 필요.)",
      tone: "gold",
      state: "needs_check",
      uncertainty: "병 음료면 화물세(주스 8%·기타 15%)가 붙는지, 무가당·무감미료·CNS 100%주스 면제(2025)에 해당하는지 확인하세요.",
      chips: ["음료 15%·주스 8%", "무가당 면제(2025)", "CNS 100%주스 면제", "관세·부가세 별개"],
      actions: ["병 음료의 화물세(주스 8%·기타 15%)를 landed cost에 반영하고, 무가당·무감미료·CNS 100%주스면 면제 문서를 준비하세요."]
    };
  }

  if (category === "food_raw_material_eligibility") {
    return {
      label: "식품원료 적격성 — 목록 없으면 식품 아님",
      detail:
        "대만은 어떤 물질이든 식품으로 팔 수 없고, 식품 사용이력이 있거나 안전성평가를 통과한 원료만 허용합니다(포지티브 체계). ① 한약재: 하수오·녹용 등 中藥材는 '식품·의약 공용 목록'(약 215종, 구기자·산약·산사·용안육 등)에 없으면 식품 불가, ② 非傳統性 식품원료(대만 사용이력 25년 미만·신균주·신규 식물·펩타이드)는 사전 안전성 심사·승인 전 판매 불가, ③ 프로바이오틱은 등재 균주만, 식용곤충은 극소수만 허용(귀뚜라미·밀웜 미승인), ④ 효소는 생산 균주까지 식품허용이어야 합니다. 성분마다 食品原料整合查詢平臺에서 중문·영문·학명으로 조회하고 限量·型態·警語를 라벨에 반영하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "성분(특히 식물추출·한약재·신균주·펩타이드)이 대만 食品原料整合查詢平臺에 식품으로 등재됐는지, 한약재면 식약 공용목록에 있는지 확인하세요.",
      chips: ["목록 없으면 불가", "한약재 식약경계", "비전통성 사전승인", "균주·곤충 제한"],
      actions: ["각 성분을 食品原料整合查詢平臺(중문·영문·학명)로 조회하고, 한약재는 식약 공용목록 대조, 미등재 신원료는 非傳統性 승인 신청을 하세요."]
    };
  }

  if (category === "supplement_ingredient_drug") {
    return {
      label: "보충제 성분이 약품 — 멜라토닌·글루코사민 등",
      detail:
        "일부 보충제 성분은 대만서 식품이 아니라 약품이라 식품으로 수입 불가입니다: 멜라토닌(1996~ 약품, 식품 첨가 금지), 글루코사민 '황산염'(지시약품·약국판매) — 단 '염산염/무염' 형태는 식품이나 효능표방 금지, 고용량 단일비타민(식품 역치 초과 시 약품). 홍국(紅麴)은 식품이나 모나콜린K 일일 4.8~15mg·시트리닌(색소<200ppb·원료<5ppm·완제<2ppm) 한도가 있고 초과 시 사실상 약품(로바스타틴)입니다. 수면·관절 제품은 성분 형태를 확인해 재처방하고 치료 표현을 제거하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "멜라토닌·글루코사민 황산염·고용량 비타민은 대만서 약품이라 식품 수입이 막힙니다 — 성분 형태를 확인하세요. 홍국은 모나콜린K·시트리닌 한도를 지키세요.",
      chips: ["멜라토닌=약품", "글루코사민 황산염=약품", "홍국 모나콜린/시트리닌", "고용량 비타민=약품"],
      actions: ["수면·관절 제품의 성분 형태를 확인해(멜라토닌 제거, 글루코사민은 염산염) 재처방하고, 홍국은 모나콜린K 4.8~15mg·시트리닌 한도를 시험하세요."]
    };
  }

  if (category === "cbd_cannabis_ban") {
    return {
      label: "CBD·대마 — 식품 금지",
      detail:
        "CBD·대마 유래 제품은 대만서 식품으로 수입·판매 불가입니다(食安法 §15). 순수 CBD는 의약품으로 규제되고, 헴프씨드 오일은 화장품 원료로만 허용(식품 불가)입니다. THC 10ppm 초과 제품은 마약류로 수입·판매·소지 모두 불법입니다. 식품 SKU에서 CBD를 완전히 제거하고, 헴프씨드 형태는 식품 적격성을 별도 확인하며 THC 성적을 확보하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "CBD·대마 성분은 대만 식품에서 금지입니다 — 식품 SKU에서 제거하고, 헴프씨드 형태는 적격성·THC(10ppm) 성적을 확인하세요.",
      chips: ["CBD 식품금지", "순수CBD=의약품", "헴프씨드오일=화장품만", "THC 10ppm=마약"],
      actions: ["식품에서 CBD·대마 성분을 제거하세요. 헴프씨드 유래는 식품 적격성을 확인하고 THC 10ppm 미만 성적을 확보하세요."]
    };
  }

  if (category === "irradiated_food") {
    return {
      label: "조사식품 — 허용품목+라두라 표시",
      detail:
        "방사선 조사(輻照)는 食品輻射照射處理標準의 허용 품목·선량 내에서만 가능하고, 조사식품은 라두라(radura) 마크와 '輻射照射處理' 표시를 해야 합니다. 허용목록에 없는 식품을 조사하거나 표시를 빠뜨리면 국경검사에서 반려됩니다(한국 향신료·건조식품이 EtO 대신 방사선으로 살균된 경우 해당). 조사 여부·품목 적격성을 확인하고, 조사됐으면 필수 표시를 넣으세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "향신료·건조식품이 방사선 조사됐다면 허용품목인지 확인하고 라두라 마크·'輻射照射處理' 표시를 넣었는지 확인하세요.",
      chips: ["허용품목만 조사", "라두라 마크", "방사선조사처리 표시", "향신료·건조식품"],
      actions: ["방사선 조사된 향신료·건조식품은 허용품목·선량을 확인하고 라두라 마크와 '輻射照射處理' 표시를 넣으세요."]
    };
  }

  if (category === "food_contact_pvc_ban") {
    return {
      label: "PVC 식품포장 금지 + 재생플라스틱 금지",
      detail:
        "대만은 2023-07-01부터 PVC/PVDC 함유 식품 포장의 제조·수입·판매를 전면 금지합니다(한국은 허용). 1차 용기뿐 아니라 PVC 슈링크 슬리브·라벨·병뚜껑 라이너·클링랩만으로도 위반이며 수입자 벌금 NT$6만~30만. 또 재생 플라스틱을 식품 직접접촉에 재사용하는 것은 원칙적으로 금지이며(食品器具容器包裝衛生標準 §2), rPET만 TFDA가 탈오염 공정을 사전 승인한 경우에 한해 허용됩니다(한국·EU 인증만으론 불가). 팩 전체(라벨·개스킷·윈도우필름)를 PE/PET/PP로 교체하고 무-PVC 공급자 선언을 확보하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "포장 전체(슬리브·라벨·뚜껑 라이너·클링랩)에 PVC/PVDC가 없는지, 재생 플라스틱을 식품접촉에 쓰는지 확인하세요 — 대만은 PVC 식품포장을 전면 금지합니다.",
      chips: ["PVC 포장 전면금지", "슬리브·뚜껑라이너 포함", "재생플라스틱 금지", "rPET는 TFDA 승인만"],
      actions: ["포장 전체를 PVC/PVDC-free(PE/PET/PP)로 교체하고 공급자 선언을 확보하세요. 재생 플라스틱 식품접촉은 금지(rPET만 TFDA 사전승인 시)."]
    };
  }

  if (category === "food_contact_migration") {
    return {
      label: "용기 용출시험 — 한국 합격≠대만",
      detail:
        "식품 용기·포장의 용출시험(溶出試驗)은 대만 고유의 시뮬런트(물·4% 아세트산·n-헵탄·20% 에탄올)와 온도(선언 耐熱溫度 기준)로 증발잔사·과망간산칼륨 소비량·중금속·단량체(VCM·스티렌·카프로락탐)를 봅니다. 한국 KFDA 프로토콜 합격 성적이 대만 증발잔사·KMnO4 한도(특히 유지성·고온충전 식품의 헵탄 시험)에서 실패할 수 있습니다. 멜라민 식기는 고온(~95℃)에서 포름알데히드·페놀 음성+멜라민 이행을 봐야 하고(뜨거운 국물용이 실패), 도자기·법랑은 납·카드뮴 용출, 인쇄잉크는 광개시제·1차방향족아민(PAA)·광유(MOAH) 이행이 문제됩니다. 실제 식품(유지→헵탄, 산성→아세트산)과 耐熱溫度에 맞춰 대만 인정 시험소에서 재시험하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "용기·포장은 한국 KFDA 용출 성적이 아니라 대만 방법(시뮬런트·온도·증발잔사·KMnO4·단량체)으로 재시험이 필요합니다. 멜라민 식기는 고온 시험, 도자기는 Pb/Cd 용출을 확인하세요.",
      chips: ["대만 용출 재시험", "KFDA 성적 불가", "멜라민 고온시험", "도자기 Pb/Cd"],
      actions: ["실제 식품·耐熱溫度에 맞춰 대만 인정 시험소에서 용출시험을 재실시하세요(멜라민=고온 포름알데히드/멜라민, 도자기=Pb/Cd 용출)."]
    };
  }

  if (category === "infant_article_material") {
    return {
      label: "젖병·유아용기 — BPA·프탈레이트 전면금지",
      detail:
        "대만은 영유아 젖병(嬰幼兒奶瓶)에 BPA 함유 플라스틱(PC)을 금지하고(§5), 3세 미만 아동용 식품용기에는 DEHP·DNOP·DBP·BBP 프탈레이트를 아예 함유할 수 없습니다(§4). 이는 젖병뿐 아니라 빨대컵·이유식기·이유수저·치발기까지 미치며, PP 젖병이라도 연질 PVC/프탈레이트 스파우트나 인쇄 장식이 있으면 §4 위반입니다. PC-free(PP/PPSU/실리콘/유리) 젖병을 쓰고, 연질부·밸브·잉크까지 4대 프탈레이트 무함유를 인증하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "3세 미만 용기·젖병은 BPA와 4대 프탈레이트(DEHP·DNOP·DBP·BBP)를 연질부·밸브·잉크까지 무함유로 인증했는지 확인하세요.",
      chips: ["젖병 BPA 금지", "3세미만 프탈레이트 금지", "빨대컵·치발기 포함", "연질부·잉크까지"],
      actions: ["PC-free(PP/PPSU/실리콘/유리) 젖병 + 3세미만 용기 전체(연질부·밸브·잉크)의 BPA·4대 프탈레이트 무함유 인증을 확보하세요."]
    };
  }

  if (category === "food_contact_labeling") {
    return {
      label: "용기 자체표시 + 국경검사(F코드)",
      detail:
        "식품 용기·포장은 라벨과 별개로 그 용기 자체에 중문으로 品名·材質名稱(재질)·耐熱溫度(내열온도)·용량·수입자정보·원산지·사용주의(1회용/반복사용·전자레인지 경고)를 표시해야 하고(食安法 §26, 2017-07-01~), 재질 미표시는 재질 자체가 적합해도 통관 보류 사유입니다. 塑膠材質回收辨識碼(재활용 삼각기호 1~7)도 표시해야 하며 한국 분리배출 마크는 인정 안 됩니다. 또 용기·포장은 무료통관이 아니라 국경검사(報驗) 대상이고, 2026-04-01 F01/F02 수입관리 코드 개정으로 이전에 통과되던 CCC가 검사로 편입됐을 수 있으니 현행 F코드 분류를 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "용기 자체에 중문 材質·耐熱溫度·재활용코드가 표시됐는지, 2026-04 F코드 개정 후 국경검사 대상인지 확인하세요.",
      chips: ["용기 재질·내열온도 표시", "재활용코드(한국마크 불가)", "국경검사 대상", "F코드 2026-04 개정"],
      actions: ["용기 자체에 중문 材質·耐熱溫度·재활용코드(1~7)를 표시하고, 2026-04 개정 후 F코드 국경검사 분류를 확인하세요."]
    };
  }

  if (category === "vet_drug_residue") {
    return {
      label: "양식 동물용의약품 — 불검출(제로톨러런스)",
      detail:
        "양식 수산물의 니트로푸란(硝基呋喃 대사물 AOZ/AMOZ/AHD/SEM)·클로람페니콜(氯黴素)·말라카이트그린(孔雀綠)은 금지물질로 검출 자체가 반려입니다(약 0.5ppb 수준 스크리닝). 한국 새우·장어·틸라피아·어묵 수출에서 실제 반려가 잦은 고빈도 항목입니다. 선적 전 공인시험소에서 니트로푸란 대사물·CAP·말라카이트/류코말라카이트그린 성적을 확보하고 양식 공급망을 관리하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "양식 수산물(새우·장어·어묵 등)은 니트로푸란·클로람페니콜·말라카이트그린 불검출 성적을 선적 전 확보하세요 — 검출=반려입니다.",
      chips: ["니트로푸란 불검출", "클로람페니콜 불검출", "말라카이트그린 불검출", "양식 고빈도 반려"],
      actions: ["양식 수산물은 니트로푸란 대사물·CAP·말라카이트그린을 공인시험소에서 불검출로 확인하고 공급망을 관리하세요."]
    };
  }

  if (category === "industrial_dye_adulterant") {
    return {
      label: "공업용 색소·부정색소 — 비허용(즉시 반려)",
      detail:
        "대만은 과거 스캔들로 공업용 색소를 집중검사합니다: 蘇丹紅(수단레드 I~IV, 고춧가루·커리·파프리카·향신료 — 2024년 스캔들로 검출 시 즉시 수입중단), 二甲基黃/皂黃(디메틸옐로·오라민, 두부·두류), 로다민B(玫瑰紅B), 말라카이트그린, 銅葉綠素(구리엽록소 — 검·다시마·잼엔 허용이나 식용유엔 절대 금지, 2013 유지 스캔들). 모두 비허용 첨가물이라 검출=반려. 고춧가루·커리·강황 함유 로트는 수단레드·로다민B를, 참기름·식용유는 구리엽록소를, 황·적색 두부/절임은 디메틸옐로를 사전 시험하고 원료 COA를 요구하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "고춧가루·커리·향신료는 수단레드, 식용유는 구리엽록소, 색깔 있는 두부/절임은 공업염료 검출 여부를 사전 시험하세요 — 검출=즉시 반려.",
      chips: ["수단레드 즉시 수입중단", "구리엽록소(오일 금지)", "디메틸옐로(두부)", "검출=반려"],
      actions: ["고춧가루·커리 로트는 수단레드 I~IV·로다민B, 식용유는 구리엽록소, 색소 두부/절임은 디메틸옐로를 사전 시험하고 원료 COA를 확보하세요."]
    };
  }

  if (category === "plasticizer_food") {
    return {
      label: "가소제(DEHP) — 음료·젤리·보충제 집중검사",
      detail:
        "2011년 起雲劑(기운제) DEHP 사태로 대만은 식품 중 프탈레이트 가소제(DEHP·DINP·DBP·BBP·DIDP)를 상시 감시합니다. 특히 스포츠음료·과일음료/주스·차음료·잼/젤리/시럽·정제/캡슐/분말 보충제 5개 범주와 플라스틱 포장·튜빙에서의 이행이 대상이라, 한국 병음료·젤리컵·스포츠음료·건강보충제가 정확히 표적 매트릭스입니다. DEHP/DINP-free 기운제·유화제를 쓰고, 플라스틱 접촉재(PET·개스킷·튜빙)의 프탈레이트 이행을 점검하며 공급자 선언을 보관하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "음료·젤리·시럽·보충제는 DEHP/DINP 등 가소제 오염·포장 이행을 점검하세요 — 대만은 2011 스캔들 이후 이 5개 범주를 집중검사합니다.",
      chips: ["DEHP 가소제", "음료·젤리·보충제 표적", "포장 이행 점검", "기운제 사태"],
      actions: ["음료·젤리·시럽·보충제는 DEHP/DINP-free 원료를 쓰고 플라스틱 접촉재의 프탈레이트 이행을 시험하세요."]
    };
  }

  if (category === "illegal_processing_agent") {
    return {
      label: "불법 가공제 — 마레인산 전분·붕사·표백제",
      detail:
        "대만이 스캔들 이후 집중검사하는 불법 가공제: 順丁烯二酸(마레인산/무수물, 2013 毒澱粉 사태 — 쫄깃한 화공전분에 불법, 타피오카펄·쫄면·모찌·떡에서 검사), 硼砂/硼酸(붕사·붕산 — 떡·어묵·면·완자 식감용으로 오래 금지, 한국 떡·어묵·당면 직결), 雙氧水(과산화수소 잔류 — 건조식품·두부/두피·면·어묵)·吊白塊(론갈리트/포름알데히드 표백 — 米粉·당면·건해산물). 모두 금지물질로 검출=반려입니다. 떡·어묵·면·전분·두부 제품은 마레인산·붕사·과산화수소·포름알데히드를 사전 시험하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "떡·어묵·면·전분·모찌·두부는 마레인산(화공전분)·붕사·과산화수소·론갈리트(표백) 검출 여부를 사전 시험하세요 — 모두 금지, 검출=반려.",
      chips: ["마레인산 전분", "붕사(떡·어묵)", "과산화수소 표백", "론갈리트 포름알데히드"],
      actions: ["떡·어묵·면·전분·두부 제품은 붕사·마레인산·과산화수소·론갈리트를 쓰지 말고 사전 시험으로 불검출을 확인하세요."]
    };
  }

  if (category === "additive_food_restriction") {
    return {
      label: "첨가물 특정식품 사용금지(착색제·아질산염)",
      detail:
        "허용된 첨가물도 특정 식품에는 금지입니다. 착색제(著色劑)는 등재돼 있어도 생선·생고기·생선패류·생과채·두류·미소·간장·다시마·김·차·면류에는 사용 금지입니다(附表一 제9류 비고 — 신선도·품질 위장 방지). 아질산염(亞硝酸鹽)은 육/어육 제품에만, 잔류 NO₂ ≤0.07 g/kg이며 생선육·생고기·생선알에는 금지입니다. 인산염은 총 인산염 ≤3 g/kg(품질개량제+결착제 합산)입니다. 면·차·절임채소·두부 제품은 착색제 사용가능 여부를, 절임육은 아질산 잔류·생물 사용금지를 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "면·차·두류·간장·해조·생선/생고기에 착색제를 썼는지, 절임육에 아질산염 잔류(≤0.07)·생물 사용금지를 지켰는지 확인하세요.",
      chips: ["착색제 면·차·생선 금지", "아질산 생물 금지·NO₂ 0.07", "인산염 총 3g/kg", "제9류 비고"],
      actions: ["착색제가 금지된 식품(면·차·두류·간장·해조·생선/생고기)인지 확인하고, 아질산은 육·어육에만·잔류 0.07 이하로 관리하세요."]
    };
  }

  if (category === "additive_combined_limit") {
    return {
      label: "첨가물 합산한도·이행·특정명 표시",
      detail:
        "개별 한도를 지켜도 합산에서 위반될 수 있습니다: 같은 식품에 방부제(또는 감미료·산화방지제)를 2종 이상 쓰면 각 (사용량÷한도)의 합이 1을 넘으면 안 됩니다(Σ≤1). 또 복합원료(소스베이스·조미분·수입페이스트)를 통해 들어온 첨가물도 완제품 범주 한도에 합산되고 그 식품에 허용돼야 합니다(帶入/carry-over 원칙). 표시도 지정 범주(감미료·방부제·산화방지제·착색제·표백제 등)는 '유화제'처럼 기능명만 쓰면 안 되고 '甜味劑(阿斯巴甜)'처럼 기능+구체 물질명을 병기해야 합니다. 방부제·감미료 블렌드의 비율합을 계산하고, 하위원료 첨가물 신고를 받아 합산하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "방부제·감미료를 2종 이상 쓰면 Σ(사용량/한도)≤1인지, 복합원료로 들어온 첨가물을 합산했는지, 지정 범주를 구체 물질명으로 표시했는지 확인하세요.",
      chips: ["합산 Σ≤1", "carry-over 합산", "기능+물질명 표시", "복합원료 신고"],
      actions: ["방부제·감미료·산화방지제 블렌드의 비율합(≤1)을 계산하고, 하위원료 첨가물을 완제 한도에 합산하며, 지정 범주는 '기능(물질명)'으로 표시하세요."]
    };
  }

  if (category === "net_content_metrology") {
    return {
      label: "정량표시·고형량·허용오차(계량)",
      detail:
        "정량포장 상품은 순함량(淨含量)을 법정단위로 표시하고, 표시량과 실제량의 오차가 표준검험국(BSMI) 공고 允差(허용오차) 내여야 합니다(度量衡法). 고형물이 액체에 담긴 제품(통조림콩·단팥죽 등)은 내용량(淨重)과 별도로 고형량(固形量, drained weight)을 함께 표시해야 합니다. EU '℮' 마크는 대만에서 법적 효력이 없으니 의존하지 말고 BSMI 允差를 직접 준수하세요. 충전 목표를 平均·개별 모두 음의 허용오차 내로 맞추고, 안 녹는 고형물 제품엔 고형량을 표시하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "순중량 표시가 BSMI 允差 내인지, 고형물 제품에 고형량(drained weight)을 별도 표시했는지 확인하세요(EU ℮ 마크는 무효).",
      chips: ["순함량·허용오차(BSMI)", "고형량 별도표시", "℮ 마크 무효", "음의 허용오차"],
      actions: ["순함량을 BSMI 允差 내로 충전·표시하고, 고형물+액체 제품은 고형량(drained weight)을 별도 표시하세요."]
    };
  }

  if (category === "nutrient_content_claim") {
    return {
      label: "영양강조표시(저지방/무설탕 등)·경고문구",
      detail:
        "低脂/무지방·高鈣·無糖·低鈉 같은 영양강조표시는 정해진 수치 기준을 충족해야 씁니다(包裝食品營養宣稱): 예로 低鈉 ≤120 mg Na/100 g(고체), 低糖 ≤5 g/100 g, 無糖 ≤0.5 g/100 g(mL)이며 고체/액체 기준을 일관되게 써야 합니다. 미충족 표시는 허위표시입니다. 또 아스파탐 함유 식품은 '페닐케톤뇨증 환자 부적합·페닐알라닌 함유' 중문 경고를, 폴리올(당알코올) 제품은 과량섭취 완사(설사) 주의를 표시해야 합니다. 각 강조표시를 실측치로 검증하고 필수 경고문을 넣으세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "低脂/無糖/低鈉 등 강조표시가 대만 수치 기준을 충족하는지 실측으로 확인하고, 아스파탐 PKU 경고·폴리올 완사 주의를 표시했는지 확인하세요.",
      chips: ["강조표시 수치기준", "무설탕 0.5g·저나트륨 120mg", "아스파탐 PKU 경고", "폴리올 완사 주의"],
      actions: ["低脂/無糖/低鈉 등은 대만 기준 수치를 실측으로 충족하고, 아스파탐 함유엔 PKU 경고, 폴리올엔 완사 주의 문구를 넣으세요."]
    };
  }

  if (category === "cosmetic_drug_boundary") {
    return {
      label: "화장품/약품 경계 — 이 성분은 대만서 약품",
      detail:
        "일부 K-뷰티 기능성 성분은 대만에서 화장품이 아니라 藥品(약품, 藥事法)으로 규제돼 화장품 등록이 무효이고 통관이 막힙니다: 하이드로퀴논(미백약), 트레티노인/레티노산, 미녹시딜(생발), 케토코나졸(비듬약), 벤조일퍼옥사이드·아다팔렌(여드름약), 화장품 상한을 넘는 고농도 살리실산. 대만의 미백 실증 성분(알부틴·코직산·에칠아스코빌에터·아스코르빌글루코사이드·트라넥삼산 등 13종, 나이아신아마이드는 미포함)은 특정 메커니즘 표현용 목록일 뿐이며, 목록 밖 성분으로 미백을 표방해도 약품이 되지는 않습니다(위 하이드로퀴논 등 자체가 약품인 성분과 구분). 등록 전 성분을 화장품 성분제한표와 대조하고, 약품 성분은 제거·재처방하거나 애매하면 TFDA 分類分級 질의를 하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "하이드로퀴논·트레티노인·미녹시딜·케토코나졸·벤조일퍼옥사이드 등은 대만서 약품이라 화장품 등록이 무효입니다 — 성분제한표와 대조하세요.",
      chips: ["하이드로퀴논=약품", "미녹시딜(생발)=약품", "여드름약 성분", "화장품 등록 무효"],
      actions: ["성분을 대만 화장품 성분제한·금지표와 대조하고, 약품 규제 성분(하이드로퀴논·트레티노인·미녹시딜 등)은 제거하거나 약품 등록으로 라우팅하세요."]
    };
  }

  if (category === "cosmetic_microbiology") {
    return {
      label: "화장품 미생물·중금속 한도(PIF 필수데이터)",
      detail:
        "화장품 PIF는 완제품 미생물·중금속 데이터가 없으면 미완성입니다. 미생물 한도: 눈가·3세 미만·영유아·점막 제품 총균 ≤100 CFU/g(mL), 일반 제품 ≤1,000, 그리고 황색포도상구균·녹농균·칸디다알비칸스(및 대장균)는 불검출이어야 합니다. 중금속 불순물은 기술상 불가피한 범위로만 허용: 납 ≤10, 비소 ≤3, 수은 ≤1, 카드뮴 ≤5 ppm이며 색조(마이카·산화철·안료 로트)가 자주 초과합니다. 완제품 미생물·방부력(챌린지) 시험과 안료 로트별 중금속 CoA를 PIF에 넣으세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "화장품 PIF에 완제품 미생물(눈가/영유아 100·일반 1000·병원균 불검출)과 중금속(Pb10·As3·Hg1·Cd5) 데이터가 있는지, 색조는 로트별 CoA가 있는지 확인하세요.",
      chips: ["미생물 눈가100·일반1000", "병원균 불검출", "중금속 Pb10/As3/Hg1/Cd5", "안료 로트 CoA"],
      actions: ["완제품 미생물·방부력 시험과 안료 로트별 중금속 CoA를 PIF에 포함하세요(눈가·영유아 제품은 총균 100 이하)."]
    };
  }

  if (category === "cosmetic_claim_medical") {
    return {
      label: "화장품 표현 — 의료효능·과대 금지 + 안전평가",
      detail:
        "대만 認定準則은 화장품의 의료효능·허위과대 표현을 금지합니다. K-뷰티 카피의 지뢰: 幹細胞(줄기세포)·EGF·生髮(발모=약품)·藥用/醫美/美容醫學·換膚·治療/消炎/殺菌·排毒·before/after 대비사진·미백을 치료로 표현. 外泌體(엑소좀)은 TFDA가 INCI 명명+과대광고를 단속 중입니다(100+ 제품 처분). 또 PIF 안전성평가는 자격 있는 안전평가사(의·약·독성·화장품 전공+인정 교육) 서명이 있어야 유효하고, 완제품·성분 동물시험은 2019-11-09부터 금지입니다. 모든 대만 카피를 認定準則으로 걸러 의료동사를 제거하고, 엑소좀 INCI 표기를 바로잡으세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "화장품 표현에 幹細胞·EGF·生髮·治療·엑소좀(과대) 등이 있는지, PIF 안전성평가가 자격 평가사 서명인지, 동물시험 데이터에 의존하는지 확인하세요.",
      chips: ["의료효능·과대 금지", "엑소좀 단속", "안전평가사 자격 서명", "동물시험 금지"],
      actions: ["대만 카피를 認定準則으로 검토해 의료·과대 표현(줄기세포·EGF·생발·치료·엑소좀 과대)을 제거하고, PIF는 자격 안전평가사 서명으로 완성하세요."]
    };
  }

  if (category === "cosmetic_ingredient_2027") {
    return {
      label: "화장품 성분제한 2027 개정 + 구강케어 불소",
      detail:
        "2025-11-06 공고로 화장품 성분제한표가 2027-10-01부터 확대됩니다(제한 186→219종). K-뷰티 주요 영향: 레티놀/레티닐에스터 리브온 바디 ≤0.05% RE·기타 ≤0.3% RE(+'비타민A 함유' 경고), 알파-알부틴 얼굴 ≤2%·바디 ≤0.5%(하이드로퀴논 불순물 ≤20ppm), 코직산 얼굴·손만 ≤1%. 또 치약·구강청결제가 화장품으로 편입됐고(2025-07~), 구강케어 불소 상한이 2027-10-01부터 ≤0.15%(F)로 강화되며 초과 시 약품입니다. 2027-09-30까지 초과 처방을 재조성하고 불순물 규격·경고를 추가하세요(기존 재고는 소진 가능).",
      tone: "gold",
      state: "needs_check",
      uncertainty: "레티놀·알부틴·코직산 함량이 2027-10 개정 상한 내인지, 구강케어 불소가 0.15% 이하인지 확인하고 2027-09-30까지 재조성 계획을 세우세요.",
      chips: ["2027-10 제한 확대", "레티놀·알부틴·코직산 상한", "구강 불소 0.15%", "재고 소진 가능"],
      actions: ["레티놀·알부틴·코직산 함량을 2027 상한으로 맞추고 불순물 규격·경고를 추가하며, 구강케어 불소는 0.15% 이하로 관리하세요."]
    };
  }

  if (category === "ethylene_oxide_ban") {
    return {
      label: "에틸렌옥사이드(EtO) — 조미료·건조식품 불검출",
      detail:
        "에틸렌옥사이드(環氧乙烷)는 대만에서 식품에 사실상 '불검출'(비허용) 기준입니다. 한국 라면 스프·향신료·건조 조미료에서 살균 잔류로 검출돼 대량 반려·폐기된 실제 사례가 많습니다(농심 신라면·조미분말 등). 스프(조미료)는 면과 별도로 시험하고, 원료·완제 로트별 EtO-free 시험성적(2-클로로에탄올 포함)을 확보하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "건조 조미료·향신료·검류 함유 제품은 에틸렌옥사이드(및 2-클로로에탄올) 불검출 시험성적을 로트별로 확보하세요 — 대만은 불검출 기준입니다.",
      chips: ["EtO 불검출", "라면 스프 별도 시험", "농심 등 반려 전례", "2-클로로에탄올 포함"],
      actions: ["조미료·향신료·건조 원료의 에틸렌옥사이드 살균 여부를 확인하고 로트별 불검출 성적을 확보하세요(스프는 면과 별도 시험)."]
    };
  }

  if (category === "pesticide_non_detect") {
    return {
      label: "잔류농약 — 대만 미등재는 '불검출'(한국 PLS와 다름)",
      detail:
        "한국은 미설정 농약을 기본 0.01ppm(PLS)로 허용하지만 대만은 그런 기본값이 없어, 농약×작물 조합이 대만 허용기준(農藥殘留容許量標準)에 없으면 '不得檢出(불검출)'입니다. 한국에서 0.008ppm으로 합격한 것이 대만에서 불법이 될 수 있습니다(대만은 Codex·한국 MRL을 자동 채택하지 않음). 성분·작물별로 대만 MRL 존재를 확인하고, 없으면 검출한계(LOQ) 미만으로 관리하며 附表四 금지목록도 확인하세요.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "사용 농약×작물이 대만 허용기준에 등재됐는지 확인하세요 — 미등재면 '불검출'이라 한국 PLS 합격과 무관하게 반려됩니다.",
      chips: ["미등재=불검출", "PLS 기본값 없음", "Codex 자동채택 안함", "성분×작물별 확인"],
      actions: ["성분·작물별 대만 MRL 등재 여부를 확인하고, 미등재면 검출한계 미만으로 관리하세요(한국 PLS 0.01 합격은 대만서 무효)."]
    };
  }

  if (category === "inspection_escalation") {
    return {
      label: "국경검사 상향·해제 — 1회 불합격의 파급",
      detail:
        "대만 국경검사는 고정이 아니라 일반 2~10% → 강화 20~50% → 매건 100%로 오릅니다. 상향은 '원산지+CCC 품목코드' 기준이라 같은 한국 HS코드의 타사 불합격도 내 품목을 끌어올립니다. 해제는 1회 합격이 아니라 연속 5배치+누적수량 3배 이상이 필요하고, 複驗(재검사)은 15일 내 같은 시험소·같은 보관시료로 단 1회뿐이라 방법·불확도로 인한 실패는 재현됩니다. 신규 수입자는 무결점 이력 크레딧이 0이라 초기 실패가 완충 없이 상향됩니다 — 예방이 유일한 해법입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "이미 강화·매건 검사로 오른 CCC 품목인지 확인하고, 불합격 시 5배치·수량 3배 해제 요건과 複驗 1회 제약을 인지하세요.",
      chips: ["1회 실패→100%", "원산지+CCC 단위", "해제=5배치·3배량", "재검사 1회뿐"],
      actions: ["CCC 품목코드를 위험 단위로 보고 선적 전 강하게 사전검사하세요. 불합격 시 해제는 연속 5배치·수량 3배가 필요하니 예방에 집중하세요."]
    };
  }

  if (category === "seafood_heavy_metal") {
    return {
      label: "수산물 중금속 — 대만이 한국보다 엄격",
      detail:
        "수산은 대만이 한국보다 엄격합니다: 두족류(오징어·문어) 납 0.3(한국 2.0의 약 1/6), 일반 어류 카드뮴 0.05(한국 0.1). 반면 쌀 카드뮴은 대만 0.4로 오히려 느슨하니 '대만이 모든 것에 엄격'은 틀립니다. 또 중금속 기준은 시료 기준이 달라(버섯=건조중량, 해조=습중량) 환산을 맞춰야 하고(신선버섯 카드뮴 0.3이 건조환산 시 3 초과 가능), 김·미역 외 모든 조류(藻類)도 대만은 카드뮴·납 1.0으로 규제합니다. 오징어·문어 스낵은 내장 제거 후 납 0.3 이하로 관리하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "오징어·문어(납 0.3)·일반 어류(카드뮴 0.05)는 한국보다 엄격합니다. 버섯(건조)·해조(습중량) 기준 환산과 조류 catch-all(1.0)을 확인하세요.",
      chips: ["두족류 납 0.3", "어류 Cd 0.05", "쌀 Cd는 느슨(0.4)", "건조/습중량 환산"],
      actions: ["오징어·문어는 내장 제거·납 0.3 이하, 일반 어류는 카드뮴 0.05 이하로 시험하고, 버섯(건조)·해조(습중량) 기준 환산을 맞추세요."]
    };
  }

  if (category === "microbiology_standard") {
    return {
      label: "미생물 기준(2021) — 대장균군 아닌 E.coli",
      detail:
        "대만은 2021년 기준으로 대장균군(coliform) 대신 E.coli(MPN)·장내세균(Enterobacteriaceae)을 봅니다 — 한국의 대장균군 성적서는 잘못된 시험입니다. MPN은 평판 CFU와 수치가 다르고(m=10), 병원균은 n=5(영유아 n=10)·c=0이라 한 검체만 초과해도 로트 불합격이므로 단일 혼합시료 성적으로는 안 됩니다. 신선 즉석섭취(생과채·생선회 등)의 리스테리아는 '25g 불검출'이며, 가공 RTE의 100 CFU/g 완화는 pH≤4.4 또는 aw≤0.92 입증 시에만 적용됩니다. E.coli(MPN)·장내세균으로 품목 기준에 맞게, 5개 이상 개별 검체로 재시험하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대장균군이 아니라 E.coli(MPN)·장내세균으로, 병원균은 5개(영유아 10개) 개별 검체·c=0으로 시험했는지 확인하세요. 생 RTE 리스테리아는 25g 불검출입니다.",
      chips: ["E.coli(MPN)≠대장균군", "n=5·c=0", "생RTE 리스테리아 25g", "혼합시료 불가"],
      actions: ["대만 2021 미생물 기준(E.coli MPN·장내세균)으로 품목별 재시험하고, 병원균은 개별 5검체(영유아 10)·c=0으로 시험하세요."]
    };
  }

  if (category === "tariff_rate_quota") {
    return {
      label: "관세할당(TRQ) — 쿼터 초과 시 징벌관세",
      detail:
        "분유·유제품(0402)·쌀·닭고기·마늘·땅콩·설탕·굴·녹용 등 약 16~24개 농수산 품목은 관세할당(關稅配額)이라 쿼터 내는 보통 세율, 쿼터 밖은 징벌적입니다(예: 액상우유 쿼터내 15% vs 쿼터밖 NT$15.6/kg + 특별세이프가드 최대 +33%). 쿼터 배정 없이 도착하면 쿼터밖 세율이 적용됩니다. CCC가 TRQ 대상인지 확인하고 쿼터 배정(일부는 대만은행 경유)을 선적 전 확보하며, 연중 SSG(특별긴급관세) 발동 물량을 주시하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "분유·쌀·닭·마늘·땅콩·설탕 등이면 관세할당(TRQ) 여부와 쿼터 배정을 선적 전에 확인하세요 — 쿼터 밖은 징벌관세입니다.",
      chips: ["관세할당(TRQ)", "쿼터밖=징벌관세", "분유·쌀·닭·마늘·땅콩", "선적 전 배정"],
      actions: ["CCC가 TRQ 대상인지 확인하고 쿼터 배정을 선적 전 확보하세요(쿼터 밖 도착 시 NT$/kg 고율+세이프가드)."]
    };
  }

  if (category === "customs_valuation") {
    return {
      label: "완세가격 — 로열티·상표료·assist는 CIF에 가산",
      detail:
        "관세법 §29상 완세가격(CIF 기준)에는 구매자 부담 수수료·포장비·assist(무상/저가 제공한 자재·금형·디자인)·판매조건인 로열티/상표사용료가 포함됩니다. 한국 브랜드가 상품은 저가로 송장하고 상표 로열티를 별도 청구하면 세관이 가산 재평가해 추징+부가세+벌금이 발생합니다. 로열티·assist 구조를 신고하고 완세가격 사전심사(預先審核)를 권장합니다. 또 특수관계사 저가거래는 거래가격이 부인되고 연역·산정가격으로 재평가될 수 있습니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "상표 로열티·무상 제공(assist)·특수관계 거래가 있으면 완세가격에 가산 대상인지 확인하세요 — 저가 송장+별도 로열티는 추징 위험입니다.",
      chips: ["로열티·상표료 가산", "assist 가산", "저가송장 추징", "특수관계 재평가"],
      actions: ["로열티·assist·특수관계 가격 구조를 신고하고, 애매하면 완세가격 사전심사(預先審核)로 확정하세요."]
    };
  }

  if (category === "origin_marking_fraud") {
    return {
      label: "원산지 표시·세탁 — 3배 벌금·몰수",
      detail:
        "한국 표시 상품이 실제로 제3국(예: 중국) 원산이거나 한국에서 실질적 변형이 없으면, 세관은 특혜를 부인하고 허위 원산지로 처벌합니다(海關緝私條例 최대 화물가 3배 벌금·몰수, 貿易法 §28 최대 NT$300만·수출입 1년 정지). 원료가 외국산이면 한국에서 실질적 변형(substantial transformation)을 충족해야 '한국산'이며, 원산지 근거(BOM·공정·제분/가공 증명)를 보관해야 합니다.",
      tone: "red",
      state: "restricted_risk",
      uncertainty: "외국산 원료를 쓰면 한국에서 실질적 변형을 충족하는지 확인하고 원산지 근거를 보관하세요 — 허위 원산지는 3배 벌금·몰수입니다.",
      chips: ["원산지 세탁 처벌", "3배 벌금·몰수", "실질적 변형 요건", "무역법 §28"],
      actions: ["원료가 외국산이면 한국 실질변형 충족을 확인하고 원산지 근거(BOM·공정·증명)를 보관하세요."]
    };
  }

  if (category === "tariff_classification_duty") {
    return {
      label: "세번 분류가 관세를 좌우 — 한국은 MFN(1란)",
      detail:
        "한국은 대만과 FTA가 없어 항상 1란(MFN) 세율입니다(2·3란 아님 — 브로커가 FTA율을 견적하면 무효, 추징 위험). 세번 선택으로 관세가 크게 달라집니다: 초콜릿(1806) vs 당과(1704), 보충제(2106) vs 의약품(30류), 화장품(3304) vs 의약외품, 꿀(0409) vs 시럽, 차(0902 vs 추출 2101 vs RTD 2202), 추출물 vs 완제. 또 관세 외에 무역진흥비 0.04%·부가세 5%(CIF+관세 기준)가 붙습니다. 오분류는 추징·벌금이니, 애매하면 稅則預先審核(사전심사, 약 30일·구속력)으로 CCC를 확정하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "한국은 1란(MFN) 세율만 적용됩니다. 세번(CCC)이 관세를 크게 바꾸니(초콜릿/당과·보충제/의약품·차 형태 등) GC411 조회 또는 稅則預先審核으로 확정하세요.",
      chips: ["한국=1란(MFN)", "세번이 관세 좌우", "무역진흥비·부가세", "세번 사전심사"],
      actions: ["세번(CCC)을 財政部關務署 GC411로 조회하고, 애매하면 稅則預先審核(사전심사)으로 확정하세요. FTA율 견적은 무효(한국은 MFN)."]
    };
  }

  if (category === "importer_of_record") {
    return {
      label: "수입자(IOR) 필수 — 한국 수출자는 직접 통관 불가",
      detail:
        "한국 수출자는 대만에서 직접 통관할 수 없습니다. 통관에는 대만 통일사업자번호(UBN)와 세관등록을 가진 수입자(IOR)가 필요하며, 그 수입자가 세번·관세·라벨·사후관리의 법적 책임을 집니다. 첫 PO 전에 대만 수입자/유통사 또는 IOR 대행을 지정하고, 등록보유자·PIF 책임자 등 규제 소유권을 계약에 명시하세요. 고위험 품목(영유아식·일부 보충제)은 해외 제조소 등록도 별도로 필요합니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "대만 수입자(IOR·UBN·세관등록)를 지정했는지, 등록보유자·PIF 책임자 등 규제 소유권을 계약에 명시했는지 확인하세요.",
      chips: ["대만 수입자 필수", "UBN·세관등록", "규제 소유권 계약", "해외 제조소 등록"],
      actions: ["첫 PO 전에 대만 수입자/IOR을 지정하고 등록보유자·PIF 책임자 등 규제 소유권을 계약에 명시하세요."]
    };
  }

  if (category === "personal_vs_commercial") {
    return {
      label: "샘플 통관 ≠ 상업 통관 (개인수입 함정)",
      detail:
        "개인수입은 TFDA 검사가 면제되나 판매가 불가합니다(정제·캡슐 제품은 종류당 12병·총 36병 한도). 샘플이 개인수입으로 통관됐다고 상업 수입이 가능한 것이 아니며 오히려 거짓 안심을 줍니다. 상업 채널은 수입자 등록 하에 실제 상업 시험선적으로 검증하세요. 상업 주문을 '샘플'이나 다수 소액 소포로 쪼개는 것은 탈세로 간주됩니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "개인수입(면세·판매불가)으로 샘플이 통과됐어도 상업 수입 가능 여부는 별개입니다 — 수입자 등록 하 상업 시험선적으로 확인하세요.",
      chips: ["개인수입=판매불가", "정제·캡슐 12/36병", "샘플 통관≠상업", "쪼개기=탈세"],
      actions: ["상업 채널은 수입자 등록 하에 실제 상업 조건으로 시험선적해 검증하세요(개인수입 샘플 통관으로 판단 금지)."]
    };
  }

  if (category === "nutrition_label_format") {
    return {
      label: "영양성분표 포맷 — 한국식은 대만 부적합",
      detail:
        "대만 영양표시는 표 형식으로 '100g/100mL당'과 '1회분당'을 동시에 표기하고, 열량·단백질·지방(포화·트랜스지방 분리)·탄수화물(당류 분리)·나트륨을 모두 넣어야 합니다. 한국식 패널(1회분만·다른 필수영양소 구성)을 그대로 번역하면 부적합입니다. 특히 당류·나트륨 분리 표기와 이중기준(둘 다) 누락이 위반이며, 라벨이 §22를 다 지켜도 영양표시 형식이 틀리면 반려됩니다. 대만 템플릿으로 재작성하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "영양성분표가 대만 형식(100g/100mL당+1회분당 동시, 당류·나트륨 분리, 포화·트랜스지방 분리)인지 확인하세요 — 한국식 번역은 부적합입니다.",
      chips: ["100g+1회분 동시", "당류·나트륨 분리", "포화·트랜스 분리", "한국식 번역 불가"],
      actions: ["영양성분표를 대만 템플릿(이중기준·당류/나트륨/포화/트랜스 분리)으로 재작성하세요."]
    };
  }

  if (category === "supplement_drug_boundary") {
    return {
      label: "보충제 성분 — 의약품 경계 확인",
      detail:
        "제형·용도·함량에 따라 대만에서 의약품(藥品)으로 규제되거나 식품 원료로 인정되지 않는 성분입니다. 예: 글루코사민은 염산염(HCl)형은 식품이나 황산염(sulfate)형은 의약품; 콘드로이틴은 의약품 규제; 쏘팔메토·보스웰리아·5-HTP는 대만 식품 사용 원료 목록에 없어 일반 식품·보충제로 판매 불가(개인수입만). 사용 전 대만 食品原料整合查詢으로 식품 사용 가능 형태·조건을 확인하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "성분의 제형(염/형태)이 대만에서 식품 원료로 인정되는지, 의약품 규제 대상인지 食品原料整合查詢으로 확인하세요.",
      chips: ["제형별 의약품 규제", "식품 원료 목록 확인", "판매 가능 형태 주의"],
      actions: ["글루코사민(황산염=의약품)·콘드로이틴·쏘팔메토·보스웰리아 등은 대만 식품 사용 가능 형태·조건을 食品原料整合查詢으로 확인하세요."]
    };
  }

  if (category === "food_safety_contaminant") {
    return {
      label: "식품 오염물·잔류물 한도 (수입검사)",
      detail:
        "곰팡이독소·벤조피렌·중금속·농약·동물용의약품·히스타민·방사능은 대만 위생표준(食品中污染物質及毒素衛生標準 L0040138 등)에 한도가 있고, 수입 국경검사에서 초과하면 반려·회수됩니다. 확정 한도(예): 총 아플라톡신 10 µg/kg(일반)·곡류가공 4·땅콩원료 15, 아플라톡신 M1 0.025 µg/kg(영유아 조제식); 히스타민 200 mg/kg(히스티딘 높은 어류)·400 mg/kg(염장·발효 어류/魚醬). 견과·곡류·향신료(아플라톡신), 훈제·구이(벤조피렌), 수산(히스타민·중금속), 축산(잔류항생제)이 고위험입니다. 2026 개정: 초콜릿·코코아 분말 카드뮴 한도 신설(2026-01-01 시행), 영유아식 납·카드뮴 및 가금·가축 내장 납 강화, 견과·유지종자 카드뮴 신설. 시험성적서로 적합성을 확보하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "해당 오염물(곰팡이독소·중금속·잔류농약·잔류항생제 등)이 대만 한도 이내인지 시험성적서로 확인하세요.",
      chips: ["곰팡이독소·중금속·잔류물", "수입 국경검사", "시험성적 필요"],
      actions: ["고위험 원료는 대만 한도(아플라톡신·중금속·농약·동물용약 잔류) 대비 시험성적서를 확보하세요."]
    };
  }

  if (category === "honey_naming") {
    return {
      label: "꿀 품명 기준",
      detail:
        "대만은 꿀 품명을 함량으로 규제합니다: 100% 벌꿀만 '蜂蜜(꿀)', 벌꿀 ≥60%에 당 첨가면 '加糖蜂蜜(가당 벌꿀)', 60% 미만이면 '蜂蜜口味/風味(꿀맛/풍미)'로 표기해야 합니다. 함량 미달 제품에 '蜂蜜/꿀' 단독 명칭을 쓰면 허위표시(최대 NT$400만)입니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "벌꿀 함량에 맞는 품명(蜂蜜/加糖蜂蜜/風味)을 썼는지 확인하세요.",
      chips: ["꿀=100%", "가당꿀 ≥60%", "60%미만=풍미"],
      actions: ["벌꿀 함량으로 품명(蜂蜜/加糖蜂蜜/蜂蜜風味)을 맞추세요."]
    };
  }

  if (category === "food_synthetic_color") {
    return {
      label: "합성 식용색소 — 포지티브 리스트(허용 8종)",
      detail:
        "대만은 합성(타르) 식용색소를 포지티브 리스트로 관리하며 허용은 8종뿐입니다(대만 자체 번호): 藍色一號(Brilliant Blue, E133)·藍色二號(Indigo Carmine, E132)·綠色三號(Fast Green, E143)·黃色四號(Tartrazine, E102)·黃色五號(Sunset Yellow, E110)·紅色六號(New Coccine/Ponceau 4R, E124)·紅色七號(Erythrosine, E127)·紅色四十號(Allura Red, E129). ⚠️ 한국↔대만 색소 번호가 달라 주의: 한국 적색3호(에리트로신)=대만 紅色七號, 한국 적색102호(뉴콕신/New Coccine)=대만 紅色六號로 둘 다 '허용'입니다. 반면 한국 적색2호(아마란스/莧菜紅, E123)는 대만 목록에 없어 '금지'입니다. 또 8종 모두 생선·생육·신선 채소·콩류·된장·간장·차·김 등 특정 식품엔 사용 금지이며, 식품별 사용량 한도가 있습니다. (참고: 紅色七號/에리트로신은 미국이 2025년 사용 철회를 진행 중 — 대만은 2025-05 기준 유지, 모니터링 대상)",
      tone: "gold",
      state: "needs_check",
      uncertainty: "사용 색소가 대만 허용 8종에 해당하는지 대만 번호로 확인하세요. 아마란스(적색2호)는 금지이나, 에리트로신(적색3호)·뉴콕신(적색102호)은 허용입니다. 특정 식품 사용 금지·한도도 확인하세요.",
      chips: ["허용 8종(대만 번호)", "아마란스(적색2호)만 금지", "에리트로신·뉴콕신 허용", "생선·차·간장엔 색소 금지"],
      actions: ["사용 색소를 대만 번호(食用○色○號)로 대조하세요 — 아마란스는 금지, 에리트로신·뉴콕신·알루라레드는 허용. 특정 식품 금지·한도도 확인하세요."]
    };
  }

  if (category === "chocolate_naming") {
    return {
      label: "초콜릿 품명 기준 (대용유지 제한)",
      detail:
        "대만 巧克力 품명 기준(2022-01-01): 다크 총 카카오고형분 ≥35%(카카오버터 ≥18%·무지고형분 ≥14%), 밀크 ≥25%+유고형분 ≥12%, 화이트 카카오버터 ≥20%+유고형분 ≥14%. 식물성 유지(代可可脂/CBS)가 총중량의 5%를 넘으면 '巧克力(초콜릿)' 단독 명칭을 쓸 수 없고 '代可可脂' 접두 표시(예: 代可可脂巧克力)가 필요하며, 5% 이하라도 품명 옆에 '可可脂中添加植物油(식물유 첨가)'를 표기해야 합니다. 한국의 대용/코팅 초콜릿은 대개 5%를 넘어 명칭 위반이 됩니다(허위표시 최대 NT$400만).",
      tone: "gold",
      state: "needs_check",
      uncertainty: "카카오고형분·유지방이 품명 기준을 충족하는지, 식물유지가 5%를 넘는지 확인하세요.",
      chips: ["다크 카카오 ≥35%", "대용유지 >5%=초콜릿 명칭 불가", "식물유 표기"],
      actions: ["카카오 고형분·식물유지 비율로 '巧克力' 명칭 사용 가능 여부와 添加植物油 표기 필요를 확인하세요."]
    };
  }

  if (category === "juice_naming") {
    return {
      label: "과즙 함량 표시·품명",
      detail:
        "대만 과채음료 표시 규정: 과즙 ≥10%면 '果汁(주스)', 10% 미만이면 '果汁飲料(주스음료)', 0%면 '風味/口味(맛)' + '無果汁'로 표기해야 하고, 果汁含量率(과즙 함량률)을 표시해야 합니다. 또 '鮮榨(착즙)/천연'은 직접 착즙·비희석·비발효·7℃ 미만 보관 제품에만 쓸 수 있어, 농축환원(還原) 제품에 '천연/착즙'을 쓰면 위반입니다. 한국의 '100%/과채주스' 표현이 이 기준에 자주 걸립니다.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "과즙 함량(%)에 맞는 품명(果汁 vs 果汁飲料 vs 風味)과 함량률 표시, '천연/착즙' 사용 조건을 확인하세요.",
      chips: ["과즙(주스) ≥10%", "과즙음료 <10%", "함량률 표시", "농축환원에 '착즙' 금지"],
      actions: ["과즙 함량으로 품명(果汁/果汁飲料/風味)과 果汁含量率 표시를 맞추고, 농축환원이면 '천연·착즙' 표현을 빼세요."]
    };
  }

  if (category === "food_process_contaminant") {
    return {
      label: "가공 생성 오염물 (3-MCPD·아크릴아마이드)",
      detail:
        "가공 중 생성되는 오염물에 주의해야 합니다. ① 3-MCPD: 간장 및 간장 기반 조미료(醬油膏·굴소스 포함)에 법정 한도 0.3 mg/kg(食品中污染物質及毒素衛生標準 附表三). 산분해단백(HVP) 자체·1,3-DCP는 별도 법정 한도가 없습니다. ② 아크릴아마이드(丙烯醯胺): 감자칩·유탕과자·비스킷·커피 등 고온 조리 전분식품 — 대만은 '지표값'(감자칩 1000 ppb·감자튀김 600·볶은커피 450)을 두며 이는 법정 기준이 아닌 권고 지표로, 반복 초과 시 관리·회수 압박이 있습니다. 원료·공정으로 저감하고 시험성적을 확보하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "간장·조미료면 3-MCPD 한도, 고온 조리 전분식품이면 아크릴아마이드 지표값 대비 시험값을 확인하세요.",
      chips: ["3-MCPD(간장·HVP)", "아크릴아마이드 지표값", "시험성적 필요"],
      actions: ["간장·복합조미료는 3-MCPD/1,3-DCP 시험성적을, 고온 조리 전분식품은 아크릴아마이드 저감·시험을 확보하세요."]
    };
  }

  if (category === "trans_fat_pho_ban") {
    return {
      label: "경화유 — 부분경화유 금지·완전경화유 확인",
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
      label: "버터·크림·마가린 품명·유지방 기준 (유제품 개편 예정)",
      detail:
        "대만 品名 기준(2017-07-01): 奶油(버터)=유지방 ≥80%, 鮮奶油(크림)=유지방 10%~80% 미만, 人造奶油/乳瑪琳(마가린)=지방 ≥80%, 脂肪抹醬(스프레드)=지방 10%~80% 미만. 식물성 유지 제품은 '植物性奶油/植物性鮮奶油' 등 버터·크림을 연상시키는 명칭을 쓸 수 없습니다. 한국의 '식물성 생크림' 식 명칭은 위반이며, 허위표시는 食安法 §28 최대 NT$400만입니다. 또한 유제품(버터·크림·우유)은 農業部 APHIA 동물검역과 수출국(MAFRA/APQA) 위생증명이 필요합니다. ⚠️ 개편 예정: '鮮乳' 기준이 '食用動物乳' 체계로 재편되고 영유아 조제유 분류가 추가됩니다(제품 정의 2026-07-01, 표시 요건 2027-07-01 시행) — 명칭·표시를 재점검하세요.",
      tone: "gold",
      state: "needs_check",
      uncertainty: "유지방 함량이 품명 기준(奶油≥80%·鮮奶油 10~80%)에 맞는지, 식물성 제품이 버터·크림 명칭을 쓰지 않는지 확인하세요.",
      chips: ["버터≥80% 유지방", "크림 10~80%", "식물성 명칭 금지", "유제품=동물검역"],
      actions: [
        "유지방 함량으로 품명(奶油/鮮奶油/人造奶油/脂肪抹醬)이 맞는지 확인하세요.",
        "식물성 유지 제품은 '植物性奶油/植物性鮮奶油' 등 버터·크림 연상 명칭을 쓰지 마세요.",
        "유제품이면 APHIA 동물검역·수출국 위생증명을 확보하세요."
      ]
    };
  }

  if (category === "food_organic_certification") {
    return {
      label: "유기농 표시 — 인증·수입 검증 필수",
      detail:
        "대만에서 식품에 '有機(유기농)'을 표시하려면 有機農業促進法(2019.5.30 시행, 소관 農業部 農糧署)에 따라 인증이 반드시 필요합니다. 수입품은 수출국이 대만과 '유기 동등성 협정'을 맺은 경우에만 자국 인증으로 표시할 수 있습니다(현재 동등성 국가: 일본·미국·캐나다·호주·뉴질랜드·인도·파라과이·영국). 한국은 동등성 국가가 아니므로 한국 유기 인증만으로는 대만에서 '有機' 표시가 불가능합니다 — 대만이 인정하는 인증기관의 인증을 받고, 수입 시 검증(查驗)·표시 심사를 거쳐야 합니다. 인증·검증 없이 유기 표시를 하면 有機農業促進法 위반으로 제재(벌금·과태료) 대상입니다. (화장품 등 비식품의 '有機' 표현도 실증·인증 근거 없이 쓰면 부당표시입니다.)",
      tone: "red",
      state: "restricted_risk",
      uncertainty:
        "한국은 대만 유기 동등성 국가가 아닙니다. 대만 인정 인증기관 인증 + 수입 검증이 확보됐는지 확인하고, 없으면 라벨·광고에서 '유기농'을 빼거나 인증부터 진행하세요.",
      chips: ["유기농업촉진법", "인증 필수", "한국=동등성 아님", "수입 검증 필요"],
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
