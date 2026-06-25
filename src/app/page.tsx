"use client";

import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Filter,
  FlaskConical,
  History,
  Info,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
  Upload,
  UserRoundCheck,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Finding, ReviewInput, ReviewResult, ReviewStatus } from "@/lib/compliance";
import { cleanSampleReview, foodAdditiveSampleReview, foodClaimSampleReview, foodCleanSampleReview, foodRiskSampleReview, sampleReview, sourceCards } from "@/lib/sample-data";

type Screen = "review" | "products" | "updates" | "partners";
type FilterStatus = "all" | ReviewStatus;

type SavedReview = {
  id: string;
  input: ReviewInput;
  result: ReviewResult;
};

const emptyInput: ReviewInput = {
  productName: "",
  productType: "",
  ingredientsText: "",
  labelText: "",
  origin: "",
  manufacturer: "",
  hsCode: "",
  incoterms: "",
  shipmentPurpose: "",
  invoiceValue: ""
};

const statusCopy: Record<ReviewStatus, { label: string; tone: string; stamp: string }> = {
  fail: { label: "수정 필요", tone: "danger", stamp: "不合格" },
  warn: { label: "주의", tone: "warn", stamp: "補正" },
  needs_info: { label: "자료 필요", tone: "info", stamp: "待確認" },
  pass: { label: "통과 가능", tone: "pass", stamp: "合格" }
};

const knowledgeStats = {
  sources: "83",
  aliases: "3,116",
  reviewCases: "9",
  knowledgeCases: "35",
  sourceCases: "8"
};

const flowSteps = [
  { label: "라벨 검토", state: "done" },
  { label: "수정 반영", state: "now" },
  { label: "전문가 검수", state: "next" },
  { label: "TFDA 등록", state: "next" },
  { label: "통관·선적", state: "next" }
] as const;

function nowTime() {
  return "2026-06-26";
}

function makeSavedReview(input: ReviewInput, result: ReviewResult): SavedReview {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input,
    result
  };
}

function readSavedReviews(): SavedReview[] | null {
  const raw = window.localStorage.getItem("labelpass-reviews");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    window.localStorage.removeItem("labelpass-reviews");
    return null;
  }
}

