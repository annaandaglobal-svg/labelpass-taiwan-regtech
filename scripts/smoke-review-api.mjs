const baseUrl = process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000";

const baseInput = {
  productName: "Glow Repair Toner",
  productType: "leave-on toner / general cosmetics",
  labelText: "Made in Korea. Instantly treats eczema and removes acne permanently.",
  origin: "Korea",
  manufacturer: "Annaanda Lab",
  hsCode: "3304.99",
  incoterms: "DAP Taipei",
  shipmentPurpose: "commercial sale",
  invoiceValue: "1200"
};

const cases = [
  {
    name: "English restricted ingredients",
    ingredientsText: "Water, Glycerin, Triclosan 0.4%, Methylisothiazolinone 0.002%, Mercury",
    minimumFindings: 3
  },
  {
    name: "Separator-folded restricted ingredients",
    ingredientsText: "Water, Glycerin, Triclosan 0.4%, Methyl-isothiazolinone 0.002%, Mercury",
    minimumFindings: 3
  },
  {
    name: "Korean and traditional Chinese aliases",
    ingredientsText: "Water, 살리실산 3%, 水楊酸 3%, MI 0.002%, 수은",
    minimumFindings: 2
  },
  {
    name: "Simplified Chinese and INCI aliases",
    ingredientsText: "Aqua, 水杨酸 3%, Oxybenzone 12%, Phenoxyethanol 2%",
    minimumFindings: 2
  }
];

