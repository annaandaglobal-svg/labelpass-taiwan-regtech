"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Receipt, Shield } from "lucide-react";
import { decodeQuote, formatMoney, quoteTotal, type Quote } from "@/lib/quote";

type PaidState = { paymentId: string; provider: string } | null;

export default function QuoteViewPage() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<PaidState>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("d");
    setQuote(encoded ? decodeQuote(encoded) : null);
    setLoaded(true);
  }, []);

  const total = quote ? quoteTotal(quote) : 0;

  async function pay() {
    if (!quote) return;
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: quote.id,
          title: `${quote.productName || "규제 검수"} 전문가 견적`,
          amountUsd: Math.max(1, Math.round(total))
        })
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === "paid") {
        setPaid({ paymentId: body.paymentId ?? "", provider: body.provider ?? "mock_demo" });
      } else {
        setError("결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setError("결제 서버에 연결하지 못했습니다.");
    }
    setPaying(false);
  }

  if (!loaded) {
    return (
      <section className="lpv5 quote-view">
        <p className="quote-view-loading">불러오는 중…</p>
      </section>
    );
  }

  if (!quote) {
    return (
      <section className="lpv5 quote-view">
        <div className="card quote-view-empty">
          <Receipt size={34} />
          <h1>견적서를 찾을 수 없습니다</h1>
          <p>링크가 올바르지 않거나 만료되었습니다. 전문가에게 새 견적 링크를 요청해 주세요.</p>
          <Link className="btn btn-primary" href="/">
            홈으로
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="lpv5 quote-view">
      <div className="quote-card quote-view-card">
        <div className="quote-card-title">
          <Receipt size={16} />
          견적서
        </div>
        {(quote.clientName || quote.productName) && (
          <p className="quote-card-meta">{[quote.clientName, quote.productName].filter(Boolean).join(" · ")}</p>
        )}
        <div className="quote-card-rows">
          {quote.items.map((item) => (
            <div key={item.id} className="quote-card-row">
              <span>{item.label || "(항목)"}</span>
              <span>{formatMoney(item.amount, quote.currency)}</span>
            </div>
          ))}
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
        {quote.note && <p className="quote-view-note">{quote.note}</p>}
        {quote.escrow && (
          <div className="quote-card-escrow">
            <Shield size={13} />
            에스크로 결제 — 작업 완료 확인 시까지 LabelPass가 대금을 보관합니다.
          </div>
        )}
        {quote.validUntil && <p className="quote-card-valid">유효기한 {quote.validUntil}</p>}
        <p className="quote-card-by">{[quote.expertName, quote.expertRole].filter(Boolean).join(" · ")}</p>

        {paid ? (
          <div className="quote-view-paid">
            <CheckCircle2 size={22} />
            <div>
              <b>결제가 확인됐습니다</b>
              <small>
                {paid.provider === "mock_demo" ? "테스트 결제" : "PortOne"} · {formatMoney(total, quote.currency)}
                {paid.paymentId ? ` · ${paid.paymentId}` : ""}
              </small>
              <p>상담방이 열립니다. 전문가가 자료를 확인하며 작업을 시작합니다.</p>
            </div>
          </div>
        ) : (
          <>
            <button className="btn btn-primary btn-big quote-view-pay" type="button" onClick={() => void pay()} disabled={paying}>
              {paying ? <Loader2 className="lp-spin" size={16} /> : <Shield size={16} />}
              결제하고 진행하기
            </button>
            {error && <p className="quote-view-error">{error}</p>}
            <p className="quote-view-fineprint">
              결제 수단은 결제 단계에서 선택합니다. PortOne 키가 설정되지 않은 환경에서는 테스트 결제로 진행됩니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
