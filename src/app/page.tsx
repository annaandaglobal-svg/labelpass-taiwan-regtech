"use client";

import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  FlaskConical,
  History,
  Info,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  Upload,
  UserRoundCheck,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Finding, ReviewInput, ReviewResult, ReviewStatus } from "@/lib/compliance";
import type { KnowledgeEvidenceBundle } from "@/lib/knowledge-evidence";
import { buildReviewActionPlan, type ReviewActionPlan } from "@/lib/review-action-plan";
import type { ReviewArchiveResponse, ReviewArchiveStorage, SavedReview } from "@/lib/review-types";
import { cleanSampleReview, compoundFoodAdditiveSampleReview, foodAdditiveSampleReview, foodClaimSampleReview, foodCleanSampleReview, foodContactPackagingSampleReview, foodImportShellfishSampleReview, foodRiskSampleReview, healthFoodSampleReview, sampleReview, sourceCards } from "@/lib/sample-data";
import updateQueueData from "../../data/knowledge/regulatory-update-queue.json";

type Screen = "review" | "products" | "updates" | "partners";
type FilterStatus = "all" | ReviewStatus;
type ProductFilter = "all" | "act" | "wait" | "done";
type StartRouteId =
  | "tw_cosmetic_label_pif"
  | "tw_food_label_allergen"
  | "tw_food_additive_ingredient"
  | "tw_food_import_inspection"
  | "tw_health_food_claims"
  | "tw_food_contact_packaging"
  | "tw_trade_control_shtc";
type StartRouteIcon = "cosmetic" | "food" | "additive" | "import" | "health" | "packaging" | "trade";

type StartRouteOption = {
  id: StartRouteId;
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

type WorkspaceDoc = {
  name: string;
  status: string;
  tone: string;
};

type WorkspaceTask = {
  owner: string;
  title: string;
  detail: string;
  tone: string;
};

type WorkspaceVersion = {
  label: string;
  date: string;
  status: string;
  tone: string;
};

type WorkspaceProduct = {
  id: string;
  name: string;
  category: string;
  market: string;
  stage: ProductFilter;
  status: string;
  tone: string;
  nextAction: string;
  due: string;
  meta: string;
  progress: number;
  owner: string;
  review?: SavedReview;
  documents: WorkspaceDoc[];
  tasks: WorkspaceTask[];
  versions: WorkspaceVersion[];
  timeline: string[];
};

type RegulatoryUpdateCandidate = {
  candidate_key: string;
  source_key: string;
  title: string;
  source_url?: string;
  authority?: string;
  domain?: string;
  source_type?: string;
  source_priority?: string;
  change_type: string;
  severity: string;
  status: string;
  detected_at?: string;
  fetched_at?: string;
  cache_expires_at?: string | null;
  affected_domains?: string[];
  affected_terms?: Array<{
    term_key?: string;
    canonical_name?: string;
    category?: string;
  }>;
  affected_products?: string[];
  evidence?: {
    document_path?: string;
    text_chars?: number;
    format?: string;
    from_cache?: boolean;
    browser_capture?: boolean;
    manual_fallback?: boolean;
    excerpt?: string;
  };
  next_action?: string | null;
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

const statusCopy: Record<ReviewStatus, { label: string; tone: string; stamp: string }> = {
  fail: { label: "수정 필요", tone: "danger", stamp: "不合格" },
  warn: { label: "주의", tone: "warn", stamp: "補正" },
  needs_info: { label: "자료 필요", tone: "info", stamp: "待確認" },
  pass: { label: "통과 가능", tone: "pass", stamp: "合格" }
};

const knowledgeStats = {
  sources: "166",
  aliases: "4,019",
  terms: "1,175",
  reviewCases: "28",
  knowledgeCases: "109",
  sourceCases: "66"
};

const startRouteOptions: StartRouteOption[] = [
  {
    id: "tw_cosmetic_label_pif",
    icon: "cosmetic",
    label: "화장품 라벨·PIF",
    detail: "전성분, 제품등록, PIF, 표시·광고 문구를 먼저 확인합니다.",
    productFamily: "cosmetic",
    productType: "cosmetic / 일반 화장품",
    query: "PIF",
    inputs: ["제품명", "화장품 분류", "사용 방식"],
    tags: ["INCI", "PIF", "제품등록"]
  },
  {
    id: "tw_food_label_allergen",
    icon: "food",
    label: "포장식품 표시",
    detail: "원재료, 알레르겐, 영양성분, 표시·광고 문구를 먼저 봅니다.",
    productFamily: "food",
    productType: "prepackaged food / 식품",
    query: "allergen labeling",
    inputs: ["식품 유형", "원재료명", "알레르겐"],
    tags: ["알레르겐", "영양표시", "표시문구"]
  },
  {
    id: "tw_food_additive_ingredient",
    icon: "additive",
    label: "식품첨가물·원료",
    detail: "공식 명칭, 기능군, 사용량, 식품 유형을 기준으로 허용성을 봅니다.",
    productFamily: "food_additive",
    productType: "food additive / 식품첨가물",
    query: "food additive",
    inputs: ["공식 명칭", "기능군", "사용량"],
    tags: ["첨가물", "허가", "사용기준"]
  },
  {
    id: "tw_food_import_inspection",
    icon: "import",
    label: "식품 수입·통관",
    detail: "HS/CCC, 수입 목적, 원산지, 수입자와 검사 서류를 먼저 맞춥니다.",
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
    detail: "허가번호와 승인된 보건효능 범위를 먼저 확인합니다.",
    productFamily: "health_food",
    productType: "health food / 건강식품",
    query: "health food permit",
    inputs: ["허가번호", "승인 효능", "기능성 원료"],
    tags: ["허가번호", "효능문구", "로고"]
  },
  {
    id: "tw_food_contact_packaging",
    icon: "packaging",
    label: "식품접촉 포장·용기",
    detail: "식품접촉 여부, 재질, 사용 조건, 시험성적서를 먼저 확인합니다.",
    productFamily: "food_contact",
    productType: "food contact packaging / 식품접촉재",
    query: "food contact packaging",
    inputs: ["재질", "식품접촉 용도", "시험성적서"],
    tags: ["용기", "포장재", "위생기준"]
  },
  {
    id: "tw_trade_control_shtc",
    icon: "trade",
    label: "SHTC·수출입 통제",
    detail: "CCC 코드, 기술 사양, 용도, 목적지로 통제 여부를 선별합니다.",
    productFamily: "trade_control",
    productType: "trade control / 수출입 통제",
    query: "SHTC",
    shipmentPurpose: "export control screening / 수출입 통제 선별",
    inputs: ["CCC 코드", "기술 사양", "목적지"],
    tags: ["SHTC", "CCC", "용도"]
  }
];

const archiveCopy: Record<ReviewArchiveStorage, { label: string; detail: string; tone: string }> = {
  database: { label: "클라우드 보관", detail: "Supabase에 검토 이력 저장", tone: "pass" },
  browser: { label: "브라우저 보관", detail: "이 기기에서 즉시 사용", tone: "info" },
  disabled: { label: "로컬 보관", detail: "DB 연결 전까지 브라우저 저장", tone: "warn" },
  unavailable: { label: "보관 대기", detail: "서버 저장 재시도 필요", tone: "warn" }
};

const flowSteps = [
  { label: "라벨 검토", state: "done" },
  { label: "수정 반영", state: "now" },
  { label: "전문가 검수", state: "next" },
  { label: "TFDA 등록", state: "next" },
  { label: "통관·선적", state: "next" }
] as const;

const regulatoryUpdateQueue = updateQueueData as {
  summary: {
    total: number;
    detected: number;
    pending_refresh: number;
    watching: number;
    high: number;
    medium: number;
    low: number;
  };
  items: RegulatoryUpdateCandidate[];
};

const productImpactItems = [
  { badge: "식품", title: "불닭 소스", detail: "수입식품 검사·영양 강조표시 재검토", status: "재검토", tone: "danger" },
  { badge: "첨가물", title: "복방 보존료 프리믹스", detail: "查驗登記·성분보고서·공식 위생증명서 확인", status: "서류", tone: "danger" },
  { badge: "식품", title: "냉동 패류 샘플", detail: "HS 0307 위생증명서·채취 해역 확인", status: "서류", tone: "warn" },
  { badge: "화장품", title: "수분 진정 토너", detail: "제품등록·PIF·GMP 증빙 보강", status: "D-5", tone: "info" }
] as const;

const updateWorkflowItems = [
  { label: "자동 수집", detail: "TFDA·MOJ·CCC 소스 캐시" },
  { label: "차이 탐지", detail: "해시·만료·우선순위 큐" },
  { label: "사람 승인", detail: "룰셋 반영 전 검토 게이트" }
] as const;

const demoWorkspaceProducts: WorkspaceProduct[] = [
  {
    id: "demo-toner",
    name: "수분 진정 토너 300ml",
    category: "화장품",
    market: "대만",
    stage: "act",
    status: "수정 필요 3건",
    tone: "danger",
    nextAction: "Triclosan 처방 변경 체크리스트를 제조사에 전달",
    due: "오늘 착수",
    meta: "v3 검토 · 할 일 4건 중 0건 완료 · PIF 작성 중",
    progress: 35,
    owner: "제조사",
    documents: [
      { name: "PIF", status: "작성 중", tone: "warn" },
      { name: "COA / 조성표", status: "요청", tone: "info" },
      { name: "GMP", status: "완료", tone: "pass" },
      { name: "중문 라벨 v4", status: "대기", tone: "warn" }
    ],
    tasks: [
      { owner: "제조사", title: "Triclosan 대체 처방 또는 함량 조정", detail: "병목 · 4-8주", tone: "danger" },
      { owner: "라벨 담당", title: "효능 문구를 보습·피부결 표현으로 완화", detail: "라벨 v4", tone: "warn" },
      { owner: "서류 담당", title: "제조원·수입자명을 PIF와 라벨에서 통일", detail: "검수 전", tone: "info" }
    ],
    versions: [
      { label: "v3", date: "06.10", status: "위반 3", tone: "danger" },
      { label: "v2", date: "05.30", status: "위반 5", tone: "danger" },
      { label: "v1", date: "05.21", status: "위반 8", tone: "danger" }
    ],
    timeline: ["v3 검토 완료 · 수정 체크리스트 생성", "v2 라벨 일부 수정", "제품 등록 · 기초 화장품 분류 확정"]
  },
  {
    id: "demo-shellfish",
    name: "냉동 굴살 1kg",
    category: "식품",
    market: "대만",
    stage: "act",
    status: "서류 필요",
    tone: "warn",
    nextAction: "HS 0307 위생증명서와 채취 해역 자료 확보",
    due: "24h",
    meta: "수입검사 서류 · 식품업자 등록 · 제도검사 확인 필요",
    progress: 28,
    owner: "수입자",
    documents: [
      { name: "제품정보표", status: "필요", tone: "warn" },
      { name: "수입신고서", status: "필요", tone: "warn" },
      { name: "위생증명서", status: "필요", tone: "danger" },
      { name: "식품업자 등록", status: "확인", tone: "info" }
    ],
    tasks: [
      { owner: "수입자", title: "수출국 공식 위생증명서와 harvest area 확보", detail: "통관 일정 영향", tone: "danger" },
      { owner: "서류 담당", title: "제품정보표·수입신고서 사본 준비", detail: "입항 전", tone: "warn" },
      { owner: "수입자", title: "식품업자 등록·제품책임보험 확인", detail: "검사 신청 전", tone: "info" }
    ],
    versions: [
      { label: "v1", date: "06.26", status: "자료 필요", tone: "warn" }
    ],
    timeline: ["HS 0307 패류 수입검사 규칙 연결", "제품정보표·위생증명서 체크리스트 생성"]
  },
  {
    id: "demo-cica",
    name: "시카 리페어 크림 50ml",
    category: "화장품",
    market: "대만",
    stage: "wait",
    status: "회신 대기",
    tone: "info",
    nextAction: "대만 수입사 주소 확인 회신 대기",
    due: "D+1",
    meta: "v2 통과 · 부산에서 지룽 선적 준비 중",
    progress: 76,
    owner: "수입자",
    documents: [
      { name: "중문 라벨", status: "완료", tone: "pass" },
      { name: "인보이스", status: "완료", tone: "pass" },
      { name: "패킹리스트", status: "완료", tone: "pass" },
      { name: "수입자 주소", status: "회신 대기", tone: "info" }
    ],
    tasks: [
      { owner: "수입자", title: "수입자 주소와 연락처 최종 회신", detail: "선적 전", tone: "info" },
      { owner: "물류", title: "포장 박스 원산지와 인보이스 원산지 대조", detail: "출고 전", tone: "pass" }
    ],
    versions: [
      { label: "v2", date: "06.18", status: "통과", tone: "pass" },
      { label: "v1", date: "06.01", status: "보완", tone: "warn" }
    ],
    timeline: ["v2 통과 리포트 생성", "통관·물류 견적 요청", "수입자 주소 회신 대기"]
  },
  {
    id: "demo-cleanser",
    name: "그린티 클렌징폼 150ml",
    category: "화장품",
    market: "대만",
    stage: "done",
    status: "통과 · 모니터링",
    tone: "pass",
    nextAction: "규제 변경 영향 발생 시 자동 재검토",
    due: "상시",
    meta: "v2 통과 · 판매 중 · 룰셋 변경 감시",
    progress: 100,
    owner: "운영",
    documents: [
      { name: "통과 리포트", status: "완료", tone: "pass" },
      { name: "COA", status: "완료", tone: "pass" },
      { name: "중문 라벨", status: "완료", tone: "pass" },
      { name: "규제 감시", status: "활성", tone: "pass" }
    ],
    tasks: [
      { owner: "운영", title: "규제 업데이트 큐 감시 유지", detail: "월간", tone: "pass" }
    ],
    versions: [
      { label: "v2", date: "04.22", status: "통과", tone: "pass" },
      { label: "v1", date: "04.08", status: "보완", tone: "warn" }
    ],
    timeline: ["판매 중 모니터링 전환", "v2 통과 리포트 생성", "v1 보완 항목 해결"]
  }
];

function nowTime() {
  return "2026-06-26";
}

function makeSavedReview(input: ReviewInput, result: ReviewResult): SavedReview {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input,
    result
  };
}

function writeSavedReviews(reviews: SavedReview[]) {
  window.localStorage.setItem("labelpass-reviews", JSON.stringify(reviews));
}

function readSavedReviews(): SavedReview[] | null {
  const raw = window.localStorage.getItem("labelpass-reviews");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    window.localStorage.removeItem("labelpass-reviews");
    return null;
  }
}

