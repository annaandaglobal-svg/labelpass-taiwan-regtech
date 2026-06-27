import type { Finding, ReviewInput, ReviewResult, ReviewStatus } from "./compliance";
import type { ReviewActionItem, ReviewActionPlan, ReviewDocumentItem } from "./review-action-plan";

const statusRank: Record<ReviewStatus, number> = { fail: 0, needs_info: 1, warn: 2, pass: 3 };

type PresentedFinding = {
  area: string;
  title: string;
  why: string;
  fixes: string[];
  severity?: "low" | "medium" | "high";
};

const documentNameById: Record<string, string> = {
  "food-product-information-sheet": "제품 정보서",
  "food-import-declaration": "수입신고·통관 서류",
  "food-business-registration": "식품 영업자/수입자 등록",
  "health-food-permit": "건강식품 허가자료",
  "food-claim-substantiation": "식품 표시·광고 근거자료",
  "formula-certain-disease-label": "특정질환용 식품 라벨",
  "food-gmo-label-evidence": "GMO 원료 표시 근거",
  "food-contact-packaging-label": "식품용 포장재 라벨",
  "food-contact-sanitation-evidence": "식품용 포장재 위생·용출 시험",
  "food-contact-pvc-pvdc-warning": "PVC/PVDC 주의문구",
  "food-additive-registration": "식품첨가물 등록·허가 자료",
  "compound-food-additive-import-docs": "복합 식품첨가물 수입서류",
  "food-hs0307-health-certificate": "HS 0307 위생증명",
  "food-traceability-records": "식품 추적관리 기록",
  "food-recall-destruction-plan": "식품 회수·폐기 계획",
  "food-chinese-label": "중문 식품 라벨",
  "cosmetic-product-notification": "화장품 제품등록/통보",
  "cosmetic-pif": "PIF 제품 정보파일",
  "cosmetic-gmp": "GMP / ISO 22716",
  "cosmetic-adverse-reporting": "이상사례 보고 SOP",
  "cosmetic-recall-procedure": "화장품 회수 절차",
  "cosmetic-source-flow-records": "공급·유통 추적 기록",
  "cosmetic-coa": "COA / 성분 함량 증빙",
  "cosmetic-chinese-label": "중문 화장품 라벨",
  "cosmetic-claim-substantiation": "화장품 효능 표현 근거자료",
  "trade-invoice-packing": "인보이스 / 패킹리스트"
};

function compact(value: string, maxLength = 120) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

const mojibakePattern = /[\uFFFD\uE000-\uF8FF]|銁|銝|嚗|瑼|撟|靽|甈|摰|蝣|瘛|鞈|撖||||||||||||||||||||||||||||||||||||/u;
const mojibakeChars = /[\uFFFD\uE000-\uF8FF]|銁|銝|嚗|瑼|撟|靽|甈|摰|蝣|瘛|鞈|撖||||||||||||||||||||||||||||||||||||/gu;

function hasMojibake(value?: string | null) {
  return mojibakePattern.test(String(value ?? ""));
}

