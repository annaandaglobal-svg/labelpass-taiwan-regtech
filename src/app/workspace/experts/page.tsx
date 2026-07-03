import type { Metadata } from "next";
import { ExpertsClient } from "./experts-client";

export const metadata: Metadata = {
  title: "전문가 상담·견적 — LabelPass",
  description: "대만 규제 전문가 매칭 요청, 견적 확인, 상담 채팅을 한 화면에서 진행합니다."
};

export default function WorkspaceExpertsPage() {
  return <ExpertsClient />;
}
