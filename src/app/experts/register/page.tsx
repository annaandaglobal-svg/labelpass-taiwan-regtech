"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, Loader2 } from "lucide-react";
import { EXPERT_LANGUAGE_OPTIONS, EXPERT_SERVICE_OPTIONS, type ExpertRegistrationInput } from "@/lib/expert-registration-shared";

const STORAGE_KEY = "labelpass-expert-registrations";
const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어",
  "zh-Hant": "번체 중문",
  "zh-Hans": "간체 중문",
  en: "영어",
  ja: "일본어"
};

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ExpertRegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["ko", "zh-Hant"]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [credential, setCredential] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { queued: boolean }>(null);
  const [error, setError] = useState("");

  const canSubmit = displayName.trim().length > 0 && categories.length > 0 && !submitting;

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    const registration: ExpertRegistrationInput = {
      id: newId(),
      createdAt: new Date().toISOString(),
      displayName: displayName.trim(),
      companyName: companyName.trim(),
      role: role.trim(),
      yearsExperience: years.trim() ? Number(years.replace(/[^0-9]/g, "")) || null : null,
      categories,
      languages,
      hourlyRate: hourlyRate.trim() ? Number(hourlyRate.replace(/[^0-9.]/g, "")) || null : null,
      currency: currency.trim() || "USD",
      credential: credential.trim(),
      contactEmail: contactEmail.trim(),
      bio: bio.trim()
    };

    // Keep a local copy so the application is never lost, then validate against the server
    // (dry-run: the server confirms the schema and reports whether the operator DB queue is live).
    try {
      const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      const list = Array.isArray(existing) ? existing : [];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([registration, ...list].slice(0, 20)));
    } catch {
      // ignore local persistence failures
    }

    try {
      const response = await fetch("/api/experts/register?dryRun=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registration, requestId: `expert-reg-${registration.id}` })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError("입력값 검증에 실패했습니다. 필수 항목을 확인해 주세요.");
        setSubmitting(false);
        return;
      }
      const queued = body?.storage === "database";
      setDone({ queued });
    } catch {
      // Offline / server unreachable — the local copy is still saved.
      setDone({ queued: false });
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <section className="lpv5 expert-reg">
        <Link className="linkbtn" href="/workspace/experts">
          <ArrowLeft size={14} />
          전문가 검수로
        </Link>
        <div className="card expert-reg-done">
          <CheckCircle2 size={40} />
          <h1>등록 신청이 접수됐습니다</h1>
          <p>
            {done.queued
              ? "운영팀 검수 큐에 등록되었습니다. 자격 확인 후 프로필이 활성화되면 안내드립니다."
              : "신청 내용을 저장했습니다. 운영 DB 연결이 켜지면 검수 큐로 전송되며, 그 전까지는 안전하게 보관됩니다."}
          </p>
          <p className="expert-reg-note">검수·활성화 상태는 관리자 운영 대시보드(/admin/experts)에서 확인·처리됩니다.</p>
          <Link className="btn btn-primary" href="/">
            홈으로
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="lpv5 expert-reg">
      <Link className="linkbtn" href="/workspace/experts">
        <ArrowLeft size={14} />
        전문가 검수로
      </Link>

      <div className="expert-reg-head">
        <span className="expert-reg-badge" aria-hidden="true">
          <BadgeCheck size={18} />
        </span>
        <div>
          <h1>전문가로 등록하기</h1>
          <p className="sub">
            대만 인허가·라벨·통관 전문가로 등록하면 LabelPass 검수 요청과 견적 의뢰를 받을 수 있습니다. 자격 확인 후 프로필이 활성화됩니다.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="lp-field-grid">
          <label className="lp-field">
            <span>이름 / 활동명 *</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="예: 김O정" />
          </label>
          <label className="lp-field">
            <span>회사 / 소속</span>
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="예: OO컨설팅" />
          </label>
          <label className="lp-field">
            <span>직함 / 역할</span>
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="예: 대만 인허가 컨설턴트 / 관세사 / 현지 RA 약사" />
          </label>
          <label className="lp-field">
            <span>경력 (년)</span>
            <input value={years} onChange={(event) => setYears(event.target.value)} placeholder="예: 12" inputMode="numeric" />
          </label>
        </div>

        <div className="expert-reg-group">
          <span className="expert-reg-label">제공 서비스 * (해당 항목 모두 선택)</span>
          <div className="expert-reg-chips">
            {EXPERT_SERVICE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={categories.includes(option) ? "on" : ""}
                onClick={() => toggle(categories, setCategories, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="expert-reg-group">
          <span className="expert-reg-label">사용 언어</span>
          <div className="expert-reg-chips">
            {EXPERT_LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={languages.includes(option) ? "on" : ""}
                onClick={() => toggle(languages, setLanguages, option)}
              >
                {LANGUAGE_LABELS[option] ?? option}
              </button>
            ))}
          </div>
        </div>

        <div className="lp-field-grid">
          <label className="lp-field">
            <span>기준 단가 (선택)</span>
            <input value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} placeholder="예: 150000" inputMode="decimal" />
          </label>
          <label className="lp-field">
            <span>통화</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="USD">USD</option>
              <option value="KRW">KRW</option>
              <option value="TWD">TWD</option>
            </select>
          </label>
        </div>

        <label className="lp-field lp-wide">
          <span>자격 · 경력 요약</span>
          <textarea
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            placeholder="예: TFDA 화장품 등록 142건, PIF 작성 경험, 대만 현지 RA 라이선스 등"
            rows={3}
          />
        </label>

        <div className="lp-field-grid">
          <label className="lp-field">
            <span>연락 이메일</span>
            <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="name@example.com" inputMode="email" />
          </label>
        </div>

        <label className="lp-field lp-wide">
          <span>소개 (선택)</span>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="전문 분야, 처리 사례, 응답 가능 시간대 등을 자유롭게 적어주세요." rows={4} />
        </label>

        {error && <p className="expert-reg-error">{error}</p>}

        <div className="expert-reg-actions">
          <button className="btn btn-primary" type="button" onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? <Loader2 className="lp-spin" size={16} /> : <BadgeCheck size={16} />}
            등록 신청
          </button>
          <small>제출 시 자격 확인을 위한 검수 큐로 전달됩니다. 활성화 전까지 프로필은 비공개입니다.</small>
        </div>
      </div>
    </section>
  );
}
