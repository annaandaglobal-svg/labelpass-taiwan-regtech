// Systematized Taiwan import-licensing document requirements, by product/licensing
// category. Each requirement carries the official document name (中文/EN) and its
// expected spec/format so the list can be shown to customers, attached, and handed
// off to an expert for review. Client-safe (no server imports).

export type LicensingTier = "required" | "recommended" | "deferrable";

export type LicensingDocument = {
  id: string;
  tier: LicensingTier;
  label: string; // Korean working name
  officialName: string; // official 中文 (English) document name used by TFDA/Customs
  spec: string; // expected format / spec / contents
  detail: string; // what it is / why it matters
  authority: string; // issuing / governing body
};

export type LicensingCategory = {
  id: string;
  label: string;
  icon: string;
  authority: string;
  summary: string;
  documents: LicensingDocument[];
};

export const licensingTierCopy: Record<LicensingTier, { label: string; tone: string }> = {
  required: { label: "필수", tone: "danger" },
  recommended: { label: "권장", tone: "warn" },
  deferrable: { label: "후속 보완", tone: "info" }
};

export const licensingCategories: LicensingCategory[] = [
  {
    id: "cosmetic-pif",
    label: "화장품 PIF·등록",
    icon: "🧴",
    authority: "TFDA (衛生福利部食品藥物管理署)",
    summary: "일반 화장품은 제품 등록(產品登錄) + 제품정보파일(PIF) + 중문 표시가 핵심입니다. 특정용도 화장품은 사전 허가가 추가됩니다.",
    documents: [
      {
        id: "product-basic",
        tier: "required",
        label: "제품 기본정보",
        officialName: "產品基本資料 (Product Basic Information)",
        spec: "제품명·브랜드·용량·제형·사용부위·사용방법·책임업자·제조소",
        detail: "PIF 표지 정보. 제품 아이덴티티와 책임업자(責任廠商)를 확정합니다.",
        authority: "TFDA"
      },
      {
        id: "full-formula",
        tier: "required",
        label: "전성분 및 함량표",
        officialName: "完整配方 / 全成分及其含量 (Full Formula with % w/w)",
        spec: "INCI명 + 원료명(中文) + 함량(% w/w) + 배합 목적, 합계 100%",
        detail: "금지·제한 성분 대조와 색소 허용목록(正面表列) 확인의 근거입니다.",
        authority: "TFDA · 化粧品衛生安全管理法"
      },
      {
        id: "chinese-label",
        tier: "deferrable",
        label: "중문 표시안 (라벨)",
        officialName: "中文標示 / 標籤仿單包裝 (Chinese Label / Insert / Packaging)",
        spec: "PDF·AI. 품명·전성분·용량·용법·주의사항·유효기한·제조/수입자 중문 표기",
        detail: "PIF 준비 단계에서는 필수가 아닙니다. 판매(제품 등록·통관) 전에 완성하면 되며, 그때 중문 표시가 누락되면 통관 보류 사유가 됩니다.",
        authority: "TFDA · 化粧品標示"
      },
      {
        id: "safety-assessment",
        tier: "required",
        label: "제품 안전성 평가서",
        officialName: "產品安全資料 / 安全性評估報告 (Product Safety Assessment, PSA)",
        spec: "안전성평가자(합격자) 서명 보고서. 성분 독성·사용농도·노출평가 포함",
        detail: "2024년 이후 시행 기준으로 안전성 평가 자료 보유가 요구됩니다.",
        authority: "TFDA · 化粧品產品資訊檔案管理辦法"
      },
      {
        id: "gmp",
        tier: "required",
        label: "제조공정·GMP 증빙",
        officialName: "製造方法及製程 + 化粧品優良製造準則 (GMP) / ISO 22716",
        spec: "제조공정 요약 + 제조소 GMP/ISO 22716 인증서(사본)",
        detail: "제조소 단위 관리. 라벨 제조원·등록 제조소·GMP 증빙 표기가 일치해야 합니다.",
        authority: "TFDA / 제조국 인증기관"
      },
      {
        id: "product-listing",
        tier: "required",
        label: "제품 등록(통보)",
        officialName: "產品登錄 (Product Listing / Notification, 化粧品產品登錄平台)",
        spec: "TFDA 온라인 등록 번호. 제품별 사전 등록/통보",
        detail: "일반 화장품도 판매 전 제품 등록(登錄)이 필요합니다. 특정용도는 별도 허가.",
        authority: "TFDA 產品登錄平台"
      },
      {
        id: "coa",
        tier: "recommended",
        label: "COA·시험성적서",
        officialName: "檢驗成績書 / COA (Certificate of Analysis)",
        spec: "원료/완제품 시험 결과: 미생물·중금속·특정성분 규격",
        detail: "품질 근거. 제한성분 농도·중금속 기준 확인에 사용됩니다.",
        authority: "제조사 / 시험기관"
      },
      {
        id: "claim-evidence",
        tier: "recommended",
        label: "효능·표현 근거",
        officialName: "宣稱依據 / 功效證據 (Claim Substantiation)",
        spec: "미백·주름·자외선차단 등 표현별 시험자료 또는 문헌",
        detail: "허가 성분 없는 미백 등 표현은 과대광고 제재 대상입니다.",
        authority: "TFDA · 化粧品標示宣傳"
      },
      {
        id: "stability",
        tier: "recommended",
        label: "안정성 시험 자료",
        officialName: "安定性試驗報告 (Stability Test Report)",
        spec: "유효기한·보관조건·포장 적합성 시험 요약",
        detail: "유통기한(EXP) 표기 근거를 확인합니다.",
        authority: "제조사"
      },
      {
        id: "adverse-sop",
        tier: "deferrable",
        label: "이상사례 대응 절차",
        officialName: "不良反應通報程序 (Adverse Reaction Reporting SOP)",
        spec: "접수·조사·보고 SOP 문서",
        detail: "대만 판매 후 이상사례 통보 체계를 운영 문서로 정리합니다.",
        authority: "책임업자"
      }
    ]
  },
  {
    id: "food-import",
    label: "식품 수입",
    icon: "🍪",
    authority: "TFDA · 관세청(關務署)",
    summary: "일반 포장식품은 수입 검사 신청 + 중문 표시(영양표시 포함) + 수입업자 등록이 핵심입니다.",
    documents: [
      {
        id: "import-application",
        tier: "required",
        label: "수입식품 검사 신청",
        officialName: "輸入食品及相關產品查驗申請書 (Import Food Inspection Application)",
        spec: "TFDA 수입식품 통관 검사 신청 (逐批/抽批/驗批)",
        detail: "식품은 수입 시 검사 신청 대상입니다. 품목별 검사 방식이 다릅니다.",
        authority: "TFDA 邊境查驗"
      },
      {
        id: "importer-registration",
        tier: "required",
        label: "식품업자 등록",
        officialName: "食品業者登錄 (Food Business Registration)",
        spec: "대만 수입업자 登錄字號 (F-등록번호)",
        detail: "수입자는 사전에 식품업자 등록이 되어 있어야 합니다.",
        authority: "TFDA 食品業者登錄平台"
      },
      {
        id: "chinese-food-label",
        tier: "required",
        label: "중문 라벨(영양표시)",
        officialName: "中文標示 + 營養標示 (Chinese Label + Nutrition Facts)",
        spec: "품명·원재료·내용량·유효기한·원산지·수입자 + 영양표시 8항목",
        detail: "알레르기 표시·첨가물명·유통기한 형식까지 확인합니다.",
        authority: "TFDA · 食品安全衛生管理法"
      },
      {
        id: "ingredient-breakdown",
        tier: "required",
        label: "성분·배합 명세",
        officialName: "產品成分明細 (Ingredient / Composition Statement)",
        spec: "원재료명 + 함량 + 첨가물(용도·명칭) 명세",
        detail: "첨가물 포지티브 리스트 대조와 알레르겐 확인 근거입니다.",
        authority: "제조사"
      },
      {
        id: "coo",
        tier: "recommended",
        label: "원산지 증명서",
        officialName: "原產地證明書 (Certificate of Origin, C/O)",
        spec: "비특혜/특혜 C/O. 상공회의소 등 발급",
        detail: "원산지 표시·관세 특혜 적용 및 통관 서류 일치 확인.",
        authority: "상공회의소 / 발급기관"
      },
      {
        id: "test-report",
        tier: "recommended",
        label: "검사 성적서",
        officialName: "檢驗報告 (Test Report)",
        spec: "농약잔류·중금속·미생물·식품첨가물 등 항목별 성적서",
        detail: "고위험 품목·수입 검사 대상 항목에 대한 시험 근거입니다.",
        authority: "공인 시험기관"
      },
      {
        id: "health-certificate-food",
        tier: "deferrable",
        label: "위생증명서",
        officialName: "衛生證明 (Health / Sanitary Certificate)",
        spec: "수출국 주무기관 발급 (해당 품목에 한함)",
        detail: "동물성·유제품 등 특정 품목은 수출국 위생증명이 필요할 수 있습니다.",
        authority: "수출국 주무기관"
      }
    ]
  },
  {
    id: "organic-food",
    label: "유기농 식품 인증 (有機)",
    icon: "🌱",
    authority: "農業部 農糧署 (Ministry of Agriculture · AFA)",
    summary:
      "식품에 '有機(유기농)'을 표시·판매하려면 有機農業促進法(2019.5.30 시행, TFDA 아님)에 따른 인증이 필수입니다. 수입은 수출국이 대만과 유기 동등성 협정이 있어야 자국 인증으로 표시 가능한데, 한국은 동등성 국가가 아닙니다(동등성: 일본·미국·캐나다·호주·뉴질랜드·인도·파라과이·영국). 따라서 아래 ①~⑤ 절차로 대만 인정 인증 + 수입 검증을 받아야 합니다.",
    documents: [
      {
        id: "organic-equivalence-check",
        tier: "required",
        label: "① 유기 동등성 여부 확인",
        officialName: "有機同等性認可國家確認 (Organic Equivalency Country Check)",
        spec: "수출국이 대만 동등성 인정 국가인지 확인. 한국은 미포함.",
        detail:
          "동등성 국가(일본·미국·캐나다·호주·뉴질랜드·인도·파라과이·영국)면 자국 유기 인증으로 표시 가능. 한국은 아니므로 ②~⑤ 절차가 필요합니다.",
        authority: "農業部 農糧署"
      },
      {
        id: "organic-tw-certification",
        tier: "required",
        label: "② 대만 인정 인증기관 유기 인증 취득",
        officialName: "有機農產品/有機農產加工品驗證 (Organic Certification by TW-accredited body)",
        spec: "대만이 인정하는 驗證機構의 유기 인증. 가공품은 유기 원료 비율 기준(예: 有機 95%↑) 충족.",
        detail: "동등성이 없는 한국 제품은 대만 인정 인증기관의 유기 인증을 받아야 '有機' 표시가 가능합니다.",
        authority: "대만 인정 驗證機構 (農業部 인정)"
      },
      {
        id: "organic-certificate",
        tier: "required",
        label: "③ 유기 인증서·인증기관 증빙",
        officialName: "有機驗證證書 (Organic Certification Certificate)",
        spec: "인증서 번호·유효기간·인증기관명·인증 범위(품목).",
        detail: "라벨·수입 심사에 제출하는 핵심 증빙입니다.",
        authority: "인증기관"
      },
      {
        id: "organic-import-verification",
        tier: "required",
        label: "④ 수입 검증·표시 심사",
        officialName: "進口有機農產品及有機農產加工品證明文件審查 (Import Organic Verification / Label Review)",
        spec: "農業部 農糧署에 수입 유기 증명문서 심사 신청 + 라벨(有機 표시·인증기관명) 심사.",
        detail: "통관·판매 전 수입 검증과 표시 심사를 통과해야 '有機' 표시로 유통할 수 있습니다.",
        authority: "農業部 農糧署"
      },
      {
        id: "organic-label",
        tier: "required",
        label: "⑤ 有機 표시·인증기관명 라벨",
        officialName: "有機標示 + 驗證機構名稱 (Organic Label + Certifier Name)",
        spec: "중문 라벨에 '有機' + 인증기관명/인증번호 표기. 무인증 유기 표시는 금지.",
        detail: "인증·검증 완료 전에는 라벨·광고에 有機/유기농/organic을 쓸 수 없습니다(위반 시 有機農業促進法 제재).",
        authority: "農業部 農糧署"
      },
      {
        id: "organic-traceability",
        tier: "recommended",
        label: "유기 원료·이력 증빙",
        officialName: "有機原料及流程證明 (Organic Ingredient & Process Records)",
        spec: "유기 원료 비율·공급망 이력·가공 흐름 기록.",
        detail: "가공품 유기 비율·물질흐름 추적 근거로, 인증·검증 시 요구될 수 있습니다.",
        authority: "제조사 / 인증기관"
      }
    ]
  },
  {
    id: "food-additive",
    label: "식품첨가물",
    icon: "🧪",
    authority: "TFDA",
    summary: "식품첨가물(복방 포함)은 查驗登記 허가증과 성분/위생 증빙이 필요합니다.",
    documents: [
      {
        id: "additive-permit",
        tier: "required",
        label: "첨가물 허가증",
        officialName: "食品添加物查驗登記許可證 (Food Additive Registration Permit)",
        spec: "허가증 번호 (품목별 사전 허가)",
        detail: "포지티브 리스트 등재 및 사용범위·한도 확인의 전제입니다.",
        authority: "TFDA"
      },
      {
        id: "composition-report",
        tier: "required",
        label: "성분 조성 보고서",
        officialName: "產品成分報告書 (Composition Report)",
        spec: "성분명·함량·기능·규격 (복방은 구성성분 전체)",
        detail: "복방 첨가물은 구성성분과 비율을 명확히 해야 합니다.",
        authority: "제조사"
      },
      {
        id: "additive-health-cert",
        tier: "recommended",
        label: "공식 위생증명",
        officialName: "官方衛生證明 (Official Health Certificate)",
        spec: "수출국 주무기관 발급 위생/자유판매 증명",
        detail: "첨가물 수입 통관 시 요구될 수 있습니다.",
        authority: "수출국 주무기관"
      },
      {
        id: "additive-spec-sheet",
        tier: "recommended",
        label: "규격서·COA",
        officialName: "規格書 / COA (Specification / Certificate of Analysis)",
        spec: "순도·중금속·미생물 등 규격 및 시험 결과",
        detail: "첨가물 품질 규격 적합성 근거입니다.",
        authority: "제조사 / 시험기관"
      }
    ]
  },
  {
    id: "health-food",
    label: "건강식품",
    icon: "💊",
    authority: "TFDA · 健康食品管理法",
    summary: "건강식품(健康食品)은 허가제입니다. 명칭·로고·효능 표현은 허가 범위 안에서만 사용됩니다.",
    documents: [
      {
        id: "health-food-permit",
        tier: "required",
        label: "건강식품 허가증",
        officialName: "健康食品許可證 (Health Food Permit, 衛部健食字/字號)",
        spec: "허가번호 + 승인 효능(保健功效) 범위",
        detail: "미허가 제품은 건강식품 명칭·효능 표현을 사용할 수 없습니다.",
        authority: "TFDA"
      },
      {
        id: "health-food-label",
        tier: "required",
        label: "건강식품 표시·로고",
        officialName: "健康食品標示 + 標章 (Health Food Labeling + Logo)",
        spec: "건강식품 명칭·로고·허가번호·승인효능·섭취량·주의문구",
        detail: "표시 필수항목과 로고 사용 요건을 확인합니다.",
        authority: "TFDA"
      },
      {
        id: "efficacy-safety-data",
        tier: "recommended",
        label: "효능·안전성 시험자료",
        officialName: "保健功效 / 安全性 試驗資料 (Efficacy & Safety Test Data)",
        spec: "승인 효능 범위에 대한 시험·문헌 근거, COA",
        detail: "허가 취득 및 표현 범위 확인의 과학적 근거입니다.",
        authority: "시험기관 / 신청자"
      }
    ]
  },
  {
    id: "food-contact",
    label: "식품용 포장재",
    icon: "📦",
    authority: "TFDA · 食品器具容器包裝",
    summary: "식품 접촉 재질은 재질·용도·위생(용출) 시험 자료를 함께 확인합니다.",
    documents: [
      {
        id: "material-composition",
        tier: "required",
        label: "재질 성분 증명",
        officialName: "材質證明 (Material Composition Statement)",
        spec: "재질명·용도·사용조건(온도) 명세",
        detail: "식품 접촉 재질과 사용조건을 확정합니다.",
        authority: "제조사"
      },
      {
        id: "migration-test",
        tier: "required",
        label: "위생·용출 시험성적서",
        officialName: "衛生標準/溶出試驗報告 (Sanitation / Migration Test Report)",
        spec: "재질별 용출·위생규격 시험 성적서",
        detail: "식품용기·포장 위생 기준 적합성 근거입니다.",
        authority: "공인 시험기관"
      },
      {
        id: "food-contact-label",
        tier: "recommended",
        label: "표시 사항",
        officialName: "標示 (Labeling: 材質·耐熱溫度·用途)",
        spec: "재질·내열온도·전자레인지 사용 여부 등 표시",
        detail: "포장재 표시 요건(재질·사용조건)을 확인합니다.",
        authority: "TFDA"
      }
    ]
  },
  {
    id: "customs",
    label: "통관·선적 공통",
    icon: "🚢",
    authority: "관세청 (財政部關務署)",
    summary: "품목과 무관하게 수입 통관에는 인보이스·패킹리스트·운송서류·HS/CCC 분류가 필요합니다.",
    documents: [
      {
        id: "commercial-invoice",
        tier: "required",
        label: "상업 송장",
        officialName: "商業發票 (Commercial Invoice)",
        spec: "품명·수량·단가·금액·인코텀즈·통화",
        detail: "관세·세금 산정과 신고가액의 근거입니다.",
        authority: "수출자"
      },
      {
        id: "packing-list",
        tier: "required",
        label: "패킹리스트",
        officialName: "裝箱單 (Packing List)",
        spec: "박스 수·중량(G/W·N/W)·부피(CBM)·포장 명세",
        detail: "물류 견적·검사·통관 물량 확인에 사용됩니다.",
        authority: "수출자"
      },
      {
        id: "transport-doc",
        tier: "required",
        label: "운송 서류",
        officialName: "提單 (B/L 해상 / AWB 항공)",
        spec: "선하증권 또는 항공화물운송장",
        detail: "화물 인도·통관의 필수 운송 증빙입니다.",
        authority: "포워더 / 선사"
      },
      {
        id: "hs-ccc",
        tier: "required",
        label: "HS·CCC 분류",
        officialName: "HS Code / 中華民國商品標準分類號列 (CCC Code)",
        spec: "11자리 CCC 코드 + 수입규정 코드(輸入規定)",
        detail: "품목분류에 따라 세율·수입규정·검사요건이 달라집니다.",
        authority: "관세청 / 관세사"
      },
      {
        id: "customs-coo",
        tier: "recommended",
        label: "원산지 증명서",
        officialName: "原產地證明書 (Certificate of Origin, C/O)",
        spec: "비특혜/특혜 C/O",
        detail: "원산지 표시·특혜관세·서류 일치 확인.",
        authority: "상공회의소 / 발급기관"
      }
    ]
  }
];

