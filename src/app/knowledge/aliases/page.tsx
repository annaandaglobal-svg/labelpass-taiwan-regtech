import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAliasReviewQueue } from "@/lib/alias-review";
import AliasReviewClient from "./review-client";

export default function AliasReviewPage() {
  const queue = getAliasReviewQueue();
  const generatedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(queue.generated_at));

  return (
    <>
      <section className="lp-main lp-main-full">
        <div className="alias-review-content alias-review-content-embedded">
          <section className="knowledge-hero alias-review-hero">
            <div>
              <Link className="knowledge-back" href="/knowledge">
                <ArrowLeft size={17} />
                통합검색으로
              </Link>
              <p className="eyebrow">운영팀 전용 검색어 관리</p>
              <h1>사용자 통합검색 뒤에서 원료명과 다른 이름을 관리합니다.</h1>
              <p>
                통합검색에서 0건이 나오거나 엉뚱한 결과가 나올 때 개발·운영자가 쓰는 작업대입니다. 한국어, 영어,
                중문명, 약어, 공급사 표기를 연결하고 같은 검색어가 여러 뜻으로 쓰이는 충돌을 정리합니다.
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
    </>
  );
}
