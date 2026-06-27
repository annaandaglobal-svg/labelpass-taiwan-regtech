import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAliasReviewQueue } from "@/lib/alias-review";
import { AppShell } from "@/components/app-shell";
import AliasReviewClient from "./review-client";

export default function AliasReviewPage() {
  const queue = getAliasReviewQueue();
  const generatedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(queue.generated_at));

  return (
    <AppShell active="aliases">
      <section className="lp-main lp-main-full">
        <div className="knowledge-shell alias-review-shell knowledge-shell-embedded">
          <section className="knowledge-hero alias-review-hero">
            <div>
              <Link className="knowledge-back" href="/knowledge">
                <ArrowLeft size={17} />
                지식 검색으로
              </Link>
              <p className="eyebrow">용어·별칭 운영 큐</p>
              <h1>별칭 검수 작업대</h1>
              <p>
                같은 원료와 규제 표현이 나라·언어·품목별로 다르게 불리는 문제를 검수합니다. 충돌, 깨진 문자,
                현지명 누락을 우선순위대로 정리해 검색 품질을 계속 올립니다.
              </p>
            </div>
            <div className="alias-review-hero-meta">
              <span>생성 {generatedAt}</span>
              <span>레지스트리 {queue.summary.registry_version}</span>
              <span>검수 항목 {queue.summary.review_items.toLocaleString()}건</span>
            </div>
          </section>

          <AliasReviewClient queue={queue} />
        </div>
      </section>
    </AppShell>
  );
}
