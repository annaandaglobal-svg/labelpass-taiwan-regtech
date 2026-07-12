"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileWarning, Info, Printer, ShieldCheck } from "lucide-react";
import { decodeReport, REPORT_STATUS_COPY, type ShareableReport } from "@/lib/report-share";

const stampLabel: Record<string, string> = { fail: "보류", warn: "수정", needs_info: "확인", pass: "가능" };

function stateIcon(tone: string) {
  if (tone === "fail") return <FileWarning size={15} />;
  if (tone === "warn") return <AlertTriangle size={15} />;
  if (tone === "navy") return <Info size={15} />;
  return <CheckCircle2 size={15} />;
}

function findingTone(state: string) {
  if (state === "fail") return "fail";
  if (state === "warn") return "warn";
  if (state === "needs_info") return "navy";
  return "pass";
}

export default function ReportViewPage() {
  const [report, setReport] = useState<ShareableReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get("d");
    setReport(encoded ? decodeReport(encoded) : null);
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <div className="report-page report-loading">불러오는 중…</div>;
  }

  if (!report) {
    return (
      <div className="report-page">
        <div className="report-empty">
          <FileWarning size={34} />
          <h1>리포트를 찾을 수 없습니다</h1>
          <p>링크가 올바르지 않거나 손상되었습니다. 원본에서 공유 링크를 다시 생성해 주세요.</p>
          <Link className="lp-button" href="/review">
            검토 화면으로
          </Link>
        </div>
      </div>
    );
  }

  const status = REPORT_STATUS_COPY[report.status];

  return (
    <div className="report-page">
      <header className="report-bar">
        <div className="report-id">
          <span className="portal-seal" aria-hidden="true">합격</span>
          <div>
            <strong>LabelPass</strong>
            <small>대만 1차 규제 검토 리포트</small>
          </div>
        </div>
        <button type="button" className="lp-print-btn" onClick={() => window.print()}>
          <Printer size={14} />
          인쇄 · PDF
        </button>
      </header>

      <main className="report-body">
        <div className={`report-verdict ${status.tone}`}>
          <div className={`lp-stamp ${status.tone}`} aria-hidden="true">
            <small>1차 검토</small>
            <b>{stampLabel[report.status]}</b>
            <small>{new Date(report.at).toLocaleDateString("ko-KR")}</small>
          </div>
          <div className="report-verdict-body">
            <span className="report-eyebrow">{report.category} · {status.label}</span>
            <h1>{report.name}</h1>
            <p>{status.detail}</p>
            <div className="report-counts">
              <span className="chip fail">수정 필요 {report.summary.fail}</span>
              <span className="chip warn">확인 {report.summary.warn}</span>
              <span className="chip navy">자료 {report.summary.needsInfo}</span>
              <span className="chip pass">문제없음 {report.summary.pass}</span>
              <span className="report-score">종합 {report.score}/100</span>
            </div>
          </div>
        </div>

        {report.issues.length > 0 && (
          <section className="report-section">
            <h2>주요 지적사항</h2>
            <div className="report-issues">
              {report.issues.map((issue, index) => (
                <div key={index} className={`report-issue ${findingTone(issue.state)}`}>
                  <div className="report-issue-head">
                    {stateIcon(findingTone(issue.state))}
                    <b>{issue.title}</b>
                    <span className="report-issue-area">{issue.area}</span>
                  </div>
                  {issue.why && <p className="report-issue-why">{issue.why}</p>}
                  {issue.fix && <p className="report-issue-fix">→ {issue.fix}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {report.ingredients.length > 0 && (
          <section className="report-section">
            <h2>성분별 판정</h2>
            <div className="report-ing-list">
              {report.ingredients.map((ing, index) => (
                <div key={index} className="report-ing-row">
                  <span className="report-ing-name">{ing.name}</span>
                  <span className="report-ing-state">{ing.state}</span>
                  <span className="report-ing-label">{ing.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="report-foot">
          <ShieldCheck size={14} />
          <span>
            LabelPass 1차 자동 검토 결과입니다 (룰셋 {report.version}). 공식 증빙과 최종 판단은 담당 전문가·관계 기관 확인이 필요합니다.
          </span>
        </footer>
      </main>
    </div>
  );
}
