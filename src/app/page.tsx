"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";
import {
  HANDOFF_DRAFTS_STORAGE_KEY,
  parseHandoffDrafts,
  type HandoffDraft
} from "@/lib/handoff-drafts";

const PIPELINE_STEPS = ["라벨 검토", "수정 반영", "전문가 검수", "TFDA 등록", "통관·선적"];

type StatusChip = { cls: "pass" | "warn" | "fail" | "navy" | "gray"; label: string };

function statusChip(draft: HandoffDraft): StatusChip {
  if (draft.status === "fail") return { cls: "fail", label: `수정 필요 ${Math.max(draft.neededDocuments, 1)}건` };
  if (draft.status === "warn" || draft.status === "needs_info") return { cls: "warn", label: "확인 필요" };
  if (draft.priority === "ready_to_file") return { cls: "navy", label: "출고 준비" };
  return { cls: "pass", label: "1차 통과" };
}

// Map the saved review priority onto the 5-step launch pipeline so each product row
// shows where it actually is, not a fabricated stage.
function currentStepIndex(draft: HandoffDraft): number {
  if (draft.priority === "ready_to_file") return 2;
  if (draft.status === "pass") return 2;
  return 1;
}

function formatDate(iso: string): string {
  const stamped = iso.slice(0, 10).replaceAll("-", ".");
  return stamped || "최근";
}

export default function Home() {
  const [drafts, setDrafts] = useState<HandoffDraft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setDrafts(parseHandoffDrafts(window.localStorage.getItem(HANDOFF_DRAFTS_STORAGE_KEY)));
    } catch {
      setDrafts([]);
    }
    setLoaded(true);
  }, []);

  const completed = drafts.length;
  const needFix = drafts.filter((draft) => draft.priority !== "ready_to_file").length;
  const shipping = drafts.filter((draft) => draft.priority === "ready_to_file").length;

  return (
    <section className="lpv5 home-dash">
      <div className="greet">
        <h1>안녕하세요 👋</h1>
        <span className="ddaychip">
          <span className="n">TW</span>
          대만 화장품·식품 규제 상시 반영
        </span>
      </div>

      <div className="herocheck">
        <div className="seal-h" aria-hidden="true">合格</div>
        <div className="herocheck-copy">
          <h2>보내기 전에, 판정받으세요</h2>
          <p>라벨 시안·전성분 파일을 올리면 대만 법령·고시와 대조해 1차 판정합니다.</p>
          <div className="pf">
            <span>근거 조문 표기</span>
            <span>수정안·대체 성분 제안</span>
            <span>5단계 판정 상태로 명확화</span>
          </div>
        </div>
        <div className="cta">
          <Link className="btn btn-primary btn-big" href="/review">
            새 라벨 검토 시작
            <ArrowRight size={16} />
          </Link>
          <Link className="linkbtn-light" href="/review#sample">
            검토 화면에서 샘플로 체험 →
          </Link>
        </div>
      </div>

      <div className="statrow">
        <div className="stat">
          <b>{loaded ? completed : "—"}</b>
          <span>검토한 제품</span>
        </div>
        <div className="stat">
          <b className="v-warn">{loaded ? needFix : "—"}</b>
          <span>수정·확인 대기</span>
        </div>
        <div className="stat">
          <b className="v-navy">{loaded ? shipping : "—"}</b>
          <span>출고 준비 완료</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>진행 중인 제품</h2>
          <Link className="linkbtn" href="/workspace">
            전체 보기 →
          </Link>
        </div>

        {!loaded ? (
          <p className="home-empty">불러오는 중…</p>
        ) : drafts.length === 0 ? (
          <div className="home-empty-cta">
            <ShieldCheck size={26} />
            <div>
              <b>아직 검토한 제품이 없습니다</b>
              <p>라벨·전성분 파일을 올리면 대만 기준 1차 판정과 다음 행동이 여기에 쌓입니다.</p>
            </div>
            <Link className="btn btn-primary" href="/review">
              첫 검토 시작
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          drafts.map((draft) => {
            const chip = statusChip(draft);
            const nowStep = currentStepIndex(draft);
            return (
              <div key={draft.id} className="pipe-row">
                <div className="pipe-top">
                  <div className="ic" aria-hidden="true">
                    🧴
                  </div>
                  <div className="pipe-id">
                    <div className="nm">{draft.productName || draft.routeLabel}</div>
                    <div className="mt">
                      {draft.routeLabel} · {formatDate(draft.createdAt)} · 룰셋 대조
                    </div>
                  </div>
                  <div className="act">
                    <span className={`chip ${chip.cls}`}>{chip.label}</span>
                    <Link className="linkbtn" href="/review">
                      다시 검토 →
                    </Link>
                  </div>
                </div>
                <div className="pipe-steps">
                  {PIPELINE_STEPS.map((label, index) => (
                    <div
                      key={label}
                      className={`pstep${index < nowStep ? " done" : index === nowStep ? " now" : ""}`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                {draft.nextAction && <p className="pipe-next">다음: {draft.nextAction}</p>}
              </div>
            );
          })
        )}
      </div>

      <div className="card mt14">
        <div className="card-head">
          <h2>
            대만 규제 근거 <span className="sub">— 공식 출처 기준</span>
          </h2>
          <Link className="linkbtn" href="/licensing">
            인허가 서류 리스트 →
          </Link>
        </div>
        <div className="reg-list">
          <div className="reg-item">
            <span className="dt">화장품</span>
            <div>
              <b>제품등록·PIF·GMP 의무</b> <span className="law">化粧品衛生安全管理法</span>
              <p>성분 제한·중문 라벨·효능 표현·PIF 준비 상태를 한 흐름으로 검토합니다.</p>
            </div>
          </div>
          <div className="reg-item">
            <span className="dt">식품</span>
            <div>
              <b>영양표시·첨가물·알레르기 표시</b> <span className="law">食品安全衛生管理法</span>
              <p>포지티브 리스트 대조와 필수 기재항목을 판정에 함께 반영합니다.</p>
            </div>
          </div>
          <div className="reg-item">
            <span className="dt">통관</span>
            <div>
              <b>HS·CCC 코드와 수입검사 서류</b> <span className="law">Customs Administration</span>
              <p>품목 분류·원산지·수입자 등록 요건을 검토 결과와 함께 정리합니다.</p>
              <Link className="linkbtn" href="/customs">
                통관 참고표 (HS/CCC·세율·검역) →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="home-foot">
        <Sparkles size={14} />
        <b>체험 모드:</b> 로그인·실결제 없이 검토·서류·견적·전문가 상담까지 모든 기능을 바로 사용해볼 수 있습니다 (결제는 테스트 처리, 데이터는 브라우저에 저장). 1차 스크리닝 도구이며, 최종 판정과 책임은 사용자·수입자·전문가에게 있고 모든 판정에 룰셋 버전·확인일이 표기됩니다.
        <Link className="linkbtn" href="/review">
          <ClipboardCheck size={14} />
          검토 시작
        </Link>
        <Link className="linkbtn" href="/knowledge">
          <BookOpen size={14} />
          규정 근거
        </Link>
      </div>
    </section>
  );
}