for (const testCase of cases) {
  const response = await fetch(`${baseUrl}/api/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...baseInput,
      ingredientsText: testCase.ingredientsText
    })
  });

  if (!response.ok) {
    throw new Error(`${testCase.name}: Review API returned ${response.status}`);
  }

  const result = await response.json();

  if (result.status !== "fail") {
    throw new Error(`${testCase.name}: expected fail status, got ${result.status}`);
  }

  if (!Array.isArray(result.findings) || result.findings.length < testCase.minimumFindings) {
    throw new Error(`${testCase.name}: expected at least ${testCase.minimumFindings} findings, got ${result.findings?.length ?? 0}`);
  }

  if (!result.findings.some((finding) => String(finding.source).includes("InfoId"))) {
    throw new Error(`${testCase.name}: expected at least one TFDA InfoId source in findings`);
  }
}

const foodResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Peanut Milk Cookie",
    productType: "prepackaged food / snack",
    ingredientsText: "Wheat flour, peanut, milk powder, sugar",
    labelText: "Product name: Peanut Milk Cookie. Net weight 120g. Made in Korea. EXP 2027-01-01. Nutrition: Calories 500 kcal, protein 5g, fat 20g, carbohydrate 60g, sodium 300mg.",
    origin: "Korea",
    manufacturer: "Annaanda Foods"
  })
});

if (!foodResponse.ok) {
  throw new Error(`Food review: Review API returned ${foodResponse.status}`);
}

const foodResult = await foodResponse.json();

if (foodResult.ruleVersion !== "TW-FOOD-2026.06-draft") {
  throw new Error(`Food review: expected TW food rule version, got ${foodResult.ruleVersion}`);
}

if (foodResult.status !== "fail") {
  throw new Error(`Food review: expected fail status for missing allergen warning, got ${foodResult.status}`);
}

if (!foodResult.findings?.some((finding) => finding.id === "food-allergen-peanut" && finding.status === "fail")) {
  throw new Error("Food review: expected peanut allergen failure");
}

const foodCleanResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Citron Herbal Tea",
    productType: "prepackaged food / tea / 식품",
    ingredientsText: "Citron peel, rooibos, peppermint, dried apple",
    labelText: "品名：柚子草本茶. 內容量：40g. 成分：柚子皮、南非國寶茶、薄荷、乾燥蘋果. 原產地：韓國. 進口商：Taiwan Importer Co. 有效日期：2027-03-01. 營養標示：每份熱量 5 kcal, 蛋白質 0g, 脂肪 0g, 碳水化合物 1g, 糖 0g, 鈉 0mg.",
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodCleanResponse.ok) {
  throw new Error(`Food clean review: Review API returned ${foodCleanResponse.status}`);
}

const foodCleanResult = await foodCleanResponse.json();

if (foodCleanResult.ruleVersion !== "TW-FOOD-2026.06-draft") {
  throw new Error(`Food clean review: expected TW food rule version, got ${foodCleanResult.ruleVersion}`);
}

if (foodCleanResult.status === "fail") {
  throw new Error("Food clean review: expected non-fail status");
}

const foodAdditiveResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Umami Rice Cracker",
    productType: "prepackaged food / snack / 식품",
    ingredientsText: "Rice, MSG, sodium benzoate, xanthan gum, salt",
    labelText: "品名：旨味米餅. 內容量：80g. 成分：米、味精、苯甲酸鈉、三仙膠、鹽. 原產地：韓國. 進口商：Taiwan Importer Co. 有效日期：2027-05-01. 營養標示：每份熱量 120 kcal, 蛋白質 2g, 脂肪 1g, 碳水化合物 25g, 糖 1g, 鈉 240mg.",
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodAdditiveResponse.ok) {
  throw new Error(`Food additive review: Review API returned ${foodAdditiveResponse.status}`);
}

const foodAdditiveResult = await foodAdditiveResponse.json();

if (!foodAdditiveResult.findings?.some((finding) => finding.id === "food-additive-monosodium-glutamate")) {
  throw new Error("Food additive review: expected MSG additive finding");
}

if (!foodAdditiveResult.findings?.some((finding) => finding.id === "food-additive-benzoates-food-additives")) {
  throw new Error("Food additive review: expected benzoate additive finding");
}

if (foodAdditiveResult.status === "fail") {
  throw new Error("Food additive review: expected non-fail status for additive-only review");
}

const compoundAdditiveMissingResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Compound Preservative Premix",
    productType: "compound food additive / 複方食品添加物",
    ingredientsText: "Sodium benzoate, potassium sorbate, citric acid, dextrose carrier",
    labelText: "品名：複方食品添加物. 內容量：5kg. 成分：苯甲酸鈉、己二烯酸鉀、檸檬酸、葡萄糖. 用途：食品添加物.",
    origin: "Korea",
    manufacturer: "Annaanda Ingredients / Taiwan Importer Co.",
    hsCode: "2106.90",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1500"
  })
});

if (!compoundAdditiveMissingResponse.ok) {
  throw new Error(`Compound additive missing review: Review API returned ${compoundAdditiveMissingResponse.status}`);
}

const compoundAdditiveMissingResult = await compoundAdditiveMissingResponse.json();

for (const findingId of [
  "food-additive-inspection-registration-needed",
  "compound-food-additive-import-docs-needed"
]) {
  if (!compoundAdditiveMissingResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Compound additive missing review: expected ${findingId}`);
  }
}

if (compoundAdditiveMissingResult.status === "fail") {
  throw new Error("Compound additive missing review: expected non-fail status for document gaps");
}

if (!compoundAdditiveMissingResult.actionPlan?.actionItems?.some((item) => item.findingId === "compound-food-additive-import-docs-needed")) {
  throw new Error("Compound additive missing review: expected action plan item for compound additive import documents");
}

if (!compoundAdditiveMissingResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "compound-food-additive-import-docs" && doc.status === "needed")) {
  throw new Error("Compound additive missing review: expected needed compound additive document checklist item");
}

const compoundAdditiveCompleteResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Compound Preservative Premix",
    productType: "compound food additive / 複方食品添加物",
    ingredientsText: "Sodium benzoate, potassium sorbate, citric acid, dextrose carrier",
    labelText: [
      "品名：複方食品添加物. 內容量：5kg. 成分：苯甲酸鈉、己二烯酸鉀、檸檬酸、葡萄糖. 用途：食品添加物.",
      "食品添加物查驗登記許可證 TW-FA-2026-0099.",
      "產品成分報告書 and composition report prepared.",
      "Official health certificate issued by exporting-country competent authority."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Ingredients / Taiwan Importer Co.",
    hsCode: "2106.90",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1500"
  })
});

if (!compoundAdditiveCompleteResponse.ok) {
  throw new Error(`Compound additive complete review: Review API returned ${compoundAdditiveCompleteResponse.status}`);
}

