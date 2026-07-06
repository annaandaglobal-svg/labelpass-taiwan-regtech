"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  EXPERT_ROSTER,
  type ChatMessage,
  type ConsultCase,
  type ExpertProfile
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
  const [profileExpert, setProfileExpert] = useState<ExpertProfile | null>(null);
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
  // Start a consult with a chosen expert (시안: 상담 시작). Pulls product context from the
  // most recent saved review if there is one.
  function startConsultWith(expert: ExpertProfile) {
    const draft = drafts[0];
    const productName = draft?.productName || `${expert.name.split(" · ")[0]} 상담`;
    const category = draft?.routeLabel || "화장품";
    const scope = draft?.expertScope?.slice(0, 6) ?? expert.specialties;
    setProfileExpert(null);
    createCase(productName, category, scope, draft?.id, expert.name);
  }

  function expertAvatarFor(name: string) {
    return EXPERT_ROSTER.find((expert) => name.startsWith(expert.name.split(" · ")[0]))?.avatar ?? "👤";
  }

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
      expertName: expertName ?? EXPERT_ROSTER[0].name,
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
    <section className="lpv5 ex-screen">
      {!selectedCase ? (
        <div className="ex-list">
          <div className="ex-list-head">
            <div>
              <h1>전문가 검수</h1>
              <p className="sub">AI가 못 끝내는 판단은 사람이 끝냅니다. 리포트가 자동 공유되고, 결제는 작업 완료 확인 시까지 보호됩니다.</p>
            </div>
            <div className="ex-list-actions">
              <Link className="linkbtn" href="/experts/register">전문가로 등록</Link>
              <Link className="linkbtn" href="/expert">전문가 포털</Link>
            </div>
          </div>

          <div className="exgrid">
            {EXPERT_ROSTER.map((expert) => (
              <div className="excard" key={expert.id}>
                <div className="exhead">
                  <div className="exav" aria-hidden="true">{expert.avatar}</div>
                  <div>
                    <b>{expert.name.split(" · ")[0]}</b>
                    <span className="role">{expert.role}</span>
                  </div>
                </div>
                <div className="exmeta">
                  {expert.specialties.map((tag) => (
                    <span key={tag} className="chip navy">{tag}</span>
                  ))}
                </div>
                <div className="exstats">
                  처리 <b>{expert.handledCount}건</b> · 평점 <b>{expert.rating}</b> · 평균 응답{" "}
                  <b>{expert.responseTime.replace("평균 ", "")}</b>
                  <br />
                  {expert.priceFrom} · {expert.note}
                </div>
                <div className="exfoot">
                  <button className="btn btn-primary btn-sm ex-start" type="button" onClick={() => startConsultWith(expert)}>
                    상담 시작
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfileExpert(expert)}>
                    프로필
                  </button>
                </div>
              </div>
            ))}
          </div>

          {cases.length > 0 && (
            <div className="ex-resume">
              <h2>진행 중인 상담</h2>
              <div className="ex-resume-list">
                {cases.map((item) => {
                  const copy = consultStatusCopy[item.status];
                  const tone =
                    copy.tone === "danger" ? "fail" : copy.tone === "warn" ? "warn" : copy.tone === "pass" ? "pass" : "navy";
                  return (
                    <button key={item.id} type="button" className="ex-resume-row" onClick={() => setSelectedCaseId(item.id)}>
                      <b>{item.productName}</b>
                      <span>
                        {item.expertName} · {item.category}
                      </span>
                      <em className={`chip ${tone}`}>{copy.label}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ex-chatview">
          <button className="linkbtn ex-back" type="button" onClick={() => setSelectedCaseId(null)}>
            <ArrowLeft size={14} />
            전문가 목록
          </button>
          <div className="echat">
            <div className="bothead">
              <div className="exav sm" aria-hidden="true">
                {expertAvatarFor(selectedCase.expertName)}
              </div>
              <div>
                <b>{selectedCase.expertName}</b> <span className="chip pass">응답 빠름</span>
                <div className="sub">{selectedCase.productName} · 리포트 자동 공유됨</div>
              </div>
            </div>
            <div className="botlog" ref={chatScrollRef}>
              {selectedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`msg ${message.author === "customer" ? "user" : message.author === "system" ? "sys" : "bot"}`}
                >
                  {message.author === "system" ? <em>{message.text}</em> : <p>{message.text}</p>}
                </div>
              ))}
              {selectedCase.quote && (
                <div className="quote">
                  <div className="qt">📋 견적서</div>
                  <div className="qrow">
                    <span>포함 범위</span>
                    <span>{selectedCase.quote.scope.join(", ")}</span>
                  </div>
                  <div className="qrow">
                    <span>예상 납기</span>
                    <span>{selectedCase.quote.leadTimeDays}영업일</span>
                  </div>
                  <div className="qrow total">
                    <span>예상 비용</span>
                    <span>
                      USD {selectedCase.quote.feeRangeUsd[0]}–{selectedCase.quote.feeRangeUsd[1]}
                    </span>
                  </div>
                  <div className="escrow">🛡 에스크로 결제 — 작업 완료 확인 시까지 LabelPass가 대금을 보관합니다.</div>
                  {selectedCase.status === "quoted" && (
                    <button className="btn btn-primary btn-sm ex-qbtn" type="button" onClick={() => acceptQuote(selectedCase)}>
                      견적 수락
                    </button>
                  )}
                  {selectedCase.status === "payment_pending" && (
                    <button
                      className="btn btn-primary btn-sm ex-qbtn"
                      type="button"
                      disabled={isPaying}
                      onClick={() => void payAndOpenConsult(selectedCase)}
                    >
                      {isPaying ? <Loader2 className="lp-spin" size={14} /> : null}
                      결제하고 진행하기 (mock)
                    </button>
                  )}
                  {(selectedCase.status === "in_progress" || selectedCase.status === "completed") && (
                    <Link className="btn btn-ghost btn-sm ex-qbtn" href="/workspace/logistics">
                      물류 요청으로 이어가기 →
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="botin">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendChat();
                }}
                placeholder="메시지 입력…"
              />
              <button className="btn btn-primary" type="button" onClick={sendChat} disabled={!chatInput.trim()}>
                전송
              </button>
            </div>
          </div>
          {!selectedCase.quote && selectedCase.status === "requested" && (
            <button className="ex-reqquote" type="button" disabled={isQuoting} onClick={() => requestQuote(selectedCase)}>
              {isQuoting ? (
                <>
                  <Loader2 className="lp-spin" size={15} /> 견적 산정 중…
                </>
              ) : (
                "이 전문가에게 견적 요청"
              )}
            </button>
          )}
        </div>
      )}

      {profileExpert && (
        <div className="ex-profile-back" role="dialog" aria-modal="true" onClick={() => setProfileExpert(null)}>
          <div className="ex-profile" onClick={(event) => event.stopPropagation()}>
            <div className="exhead">
              <div className="exav" aria-hidden="true">{profileExpert.avatar}</div>
              <div>
                <b>{profileExpert.name.split(" · ")[0]}</b>
                <span className="role">{profileExpert.role}</span>
              </div>
            </div>
            <div className="exstats">
              처리 {profileExpert.handledCount}건 · 평점 {profileExpert.rating} · {profileExpert.responseTime} · 재의뢰율 68%
            </div>
            <div className="exmeta">
              {profileExpert.specialties.map((tag) => (
                <span key={tag} className="chip navy">{tag}</span>
              ))}
            </div>
            <div className="ex-reviews">
              <p>“지적사항을 조문 단위로 짚어줘서 디자이너 전달이 쉬웠어요.” — 고객사</p>
              <p>“리포트 기반이라 빠르게 진행됐습니다.” — 고객사</p>
            </div>
            <div className="exfoot">
              <button className="btn btn-primary btn-sm ex-start" type="button" onClick={() => startConsultWith(profileExpert)}>
                상담 시작
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setProfileExpert(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="lp-toast">{toast}</div>}
    </section>
  );
}
