"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Copy, Plus, Receipt, Shield, Trash2 } from "lucide-react";
import { encodeQuote, formatMoney, quoteTotal, type Quote, type QuoteLineItem } from "@/lib/quote";

function newId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_ITEMS: QuoteLineItem[] = [
  { id: "item-report", label: "리포트 전체 검수 (위반·확인 항목)", amount: 150000 },
  { id: "item-pif", label: "PIF 초안 작성 (1품목)", amount: 200000 }
];

export default function QuoteBuilderPage() {
  const [expertName, setExpertName] = useState("");
  const [expertRole, setExpertRole] = useState("");
  const [clientName, setClientName] = useState("");
  const [productName, setProductName] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [items, setItems] = useState<QuoteLineItem[]>(DEFAULT_ITEMS);
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [validUntil, setValidUntil] = useState("");
  const [escrow, setEscrow] = useState(true);
  const [note, setNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const quote = useMemo<Quote>(
    () => ({
      id: newId("quote"),
      createdAt: new Date().toISOString(),
      expertName: expertName.trim() || "전문가",
      expertRole: expertRole.trim(),
      clientName: clientName.trim(),
      productName: productName.trim(),
      currency: currency.trim() || "KRW",
      items: items.filter((item) => item.label.trim() || item.amount > 0),
      leadTimeDays: leadTimeDays.trim() ? Number(leadTimeDays.replace(/[^0-9]/g, "")) || null : null,
      validUntil: validUntil.trim(),
      escrow,
      note: note.trim()
    }),
    [expertName, expertRole, clientName, productName, currency, items, leadTimeDays, validUntil, escrow, note]
  );

  const total = quoteTotal(quote);

  function updateItem(id: string, patch: Partial<QuoteLineItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function generateShare() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/quote/view?d=${encodeQuote(quote)}`;
    setShareUrl(url);
    setCopied(false);
  }

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="lpv5 quote-builder">
      <Link className="linkbtn" href="/workspace/experts">
        <ArrowLeft size={14} />
        전문가 검수로
      </Link>

      <div className="quote-head">
        <span className="quote-head-badge" aria-hidden="true">
          <Receipt size={18} />
        </span>
        <div>
          <h1>견적서 만들기</h1>
          <p className="sub">항목과 금액을 입력하면 고객에게 보낼 견적서가 실시간으로 만들어집니다. 공유 링크로 보내면 고객이 바로 확인·결제할 수 있습니다.</p>
        </div>
      </div>

      <div className="quote-grid">
        <div className="card quote-form">
          <div className="lp-field-grid">
            <label className="lp-field">
              <span>전문가 이름</span>
              <input value={expertName} onChange={(event) => setExpertName(event.target.value)} placeholder="예: 김O정" />
            </label>
            <label className="lp-field">
              <span>직함</span>
              <input value={expertRole} onChange={(event) => setExpertRole(event.target.value)} placeholder="예: 대만 인허가 컨설턴트" />
            </label>
            <label className="lp-field">
              <span>고객/브랜드</span>
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="예: 어글리슈즈" />
            </label>
            <label className="lp-field">
              <span>대상 제품</span>
              <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="예: 수분 진정 토너 300ml" />
            </label>
          </div>

          <div className="quote-items">
            <div className="quote-items-head">
              <span className="expert-reg-label" style={{ margin: 0 }}>견적 항목</span>
              <label className="quote-currency">
                통화
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="KRW">KRW</option>
                  <option value="USD">USD</option>
                  <option value="TWD">TWD</option>
                </select>
              </label>
            </div>
            {items.map((item) => (
              <div key={item.id} className="quote-item-row">
                <input
                  value={item.label}
                  onChange={(event) => updateItem(item.id, { label: event.target.value })}
                  placeholder="항목 설명 (예: 중문 라벨 감수)"
                />
                <input
                  value={item.amount ? String(item.amount) : ""}
                  onChange={(event) => updateItem(item.id, { amount: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                  placeholder="0"
                  inputMode="decimal"
                  className="quote-item-amount"
                />
                <button
                  type="button"
                  className="quote-item-remove"
                  aria-label="항목 삭제"
                  onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== item.id) : prev))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button type="button" className="quote-add" onClick={() => setItems((prev) => [...prev, { id: newId("item"), label: "", amount: 0 }])}>
              <Plus size={14} />
              항목 추가
            </button>
          </div>

          <div className="lp-field-grid">
            <label className="lp-field">
              <span>예상 납기 (영업일)</span>
              <input value={leadTimeDays} onChange={(event) => setLeadTimeDays(event.target.value)} placeholder="예: 3" inputMode="numeric" />
            </label>
            <label className="lp-field">
              <span>유효기한</span>
              <input value={validUntil} onChange={(event) => setValidUntil(event.target.value)} placeholder="예: 2026-07-20" />
            </label>
          </div>

          <label className="quote-escrow-toggle">
            <input type="checkbox" checked={escrow} onChange={(event) => setEscrow(event.target.checked)} />
            <span>에스크로 결제 — 작업 완료 확인 시까지 LabelPass가 대금을 보관</span>
          </label>

          <label className="lp-field lp-wide">
            <span>메모 (선택)</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="작업 범위, 전제 조건, 추가 안내 등" rows={3} />
          </label>

          <div className="quote-actions">
            <button className="btn btn-primary" type="button" onClick={generateShare}>
              <Copy size={15} />
              공유 링크 생성
            </button>
            {shareUrl && (
              <button className="btn btn-ghost" type="button" onClick={() => void copyShare()}>
                {copied ? "복사됨 ✓" : "링크 복사"}
              </button>
            )}
          </div>
          {shareUrl && <p className="quote-share-url">{shareUrl}</p>}
        </div>

        <aside className="quote-preview-pane">
          <div className="quote-card">
            <div className="quote-card-title">
              <Receipt size={15} />
              견적서
            </div>
            {(quote.clientName || quote.productName) && (
              <p className="quote-card-meta">
                {[quote.clientName, quote.productName].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="quote-card-rows">
              {quote.items.length === 0 ? (
                <p className="quote-card-empty">항목을 추가하면 여기에 표시됩니다.</p>
              ) : (
                quote.items.map((item) => (
                  <div key={item.id} className="quote-card-row">
                    <span>{item.label || "(항목)"}</span>
                    <span>{formatMoney(item.amount, quote.currency)}</span>
                  </div>
                ))
              )}
              {quote.leadTimeDays != null && (
                <div className="quote-card-row">
                  <span>예상 납기</span>
                  <span>{quote.leadTimeDays}영업일</span>
                </div>
              )}
              <div className="quote-card-row total">
                <span>합계</span>
                <span>{formatMoney(total, quote.currency)}</span>
              </div>
            </div>
            {quote.escrow && (
              <div className="quote-card-escrow">
                <Shield size={13} />
                에스크로 결제 — 작업 완료 확인 시까지 대금 보관
              </div>
            )}
            {quote.validUntil && <p className="quote-card-valid">유효기한 {quote.validUntil}</p>}
            <p className="quote-card-by">{[quote.expertName, quote.expertRole].filter(Boolean).join(" · ")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
