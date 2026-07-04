// Downloadable form templates for document types that follow a standard format, so a
// customer can download → fill → upload. Client-safe (no server imports). Keyed by the
// shared licensing/PIF document id.

export type DocumentTemplate = {
  fileName: string;
  mime: string;
  content: string;
};

const CSV_BOM = "﻿"; // so Excel opens Korean/Chinese correctly

export const documentTemplates: Record<string, DocumentTemplate> = {
  "full-formula": {
    fileName: "전성분표_Full-Formula_템플릿.csv",
    mime: "text/csv;charset=utf-8",
    content:
      CSV_BOM +
      [
        "No,원료명(INCI),원료명(中文),CAS No,함량(% w/w),배합목적(Function)",
        "1,,,,,",
        "2,,,,,",
        "3,,,,,",
        "합계(Total),,,,100.00,"
      ].join("\r\n")
  },
  "product-basic": {
    fileName: "제품규격서_Product-Spec_템플릿.txt",
    mime: "text/plain;charset=utf-8",
    content: [
      "[제품 규격서 / Product Specification]",
      "",
      "제품명 (Product Name):",
      "브랜드 (Brand):",
      "제형 (Form, 예: 토너/크림/에센스):",
      "용량 (Net Content):",
      "사용 부위 (Application Site):",
      "사용 방법 (Directions):",
      "제조사 (Manufacturer):",
      "제조소 주소 (Manufacturing Site):",
      "책임업자·수입자 (Responsible Enterprise / Importer):",
      "색상 (Color):",
      "향 (Fragrance):",
      "pH:",
      "비중 (Specific Gravity):",
      "보관조건 (Storage Condition):",
      "유효기한 (Shelf Life):",
      "포장 형태 (Packaging):",
      "",
      "※ 대만 화장품 產品資訊檔案(PIF) 제출용 기본 규격 정보입니다."
    ].join("\r\n")
  },
  coa: {
    fileName: "COA_시험성적서_템플릿.csv",
    mime: "text/csv;charset=utf-8",
    content:
      CSV_BOM +
      [
        "시험항목(Test Item),규격(Specification),결과(Result),판정(Pass/Fail)",
        "성상 (Appearance),,,",
        "pH,,,",
        "비중 (Specific Gravity),,,",
        "중금속-납 (Lead Pb),,,",
        "중금속-비소 (Arsenic As),,,",
        "중금속-수은 (Mercury Hg),,,",
        "총호기성균 (Total Plate Count),,,",
        "대장균 (E. coli),,,",
        "녹농균 (P. aeruginosa),,,",
        "황색포도상구균 (S. aureus),,,"
      ].join("\r\n")
  },
  "safety-assessment": {
    fileName: "안전성평가요약_PSA_템플릿.txt",
    mime: "text/plain;charset=utf-8",
    content: [
      "[제품 안전성 평가 요약 / Product Safety Assessment (PSA) Summary]",
      "",
      "평가자 (Safety Assessor):",
      "자격 (Qualification):",
      "평가일 (Date):",
      "",
      "1. 제품 개요 (Product Overview):",
      "2. 사용 조건·노출 평가 (Conditions of Use / Exposure):",
      "3. 성분별 독성 프로파일 (Toxicological Profile per Ingredient):",
      "4. 불순물·안정성·미생물 (Impurities / Stability / Microbiology):",
      "5. 제한·금지 성분 확인 (Restricted/Prohibited Check):",
      "6. 결론 (Conclusion — 안전함/조건부/부적합):",
      "",
      "서명 (Signature):",
      "",
      "※ 化粧品產品資訊檔案管理辦法에 따른 안전성 평가 자료 요약 양식입니다."
    ].join("\r\n")
  },
  "chinese-label": {
    fileName: "중문라벨_필수기재_체크템플릿.txt",
    mime: "text/plain;charset=utf-8",
    content: [
      "[대만 화장품 중문 라벨 필수 기재 / Chinese Label Checklist]",
      "",
      "품명 (品名):",
      "전성분 (全成分, INCI/中文):",
      "용량·중량 (淨重/容量):",
      "사용방법 (用法):",
      "주의사항·경고문 (注意事項/警語):",
      "제조일·유효기한 (製造日期/有效期限 또는 保存期限):",
      "제조업자 (製造商):",
      "수입업자·주소·전화 (輸入商/地址/電話):",
      "원산지 (原產地):",
      "제조번호 (批號/LOT):",
      "특정용도 표시 (해당 시: 防曬 SPF 등):",
      "",
      "※ 대만 판매 화장품은 중문 표시가 의무입니다. 누락 시 통관 보류 사유가 됩니다."
    ].join("\r\n")
  }
};

export function templateForDocument(documentId: string): DocumentTemplate | null {
  return documentTemplates[documentId] ?? null;
}
