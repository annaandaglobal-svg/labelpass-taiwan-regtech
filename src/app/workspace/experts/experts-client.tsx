"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Receipt,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  Handshake,
  Loader2,
  MessageCircle,
  PackageCheck,
  Send,
  Sparkles,
  Truck,
  UserCheck
} from "lucide-react";
import { HANDOFF_DRAFTS_STORAGE_KEY, parseHandoffDrafts, type HandoffDraft } from "@/lib/handoff-drafts";
import {
  CHAT_MESSAGES_STORAGE_KEY,
  CONSULT_CASES_STORAGE_KEY,
  MAX_CHAT_MESSAGES_PER_CASE,
  MAX_CONSULT_CASES,
  buildDemoQuote,
  buildExpertAutoReply,
  consultStatusCopy,
  demoAssignedExpertFor,
  parseChatMessages,
  parseConsultCases,
  recommendedExpertFor,
  EXPERT_ROSTER,
  type ChatMessage,
  type ConsultCase
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

export function ExpertsClient() {
  const [cases, setCases] = useState<ConsultCase[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drafts, setDrafts] = useState<HandoffDraft[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newScope, setNewScope] = useState("");
  const [newCategory, setNewCategory] = useState("화장품");
  const [selectedExpertId, setSelectedExpertId] = useState<string>(() => recommendedExpertFor("화장품").id);
  const [chatInput, setChatInput] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [toast, setToast] = useState("");
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const replyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storedCases = parseConsultCases(window.localStorage.getItem(CONSULT_CASES_STORAGE_KEY));
    setCases(storedCases.slice(0, MAX_CONSULT_CASES));
    setMessages(parseChatMessages(window.localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY)));
    setDrafts(parseHandoffDrafts(window.localStorage.getItem(HANDOFF_DRAFTS_STORAGE_KEY)));
    if (storedCases.length) setSelectedCaseId(storedCases[0].id);
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    if (product?.trim()) setNewProductName(product.trim());
    return () => {
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
  }, [messages, selectedCaseId]);

  const selectedCase = useMemo(() => cases.find((item) => item.id === selectedCaseId) ?? null, [cases, selectedCaseId]);
  const selectedMessages = useMemo(
    () => messages.filter((item) => item.caseId === selectedCaseId),
    [messages, selectedCaseId]
  );

  function persistCases(next: ConsultCase[]) {
    setCases(next);
    window.localStorage.setItem(CONSULT_CASES_STORAGE_KEY, JSON.stringify(next.slice(0, MAX_CONSULT_CASES)));
  }

  function persistMessages(next: ChatMessage[]) {
    setMessages(next);
    window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(next.slice(-MAX_CHAT_MESSAGES_PER_CASE * 3)));
  }

  function appendMessage(caseId: string, author: ChatMessage["author"], text: string, base?: ChatMessage[]) {
    const next: ChatMessage[] = [
      ...(base ?? messages),
      { id: newId(), caseId, author, text, createdAt: new Date().toISOString() }
    ];
    persistMessages(next);
    return next;
  }

  function createCase(productName: string, category: string, scope: string[], sourceHandoffId?: string, expertName?: string) {
    const consultCase: ConsultCase = {
      id: newId(),
      createdAt: new Date().toISOString(),
      productName,
      category,
      scope,
      status: "requested",
      quote: null,
      expertName: expertName ?? recommendedExpertFor(category).name,
      sourceHandoffId
    };
    const nextCases = [consultCase, ...cases].slice(0, MAX_CONSULT_CASES);
    persistCases(nextCases);
    appendMessage(
      consultCase.id,
      "system",
      "전문가 매칭 요청이 접수됐습니다. 범위 확인 후 견적을 보내드립니다. 궁금한 점은 지금 바로 남겨두셔도 됩니다."
    );
    setSelectedCaseId(consultCase.id);
    setToast("전문가 매칭을 요청했습니다.");
  }

  function createCaseFromForm() {
    if (!newProductName.trim()) {
      setToast("제품명을 입력해주세요.");
      return;
    }
    const scope = newScope
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    const chosen = EXPERT_ROSTER.find((expert) => expert.id === selectedExpertId);
    createCase(newProductName.trim(), newCategory, scope, undefined, chosen?.name);
    setNewProductName("");
    setNewScope("");
  }

  function createCaseFromDraft(draft: HandoffDraft) {
    if (cases.some((item) => item.sourceHandoffId === draft.id)) {
      setToast("이 검토 결과로 만든 상담이 이미 있습니다.");
      setSelectedCaseId(cases.find((item) => item.sourceHandoffId === draft.id)?.id ?? null);
      return;
    }
    createCase(draft.productName, draft.routeLabel, draft.expertScope.slice(0, 8), draft.id);
  }

  function updateCase(caseId: string, updater: (current: ConsultCase) => ConsultCase) {
    persistCases(cases.map((item) => (item.id === caseId ? updater(item) : item)));
  }

  function requestQuote(consultCase: ConsultCase) {
    setIsQuoting(true);
    updateCase(consultCase.id, (current) => ({ ...current, status: "quoting" }));
    // 데모 모드: 운영팀/전문가 응답을 짧은 지연으로 흉내냅니다.
    // 실제 연동 시 이 부분이 /api/admin/ops/actions 의 견적 입력 이벤트로 대체됩니다.
    window.setTimeout(() => {
      const quote = buildDemoQuote(consultCase);
      const assignedExpert = demoAssignedExpertFor(consultCase.category);
      setCases((currentCases) => {
        const next = currentCases.map((item) =>
          item.id === consultCase.id ? { ...item, status: "quoted" as const, quote, expertName: assignedExpert } : item
        );
        window.localStorage.setItem(CONSULT_CASES_STORAGE_KEY, JSON.stringify(next.slice(0, MAX_CONSULT_CASES)));
        return next;
      });
      setMessages((currentMessages) => {
        const next: ChatMessage[] = [
          ...currentMessages,
          {
            id: newId(),
            caseId: consultCase.id,
            author: "system" as const,
            text: `${assignedExpert} 전문가가 매칭됐고 견적이 도착했습니다. 예상 비용 USD ${quote.feeRangeUsd[0]}–${quote.feeRangeUsd[1]}, 예상 납기 ${quote.leadTimeDays}일. 견적 카드에서 범위를 확인하세요.`,
            createdAt: new Date().toISOString()
          }
        ];
        window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setIsQuoting(false);
    }, 1200);
  }

  function acceptQuote(consultCase: ConsultCase) {
    updateCase(consultCase.id, (current) => ({ ...current, status: "payment_pending" }));
    appendMessage(
      consultCase.id,
      "system",
      "견적을 수락했습니다. 결제가 확인되면 상담방이 바로 열립니다. 지금은 mock 결제로 흐름을 이어갈 수 있습니다."
    );
  }

  async function payAndOpenConsult(consultCase: ConsultCase) {
    const amountUsd = consultCase.quote?.feeRangeUsd[0] ?? 200;
    setIsPaying(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId: consultCase.id,
          title: `${consultCase.productName} 전문가 상담`,
          amountUsd
        })
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok && body.status === "paid") {
        updateCase(consultCase.id, (current) => ({ ...current, status: "in_progress" }));
        appendMessage(
          consultCase.id,
          "system",
          `결제가 확인됐습니다 (${body.provider === "mock_demo" ? "mock 결제" : "PortOne"} · USD ${amountUsd} · ${body.paymentId}). 상담방이 열렸습니다. 전문가가 자료를 확인하며 답변을 남깁니다.`
        );
      } else {
        setToast("결제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      setToast("결제 서버에 연결하지 못했습니다. 네트워크 확인 후 다시 시도해주세요.");
    } finally {
      setIsPaying(false);
    }
  }

  function sendChat() {
    if (!selectedCase || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    appendMessage(selectedCase.id, "customer", text);
    if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    replyTimerRef.current = window.setTimeout(() => {
      const reply = buildExpertAutoReply(selectedCase, text);
      setMessages((current) => {
        const next: ChatMessage[] = [
          ...current,
          { id: newId(), caseId: selectedCase.id, author: "expert" as const, text: reply, createdAt: new Date().toISOString() }
        ];
        window.localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }, 1400);
  }

  const draftCandidates = drafts.filter((draft) => !cases.some((item) => item.sourceHandoffId === draft.id)).slice(0, 3);

  return (
    <section className="lp-main workspace-main experts-main">
      <header className="workspace-topbar">
        <div>
          <p>전문가 상담·견적</p>
          <h1>검토 결과를 전문가에게 넘기고, 견적과 상담을 한 화면에서 진행하세요.</h1>
        </div>
        <div className="workspace-topbar-actions">
          <Link className="workspace-button primary" href="/experts/register">
            <BadgeCheck size={15} />
            전문가로 등록
          </Link>
          <Link className="workspace-button" href="/experts/quote">
            <Receipt size={15} />
            견적서 만들기
          </Link>
          <Link className="workspace-button" href="/expert">
            <UserCheck size={15} />
            전문가 포털
          </Link>
          <Link className="workspace-button" href="/workspace">
            <ClipboardCheck size={15} />
            워크스페이스
          </Link>
          <Link className="workspace-button" href="/workspace/logistics">
            <Truck size={15} />
            물류·선적
          </Link>
        </div>
      </header>

      <div className="experts-layout">
        <aside className="experts-side">
          {draftCandidates.length > 0 && (
            <section className="workspace-panel">
              <div className="workspace-panel-head">
                <div>
                  <span>검토 결과 연결</span>
                  <h2>저장된 검토에서 상담 만들기</h2>
                </div>
                <Sparkles size={18} />
              </div>
              <div className="experts-draft-list">
                {draftCandidates.map((draft) => (
                  <button key={draft.id} type="button" onClick={() => createCaseFromDraft(draft)}>
                    <b>{draft.productName}</b>
                    <span>{draft.routeLabel} · {draft.nextAction}</span>
                    <em>
                      상담 만들기
                      <ArrowRight size={13} />
                    </em>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>새 요청</span>
                <h2>전문가 매칭 요청</h2>
              </div>
              <Handshake size={18} />
            </div>
            <div className="pif-form">
              <label className="lp-field">
                <span>제품명 *</span>
                <input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} placeholder="예: Cica Barrier Cream" />
              </label>
              <label className="lp-field">
                <span>분야</span>
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  <option value="화장품">화장품 · PIF</option>
                  <option value="식품">식품 · 라벨</option>
                  <option value="식품첨가물">식품첨가물</option>
                  <option value="건강식품">건강식품</option>
                  <option value="수입검사·통관">수입검사·통관</option>
                </select>
              </label>
              <label className="lp-field">
                <span>상담 범위 (줄바꿈 또는 쉼표로 구분)</span>
                <textarea rows={3} value={newScope} onChange={(event) => setNewScope(event.target.value)} placeholder={"예: PIF 목차 검토\n중문 라벨 표현 확인"} />
              </label>
              <div className="expert-pick">
                <span className="expert-pick-label">담당 전문가 선택</span>
                <div className="expert-pick-grid">
                  {EXPERT_ROSTER.map((expert) => (
                    <button
                      key={expert.id}
                      type="button"
                      className={expert.id === selectedExpertId ? "expert-pick-card on" : "expert-pick-card"}
                      onClick={() => setSelectedExpertId(expert.id)}
                      aria-pressed={expert.id === selectedExpertId}
                    >
                      <span className="expert-pick-top">
                        <span className="expert-pick-av" aria-hidden="true">{expert.avatar}</span>
                        <span className="expert-pick-id">
                          <b>{expert.name}</b>
                          <em>{expert.role}</em>
                        </span>
                        {expert.id === selectedExpertId && <BadgeCheck size={15} className="expert-pick-check" />}
                      </span>
                      <span className="expert-pick-tags">
                        {expert.specialties.map((tag) => (
                          <em key={tag}>{tag}</em>
                        ))}
                      </span>
                      <span className="expert-pick-meta">
                        처리 {expert.handledCount}건 · 평점 {expert.rating} · {expert.responseTime}
                      </span>
                      <span className="expert-pick-price">
                        {expert.priceFrom} · {expert.note}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="lp-button" type="button" onClick={createCaseFromForm}>
                <Handshake size={16} />
                이 전문가로 매칭 요청
              </button>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <div>
                <span>내 상담</span>
                <h2>진행 중 케이스</h2>
              </div>
              <MessageCircle size={18} />
            </div>
            <div className="experts-case-list">
              {cases.length ? (
                cases.map((item) => {
                  const copy = consultStatusCopy[item.status];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`experts-case-row ${copy.tone} ${item.id === selectedCaseId ? "active" : ""}`}
                      onClick={() => setSelectedCaseId(item.id)}
                    >
                      <b>{item.productName}</b>
                      <span>{item.category}</span>
                      <em>{copy.label}</em>
                    </button>
                  );
                })
              ) : (
                <span className="pif-empty">아직 상담 요청이 없습니다. 검토 결과 저장 후 여기서 이어가세요.</span>
              )}
            </div>
          </section>
        </aside>

        <section className="experts-detail">
          {selectedCase ? (
            <>
              <section className="workspace-panel experts-status-panel">
                <div className="workspace-panel-head">
                  <div>
                    <span>{selectedCase.category}</span>
                    <h2>{selectedCase.productName}</h2>
                  </div>
                  <BadgeCheck size={18} />
                </div>
                <div className={`experts-status ${consultStatusCopy[selectedCase.status].tone}`}>
                  <b>{consultStatusCopy[selectedCase.status].label}</b>
                  <span>{consultStatusCopy[selectedCase.status].detail}</span>
                </div>
                {selectedCase.scope.length > 0 && (
                  <div className="experts-scope" aria-label="상담 범위">
                    {selectedCase.scope.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                )}

                {selectedCase.quote ? (
                  <div className="experts-quote" aria-label="견적">
                    <div>
                      <span>예상 비용</span>
                      <b>USD {selectedCase.quote.feeRangeUsd[0]}–{selectedCase.quote.feeRangeUsd[1]}</b>
                    </div>
                    <div>
                      <span>예상 납기</span>
                      <b>
                        <CalendarClock size={14} />
                        영업일 {selectedCase.quote.leadTimeDays}일
                      </b>
                    </div>
                    <div className="experts-quote-scope">
                      <span>포함 범위</span>
                      <small>{selectedCase.quote.scope.join(" · ")}</small>
                    </div>
                    <p>{selectedCase.quote.detail}</p>
                  </div>
                ) : (
                  <p className="experts-quote-empty">아직 견적이 없습니다. 범위 확인 후 견적을 요청하세요.</p>
                )}

                <div className="experts-actions">
                  {selectedCase.status === "requested" && (
                    <button className="lp-button" type="button" disabled={isQuoting} onClick={() => requestQuote(selectedCase)}>
                      {isQuoting ? <Loader2 className="lp-spin" size={15} /> : <CreditCard size={15} />}
                      견적 요청
                    </button>
                  )}
                  {selectedCase.status === "quoting" && (
                    <span className="experts-hint">
                      <Loader2 className="lp-spin" size={14} />
                      견적 산정 중입니다
                    </span>
                  )}
                  {selectedCase.status === "quoted" && (
                    <button className="lp-button" type="button" onClick={() => acceptQuote(selectedCase)}>
                      <BadgeCheck size={15} />
                      견적 수락
                    </button>
                  )}
                  {selectedCase.status === "payment_pending" && (
                    <button className="lp-button" type="button" disabled={isPaying} onClick={() => void payAndOpenConsult(selectedCase)}>
                      {isPaying ? <Loader2 className="lp-spin" size={15} /> : <CreditCard size={15} />}
                      USD {selectedCase.quote?.feeRangeUsd[0] ?? 200} 결제 진행 (mock)
                    </button>
                  )}
                  {(selectedCase.status === "in_progress" || selectedCase.status === "completed") && (
                    <Link className="lp-button secondary" href="/workspace/logistics">
                      <PackageCheck size={15} />
                      물류 요청으로 이어가기
                    </Link>
                  )}
                </div>
              </section>

              <section className="workspace-panel experts-chat-panel">
                <div className="workspace-panel-head">
                  <div>
                    <span>상담 채팅</span>
                    <h2>{selectedCase.expertName}</h2>
                  </div>
                  <MessageCircle size={18} />
                </div>
                <div className="experts-chat-scroll" ref={chatScrollRef}>
                  {selectedMessages.length ? (
                    selectedMessages.map((message) => (
                      <div key={message.id} className={`experts-chat-message ${message.author}`}>
                        <p>{message.text}</p>
                        <small>{timeLabel(message.createdAt)}</small>
                      </div>
                    ))
                  ) : (
                    <span className="pif-empty">첫 메시지를 남기면 전문가가 확인 후 답변합니다.</span>
                  )}
                </div>
                <div className="experts-chat-input">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="질문이나 자료 설명을 남겨주세요. (Enter로 전송)"
                  />
                  <button className="lp-button" type="button" onClick={sendChat} disabled={!chatInput.trim()}>
                    <Send size={15} />
                    보내기
                  </button>
                </div>
                <small className="experts-chat-note">
                  지금은 데모 채팅으로, 대화가 이 브라우저에 저장됩니다. 운영 연결 후에는 같은 대화가 상담방(chat_threads)에
                  기록되고 실시간으로 이어집니다.
                </small>
              </section>
            </>
          ) : (
            <section className="workspace-panel experts-empty-panel">
              <Handshake size={26} />
              <b>상담 케이스를 선택하거나 새 매칭을 요청하세요.</b>
              <span>검토 결과를 저장했다면 왼쪽에서 바로 상담으로 전환할 수 있습니다.</span>
            </section>
          )}
        </section>
      </div>

      {toast && <div className="lp-toast">{toast}</div>}
    </section>
  );
}
