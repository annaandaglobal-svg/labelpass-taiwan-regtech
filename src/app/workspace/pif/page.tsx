import type { Metadata } from "next";
import { PifClient } from "./pif-client";

export const metadata: Metadata = {
  title: "대만 화장품 PIF 신청 — LabelPass",
  description: "대만 화장품 PIF에 필요한 필수·권장 자료를 확인하고 신청서를 제출합니다."
};

export default function PifPage() {
  return <PifClient />;
}