export function licensingCategoryById(id: string) {
  return licensingCategories.find((category) => category.id === id) ?? null;
}

export function requiredDocuments(category: LicensingCategory) {
  return category.documents.filter((document) => document.tier === "required");
}

// Optional context-aware refinement: given the product's own ingredient / label text,
// decide which recommended (or deferrable) documents actually become REQUIRED for this
// specific product, with a plain-language reason. This never downgrades a required item.
export type RequirementRefinement = { documentId: string; reason: string };

const CLAIM_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /미백|whiten|brighten|美白|亮白/i, reason: "미백 표현이 있어 인정 성분·시험 근거가 필요합니다." },
  { re: /주름|안티에이징|anti[-\s]?aging|wrinkle|皺|抗老/i, reason: "주름 개선 표현이 있어 효능 근거가 필요합니다." },
  { re: /자외선|선크림|선케어|spf|防曬|防晒|uva|uvb/i, reason: "자외선차단 표현은 특정용도 화장품 요건·SPF 근거가 필요합니다." },
  { re: /여드름|acne|아토피|eczema|트러블|痘|抗痘/i, reason: "여드름·피부문제 표현은 의약품 경계로, 표현 근거·분류 확인이 필요합니다." },
  { re: /탈모|육모|hair\s?loss|防脫|生髮/i, reason: "탈모·육모 표현은 의약품 경계로, 표현 근거·분류 확인이 필요합니다." }
];

