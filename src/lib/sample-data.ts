import type { ReviewInput } from "./compliance";

export const sampleReview: ReviewInput = {
  productName: "수분 진정 토너 300ml",
  productType: "leave-on toner / 일반 화장품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Beauty Lab, Seoul",
  hsCode: "3304.99",
  incoterms: "DAP Taipei",
  shipmentPurpose: "commercial sale",
  invoiceValue: "4200",
  ingredientsText: [
    "Water",
    "Glycerin 4%",
    "Butylene Glycol 3%",
    "Niacinamide 2%",
    "Salicylic acid 2.2%",
    "Triclosan 0.5%",
    "Methylisothiazolinone 0.002%",
    "Fragrance",
    "Phenoxyethanol 0.8%"
  ].join(", "),
  labelText: [
    "品名：舒敏保濕化妝水",
    "容量：300ml",
    "全成分：Water, Glycerin, Butylene Glycol, Niacinamide, Salicylic Acid, Triclosan, Fragrance",
    "原產地：韓國",
    "用途：保濕、調理肌膚",
    "批號：A26TW01",
    "製造日期：2026.05.15 / 有效日期：2029.05.14",
    "本產品可抗炎、治療痘痘與修復受損肌膚"
  ].join("\n")
};

export const cleanSampleReview: ReviewInput = {
  productName: "시카 리페어 크림 50ml",
  productType: "leave-on cream / 일반 화장품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Beauty Lab, Seoul / Taiwan importer pending",
  hsCode: "3304.99",
  incoterms: "DDP Taipei",
  shipmentPurpose: "commercial sale",
  invoiceValue: "1800",
  ingredientsText: [
    "Water",
    "Glycerin 5%",
    "Centella Asiatica Extract",
    "Panthenol 1%",
    "Phenoxyethanol 0.7%",
    "Chlorphenesin 0.2%"
  ].join(", "),
  labelText: [
    "品名：積雪草修護霜",
    "用途：保濕、柔嫩肌膚",
    "用法及保存方式：取適量塗抹於肌膚，置於陰涼處",
    "容量：50ml",
    "全成分：Water, Glycerin, Centella Asiatica Extract, Panthenol, Phenoxyethanol, Chlorphenesin",
    "注意事項：使用後如有不適請停止使用",
    "製造商：ANNAANDA Beauty Lab, Seoul, Korea / Tel +82-2-0000-0000",
    "原產地：韓國",
    "批號：C26TW02",
    "製造日期：2026.06.01 / 有效日期：2029.06.01",
    "化粧品產品登錄字號 TW-COS-2026-00021. PIF 產品資訊檔案與 safety assessment 已備妥.",
    "化粧品GMP / ISO 22716 certificate for ANNAANDA Beauty Lab manufacturing site."
  ].join("\n")
};

export const foodRiskSampleReview: ReviewInput = {
  productName: "피넛 밀크 쿠키 120g",
  productType: "prepackaged food / snack / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Foods, Seoul",
  hsCode: "1905.31",
  incoterms: "CIF Keelung",
  shipmentPurpose: "commercial sale",
  invoiceValue: "900",
  ingredientsText: [
    "Wheat flour",
    "Peanut",
    "Milk powder",
    "Butter",
    "Sugar",
    "Salt"
  ].join(", "),
  labelText: [
    "品名：花生牛奶餅乾",
    "內容量：120g",
    "成分：小麥粉、花生、奶粉、奶油、糖、鹽",
    "原產地：韓國",
    "有效日期：2027.01.01",
    "營養標示：每份熱量 500 kcal、蛋白質 5g、脂肪 20g、碳水化合物 60g、鈉 300mg"
  ].join("\n")
};

