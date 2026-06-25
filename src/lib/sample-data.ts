import type { ReviewInput } from "./compliance";

export const sampleReview: ReviewInput = {
  productName: "수분 진정 토너 300ml",
  productType: "leave-on toner / 일반 화장품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Beauty Lab, Seoul",
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
    "製造日期：2026.06.01 / 有效日期：2029.06.01"
  ].join("\n")
};

export const foodRiskSampleReview: ReviewInput = {
  productName: "피넛 밀크 쿠키 120g",
  productType: "prepackaged food / snack / 식품",
  origin: "대한민국",
  manufacturer: "ANNAANDA Foods, Seoul",
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

export const sourceCards = [
  {
    title: "Cosmetic Hygiene and Safety Act",
    detail: "Article 6 bans or restricts ingredients by public announcement; Article 7 defines required cosmetic label items; Article 10 controls deceptive, exaggerated, and medical efficacy claims.",
    url: "https://law.moj.gov.tw/ENG/LawClass/LawAll.aspx?pcode=L0030013",
    tag: "법령"
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
    title: "TFDA nutrition labeling",
    detail: "Nutrition labeling requirements for prepackaged food products, used as the baseline for calories, protein, fat, carbohydrate, sugar, sodium, and serving information checks.",
    url: "https://www.fda.gov.tw/eng/lawContent.aspx?cid=16&id=1633",
    tag: "영양표시"
  }
];
