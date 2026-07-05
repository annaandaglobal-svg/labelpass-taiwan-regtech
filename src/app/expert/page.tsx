"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Receipt, Send, UserCheck } from "lucide-react";
import {
  CHAT_MESSAGES_STORAGE_KEY,
  CONSULT_CASES_STORAGE_KEY,
  MAX_CHAT_MESSAGES_PER_CASE,
  MAX_CONSULT_CASES,
  consultStatusCopy,
  parseChatMessages,
  parseConsultCases,
  type ChatMessage,
  type ConsultCase,
  type ConsultCaseStatus
} from "@/lib/expert-chat";

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ExpertPortalPage() {
  const [cases, setCases] = useState<ConsultCase[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [fee, setFee] = useState("");
  const [leadDays, setLeadDays] = useState("3");
  const [loaded, setLoaded] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedCases = parseConsultCases(window.localStorage.getItem(CONSULT_CASES_STORAGE_KEY));
    setCases(storedCases);
    setMessages(parseChatMessages(window.localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY)));
    if (storedCases.length) setSelectedId(storedCases[0].id);
    setLoaded(true);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, selectedId]);

  const selected = useMemo(() => cases.find((item) => item.id === selectedId) ?? null, [cases, selectedId]);
  const caseMessages = useMemo(() => messages.filter((item) => item.caseId === selectedId), [messages, selectedId]);

  function persistCases(next: ConsultCase[]) {
    setCases(next);
    window.localStorage.setItem(CONSULT_CASES_STORAGE_KEY, JSON.stringify(next.slice(0, MAX_CONSULT_CASES)));
  }
  function persistMessages(next: ChatMessage[]) {
    setMessages(next);
    window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(next.slice(-MAX_CHAT_MESSAGES_PER_CASE * 3)));
  }
  function addMessage(caseId: string, text: string, author: ChatMessage["author"] = "expert") {
    persistMessages([...messages, { id: newId(), caseId, author, text, createdAt: new Date().toISOString() }]);
  }
  function updateCase(caseId: string, updater: (current: ConsultCase) => ConsultCase) {
    persistCases(cases.map((item) => (item.id === caseId ? updater(item) : item)));
  }

  function sendReply() {
    if (!selected || !reply.trim()) return;
    addMessage(selected.id, reply.trim(), "expert");
    setReply("");
  }

  function sendQuote() {
    if (!selected) return;
    const amount = Number(fee.replace(/[^0-9.]/g, "")) || 0;
    if (amount <= 0) return;
    const lead = Number(leadDays.replace(/[^0-9]/g, "")) || 3;
    updateCase(selected.id, (current) => ({
      ...current,
      status: "quoted",
      quote: { feeRangeUsd: [amount, amount], scope: current.scope, leadTimeDays: lead, detail: "전문가 견적" }
    }));
    addMessage(selected.id, `견적을 보냈습니다. 예상 비용 USD ${amount.toLocaleString("en-US")}, 예상 납기 ${lead}영업일. 고객 화면에서 수락·결제하면 상담이 진행됩니다.`, "expert");
    setFee("");
  }

  function setStatus(status: ConsultCaseStatus, note: string) {
    if (!selected) return;
    updateCase(selected.id, (current) => ({ ...current, status }));
    addMessage(selected.id, note, "system");
  }

  return (
    <section className="lpv5 expert-portal">
      <Link className="linkbtn" href="/workspace/experts">
        <ArrowLeft size={14} />
        고객 상담 화면
      </Link>

      <div className="ep-head">
        <span className="ep-head-badge" aria-hidden="true">
          <UserCheck size={18} />
        </span>
        <div>
          <h1>전문가 포털</h1>
          <p className="sub">
            배정된 상담을 확인하고, 답변·견적을 보내고, 진행 상태를 관리합니다. <b>데모 모드</b>에서는 같은 브라우저의 고객 상담과 연결됩니다 (실운영 시 로그인·DB 연동).
          </p>
        </div>
      </div>

      {!loaded ? (
        <p className="ep-empty">불러오는 중…</p>
      ) : cases.length === 0 ? (
        <div className="card ep-empty-card">
          <UserCheck size={26} />
          <div>
            <b>아직 배정된 상담이 없습니다</b>
            <p>고객이 전문가 검수를 요청하면 여기에 상담이 나타납니다. 지금 바로 만들어 보려면 고객 화면에서 상담을 요청하세요.</p>
          </div>
          <Link className="btn btn-primary" href="/workspace/experts">
            고객 상담 화면으로
          </Link>
        </div>
      ) : (
        <div className="ep-layout">
          <aside className="ep-cases">
            {cases.map((item) => {
              const copy = consultStatusCopy[item.status];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selectedId ? "ep-case on" : "ep-case"}
                  onClick={() => setSelectedId(item.id)}
                >
                  <b>{item.productName}</b>
                  <span className="ep-case-meta">
                    {item.category} · {timeLabel(item.createdAt)}
                  </span>
                  <span className={`chip ${copy.tone === "danger" ? "fail" : copy.tone === "warn" ? "warn" : copy.tone === "pass" ? "pass" : "navy"}`}>
                    {copy.label}
                  </span>
                </button>
              );
            })}
          </aside>

          {selected && (
            <div className="ep-detail card">
              <div className="ep-detail-head">
                <div>
                  <b>{selected.productName}</b>
                  <span className="ep-detail-meta">
                    {selected.category} · 담당 {selected.expertName || "미배정"}
                  </span>
                </div>
                <span className={`chip ${consultStatusCopy[selected.status].tone === "danger" ? "fail" : consultStatusCopy[selected.status].tone === "warn" ? "warn" : consultStatusCopy[selected.status].tone === "pass" ? "pass" : "navy"}`}>
                  {consultStatusCopy[selected.status].label}
                </span>
              </div>
              {selected.scope.length > 0 && (
                <div className="ep-scope">
                  {selected.scope.map((item) => (
                    <span key={item} className="chip gray">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              <div className="ep-chat" ref={logRef}>
                {caseMessages.length === 0 ? (
                  <p className="ep-chat-empty">아직 대화가 없습니다. 인사와 함께 검수 범위를 확인해 보세요.</p>
                ) : (
                  caseMessages.map((message) => (
                    <div key={message.id} className={`ep-msg ${message.author}`}>
                      {message.author === "system" ? <em>{message.text}</em> : <p>{message.text}</p>}
                      <small>{timeLabel(message.createdAt)}</small>
                    </div>
                  ))
                )}
              </div>

              <div className="ep-reply">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="고객에게 답변 입력…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendReply();
                  }}
                />
                <button className="btn btn-primary" type="button" onClick={sendReply} disabled={!reply.trim()}>
                  <Send size={15} />
                  전송
                </button>
              </div>

              <div className="ep-quote">
                <div className="ep-quote-title">
                  <Receipt size={14} />
                  견적 보내기
                </div>
                <div className="ep-quote-fields">
                  <label>
                    <span>예상 비용 (USD)</span>
                    <input value={fee} onChange={(event) => setFee(event.target.value)} placeholder="예: 350" inputMode="decimal" />
                  </label>
                  <label>
                    <span>납기 (영업일)</span>
                    <input value={leadDays} onChange={(event) => setLeadDays(event.target.value)} inputMode="numeric" />
                  </label>
                  <button className="btn btn-ghost" type="button" onClick={sendQuote} disabled={!fee.trim()}>
                    견적 발송
                  </button>
                </div>
                <Link className="ep-quote-link" href="/experts/quote">
                  상세 견적서 만들기 (항목별) →
                </Link>
              </div>

              <div className="ep-status-actions">
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus("in_progress", "전문가가 작업을 시작했습니다.")}>
                  작업 시작
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStatus("completed", "작업이 완료 처리됐습니다. 고객 확인을 요청하세요.")}>
                  완료 처리
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
