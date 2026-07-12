import type { Metadata } from "next";
import { CustomsReferenceCard } from "@/components/customs-reference-card";

export const metadata: Metadata = {
  title: "대만 통관 참고 — HS/CCC·수입규정·세율 — LabelPass",
  description: "K-뷰티·식품 수출 품목별 대만 HS/CCC 코드, 수입규정, 수입검사·검역, 세율, 필수 서류 참고표."
};

export default function CustomsPage() {
  return <CustomsReferenceCard />;
}