export const foodCleanSampleReview: ReviewInput = {
  productName: "유자 허브티 20입",
  productType: "prepackaged food / tea / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Foods, Seoul / Taiwan importer pending",
  hsCode: "0902.10",
  incoterms: "DAP Taipei",
  shipmentPurpose: "commercial sale",
  invoiceValue: "650",
  ingredientsText: [
    "Citron peel",
    "Rooibos",
    "Peppermint",
    "Dried apple"
  ].join(", "),
  labelText: [
    "品名：柚子草本茶",
    "內容量：40g（2g x 20包）",
    "成分：柚子皮、南非國寶茶、薄荷、乾燥蘋果",
    "原產地：韓國",
    "進口商：待確認",
    "有效日期：2027.03.01",
    "營養標示：每份熱量 5 kcal、蛋白質 0g、脂肪 0g、碳水化合物 1g、糖 0g、鈉 0mg",
    "本產品不含公告指定過敏原；如有交叉污染疑慮請依供應商文件確認"
  ].join("\n")
};

export const foodImportShellfishSampleReview: ReviewInput = {
  productName: "냉동 굴살 1kg",
  productType: "prepackaged food / frozen shellfish / seafood / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Seafood, Tongyeong / Taiwan Importer Co.",
  hsCode: "0307.12",
  incoterms: "CIF Keelung",
  shipmentPurpose: "commercial sale",
  invoiceValue: "2400",
  ingredientsText: [
    "Frozen oyster meat",
    "Salt"
  ].join(", "),
  labelText: [
    "品名：冷凍牡蠣肉",
    "內容量：1kg",
    "成分：牡蠣、鹽",
    "原產地：韓國",
    "進口商：Taiwan Importer Co.",
    "有效日期：2027.02.01",
    "營養標示：每份熱量 80 kcal、蛋白質 9g、脂肪 2g、碳水化合物 4g、鈉 420mg",
    "本產品含貝類"
  ].join("\n")
};

export const foodAdditiveSampleReview: ReviewInput = {
  productName: "감칠맛 쌀과자 80g",
  productType: "prepackaged food / snack / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Foods, Seoul / Taiwan Importer Co.",
  hsCode: "1905.90",
  incoterms: "CIF Keelung",
  shipmentPurpose: "commercial sale",
  invoiceValue: "720",
  ingredientsText: [
    "Rice",
    "MSG",
    "Sodium benzoate",
    "Xanthan gum",
    "Salt"
  ].join(", "),
  labelText: [
    "品名：旨味米餅",
    "內容量：80g",
    "成分：米、味精、苯甲酸鈉、三仙膠、鹽",
    "原產地：韓國",
    "進口商：Taiwan Importer Co.",
    "有效日期：2027.05.01",
    "營養標示：每份熱量 120 kcal、蛋白質 2g、脂肪 1g、碳水化合物 25g、糖 1g、鈉 240mg"
  ].join("\n")
};

export const compoundFoodAdditiveSampleReview: ReviewInput = {
  productName: "복방 보존료 프리믹스 5kg",
  productType: "compound food additive / 複方食品添加物 / 식품첨가물",
  origin: "대한민국",
  manufacturer: "ANNAANDA Ingredients, Seoul / Taiwan Importer Co.",
  hsCode: "2106.90",
  incoterms: "CIF Keelung",
  shipmentPurpose: "commercial sale",
  invoiceValue: "1500",
  ingredientsText: [
    "Sodium benzoate",
    "Potassium sorbate",
    "Citric acid",
    "Dextrose carrier"
  ].join(", "),
  labelText: [
    "品名：複方食品添加物（防腐用途）",
    "內容量：5kg",
    "成分：苯甲酸鈉、己二烯酸鉀、檸檬酸、葡萄糖",
    "用途：食品添加物，用於醬料及飲料產品",
    "原產地：韓國",
    "進口商：Taiwan Importer Co.",
    "食品添加物查驗登記許可證 TW-FA-2026-0099",
    "產品成分報告書與 composition report 已備妥",
    "Official health certificate issued by exporting-country competent authority"
  ].join("\n")
};