async function requestReview(reviewInput: ReviewInput): Promise<ReviewResult> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reviewInput)
  });

  if (!response.ok) {
    throw new Error("review_failed");
  }

  return response.json();
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("review");
  const [input, setInput] = useState<ReviewInput>(emptyInput);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState("위반 항목을 선택하거나 질문을 입력하면, 현재 리포트와 공식 근거 기준으로 답변 초안을 보여드립니다.");
  const [toast, setToast] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSource, setSelectedSource] = useState(sourceCards[0]);

  useEffect(() => {
    let cancelled = false;
    const storedReviews = readSavedReviews();
    if (storedReviews) {
      setSavedReviews(storedReviews);
    } else {
      requestReview(cleanSampleReview)
        .then((seedResult) => {
          if (cancelled) return;
          const seeded = makeSavedReview(cleanSampleReview, seedResult);
          setSavedReviews([seeded]);
          window.localStorage.setItem("labelpass-reviews", JSON.stringify([seeded]));
        })
        .catch(() => {
          if (!cancelled) setToast("초기 샘플 검토를 불러오지 못했습니다.");
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    return filter === "all" ? result.findings : result.findings.filter((item) => item.status === filter);
  }, [filter, result]);

  const visibleStatus = result ? statusCopy[result.status] : null;

  function updateInput<K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function fillSample(kind: "risky" | "clean" | "food-risky" | "food-clean" | "food-additive" | "food-claim") {
    const next =
      kind === "risky"
        ? sampleReview
        : kind === "food-risky"
          ? foodRiskSampleReview
          : kind === "food-additive"
            ? foodAdditiveSampleReview
          : kind === "food-claim"
            ? foodClaimSampleReview
          : kind === "food-clean"
            ? foodCleanSampleReview
            : cleanSampleReview;
    setInput(next);
    setResult(null);
    setExpandedFinding(null);
    setToast(
      kind === "risky"
        ? "화장품 위반 예시 샘플을 채웠습니다."
        : kind === "food-risky"
          ? "식품 알레르겐 누락 예시 샘플을 채웠습니다."
          : kind === "food-additive"
            ? "식품첨가물 확인 예시 샘플을 채웠습니다."
          : kind === "food-claim"
            ? "식품 권장 알레르겐·강조표시 예시 샘플을 채웠습니다."
          : kind === "food-clean"
            ? "식품 통과 예시 샘플을 채웠습니다."
            : "화장품 통과 예시 샘플을 채웠습니다."
    );
  }

  function classifyProduct() {
    const haystack = `${input.productName} ${input.productType} ${input.ingredientsText} ${input.labelText}`;
    const looksFood = /food|snack|tea|cookie|beverage|rice|cracker|protein|low sugar|sugar free|squid|kiwi|msg|sodium benzoate|xanthan|식품|과자|차|쿠키|쌀과자|단백질|고단백|저당|무당|오징어|키위|食品|餅乾|茶|米餅|花生|小麥|高蛋白|低糖|無糖|魷魚|奇異果|味精|苯甲酸鈉|三仙膠/i.test(haystack);

    setInput((current) => ({
      ...current,
      productType: current.productType || (looksFood ? "prepackaged food / 식품" : "leave-on toner / 일반 화장품"),
      ingredientsText: current.ingredientsText || (looksFood ? foodAdditiveSampleReview.ingredientsText : sampleReview.ingredientsText)
    }));
    setToast(looksFood ? "AI 품목 추정: 대만 사전포장식품 기준으로 분류했습니다." : "AI 품목 추정: 일반 화장품, leave-on 제품으로 분류했습니다.");
  }

  async function runReview(nextInput = input) {
    setIsAnalyzing(true);
    setExpandedFinding(null);
    try {
      const nextResult = await requestReview(nextInput);
      const review = makeSavedReview(nextInput, nextResult);
      const nextSaved = [review, ...savedReviews].slice(0, 8);
      setResult(nextResult);
      setSavedReviews(nextSaved);
      window.localStorage.setItem("labelpass-reviews", JSON.stringify(nextSaved));
      setToast("1차 검토가 완료되었습니다. 리포트와 보관함에 저장했습니다.");
    } catch {
      setToast("검토 서버 응답을 받지 못했습니다. 잠시 후 다시 실행해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function recheckAsFixed() {
    const fixedInput = cleanSampleReview;
    setInput(fixedInput);
    setIsAnalyzing(true);
    try {
      const nextResult = await requestReview(fixedInput);
      const review = makeSavedReview(fixedInput, nextResult);
      const nextSaved = [review, ...savedReviews].slice(0, 8);
      setResult(nextResult);
      setSavedReviews(nextSaved);
      window.localStorage.setItem("labelpass-reviews", JSON.stringify(nextSaved));
      setToast("수정본 v4 재검토 완료: 주요 위반이 해결된 상태로 전환했습니다.");
    } catch {
      setToast("수정본 재검토를 완료하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function askAssistant(seed?: Finding) {
    const question = seed ? `${seed.title} 어떻게 고치면 돼?` : assistantQuestion;
    if (!question.trim()) return;
    const base = seed ?? result?.findings.find((item) => item.status === "fail") ?? result?.findings[0];
    if (!base) {
      setAssistantAnswer("먼저 검토를 실행하면 제품 맥락에 맞춰 답변할 수 있습니다.");
      return;
    }
    setAssistantQuestion(question);
    setAssistantAnswer(
      `${base.title} 기준으로는 "${base.fix[0]}"가 1순위입니다. 근거는 ${base.source}이며, 이 답변은 1차 검토 초안이라 실제 출고 전에는 조성표와 대만 수입자 자료로 확인해야 합니다.`
    );
  }

  function downloadReport() {
    window.print();
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="LabelPass navigation">
        <div className="brand">
          <div className="brand-mark">合格</div>
          <div>
            <strong>LabelPass</strong>
            <span>대만 수출 규제검토</span>
          </div>
        </div>

        <nav className="nav-list">
          <NavButton active={screen === "review"} icon={<ClipboardCheck />} label="새 라벨 검토" onClick={() => setScreen("review")} />
          <NavButton active={screen === "products"} icon={<Archive />} label="내 제품" onClick={() => setScreen("products")} />
          <NavButton active={screen === "updates"} icon={<BookOpen />} label="규제 업데이트" onClick={() => setScreen("updates")} />
          <NavButton active={screen === "partners"} icon={<Ship />} label="전문가·통관" onClick={() => setScreen("partners")} />
        </nav>

        <div className="side-panel">
          <div className="panel-kicker">룰셋</div>
          <b>TW-COS / TW-FOOD 2026.06</b>
          <p>화장품 성분 제한과 식품 표시·알레르겐을 분리해서 판정합니다.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">1차 스크리닝 · 법률 자문 아님 · 기준일 {nowTime()}</p>
            <h1>{screen === "review" ? "대만 수출 라벨·통관 검토" : screenTitle(screen)}</h1>
          </div>
          <div className="top-actions">
            <a className="ghost-btn" href="/knowledge">
              <Search size={17} /> Term Search
            </a>
            <button className="ghost-btn" onClick={() => setShowExpertModal(true)}>
              <UserRoundCheck size={17} /> 전문가 검수
            </button>
            <button className="primary-btn" onClick={() => setScreen("review")}>
              <Sparkles size={17} /> 새 검토
            </button>
          </div>
        </header>

        <div className="ops-strip" aria-label="LabelPass 운영 상태">
          <StatusTile icon={<BookOpen />} label="공식 소스" value={knowledgeStats.sources} detail="대만·글로벌 원문 캐시" />
          <StatusTile icon={<Search />} label="검색 별칭" value={knowledgeStats.aliases} detail="다국어 성분·통관 용어" />
          <StatusTile icon={<ClipboardCheck />} label="검증 케이스" value={knowledgeStats.knowledgeCases} detail={`${knowledgeStats.reviewCases}개 검토 · ${knowledgeStats.sourceCases}개 소스`} />
          <StatusTile icon={<ShieldCheck />} label="배포 상태" value="Ready" detail="Vercel Production" />
        </div>

        {screen === "review" && (
          <>
          <section className="command-center" aria-label="LabelPass 검토 현황">
            <div className="command-hero">
              <span className="dday-chip">
                <History size={15} />
                D-5 · 2026.07.01 화장품 PIF 확대
              </span>
              <h2>라벨, 성분, 통관 자료를 한 번에 좁혀서 출고 판단까지 가져갑니다</h2>
              <p>확정 가능한 성분·표시·통관 항목은 정형 룰로 대조하고, 경계 품목과 서류 부족은 전문가 검수로 넘길 수 있게 분리합니다.</p>
              <div className="hero-proof">
                <span><ShieldCheck size={15} /> 정형 룰 우선</span>
                <span><BookOpen size={15} /> 공식 원문 링크</span>
                <span><UserRoundCheck size={15} /> 전문가 전달용 리포트</span>
              </div>
            </div>

            <div className="pipeline-card">
              <div className="pipeline-top">
                <span className="pipeline-badge">진행 중</span>
                <div>
                  <b>수분 진정 토너 300ml</b>
                  <small>대만 · v3 · 라벨 수정 단계</small>
                </div>
              </div>
              <ProgressRail />
              <div className="pipeline-foot">
                <span>다음 조치: 중문 주의사항·대만 수입자 정보 보강</span>
                <button onClick={() => fillSample("risky")}>샘플 불러오기</button>
              </div>
            </div>
          </section>

          <div className="review-grid">
            <section className="input-pane">
              <div className="intake-rail" aria-label="검토 입력 단계">
                <span className="done">1 품목</span>
                <span className="now">2 라벨·성분</span>
                <span>3 통관</span>
                <span>4 판정</span>
              </div>
              <div className="step-row">
                <span>1</span>
                <div>
                  <b>어떤 제품인가요?</b>
                  <p>AI가 품목을 추정하고, 사용자는 확인만 하도록 설계했습니다.</p>
                </div>
              </div>

              <div className="form-section">
                <div className="section-title">
                  <BadgeCheck size={16} />
                  <span>제품 분류</span>
                </div>
                <div className="classifier">
                  <button onClick={classifyProduct}>
                    <Search size={17} /> AI 품목 찾기
                  </button>
                  <button onClick={() => updateInput("productType", "cosmetic / leave-on")}>화장품</button>
                  <button onClick={() => updateInput("productType", "prepackaged food / 식품")}>식품</button>
                  <button onClick={() => updateInput("productType", "borderline / expert")}>경계 품목</button>
                </div>

                <label className="field">
                  <span>제품명</span>
                  <input value={input.productName} onChange={(event) => updateInput("productName", event.target.value)} placeholder="예: 수분 진정 토너 300ml" />
                </label>

                <label className="field">
                  <span>제품 유형</span>
                  <input value={input.productType} onChange={(event) => updateInput("productType", event.target.value)} placeholder="예: leave-on toner / 일반 화장품" />
                </label>
              </div>

              <div className="form-section">
                <div className="section-title">
                  <FileText size={16} />
                  <span>라벨·성분 자료</span>
                </div>
                <label className="field">
                  <span>전성분 텍스트</span>
                  <textarea
                    value={input.ingredientsText}
                    onChange={(event) => updateInput("ingredientsText", event.target.value)}
                    placeholder="Water, Glycerin 4%, Triclosan 0.5% ..."
                    rows={6}
                  />
                </label>

                <div className="upload-row">
                  <button className="upload-box" onClick={() => setToast("라벨 앞면 파일이 첨부된 것으로 표시했습니다.")}>
                    <Upload size={19} />
                    <span>라벨 앞면/PDF 업로드</span>
                  </button>
                  <button className="upload-box" onClick={() => setToast("라벨 뒷면 파일이 첨부된 것으로 표시했습니다.")}>
                    <Upload size={19} />
                    <span>라벨 뒷면/PDF 업로드</span>
                  </button>
                </div>

                <label className="field">
                  <span>라벨 문구 또는 OCR 결과</span>
                  <textarea value={input.labelText} onChange={(event) => updateInput("labelText", event.target.value)} placeholder="品名, 用途, 全成分, 原產地, 批號..." rows={7} />
                </label>
              </div>

              <div className="form-section">
                <div className="section-title">
                  <Ship size={16} />
                  <span>수출입·통관 정보</span>
                </div>
                <div className="two-col">
                  <label className="field">
                    <span>원산지</span>
                    <input value={input.origin} onChange={(event) => updateInput("origin", event.target.value)} placeholder="대한민국" />
                  </label>
                  <label className="field">
                    <span>제조사/수입자</span>
                    <input value={input.manufacturer} onChange={(event) => updateInput("manufacturer", event.target.value)} placeholder="제조사, 대만 수입자" />
                  </label>
                </div>

                <div className="two-col">
                  <label className="field">
                    <span>HS/CCC 코드 (선택)</span>
                    <input value={input.hsCode ?? ""} onChange={(event) => updateInput("hsCode", event.target.value)} placeholder="예: 3304.99 / 1905.90" />
                  </label>
                  <label className="field">
                    <span>거래조건 Incoterms (선택)</span>
                    <input value={input.incoterms ?? ""} onChange={(event) => updateInput("incoterms", event.target.value)} placeholder="예: DAP Taipei / CIF Keelung" />
                  </label>
                </div>

                <div className="two-col">
                  <label className="field">
                    <span>출하 목적 (선택)</span>
                    <input value={input.shipmentPurpose ?? ""} onChange={(event) => updateInput("shipmentPurpose", event.target.value)} placeholder="상업 판매, 샘플, 데모, 시험용" />
                  </label>
                  <label className="field">
                    <span>인보이스 가액 USD (선택)</span>
                    <input value={input.invoiceValue} onChange={(event) => updateInput("invoiceValue", event.target.value)} placeholder="4200" />
                  </label>
                </div>
              </div>

              <div className="action-row">
                <button className="ghost-btn" onClick={() => fillSample("risky")}>화장품 위반 샘플</button>
                <button className="ghost-btn" onClick={() => fillSample("food-risky")}>식품 알레르겐 샘플</button>
                <button className="ghost-btn" onClick={() => fillSample("food-additive")}>식품첨가물 샘플</button>
                <button className="ghost-btn" onClick={() => fillSample("food-claim")}>권장·강조 샘플</button>
                <button className="ghost-btn" onClick={() => fillSample("food-clean")}>식품 통과 샘플</button>
                <button className="primary-btn wide" onClick={() => void runReview()} disabled={isAnalyzing}>
                  {isAnalyzing ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                  AI 1차 검토 시작
                </button>
              </div>
            </section>

            <section className="result-pane">
              {!result && !isAnalyzing && <EmptyResult />}
              {isAnalyzing && <Analyzing />}
              {result && visibleStatus && (
                <>
                  <div className={`verdict ${visibleStatus.tone}`}>
                    <div>
                      <span className="stamp">{visibleStatus.stamp}</span>
                      <h2>{result.summary.fail + result.summary.warn + result.summary.needsInfo}건만 확인하면 출고 판단에 가까워집니다</h2>
                      <p>자동 판정 점수 {result.score}점 · 룰셋 {result.ruleVersion}</p>
                    </div>
                    <strong>{visibleStatus.label}</strong>
                  </div>

                  <div className="metric-grid">
                    <Metric tone="danger" value={result.summary.fail} label="위반" onClick={() => setFilter("fail")} />
                    <Metric tone="info" value={result.summary.needsInfo} label="자료 필요" onClick={() => setFilter("needs_info")} />
                    <Metric tone="warn" value={result.summary.warn} label="주의" onClick={() => setFilter("warn")} />
                    <Metric tone="pass" value={result.summary.pass} label="통과" onClick={() => setFilter("pass")} />
                  </div>

                  <div className="report-toolbar">
                    <button className={filter === "all" ? "chip active" : "chip"} onClick={() => setFilter("all")}>
                      <Filter size={15} /> 전체
                    </button>
                    <button className="ghost-btn" onClick={downloadReport}>
                      <Download size={16} /> PDF 내려받기
                    </button>
                    <button className="ghost-btn" onClick={() => void recheckAsFixed()}>
                      <RefreshCw size={16} /> 수정본 재검토
                    </button>
                  </div>

                  <div className="findings">
                    {filteredFindings.map((finding) => (
                      <FindingRow
                        key={finding.id}
                        finding={finding}
                        expanded={expandedFinding === finding.id}
                        onToggle={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                        onAsk={() => askAssistant(finding)}
                      />
                    ))}
                  </div>

                  <div className="next-actions">
                    <button onClick={() => setShowExpertModal(true)}>
                      <UserRoundCheck size={18} />
                      <span>
                        <b>전문가 검수 요청</b>
                        <small>위반/자료필요 항목만 묶어서 전달</small>
                      </span>
                    </button>
                    <button onClick={() => setScreen("products")}>
                      <Archive size={18} />
                      <span>
                        <b>보관함에서 버전 관리</b>
                        <small>v1 → v2 수정 이력 비교</small>
                      </span>
                    </button>
                    <button onClick={() => setShowLogisticsModal(true)}>
                      <Ship size={18} />
                      <span>
                        <b>통관·물류 견적</b>
                        <small>서류 체크 후 파트너 비교</small>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
          </>
        )}

        {screen === "products" && <ProductsScreen savedReviews={savedReviews} onOpen={(review) => { setInput(review.input); setResult(review.result); setScreen("review"); }} />}
        {screen === "updates" && <UpdatesScreen onSelect={setSelectedSource} selectedSource={selectedSource} />}
        {screen === "partners" && <PartnersScreen onExpert={() => setShowExpertModal(true)} onLogistics={() => setShowLogisticsModal(true)} />}
      </section>

      <aside className="assistant-panel">
        <div className="assistant-header">
          <Bot size={19} />
          <div>
            <b>규제 어시스턴트</b>
            <span>현재 리포트 맥락으로 답변</span>
          </div>
        </div>
        <div className="answer">{assistantAnswer}</div>
        <div className="ask-row">
          <input value={assistantQuestion} onChange={(event) => setAssistantQuestion(event.target.value)} placeholder="예: Triclosan 대체안은?" />
          <button onClick={() => askAssistant()} aria-label="질문 보내기">
            <Send size={16} />
          </button>
        </div>
        <div className="source-list">
          {sourceCards.slice(0, 4).map((source) => (
            <button key={source.title} onClick={() => { setSelectedSource(source); setScreen("updates"); }}>
              <span>{source.tag}</span>
              {source.title}
            </button>
          ))}
        </div>
      </aside>

      {showExpertModal && <ExpertModal onClose={() => setShowExpertModal(false)} />}
      {showLogisticsModal && <LogisticsModal onClose={() => setShowLogisticsModal(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function screenTitle(screen: Screen) {
  if (screen === "products") return "내 제품 보관함";
  if (screen === "updates") return "대만 규제 업데이트";
  return "전문가 검수와 통관 연결";
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={active ? "nav-btn active" : "nav-btn"} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function Metric({ value, label, tone, onClick }: { value: number; label: string; tone: string; onClick: () => void }) {
  return (
    <button className={`metric ${tone}`} onClick={onClick}>
      <b>{value}</b>
      <span>{label}</span>
    </button>
  );
}

function StatusTile({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="status-tile">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <em>{detail}</em>
      </div>
    </div>
  );
}

function ProgressRail() {
  return (
    <div className="progress-rail">
      {flowSteps.map((step) => (
        <span key={step.label} className={step.state}>
          {step.label}
        </span>
      ))}
    </div>
  );
}

function statusIcon(status: ReviewStatus) {
  if (status === "fail") return <AlertTriangle size={18} />;
  if (status === "pass") return <Check size={18} />;
  if (status === "needs_info") return <Info size={18} />;
  return <AlertTriangle size={18} />;
}

function knowledgeQueryForFinding(finding: Finding) {
  return (finding.evidence || finding.title || finding.source).replace(/\s+/g, " ").trim();
}

function FindingRow({ finding, expanded, onToggle, onAsk }: { finding: Finding; expanded: boolean; onToggle: () => void; onAsk: () => void }) {
  const copy = statusCopy[finding.status];
  const knowledgeHref = `/knowledge?q=${encodeURIComponent(knowledgeQueryForFinding(finding))}`;
  return (
    <article className={`finding ${copy.tone}`}>
      <button className="finding-head" onClick={onToggle}>
        <span className="finding-icon">{statusIcon(finding.status)}</span>
        <span>
          <b>{finding.title}</b>
          <small>{finding.area} · 위험도 {finding.severity}</small>
        </span>
        <ChevronDown className={expanded ? "rotate" : ""} size={18} />
      </button>
      {expanded && (
        <div className="finding-body">
          {finding.evidence && <p className="evidence">탐지 근거: {finding.evidence}</p>}
          <p>{finding.why}</p>
          <div className="fix-list">
            {finding.fix.map((fix) => (
              <div key={fix}>
                <Check size={15} /> {fix}
              </div>
            ))}
          </div>
          <div className="finding-foot">
            <a href={finding.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> {finding.source}
            </a>
            <a href={knowledgeHref}>
              <Search size={15} /> 지식검색에서 보기
            </a>
            <button onClick={onAsk}>
              <MessageSquare size={15} /> 이 항목 질문
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function EmptyResult() {
  return (
    <div className="empty-result">
      <div className="label-visual">
        <div className="label-card">
          <span>舒敏保濕化妝水</span>
          <b>Label OCR</b>
          <p>全成分 · 原產地 · 批號</p>
          <div className="barcode" />
        </div>
        <div className="pin pin-a">성분</div>
        <div className="pin pin-b">라벨</div>
      </div>
      <h2>전성분과 라벨 문구를 넣으면 바로 판정합니다</h2>
      <p>금지·제한 성분, 농도 초과, 중문 필수 항목, 의료 효능 표현, PIF 준비도까지 한 번에 봅니다.</p>
    </div>
  );
}

function Analyzing() {
  return (
    <div className="analyzing">
      <RefreshCw className="spin" size={28} />
      <h2>대만 규제 기준으로 검토 중…</h2>
      <p>성분명 정규화, 농도 대조, 라벨 필수 항목, 효능 표현 위험을 순서대로 확인합니다.</p>
      <div className="analysis-steps">
        <span>TFDA 오픈데이터 대조</span>
        <span>라벨 Article 7 점검</span>
        <span>전문가 검수 필요 구간 분리</span>
      </div>
    </div>
  );
}

function ProductsScreen({ savedReviews, onOpen }: { savedReviews: SavedReview[]; onOpen: (review: SavedReview) => void }) {
  return (
    <div className="screen-grid">
      <section className="list-pane">
        <h2>검토 이력</h2>
        <p className="muted">고객이 다시 들어왔을 때 가장 먼저 확인하는 보관함입니다.</p>
        <div className="saved-list">
          {savedReviews.map((review, index) => (
            <button key={review.id} className="saved-item" onClick={() => onOpen(review)}>
              <span className={`dot ${statusCopy[review.result.status].tone}`} />
              <div>
                <b>{review.input.productName || "이름 없는 제품"}</b>
                <small>v{savedReviews.length - index} · {statusCopy[review.result.status].label} · {new Date(review.result.generatedAt).toLocaleString("ko-KR")}</small>
              </div>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>
      </section>

      <section className="detail-pane">
        <h2>지금 할 일</h2>
        <div className="task-list">
          <label><input type="checkbox" /> 제조사에서 Triclosan 함량 또는 대체 처방 확인</label>
          <label><input type="checkbox" /> 디자이너에게 중문 주의사항과 수입자 정보 추가 요청</label>
          <label><input type="checkbox" /> PIF 준비도 체크리스트 작성</label>
          <label><input type="checkbox" /> 수정본 라벨 업로드 후 재검토</label>
        </div>
        <h2>수출 서류함</h2>
        <div className="doc-grid">
          <span><FileText size={18} /> PIF 준비도</span>
          <span><FileText size={18} /> COA / 조성표</span>
          <span><FileText size={18} /> CFS / GMP</span>
          <span><FileText size={18} /> 인보이스 / 패킹리스트</span>
        </div>
      </section>
    </div>
  );
}

function UpdatesScreen({ selectedSource, onSelect }: { selectedSource: (typeof sourceCards)[number]; onSelect: (source: (typeof sourceCards)[number]) => void }) {
  return (
    <div className="screen-grid">
      <section className="list-pane">
        <h2>공식 자료 소스</h2>
        <p className="muted">PDF보다 오픈데이터를 우선 ingest하고, 공지/법령은 변경분 리뷰 대상으로 둡니다.</p>
        <div className="source-card-list">
          {sourceCards.map((source) => (
            <button key={source.title} className={selectedSource.title === source.title ? "source-card active" : "source-card"} onClick={() => onSelect(source)}>
              <span>{source.tag}</span>
              <b>{source.title}</b>
              <small>{source.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="detail-pane">
        <div className="update-feature">
          <BookOpen size={24} />
          <span>{selectedSource.tag}</span>
          <h2>{selectedSource.title}</h2>
          <p>{selectedSource.detail}</p>
          <a href={selectedSource.url} target="_blank" rel="noreferrer">
            공식 페이지 열기 <ExternalLink size={16} />
          </a>
        </div>
        <div className="timeline">
          <div><b>2026-07-01</b><span>일부 예외를 제외한 모든 화장품 PIF 의무화</span></div>
          <div><b>2025-11-06</b><span>화장품 성분 사용 제한표 개정 공고, 2027-10-01 시행</span></div>
          <div><b>상시</b><span>금지·제한·방부제·자외선차단·색소 데이터셋 증분 수집</span></div>
        </div>
      </section>
    </div>
  );
}

function PartnersScreen({ onExpert, onLogistics }: { onExpert: () => void; onLogistics: () => void }) {
  return (
    <div className="partner-grid">
      <section className="partner-card">
        <UserRoundCheck size={24} />
        <h2>전문가 검수</h2>
        <p>AI 1차 리포트에서 위반·자료필요 항목만 묶어 전문가에게 전달합니다. 수익화는 이 지점이 가장 자연스럽습니다.</p>
        <button className="primary-btn" onClick={onExpert}>견적 카드 열기</button>
      </section>
      <section className="partner-card">
        <Ship size={24} />
        <h2>통관·물류</h2>
        <p>라벨/서류 체크 이후 인보이스, 박스 수, 총중량, CBM을 받아 파트너 3사 견적 비교로 연결합니다.</p>
        <button className="primary-btn" onClick={onLogistics}>견적 요청 열기</button>
      </section>
      <section className="partner-card">
        <ShieldCheck size={24} />
        <h2>보안 원칙</h2>
        <p>조성표와 PIF는 영업비밀입니다. MVP부터 사용자별 접근권한, 감사로그, 삭제 정책을 전제로 설계합니다.</p>
        <button className="ghost-btn">NDA 템플릿 확인</button>
      </section>
    </div>
  );
}

function ExpertModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal">
        <button className="close-btn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        <h2>전문가 검수 요청</h2>
        <p>리포트 전체 검수와 위반 항목 긴급 검수를 선택할 수 있습니다. 실제 결제 연동 전까지는 견적 카드 형태로 동작합니다.</p>
        <div className="quote-grid">
          <button><b>위반 항목 긴급 검수</b><span>₩90,000~ · 24시간</span></button>
          <button><b>리포트 전체 검수</b><span>₩180,000~ · 2영업일</span></button>
          <button><b>PIF 준비도 체크</b><span>₩250,000~ · 자료 목록 확인</span></button>
        </div>
        <div className="chat-preview">
          <b>김O정 규제 전문가</b>
          <span>리포트와 라벨 OCR을 자동 공유하고, 채팅에서 추가 자료를 요청합니다.</span>
        </div>
      </section>
    </div>
  );
}

function LogisticsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal">
        <button className="close-btn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        <h2>통관·물류 견적 요청</h2>
        <p>대만 수입 전 라벨/서류 체크가 끝난 건만 물류 견적으로 넘기는 흐름입니다.</p>
        <div className="logistics-grid">
          <span><PackageCheck size={17} /> 부산 → 지룽(基隆)</span>
          <span><FlaskConical size={17} /> 화장품 샘플/상업 송장</span>
          <span><History size={17} /> 예상 리드타임 7~12일</span>
        </div>
        <button className="primary-btn" onClick={onClose}>파트너 3사 비교 요청</button>
      </section>
    </div>
  );
}
