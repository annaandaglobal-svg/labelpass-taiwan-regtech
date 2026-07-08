import type { Metadata } from "next";
import ConsultClient from "./consult-client";

export const metadata: Metadata = {
  title: "AI 상담 · LabelPass",
  description: "대만 수출 규제 지식베이스에 근거한 AI 상담 — 성분·라벨·통관·검사 질문에 근거와 함께 답합니다."
};

export default function ConsultPage() {
  return <ConsultClient />;
}