// Substances that commonly need COA / concentration backing in Taiwan cosmetic review.
const CONTROLLED_INGREDIENTS: Array<{ re: RegExp; reason: string }> = [
  { re: /triclosan|트리클로산|三氯沙/i, reason: "제한 성분(Triclosan)이 있어 함량·규격 근거(COA)가 필요합니다." },
  { re: /salicylic|살리실|水楊酸/i, reason: "살리실산은 함량 제한·경고문 대상으로 규격 근거가 필요합니다." },
  { re: /hydroquinone|하이드로퀴논|對苯二酚/i, reason: "하이드로퀴논은 규제 대상 성분으로 확인·근거가 필요합니다." },
  { re: /retinol|레티놀|retinoic|A醇/i, reason: "레티놀류는 함량·안정성 근거가 필요합니다." },
  { re: /oxybenzone|benzophenone|자외선흡수|防曬劑/i, reason: "자외선차단 성분은 허용 한도·규격 근거가 필요합니다." },
  { re: /mercury|수은|汞|hydroquinone/i, reason: "중금속·규제 성분 가능성으로 시험 성적서가 필요합니다." }
];

export function refineCosmeticRequirements(input: { ingredientsText?: string; labelText?: string }): RequirementRefinement[] {
  const ingredients = (input.ingredientsText ?? "").toLowerCase();
  const label = `${input.labelText ?? ""} ${input.ingredientsText ?? ""}`;
  const refinements: RequirementRefinement[] = [];

  const claim = CLAIM_PATTERNS.find((pattern) => pattern.re.test(label));
  if (claim) refinements.push({ documentId: "claim-evidence", reason: claim.reason });

  const controlled = CONTROLLED_INGREDIENTS.find((item) => item.re.test(ingredients));
  if (controlled) refinements.push({ documentId: "coa", reason: controlled.reason });

  // A declared shelf life / expiry claim needs stability data to back it.
  if (/유효기한|유통기한|사용기한|exp\b|expiry|保存期限|有效期/i.test(label)) {
    refinements.push({ documentId: "stability", reason: "유효기한 표기가 있어 안정성 시험 근거가 필요합니다." });
  }

  // A percentage concentration anywhere implies formula-level review → COA backing.
  if (!refinements.some((item) => item.documentId === "coa") && /\d+(\.\d+)?\s*%/.test(ingredients)) {
    refinements.push({ documentId: "coa", reason: "함량(%)이 명시되어 규격·시험 근거로 뒷받침하는 것이 좋습니다." });
  }

  return refinements;
}