const compoundAdditiveCompleteResult = await compoundAdditiveCompleteResponse.json();

for (const findingId of [
  "food-additive-inspection-registration-present",
  "compound-food-additive-import-docs-present"
]) {
  if (!compoundAdditiveCompleteResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Compound additive complete review: expected pass finding ${findingId}`);
  }
}

if (!compoundAdditiveCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "compound-food-additive-import-docs" && doc.status === "ready")) {
  throw new Error("Compound additive complete review: expected ready compound additive document checklist item");
}

const foodClaimResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "High Protein Low Sugar Kiwi Squid Snack",
    productType: "",
    ingredientsText: "Rice, pea protein, squid powder, kiwifruit powder, sunflower seed oil, erythritol, salt",
    labelText: "品名：高蛋白低糖奇異果魷魚脆片. 內容量：50g. 成分：米、豌豆蛋白、魷魚粉、奇異果粉、葵花籽油、赤藻糖醇、鹽. 原產地：韓國. 進口商：Taiwan Importer Co. 有效日期：2027-08-01. 營養標示：每份熱量 110 kcal, 蛋白質 12g, 脂肪 2g, 碳水化合物 10g, 糖 1g, 鈉 180mg. 本產品含魷魚、奇異果；高蛋白、低糖標示需依檢驗值確認.",
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodClaimResponse.ok) {
  throw new Error(`Food claim review: Review API returned ${foodClaimResponse.status}`);
}

const foodClaimResult = await foodClaimResponse.json();

if (foodClaimResult.status === "fail") {
  throw new Error("Food claim review: expected non-fail status for recommended allergen and nutrition claim review");
}

if (!foodClaimResult.findings?.some((finding) => finding.id === "food-recommended-allergen-cephalopods-advisory-allergen")) {
  throw new Error("Food claim review: expected cephalopods recommended allergen finding");
}

if (!foodClaimResult.findings?.some((finding) => finding.id === "food-recommended-allergen-kiwifruit-advisory-allergen")) {
  throw new Error("Food claim review: expected kiwifruit recommended allergen finding");
}

if (!foodClaimResult.findings?.some((finding) => finding.id === "food-nutrition-claim-protein")) {
  throw new Error("Food claim review: expected protein nutrition claim finding");
}

if (!foodClaimResult.findings?.some((finding) => finding.id === "food-nutrition-claim-sugar")) {
  throw new Error("Food claim review: expected sugar nutrition claim finding");
}

const foodImportMissingResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Frozen Oyster Meat",
    productType: "prepackaged food / frozen shellfish / seafood",
    ingredientsText: "Frozen oyster meat, salt",
    labelText: "品名：冷凍牡蠣肉. 內容量：1kg. 成分：牡蠣、鹽. 原產地：韓國. 進口商：Taiwan Importer Co. 有效日期：2027-02-01. 營養標示：每份熱量 80 kcal, 蛋白質 9g, 脂肪 2g, 碳水化合物 4g, 鈉 420mg. 本產品含貝類.",
    origin: "Korea",
    manufacturer: "Annaanda Seafood / Taiwan Importer Co.",
    hsCode: "0307.12",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "2400"
  })
});

if (!foodImportMissingResponse.ok) {
  throw new Error(`Food import missing review: Review API returned ${foodImportMissingResponse.status}`);
}

const foodImportMissingResult = await foodImportMissingResponse.json();

for (const findingId of [
  "food-import-inspection-docs-needed",
  "food-importer-registration-needed",
  "food-import-hs0307-health-certificate-needed",
  "food-import-batch-consistency-review",
  "food-systematic-inspection-approval-needed"
]) {
  if (!foodImportMissingResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Food import missing review: expected ${findingId}`);
  }
}

if (foodImportMissingResult.status === "fail") {
  throw new Error("Food import missing review: expected non-fail status for document-only gaps");
}

const foodImportCompleteResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Frozen Oyster Meat",
    productType: "prepackaged food / frozen shellfish / seafood",
    ingredientsText: "Frozen oyster meat, salt",
    labelText: [
      "品名：冷凍牡蠣肉. 內容量：1kg. 成分：牡蠣、鹽. 原產地：韓國. 進口商：Taiwan Importer Co.",
      "有效日期：2027-02-01. 營養標示：每份熱量 80 kcal, 蛋白質 9g, 脂肪 2g, 碳水化合物 4g, 鈉 420mg.",
      "Inspection application form, product information sheet, import declaration copy.",
      "食品業者登錄字號 F-123456789, 產品責任保險, 輸入產品類別 frozen seafood, 貯存場所 Keelung cold warehouse, 無分裝.",
      "Official health certificate issued by exporting-country competent authority, harvest area KR-TY-01.",
      "Systematic inspection market access approval and approved establishment list checked."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Seafood / Taiwan Importer Co.",
    hsCode: "0307.12",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "2400"
  })
});

if (!foodImportCompleteResponse.ok) {
  throw new Error(`Food import complete review: Review API returned ${foodImportCompleteResponse.status}`);
}

const foodImportCompleteResult = await foodImportCompleteResponse.json();

for (const findingId of [
  "food-import-inspection-docs-present",
  "food-importer-registration-present",
  "food-import-hs0307-health-certificate-present",
  "food-systematic-inspection-approval-present"
]) {
  if (!foodImportCompleteResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Food import complete review: expected pass finding ${findingId}`);
  }
}

if (foodImportCompleteResult.findings?.some((finding) => finding.id === "food-import-hs0307-health-certificate-needed")) {
  throw new Error("Food import complete review: did not expect missing health certificate finding");
}

const tradeResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "AI GPU Skin Analyzer",
    productType: "AI hardware device",
    ingredientsText: "GPU module, camera sensor, encrypted firmware",
    labelText: "Made in Korea. Device for AI skin analysis. Invoice value blank.",
    origin: "Korea",
    manufacturer: "Annaanda Device Lab",
    invoiceValue: ""
  })
});

if (!tradeResponse.ok) {
  throw new Error(`Trade review: Review API returned ${tradeResponse.status}`);
}

const tradeResult = await tradeResponse.json();

for (const findingId of [
  "trade-hs-needed",
  "trade-importer-needed",
  "trade-incoterms-needed",
  "trade-shipment-purpose-needed",
  "trade-invoice-value-needed",
  "trade-shtc-review-needed"
]) {
  if (!tradeResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Trade review: expected ${findingId}`);
  }
}

const tradeCompleteResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Cica Repair Cream Export Lot",
    productType: "cosmetic / leave-on",
    ingredientsText: "Water, Glycerin 5%, Panthenol 1%, Phenoxyethanol 0.7%",
    labelText: [
      "品名：積雪草修護霜. 容量：50ml. 全成分：Water, Glycerin, Panthenol, Phenoxyethanol.",
      "原產地：韓國. 進口商：Taiwan Importer Co. 製造日期：2026-06-01. 有效日期：2029-06-01.",
      "化粧品產品登錄字號 TW-COS-2026-00021. PIF product information file and safety assessment prepared.",
      "化粧品GMP / ISO 22716 certificate for manufacturing site."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Beauty Lab / Taiwan Importer Co.",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1800"
  })
});

if (!tradeCompleteResponse.ok) {
  throw new Error(`Trade complete review: Review API returned ${tradeCompleteResponse.status}`);
}

const tradeCompleteResult = await tradeCompleteResponse.json();

for (const findingId of ["trade-hs-present", "trade-incoterms-present", "trade-shipment-purpose-present"]) {
  if (!tradeCompleteResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Trade complete review: expected ${findingId}`);
  }
}

for (const findingId of [
  "cosmetic-product-notification-present",
  "cosmetic-pif-readiness-present",
  "cosmetic-gmp-readiness-present"
]) {
  if (!tradeCompleteResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Trade complete review: expected cosmetic pass finding ${findingId}`);
  }
}

if (!tradeCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "cosmetic-pif" && doc.status === "ready")) {
  throw new Error("Trade complete review: expected ready cosmetic PIF checklist item");
}

if (!Array.isArray(tradeCompleteResult.actionPlan?.ownerSummary)) {
  throw new Error("Trade complete review: expected action plan owner summary");
}

