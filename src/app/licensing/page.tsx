"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, UserCheck } from "lucide-react";
import { licensingCategories, licensingTierCopy, requiredDocuments } from "@/lib/licensing-documents";

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

export default function LicensingPage() {
  const [activeId, setActiveId] = useState(licensingCategories[0].id);
  const [checked, setChecked] = useState<CheckedMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setChecked(readChecked());
    setLoaded(true);
  }, []);

  const category = useMemo(() => licensingCategories.find((item) => item.id === activeId) ?? licensingCategories[0], [activeId]);
  const activeChecked = checked[activeId] ?? [];
  const required = requiredDocuments(category);
  const requiredReady = required.filter((document) => activeChecked.includes(document.id)).length;

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

  return (
    <section className="lpv5 licensing">
      <div className="licensing-head">
        <span className="licensing-head-badge" aria-hidden="true">
          <FileText size={18} />
        </span>
        <div>
          <h1>대만 인허가 서류 리스트</h1>
          <p className="sub">
            품목별로 필요한 서류를 공식 명칭·규격과 함께 정리했습니다. 준비 상태를 체크하고, 전문가에게 검토를 넘기거나 PIF 신청으로 이어가세요.
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
            onClick={() => setActiveId(item.id)}
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
            {loaded ? requiredReady : "—"}/{required.length}
          </b>
          <span>필수 서류 준비</span>
        </div>
      </div>

      <div className="licensing-list">
        {category.documents.map((document) => {
          const tier = licensingTierCopy[document.tier];
          const isChecked = activeChecked.includes(document.id);
          return (
            <label key={document.id} className={`licensing-doc${isChecked ? " ready" : ""}`}>
              <input type="checkbox" checked={isChecked} onChange={() => toggle(document.id)} />
              <div className="licensing-doc-body">
                <div className="licensing-doc-head">
                  <span className={`chip ${tier.tone === "danger" ? "fail" : tier.tone === "warn" ? "warn" : "navy"}`}>{tier.label}</span>
                  <b>{document.label}</b>
                  {isChecked && <CheckCircle2 size={14} className="licensing-doc-check" />}
                </div>
                <p className="licensing-doc-official">{document.officialName}</p>
                <p className="licensing-doc-spec">
                  <span>규격·형식</span>
                  {document.spec}
                </p>
                <p className="licensing-doc-detail">{document.detail}</p>
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

      <p className="licensing-foot">
        ⚠️ 서류 요건은 품목 분류·시행일·개별 제품에 따라 달라질 수 있습니다. 최종 요건은 공식 근거와 전문가 확인을 권장합니다.
      </p>
    </section>
  );
}
