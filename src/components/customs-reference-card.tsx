"use client";

import { useState } from "react";
import { Landmark, PackageSearch, ShieldAlert, Stamp } from "lucide-react";
import {
  CUSTOMS_BUSINESS_TAX,
  customsReferenceByDomain,
  type CustomsDomain
} from "@/lib/customs-reference";

const domainTabs: Array<{ id: CustomsDomain | "all"; label: string }> = [
  { id: "all", label: "전체" },
  { id: "cosmetic", label: "화장품" },
  { id: "food", label: "식품" },
  { id: "health-food", label: "건강기능식품" }
];

export function CustomsReferenceCard() {
  const [domain, setDomain] = useState<CustomsDomain | "all">("all");
  const entries = customsReferenceByDomain(domain);

  return (
    <section className="lpv5 customs-ref">
      <div className="customs-ref-head">
        <span className="customs-ref-badge" aria-hidden="true">
          <Landmark size={18} />
        </span>
        <div>
          <h1>대만 통관 참고 — HS/CCC · 수입규정 · 세율 · 검역</h1>
          <p className="sub">
            자주 수출하는 품목별로 국제 HS·대표 CCC 코드, 수입규정, 수입검사·검역, 세율, 필수 서류를 정리했습니다.
          </p>
        </div>
      </div>

      <div className="customs-ref-note">
        <ShieldAlert size={15} />
        <p>
          <b>참고용입니다.</b> 실제 11자리 CCC 코드·수입규정 코드·관세율은 제품마다 다르며, 관세청{" "}
          <b>관세율 조회</b> 시스템 또는 관세사 확인이 필요합니다. {CUSTOMS_BUSINESS_TAX}
        </p>
      </div>

      <div className="customs-ref-co">
        <b>원산지증명(C/O)</b> — 대만 일반 수입에는 필수가 아니지만, <b>ECFA 등 협정 특혜관세</b>를 적용받으려면
        특혜 원산지증명이 필요합니다. 비특혜 C/O는 바이어 요구·품목별로 요구될 수 있어 계약 전 확인하세요.
      </div>

      <div className="customs-ref-tabs" role="tablist" aria-label="품목 도메인">
        {domainTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === domain}
            className={tab.id === domain ? "on" : ""}
            onClick={() => setDomain(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="customs-ref-list">
        {entries.map((entry) => (
          <article key={entry.id} className="card customs-ref-item">
            <div className="customs-ref-item-head">
              <div>
                <b>{entry.product}</b>
                <span className="customs-ref-examples">{entry.examples}</span>
              </div>
              <div className="customs-ref-codes">
                <span className="chip navy">HS {entry.hs6}</span>
                <span className="chip gray">대표 예시 CCC {entry.cccExample}</span>
              </div>
            </div>

            <div className="customs-ref-grid">
              <div>
                <span className="customs-ref-k">
                  <PackageSearch size={12} /> 수입규정
                </span>
                <ul>
                  {entry.importRules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="customs-ref-k">
                  <Stamp size={12} /> 수입검사·검역
                </span>
                <p>{entry.inspection}</p>
                <p className="customs-ref-quar">검역: {entry.quarantine}</p>
              </div>
              <div>
                <span className="customs-ref-k">세율</span>
                <p>{entry.dutyNote}</p>
                <p className="customs-ref-quar">영업세 {entry.businessTax}</p>
              </div>
              <div>
                <span className="customs-ref-k">필수 서류</span>
                <div className="customs-ref-docs">
                  {entry.keyDocs.map((doc) => (
                    <span key={doc} className="chip gray">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="customs-ref-notes">{entry.notes}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