const knowledgeCases = [
  { query: "살리실산", expectedTerm: "Salicylic Acid" },
  { query: "水楊酸", expectedTerm: "Salicylic Acid" },
  { query: "IPBC", expectedTerm: "Iodopropynyl Butylcarbamate" },
  { query: "땅콩", expectedTerm: "Peanut" },
  { query: "花生", expectedTerm: "Peanut" },
  { query: "味精", expectedTerm: "Monosodium Glutamate" },
  { query: "벤조산나트륨", expectedTerm: "Benzoic Acid and Benzoates" },
  { query: "카제인나트륨", expectedTerm: "Casein and Caseinates" },
  { query: "스테비아", expectedTerm: "Steviol Glycosides" },
  { query: "魷魚", expectedTerm: "Cephalopods" },
  { query: "奇異果", expectedTerm: "Kiwifruit" },
  { query: "SDS", expectedTerm: "Safety Data Sheet", expectedFirst: "Safety Data Sheet" },
  { query: "HS코드", expectedTerm: "HS Code Classification" },
  { query: "CCC碼", expectedTerm: "HS Code Classification" },
  { query: "원산지 표시", expectedTerm: "Country of Origin Marking" },
  { query: "원산지증명서", expectedTerm: "Certificate of Origin" },
  { query: "인코텀즈", expectedTerm: "Incoterms" },
  { query: "商業發票", expectedTerm: "Commercial Invoice" },
  { query: "패킹리스트", expectedTerm: "Packing List" },
  { query: "進口目的", expectedTerm: "Shipment Purpose" },
  { query: "대만 수입자", expectedTerm: "Taiwan Importer and Responsible Firm" },
  { query: "COA", expectedTerm: "Certificate of Analysis", expectedFirst: "Certificate of Analysis" },
  { query: "INCI", expectedTerm: "INCI Ingredient Name", expectedFirst: "INCI Ingredient Name" },
  { query: "營養標示", expectedTerm: "Nutrition Labeling" },
  { query: "過敏原標示", expectedTerm: "Food Allergen Labeling" },
  { query: "PIF", expectedTerm: "Cosmetic Product Information File", expectedFirst: "Cosmetic Product Information File" },
  { query: "化妆品备案", expectedTerm: "Cosmetic Product Notification" },
  { query: "輸入化粧品檢驗", expectedTerm: "Imported Cosmetics Inspection" },
  { query: "免申請查驗", expectedTerm: "Food Import Inspection Exemption" },
  { query: "輸入食品查驗", expectedTerm: "Imported Food Inspection" },
  { query: "수입식품 통관검사", expectedTerm: "Imported Food Inspection" },
  { query: "HS 0307 health certificate", expectedTerm: "Food Import Health Certificate" },
  { query: "HS-0307 위생증명서", expectedTerm: "Food Import Health Certificate" },
  { query: "食品業者登錄", expectedTerm: "Food Business Registration for Importers" },
  { query: "產品資訊表", expectedTerm: "Product Information Sheet" },
  { query: "業務用食品標示", expectedTerm: "Business-use Food Intact Package Labeling" },
  { query: "查驗登記", expectedTerm: "Food Additive Inspection Registration", expectedFirst: "Food Additive Inspection Registration" },
  { query: "複方食品添加物", expectedTerm: "Compound Food Additive Import Documents", expectedFirst: "Compound Food Additive Import Documents" },
  { query: "官方衛生證明", expectedTerm: "Compound Food Additive Import Documents" },
  { query: "化粧品GMP", expectedTerm: "Cosmetic Good Manufacturing Practice", expectedFirst: "Cosmetic Good Manufacturing Practice" },
  { query: "化粧品產品登錄", expectedTerm: "Cosmetic Product Notification", expectedFirst: "Cosmetic Product Notification" },
  { query: "進口貨物稅則預先審核", expectedTerm: "Advance Tariff Classification Ruling" },
  { query: "輸入許可證", expectedTerm: "Import and Export Permit" },
  { query: "BA", expectedTerm: "Benzoic Acid and Benzoates" },
  { query: "sodium-benzoate", expectedTerm: "Benzoic Acid and Benzoates" },
  { query: "DHA", expectedTerm: "Dehydroacetic Acid" },
  { query: "Gly", expectedTerm: "Glycine" },
  { query: "methyl-isothiazolinone", expectedTerm: "Methylisothiazolinone" },
  { query: "CI-77891", expectedTerm: "Titanium Dioxide" },
  { query: "CCC-code", expectedTerm: "HS Code Classification" },
  { query: "잔류농약 기준", expectedTerm: "Food Pesticide Residue Limits" },
  { query: "農藥殘留容許量", expectedTerm: "Food Pesticide Residue Limits" },
  { query: "동물용의약품 잔류허용기준", expectedTerm: "Food Veterinary Drug Residue Limits" },
  { query: "食品中污染物質及毒素", expectedTerm: "Food Contaminants and Toxins Standards" },
  { query: "식품 미생물 기준", expectedTerm: "Food Microorganism Sanitation Standard" },
  { query: "食品追溯追蹤", expectedTerm: "Food Traceability" },
  { query: "식품 GHP", expectedTerm: "Food Good Hygiene Practice" },
  { query: "Foreign Trade Act", expectedTerm: "Foreign Trade Act" },
  { query: "수출입업자 등록", expectedTerm: "Exporter and Importer Registration" },
  { query: "進口報單", expectedTerm: "Customs Declaration" },
  { query: "戰略性高科技貨品", expectedTerm: "Strategic High-Tech Commodities" },
  { query: "SHTC export permit", expectedTerm: "SHTC Export Permit" },
  { query: "國際進口證明書", expectedTerm: "International Import Certificate" },
  { query: "最終使用者", expectedTerm: "End Use and End User" }
];

