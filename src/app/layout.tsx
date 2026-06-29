import type { Metadata } from "next";
import { AppFrame } from "@/components/app-frame";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LabelPass — 대만 수출 라벨 규제 검토",
  description: "대만향 화장품 수출 라벨과 성분의 1차 규제 검토 워크스페이스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