function sanitizeMojibakeText(value: string | undefined, fallback = "입력 원문 일부가 깨져 표시에서 제외됨") {
  const raw = String(value ?? "");
  if (!hasMojibake(raw) && !/\?{2,}/.test(raw)) return raw;
  const cleaned = raw
    .replace(mojibakeChars, " ")
    .replace(/\?{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function sanitizeIdentifier(value: string, fallback = "unreadable") {
  if (!hasMojibake(value) && !/\?{2,}/.test(value)) return value;
  const cleaned = sanitizeMojibakeText(value, fallback)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function hasReadableLetters(value: string) {
  return /[A-Za-z0-9\u3400-\u9fff가-힣]/u.test(value);
}

function extractFindingSubject(finding: Finding) {
  const evidence = sanitizeMojibakeText(finding.evidence ?? "", "");
  const fromEvidence = evidence.split("/")[0]?.replace(/^input:\s*/i, "").trim();
  if (fromEvidence && hasReadableLetters(fromEvidence)) return compact(fromEvidence, 64);

  const tail = sanitizeMojibakeText(finding.id, "")
    .split("-")
    .slice(-2)
    .join(" ")
    .replace(/[^\p{Letter}\p{Number}%.+\s-]/gu, " ")
    .trim();
  return tail && tail.length > 2 ? compact(tail, 64) : "해당 항목";
}

function normalizeSeverity(finding: Finding, fallback?: PresentedFinding["severity"]): Finding["severity"] {
  if (finding.status === "fail") return "high";
  if (finding.status === "needs_info") return "medium";
  if (finding.status === "warn") return "medium";
  return fallback ?? "low";
}

export function presentFinding(finding: Finding): PresentedFinding {
  const id = finding.id.toLowerCase();
  const subject = extractFindingSubject(finding);

  if (id.startsWith("prohibited-")) {
    return {
      area: "성분",
      title: `${subject} 금지 성분 가능성`,
      why: "대만 화장품 금지 성분 목록과 매칭되었습니다. 판매 전 성분 교체 또는 제품 적용범위 재확인이 필요합니다.",
      fixes: ["해당 원료를 대체하거나 처방에서 제거", "공식 TFDA 원문과 COA/성분표 대조", "수정 처방으로 라벨과 PIF 재생성"],
      severity: "high"
    };
  }

  if (id.startsWith("over-limit-")) {
    return {
      area: "성분",
      title: `${subject} 허용 함량 초과 가능성`,
      why: "제한 성분의 입력 함량이 대만 기준보다 높게 감지되었습니다.",
      fixes: ["함량을 기준 이하로 조정", "최종 제품 COA와 배합표 확보", "제품 유형별 제한조건 재검토"],
      severity: "high"
    };
  }

  if (id.startsWith("missing-concentration-")) {
    return {
      area: "성분",
      title: `${subject} 함량 확인 필요`,
      why: "제한 성분 후보가 있지만 함량이 없어 통과 여부를 확정할 수 없습니다.",
      fixes: ["원료별 함량 또는 배합비 추가", "CAS/INCI/중문 별칭을 함께 기재", "공급사 COA와 배합표 첨부"],
      severity: "medium"
    };
  }

  if (id.includes("scope-risk")) {
    return {
      area: "성분",
      title: `${subject} 제품 적용범위 확인`,
      why: "원료가 특정 제품 유형에만 허용될 수 있습니다. leave-on, rinse-off, 구강용 등 사용범위를 확인하세요.",
      fixes: ["제품 사용 방식을 명확히 기재", "원료 제한조건과 라벨 사용법 대조", "필요 시 처방 또는 카테고리 조정"],
      severity: "high"
    };
  }

  if (id === "label-chinese-text-needed" || id === "food-label-chinese-text-needed") {
    return {
      area: "라벨",
      title: "중문 라벨 초안 필요",
      why: "대만 판매·수입 검토에서는 소비자용 중문 표시 항목이 실제 라벨이나 수입 스티커에 반영되어야 합니다.",
      fixes: ["중문 라벨 OCR 또는 시안 추가", "품명·성분·내용량·수입자·원산지·일자 항목 대조", "원문 라벨과 중문 스티커 버전 맞춤"],
      severity: "medium"
    };
  }

  if (id.startsWith("label-")) {
    return {
      area: "라벨",
      title: "중문 라벨 필수 항목 보강",
      why: "제품명, 용도, 전성분, 순량, 제조/수입자, 원산지, 제조번호, 유통기한 중 일부가 부족할 수 있습니다.",
      fixes: ["중문 라벨 OCR 또는 원문 추가", "수입자와 책임업체 정보를 확정", "제품명·순량·원산지·LOT·EXP를 같은 버전으로 정리"],
      severity: "medium"
    };
  }

  if (id.includes("origin")) {
    return {
      area: "서류",
      title: "원산지 표시·증빙 확인",
      why: "대만 라벨과 통관 서류에서 원산지 정보가 일치해야 합니다.",
      fixes: ["원산지 문구를 라벨에 반영", "COO 또는 제조국 증빙 확보", "인보이스와 포장 문구 일치 확인"],
      severity: "medium"
    };
  }

  if (id.includes("manufacturer") || id.includes("importer")) {
    return {
      area: "서류",
      title: "제조사·수입자 정보 확인",
      why: "대만 책임업체 또는 수입자 정보가 라벨·수입서류에 필요합니다.",
      fixes: ["대만 수입자명, 주소, 연락처 확보", "제조사 정보와 PIF/제품자료 연결", "라벨 책임업체 표기 재검토"],
      severity: "medium"
    };
  }

  if (id.includes("medical-claim") || id.includes("medical-efficacy")) {
    return {
      area: "표현",
      title: "의학적 효능 표현 삭제 필요",
      why: "치료, 염증 완화, 질병 개선 등으로 읽힐 수 있는 표현은 화장품/식품 표시에서 고위험입니다.",
      fixes: ["치료·질병 표현 제거", "일반적 보습·청결·영양 표현으로 완화", "효능 근거자료와 광고 문안 동시 검토"],
      severity: "high"
    };
  }

  if (id.includes("claim")) {
    return {
      area: "표현",
      title: "효능·광고 문구 근거 확인",
      why: "기능성, 영양, 건강 관련 표현은 대만 기준에 맞는 근거와 허가 범위를 확인해야 합니다.",
      fixes: ["표현별 근거자료 매핑", "과장·오인 가능 문구 제거", "허가번호 또는 시험자료 보관"],
      severity: "medium"
    };
  }

  if (id.includes("pif") || id.includes("gmp") || id.includes("notification") || id.includes("recall") || id.includes("adverse") || id.includes("source-flow")) {
    return {
      area: "PIF",
      title: "PIF·등록·사후관리 증빙 확인",
      why: "대만 화장품은 제품 정보파일, 등록/통보, 제조품질, 추적·회수 체계를 함께 관리해야 합니다.",
      fixes: ["PIF 목차와 책임자 지정", "제품등록/통보 상태 확인", "GMP·이상사례·회수 SOP를 제품 버전에 연결"],
      severity: finding.status === "pass" ? "low" : "medium"
    };
  }

  if (id.includes("food-additive") || id.includes("compound-food-additive")) {
    return {
      area: "식품첨가물",
      title: "첨가물 허용범위·등록 확인",
      why: "대만 첨가물 기준은 사용 목적, 적용 식품, 함량, 등록 여부를 함께 봅니다.",
      fixes: ["첨가물명과 용도 확인", "허용 식품군·최대 사용량 대조", "등록번호·성분조성표·위생증명 확보"],
      severity: "medium"
    };
  }

  if (id.includes("allergen")) {
    return {
      area: "알레르기",
      title: "알레르기 표시 확인",
      why: "대만 필수 또는 권고 알레르기 원료가 포함될 수 있습니다.",
      fixes: ["중문 알레르기 경고문 추가", "교차오염 가능성 확인", "원재료명과 강조표시 일치 확인"],
      severity: finding.status === "fail" ? "high" : "medium"
    };
  }

  if (id.includes("food-gmo-label")) {
    return {
      area: "식품표시",
      title: "GMO 원료 표시 확인",
      why: "대두, 옥수수, 카놀라 등 GMO 관리 대상이 될 수 있는 원료는 대만 포장식품 라벨에서 유전자변형 관련 표시와 공급자 증빙을 함께 확인해야 합니다.",
      fixes: ["GMO/non-GMO 사양서 확보", "중국어 라벨 문구와 원료 증빙 일치 확인", "대만 표시 대상 원료인지 재확인"],
      severity: finding.status === "pass" ? "low" : "medium"
    };
  }

  if (id.includes("nutrition") || id.includes("health-food") || id.includes("formula-certain-disease")) {
    return {
      area: "영양·건강표현",
      title: "영양표시·건강표현 검토",
      why: "영양성분표와 저당·고단백·면역 등 표현은 기준치와 허가 범위를 확인해야 합니다.",
      fixes: ["영양성분표 단위와 기준량 확인", "표현별 기준 충족 여부 확인", "건강식품 허가 필요성 검토"],
      severity: "medium"
    };
  }

  if (id.includes("import") || id.includes("hs0307") || id.includes("systematic") || id.includes("traceability")) {
    return {
      area: "수입검사",
      title: "수입검사 서류 확인",
      why: "수입식품은 제품정보, 수입자 등록, 위생증명, 추적관리 자료가 필요할 수 있습니다.",
      fixes: ["HS/CCC와 제품 설명 일치 확인", "수입검사 신청 자료 준비", "공식 위생증명·추적관리 기록 확보"],
      severity: "medium"
    };
  }

  if (id.includes("food-contact")) {
    return {
      area: "포장재",
      title: "식품용 포장재 표시·재질 확인",
      why: "식품 접촉 재질은 용도, 온도 조건, 위생규격 시험자료를 함께 확인해야 합니다.",
      fixes: ["재질과 사용조건 표기", "위생/용출 시험성적서 확보", "전자레인지·고온 사용 문구 재검토"],
      severity: "medium"
    };
  }

  if (id.includes("trade") || id.includes("customs") || id.includes("shtc") || id.includes("ccc") || id.includes("hs")) {
    return {
      area: "통관",
      title: "HS/CCC·수출입 규제 확인",
      why: "품목분류와 허가 코드가 라벨, 인보이스, 수입신고 자료와 맞아야 합니다.",
      fixes: ["HS/CCC 코드 근거 확보", "수입/수출 허가 코드 확인", "원산지 표시와 서류 일치 검토"],
      severity: "medium"
    };
  }

  if (finding.status === "pass") {
    return {
      area: "확인",
      title: "1차 검토 통과 항목",
      why: "자동검토에서 즉시 차단되는 신호는 낮습니다. 공식 문서와 제품 버전 연결은 계속 유지하세요.",
      fixes: ["증빙 원문 링크 저장", "라벨 버전과 검토 결과 연결", "수입 전 최종 원문 재확인"],
      severity: "low"
    };
  }

  return {
    area: "검토",
    title: "추가 확인 필요",
    why: "자동검토가 확인 신호를 찾았습니다. 공식 원문과 제품 자료를 대조해 확정하세요.",
    fixes: ["제품 자료 보강", "공식 원문 링크 확인", "전문가 검토 필요 여부 판단"],
    severity: finding.status === "fail" ? "high" : "medium"
  };
}

function presentOwner(findingOrOwner: Finding | string) {
  const area = typeof findingOrOwner === "string" ? findingOrOwner : presentFinding(findingOrOwner).area;
  if (area === "성분" || area === "식품첨가물" || area === "알레르기" || area === "영양·건강표현") return "제품·RA 담당";
  if (area === "라벨" || area === "표현") return "라벨·마케팅 담당";
  if (area === "통관" || area === "수입검사") return "수출입·통관 담당";
  if (area === "PIF" || area === "서류" || area === "포장재") return "규제 문서 담당";
  return "PM";
}

function impactFor(status: ReviewStatus) {
  if (status === "fail") return "출시 차단";
  if (status === "needs_info") return "자료 보강 필요";
  if (status === "warn") return "라벨 수정 권장";
  return "근거 보관";
}

function etaFor(status: ReviewStatus) {
  if (status === "fail") return "즉시";
  if (status === "needs_info") return "2-3일";
  if (status === "warn") return "다음 검토";
  return "보관";
}

function sourceTitle(value: string) {
  const cleaned = sanitizeMojibakeText(value, "공식 규정 원문");
  if (cleaned && /[A-Za-z0-9]/.test(cleaned)) return compact(cleaned, 120);
  return "공식 규정 원문";
}

function presentDocument(item: ReviewDocumentItem): ReviewDocumentItem {
  return {
    ...item,
    name: documentNameById[item.id] ?? sourceTitle(item.name),
    owner: presentOwner(item.owner)
  };
}

function presentActionItem(item: ReviewActionItem, findingById: Map<string, Finding>, idMap: Map<string, string>): ReviewActionItem {
  const findingId = idMap.get(item.findingId) ?? sanitizeIdentifier(item.findingId);
  const finding = findingById.get(findingId);
  const presented = finding ? presentFinding(finding) : null;
  return {
    ...item,
    id: hasMojibake(item.id) || item.id.includes(item.findingId) ? `action-${item.priority}-${findingId}` : item.id,
    findingId,
    owner: finding ? presentOwner(finding) : presentOwner(item.owner),
    title: presented?.title ?? sourceTitle(item.title),
    impact: impactFor(item.status),
    eta: etaFor(item.status),
    severity: finding ? normalizeSeverity(finding, presented?.severity) : item.severity,
    primaryFix: presented?.fixes[0] ?? sourceTitle(item.primaryFix),
    source: sourceTitle(item.source),
    evidence: item.evidence ? sanitizeMojibakeText(item.evidence) : undefined
  };
}

function ownerSummary(actionItems: ReviewActionItem[]) {
  const owners = new Map<string, { owner: string; count: number; urgentCount: number }>();
  for (const item of actionItems) {
    const current = owners.get(item.owner) ?? { owner: item.owner, count: 0, urgentCount: 0 };
    current.count += 1;
    if (item.status === "fail") current.urgentCount += 1;
    owners.set(item.owner, current);
  }
  return [...owners.values()];
}

function nextAction(priority: ReviewActionPlan["priority"], actionItems: ReviewActionItem[]) {
  if (actionItems[0]) return actionItems[0].primaryFix;
  if (priority === "ready_to_file") return "제품 버전, 라벨, 증빙 원문을 묶어서 출시 기록으로 보관하세요.";
  if (priority === "collect_documents") return "부족한 함량, 등록번호, 수입자, 시험자료를 먼저 보강하세요.";
  if (priority === "revise_label") return "중문 라벨과 광고 문구를 수정한 뒤 재검토하세요.";
  return "차단 항목을 먼저 제거한 뒤 다시 검토하세요.";
}

function presentActionPlan(plan: ReviewActionPlan, findings: Finding[], idMap: Map<string, string>): ReviewActionPlan {
  const findingById = new Map(findings.map((finding) => [finding.id, finding]));
  const actionItems = plan.actionItems
    .map((item) => presentActionItem(item, findingById, idMap))
    .sort((left, right) => statusRank[left.status] - statusRank[right.status] || left.priority - right.priority);

  return {
    ...plan,
    nextAction: nextAction(plan.priority, actionItems),
    ownerSummary: ownerSummary(actionItems),
    actionItems,
    documentChecklist: plan.documentChecklist.map((item) => ({
      ...presentDocument(item),
      relatedFindingIds: item.relatedFindingIds.map((id) => idMap.get(id) ?? sanitizeIdentifier(id)),
      evidence: item.evidence ? sanitizeMojibakeText(item.evidence) : undefined
    })),
    evidencePack: plan.evidencePack.map((item) => ({
      ...item,
      title: sourceTitle(item.title),
      source: sourceTitle(item.source),
      findingIds: item.findingIds.map((id) => idMap.get(id) ?? sanitizeIdentifier(id)),
      evidence: item.evidence ? sanitizeMojibakeText(item.evidence) : undefined
    }))
  };
}

export function presentReviewResult(_input: ReviewInput, result: ReviewResult): ReviewResult {
  const usedIds = new Set<string>();
  const idMap = new Map<string, string>();

  result.findings.forEach((finding, index) => {
    const baseId = sanitizeIdentifier(finding.id, `finding-${index + 1}`);
    let cleanId = baseId;
    let suffix = 2;
    while (usedIds.has(cleanId)) {
      cleanId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(cleanId);
    idMap.set(finding.id, cleanId);
  });

  const findings = result.findings.map((finding) => {
    const presented = presentFinding(finding);
    return {
      ...finding,
      id: idMap.get(finding.id) ?? sanitizeIdentifier(finding.id),
      area: presented.area as Finding["area"],
      title: presented.title,
      severity: normalizeSeverity(finding, presented.severity),
      why: presented.why,
      fix: presented.fixes,
      source: sourceTitle(finding.source),
      evidence: finding.evidence ? sanitizeMojibakeText(finding.evidence) : undefined
    };
  });

  return {
    ...result,
    parsedIngredients: result.parsedIngredients.map((ingredient) => ({
      ...ingredient,
      raw: sanitizeMojibakeText(ingredient.raw, "unreadable ingredient"),
      name: sanitizeMojibakeText(ingredient.name, "unreadable ingredient")
    })),
    findings,
    actionPlan: presentActionPlan(result.actionPlan, findings, idMap)
  };
}
