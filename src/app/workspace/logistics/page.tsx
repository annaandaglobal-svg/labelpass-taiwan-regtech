import type { Metadata } from "next";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";
import { LogisticsClient } from "./logistics-client";

export const metadata: Metadata = {
  title: "물류·선적 트래킹 — LabelPass",
  description: "한국-대만 선적 상태, 통관 단계, 서류 상태를 항로 지도와 타임라인으로 확인합니다."
};

export default async function WorkspaceLogisticsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const storageNote =
    snapshot.storage === "database"
      ? "운영 DB에서 불러온 실제 물류 큐입니다."
      : "지금은 운영 프리뷰 데이터입니다. DB 연결 후 실제 요청 큐로 바뀝니다.";

  return (
    <LogisticsClient
      shipments={snapshot.activeShipments}
      shipmentEvents={snapshot.shipmentEvents}
      shipmentRequests={snapshot.shipmentRequests}
      logisticsCompanies={snapshot.logisticsCompanies}
      storageNote={storageNote}
    />
  );
}
