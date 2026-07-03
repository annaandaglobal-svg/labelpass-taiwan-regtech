"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Anchor,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  Handshake,
  MapPin,
  PackageCheck,
  Plane,
  Send,
  Ship,
  Truck
} from "lucide-react";
import { LogisticsMap } from "@/components/logistics-map";
import type {
  PlatformLogisticsCompanyRow,
  PlatformShipmentEventRow,
  PlatformShipmentRequestRow,
  PlatformShipmentRow
} from "@/lib/platform-ops-store";
import {
  LOGISTICS_REQUESTS_STORAGE_KEY,
  MAX_LOGISTICS_REQUESTS,
  logisticsRequestStatusLabels,
  parseLogisticsRequests,
  type LogisticsRequestDraft
} from "@/lib/logistics-request-drafts";

const stateLabels: Record<string, string> = {
  requested: "요청",
  quoted: "견적",
  accepted: "수락",
  booked: "예약",
  in_transit: "운송중",
  customs_hold: "통관 보류",
  delivered: "도착",
  cancelled: "취소"
};

const customsStages = ["서류 준비", "수출 신고", "운송", "수입검사·통관", "반출·배송"] as const;

function customsStageIndex(state: PlatformShipmentRow["state"]) {
  if (state === "requested" || state === "quoted" || state === "accepted") return 0;
  if (state === "booked") return 1;
  if (state === "in_transit") return 2;
  if (state === "customs_hold") return 3;
  return 4;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type LogisticsClientProps = {
  shipments: PlatformShipmentRow[];
  shipmentEvents: PlatformShipmentEventRow[];
  shipmentRequests: PlatformShipmentRequestRow[];
  logisticsCompanies: PlatformLogisticsCompanyRow[];
  storageNote: string;
};

export function LogisticsClient({ shipments, shipmentEvents, shipmentRequests, logisticsCompanies, storageNote }: LogisticsClientProps) {
  const [selectedReference, setSelectedReference] = useState<string | null>(shipments[0]?.reference ?? null);
  const [requests, setRequests] = useState<LogisticsRequestDraft[]>([]);
  const [productName, setProductName] = useState("");
  const [originPort, setOriginPort] = useState("PUS");
  const [destinationPort, setDestinationPort] = useState("KEL");
  const [mode, setMode] = useState<"ocean" | "air">("ocean");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setRequests(parseLogisticsRequests(window.localStorage.getItem(LOGISTICS_REQUESTS_STORAGE_KEY)));
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    if (product?.trim()) setProductName(product.trim());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedShipment = useMemo(
    () => shipments.find((item) => item.reference === selectedReference) ?? null,
    [shipments, selectedReference]
  );

  function submitRequest() {
    if (!productName.trim()) {
      setToast("제품명을 입력해주세요.");
      return;
    }
    const request: LogisticsRequestDraft = {
      id: newId(),
      createdAt: new Date().toISOString(),
      productName: productName.trim(),
      originPort,
      destinationPort,
      mode,
      note: note.trim(),
      status: "requested"
    };
    const next = [request, ...requests].slice(0, MAX_LOGISTICS_REQUESTS);
    setRequests(next);
    window.localStorage.setItem(LOGISTICS_REQUESTS_STORAGE_KEY, JSON.stringify(next));
    setProductName("");
    setNote("");
    setToast("물류사 매칭 요청을 저장했습니다. 운영팀이 견적 가능한 물류사를 연결합니다.");
  }

  return (
    <section className="lp-main workspace-main logi-main">
      <header className="workspace-topbar">
        <div>
          <p>물류·선적 트래킹</p>
          <h1>선적 상태, 통관 단계, 서류 상태를 항로 지도와 타임라인으로 확인하세요.</h1>
        </div>
        <div className="workspace-topbar-actions">
          <Link className="workspace-button" href="/workspace">
            <ClipboardCheck size={15} />
            워크스페이스
          </Link>
          <Link className="workspace-button" href="/workspace/experts">
            <Handshake size={15} />
            전문가 상담
          </Link>
        </div>
      </header>

      <div className="logi-layout">
        <section className="workspace-panel logi-map-panel">
          <div className="workspace-panel-head">
            <div>
              <span>항로 지도</span>
              <h2>한국 → 대만 진행 위치</h2>
            </div>
            <MapPin size={18} />
          </div>
          <LogisticsMap shipments={shipments} selectedReference={selectedReference} onSelect={setSelectedReference} />
          <div className="logi-shipment-strip" aria-label="선적 선택">
            {shipments.map((shipment) => (
              <button
                key={shipment.reference}
                type="button"
                className={`logi-shipment-chip ${shipment.state} ${shipment.reference === selectedReference ? "active" : ""}`}
                onClick={() => setSelectedReference(shipment.reference)}
              >
                {shipment.mode === "air" ? <Plane size={14} /> : <Ship size={14} />}
                <b>{shipment.reference}</b>
                <span>{stateLabels[shipment.state] ?? shipment.state}</span>
              </button>
            ))}
          </div>

          {selectedShipment && (
            <div className="logi-shipment-detail">
              <div className="logi-shipment-summary">
                <div>
                  <span>화물</span>
                  <b>{selectedShipment.product}</b>
                  <small>{selectedShipment.carrier} · {selectedShipment.vehicle} · {selectedShipment.tracking}</small>
                </div>
                <div>
                  <span>구간</span>
                  <b>{selectedShipment.route}</b>
                  <small>{selectedShipment.mode === "air" ? "항공" : "해상"} 운송</small>
                </div>
                <div>
                  <span>ETA</span>
                  <b>
                    <CalendarClock size={14} />
                    {selectedShipment.eta}
                  </b>
                  <small>{stateLabels[selectedShipment.state] ?? selectedShipment.state}</small>
                </div>
              </div>
              <div className="logi-customs-rail" aria-label="통관 단계">
                {customsStages.map((stage, index) => {
                  const activeIndex = customsStageIndex(selectedShipment.state);
                  const tone = index < activeIndex ? "done" : index === activeIndex ? (selectedShipment.state === "customs_hold" ? "hold" : "now") : "";
                  return (
                    <span key={stage} className={`logi-customs-step ${tone}`}>
                      {stage}
                    </span>
                  );
                })}
              </div>
              <p className="logi-docs-note">
                <FileCheck2 size={14} />
                서류 상태: {selectedShipment.customs}
              </p>
            </div>
          )}
        </section>

        <aside className="logi-side">
          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>물류사 매칭</span>
                <h2>새 운송 요청</h2>
              </div>
              <Truck size={18} />
            </div>
            <div className="pif-form">
              <label className="lp-field">
                <span>제품·화물 *</span>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="예: Cica Barrier Cream 1st 선적분" />
              </label>
              <div className="logi-route-fields">
                <label className="lp-field">
                  <span>출발</span>
                  <select value={originPort} onChange={(event) => setOriginPort(event.target.value)}>
                    <option value="PUS">부산 PUS</option>
                    <option value="ICN">인천 ICN</option>
                  </select>
                </label>
                <label className="lp-field">
                  <span>도착</span>
                  <select value={destinationPort} onChange={(event) => setDestinationPort(event.target.value)}>
                    <option value="KEL">기륭 KEL</option>
                    <option value="TPE">타이베이 TPE</option>
                    <option value="KHH">가오슝 KHH</option>
                  </select>
                </label>
                <label className="lp-field">
                  <span>운송</span>
                  <select value={mode} onChange={(event) => setMode(event.target.value === "air" ? "air" : "ocean")}>
                    <option value="ocean">해상</option>
                    <option value="air">항공</option>
                  </select>
                </label>
              </div>
              <label className="lp-field">
                <span>요청 메모</span>
                <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="수량, 희망 일정, 냉장 여부 등을 남겨주세요." />
              </label>
              <button className="lp-button" type="button" onClick={submitRequest}>
                <Send size={15} />
                물류사 매칭 요청
              </button>
              {requests.length > 0 && (
                <div className="logi-request-list" aria-label="내 물류 요청">
                  {requests.map((request) => (
                    <span key={request.id}>
                      {request.mode === "air" ? <Plane size={13} /> : <Anchor size={13} />}
                      <b>{request.productName}</b>
                      <small>
                        {request.originPort} → {request.destinationPort} · {logisticsRequestStatusLabels[request.status]}
                      </small>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>운영 큐</span>
                <h2>진행 중 물류 요청</h2>
              </div>
              <PackageCheck size={18} />
            </div>
            <div className="logi-ops-list">
              {shipmentRequests.map((request) => (
                <div key={request.id} className={`logi-ops-row ${request.state}`}>
                  <b>{request.product}</b>
                  <span>{request.lane} · {stateLabels[request.state] ?? request.state}</span>
                  <small>{request.next}</small>
                </div>
              ))}
            </div>
            <small className="experts-chat-note">{storageNote}</small>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>파트너</span>
                <h2>연결 가능한 물류사</h2>
              </div>
              <Ship size={18} />
            </div>
            <div className="logi-partner-list">
              {logisticsCompanies.map((company) => (
                <div key={company.name} className={`logi-partner-row ${company.status}`}>
                  <b>{company.name}</b>
                  <span>{company.lane} · {company.modes.map((m) => (m === "air" ? "항공" : "해상")).join("/")}</span>
                  <small>{company.strengths}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="workspace-panel logi-timeline-panel">
          <div className="workspace-panel-head">
            <div>
              <span>트래킹 타임라인</span>
              <h2>최근 선적 이벤트</h2>
            </div>
            <CalendarClock size={18} />
          </div>
          <div className="logi-timeline">
            {shipmentEvents.map((event, index) => (
              <div key={`${event.time}-${event.title}-${index}`} className={`logi-timeline-row ${event.state}`}>
                <i />
                <div>
                  <b>{event.title}</b>
                  <span>{event.location} · {event.time}</span>
                  <small>{event.detail}</small>
                </div>
                <em>{stateLabels[event.state] ?? event.state}</em>
              </div>
            ))}
          </div>
          <Link className="workspace-wide-link" href="/workspace#shipment-events">
            워크스페이스 요약으로 돌아가기
            <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      {toast && <div className="lp-toast">{toast}</div>}
    </section>
  );
}