function mergeSavedReviews(...groups: SavedReview[][]) {
  const seen = new Set<string>();
  const merged: SavedReview[] = [];

  for (const review of groups.flat()) {
    if (seen.has(review.id)) continue;
    seen.add(review.id);
    merged.push(review);
  }

  return merged;
}

async function requestReview(reviewInput: ReviewInput): Promise<ReviewResult> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reviewInput)
  });

  if (!response.ok) {
    throw new Error("review_failed");
  }

  return response.json();
}

async function requestArchivedReviews(): Promise<ReviewArchiveResponse> {
  const response = await fetch("/api/reviews?limit=12", { cache: "no-store" });
  if (!response.ok) throw new Error("archive_failed");
  return response.json();
}

async function persistArchivedReview(review: SavedReview): Promise<ReviewArchiveResponse> {
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review)
  });

  if (!response.ok) throw new Error("archive_failed");
  return response.json();
}

type KnowledgeEvidenceRequestOptions = {
  productFamily?: string;
  routeId?: string;
};

async function requestKnowledgeEvidence(query: string, options: KnowledgeEvidenceRequestOptions = {}): Promise<KnowledgeEvidenceBundle> {
  const params = new URLSearchParams({ q: query, limit: "12" });
  if (options.productFamily) params.set("product_family", options.productFamily);
  if (options.routeId) params.set("route_id", options.routeId);
  const response = await fetch(`/api/knowledge/evidence?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("knowledge_evidence_failed");
  return response.json();
}

function formatKnowledgeEvidenceAnswer(bundle: KnowledgeEvidenceBundle, finding?: Finding) {
  const fix = finding?.fix?.[0] ? `우선 조치: ${finding.fix[0]}` : "";
  const terms = bundle.terms.length
    ? `매칭 용어: ${bundle.terms.slice(0, 3).map((term) => term.canonicalName).join(", ")}`
    : "매칭 용어: 아직 부족합니다. 별칭 후보를 term registry에 추가해야 합니다.";
  const sources = bundle.sources.length
    ? `공식 근거: ${bundle.sources.slice(0, 2).map((source) => source.title).join(" / ")}`
    : "공식 근거: 연결된 소스가 부족합니다.";
  const routeHint = bundle.routeHints?.[0];
  const route = routeHint
    ? `업무 경로: ${formatEvidenceRouteLabel(routeHint.routeId, routeHint.label)}. 확인할 입력: ${routeHint.requiredInputs.slice(0, 3).map(formatEvidenceRouteInput).join(", ")}`
    : "";
  const action = routeHint
    ? `다음 작업: ${formatEvidenceRouteAction(routeHint.routeId, routeHint.nextAction)}`
    : bundle.suggestedActions[0] ? `다음 작업: ${bundle.suggestedActions[0]}` : "";

  return [
    fix,
    `지식베이스 요약: ${bundle.summary}`,
    terms,
    sources,
    route,
    action,
    `근거 신뢰도: ${bundle.confidence}. 이 답변은 캐시된 공식 소스와 용어 인덱스 기반의 1차 초안입니다.`
  ].filter(Boolean).join("\n");
}

function formatEvidenceRouteLabel(routeId: string, fallback: string) {
  const labels: Record<string, string> = {
    tw_cosmetic_label_pif: "대만 화장품 라벨·PIF·시장진입",
    tw_food_label_allergen: "대만 포장식품 표시·알레르겐·영양",
    tw_food_additive_ingredient: "대만 식품첨가물·원료 허용성",
    tw_food_import_inspection: "대만 식품 수입검사·통관 서류",
    tw_health_food_claims: "대만 건강식품 허가·효능 문구",
    tw_food_contact_packaging: "대만 식품접촉 포장·용기 표시",
    tw_customs_origin_hs: "대만 HS/CCC·원산지·통관 표시",
    tw_trade_control_shtc: "대만 SHTC·수출입 통제 선별"
  };
  return labels[routeId] ?? fallback;
}

function formatEvidenceRouteInput(value: string) {
  const labels: Record<string, string> = {
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
    "HS/CCC code": "HS/CCC 코드",
    "origin": "원산지",
    "importer": "수입자",
    "shipment purpose": "수입 목적",
    "permit number": "허가번호",
    "approved effect": "승인 효능",
    "CCC code": "CCC 코드",
    "technical specification": "기술 사양",
    "end use": "최종 용도"
  };
  return labels[value] ?? value;
}

function formatEvidenceRouteAction(routeId: string, fallback: string) {
  const actions: Record<string, string> = {
    tw_cosmetic_label_pif: "화장품 분류, PIF/제품등록, 전성분 근거를 먼저 묶은 뒤 라벨 검토로 넘기세요.",
    tw_food_label_allergen: "식품 유형, 원재료, 알레르겐, 영양·표시 문구를 먼저 확정하세요.",
    tw_food_additive_ingredient: "공식 명칭, 기능군, 사용량, 식품 유형을 확인한 뒤 허용 여부를 판단하세요.",
    tw_food_import_inspection: "HS/CCC, 수입 목적, 원산지, 수입자와 검사 서류를 먼저 맞추세요.",
    tw_health_food_claims: "허가번호와 승인된 보건효능 범위를 확인한 뒤 표시 문구를 제한하세요.",
    tw_food_contact_packaging: "식품접촉 여부, 재질, 사용 조건, 시험성적서를 먼저 확인하세요.",
    tw_customs_origin_hs: "HS/CCC와 원산지 증빙을 먼저 맞춘 뒤 표시와 수출입 서류를 정리하세요.",
    tw_trade_control_shtc: "CCC 코드, 기술 사양, 용도, 목적지로 SHTC 통제 여부를 먼저 선별하세요."
  };
  return actions[routeId] ?? fallback;
}

function startRouteIcon(icon: StartRouteIcon) {
  if (icon === "cosmetic") return <FlaskConical size={18} />;
  if (icon === "food") return <PackageCheck size={18} />;
  if (icon === "additive") return <Sparkles size={18} />;
  if (icon === "import") return <Ship size={18} />;
  if (icon === "health") return <BadgeCheck size={18} />;
  if (icon === "packaging") return <Archive size={18} />;
  return <ShieldCheck size={18} />;
}

function hasInputText(value?: string) {
  return Boolean(value?.trim());
}

function buildInputReadiness(input: ReviewInput) {
  const productNameReady = hasInputText(input.productName);
  const productTypeReady = hasInputText(input.productType);
  const labelReady = hasInputText(input.ingredientsText) || hasInputText(input.labelText);
  const tradeReady = hasInputText(input.origin) || hasInputText(input.manufacturer) || hasInputText(input.hsCode) || hasInputText(input.incoterms);
  const readyCount = [productNameReady, productTypeReady, labelReady].filter(Boolean).length;
  const missing = [
    !productNameReady ? "제품명" : "",
    !productTypeReady ? "품목 분류" : "",
    !labelReady ? "성분 또는 라벨" : ""
  ].filter(Boolean);

  return {
    canReview: productNameReady && productTypeReady && labelReady,
    labelReady,
    missing,
    productReady: productNameReady && productTypeReady,
    readyCount,
    tradeReady,
    total: 3
  };
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("review");
  const [input, setInput] = useState<ReviewInput>(emptyInput);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [archiveState, setArchiveState] = useState<ReviewArchiveStorage>("browser");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("위반 항목을 선택하거나 질문을 입력하면, 현재 리포트와 공식 근거 기준으로 답변 초안을 보여드립니다.");
  const [assistantEvidence, setAssistantEvidence] = useState<KnowledgeEvidenceBundle | null>(null);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [toast, setToast] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [selectedSource, setSelectedSource] = useState(sourceCards[0]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [startKnowledgeQuery, setStartKnowledgeQuery] = useState("");
  const [selectedStartRouteId, setSelectedStartRouteId] = useState<StartRouteId>("tw_cosmetic_label_pif");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const assistantSourceCards = useMemo(() => {
    const priorityTitles = [
      "Food additive permit query",
      "Food ingredient direct query",
      "TFDA food claim criteria",
      "PIF phased implementation"
    ];
    const priorityCards = priorityTitles
      .map((title) => sourceCards.find((source) => source.title === title))
      .filter((source): source is (typeof sourceCards)[number] => Boolean(source));
    const fallbackCards = sourceCards.filter((source) => !priorityTitles.includes(source.title));

    return [...priorityCards, ...fallbackCards].slice(0, 4);
  }, []);
  const currentActionPlan = useMemo(() => result ? actionPlanForResult(result) : null, [result]);
  const workActionItems = useMemo(() => {
    if (!currentActionPlan) return [];
    const seen = new Set<string>();
    return currentActionPlan.actionItems.filter((item) => {
      const key = `${item.owner}:${item.primaryFix || item.title}`.replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
  }, [currentActionPlan]);
  const inputReadiness = useMemo(() => buildInputReadiness(input), [input]);
  const selectedStartRoute = useMemo(
    () => startRouteOptions.find((route) => route.id === selectedStartRouteId) ?? startRouteOptions[0],
    [selectedStartRouteId]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateReviews() {
      const localReviews = readSavedReviews() ?? [];
      if (localReviews.length > 0) {
        setSavedReviews(localReviews);
      }

      const archived = await requestArchivedReviews().catch(() => null);
      if (cancelled) return;

      if (archived?.storage) {
        setArchiveState(archived.storage);
      }

      const remoteReviews = archived?.reviews ?? [];
      const mergedReviews = mergeSavedReviews(remoteReviews, localReviews).slice(0, 8);

      if (mergedReviews.length > 0) {
        setSavedReviews(mergedReviews);
        writeSavedReviews(mergedReviews);
        return;
      }

      requestReview(cleanSampleReview)
        .then((seedResult) => {
          if (cancelled) return;
          const seeded = makeSavedReview(cleanSampleReview, seedResult);
          setSavedReviews([seeded]);
          writeSavedReviews([seeded]);
          void persistArchivedReview(seeded).then((archive) => {
            if (archive.storage) setArchiveState(archive.storage);
          }).catch(() => setArchiveState("unavailable"));
        })
        .catch(() => {
          if (!cancelled) setToast("초기 샘플 검토를 불러오지 못했습니다.");
        });
    }

    void hydrateReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetScreen = params.get("screen");
    const knowledgeEvidence = params.get("knowledge")?.trim();
    const productFamily = params.get("product_family")?.trim() || undefined;
    const routeId = params.get("route_id")?.trim() || undefined;

    if (routeId && startRouteOptions.some((route) => route.id === routeId)) {
      setSelectedStartRouteId(routeId as StartRouteId);
    }

    if (targetScreen === "review" || targetScreen === "products" || targetScreen === "updates" || targetScreen === "partners") {
      setScreen(targetScreen);
    }

    if (knowledgeEvidence) {
      setAssistantQuestion(`지식베이스 증거: ${knowledgeEvidence}`);
      setIsAssistantThinking(true);
      requestKnowledgeEvidence(knowledgeEvidence, { productFamily, routeId })
        .then((bundle) => {
          setAssistantEvidence(bundle);
          setAssistantAnswer(formatKnowledgeEvidenceAnswer(bundle));
        })
        .catch(() => {
          setAssistantAnswer(`"${knowledgeEvidence}" 기준으로 현재 라벨, 원료명, HS코드, 공식 출처를 다시 대조할 수 있습니다. 관련 제품을 열어 최신 규정 기준으로 재검토하세요.`);
        })
        .finally(() => setIsAssistantThinking(false));
      setToast("지식베이스 증거를 검토 콘솔에 연결했습니다.");
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    return filter === "all" ? result.findings : result.findings.filter((item) => item.status === filter);
  }, [filter, result]);
  const orderedFindings = useMemo(() => {
    if (!result) return [];
    return filter === "all" ? orderedActionFindings(result.findings) : filteredFindings;
  }, [filter, filteredFindings, result]);
  const visibleFindings = orderedFindings.slice(0, 4);
  const remainingFindings = orderedFindings.slice(4);

  const visibleStatus = result ? statusCopy[result.status] : null;
  const selectedProductType = useMemo(() => {
    const value = input.productType.toLowerCase();
    if (/food|식품|食品|prepackaged/.test(value)) return "food";
    if (/borderline|expert|경계/.test(value)) return "borderline";
    if (/cosmetic|화장품|化粧品|化妝品|leave-on/.test(value)) return "cosmetic";
    return "";
  }, [input.productType]);

  function updateInput<K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) {
    setReviewStarted(true);
    setInput((current) => ({ ...current, [key]: value }));
  }

  function handleFiles(files: FileList | null) {
    const names = Array.from(files ?? []).map((file) => file.name).filter(Boolean);
    if (names.length === 0) return;
    setReviewStarted(true);
    setUploadedFiles((current) => [...names, ...current].slice(0, 4));
    setToast(`${names.length}개 파일을 작업대에 연결했습니다. OCR 텍스트가 있으면 아래 라벨 문구에 붙여넣어 검토하세요.`);
  }

  function archiveReviewLater(review: SavedReview) {
    void persistArchivedReview(review)
      .then((archive) => {
        if (archive.storage) setArchiveState(archive.storage);
        if (archive.storage === "database" && archive.review) {
          setSavedReviews((current) => {
            const merged = mergeSavedReviews([archive.review!], current).slice(0, 8);
            writeSavedReviews(merged);
            return merged;
          });
        }
      })
      .catch(() => setArchiveState("unavailable"));
  }

  function fillSample(kind: "risky" | "clean" | "food-risky" | "food-clean" | "food-import" | "food-additive" | "compound-additive" | "food-claim" | "health-food" | "food-contact") {
    const samples = {
      risky: sampleReview,
      clean: cleanSampleReview,
      "food-risky": foodRiskSampleReview,
      "food-clean": foodCleanSampleReview,
      "food-import": foodImportShellfishSampleReview,
      "food-additive": foodAdditiveSampleReview,
      "compound-additive": compoundFoodAdditiveSampleReview,
      "food-claim": foodClaimSampleReview,
      "health-food": healthFoodSampleReview,
      "food-contact": foodContactPackagingSampleReview
    };
    const messages = {
      risky: "화장품 위반 예시 샘플을 채웠습니다.",
      clean: "화장품 통과 예시 샘플을 채웠습니다.",
      "food-risky": "식품 알레르겐 누락 예시 샘플을 채웠습니다.",
      "food-clean": "식품 통과 예시 샘플을 채웠습니다.",
      "food-import": "식품 수입검사 서류 예시 샘플을 채웠습니다.",
      "food-additive": "식품첨가물 확인 예시 샘플을 채웠습니다.",
      "compound-additive": "복방 식품첨가물 등록·수입서류 샘플을 채웠습니다.",
      "food-claim": "식품 권장 알레르겐·강조표시 예시 샘플을 채웠습니다.",
      "health-food": "건강식품 허가·효능표시 샘플을 채웠습니다.",
      "food-contact": "식품용 포장재 표시 샘플을 채웠습니다."
    };
    const next = samples[kind];
    setReviewStarted(true);
    setInput(next);
    setResult(null);
    setExpandedFinding(null);
    setToast(messages[kind]);
  }

  function focusResultPanel() {
    window.setTimeout(() => {
      document.querySelector(".result-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function focusInputPane() {
    applyStartRouteDefaults();
    setReviewStarted(true);
    window.setTimeout(() => {
      document.querySelector(".input-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function beginWithUpload() {
    applyStartRouteDefaults();
    setReviewStarted(true);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function openKnowledgeSearch(query = startKnowledgeQuery) {
    const trimmed = query.trim() || selectedStartRoute.query;
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    params.set("route_id", selectedStartRoute.id);
    params.set("product_family", selectedStartRoute.productFamily);
    window.location.href = `/knowledge?${params.toString()}`;
  }

  function selectStartRoute(route: StartRouteOption) {
    setSelectedStartRouteId(route.id);
    setStartKnowledgeQuery(route.query);
  }

  function applyStartRouteDefaults(route = selectedStartRoute) {
    setStartKnowledgeQuery((current) => current || route.query);
    setInput((current) => ({
      ...current,
      productType: current.productType || route.productType,
      shipmentPurpose: current.shipmentPurpose || route.shipmentPurpose || current.shipmentPurpose,
      hsCode: current.hsCode || route.hsCode || current.hsCode
    }));
  }

  function classifyProduct() {
    setReviewStarted(true);
    const haystack = `${input.productName} ${input.productType} ${input.ingredientsText} ${input.labelText}`;
    const looksNonFoodContact = /not\s+(?:for|intended for)\s+food[-\s]?contact|not food safe|non[-\s]?food|非食品用|不得接觸食品|식품용\s*아님|비식품용/i.test(haystack);
    const looksFoodContact = !looksNonFoodContact && /food[-\s]?contact|food container|food packaging|food wrap|food utensil|tableware|microwave container|식품\s*접촉|식품용\s*(?:기구|용기|포장|포장재)|식품\s*포장재|식품접촉재|食品器具|食品容器|食品包裝|食品器具容器包裝/i.test(haystack);
    const looksFood = !looksFoodContact && !looksNonFoodContact && /food|snack|tea|cookie|beverage|rice|cracker|protein|low sugar|sugar free|squid|kiwi|shellfish|oyster|mollusk|msg|sodium benzoate|xanthan|compound food additive|food additive|health food|functional food|supplement|probiotic|formula for certain disease|special dietary|식품|과자|차|쿠키|쌀과자|단백질|고단백|저당|무당|오징어|키위|패류|굴|조개|식품첨가물|복방|건강식품|기능성 식품|프로바이오틱스|특정 질환용 조제식품|특수의료용도식품|食品|餅乾|茶|米餅|花生|小麥|高蛋白|低糖|無糖|魷魚|奇異果|貝類|牡蠣|味精|苯甲酸鈉|三仙膠|食品添加物|複方食品添加物|健康食品|保健食品|益生菌|特定疾病配方食品/i.test(haystack);

    setInput((current) => ({
      ...current,
      productType: current.productType || (looksFoodContact ? "food contact packaging / 식품접촉재" : looksFood ? "prepackaged food / 식품" : "leave-on toner / 일반 화장품"),
      ingredientsText: current.ingredientsText || (looksFoodContact ? "" : looksFood ? foodAdditiveSampleReview.ingredientsText : sampleReview.ingredientsText)
    }));
    setToast(
      looksFoodContact
        ? "AI 품목 추정: 대만 식품접촉 포장재 기준으로 분류했습니다."
        : looksFood
          ? "AI 품목 추정: 대만 사전포장식품 기준으로 분류했습니다."
          : "AI 품목 추정: 일반 화장품, leave-on 제품으로 분류했습니다."
    );
  }

  async function runReview(nextInput = input) {
    setReviewStarted(true);
    setIsAnalyzing(true);
    setExpandedFinding(null);
    setShowResultDetails(false);
    try {
      const nextResult = await requestReview(nextInput);
      const review = makeSavedReview(nextInput, nextResult);
      const nextSaved = [review, ...savedReviews].slice(0, 8);
      setResult(nextResult);
      focusResultPanel();
      setSavedReviews(nextSaved);
      writeSavedReviews(nextSaved);
      archiveReviewLater(review);
      setToast("1차 검토가 완료되었습니다. 리포트와 보관함에 저장했습니다.");
    } catch {
      setToast("검토 서버 응답을 받지 못했습니다. 잠시 후 다시 실행해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function recheckAsFixed() {
    const fixedInput = cleanSampleReview;
    setReviewStarted(true);
    setInput(fixedInput);
    setIsAnalyzing(true);
    setShowResultDetails(false);
    try {
      const nextResult = await requestReview(fixedInput);
      const review = makeSavedReview(fixedInput, nextResult);
      const nextSaved = [review, ...savedReviews].slice(0, 8);
      setResult(nextResult);
      focusResultPanel();
      setSavedReviews(nextSaved);
      writeSavedReviews(nextSaved);
      archiveReviewLater(review);
      setToast("수정본 v4 재검토 완료: 주요 위반이 해결된 상태로 전환했습니다.");
    } catch {
      setToast("수정본 재검토를 완료하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function loadAssistantEvidence(query: string, finding?: Finding) {
    setIsAssistantThinking(true);
    try {
      const bundle = await requestKnowledgeEvidence(query);
      setAssistantEvidence(bundle);
      setAssistantAnswer(formatKnowledgeEvidenceAnswer(bundle, finding));
    } catch {
      setAssistantEvidence(null);
      if (finding) {
        setAssistantAnswer(
          `${finding.title} 기준으로는 "${finding.fix[0]}"가 1순위입니다. 근거는 ${finding.source}이며, 현재는 지식베이스 근거 묶음을 불러오지 못했습니다.`
        );
      } else {
        setAssistantAnswer("지식베이스 근거 묶음을 불러오지 못했습니다. 잠시 후 다시 검색하거나 /knowledge에서 직접 확인하세요.");
      }
    } finally {
      setIsAssistantThinking(false);
    }
  }

  async function askAssistant(seed?: Finding) {
    const question = seed ? `${seed.title} 어떻게 고치면 돼?` : assistantQuestion;
    if (!question.trim()) return;
    const base = seed ?? result?.findings.find((item) => item.status === "fail") ?? result?.findings[0];
    setAssistantQuestion(question);
    await loadAssistantEvidence(seed ? knowledgeQueryForFinding(seed) : question, base);
  }

  function downloadReport() {
    window.print();
  }

  function openResultDetails(findingId?: string) {
    if (findingId) {
      setFilter("all");
      setExpandedFinding(findingId);
    }
    setShowResultDetails(true);
    window.setTimeout(() => {
      document.querySelector(".result-secondary-drawer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const archiveStatus = archiveCopy[archiveState];
  const showAssistantPanel = Boolean(assistantEvidence || assistantQuestion.trim());
  const hasReviewWorkspace =
    reviewStarted || result || isAnalyzing || showAssistantPanel || uploadedFiles.length > 0 || inputReadiness.readyCount > 0;
  const reviewMode = isAnalyzing ? "analyzing" : result ? "result" : hasReviewWorkspace ? "intake" : "start";
  const isFocusedIntake = screen === "review" && reviewMode === "intake" && !showAssistantPanel;
  const isStartReview = screen === "review" && reviewMode === "start";
  const isQuietReview = isFocusedIntake || isStartReview;
  const showResultPane = Boolean(result) || isAnalyzing;
  const showWorkPanel = screen === "review" && showAssistantPanel && reviewMode !== "result";
  const showGlobalSearch = !isQuietReview && (screen !== "review" || Boolean(result) || showAssistantPanel);
  const shellClassName = [
    "shell",
    showWorkPanel ? "shell-console" : "shell-no-assistant",
    isQuietReview ? "shell-start-empty" : "",
    screen === "review" && hasReviewWorkspace && !showResultPane ? "shell-start-focus" : ""
  ].filter(Boolean).join(" ");
  const primaryAction = result
    ? { label: "수정본 재검토", icon: <RefreshCw size={17} />, disabled: isAnalyzing, run: () => void recheckAsFixed() }
    : inputReadiness.canReview
      ? { label: "AI 1차 검토", icon: isAnalyzing ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />, disabled: isAnalyzing, run: () => void runReview() }
      : { label: "자료 추가", icon: <Upload size={17} />, disabled: false, run: () => { setReviewStarted(true); fileInputRef.current?.click(); } };
  const intakeChecklist = [
    {
      label: "제품명",
      detail: input.productName || "제품명을 입력하세요",
      ready: hasInputText(input.productName)
    },
    {
      label: "품목",
      detail: input.productType || "화장품·식품·경계 품목",
      ready: hasInputText(input.productType)
    },
    {
      label: "라벨·성분",
      detail: inputReadiness.labelReady ? "검토 자료 연결됨" : "성분 또는 라벨 문구 필요",
      ready: inputReadiness.labelReady
    }
  ];

  return (
    <main className={shellClassName}>
      <aside className="sidebar" aria-label="LabelPass navigation">
        <div className="brand">
          <div className="brand-mark">合格</div>
          <div>
            <strong>LabelPass</strong>
            <span>대만 수출 규제검토</span>
          </div>
        </div>

        <nav className={isQuietReview ? "nav-list nav-list-start" : "nav-list"}>
          <NavButton active={screen === "review"} icon={<ClipboardCheck />} label="검토 시작" onClick={() => setScreen("review")} />
          <NavButton active={false} icon={<Search />} label="규정·성분" onClick={() => openKnowledgeSearch()} />
          <NavButton active={screen === "products"} icon={<Archive />} label="내 제품" onClick={() => setScreen("products")} />
          <NavButton active={screen === "updates"} icon={<BookOpen />} label="규제 업데이트" onClick={() => setScreen("updates")} />
          <NavButton active={screen === "partners"} icon={<UserRoundCheck />} label="전문가·통관" onClick={() => setScreen("partners")} />
        </nav>

        <div className="side-panel">
          <div className="panel-kicker">룰셋</div>
          <b>TW-COS / TW-FOOD 2026.06</b>
          <p>화장품 성분 제한과 식품 표시·알레르겐을 분리해서 판정합니다.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className={["topbar", isQuietReview ? "topbar-minimal" : !showGlobalSearch ? "topbar-compact" : ""].filter(Boolean).join(" ")}>
          <div>
            <p className="eyebrow">대만 · 식품/화장품 · 기준일 {nowTime()}</p>
            <h1>{screen === "review" ? "대만 수출 라벨 1차 검토" : screenTitle(screen)}</h1>
          </div>
          {showGlobalSearch && (
            <form className="global-search" onSubmit={(event) => { event.preventDefault(); void askAssistant(); }}>
              <Search size={16} />
              <input
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="원료, 표시문구, 대만 규정, 과거 검토 검색"
              />
              <button type="submit" disabled={!assistantQuestion.trim() || isAssistantThinking}>
                검색
              </button>
            </form>
          )}
          {!isQuietReview && (
            <div className="top-actions">
              {screen === "review" && result && (
                <button className="primary-btn" onClick={primaryAction.run} disabled={primaryAction.disabled}>
                  {primaryAction.icon} {primaryAction.label}
                </button>
              )}
              {screen !== "review" && (
                <button className="primary-btn" onClick={() => setScreen("review")}>
                  <Upload size={17} /> 검토 시작
                </button>
              )}
              {result && (
                <>
                  <button className="ghost-btn" onClick={downloadReport}>
                    <Download size={17} /> 내보내기
                  </button>
                  <button className="ghost-btn" onClick={() => setShowExpertModal(true)}>
                    <UserRoundCheck size={17} /> 승인 요청
                  </button>
                </>
              )}
            </div>
          )}
        </header>
        <input
          ref={fileInputRef}
          className="file-picker"
          type="file"
          multiple
          accept=".pdf,image/*,.txt,.csv"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {screen === "review" && (
          <>
          {!hasReviewWorkspace && (
            <section className="start-command-shell start-command-shell-focused start-hub-shell" aria-label="LabelPass 시작">
              <div className="start-command-card start-hub-card">
                <div className="start-command-copy start-hub-copy">
                  <span className="start-kicker">대만 식품·화장품 작업대</span>
                  <h2>먼저 대만 업무 경로를 고르고 자료를 넣으세요</h2>
                  <p>제품이 화장품인지, 식품인지, 수입검사나 통제 선별이 필요한지 먼저 잡으면 이후 입력 항목과 공식 근거가 그 경로에 맞춰 좁혀집니다.</p>
                </div>

                <div className="start-route-selector" aria-label="대만 업무 경로 선택">
                  <div className="start-route-head">
                    <span>1. 무엇을 대만으로 보내나요?</span>
                    <b>{selectedStartRoute.label}</b>
                  </div>
                  <div className="start-route-grid">
                    {startRouteOptions.slice(0, 4).map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        className={selectedStartRoute.id === route.id ? "start-route-option active" : "start-route-option"}
                        onClick={() => selectStartRoute(route)}
                        aria-pressed={selectedStartRoute.id === route.id}
                      >
                        {startRouteIcon(route.icon)}
                        <span>
                          <b>{route.label}</b>
                          <small>{route.detail}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <details className="start-route-more">
                    <summary>건강식품·식품접촉재·SHTC 특수 경로</summary>
                    <div>
                      {startRouteOptions.slice(4).map((route) => (
                        <button
                          key={route.id}
                          type="button"
                          className={selectedStartRoute.id === route.id ? "active" : ""}
                          onClick={() => selectStartRoute(route)}
                          aria-pressed={selectedStartRoute.id === route.id}
                        >
                          {startRouteIcon(route.icon)}
                          <span>{route.label}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                  <div className="start-route-plan" aria-label="선택한 경로의 첫 확인 항목">
                    <span>먼저 확인</span>
                    {selectedStartRoute.inputs.map((item) => (
                      <b key={`${selectedStartRoute.id}-${item}`}>{item}</b>
                    ))}
                    <small>{selectedStartRoute.tags.join(" · ")}</small>
                  </div>
                </div>

                <div className="start-hub-actions" aria-label="검토 시작 방법">
                  <button className="start-path-action primary" type="button" onClick={beginWithUpload}>
                    <Upload size={22} />
                    <span>
                      <b>라벨/PDF 업로드</b>
                      <small>이미지, PDF, 텍스트 파일을 먼저 연결하고 OCR 문구나 전성분은 다음 화면에서 확인합니다.</small>
                    </span>
                  </button>

                  <button className="start-path-action" type="button" onClick={focusInputPane}>
                    <ClipboardCheck size={22} />
                    <span>
                      <b>직접 입력</b>
                      <small>제품명, 품목, 전성분 또는 라벨 문구를 붙여넣어 바로 1차 검토를 준비합니다.</small>
                    </span>
                  </button>

                  <form className="start-path-action start-search-action" onSubmit={(event) => { event.preventDefault(); openKnowledgeSearch(); }}>
                    <Search size={22} />
                    <span>
                      <b>규정·성분 먼저 검색</b>
                      <small>INCI, CAS, 알레르겐, HS/CCC처럼 이름이 여러 개인 표현을 공식 근거와 연결합니다.</small>
                    </span>
                    <div className="start-search-box">
                      <input
                        value={startKnowledgeQuery}
                        onChange={(event) => setStartKnowledgeQuery(event.target.value)}
                        placeholder="예: INCI, allergen, HS 3304"
                        aria-label="시작 전 규정 또는 성분 검색"
                      />
                      <button type="submit">검색</button>
                    </div>
                  </form>
                </div>

                <div className="start-workflow-strip" aria-label="검토 흐름">
                  <span className="active"><b>1</b><small>경로 선택</small></span>
                  <span><b>2</b><small>자료 추가</small></span>
                  <span><b>3</b><small>위험 항목 판정</small></span>
                  <span><b>4</b><small>근거·리포트 저장</small></span>
                </div>
              </div>
            </section>
          )}

          {hasReviewWorkspace && (
          <div className={showResultPane ? "review-grid" : "review-grid review-grid-start"}>
            <section className="input-pane">
              {!result && (
                <div className="intake-hero-panel">
                  <div>
                    <span>대만 식품·화장품 작업대</span>
                    <h2>제품명과 라벨을 넣으면 막힐 항목부터 정리합니다</h2>
                    <p>처음에는 제품명, 품목, 라벨·성분만 채우세요. 대만 기준으로 먼저 막힐 가능성이 큰 항목과 필요한 보완 자료를 좁혀드립니다.</p>
                  </div>
                  <div className="intake-start-flow" aria-label="검토 흐름">
                    <span className="active"><b>1</b><small>자료 입력</small></span>
                    <span><b>2</b><small>위험도 판정</small></span>
                    <span><b>3</b><small>근거 확인</small></span>
                    <span><b>4</b><small>리포트 저장</small></span>
                  </div>
                </div>
              )}
              <div className="intake-rail" aria-label="검토 입력 단계">
                <span className={inputReadiness.labelReady ? "done" : "now"}>1 자료</span>
                <span className={inputReadiness.productReady ? "done" : inputReadiness.labelReady ? "now" : ""}>2 품목</span>
                <span className={result ? "done" : inputReadiness.canReview ? "now" : ""}>3 리포트</span>
              </div>
              {result && currentActionPlan ? (
                <div className="result-source-summary" aria-label="검토 입력 요약">
                  <div className="result-source-head">
                    <span><ClipboardCheck size={17} /></span>
                    <div>
                      <b>검토에 사용한 자료</b>
                      <small>결과 화면에서는 입력 원본을 요약하고, 수정은 필요할 때만 펼칩니다.</small>
                    </div>
                  </div>

                  <div className="result-source-grid">
                    <span><b>제품</b>{input.productName || "미지정 제품"}</span>
                    <span><b>분류</b>{input.productType || "미지정"}</span>
                    <span><b>원산지</b>{input.origin || "미입력"}</span>
                    <span><b>HS/CCC</b>{input.hsCode || "선택 입력"}</span>
                  </div>

                  <div className="result-source-snippets">
                    <div>
                      <b>전성분</b>
                      <p>{input.ingredientsText ? compact(input.ingredientsText, 160) : "전성분 텍스트가 비어 있습니다."}</p>
                    </div>
                    <div>
                      <b>라벨 문구</b>
                      <p>{input.labelText ? compact(input.labelText, 160) : "라벨 문구 또는 OCR 텍스트가 비어 있습니다."}</p>
                    </div>
                  </div>

                  <div className={`archive-status ${archiveStatus.tone}`} aria-live="polite">
                    <Database size={15} />
                    <div>
                      <b>{archiveStatus.label}</b>
                      <small>{archiveStatus.detail}</small>
                    </div>
                  </div>

                  <details className="result-edit-drawer">
                    <summary>
                      <FileText size={15} />
                      입력 수정 후 다시 검토
                    </summary>
                    <div className="result-edit-grid">
                      <label className="field">
                        <span>제품명</span>
                        <input value={input.productName} onChange={(event) => updateInput("productName", event.target.value)} placeholder="예: 수분 진정 토너 300ml" />
                      </label>
                      <label className="field">
                        <span>제품 유형</span>
                        <input value={input.productType} onChange={(event) => updateInput("productType", event.target.value)} placeholder="예: leave-on toner / 일반 화장품" />
                      </label>
                      <label className="field">
                        <span>전성분 텍스트</span>
                        <textarea value={input.ingredientsText} onChange={(event) => updateInput("ingredientsText", event.target.value)} rows={5} />
                      </label>
                      <label className="field">
                        <span>라벨 문구 또는 OCR 결과</span>
                        <textarea value={input.labelText} onChange={(event) => updateInput("labelText", event.target.value)} rows={5} />
                      </label>
                    </div>
                    <div className="result-edit-actions">
                      <button className="ghost-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={15} /> 파일 추가
                      </button>
                      <button className="primary-btn" type="button" onClick={() => void runReview()} disabled={isAnalyzing || !inputReadiness.canReview}>
                        {isAnalyzing ? <RefreshCw className="spin" size={15} /> : <ArrowRight size={15} />}
                        수정 입력으로 재검토
                      </button>
                    </div>
                  </details>
                </div>
              ) : (
                <>
                <div className="intake-command-head">
                  <div className="step-row">
                    <span>1</span>
                    <div>
                        <b>핵심 자료 3가지만 먼저 채우세요</b>
                        <p>제품명, 품목, 라벨·성분이 들어오면 1차 검토를 실행할 수 있습니다.</p>
                    </div>
                  </div>
                </div>

                  <div className="input-completeness" aria-live="polite">
                    <div>
                      <span>입력 준비도</span>
                      <b>{inputReadiness.readyCount}/{inputReadiness.total}</b>
                    </div>
                    <i><span style={{ width: `${(inputReadiness.readyCount / inputReadiness.total) * 100}%` }} /></i>
                    <p>{inputReadiness.missing.length > 0 ? `남은 확인: ${inputReadiness.missing.join(" · ")}` : "핵심 자료가 들어왔습니다. 바로 1차 검토를 돌릴 수 있습니다."}</p>
                  </div>

                  <div className="intake-checklist" aria-label="검토 시작 체크리스트">
                    {intakeChecklist.map((item) => (
                      <span key={item.label} className={item.ready ? "ready" : ""}>
                        <Check size={14} />
                        <b>{item.label}</b>
                        <small>{item.detail}</small>
                      </span>
                    ))}
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="file-chip-row compact intake-file-row" aria-label="입력 패널 연결 파일">
                      {uploadedFiles.map((file) => (
                        <span key={file}><FileText size={13} />{file}</span>
                      ))}
                    </div>
                  )}

                  <div className={result ? "quick-review-bar" : "quick-review-bar quick-review-bar-start"}>
                    <div className="review-cta-stack">
                      <button className="primary-btn" onClick={() => void runReview()} disabled={isAnalyzing || !inputReadiness.canReview}>
                        {isAnalyzing ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                        {inputReadiness.canReview ? "AI 1차 검토 시작" : "필수 입력 후 검토"}
                      </button>
                      <small>{inputReadiness.canReview ? "필수 입력 완료 · 통관 자료가 있으면 판정 정확도가 올라갑니다." : `${inputReadiness.missing.slice(0, 2).join(", ")} 입력 시 판정 품질이 좋아집니다.`}</small>
                    </div>
                    {result && (
                    <div className={`archive-status ${archiveStatus.tone}`} aria-live="polite">
                      <Database size={15} />
                      <div>
                        <b>{archiveStatus.label}</b>
                        <small>{archiveStatus.detail}</small>
                      </div>
                    </div>
                    )}
                  </div>

              <div className="form-section">
                <div className="section-title">
                  <BadgeCheck size={16} />
                  <span>제품 정보</span>
                </div>
                <div className="two-col">
                  <label className="field">
                    <span>제품명</span>
                    <input value={input.productName} onChange={(event) => updateInput("productName", event.target.value)} placeholder="예: 수분 진정 토너 300ml" />
                  </label>

                  <label className="field">
                    <span>제품 유형</span>
                    <input value={input.productType} onChange={(event) => updateInput("productType", event.target.value)} placeholder="예: leave-on toner / 일반 화장품" />
                  </label>
                </div>

                <details className="classifier-drawer">
                  <summary>
                    <Search size={15} />
                    품목 빠르게 선택
                  </summary>
                  <div className="classifier">
                    <button className="classifier-ai" onClick={classifyProduct} title="AI가 입력값으로 품목을 추정합니다">
                      <Search size={17} /> AI 찾기
                    </button>
                    <button className={selectedProductType === "cosmetic" ? "active" : ""} onClick={() => updateInput("productType", "cosmetic / leave-on")}>화장품</button>
                    <button className={selectedProductType === "food" ? "active" : ""} onClick={() => updateInput("productType", "prepackaged food / 식품")}>식품</button>
                    <button className={selectedProductType === "borderline" ? "active" : ""} onClick={() => updateInput("productType", "borderline / expert")}>경계 품목</button>
                  </div>
                </details>
              </div>

              <div className="form-section">
                <div className="section-title">
                  <FileText size={16} />
                  <span>라벨·성분 자료</span>
                </div>
                <label className="field">
                  <span>전성분 텍스트</span>
                  <textarea
                    value={input.ingredientsText}
                    onChange={(event) => updateInput("ingredientsText", event.target.value)}
                    placeholder="Water, Glycerin 4%, Triclosan 0.5% ..."
                    rows={4}
                  />
                </label>

                <label className="field">
                  <span>라벨 문구 또는 OCR 결과</span>
                  <textarea value={input.labelText} onChange={(event) => updateInput("labelText", event.target.value)} placeholder="品名, 用途, 全成分, 原產地, 批號..." rows={4} />
                </label>
              </div>

              <details className="intake-tools-drawer">
                <summary>
                  <Upload size={15} />
                  보조 입력: 파일, 샘플, 검토 범위
                </summary>
                <div className="intake-tools-grid">
                  <button className="start-upload-main" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={20} />
                    <span>
                      <b>라벨/PDF 추가</b>
                      <small>{uploadedFiles.length > 0 ? `${uploadedFiles.length}개 파일 연결됨` : "파일명만 먼저 연결하고 텍스트는 아래 입력값을 사용합니다."}</small>
                    </span>
                  </button>
                  <div className="review-scope-strip" aria-label="검토 범위">
                    <span><ShieldCheck size={14} /><b>대만 룰</b><small>화장품·식품</small></span>
                    <span><Search size={14} /><b>용어 정규화</b><small>INCI·CAS·현지명</small></span>
                    <span><Ship size={14} /><b>통관 자료</b><small>HS/CCC·송장</small></span>
                  </div>
                  <div className="sample-grid">
                    <button className="ghost-btn" onClick={() => fillSample("risky")}>화장품 위반</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-risky")}>식품 알레르겐</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-import")}>식품 수입검사</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-additive")}>식품첨가물</button>
                    <button className="ghost-btn" onClick={() => fillSample("compound-additive")}>복방첨가물</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-claim")}>권장·강조</button>
                    <button className="ghost-btn" onClick={() => fillSample("health-food")}>건강식품</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-contact")}>포장재</button>
                    <button className="ghost-btn" onClick={() => fillSample("food-clean")}>식품 통과</button>
                  </div>
                </div>
              </details>

              <details className="optional-section">
                <summary>
                  <Ship size={16} />
                  통관 자료도 있으면 추가
                  <small>HS/CCC, 원산지, 수입자, 인보이스</small>
                </summary>
              <div className="form-section">
                <div className="section-title">
                  <Ship size={16} />
                  <span>수출입·통관 정보</span>
                </div>
                <div className="two-col">
                  <label className="field">
                    <span>원산지</span>
                    <input value={input.origin} onChange={(event) => updateInput("origin", event.target.value)} placeholder="대한민국" />
                  </label>
                  <label className="field">
                    <span>제조사/수입자</span>
                    <input value={input.manufacturer} onChange={(event) => updateInput("manufacturer", event.target.value)} placeholder="제조사, 대만 수입자" />
                  </label>
                </div>

                <div className="two-col">
                  <label className="field">
                    <span>HS/CCC 코드 (선택)</span>
                    <input value={input.hsCode ?? ""} onChange={(event) => updateInput("hsCode", event.target.value)} placeholder="예: 3304.99 / 1905.90" />
                  </label>
                  <label className="field">
                    <span>거래조건 Incoterms (선택)</span>
                    <input value={input.incoterms ?? ""} onChange={(event) => updateInput("incoterms", event.target.value)} placeholder="예: DAP Taipei / CIF Keelung" />
                  </label>
                </div>

                <div className="two-col">
                  <label className="field">
                    <span>출하 목적 (선택)</span>
                    <input value={input.shipmentPurpose ?? ""} onChange={(event) => updateInput("shipmentPurpose", event.target.value)} placeholder="상업 판매, 샘플, 데모, 시험용" />
                  </label>
                  <label className="field">
                    <span>인보이스 가액 USD (선택)</span>
                    <input value={input.invoiceValue} onChange={(event) => updateInput("invoiceValue", event.target.value)} placeholder="4200" />
                  </label>
                </div>
              </div>
              </details>
                </>
              )}
            </section>

            {!showResultPane && (
              <aside className="intake-side-panel" aria-label="검토 다음 작업 패널">
                <div className="intake-side-head">
                  <ShieldCheck size={18} />
                  <div>
                    <b>검토 준비</b>
                    <span>본문의 3가지 필수 입력을 먼저 채우면 1차 검토가 열립니다.</span>
                  </div>
                </div>

                <div className="intake-side-cta">
                  <button className="ghost-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} /> 파일 첨부
                  </button>
                  <small>{uploadedFiles.length > 0 ? `${uploadedFiles.length}개 파일 연결됨` : "라벨/PDF가 있으면 먼저 올리고, 없으면 아래 입력칸에 붙여넣어도 됩니다."}</small>
                </div>

                <details className="intake-side-tools">
                  <summary>
                    <Search size={15} />
                    성분·규정 검색
                  </summary>
                  <form className="intake-inline-search intake-side-search" onSubmit={(event) => { event.preventDefault(); openKnowledgeSearch(); }}>
                    <Search size={15} />
                    <input
                      value={startKnowledgeQuery}
                      onChange={(event) => setStartKnowledgeQuery(event.target.value)}
                      placeholder="성분명, 표시문구, TFDA 용어, HS/CCC 코드"
                      aria-label="성분 또는 규정 검색"
                    />
                    <button type="submit">검색</button>
                  </form>
                </details>

                <details className="intake-side-tools">
                  <summary>
                    <ClipboardCheck size={15} />
                    샘플로 보기
                  </summary>
                  <div className="intake-side-samples" aria-label="첫 사용자 샘플">
                    <button type="button" onClick={() => fillSample("risky")}>화장품 샘플</button>
                    <button type="button" onClick={() => fillSample("food-risky")}>식품 샘플</button>
                    <button type="button" onClick={() => fillSample("food-import")}>통관 샘플</button>
                  </div>
                </details>

                <div className="intake-side-note">
                  <b>룰셋 TW-COS / TW-FOOD</b>
                  <span>기준일 {nowTime()} · 공식 근거와 용어 별칭을 함께 연결합니다.</span>
                </div>
              </aside>
            )}

            {showResultPane && (
            <section className="result-pane">
              {isAnalyzing && <Analyzing />}
              {result && visibleStatus && currentActionPlan && (
                <>
                  <div className={`verdict ${visibleStatus.tone}`}>
                    <div className="verdict-copy">
                      <div className="report-meta">
                        <em>대만 {productFamilyLabel(input.productType)} 리포트</em>
                        <em>{input.productName || "미지정 제품"}</em>
                        <em>{formatReportDate(result.generatedAt)}</em>
                      </div>
                      <h2>{result.summary.fail + result.summary.warn + result.summary.needsInfo}건만 확인하면 출고 판단에 가까워집니다</h2>
                      <p>자동 판정 점수 {result.score}점</p>
                    </div>
                    <div className="verdict-status-card">
                      <small>출고 판단</small>
                      <strong>{visibleStatus.label}</strong>
                      <span>{currentActionPlan.nextAction}</span>
                      <span className="verdict-rule">룰셋 {result.ruleVersion}</span>
                    </div>
                  </div>

                  <ResultFocusPanel
                    actionPlan={currentActionPlan}
                    findings={result.findings}
                    onSelect={openResultDetails}
                    onExpert={() => setShowExpertModal(true)}
                    onLogistics={() => setShowLogisticsModal(true)}
                  />

                  <details className="result-secondary-drawer" open={showResultDetails} onToggle={(event) => setShowResultDetails(event.currentTarget.open)}>
                    <summary>
                      <BookOpen size={15} />
                      전체 근거와 세부 항목 보기
                    </summary>

                    <div className="report-toolbar">
                      <div className="toolbar-title">
                        <b>검토 항목</b>
                        <small>{filter === "all" ? "처리 필요한 항목만 먼저 표시합니다." : `${statusCopy[filter as ReviewStatus]?.label ?? "선택 항목"} 필터 적용 중`}</small>
                      </div>
                      <div className="toolbar-actions">
                        <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")}>
                          <Filter size={15} /> 처리 항목
                        </button>
                      </div>
                    </div>

                    <div className="findings">
                      {visibleFindings.map((finding) => (
                        <FindingRow
                          key={finding.id}
                          finding={finding}
                          expanded={expandedFinding === finding.id}
                          onToggle={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                          onAsk={() => void askAssistant(finding)}
                        />
                      ))}
                      {visibleFindings.length === 0 && (
                        <div className="result-detail-empty">
                          <ShieldCheck size={18} />
                          <b>기본 처리 항목이 없습니다</b>
                          <span>통과 항목과 버전 근거는 아래 보조 섹션에서 확인할 수 있습니다.</span>
                        </div>
                      )}
                    </div>

                    {remainingFindings.length > 0 && (
                      <details className="finding-more-drawer">
                        <summary>
                          <BookOpen size={15} />
                          숨은 검토 항목 {remainingFindings.length}개 더 보기
                        </summary>
                        <div className="findings">
                          {remainingFindings.map((finding) => (
                            <FindingRow
                              key={finding.id}
                              finding={finding}
                              expanded={expandedFinding === finding.id}
                              onToggle={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                              onAsk={() => void askAssistant(finding)}
                            />
                          ))}
                        </div>
                      </details>
                    )}

                    <details className="result-workflow-drawer">
                      <summary>
                        <Filter size={15} />
                        판정 수치 보기
                      </summary>
                      <div className="metric-grid">
                        <Metric tone="danger" value={result.summary.fail} label="위반" onClick={() => setFilter("fail")} />
                        <Metric tone="info" value={result.summary.needsInfo} label="자료 필요" onClick={() => setFilter("needs_info")} />
                        <Metric tone="warn" value={result.summary.warn} label="주의" onClick={() => setFilter("warn")} />
                        <Metric tone="pass" value={result.summary.pass} label="통과" onClick={() => setFilter("pass")} />
                      </div>
                    </details>

                    <details className="result-workflow-drawer">
                      <summary>
                        <ClipboardCheck size={15} />
                        담당자별 실행 흐름 보기
                      </summary>
                      <ExecutionConsole
                        findings={result.findings}
                        onSelect={openResultDetails}
                      />

                      <ActionPlanPanel
                        actionPlan={currentActionPlan}
                        onSelect={openResultDetails}
                        onExpert={() => setShowExpertModal(true)}
                      />
                    </details>

                    <details className="report-details-drawer">
                      <summary>
                        <BookOpen size={15} />
                        근거·버전 묶음
                      </summary>
                      <ReportVersionStrip result={result} actionPlan={currentActionPlan} input={input} />
                    </details>

                    <details className="report-details-drawer">
                      <summary>
                        <History size={15} />
                        리포트 처리 순서
                      </summary>
                      <div className="report-footer">
                        <div className="report-footer-head">
                          <div>
                            <b>체크리스트와 근거 묶음을 같은 버전으로 보관</b>
                            <span>출고 전에는 조성표, 수입자 자료, 최종 라벨 파일을 같은 버전으로 맞춥니다.</span>
                          </div>
                        </div>
                        <div className="report-footer-flow">
                          <span><ClipboardCheck size={13} /> 체크리스트 확정</span>
                          <span><RefreshCw size={13} /> 수정본 재검토</span>
                          <span><UserRoundCheck size={13} /> 전문가 검수</span>
                          <span><History size={13} /> PDF/버전 보관</span>
                        </div>
                        <p>이 리포트는 공식 소스와 룰셋 기반의 1차 검토 초안입니다.</p>
                      </div>
                    </details>
                  </details>
                </>
              )}
            </section>
            )}
          </div>
          )}
          </>
        )}

        {screen === "products" && (
          <ProductsScreen
            savedReviews={savedReviews}
            onOpen={(review) => { setInput(review.input); setResult(review.result); setScreen("review"); }}
            onRecheck={(review) => void runReview(review.input)}
          />
        )}
        {screen === "updates" && <UpdatesScreen onSelect={setSelectedSource} selectedSource={selectedSource} />}
        {screen === "partners" && <PartnersScreen onExpert={() => setShowExpertModal(true)} onLogistics={() => setShowLogisticsModal(true)} />}
      </section>

      {showWorkPanel && (
      <aside className="work-panel" aria-label="LabelPass 작업 패널">
        <div className="work-panel-section work-panel-head">
          <span><ClipboardCheck size={18} /></span>
          <div>
            <b>{result ? "작업 패널" : "오늘의 업무"}</b>
            <small>{result ? "위험도, 수정안, 근거, 승인 요청을 한 자리에서 처리합니다." : "검토 전에도 사용할 수 있는 기능을 항상 보여줍니다."}</small>
          </div>
        </div>

        <div className="work-panel-section">
          <div className="work-section-title">
            <b>{result && currentActionPlan ? "다음 행동" : "검토 대기"}</b>
            <small>{result && currentActionPlan ? currentActionPlan.nextAction : `${inputReadiness.readyCount}/${inputReadiness.total} 입력 완료`}</small>
          </div>

          {result && currentActionPlan ? (
            <div className="work-action-list">
              {workActionItems.map((item) => (
                <button key={item.id} className={`work-action ${statusTone(item.status)}`} onClick={() => openResultDetails(item.findingId)}>
                  <span>{item.owner}</span>
                  <b>{item.primaryFix}</b>
                  <small>{item.eta} · {item.impact}</small>
                </button>
              ))}
              {workActionItems.length === 0 && (
                <div className="work-empty">
                  <ShieldCheck size={17} />
                  <b>차단 항목 없음</b>
                  <small>리포트와 근거만 보관하면 됩니다.</small>
                </div>
              )}
            </div>
          ) : (
            <div className="work-action-list">
              <button className="work-action" onClick={() => fileInputRef.current?.click()}>
                <span>1</span>
                <b>라벨 자료 추가</b>
                <small>{uploadedFiles.length > 0 ? `${uploadedFiles.length}개 파일 연결됨` : "PDF, 이미지, OCR 결과"}</small>
              </button>
              <button className="work-action" onClick={() => { window.location.href = "/knowledge"; }}>
                <span>2</span>
                <b>규정 검색</b>
                <small>원료, 표시문구, 대만 규정 검색</small>
              </button>
              <button className="work-action muted" onClick={() => setToast("초안 저장은 DB 연결 후 서버 보관으로 전환됩니다.")}>
                <span>3</span>
                <b>초안 저장</b>
                <small>입력 자료와 검토 버전 보관</small>
              </button>
              <button className="work-action muted" onClick={() => setShowExpertModal(true)}>
                <span>4</span>
                <b>승인 요청 준비</b>
                <small>전문가·통관 파트너 연결</small>
              </button>
            </div>
          )}
        </div>

        <div className="work-panel-section">
          <div className="work-section-title">
            <b>{result ? "판정 요약" : "기능 범위"}</b>
            <small>{result ? `${result.score}점 · ${result.ruleVersion}` : "처음부터 가능한 작업"}</small>
          </div>
          {result && visibleStatus ? (
            <div className="work-metric-stack">
              <span className={visibleStatus.tone}><b>{visibleStatus.label}</b><small>{visibleStatus.stamp}</small></span>
              <span><b>{result.summary.fail}</b><small>위반</small></span>
              <span><b>{result.summary.needsInfo}</b><small>자료 필요</small></span>
              <span><b>{result.summary.warn}</b><small>주의</small></span>
            </div>
          ) : (
            <div className="work-scope-list">
              <span>필수 표시사항</span>
              <span>성분/알레르겐</span>
              <span>효능/클레임</span>
              <span>번체 중국어 표기</span>
              <span>경고문/금지 표현</span>
              <span>수입·통관 문서</span>
            </div>
          )}
        </div>

        <div className="work-panel-section">
          <div className="work-section-title">
            <b>근거·검색</b>
            <small>{assistantEvidence ? assistantEvidence.confidence : "검색 결과를 검토 근거로 연결"}</small>
          </div>
          {assistantEvidence ? (
            <div className="assistant-evidence-pack" aria-label="연결된 지식베이스 근거">
              <span>{assistantEvidence.confidence}</span>
              <b>{assistantEvidence.terms[0]?.canonicalName ?? assistantEvidence.query}</b>
              <small>
                {assistantEvidence.routeHints?.[0]
                  ? formatEvidenceRouteLabel(assistantEvidence.routeHints[0].routeId, assistantEvidence.routeHints[0].label)
                  : assistantEvidence.sources[0]?.title ?? "공식 소스 연결 대기"}
              </small>
            </div>
          ) : (
            <div className="source-list">
              {assistantSourceCards.map((source) => (
                <button key={source.title} onClick={() => { setSelectedSource(source); setScreen("updates"); }}>
                  <span>{source.tag}</span>
                  {source.title}
                </button>
              ))}
            </div>
          )}
          <div className="ask-row work-ask-row">
            <input value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="예: casein, 防腐劑, nutrition claim" />
            <button onClick={() => void askAssistant()} aria-label="검색 보내기" disabled={isAssistantThinking || !assistantQuestion.trim()}>
              {isAssistantThinking ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
          {showAssistantPanel && <div className="answer work-answer">{assistantAnswer}</div>}
        </div>

        <div className="work-panel-section work-panel-footer">
          <button onClick={() => setShowExpertModal(true)} disabled={!result}>
            <UserRoundCheck size={16} /> 전문가 승인
          </button>
          <button onClick={() => setShowLogisticsModal(true)}>
            <Ship size={16} /> 통관 연결
          </button>
          <button onClick={downloadReport} disabled={!result}>
            <Download size={16} /> 내보내기
          </button>
        </div>
      </aside>
      )}

      {showExpertModal && <ExpertModal onClose={() => setShowExpertModal(false)} />}
      {showLogisticsModal && <LogisticsModal onClose={() => setShowLogisticsModal(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function screenTitle(screen: Screen) {
  if (screen === "products") return "내 제품 보관함";
  if (screen === "updates") return "대만 규제 업데이트";
  return "전문가 검수와 통관 연결";
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? "nav-btn active" : "nav-btn"} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Metric({ value, label, tone, onClick }: { value: number; label: string; tone: string; onClick: () => void }) {
  return (
    <button className={`metric ${tone}`} onClick={onClick}>
      <b>{value}</b>
      <span>{label}</span>
    </button>
  );
}

function ReportVersionStrip({ result, actionPlan, input }: { result: ReviewResult; actionPlan: ReviewActionPlan; input: ReviewInput }) {
  const openItems = result.summary.fail + result.summary.needsInfo + result.summary.warn;
  const requiredDocs = actionPlan.documentChecklist.filter((doc) => doc.status === "needed" || doc.status === "review").length;

  return (
    <div className="report-version-strip" aria-label="리포트 버전과 근거 상태">
      <span>
        <History size={15} />
        <b>v1 검토 초안</b>
        <small>{formatShortDate(result.generatedAt)} · {result.ruleVersion}</small>
      </span>
      <span>
        <Database size={15} />
        <b>공식 근거 {actionPlan.evidencePack.length}개</b>
        <small>문서 확인 {requiredDocs}개 · 별칭/용어 인덱스 연결</small>
      </span>
      <span className={openItems > 0 ? "warn" : "pass"}>
        <BadgeCheck size={15} />
        <b>{openItems > 0 ? `${openItems}개 처리 후 출고` : "출고 가능"}</b>
        <small>{input.origin || "원산지 미지정"} → 대만 · {productFamilyLabel(input.productType)}</small>
      </span>
    </div>
  );
}

function StatusTile({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="status-tile">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <em>{detail}</em>
      </div>
    </div>
  );
}

function ProgressRail() {
  return (
    <div className="progress-rail">
      {flowSteps.map((step) => (
        <span key={step.label} className={step.state}>
          {step.label}
        </span>
      ))}
    </div>
  );
}

function statusIcon(status: ReviewStatus) {
  if (status === "fail") return <AlertTriangle size={18} />;
  if (status === "pass") return <Check size={18} />;
  if (status === "needs_info") return <Info size={18} />;
  return <AlertTriangle size={18} />;
}

function knowledgeQueryForFinding(finding: Finding) {
  return (finding.evidence || finding.title || finding.source).replace(/\s+/g, " ").trim();
}

function ownerForFinding(finding: Finding) {
  if (finding.area === "성분" || finding.area === "알레르겐" || finding.area === "영양표시") return "제조사";
  if (finding.area === "라벨" || finding.area === "식품표시" || finding.area === "효능표현") return "라벨 담당";
  if (finding.area === "통관") return "수입자";
  return "서류 담당";
}

function impactForFinding(finding: Finding) {
  if (finding.status === "fail") return "출고 전 수정";
  if (finding.severity === "high" || finding.severity === "높음") return "통관 일정 영향";
  if (finding.status === "needs_info") return "자료 회수 필요";
  if (finding.status === "warn") return "문구 보정";
  return "기록 보관";
}

function etaForFinding(finding: Finding) {
  if (finding.status === "fail") return "오늘";
  if (finding.severity === "high" || finding.severity === "높음") return "24h";
  if (finding.status === "needs_info") return "2-3일";
  return "검수 전";
}

function fixMetaForFinding(finding: Finding, index: number) {
  const owner = ownerForFinding(finding);
  const eta = index === 0 ? etaForFinding(finding) : finding.status === "fail" ? "1-2일" : "검수 전";
  return `${owner} · ${eta}`;
}

function orderedActionFindings(findings: Finding[]) {
  const rank: Record<ReviewStatus, number> = { fail: 0, needs_info: 1, warn: 2, pass: 3 };
  return [...findings]
    .filter((finding) => finding.status !== "pass")
    .sort((left, right) => rank[left.status] - rank[right.status]);
}

function prioritizedFindings(findings: Finding[]) {
  return orderedActionFindings(findings).slice(0, 3);
}

function ResultFocusPanel({
  actionPlan,
  findings,
  onSelect,
  onExpert,
  onLogistics
}: {
  actionPlan: ReviewActionPlan;
  findings: Finding[];
  onSelect: (findingId: string) => void;
  onExpert: () => void;
  onLogistics: () => void;
}) {
  const seenActions = new Set<string>();
  const actionItems = actionPlan.actionItems.filter((item) => {
    const key = `${item.owner}:${item.primaryFix || item.title}`.replace(/\s+/g, " ").trim();
    if (seenActions.has(key)) return false;
    seenActions.add(key);
    return true;
  }).slice(0, 3);
  const fallbackFindings = prioritizedFindings(findings);
  const hasBlockingItems = actionItems.length > 0 || fallbackFindings.length > 0;

  return (
    <div className={`result-focus-panel ${actionPlan.priority}`}>
      <div className="result-focus-head">
        <span><ArrowRight size={17} /></span>
        <div>
          <b>{hasBlockingItems ? "다음에 할 일만 먼저 보세요" : "차단 항목 없음"}</b>
          <small>{actionPlan.nextAction}</small>
        </div>
      </div>

      <div className="result-focus-list" aria-label="상위 조치 항목">
        {actionItems.length > 0 ? (
          actionItems.map((item) => (
            <button key={item.id} className={`result-focus-item ${statusTone(item.status)}`} onClick={() => onSelect(item.findingId)}>
              <span>{item.owner}</span>
              <b>{item.primaryFix}</b>
              <small>{item.eta} · {item.impact}</small>
            </button>
          ))
        ) : fallbackFindings.length > 0 ? (
          fallbackFindings.map((finding, index) => (
            <button key={finding.id} className={`result-focus-item ${statusTone(finding.status)}`} onClick={() => onSelect(finding.id)}>
              <span>{fixMetaForFinding(finding, index)}</span>
              <b>{finding.fix[0] ?? finding.title}</b>
              <small>{finding.title}</small>
            </button>
          ))
        ) : (
          <div className="result-focus-empty">
            <ShieldCheck size={18} />
            <b>출고 전 기록만 보관하세요</b>
            <small>통과 근거와 라벨 버전을 보관하면 다음 출고에 재사용할 수 있습니다.</small>
          </div>
        )}
      </div>

      <div className="result-owner-row" aria-label="담당자별 처리 항목">
        {actionPlan.ownerSummary.slice(0, 4).map((item) => (
          <span key={item.owner}>
            <UserRoundCheck size={13} />
            {item.owner} {item.count}
            {item.urgentCount > 0 ? ` · 긴급 ${item.urgentCount}` : ""}
          </span>
        ))}
        {actionPlan.ownerSummary.length === 0 && (
          <span>
            <ShieldCheck size={13} />
            담당자 회수 항목 없음
          </span>
        )}
      </div>

      <div className="result-focus-note">
        <small>승인 요청과 리포트 내보내기는 화면 상단의 고정 액션에서 처리합니다.</small>
      </div>
    </div>
  );
}

function ExecutionConsole({ findings, onSelect }: { findings: Finding[]; onSelect: (findingId: string) => void }) {
  const actions = prioritizedFindings(findings);
  const ownerCounts = actions.reduce<Record<string, number>>((acc, finding) => {
    const owner = ownerForFinding(finding);
    acc[owner] = (acc[owner] ?? 0) + 1;
    return acc;
  }, {});

  if (actions.length === 0) {
    return (
      <div className="execution-console pass-console">
        <div className="console-head">
          <span><BadgeCheck size={17} /></span>
          <div>
            <b>즉시 처리할 차단 항목 없음</b>
            <small>통과 항목은 근거 링크와 lot 문서철에 보관하면 됩니다.</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="execution-console">
      <div className="console-head">
        <span><ClipboardCheck size={17} /></span>
        <div>
          <b>지금 처리할 일 {actions.length}개</b>
          <small>{Object.entries(ownerCounts).map(([owner, count]) => `${owner} ${count}`).join(" · ")}</small>
        </div>
      </div>
      <div className="console-actions">
        {actions.map((finding) => (
          <button key={finding.id} onClick={() => onSelect(finding.id)}>
            <span>{ownerForFinding(finding)}</span>
            <b>{finding.title}</b>
            <small>{impactForFinding(finding)} · {etaForFinding(finding)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionPlanPanel({ actionPlan, onSelect, onExpert }: { actionPlan: ReviewActionPlan; onSelect: (findingId: string) => void; onExpert: () => void }) {
  const documents = actionPlan.documentChecklist.slice(0, 6);
  const actionItems = actionPlan.actionItems.slice(0, 3);
  const evidencePack = actionPlan.evidencePack.slice(0, 2);

  return (
    <div className={`action-plan-panel ${actionPlan.priority}`}>
      <div className="action-plan-head">
        <span><ClipboardCheck size={17} /></span>
        <div>
          <b>실행계획</b>
          <small>{actionPlan.nextAction}</small>
        </div>
      </div>

      <div className="owner-summary" aria-label="담당자별 처리 항목">
        {actionPlan.ownerSummary.length > 0 ? (
          actionPlan.ownerSummary.map((item) => (
            <span key={item.owner}>
              <UserRoundCheck size={13} />
              {item.owner} {item.count}
              {item.urgentCount > 0 ? ` · 긴급 ${item.urgentCount}` : ""}
            </span>
          ))
        ) : (
          <span>
            <ShieldCheck size={13} />
            즉시 회수할 자료 없음
          </span>
        )}
      </div>

      <div className="action-path" aria-label="우선순위 작업 흐름">
        {actionItems.length > 0 ? (
          actionItems.map((item) => (
            <button key={item.id} className={`action-path-card ${statusTone(item.status)}`} onClick={() => onSelect(item.findingId)}>
              <span>{item.priority}</span>
              <div>
                <b>{item.primaryFix}</b>
                <small>{item.owner} · {item.eta} · {item.impact}</small>
              </div>
            </button>
          ))
        ) : (
          <div className="action-path-empty">
            <ShieldCheck size={16} />
            <b>차단 항목 없음</b>
            <small>공식 근거와 lot 문서만 보관하면 다음 출고에 재사용할 수 있습니다.</small>
          </div>
        )}
      </div>

      <div className="document-strip" aria-label="문서 체크리스트">
        {documents.map((doc) => (
          <span key={doc.id} className={`doc-chip ${doc.tone}`}>
            <FileText size={13} />
            <b>{doc.name}</b>
            <em>{documentStatusLabel(doc.status)}</em>
          </span>
        ))}
      </div>

      {evidencePack.length > 0 && (
        <div className="evidence-pack-strip" aria-label="공식 근거 묶음">
          {evidencePack.map((source) => (
            <a key={`${source.sourceUrl}-${source.status}`} href={source.sourceUrl} target="_blank" rel="noreferrer">
              <span className={statusTone(source.status)}>{source.findingIds.length}</span>
              <div>
                <b>{source.title}</b>
                <small>{source.evidence ?? source.source}</small>
              </div>
              <ExternalLink size={14} />
            </a>
          ))}
        </div>
      )}

      <div className="plan-cta-row">
        <button className="primary-btn" onClick={onExpert}>
          <UserRoundCheck size={15} /> 전문가 검수 요청
        </button>
        <a className="ghost-btn" href="/knowledge">
          <Search size={15} /> 근거 더 찾기
        </a>
      </div>
    </div>
  );
}

function productStageForReview(review: SavedReview): ProductFilter {
  if (review.result.summary.fail > 0 || review.result.summary.needsInfo > 0 || review.result.summary.warn > 0) return "act";
  return "done";
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\.\s?/g, ".").replace(/\.$/, "");
}

function formatReportDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function productFamilyLabel(productType: string) {
  const normalized = productType.toLowerCase();
  if (normalized.includes("food") || normalized.includes("식품") || normalized.includes("snack") || normalized.includes("tea")) return "식품";
  if (normalized.includes("cosmetic") || normalized.includes("화장") || normalized.includes("cream") || normalized.includes("toner")) return "화장품";
  return "수출입";
}

function statusTone(status: ReviewStatus) {
  return statusCopy[status].tone;
}

function actionPlanForResult(result: ReviewResult) {
  return result.actionPlan ?? buildReviewActionPlan(result.findings, result.ruleVersion);
}

function documentStatusLabel(status: "ready" | "needed" | "review" | "not_applicable") {
  if (status === "ready") return "완료";
  if (status === "needed") return "필요";
  if (status === "review") return "확인";
  return "해당 없음";
}

function documentStatus(name: string, status: string, tone: string): WorkspaceDoc {
  return { name, status, tone };
}

function docsForReview(review: SavedReview): WorkspaceDoc[] {
  return actionPlanForResult(review.result).documentChecklist.map((doc) =>
    documentStatus(doc.name, documentStatusLabel(doc.status), doc.tone)
  );
}

function productTasksForReview(review: SavedReview): WorkspaceTask[] {
  const tasks = actionPlanForResult(review.result).actionItems.slice(0, 3).map((item) => ({
    owner: item.owner,
    title: item.primaryFix,
    detail: `${item.impact} · ${item.eta}`,
    tone: statusTone(item.status)
  }));

  if (tasks.length > 0) return tasks;

  return [
    {
      owner: "운영",
      title: "룰셋 변경 감시 유지",
      detail: "통과 리포트 보관",
      tone: "pass"
    }
  ];
}

function buildWorkspaceProducts(savedReviews: SavedReview[]): WorkspaceProduct[] {
  const groups = new Map<string, SavedReview[]>();
  for (const review of savedReviews) {
    const key = review.input.productName.trim() || "이름 없는 제품";
    groups.set(key, [...(groups.get(key) ?? []), review]);
  }

  const savedProducts = Array.from(groups.entries()).map(([name, reviews]) => {
    const latest = reviews[0];
    const plan = actionPlanForResult(latest.result);
    const topAction = plan.actionItems[0];
    const stage = productStageForReview(latest);
    const passCount = latest.result.summary.pass;
    const totalCount = Math.max(latest.result.findings.length, 1);
    const progress = stage === "done" ? 100 : Math.max(12, Math.round((passCount / totalCount) * 100));
    const status = statusCopy[latest.result.status];
    const versions = reviews.map((review, index) => ({
      label: `v${reviews.length - index}`,
      date: formatShortDate(review.result.generatedAt),
      status: `${statusCopy[review.result.status].label} · ${review.result.score}점`,
      tone: statusTone(review.result.status)
    }));

    return {
      id: `saved-${latest.id}`,
      name,
      category: latest.result.ruleVersion.includes("FOOD") ? "식품" : "화장품",
      market: "대만",
      stage,
      status: status.label,
      tone: status.tone,
      nextAction: plan.nextAction,
      due: topAction?.eta || "상시",
      meta: `${versions[0]?.label ?? "v1"} · 룰셋 ${latest.result.ruleVersion} · ${formatShortDate(latest.result.generatedAt)}`,
      progress,
      owner: topAction?.owner || "운영",
      review: latest,
      documents: docsForReview(latest),
      tasks: productTasksForReview(latest),
      versions,
      timeline: versions.map((version) => `${version.label} 검토 · ${version.status}`)
    } satisfies WorkspaceProduct;
  });

  const savedNames = new Set(savedProducts.map((product) => product.name));
  return [
    ...savedProducts,
    ...demoWorkspaceProducts.filter((product) => !savedNames.has(product.name))
  ];
}

function FindingRow({ finding, expanded, onToggle, onAsk }: { finding: Finding; expanded: boolean; onToggle: () => void; onAsk: () => void }) {
  const copy = statusCopy[finding.status];
  const knowledgeHref = `/knowledge?q=${encodeURIComponent(knowledgeQueryForFinding(finding))}`;
  const owner = ownerForFinding(finding);
  return (
    <article className={`finding ${copy.tone}`}>
      <button className="finding-head" onClick={onToggle}>
        <span className="finding-icon">{statusIcon(finding.status)}</span>
        <span>
          <b>{finding.title}</b>
          <small>{finding.area} · {owner} · {impactForFinding(finding)}</small>
        </span>
        <ChevronDown className={expanded ? "rotate" : ""} size={18} />
      </button>
      {expanded && (
        <div className="finding-body">
          {finding.evidence && <p className="evidence">탐지 근거: {finding.evidence}</p>}
          <div className="finding-meta">
            <span>{owner}</span>
            <span>{etaForFinding(finding)}</span>
            <span>위험도 {finding.severity}</span>
          </div>
          <p>{finding.why}</p>
          <div className="fix-list">
            {finding.fix.map((fix, index) => (
              <label className="fix-card" key={fix}>
                <input type="checkbox" />
                <span><Check size={14} /></span>
                <b>{fix}</b>
                <small>{fixMetaForFinding(finding, index)}</small>
              </label>
            ))}
          </div>
          <div className="finding-foot">
            <a href={finding.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> {finding.source}
            </a>
            <a href={knowledgeHref}>
              <Search size={15} /> 지식검색에서 보기
            </a>
            <button onClick={onAsk}>
              <MessageSquare size={15} /> 이 항목 질문
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyResult({ readiness }: { readiness: ReturnType<typeof buildInputReadiness> }) {
  const ready = readiness.canReview;

  return (
    <div className="empty-result empty-result-simple">
      <div className="empty-head">
        <span className="mini-seal">TW</span>
        <div>
          <b>{ready ? "검토 실행만 남았습니다" : "검토는 왼쪽 입력부터 시작합니다"}</b>
          <p>{ready ? "필수 자료가 준비됐습니다. 1차 검토를 실행하면 위험 항목과 다음 행동만 먼저 정리합니다." : "처음에는 제품명, 제품 유형, 성분·라벨 텍스트만 있으면 됩니다."}</p>
        </div>
      </div>

      <div className="start-path" aria-label="검토 시작 순서">
        <span className={readiness.productReady ? "done" : ""}><b>1. 품목</b><small>화장품 또는 식품</small></span>
        <span className={readiness.labelReady ? "done" : ""}><b>2. 라벨·성분</b><small>붙여넣기 또는 OCR</small></span>
        <span className={ready ? "now" : ""}><b>3. 검토</b><small>위험 항목만 리포트</small></span>
      </div>
    </div>
  );
}

function PreflightRow({ icon, title, detail, status }: { icon: React.ReactNode; title: string; detail: string; status: string }) {
  return (
    <div className="preflight-row">
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
      <em>{status}</em>
    </div>
  );
}

function GateLine({ icon, title, detail, code }: { icon: React.ReactNode; title: string; detail: string; code: string }) {
  return (
    <div className="gate-line">
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
      <em>{code}</em>
    </div>
  );
}

function Analyzing() {
  return (
    <div className="analyzing">
      <RefreshCw className="spin" size={28} />
      <h2>대만 규제 기준으로 검토 중…</h2>
      <p>성분명 정규화, 농도 대조, 라벨 필수 항목, 효능 표현 위험을 순서대로 확인합니다.</p>
      <div className="analysis-steps">
        <span>TFDA 오픈데이터 대조</span>
        <span>라벨 Article 7 점검</span>
        <span>전문가 검수 필요 구간 분리</span>
      </div>
    </div>
  );
}

function ProductsScreen({ savedReviews, onOpen, onRecheck }: { savedReviews: SavedReview[]; onOpen: (review: SavedReview) => void; onRecheck: (review: SavedReview) => void }) {
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const products = useMemo(() => buildWorkspaceProducts(savedReviews), [savedReviews]);
  const counts = {
    all: products.length,
    act: products.filter((product) => product.stage === "act").length,
    wait: products.filter((product) => product.stage === "wait").length,
    done: products.filter((product) => product.stage === "done").length
  };
  const visibleProducts = products.filter((product) => {
    const matchesFilter = productFilter === "all" || product.stage === productFilter;
    const matchesQuery = !query.trim() || `${product.name} ${product.category} ${product.nextAction}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const selectedProduct = products.find((product) => product.id === selectedId) || visibleProducts[0] || products[0];
  const readyDocs = selectedProduct.documents.filter((doc) => doc.tone === "pass").length;
  const taskKeys = selectedProduct.tasks.map((_, index) => `${selectedProduct.id}-${index}`);
  const doneTasks = taskKeys.filter((key) => checkedTasks[key]).length;

  function toggleTask(key: string) {
    setCheckedTasks((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="product-workspace">
      <section className="product-library">
        <div className="product-toolbar">
          <div>
            <span>제품 운영 큐</span>
            <h2>출고 판단 대기 {counts.act + counts.wait}개</h2>
          </div>
          <button className="ghost-btn" onClick={() => setProductFilter("act")}>
            <RefreshCw size={15} /> 재검토 대상
          </button>
        </div>

        <div className="product-ops-summary" aria-label="제품 운영 상태">
          <span><b>{counts.act}</b>오늘 조치</span>
          <span><b>{counts.wait}</b>회신 대기</span>
          <span><b>{counts.done}</b>통과 관리</span>
        </div>

        <label className="product-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제품명, 품목, 다음 할 일 검색" />
        </label>

        <div className="product-filters" aria-label="제품 상태 필터">
          <button className={productFilter === "all" ? "active" : ""} onClick={() => setProductFilter("all")}>전체 {counts.all}</button>
          <button className={productFilter === "act" ? "active" : ""} onClick={() => setProductFilter("act")}>조치 {counts.act}</button>
          <button className={productFilter === "wait" ? "active" : ""} onClick={() => setProductFilter("wait")}>대기 {counts.wait}</button>
          <button className={productFilter === "done" ? "active" : ""} onClick={() => setProductFilter("done")}>통과 {counts.done}</button>
        </div>

        <div className="product-card-list">
          <div className="product-list-head" aria-hidden="true">
            <span>상태</span>
            <span>제품</span>
            <span>다음 조치</span>
            <span>준비도</span>
          </div>
          {visibleProducts.map((product) => {
            const preparedDocs = product.documents.filter((doc) => doc.tone === "pass").length;
            return (
              <button key={product.id} className={selectedProduct.id === product.id ? "product-card active" : "product-card"} onClick={() => setSelectedId(product.id)}>
                <span className={`product-status ${product.tone}`}>{product.status}</span>
                <div className="product-row-main">
                  <b>{product.name}</b>
                  <small>{product.category} · {product.market} · 담당 {product.owner}</small>
                </div>
                <p>{product.nextAction}</p>
                <div className="product-card-foot">
                  <em>{product.due}</em>
                  <span>문서 {preparedDocs}/{product.documents.length}</span>
                  <b>{product.progress}%</b>
                </div>
              </button>
            );
          })}
          {visibleProducts.length === 0 && (
            <div className="empty-product-state">
              <Search size={18} />
              <b>검색 결과 없음</b>
              <small>다른 제품명이나 상태 필터를 선택하세요.</small>
            </div>
          )}
        </div>
      </section>

      <section className="product-detail">
        <div className="product-detail-head">
          <div>
            <span>{selectedProduct.category} · {selectedProduct.market}</span>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.meta}</p>
          </div>
          <strong className={`product-status ${selectedProduct.tone}`}>{selectedProduct.status}</strong>
        </div>

        <div className="product-progress">
          <div>
            <b>{selectedProduct.progress}%</b>
            <span>{selectedProduct.nextAction}</span>
          </div>
          <i style={{ width: `${selectedProduct.progress}%` }} />
        </div>

        <div className="product-actions">
          {selectedProduct.review && <button className="primary-btn" onClick={() => onOpen(selectedProduct.review!)}><FileText size={16} /> 최신 리포트 열기</button>}
          {selectedProduct.review && <button className="ghost-btn" onClick={() => onRecheck(selectedProduct.review!)}><RefreshCw size={16} /> 최신본 재검토</button>}
          <button className="ghost-btn" onClick={() => window.print()}><Download size={16} /> 체크리스트 내보내기</button>
        </div>

        <div className="product-kpis">
          <span><b>{selectedProduct.versions.length}</b>버전</span>
          <span><b>{readyDocs}/{selectedProduct.documents.length}</b>문서 준비</span>
          <span><b>{doneTasks}/{selectedProduct.tasks.length}</b>할 일 완료</span>
          <span><b>{selectedProduct.due}</b>다음 기한</span>
        </div>

        <div className="product-detail-grid">
          <section className="product-panel">
            <div className="panel-row-head">
              <h3>지금 할 일</h3>
              <span>{doneTasks}/{selectedProduct.tasks.length}</span>
            </div>
            <div className="todo-list">
              {selectedProduct.tasks.map((task, index) => {
                const key = `${selectedProduct.id}-${index}`;
                return (
                  <label key={key} className={checkedTasks[key] ? "todo-row done" : "todo-row"}>
                    <input checked={Boolean(checkedTasks[key])} onChange={() => toggleTask(key)} type="checkbox" />
                    <span className={`owner-chip ${task.tone}`}>{task.owner}</span>
                    <b>{task.title}</b>
                    <small>{task.detail}</small>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="product-panel">
            <div className="panel-row-head">
              <h3>수출 서류</h3>
              <span>{readyDocs}/{selectedProduct.documents.length}</span>
            </div>
            <div className="doc-list">
              {selectedProduct.documents.map((doc) => (
                <div key={doc.name} className="doc-row">
                  <FileText size={16} />
                  <b>{doc.name}</b>
                  <span className={`product-status ${doc.tone}`}>{doc.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="product-detail-grid">
          <section className="product-panel">
            <div className="panel-row-head">
              <h3>검토 이력</h3>
              <span>{selectedProduct.versions[0]?.label}</span>
            </div>
            <div className="version-list">
              {selectedProduct.versions.map((version) => (
                <div key={`${version.label}-${version.date}`} className="version-row">
                  <b>{version.label}</b>
                  <span>{version.date}</span>
                  <em className={`product-status ${version.tone}`}>{version.status}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="product-panel">
            <div className="panel-row-head">
              <h3>활동 타임라인</h3>
              <span>최근순</span>
            </div>
            <div className="product-timeline">
              {selectedProduct.timeline.map((item, index) => (
                <div key={`${item}-${index}`} className={index === 0 ? "now" : ""}>
                  <span />
                  <b>{item}</b>
                  <small>{index === 0 ? "현재" : `${index + 1}단계 전`}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function UpdatesScreen({ selectedSource, onSelect }: { selectedSource: (typeof sourceCards)[number]; onSelect: (source: (typeof sourceCards)[number]) => void }) {
  const [queueQuery, setQueueQuery] = useState("");
  const [queueStatus, setQueueStatus] = useState("all");
  const [queueSeverity, setQueueSeverity] = useState("all");
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(regulatoryUpdateQueue.items[0]?.candidate_key ?? "");
  const filteredQueueItems = useMemo(() => {
    const query = queueQuery.trim().toLowerCase();
    return regulatoryUpdateQueue.items.filter((item) => {
      if (queueStatus !== "all" && item.status !== queueStatus) return false;
      if (queueSeverity !== "all" && item.severity !== queueSeverity) return false;
      if (!query) return true;

      const haystack = [
        item.title,
        item.source_key,
        item.authority,
        item.domain,
        item.source_type,
        item.source_priority,
        item.change_type,
        item.status,
        item.severity,
        item.next_action,
        ...(item.affected_domains ?? []),
        ...(item.affected_products ?? []),
        ...(item.affected_terms ?? []).flatMap((term) => [term.term_key, term.canonical_name, term.category])
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [queueQuery, queueSeverity, queueStatus]);
  const selectedCandidate =
    filteredQueueItems.find((item) => item.candidate_key === selectedCandidateKey) ??
    filteredQueueItems[0] ??
    null;
  const queueStatusOptions = [
    { value: "all", label: "전체", count: regulatoryUpdateQueue.summary.total },
    { value: "detected", label: "변경 탐지", count: regulatoryUpdateQueue.summary.detected },
    { value: "pending_refresh", label: "캐시 갱신 대기", count: regulatoryUpdateQueue.summary.pending_refresh },
    { value: "watching", label: "상시 감시", count: regulatoryUpdateQueue.summary.watching }
  ];
  const queueSeverityOptions = [
    { value: "all", label: "전체" },
    { value: "high", label: "높음", count: regulatoryUpdateQueue.summary.high },
    { value: "medium", label: "중간", count: regulatoryUpdateQueue.summary.medium },
    { value: "low", label: "낮음", count: regulatoryUpdateQueue.summary.low }
  ];

  return (
    <div className="screen-grid updates-grid">
      <section className="detail-pane">
        <div className="update-brief">
          <div>
            <span>대만 규제 업데이트</span>
            <h2>승인 필요한 변경 큐를 먼저 처리합니다</h2>
            <p>자동 수집은 계속 돌리되, 룰셋 반영 전에는 변경 감시 큐에서 사람 승인과 영향 제품 확인을 거치도록 분리했습니다.</p>
          </div>
          <button onClick={() => onSelect(sourceCards.find((source) => source.title === "Imported food inspection regulations") || selectedSource)}>
            <RefreshCw size={16} /> 식품 수입검사 보기
          </button>
        </div>

        <div className="update-queue">
          <div className="queue-head">
            <div>
              <span>검토 큐</span>
              <h2>{filteredQueueItems.length}개 표시 · 전체 {regulatoryUpdateQueue.summary.total}개</h2>
            </div>
            <ShieldCheck size={23} />
          </div>
          <div className="queue-metrics">
            <span><b>{regulatoryUpdateQueue.summary.detected}</b>변경 탐지</span>
            <span><b>{regulatoryUpdateQueue.summary.pending_refresh}</b>캐시 갱신 대기</span>
            <span><b>{regulatoryUpdateQueue.summary.watching}</b>핵심 감시</span>
          </div>
          <div className="queue-controls">
            <label className="queue-search">
              <span className="sr-only">업데이트 후보 검색</span>
              <Search size={15} />
              <input value={queueQuery} onChange={(event) => setQueueQuery(event.target.value)} placeholder="출처, 용어, 제품 영향 검색" />
            </label>
            <div className="queue-filter-row" aria-label="업데이트 상태 필터">
              {queueStatusOptions.map((option) => (
                <button key={option.value} aria-pressed={queueStatus === option.value} className={queueStatus === option.value ? "active" : ""} type="button" onClick={() => setQueueStatus(option.value)}>
                  {option.label}{option.count !== undefined ? ` ${option.count}` : ""}
                </button>
              ))}
            </div>
            <div className="queue-filter-row" aria-label="업데이트 중요도 필터">
              {queueSeverityOptions.map((option) => (
                <button key={option.value} aria-pressed={queueSeverity === option.value} className={queueSeverity === option.value ? "active" : ""} type="button" onClick={() => setQueueSeverity(option.value)}>
                  {option.label}{option.count !== undefined ? ` ${option.count}` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="queue-list">
            {filteredQueueItems.map((item) => (
              <button
                key={item.candidate_key}
                className={selectedCandidate?.candidate_key === item.candidate_key ? `queue-item ${item.severity} active` : `queue-item ${item.severity}`}
                type="button"
                aria-pressed={selectedCandidate?.candidate_key === item.candidate_key}
                aria-controls="queue-detail-panel"
                onClick={() => setSelectedCandidateKey(item.candidate_key)}
              >
                <span>{updateStatusLabel(item.status)}</span>
                <div>
                  <b>{item.title}</b>
                  <small>{item.source_key} · {updateChangeLabel(item.change_type)}</small>
                  {item.next_action && <p>{item.next_action}</p>}
                </div>
                <em>{severityLabel(item.severity)}</em>
              </button>
            ))}
            {filteredQueueItems.length === 0 && (
              <div className="queue-empty">
                <Search size={17} />
                <b>조건에 맞는 후보가 없습니다</b>
                <small>검색어 또는 필터를 줄이면 전체 큐를 다시 볼 수 있습니다.</small>
              </div>
            )}
          </div>
        </div>

        {selectedCandidate && (
          <div className="queue-detail-panel" id="queue-detail-panel">
            <div className="queue-detail-head">
              <div>
                <span>{updateStatusLabel(selectedCandidate.status)} · {severityLabel(selectedCandidate.severity)}</span>
                <h2>{selectedCandidate.title}</h2>
                <p>{selectedCandidate.source_key} · {updateChangeLabel(selectedCandidate.change_type)}</p>
              </div>
              {selectedCandidate.source_url && (
                <a href={selectedCandidate.source_url} target="_blank" rel="noreferrer">
                  원문 <ExternalLink size={15} />
                </a>
              )}
            </div>
            <div className="queue-detail-grid">
              <span><b>탐지일</b>{formatQueueDate(selectedCandidate.detected_at)}</span>
              <span><b>캐시 만료</b>{formatQueueDate(selectedCandidate.cache_expires_at)}</span>
              <span><b>근거 길이</b>{selectedCandidate.evidence?.text_chars?.toLocaleString() ?? "미확인"}자</span>
              <span><b>수집 방식</b>{evidenceModeLabel(selectedCandidate)}</span>
            </div>
            <p>{selectedCandidate.next_action ?? "원문과 영향 용어를 확인한 뒤 승인 여부를 기록합니다."}</p>
            <div className="queue-chip-block">
              <b>영향 제품</b>
              <div>
                {(selectedCandidate.affected_products?.length ? selectedCandidate.affected_products : ["미분류"]).map((item) => (
                  <span key={`product-${item}`}>{labelForQueueValue(item)}</span>
                ))}
              </div>
            </div>
            <div className="queue-chip-block">
              <b>영향 용어</b>
              <div>
                {(selectedCandidate.affected_terms?.length ? selectedCandidate.affected_terms.slice(0, 8) : [{ canonical_name: "검토 후 연결" }]).map((term) => (
                  <span key={`term-${term.term_key ?? term.canonical_name}`}>{term.canonical_name ?? term.term_key}</span>
                ))}
              </div>
            </div>
            {selectedCandidate.evidence?.excerpt && (
              <blockquote>{compact(selectedCandidate.evidence.excerpt, 260)}</blockquote>
            )}
          </div>
        )}

        <div className="impact-matrix">
          {productImpactItems.map((item) => (
            <div key={item.title} className={`impact-tile ${item.tone}`}>
              <span>{item.badge}</span>
              <b>{item.title}</b>
              <small>{item.detail}</small>
              <em>{item.status}</em>
            </div>
          ))}
        </div>

        <div className="update-workflow">
          {updateWorkflowItems.map((item, index) => (
            <div key={item.label}>
              <span>{index + 1}</span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>

        <div className="update-feature">
          <BookOpen size={24} />
          <span>{selectedSource.tag}</span>
          <h2>{selectedSource.title}</h2>
          <p>{selectedSource.detail}</p>
          <a href={selectedSource.url} target="_blank" rel="noreferrer">
            공식 페이지 열기 <ExternalLink size={16} />
          </a>
        </div>
        <div className="timeline">
          <div><b>2026-07-01</b><span>일부 예외를 제외한 모든 화장품 PIF 의무화</span></div>
          <div><b>2025-11-06</b><span>화장품 성분 사용 제한표 개정 공고, 2027-10-01 시행</span></div>
          <div><b>상시</b><span>금지·제한·방부제·자외선차단·색소 데이터셋 증분 수집</span></div>
        </div>
      </section>

      <section className="list-pane source-library">
        <div className="source-library-head">
          <div>
            <h2>공식 자료 소스</h2>
            <p className="muted">PDF보다 오픈데이터를 우선 수집하고, 공지/법령은 변경분 리뷰 대상으로 둡니다.</p>
          </div>
          <span>{sourceCards.length}개</span>
        </div>
        <div className="source-filter-row" aria-label="소스 범위">
          <span>식품</span>
          <span>화장품</span>
          <span>통관</span>
          <span>글로벌</span>
        </div>
        <div className="source-card-list">
          {sourceCards.map((source) => (
            <button key={source.title} className={selectedSource.title === source.title ? "source-card active" : "source-card"} onClick={() => onSelect(source)}>
              <span>{source.tag}</span>
              <b>{source.title}</b>
              <small>{source.detail}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function updateStatusLabel(status: string) {
  if (status === "pending_refresh") return "캐시 갱신 대기";
  if (status === "watching") return "상시 감시";
  if (status === "detected") return "변경 탐지";
  if (status === "approved") return "승인";
  if (status === "rejected") return "보류";
  return status;
}

function formatQueueDate(value?: string | null) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "대기 중";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" }).format(date);
}

function evidenceModeLabel(candidate: RegulatoryUpdateCandidate) {
  const evidence = candidate.evidence;
  if (!evidence) return "미확인";
  if (evidence.browser_capture) return "브라우저 수집";
  if (evidence.manual_fallback) return "수동 보강";
  if (evidence.from_cache) return "캐시";
  return evidence.format ? evidence.format.toUpperCase() : "자동 수집";
}

function labelForQueueValue(value?: string) {
  const labels: Record<string, string> = {
    cosmetics: "화장품",
    food: "식품",
    import_export: "수출입",
    food_labeling: "식품 표시",
    health_food: "건강식품",
    customs: "통관",
    chemical_labeling: "화학물질 표시"
  };
  return labels[value ?? ""] ?? String(value ?? "미분류").replaceAll("_", " ");
}

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function updateChangeLabel(changeType: string) {
  if (changeType === "source_expiring_soon") return "캐시 만료 예정";
  if (changeType === "baseline_watch") return "핵심 소스 상시 감시";
  if (changeType === "content_changed") return "원문 해시 변경";
  if (changeType === "fetch_or_parse_regressed") return "수집 품질 저하";
  if (changeType === "source_stale") return "소스 만료";
  if (changeType === "fetch_failed") return "수집 실패";
  return changeType;
}

function severityLabel(severity: string) {
  if (severity === "high") return "높음";
  if (severity === "medium") return "중간";
  if (severity === "low") return "낮음";
  return severity;
}

function PartnersScreen({ onExpert, onLogistics }: { onExpert: () => void; onLogistics: () => void }) {
  return (
    <div className="partner-grid">
      <section className="partner-card">
        <UserRoundCheck size={24} />
        <h2>전문가 검수</h2>
        <p>AI 1차 리포트에서 위반·자료필요 항목만 묶어 전문가에게 전달합니다. 수익화는 이 지점이 가장 자연스럽습니다.</p>
        <button className="primary-btn" onClick={onExpert}>견적 카드 열기</button>
      </section>
      <section className="partner-card">
        <Ship size={24} />
        <h2>통관·물류</h2>
        <p>라벨/서류 체크 이후 인보이스, 박스 수, 총중량, CBM을 받아 파트너 3사 견적 비교로 연결합니다.</p>
        <button className="primary-btn" onClick={onLogistics}>견적 요청 열기</button>
      </section>
      <section className="partner-card">
        <ShieldCheck size={24} />
        <h2>보안 원칙</h2>
        <p>조성표와 PIF는 영업비밀입니다. MVP부터 사용자별 접근권한, 감사로그, 삭제 정책을 전제로 설계합니다.</p>
        <button className="ghost-btn">NDA 템플릿 확인</button>
      </section>
    </div>
  );
}

function ExpertModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal">
        <button className="close-btn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        <h2>전문가 검수 요청</h2>
        <p>리포트 전체 검수와 위반 항목 긴급 검수를 선택할 수 있습니다. 실제 결제 연동 전까지는 견적 카드 형태로 동작합니다.</p>
        <div className="quote-grid">
          <button><b>위반 항목 긴급 검수</b><span>₩90,000~ · 24시간</span></button>
          <button><b>리포트 전체 검수</b><span>₩180,000~ · 2영업일</span></button>
          <button><b>PIF 준비도 체크</b><span>₩250,000~ · 자료 목록 확인</span></button>
        </div>
        <div className="chat-preview">
          <b>김O정 규제 전문가</b>
          <span>리포트와 라벨 OCR을 자동 공유하고, 채팅에서 추가 자료를 요청합니다.</span>
        </div>
      </section>
    </div>
  );
}

function LogisticsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal">
        <button className="close-btn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        <h2>통관·물류 견적 요청</h2>
        <p>대만 수입 전 라벨/서류 체크가 끝난 건만 물류 견적으로 넘기는 흐름입니다.</p>
        <div className="logistics-grid">
          <span><PackageCheck size={17} /> 부산 → 지룽(基隆)</span>
          <span><FlaskConical size={17} /> 화장품 샘플/상업 송장</span>
          <span><History size={17} /> 예상 리드타임 7~12일</span>
        </div>
        <button className="primary-btn" onClick={onClose}>파트너 3사 비교 요청</button>
      </section>
    </div>
  );
}
