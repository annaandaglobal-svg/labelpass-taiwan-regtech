// Curated Taiwan import reference for the most common K-beauty / food export categories.
// This is a practitioner *reference*, NOT an official classification engine — the real
// 11-digit CCC code, 輸入規定 code, and duty rate must be confirmed in the Customs
// Administration 稅則稅率查詢 system or with a licensed 관세사 for each specific product.

export type CustomsDomain = "cosmetic" | "food" | "health-food";

export type CustomsReferenceEntry = {
  id: string;
  domain: CustomsDomain;
  product: string; // Korean label
  examples: string; // typical products
  hs6: string; // international 6-digit HS
  cccExample: string; // representative 11-digit CCC (example)
  importRules: string[]; // 輸入規定 codes + meaning
  inspection: string; // 검사/查驗 방식
  quarantine: string; // 검역 여부
  dutyNote: string; // 관세율 안내
  businessTax: string; // 營業稅
  keyDocs: string[]; // 통관 필수 서류
  notes: string;
};

export const CUSTOMS_BUSINESS_TAX = "營業稅(부가세) 5% — 대만 수입 시 공통 부과 (완제품 CIF+관세 기준).";

export const customsReference: CustomsReferenceEntry[] = [
  {
    id: "cos-skincare",
    domain: "cosmetic",
    product: "기초 스킨케어 (크림·로션·세럼·토너)",
    examples: "수분크림, 앰플, 에센스, 스킨, 아이크림",
    hs6: "3304.99",
    cccExample: "3304.99.00.90-X",
    importRules: ["일반 화장품: 별도 輸入許可 대상 아님", "化粧品衛生安全管理法 — 제품 등록/통보·PIF 의무"],
    inspection: "통관 시 성분·라벨(중문) 확인. 특정성분 함유 시 TFDA 관할.",
    quarantine: "해당 없음(동식물 검역 대상 아님)",
    dutyNote: "관세 대개 0~5% (품목·협정별 상이, ECFA/FTA 확인)",
    businessTax: "5%",
    keyDocs: ["상업송장", "패킹리스트", "제품 성분표", "중문 라벨 시안", "제품 등록/통보 근거"],
    notes: "미백·주름 등 특정용도 화장품은 성분 한도·경고문 준수 필요. 라벨은 중문 표기 필수."
  },
  {
    id: "cos-sunscreen",
    domain: "cosmetic",
    product: "자외선 차단제 (선크림)",
    examples: "선크림, 선세럼, 톤업선",
    hs6: "3304.99",
    cccExample: "3304.99.00.90-X",
    importRules: ["特定用途화장품 — 자외선 차단 성분 positive list 준수", "제품 등록/통보 의무"],
    inspection: "자외선 차단 성분·함량(예: Oxybenzone ≤6%)·경고문 확인",
    quarantine: "해당 없음",
    dutyNote: "관세 0~5%",
    businessTax: "5%",
    keyDocs: ["성분표(차단성분 함량)", "중문 라벨", "안전성 자료(PIF)"],
    notes: "차단 성분 한도 초과 시 통관·판매 불가. SPF/PA 표시 근거 필요."
  },
  {
    id: "cos-color",
    domain: "cosmetic",
    product: "색조 화장품 (메이크업)",
    examples: "립스틱, 파운데이션, 아이섀도, 블러셔, 네일",
    hs6: "3304.20 / 3304.30 / 3304.91 / 3304.99",
    cccExample: "3304.91.00.00-X (파우더류)",
    importRules: ["착색제 positive list 준수", "제품 등록/통보 의무"],
    inspection: "색소(CI 번호)·중금속 한도 확인",
    quarantine: "해당 없음",
    dutyNote: "관세 0~5%",
    businessTax: "5%",
    keyDocs: ["색소 CI 번호 명세", "중문 라벨", "성분표"],
    notes: "허가 색소만 사용 가능. 눈 주위 제품은 색소 제한 더 엄격."
  },
  {
    id: "cos-hair",
    domain: "cosmetic",
    product: "헤어 케어 (샴푸·염모·트리트먼트)",
    examples: "샴푸, 린스, 염모제, 헤어에센스",
    hs6: "3305",
    cccExample: "3305.10.00.00-X (샴푸)",
    importRules: ["염모제는 산화형 성분(PPD 등) 한도·경고문 준수", "제품 등록/통보"],
    inspection: "염모 성분(예: p-Phenylenediamine ≤2%)·패치테스트 경고문 확인",
    quarantine: "해당 없음",
    dutyNote: "관세 0~5%",
    businessTax: "5%",
    keyDocs: ["염모 성분 함량표", "경고문 라벨", "성분표"],
    notes: "염모제는 특정용도 화장품. 성분 한도·필수 경고문 미표기 시 통관 보류 위험."
  },
  {
    id: "cos-cleanser-soap",
    domain: "cosmetic",
    product: "클렌저·비누",
    examples: "클렌징폼, 페이셜 비누, 바디워시",
    hs6: "3401 (비누) / 3402 (계면활성제)",
    cccExample: "3401.11.00.00-X (화장용 비누)",
    importRules: ["화장 목적: 化粧品法 적용", "약용 표방 시 별도 규제"],
    inspection: "성분·표방 문구 확인(약효 표현 주의)",
    quarantine: "해당 없음",
    dutyNote: "관세 0~5%",
    businessTax: "5%",
    keyDocs: ["성분표", "중문 라벨"],
    notes: "항균·약용 등 효능 표방 시 판정 경로가 달라짐."
  },
  {
    id: "cos-fragrance",
    domain: "cosmetic",
    product: "향수",
    examples: "오드퍼퓸, 오드뚜왈렛, 바디미스트",
    hs6: "3303",
    cccExample: "3303.00.00.00-X",
    importRules: ["알코올 함량 높음 — 인화성 물류 규정 확인", "화장품 등록/통보"],
    inspection: "알레르겐 향료 표시·성분 확인",
    quarantine: "해당 없음",
    dutyNote: "관세 0~10% (품목별 확인)",
    businessTax: "5%",
    keyDocs: ["향료 알레르겐 명세", "중문 라벨", "MSDS(운송)"],
    notes: "고알코올로 항공 운송 제한 가능(위험물). 물류 방식 사전 확인."
  },
  {
    id: "food-health-supplement",
    domain: "health-food",
    product: "건강기능식품·보충제 (정제·캡슐)",
    examples: "비타민, 유산균, 콜라겐, 오메가3",
    hs6: "2106.90",
    cccExample: "2106.90.99.90-X",
    importRules: ["F01 — 食品輸入查驗(TFDA 수입검사)", "錠狀膠囊食品 규정", "健康食品 효능 표방 시 허가 필요"],
    inspection: "F01 수입검사 — 逐批/抽批/驗批. 성분·표시·오염물질 검사",
    quarantine: "동물성 원료 시 檢疫(BAPHIQ) 확인 필요",
    dutyNote: "관세 품목별 상이(대개 0~10%대) — 稅則 확인",
    businessTax: "5%",
    keyDocs: ["성분·함량표", "COA(시험성적서)", "중문 라벨", "수입자 등록", "효능 표방 시 健康食品 허가증"],
    notes: "효능(콜레스테롤·혈압 등) 표방은 健康食品 허가 필수. 錠狀·膠囊 형태 표시 규정 준수."
  },
  {
    id: "food-snack",
    domain: "food",
    product: "가공 스낵·과자",
    examples: "과자, 김스낵, 초콜릿, 젤리",
    hs6: "1905 / 1806 / 2106",
    cccExample: "1905.90.00.00-X",
    importRules: ["F01 — 食品輸入查驗", "食品安全衛生管理法 — 표시 의무"],
    inspection: "F01 수입검사. 첨가물·알레르겐·영양표시 확인",
    quarantine: "육류·유제품 함유 시 檢疫 대상",
    dutyNote: "관세 품목별(0~20%대 가능) — 稅則 확인",
    businessTax: "5%",
    keyDocs: ["성분·첨가물 명세", "영양성분표", "알레르겐 표시", "중문 라벨", "수입자 등록"],
    notes: "육가공·유제품 함유 시 檢疫(BAPHIQ)+위생증명 필요. 첨가물 positive list 준수."
  },
  {
    id: "food-beverage",
    domain: "food",
    product: "음료",
    examples: "차, 주스, 탄산음료, 홍삼음료",
    hs6: "2202 / 2009",
    cccExample: "2202.99.00.00-X",
    importRules: ["F01 — 食品輸入查驗", "표시·첨가물 규정"],
    inspection: "F01 수입검사. 감미료·보존료·색소 확인",
    quarantine: "해당 없음(식물성 일반)",
    dutyNote: "관세 품목별 확인",
    businessTax: "5%",
    keyDocs: ["성분표", "영양성분표", "중문 라벨", "수입자 등록"],
    notes: "기능성·건강 표방 시 별도 허가. 감미료 등 첨가물 한도 준수."
  },
  {
    id: "food-sauce",
    domain: "food",
    product: "소스·장류·조미료",
    examples: "고추장, 간장, 소스, 김치",
    hs6: "2103 / 2005",
    cccExample: "2103.90.00.00-X",
    importRules: ["F01 — 食品輸入查驗", "발효식품 표시·첨가물 규정"],
    inspection: "F01 수입검사. 첨가물·미생물·라벨 확인",
    quarantine: "김치 등 식물성 발효: 일반적으로 檢疫 낮음(원료 확인)",
    dutyNote: "관세 품목별 확인",
    businessTax: "5%",
    keyDocs: ["성분·첨가물표", "중문 라벨", "수입자 등록"],
    notes: "발효식품 표시·유통기한·보관조건 표기 필수."
  }
];

export function customsReferenceByDomain(domain: CustomsDomain | "all") {
  if (domain === "all") return customsReference;
  return customsReference.filter((entry) => entry.domain === domain);
}
