import type { Finding, ReviewStatus } from "./compliance";

export type ReviewActionItem = {
  id: string;
  findingId: string;
  owner: string;
  title: string;
  impact: string;
  eta: string;
  status: ReviewStatus;
  severity: Finding["severity"];
  primaryFix: string;
  source: string;
  sourceUrl: string;
  evidence?: string;
  priority: number;
};

export type ReviewDocumentItem = {
  id: string;
  name: string;
  status: "ready" | "needed" | "review" | "not_applicable";
  tone: "pass" | "warn" | "info" | "danger";
  owner: string;
  relatedFindingIds: string[];
  evidence?: string;
};

export type ReviewActionPlan = {
  priority: "blocked" | "collect_documents" | "revise_label" | "ready_to_file";
  nextAction: string;
  ownerSummary: Array<{ owner: string; count: number; urgentCount: number }>;
  actionItems: ReviewActionItem[];
  documentChecklist: ReviewDocumentItem[];
  evidencePack: Array<{
    title: string;
    source: string;
    sourceUrl: string;
    status: ReviewStatus;
    findingIds: string[];
    evidence?: string;
  }>;
};

const statusRank: Record<ReviewStatus, number> = { fail: 0, needs_info: 1, warn: 2, pass: 3 };

export function ownerForFinding(finding: Finding) {
  if (finding.area === "성분" || finding.area === "알레르겐" || finding.area === "영양표시") return "제조사";
  if (finding.area === "라벨" || finding.area === "식품표시" || finding.area === "효능표현") return "라벨 담당";
  if (finding.area === "통관") return "수입자";
  return "서류 담당";
}

export function impactForFinding(finding: Finding) {
  if (finding.status === "fail") return "출고 전 수정";
  if (finding.severity === "high" || finding.severity === "높음") return "통관 일정 영향";
  if (finding.status === "needs_info") return "자료 회수 필요";
  if (finding.status === "warn") return "문구 보정";
  return "기록 보관";
}

export function etaForFinding(finding: Finding) {
  if (finding.status === "fail") return "오늘";
  if (finding.severity === "high" || finding.severity === "높음") return "24h";
  if (finding.status === "needs_info") return "2-3일";
  return "검수 전";
}

export function prioritizeFindings(findings: Finding[], limit = 3) {
  return [...findings]
    .filter((finding) => finding.status !== "pass")
    .sort((left, right) => statusRank[left.status] - statusRank[right.status])
    .slice(0, limit);
}

function documentItem(
  id: string,
  name: string,
  status: ReviewDocumentItem["status"],
  tone: ReviewDocumentItem["tone"],
  owner: string,
  relatedFindingIds: string[],
  evidence?: string
): ReviewDocumentItem {
  return { id, name, status, tone, owner, relatedFindingIds, evidence };
}