export const foodClaimSampleReview: ReviewInput = {
  productName: "고단백 저당 키위 오징어 스낵 50g",
  productType: "prepackaged food / snack / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Foods, Seoul / Taiwan Importer Co.",
  hsCode: "1905.90",
  incoterms: "DAP Taipei",
  shipmentPurpose: "commercial sale",
  invoiceValue: "820",
  ingredientsText: [
    "Rice",
    "Pea protein",
    "Squid powder",
    "Kiwifruit powder",
    "Sunflower seed oil",
    "Erythritol",
    "Salt"
  ].join(", "),
  labelText: [
    "品名：高蛋白低糖奇異果魷魚脆片",
    "內容量：50g",
    "成分：米、豌豆蛋白、魷魚粉、奇異果粉、葵花籽油、赤藻糖醇、鹽",
    "原產地：韓國",
    "進口商：Taiwan Importer Co.",
    "有效日期：2027.08.01",
    "營養標示：每份熱量 110 kcal、蛋白質 12g、脂肪 2g、碳水化合物 10g、糖 1g、鈉 180mg",
    "本產品含魷魚、奇異果；高蛋白、低糖標示需依檢驗值確認"
  ].join("\n")
};

export const sourceCards = [
  {
    title: "Taiwan CCC import/export regulations",
    detail: "MOEA/TITA commodity regulation lookup for HS or Taiwan CCC codes, import/export regulation codes, permit signals, and commodity descriptions.",
    url: "https://fbfh.trade.gov.tw/fh/indexE.jsp",
    tag: "CCC"
  },
  {
    title: "Import and Export Administration",
    detail: "TITA workflow for export/import permits, electronic licensing, permit applications, and import/export administration routing.",
    url: "https://www.trade.gov.tw/english/Pages/List.aspx?nodeID=4650",
    tag: "허가"
  },
  {
    title: "GC453 tariff database download",
    detail: "CPT Single Window customs source for Taiwan tariff schedules, CCC code descriptions, tariff numbers, and advance tariff ruling materials.",
    url: "https://portal.sw.nat.gov.tw/APGQ/GC453",
    tag: "관세"
  },
  {
    title: "Customs tariff system",
    detail: "Taiwan Customs tariff-system index for tariff query information, HS revision materials, and import-tariff schedule context.",
    url: "https://web.customs.gov.tw/en/multiplehtml/3349",
    tag: "세번"
  },
  {
    title: "Advance tariff classification ruling",
    detail: "Keelung Customs guidance for binding CCC-code rulings before import when classification is uncertain.",
    url: "https://web.customs.gov.tw/ekeelung/singlehtml/e6735b1fe2114e34af5d13e170c74138",
    tag: "사전심사"
  },
  {
    title: "Cosmetic Hygiene and Safety Act",
    detail: "Article 6 bans or restricts ingredients by public announcement; Article 7 defines required cosmetic label items; Article 10 controls deceptive, exaggerated, and medical efficacy claims.",
    url: "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030013",
    tag: "법령"
  },
  {
    title: "Imported cosmetics inspection",
    detail: "TFDA imported-cosmetics inspection and examination source for border sampling, release, and nonconforming-goods workflows.",
    url: "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=5062&id=3191",
    tag: "수입검사"
  },
  {
    title: "TFDA prohibited ingredients",
    detail: "Open dataset for ingredients prohibited in cosmetics, including CAS number and notes.",
    url: "https://data.gov.tw/dataset/173684",
    tag: "오픈데이터"
  },
  {
    title: "TFDA restricted ingredients",
    detail: "Open dataset for ingredient limits, product scopes, restrictions, and required cautions.",
    url: "https://data.gov.tw/dataset/173685",
    tag: "오픈데이터"
  },
  {
    title: "TFDA preservatives",
    detail: "Open dataset for preservative ingredient names and use restrictions such as Triclosan, MIT, Chlorphenesin, and Phenoxyethanol.",
    url: "https://data.gov.tw/dataset/173682",
    tag: "오픈데이터"
  },
  {
    title: "TFDA sunscreen filters",
    detail: "Open dataset for sunscreen ingredient use restrictions and function evidence notes.",
    url: "https://data.gov.tw/dataset/173683",
    tag: "오픈데이터"
  },
  {
    title: "PIF phased implementation",
    detail: "TFDA states that from July 1, 2026, all cosmetic products except certain handmade solid soaps must have a PIF before marketing, sale, or consumer use.",
    url: "https://www.fda.gov.tw/eng/newsContent.aspx?id=31164",
    tag: "PIF"
  },
  {
    title: "Cosmetic product registration zone",
    detail: "TFDA cosmetic product registration and notification portal guidance, including platform routing and product-registration workflow context.",
    url: "https://www.fda.gov.tw/tc/sitecontent.aspx?sid=3435",
    tag: "제품등록"
  },
  {
    title: "Cosmetic GMP announcements",
    detail: "TFDA cosmetics announcements used to track GMP, PIF, product-notification, and implementation-stage changes for Taiwan cosmetic supply.",
    url: "https://www.fda.gov.tw/TC/sitelist.aspx?sid=1894",
    tag: "GMP"
  },
  {
    title: "Act Governing Food Safety and Sanitation",
    detail: "Article 22 is the backbone for Taiwan prepackaged food label checks, including name, ingredients, weight, expiry, origin, responsible firm, and other required consumer information.",
    url: "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0040001",
    tag: "식품"
  },
  {
    title: "TFDA food allergen labeling",
    detail: "Official Taiwan allergen-labeling rule used for peanut, milk, egg, gluten cereals, soy, sesame, fish, crustacea, sulphites, mango, and tree nut screening.",
    url: "https://www.fda.gov.tw/tc/includes/GetFile.ashx?id=f636826556478322315",
    tag: "알레르겐"
  },
  {
    title: "TFDA food import inspection exemptions",
    detail: "Import-inspection exemption and custom-code requirements for food and related products, including personal-use thresholds.",
    url: "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3371",
    tag: "검사면제"
  },
  {
    title: "Imported food inspection regulations",
    detail: "TFDA/MOJ source for imported-food inspection applications, product information sheets, import declarations, CCC-code batch grouping, sampling, and prior release.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1356",
    tag: "수입식품검사"
  },
  {
    title: "Systematic inspection of imported food",
    detail: "TFDA source for exporting-country food safety management review, document review, and on-site inspection triggers.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1607",
    tag: "체계적검사"
  },
  {
    title: "Shellfish HS 0307 health certificate",
    detail: "TFDA notice requiring shellfish under HS 0307 for human consumption to carry an exporting-country official health certificate with harvest-area information.",
    url: "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3095",
    tag: "위생증명"
  },
  {
    title: "Food business registration for importers",
    detail: "TFDA food-business registration rule for import operators, covering product-liability insurance, imported product categories, storage, and repackaging descriptions.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1681",
    tag: "수입업자등록"
  },
  {
    title: "Business-use food intact package labeling",
    detail: "TFDA principles for imported foods and raw materials in intact packages, including repackaging and Chinese-label timing.",
    url: "https://www.fda.gov.tw/ENG/lawContent.aspx?cid=16&id=3411",
    tag: "업무용식품"
  },
  {
    title: "TFDA nutrition labeling",
    detail: "Nutrition labeling requirements for prepackaged food products, used as the baseline for calories, protein, fat, carbohydrate, sugar, sodium, and serving information checks.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1633",
    tag: "영양표시"
  },
  {
    title: "TFDA recommended allergen labeling",
    detail: "Recommended allergen-labeling source used for advisory checks on cephalopods, mollusks, seeds, and kiwifruit without treating them as automatic failures.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3407",
    tag: "권장 알레르겐"
  },
  {
    title: "TFDA nutrition claims",
    detail: "Nutrition claim rules used when labels say low sugar, high protein, low sodium, high fiber, low calorie, or similar claim wording.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=3522",
    tag: "강조표시"
  },
  {
    title: "Food additive inspection registration materials",
    detail: "TFDA food-additive inspection-registration materials used to separate additive-product permits from ordinary food labels that merely contain additives.",
    url: "https://www.fda.gov.tw/tc/sitelist.aspx?sid=3895",
    tag: "첨가물등록"
  },
  {
    title: "Compound food additive import documents",
    detail: "TFDA notice for compound food-additive import document review, including product composition reports and official health-certificate evidence.",
    url: "https://www.fda.gov.tw/tc/newsContent.aspx?cid=4&id=19405",
    tag: "복방첨가물"
  }
];