for (const testCase of knowledgeCases) {
  const response = await fetch(`${baseUrl}/api/knowledge/search?q=${encodeURIComponent(testCase.query)}`);

  if (!response.ok) {
    throw new Error(`${testCase.query}: Knowledge API returned ${response.status}`);
  }

  const result = await response.json();
  const matched = Array.isArray(result.terms)
    ? result.terms.some((term) => term.canonicalName === testCase.expectedTerm)
    : false;

  if (!matched) {
    throw new Error(`${testCase.query}: expected term ${testCase.expectedTerm}`);
  }

  if (testCase.expectedFirst && result.terms?.[0]?.canonicalName !== testCase.expectedFirst) {
    throw new Error(`${testCase.query}: expected first term ${testCase.expectedFirst}, got ${result.terms?.[0]?.canonicalName ?? "none"}`);
  }
}

const sourceCases = [
  { query: "simple asphyxiants", expectedSource: "global-unece-ghs-rev11-pdf" },
  { query: "April 1 2026 tariff", expectedSource: "jp-customs-tariff-schedule" },
  { query: "mofcom export control", expectedSource: "cn-mofcom-export-control-portal" },
  { query: "GC453 CCC CODE", expectedSource: "tw-customs-tariff-database-download" },
  { query: "CCC import export regulation", expectedSource: "tw-trade-ccc-import-export-regulations" },
  { query: "imported cosmetics inspection", expectedSource: "tw-tfda-imported-cosmetics-inspection" },
  { query: "免申請查驗 通關代碼", expectedSource: "tw-tfda-food-import-inspection-exemptions" },
  { query: "Regulations of Inspection of Imported Foods and Related Products", expectedSource: "tw-tfda-imported-food-inspection-regulations" },
  { query: "systematic inspection imported food document review", expectedSource: "tw-tfda-systematic-inspection-imported-food" },
  { query: "shellfish HS 0307 health certificate harvest area", expectedSource: "tw-tfda-shellfish-hs0307-health-certificate" },
  { query: "food business registration import business operators product liability insurance", expectedSource: "tw-tfda-food-business-registration-importers" },
  { query: "compound food additive composition report official health certificate", expectedSource: "tw-tfda-compound-food-additive-import-documents" },
  { query: "food additive inspection registration permit document", expectedSource: "tw-tfda-food-additive-registration-materials" },
  { query: "cosmetic product registration platform fadenbook", expectedSource: "tw-tfda-cosmetic-product-registration-zone" },
  { query: "cosmetic GMP product information file latest announcement", expectedSource: "tw-tfda-cosmetic-announcements" },
  { query: "tariff query information", expectedSource: "tw-customs-tariff-system" },
  { query: "pesticide residue limits crop classification", expectedSource: "tw-moj-food-pesticide-residue-limits" },
  { query: "veterinary drug residue limits imported products", expectedSource: "tw-moj-food-veterinary-drug-residue-limits" },
  { query: "contaminants and toxins mycotoxins metals foods", expectedSource: "tw-moj-food-contaminants-toxins" },
  { query: "microorganisms in foods sanitation standard pathogens", expectedSource: "tw-tfda-food-microorganisms-standard" },
  { query: "food traceability source track flow records", expectedSource: "tw-tfda-food-traceability" },
  { query: "good hygiene practice food manufacturing storage transportation", expectedSource: "tw-tfda-food-ghp-regulations" },
  { query: "Foreign Trade Act exporter importer registration", expectedSource: "tw-moj-foreign-trade-act" },
  { query: "Regulations Governing Import of Commodities import permit negative list", expectedSource: "tw-moj-import-commodities-regulations" },
  { query: "Regulations Governing Export of Commodities origin marking export permit", expectedSource: "tw-moj-export-commodities-regulations" },
  { query: "Registration of Exporters and Importers English name availability", expectedSource: "tw-moj-exporter-importer-registration" },
  { query: "commodity classification import export regulation guide negative list SHTC", expectedSource: "tw-trade-commodity-classification-guide" },
  { query: "Customs Act import declaration invoice packing list single window", expectedSource: "tw-moj-customs-act" },
  { query: "Strategic High-tech Commodities International Import Certificate end user", expectedSource: "tw-moj-shtc-export-import-regulations" },
  { query: "戰略性高科技貨品 國際進口證明書 最終用途", expectedSource: "tw-trade-shtc-bilingual-glossary" }
];

