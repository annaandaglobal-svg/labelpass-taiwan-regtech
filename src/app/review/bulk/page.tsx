import type { Metadata } from "next";
import { BulkReviewClient } from "./bulk-client";

export const metadata: Metadata = {
  title: "일괄 검토 — LabelPass",
  description: "여러 제품(SKU)의 성분표·라벨을 한 번에 올려 대만 규제 판정을 표로 받습니다."
};

export default function BulkReviewPage() {
  return <BulkReviewClient />;
}
