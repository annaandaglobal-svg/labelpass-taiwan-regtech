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
  }
];