// Categories that support the optional product-data refinement.
export const REFINABLE_CATEGORY_IDS = ["cosmetic-pif", "food-import", "food-additive", "health-food"] as const;

// General per-category refinement: upgrade recommended/deferrable docs to required based
// on the product's own ingredient/label data.
export function refineRequirements(categoryId: string, input: { ingredientsText?: string; labelText?: string }): RequirementRefinement[] {
  if (categoryId === "cosmetic-pif") return refineCosmeticRequirements(input);

  const text = `${input.labelText ?? ""} ${input.ingredientsText ?? ""}`;
  const refinements: RequirementRefinement[] = [];

  if (categoryId === "food-import") {
    if (/땅콩|peanut|花生|우유|milk|乳|밀\b|wheat|麩|계란|달걀|egg|蛋|새우|shrimp|蝦|게살|crab|蟹|대두|콩\b|soy|견과|nut|고등어|mackerel|잣|호두|아몬드|알레르|allerg/i.test(text)) {
      refinements.push({ documentId: "test-report", reason: "알레르기 유발 원료가 있어 성분·알레르겐 시험/관리 근거가 필요합니다." });
    }
    if (/육류|고기|meat|beef|pork|chicken|닭|돼지|소고기|유제품|dairy|치즈|cheese|버터|butter/i.test(text)) {
      refinements.push({ documentId: "health-certificate-food", reason: "동물성·유제품 원료는 수출국 위생증명·검역 요건이 있을 수 있습니다." });
    }
    if (/저당|무설탕|무가당|고단백|저지방|무첨가|저나트륨|sugar[-\s]?free|high\s?protein|low\s?fat/i.test(text)) {
      refinements.push({ documentId: "test-report", reason: "영양 강조표시가 있어 표시값을 뒷받침할 검사 성적서가 필요합니다." });
    }
  }

  if (categoryId === "food-additive" && /복방|複方|compound|혼합제|blend/i.test(text)) {
    refinements.push({ documentId: "additive-spec-sheet", reason: "복방 첨가물은 구성성분 규격·COA 근거가 필요합니다." });
  }

  if (
    categoryId === "health-food" &&
    /면역|항산화|혈압|혈당|콜레스테롤|다이어트|장\s?건강|기능성|효능|보건|immun|antioxidant|blood\s?pressure|cholesterol/i.test(text)
  ) {
    refinements.push({ documentId: "efficacy-safety-data", reason: "보건 효능 표현이 있어 효능·안전성 시험 근거가 필요합니다." });
  }

  const seen = new Set<string>();
  return refinements.filter((item) => {
    if (seen.has(item.documentId)) return false;
    seen.add(item.documentId);
    return true;
  });
}
