"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Download, FileText, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import {
  licensingCategories,
  licensingTierCopy,
  refineRequirements,
  REFINABLE_CATEGORY_IDS,
  requiredDocuments,
  type RequirementRefinement
} from "@/lib/licensing-documents";
import { FILLABLE_TEMPLATE_IDS, filledTemplate, templateForDocument, type ReviewFillData } from "@/lib/document-templates";
import { RegGlossary } from "@/components/reg-glossary";

const STORAGE_KEY = "labelpass-licensing-checklist";

type CheckedMap = Record<string, string[]>;

function readChecked(): CheckedMap {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as CheckedMap) : {};
  } catch {
    return {};
  }
}

function loadLastReview(): ReviewFillData | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem("labelpass-reviews") || "[]");
    const input = Array.isArray(parsed) ? parsed[0]?.input : null;
    if (input) {
      return {
        productName: input.productName ?? "",
        productType: input.productType ?? "",
        manufacturer: input.manufacturer ?? "",
        origin: input.origin ?? "",
        ingredientsText: input.ingredientsText ?? "",
        // labelText carried via ingredientsText+labelText for refinement below
        brandName: input.productName ?? ""
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function downloadTemplate(documentId: string, fill: ReviewFillData | null) {
  const template = fill && (FILLABLE_TEMPLATE_IDS as readonly string[]).includes(documentId)
    ? filledTemplate(documentId, fill)
    : templateForDocument(documentId);
  if (!template || typeof window === "undefined") return;
  const blob = new Blob([template.content], { type: template.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = template.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function LicensingPage() {
  const [activeId, setActiveId] = useState(licensingCategories[0].id);
  const [checked, setChecked] = useState<CheckedMap>({});
  const [loaded, setLoaded] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refinements, setRefinements] = useState<RequirementRefinement[]>([]);
  const [refined, setRefined] = useState(false);
  const [reviewFill, setReviewFill] = useState<ReviewFillData | null>(null);

  useEffect(() => {
    setChecked(readChecked());
    setLoaded(true);
  }, []);

  const category = useMemo(() => licensingCategories.find((item) => item.id === activeId) ?? licensingCategories[0], [activeId]);
  const isRefinable = (REFINABLE_CATEGORY_IDS as readonly string[]).includes(category.id);
  const activeRefinements = isRefinable ? refinements : [];
  const refinementById = useMemo(() => new Map(activeRefinements.map((item) => [item.documentId, item.reason])), [activeRefinements]);

  const activeChecked = checked[activeId] ?? [];
  const baseRequired = requiredDocuments(category);
  // Docs upgraded to required for THIS product (recommended/deferrable that became required).
  const upgradedRequired = category.documents.filter(
    (document) => document.tier !== "required" && refinementById.has(document.id)
  );
  const effectiveRequired = [...baseRequired, ...upgradedRequired];
  const requiredReady = effectiveRequired.filter((document) => activeChecked.includes(document.id)).length;

  function toggle(documentId: string) {
    setChecked((prev) => {
      const current = prev[activeId] ?? [];
      const nextForCategory = current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId];
      const next = { ...prev, [activeId]: nextForCategory };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence errors
      }
      return next;
    });
  }

  function runRefine() {
    setRefinements(refineRequirements(activeId, { ingredientsText: refineText, labelText: refineText }));
    setRefined(true);
  }

  function loadReview() {
    const fill = loadLastReview();
    setReviewFill(fill);
    let labelText = "";
    try {
      const parsed = JSON.parse(window.localStorage.getItem("labelpass-reviews") || "[]");
      labelText = Array.isArray(parsed) ? parsed[0]?.input?.labelText ?? "" : "";
    } catch {
      labelText = "";
    }
    if (fill) {
      const ingredientsText = fill.ingredientsText ?? "";
      setRefineText([ingredientsText, labelText].filter(Boolean).join("\n"));
      setRefinements(refineRequirements(activeId, { ingredientsText, labelText }));
    } else {
      setRefinements([]);
    }
    setRefined(true);
  }

  return (
    <section className="lpv5 licensing">
      <div className="licensing-head">
        <span className="licensing-head-badge" aria-hidden="true">
          <FileText size={18} />
        </span>
        <div>
          <h1>대만 인허가 서류 리스트</h1>
          <p className="sub">
            품목별 필요 서류를 공식 명칭·규격과 함께 정리했습니다. 제품 성분·라벨을 넣으면 어떤 권장 서류가 이 제품엔 필수인지도 알려드립니다.
          </p>
        </div>
      </div>

      <div className="licensing-tabs" role="tablist" aria-label="인허가 품목">
        {licensingCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            className={item.id === activeId ? "on" : ""}
            onClick={() => {
              setActiveId(item.id);
              setRefinements([]);
              setRefined(false);
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="card licensing-summary">
        <div>
          <b>{category.label}</b>
          <p>{category.summary}</p>
          <small>주무기관 · {category.authority}</small>
        </div>
        <div className="licensing-readiness">
          <b>
            {loaded ? requiredReady : "—"}/{effectiveRequired.length}
          </b>
          <span>필수 서류 준비</span>
        </div>
      </div>

      {isRefinable && (
        <div className="card licensing-refine">
          <div className="licensing-refine-title">
            <Sparkles size={15} />
            제품 데이터로 정밀 판정 (선택) — 권장 서류가 이 제품엔 필수인지 확인
          </div>
          <div className="licensing-refine-body">
            <textarea
              value={refineText}
              onChange={(event) => setRefineText(event.target.value)}
              placeholder="전성분(함량 포함)과 라벨·효능 문구를 붙여넣으세요. 예: Water, Glycerin, Triclosan 0.5% ... / 美白 토너, 유효기한 2028"
              rows={4}
            />
            <div className="licensing-refine-actions">
              <button className="btn btn-primary btn-sm" type="button" onClick={runRefine} disabled={!refineText.trim()}>
                <Sparkles size={14} />
                정밀 판정
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={loadReview}>
                최근 검토 결과 불러오기
              </button>
            </div>
            {refined && (
              <p className="licensing-refine-result">
                {activeRefinements.length > 0
                  ? `이 제품 기준으로 권장 서류 ${activeRefinements.length}건이 필수로 상향됐습니다. 아래에서 확인하세요.`
                  : "이 제품 기준으로 추가 상향된 필수 서류는 없습니다. 기본 필수 항목을 준비하세요."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="licensing-list">
        {category.documents.map((document) => {
          const tier = licensingTierCopy[document.tier];
          const isChecked = activeChecked.includes(document.id);
          const upgradeReason = refinementById.get(document.id);
          const upgraded = Boolean(upgradeReason) && document.tier !== "required";
          const template = templateForDocument(document.id);
          return (
            <label key={document.id} className={`licensing-doc${isChecked ? " ready" : ""}${upgraded ? " upgraded" : ""}`}>
              <input type="checkbox" checked={isChecked} onChange={() => toggle(document.id)} />
              <div className="licensing-doc-body">
                <div className="licensing-doc-head">
                  {upgraded ? (
                    <span className="chip fail">필수(제품 기준)</span>
                  ) : (
                    <span className={`chip ${tier.tone === "danger" ? "fail" : tier.tone === "warn" ? "warn" : "navy"}`}>{tier.label}</span>
                  )}
                  <b>{document.label}</b>
                  {isChecked && <CheckCircle2 size={14} className="licensing-doc-check" />}
                  {template && (
                    <button
                      type="button"
                      className="licensing-template-btn"
                      onClick={(event) => {
                        event.preventDefault();
                        downloadTemplate(document.id, reviewFill);
                      }}
                    >
                      <Download size={13} />
                      {reviewFill && (FILLABLE_TEMPLATE_IDS as readonly string[]).includes(document.id)
                        ? "양식 (검토값 채움)"
                        : "양식 다운로드"}
                    </button>
                  )}
                </div>
                <p className="licensing-doc-official">{document.officialName}</p>
                <p className="licensing-doc-spec">
                  <span>규격·형식</span>
                  {document.spec}
                </p>
                <p className="licensing-doc-detail">{document.detail}</p>
                {upgraded && <p className="licensing-doc-upgrade">↑ {upgradeReason}</p>}
                <small className="licensing-doc-auth">{document.authority}</small>
              </div>
            </label>
          );
        })}
      </div>

      <div className="licensing-actions">
        {category.id === "cosmetic-pif" && (
          <Link className="btn btn-primary" href="/workspace/pif">
            <ShieldCheck size={16} />
            PIF 신청으로 첨부
          </Link>
        )}
        <Link className="btn btn-ghost" href="/workspace/experts">
          <UserCheck size={16} />
          전문가에게 서류 검토 요청
        </Link>
        <Link className="btn btn-ghost" href="/knowledge">
          공식 근거 검색
          <ArrowRight size={15} />
        </Link>
      </div>

      <RegGlossary />

      <p className="licensing-foot">
        ⚠️ 서류 요건은 품목 분류·시행일·개별 제품에 따라 달라질 수 있습니다. 정밀 판정은 참고용이며, 최종 요건은 공식 근거와 전문가 확인을 권장합니다.
      </p>
    </section>
  );
}