function documentChecklist(findings: Finding[], ruleVersion: string): ReviewDocumentItem[] {
  const findingIds = new Set(findings.map((finding) => finding.id));
  const needsLabel = findings.some((finding) => finding.area === "라벨" || finding.area === "식품표시");
  const needsTrade = findings.some((finding) => finding.area === "통관" && finding.status !== "pass");
  const needsConcentration = findings.some((finding) => finding.id.includes("missing-concentration"));
  const foodRule = ruleVersion.includes("FOOD");

  if (foodRule) {
    return [
      documentItem(
        "food-product-information-sheet",
        "제품정보표",
        findingIds.has("food-import-inspection-docs-present") ? "ready" : "needed",
        findingIds.has("food-import-inspection-docs-present") ? "pass" : "warn",
        "서류 담당",
        ["food-import-inspection-docs-needed", "food-import-inspection-docs-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-import-declaration",
        "수입신고서",
        findingIds.has("food-import-inspection-docs-present") ? "ready" : "needed",
        findingIds.has("food-import-inspection-docs-present") ? "pass" : "warn",
        "수입자",
        ["food-import-inspection-docs-needed", "food-import-inspection-docs-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-business-registration",
        "식품업자 등록",
        findingIds.has("food-importer-registration-present") ? "ready" : "review",
        findingIds.has("food-importer-registration-present") ? "pass" : "info",
        "수입자",
        ["food-importer-registration-needed", "food-importer-registration-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "health-food-permit",
        "건강식품 허가",
        findingIds.has("health-food-permit-present")
          ? "ready"
          : findingIds.has("health-food-permit-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("health-food-permit-needed") ? "warn" : findingIds.has("health-food-permit-present") ? "pass" : "info",
        "규제 담당",
        ["health-food-permit-needed", "health-food-permit-present", "health-food-label-items-review"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "formula-certain-disease-label",
        "특수질환식품 라벨",
        findingIds.has("formula-certain-disease-label-present")
          ? "ready"
          : findingIds.has("formula-certain-disease-label-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("formula-certain-disease-label-needed") ? "warn" : findingIds.has("formula-certain-disease-label-present") ? "pass" : "info",
        "라벨 담당",
        ["formula-certain-disease-label-needed", "formula-certain-disease-label-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-contact-packaging-label",
        "식품용 포장재 라벨",
        findingIds.has("food-contact-label-core-present")
          ? "ready"
          : findingIds.has("food-contact-label-core-needed") || findingIds.has("food-contact-plastic-use-status-needed") || findingIds.has("food-contact-heat-use-review")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-contact-label-core-needed") || findingIds.has("food-contact-plastic-use-status-needed") || findingIds.has("food-contact-heat-use-review") ? "warn" : findingIds.has("food-contact-label-core-present") ? "pass" : "info",
        "라벨 담당",
        ["food-contact-label-core-needed", "food-contact-label-core-present", "food-contact-plastic-use-status-needed", "food-contact-plastic-use-status-present", "food-contact-heat-use-review"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-contact-pvc-pvdc-warning",
        "PVC/PVDC 경고문",
        findingIds.has("food-contact-pvc-pvdc-warning-present")
          ? "ready"
          : findingIds.has("food-contact-pvc-pvdc-warning-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-contact-pvc-pvdc-warning-needed") ? "danger" : findingIds.has("food-contact-pvc-pvdc-warning-present") ? "pass" : "info",
        "라벨 담당",
        ["food-contact-pvc-pvdc-warning-needed", "food-contact-pvc-pvdc-warning-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-additive-registration",
        "식품첨가물 등록",
        findingIds.has("food-additive-inspection-registration-present")
          ? "ready"
          : findingIds.has("food-additive-inspection-registration-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-additive-inspection-registration-needed") ? "danger" : findingIds.has("food-additive-inspection-registration-present") ? "pass" : "info",
        "수입자",
        ["food-additive-inspection-registration-needed", "food-additive-inspection-registration-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "compound-food-additive-import-docs",
        "복방첨가물 서류",
        findingIds.has("compound-food-additive-import-docs-present")
          ? "ready"
          : findingIds.has("compound-food-additive-import-docs-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("compound-food-additive-import-docs-needed") ? "danger" : findingIds.has("compound-food-additive-import-docs-present") ? "pass" : "info",
        "서류 담당",
        ["compound-food-additive-import-docs-needed", "compound-food-additive-import-docs-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-hs0307-health-certificate",
        "HS 0307 위생증명서",
        findingIds.has("food-import-hs0307-health-certificate-present")
          ? "ready"
          : findingIds.has("food-import-hs0307-health-certificate-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-import-hs0307-health-certificate-needed") ? "danger" : findingIds.has("food-import-hs0307-health-certificate-present") ? "pass" : "info",
        "수입자",
        ["food-import-hs0307-health-certificate-needed", "food-import-hs0307-health-certificate-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-traceability-records",
        "식품 이력추적 장부",
        findingIds.has("food-traceability-records-present")
          ? "ready"
          : findingIds.has("food-traceability-records-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-traceability-records-needed") ? "warn" : findingIds.has("food-traceability-records-present") ? "pass" : "info",
        "수입자",
        ["food-traceability-records-needed", "food-traceability-records-present"].filter((id) => findingIds.has(id))
      ),
      documentItem(
        "food-recall-destruction-plan",
        "회수·폐기 계획",
        findingIds.has("food-recall-destruction-plan-present")
          ? "ready"
          : findingIds.has("food-recall-destruction-plan-needed")
            ? "needed"
            : "not_applicable",
        findingIds.has("food-recall-destruction-plan-needed") ? "warn" : findingIds.has("food-recall-destruction-plan-present") ? "pass" : "info",
        "PM",
        ["food-recall-destruction-plan-needed", "food-recall-destruction-plan-present"].filter((id) => findingIds.has(id))
      ),
      documentItem("food-chinese-label", "중문 라벨", needsLabel ? "review" : "ready", needsLabel ? "warn" : "pass", "라벨 담당", findings.filter((finding) => finding.area === "식품표시").map((finding) => finding.id))
    ];
  }

  return [
    documentItem(
      "cosmetic-product-notification",
      "제품등록",
      findingIds.has("cosmetic-product-notification-present") ? "ready" : "needed",
      findingIds.has("cosmetic-product-notification-present") ? "pass" : "warn",
      "수입자",
      ["cosmetic-product-notification-needed", "cosmetic-product-notification-present"].filter((id) => findingIds.has(id))
    ),
    documentItem(
      "cosmetic-pif",
      "PIF",
      findingIds.has("cosmetic-pif-readiness-present") ? "ready" : findingIds.has("pif-2026") || findingIds.has("cosmetic-pif-readiness-needed") ? "needed" : "review",
      findingIds.has("cosmetic-pif-readiness-present") ? "pass" : findingIds.has("pif-2026") || findingIds.has("cosmetic-pif-readiness-needed") ? "warn" : "info",
      "서류 담당",
      ["cosmetic-pif-readiness-needed", "cosmetic-pif-readiness-present", "pif-2026"].filter((id) => findingIds.has(id))
    ),
    documentItem(
      "cosmetic-gmp",
      "GMP / ISO 22716",
      findingIds.has("cosmetic-gmp-readiness-present") ? "ready" : "needed",
      findingIds.has("cosmetic-gmp-readiness-present") ? "pass" : "warn",
      "제조사",
      ["cosmetic-gmp-readiness-needed", "cosmetic-gmp-readiness-present"].filter((id) => findingIds.has(id))
    ),
    documentItem(
      "cosmetic-adverse-reporting",
      "이상반응 보고 SOP",
      findingIds.has("cosmetic-adverse-reporting-present") ? "ready" : "needed",
      findingIds.has("cosmetic-adverse-reporting-present") ? "pass" : "warn",
      "서류 담당",
      ["cosmetic-adverse-reporting-needed", "cosmetic-adverse-reporting-present"].filter((id) => findingIds.has(id))
    ),
    documentItem(
      "cosmetic-recall-procedure",
      "회수·리콜 절차",
      findingIds.has("cosmetic-recall-procedure-present") ? "ready" : "needed",
      findingIds.has("cosmetic-recall-procedure-present") ? "pass" : "warn",
      "PM",
      ["cosmetic-recall-procedure-needed", "cosmetic-recall-procedure-present"].filter((id) => findingIds.has(id))
    ),
    documentItem(
      "cosmetic-source-flow-records",
      "공급원·유통흐름",
      findingIds.has("cosmetic-source-flow-records-present") ? "ready" : "needed",
      findingIds.has("cosmetic-source-flow-records-present") ? "pass" : "warn",
      "수입자",
      ["cosmetic-source-flow-records-needed", "cosmetic-source-flow-records-present"].filter((id) => findingIds.has(id))
    ),
    documentItem("cosmetic-coa", "COA / 조성표", needsConcentration ? "needed" : "ready", needsConcentration ? "warn" : "pass", "제조사", findings.filter((finding) => finding.id.includes("missing-concentration")).map((finding) => finding.id)),
    documentItem("cosmetic-chinese-label", "중문 라벨", needsLabel ? "review" : "ready", needsLabel ? "warn" : "pass", "라벨 담당", findings.filter((finding) => finding.area === "라벨").map((finding) => finding.id)),
    documentItem("trade-invoice-packing", "인보이스 / 패킹리스트", needsTrade ? "review" : "ready", needsTrade ? "info" : "pass", "수입자", findings.filter((finding) => finding.area === "통관").map((finding) => finding.id))
  ];
}

function buildActionItems(findings: Finding[]): ReviewActionItem[] {
  return prioritizeFindings(findings, 8).map((finding, index) => ({
    id: `action-${index + 1}-${finding.id}`,
    findingId: finding.id,
    owner: ownerForFinding(finding),
    title: finding.title,
    impact: impactForFinding(finding),
    eta: etaForFinding(finding),
    status: finding.status,
    severity: finding.severity,
    primaryFix: finding.fix[0] || finding.title,
    source: finding.source,
    sourceUrl: finding.sourceUrl,
    evidence: finding.evidence,
    priority: index + 1
  }));
}

function buildOwnerSummary(actionItems: ReviewActionItem[]) {
  const byOwner = new Map<string, { owner: string; count: number; urgentCount: number }>();
  for (const item of actionItems) {
    const current = byOwner.get(item.owner) ?? { owner: item.owner, count: 0, urgentCount: 0 };
    current.count += 1;
    if (item.eta === "오늘" || item.eta === "24h" || item.status === "fail") current.urgentCount += 1;
    byOwner.set(item.owner, current);
  }
  return Array.from(byOwner.values());
}

function buildEvidencePack(findings: Finding[]) {
  const grouped = new Map<string, ReviewActionPlan["evidencePack"][number]>();
  for (const finding of findings) {
    const key = `${finding.sourceUrl}|${finding.status}`;
    const current =
      grouped.get(key) ??
      {
        title: finding.source,
        source: finding.source,
        sourceUrl: finding.sourceUrl,
        status: finding.status,
        findingIds: [],
        evidence: finding.evidence
      };
    current.findingIds.push(finding.id);
    if (!current.evidence && finding.evidence) current.evidence = finding.evidence;
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).slice(0, 10);
}

function planPriority(findings: Finding[]): ReviewActionPlan["priority"] {
  if (findings.some((finding) => finding.status === "fail")) return "blocked";
  if (findings.some((finding) => finding.status === "needs_info")) return "collect_documents";
  if (findings.some((finding) => finding.status === "warn")) return "revise_label";
  return "ready_to_file";
}

function nextActionForPlan(priority: ReviewActionPlan["priority"], actionItems: ReviewActionItem[]) {
  if (actionItems[0]) return actionItems[0].primaryFix;
  if (priority === "ready_to_file") return "근거 링크와 lot 문서철을 보관하고 규제 변경 감시를 유지";
  return "위험도가 높은 항목부터 담당자별 자료 회수";
}

export function buildReviewActionPlan(findings: Finding[], ruleVersion: string): ReviewActionPlan {
  const actionItems = buildActionItems(findings);
  const priority = planPriority(findings);

  return {
    priority,
    nextAction: nextActionForPlan(priority, actionItems),
    ownerSummary: buildOwnerSummary(actionItems),
    actionItems,
    documentChecklist: documentChecklist(findings, ruleVersion),
    evidencePack: buildEvidencePack(findings)
  };
}
