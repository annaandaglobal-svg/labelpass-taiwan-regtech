"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";

type Citation = { id: string; term: string; category: string; label: string };
type Msg = {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  grounded?: boolean;
  pending?: boolean;
};

const EXAMPLES = [
  "총비소랑 무기비소가 뭐가 달라?",
  "유아 쌀과자 대만 수출할 때 뭘 조심해야 해?",
  "라면 스프에 에틸렌옥사이드가 문제 되나요?",
  "영유아 조제식은 관세가 어떻게 달라져요?",
  "화장품에 하이드로퀴논 써도 되나요?"
];

export default function ConsultClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    const history = messages.filter((m) => !m.pending).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: "", pending: true }]);
    setBusy(true);
    try {
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history })
      });
      const data = await response.json();
      const answer: string = data?.answer || "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setMessages((prev) => {
        const next = prev.slice(0, -1);
        return [...next, { role: "assistant", text: answer, citations: data?.citations ?? [], grounded: Boolean(data?.grounded) }];
      });
    } catch {
      setMessages((prev) => {
        const next = prev.slice(0, -1);
        return [...next, { role: "assistant", text: "연결에 실패했습니다. 잠시 후 다시 시도해 주세요.", grounded: false }];
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp-consult">
      <header className="lp-consult-head">
        <div className="lp-consult-title">
          <MessageCircle size={20} />
          <div>
            <h1>AI 상담</h1>
            <span>대만 수출 규제 지식베이스에 근거해 답합니다. 근거가 없으면 추측 대신 확인을 권합니다.</span>
          </div>
        </div>
        <Link className="lp-consult-expert" href="/workspace/experts">
          사람 전문가 상담
          <ArrowRight size={14} />
        </Link>
      </header>

      <div className="lp-consult-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="lp-consult-empty">
            <ShieldCheck size={26} />
            <b>무엇이든 물어보세요 — 성분·라벨·통관·검사·관세</b>
            <p>큐레이션된 규제 지식에 근거해 답하고, 판정의 출처를 함께 보여줍니다.</p>
            <div className="lp-consult-examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => ask(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`lp-consult-msg ${m.role}`}>
              <div className="lp-consult-bubble">
                {m.pending ? (
                  <span className="lp-consult-typing">
                    <Loader2 size={15} className="spin" /> 지식베이스에서 근거를 찾는 중…
                  </span>
                ) : (
                  <>
                    <p>{m.text}</p>
                    {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                      <div className="lp-consult-cites">
                        <span className="lp-consult-cites-label">근거</span>
                        {m.citations.map((c) => (
                          <Link key={c.id} className="lp-consult-cite" href={`/knowledge?q=${encodeURIComponent(c.term)}`} title={c.label}>
                            {c.term}
                          </Link>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && !m.grounded && (
                      <span className="lp-consult-ungrounded">⚠️ 지식베이스 근거가 부족한 답변입니다 — 공식 확인·전문가 상담을 권합니다.</span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="lp-consult-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 총비소랑 무기비소 차이가 뭐예요?"
          aria-label="상담 질문 입력"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="질문 보내기">
          {busy ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </form>
      <p className="lp-consult-disclaimer">
        AI 답변은 참고용입니다. 최종 판단은 공식 출처(TFDA·법령)와 전문가 확인을 거치세요.
      </p>
    </div>
  );
}