for (const testCase of sourceCases) {
  const response = await fetch(`${baseUrl}/api/knowledge/search?q=${encodeURIComponent(testCase.query)}`);

  if (!response.ok) {
    throw new Error(`${testCase.query}: Knowledge API returned ${response.status}`);
  }

  const result = await response.json();
  const matched = Array.isArray(result.sources)
    ? result.sources.some((source) => source.id === testCase.expectedSource)
    : false;

  if (!matched) {
    throw new Error(`${testCase.query}: expected source ${testCase.expectedSource}`);
  }
}

const archiveListResponse = await fetch(`${baseUrl}/api/reviews`);

if (!archiveListResponse.ok) {
  throw new Error(`Review archive list: API returned ${archiveListResponse.status}`);
}

const archiveList = await archiveListResponse.json();
const validArchiveStates = new Set(["database", "disabled", "unavailable"]);

if (!validArchiveStates.has(archiveList.storage) || !Array.isArray(archiveList.reviews)) {
  throw new Error("Review archive list: expected storage state and reviews array");
}

const archiveSmokeId = `smoke-${Date.now()}`;
const archiveSaveResponse = await fetch(`${baseUrl}/api/reviews?dryRun=1`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: archiveSmokeId,
    input: {
      productName: "Peanut Milk Cookie",
      productType: "prepackaged food / snack",
      ingredientsText: "Wheat flour, peanut, milk powder, sugar",
      labelText: "Product name: Peanut Milk Cookie. Made in Korea.",
      origin: "Korea",
      manufacturer: "Annaanda Foods"
    },
    result: foodResult
  })
});

if (!archiveSaveResponse.ok) {
  throw new Error(`Review archive save: API returned ${archiveSaveResponse.status}`);
}

const archiveSave = await archiveSaveResponse.json();

if (!validArchiveStates.has(archiveSave.storage)) {
  throw new Error(`Review archive save: unexpected storage state ${archiveSave.storage}`);
}

if (archiveSave.storage === "database" && archiveSave.review?.id !== archiveSmokeId) {
  throw new Error("Review archive save: database response did not preserve app review id");
}

console.log(
  `API smoke test passed: ${cases.length + 10} review cases, ${knowledgeCases.length} knowledge cases, ${sourceCases.length} source cases, 2 archive cases.`
);
