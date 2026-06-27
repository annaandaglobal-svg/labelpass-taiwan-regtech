const baseUrl = process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000";
const foodAdditivePermitQueryUrl = "https://consumer.fda.gov.tw/Food/InfoFoodAdd.aspx?nodeID=162";
const foodIngredientDirectQueryUrl = "https://consumer.fda.gov.tw/Food/Material.aspx?nodeID=160";
const mojibakePattern = /窶|諤|鴗|貐|賱|�|[\uE000-\uF8FF]|銝|嚗|瑼|撟|靽|甈|摰|蝣|瘛|鞈/;

function collectStrings(value, path = "$", output = []) {
  if (typeof value === "string") {
    output.push({ path, value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectStrings(item, `${path}.${key}`, output));
  }
  return output;
}

function presentationStrings(result) {
  return [
    ...(result.findings ?? []).flatMap((finding) => [
      finding.area,
      finding.title,
      finding.why,
      finding.source,
      ...(finding.fix ?? [])
    ]),
    result.actionPlan?.nextAction,
    ...(result.actionPlan?.ownerSummary ?? []).map((owner) => owner.owner),
    ...(result.actionPlan?.actionItems ?? []).flatMap((item) => [
      item.owner,
      item.title,
      item.impact,
      item.eta,
      item.primaryFix,
      item.source
    ]),
    ...(result.actionPlan?.documentChecklist ?? []).flatMap((doc) => [doc.name, doc.owner]),
    ...(result.actionPlan?.evidencePack ?? []).flatMap((item) => [item.title, item.source])
  ].filter(Boolean).map(String);
}

function assertCleanPresentation(caseName, result) {
  const broken = presentationStrings(result).find((value) => mojibakePattern.test(value));
  if (broken) {
    throw new Error(`${caseName}: review presentation contains mojibake: ${broken}`);
  }
}

function assertCleanReviewSurface(caseName, result) {
  const surface = {
    parsedIngredients: result.parsedIngredients,
    findings: result.findings,
    actionPlan: result.actionPlan
  };
  const broken = collectStrings(surface).find(({ value }) => mojibakePattern.test(value) || /\?{2,}/.test(value));
  if (broken) {
    throw new Error(`${caseName}: review API surface contains mojibake at ${broken.path}: ${broken.value}`);
  }
}

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
  assertCleanPresentation(testCase.name, result);
  assertCleanReviewSurface(testCase.name, result);

  if (result.status !== "fail") {
    throw new Error(`${testCase.name}: expected fail status, got ${result.status}`);
  }

  if (!Array.isArray(result.findings) || result.findings.length < testCase.minimumFindings) {
    throw new Error(`${testCase.name}: expected at least ${testCase.minimumFindings} findings, got ${result.findings?.length ?? 0}`);
  }

  if (!result.findings.some((finding) => String(finding.source).includes("InfoId"))) {
    throw new Error(`${testCase.name}: expected at least one TFDA InfoId source in findings`);
  }

  if (!result.findings.some((finding) => String(finding.evidence ?? "").includes("matched alias:"))) {
    throw new Error(`${testCase.name}: expected matched alias trace in finding evidence`);
  }
}

const mojibakeReviewResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...baseInput,
    productName: "Mojibake Guard Toner",
    ingredientsText: "Water, Glycerin, 銝嚗瑼 Triclosan 0.4%, �bad token, Phenoxyethanol 2%",
    labelText: "Product name: Mojibake Guard Toner. Made in Korea. Claims: repairs acne. 銝嚗瑼"
  })
});

if (!mojibakeReviewResponse.ok) {
  throw new Error(`Mojibake review: Review API returned ${mojibakeReviewResponse.status}`);
}

const mojibakeReviewResult = await mojibakeReviewResponse.json();
assertCleanPresentation("Mojibake review", mojibakeReviewResult);
assertCleanReviewSurface("Mojibake review", mojibakeReviewResult);

if (!mojibakeReviewResult.findings?.some((finding) => finding.id.includes("triclosan") && !mojibakePattern.test(finding.id))) {
  throw new Error("Mojibake review: expected sanitized Triclosan finding id");
}

if (!mojibakeReviewResult.parsedIngredients?.every((ingredient) => !mojibakePattern.test(`${ingredient.raw} ${ingredient.name}`))) {
  throw new Error("Mojibake review: expected sanitized parsed ingredients");
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
assertCleanPresentation("Food review", foodResult);
assertCleanReviewSurface("Food review", foodResult);

if (foodResult.ruleVersion !== "TW-FOOD-2026.06-draft") {
  throw new Error(`Food review: expected TW food rule version, got ${foodResult.ruleVersion}`);
}

if (foodResult.status !== "fail") {
  throw new Error(`Food review: expected fail status for missing allergen warning, got ${foodResult.status}`);
}

if (!foodResult.findings?.some((finding) => finding.id === "food-allergen-peanut" && finding.status === "fail")) {
  throw new Error("Food review: expected peanut allergen failure");
}

for (const findingId of ["food-traceability-records-needed", "food-recall-destruction-plan-needed"]) {
  if (!foodResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Food review: expected post-market readiness finding ${findingId}`);
  }
}

const foodCleanResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Citron Herbal Tea",
    productType: "prepackaged food / tea / 식품",
    ingredientsText: "Citron peel, rooibos, peppermint, dried apple",
    labelText: [
      "品名：柚子草本茶. 內容量：40g. 成分：柚子皮、南非國寶茶、薄荷、乾燥蘋果. 原產地：韓國. 進口商：Taiwan Importer Co. 有效日期：2027-03-01. 營養標示：每份熱量 5 kcal, 蛋白質 0g, 脂肪 0g, 碳水化合物 1g, 糖 0g, 鈉 0mg.",
      "Food traceability ledger: lot TEA2603, raw material supplier, country of origin, receiving date, import inspection application number, inventory quantity, delivery date, recipient and downstream distributor records retained for five years.",
      "Food recall and destruction plan: standing task force, downstream notification list, recall progress report template, recalled product segregation label, final disposal/destruction approval workflow and five-year recall records prepared."
    ].join(" "),
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

for (const findingId of ["food-traceability-records-present", "food-recall-destruction-plan-present"]) {
  if (!foodCleanResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Food clean review: expected ready post-market finding ${findingId}`);
  }
}

for (const checklistId of ["food-traceability-records", "food-recall-destruction-plan"]) {
  if (!foodCleanResult.actionPlan?.documentChecklist?.some((doc) => doc.id === checklistId && doc.status === "ready")) {
    throw new Error(`Food clean review: expected ready checklist item ${checklistId}`);
  }
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

const additivePermitGapFinding = compoundAdditiveMissingResult.findings?.find(
  (finding) => finding.id === "food-additive-inspection-registration-needed"
);
if (additivePermitGapFinding?.sourceUrl !== foodAdditivePermitQueryUrl) {
  throw new Error("Compound additive missing review: expected direct food additive permit query source URL");
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

const additivePermitReadyFinding = compoundAdditiveCompleteResult.findings?.find(
  (finding) => finding.id === "food-additive-inspection-registration-present"
);
if (additivePermitReadyFinding?.sourceUrl !== foodAdditivePermitQueryUrl) {
  throw new Error("Compound additive complete review: expected direct food additive permit query source URL");
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

if (!foodClaimResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "food-claim-substantiation" && doc.status === "review")) {
  throw new Error("Food claim review: expected review claim substantiation checklist item");
}

const foodMedicalClaimResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Healthy Ginseng Jelly",
    productType: "prepackaged food / snack",
    ingredientsText: "Sugar, ginseng extract, gelatin, citric acid",
    labelText: "品名：健康人蔘果凍. 內容量：80g. 成分：糖、人蔘萃取物、明膠、檸檬酸. 原產地：韓國. Cures diabetes and lowers hypertension.",
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodMedicalClaimResponse.ok) {
  throw new Error(`Food medical claim review: Review API returned ${foodMedicalClaimResponse.status}`);
}

const foodMedicalClaimResult = await foodMedicalClaimResponse.json();

if (!foodMedicalClaimResult.findings?.some((finding) => finding.id === "food-medical-efficacy-claim-prohibited" && finding.status === "fail")) {
  throw new Error("Food medical claim review: expected prohibited medical efficacy claim");
}

if (!foodMedicalClaimResult.findings?.some((finding) => finding.id === "food-health-name-misleading-review")) {
  throw new Error("Food medical claim review: expected health name misleading review");
}

if (!foodMedicalClaimResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "food-claim-substantiation" && doc.status === "needed")) {
  throw new Error("Food medical claim review: expected needed claim substantiation checklist item");
}

const foodSweetnessClaimResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Mildly Sweet Yuzu Drink",
    productType: "prepackaged food / beverage",
    ingredientsText: "Water, yuzu juice, erythritol, citric acid, salt",
    labelText: "Product name: Mildly Sweet Yuzu Drink. Net volume: 250ml. Ingredients: water, yuzu juice, erythritol, citric acid, salt. Origin: Korea. Not sweet, slightly sweet, nutrition facts: 45 kcal, sugars 0g, sodium 90mg. EXP 2028-05-01.",
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodSweetnessClaimResponse.ok) {
  throw new Error(`Food sweetness claim review: Review API returned ${foodSweetnessClaimResponse.status}`);
}

const foodSweetnessClaimResult = await foodSweetnessClaimResponse.json();

if (foodSweetnessClaimResult.status === "fail") {
  throw new Error("Food sweetness claim review: expected non-fail status for sweetness claim review");
}

if (!foodSweetnessClaimResult.findings?.some((finding) => finding.id === "food-sweetness-claim-misleading-review")) {
  throw new Error("Food sweetness claim review: expected sweetness claim finding");
}

const foodClaimEvidenceResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Digestive Fiber Drink",
    productType: "prepackaged food / beverage",
    ingredientsText: "Water, inulin, lemon juice, salt",
    labelText: [
      "Product name: Digestive Fiber Drink. Net volume 250ml.",
      "Ingredients: water, inulin, lemon juice, salt. Made in Korea.",
      "Improves digestion and supports immunity.",
      "Claim substantiation file: scientific evidence, nutrition analysis, test report, and COA retained for Taiwan label review."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Foods / Taiwan Importer Co."
  })
});

if (!foodClaimEvidenceResponse.ok) {
  throw new Error(`Food claim evidence review: Review API returned ${foodClaimEvidenceResponse.status}`);
}

const foodClaimEvidenceResult = await foodClaimEvidenceResponse.json();

if (foodClaimEvidenceResult.status === "fail") {
  throw new Error("Food claim evidence review: expected non-fail status for substantiated general food claim");
}

if (!foodClaimEvidenceResult.findings?.some((finding) => finding.id === "food-claim-substantiation-present" && finding.status === "pass")) {
  throw new Error("Food claim evidence review: expected present claim substantiation finding");
}

if (!foodClaimEvidenceResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "food-claim-substantiation" && doc.status === "ready")) {
  throw new Error("Food claim evidence review: expected ready claim substantiation checklist item");
}

const healthFoodResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Probiotic Health Capsule",
    productType: "prepackaged food / health food / supplement",
    ingredientsText: "Lactobacillus plantarum strain, inulin, vitamin C, botanical extract",
    labelText: [
      "Product name: Probiotic Health Capsule. Net weight 60 capsules.",
      "Ingredients: Lactobacillus plantarum strain, inulin, vitamin C, botanical extract.",
      "Made in Korea. EXP 2028-03-01.",
      "Supports immunity and gut health. Helps manage cholesterol and blood sugar.",
      "Nutrition facts pending. Taiwan importer pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Nutrients / Taiwan importer pending",
    hsCode: "2106.90",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1800"
  })
});

if (!healthFoodResponse.ok) {
  throw new Error(`Health food review: Review API returned ${healthFoodResponse.status}`);
}

const healthFoodResult = await healthFoodResponse.json();

for (const findingId of [
  "health-food-permit-needed",
  "health-food-label-items-review",
  "food-ingredient-platform-review"
]) {
  if (!healthFoodResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Health food review: expected ${findingId}`);
  }
}

const foodIngredientPlatformFinding = healthFoodResult.findings?.find(
  (finding) => finding.id === "food-ingredient-platform-review"
);
if (foodIngredientPlatformFinding?.sourceUrl !== foodIngredientDirectQueryUrl) {
  throw new Error("Health food review: expected direct food ingredient query source URL");
}

if (healthFoodResult.status === "fail") {
  throw new Error("Health food review: expected non-fail status for permit and label information gaps");
}

if (!healthFoodResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "health-food-permit" && doc.status === "needed")) {
  throw new Error("Health food review: expected needed health food permit checklist item");
}

const healthFoodCompleteResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Probiotic Health Capsule",
    productType: "prepackaged food / health food / supplement",
    ingredientsText: "Lactobacillus plantarum strain, inulin, vitamin C, botanical extract",
    labelText: [
      "Product name: Probiotic Health Capsule. Net weight 60 capsules.",
      "Ingredients: Lactobacillus plantarum strain, inulin, vitamin C, botanical extract.",
      "Made in Korea. EXP 2028-03-01.",
      "Health food permit number TFDA-HF-123456. Standard health food logo present.",
      "Approved health care effect: supports immunity and gut health.",
      "Recommended intake: one capsule daily. Warning: follow recommended intake and consult a professional if needed.",
      "Scientific evidence, test report, and COA retained for the approved claim scope."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Nutrients / Taiwan Importer Co.",
    hsCode: "2106.90",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1800"
  })
});

if (!healthFoodCompleteResponse.ok) {
  throw new Error(`Health food complete review: Review API returned ${healthFoodCompleteResponse.status}`);
}

const healthFoodCompleteResult = await healthFoodCompleteResponse.json();

if (healthFoodCompleteResult.status === "fail") {
  throw new Error("Health food complete review: expected non-fail status for permitted health food");
}

if (!healthFoodCompleteResult.findings?.some((finding) => finding.id === "health-food-permit-present" && finding.status === "pass")) {
  throw new Error("Health food complete review: expected present health food permit finding");
}

if (healthFoodCompleteResult.findings?.some((finding) => finding.id === "health-food-medical-claim-prohibited" || finding.id === "food-medical-efficacy-claim-prohibited")) {
  throw new Error("Health food complete review: should not trigger medical claim prohibition for approved health care effect wording");
}

if (!healthFoodCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "health-food-permit" && doc.status === "ready")) {
  throw new Error("Health food complete review: expected ready health food permit checklist item");
}

const formulaFoodResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Renal Formula Drink",
    productType: "formula for certain disease / special dietary food",
    ingredientsText: "Maltodextrin, whey protein isolate, vegetable oil, vitamins, minerals",
    labelText: [
      "Product name: Renal Formula Drink.",
      "Net volume 200ml. Made in Korea. EXP 2028-04-01.",
      "For renal nutrition support. Storage instructions pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Medical Nutrition / Taiwan importer pending",
    hsCode: "2106.90",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "2100"
  })
});

if (!formulaFoodResponse.ok) {
  throw new Error(`Formula food review: Review API returned ${formulaFoodResponse.status}`);
}

const formulaFoodResult = await formulaFoodResponse.json();

if (!formulaFoodResult.findings?.some((finding) => finding.id === "formula-certain-disease-label-needed")) {
  throw new Error("Formula food review: expected formula-certain-disease-label-needed");
}

if (formulaFoodResult.status === "fail") {
  throw new Error("Formula food review: expected non-fail status for special dietary label information gaps");
}

if (!formulaFoodResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "formula-certain-disease-label" && doc.status === "needed")) {
  throw new Error("Formula food review: expected needed formula label checklist item");
}

const formulaFoodCompleteResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Renal Formula Drink",
    productType: "formula for certain disease / special dietary food",
    ingredientsText: "Maltodextrin, whey protein isolate, vegetable oil, vitamins, minerals",
    labelText: [
      "Product name: Renal Formula Drink.",
      "Formula for Certain Disease. Net volume 200ml. Made in Korea. EXP 2028-04-01.",
      "For renal nutrition support under healthcare professional guidance.",
      "Warning: not suitable for the general population, use under doctor or registered dietitian advice, not for intravenous use, increasing the dosage will not help."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Medical Nutrition / Taiwan Importer Co.",
    hsCode: "2106.90",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "2100"
  })
});

if (!formulaFoodCompleteResponse.ok) {
  throw new Error(`Formula food complete review: Review API returned ${formulaFoodCompleteResponse.status}`);
}

const formulaFoodCompleteResult = await formulaFoodCompleteResponse.json();

if (formulaFoodCompleteResult.status === "fail") {
  throw new Error("Formula food complete review: expected non-fail status for complete special dietary label");
}

if (!formulaFoodCompleteResult.findings?.some((finding) => finding.id === "formula-certain-disease-label-present" && finding.status === "pass")) {
  throw new Error("Formula food complete review: expected present formula label finding");
}

if (!formulaFoodCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "formula-certain-disease-label" && doc.status === "ready")) {
  throw new Error("Formula food complete review: expected ready formula label checklist item");
}

const foodContactResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "PVC Fresh Food Wrap",
    productType: "food contact packaging / plastic food wrap",
    ingredientsText: "",
    labelText: [
      "Product name: PVC Fresh Food Wrap.",
      "Material: PVC / polyvinyl chloride.",
      "Size: 30cm x 100m. Made in Korea.",
      "For food contact use. Microwave-safe for hot meals.",
      "Taiwan importer pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Packaging / Taiwan importer pending",
    hsCode: "3920.43",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1300"
  })
});

if (!foodContactResponse.ok) {
  throw new Error(`Food contact review: Review API returned ${foodContactResponse.status}`);
}

const foodContactResult = await foodContactResponse.json();

for (const findingId of [
  "food-contact-label-core-present",
  "food-contact-sanitation-evidence-needed",
  "food-contact-plastic-use-status-needed",
  "food-contact-pvc-pvdc-warning-needed"
]) {
  if (!foodContactResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Food contact review: expected ${findingId}`);
  }
}

if (foodContactResult.status !== "fail") {
  throw new Error(`Food contact review: expected fail status for missing PVC/PVDC warning, got ${foodContactResult.status}`);
}

if (!foodContactResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "food-contact-pvc-pvdc-warning" && doc.status === "needed")) {
  throw new Error("Food contact review: expected needed PVC/PVDC warning checklist item");
}

if (!foodContactResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "food-contact-sanitation-evidence" && doc.status === "needed")) {
  throw new Error("Food contact review: expected needed sanitation evidence checklist item");
}

const foodContactFindingIds = new Set((foodContactResult.findings ?? []).map((finding) => finding.id));
for (const ordinaryFoodFindingId of foodContactFindingIds) {
  if (
    ordinaryFoodFindingId.startsWith("food-label-") ||
    ordinaryFoodFindingId.startsWith("food-allergen-") ||
    ordinaryFoodFindingId.startsWith("food-nutrition-claim-") ||
    ordinaryFoodFindingId.startsWith("food-additive-")
  ) {
    throw new Error(`Food contact review: should not include ordinary food finding ${ordinaryFoodFindingId}`);
  }
}

const infantBottleResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Clear Baby Bottle",
    productType: "food contact packaging / plastic infant feeding bottle",
    ingredientsText: "",
    labelText: [
      "Product name: Clear Baby Bottle.",
      "Material: polypropylene plastic.",
      "For food contact use. Reusable. Heat resistance temperature 100C.",
      "Made in Korea. Taiwan importer pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Babyware",
    hsCode: "3924.10",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "800"
  })
});

if (!infantBottleResponse.ok) {
  throw new Error(`Infant bottle review: Review API returned ${infantBottleResponse.status}`);
}

const infantBottleResult = await infantBottleResponse.json();

for (const findingId of ["food-contact-infant-bottle-bpa-free-needed", "food-contact-sanitation-evidence-needed"]) {
  if (!infantBottleResult.findings?.some((finding) => finding.id === findingId)) {
    throw new Error(`Infant bottle review: expected ${findingId}`);
  }
}

if (infantBottleResult.status === "fail") {
  throw new Error("Infant bottle review: expected non-fail status for BPA evidence gap");
}

const childUtensilResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Toddler Training Spoon",
    productType: "food contact utensil / children under three / plastic spoon",
    ingredientsText: "",
    labelText: [
      "Product name: Toddler Training Spoon.",
      "Material: soft plastic.",
      "For food contact use. Reusable. Heat resistance temperature 80C.",
      "DEHP plasticizer added for flexibility.",
      "Made in Korea. Taiwan importer pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Babyware",
    hsCode: "3924.10",
    incoterms: "CIF Keelung",
    shipmentPurpose: "commercial sale",
    invoiceValue: "760"
  })
});

if (!childUtensilResponse.ok) {
  throw new Error(`Child utensil review: Review API returned ${childUtensilResponse.status}`);
}

const childUtensilResult = await childUtensilResponse.json();

if (!childUtensilResult.findings?.some((finding) => finding.id === "food-contact-child-phthalate-risk" && finding.status === "fail")) {
  throw new Error("Child utensil review: expected food-contact-child-phthalate-risk failure");
}

if (childUtensilResult.status !== "fail") {
  throw new Error(`Child utensil review: expected fail status for restricted phthalate risk, got ${childUtensilResult.status}`);
}

const cosmeticPvcBottleResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Glow Repair Serum in PVC Bottle",
    productType: "leave-on cosmetic serum / cosmetic packaging",
    ingredientsText: "Water, Glycerin, Niacinamide",
    labelText: [
      "Product name: Glow Repair Serum.",
      "Cosmetic package: PVC bottle.",
      "Not intended for food contact.",
      "Made in Korea. Taiwan importer pending."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Cosmetics / Taiwan importer pending",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "900"
  })
});

if (!cosmeticPvcBottleResponse.ok) {
  throw new Error(`Cosmetic PVC bottle review: Review API returned ${cosmeticPvcBottleResponse.status}`);
}

const cosmeticPvcBottleResult = await cosmeticPvcBottleResponse.json();

if (cosmeticPvcBottleResult.findings?.some((finding) => finding.id.startsWith("food-contact-"))) {
  throw new Error("Cosmetic PVC bottle review: should not trigger food-contact packaging findings");
}

if (!String(cosmeticPvcBottleResult.ruleVersion ?? "").includes("TW-COS")) {
  throw new Error(`Cosmetic PVC bottle review: expected cosmetics rule version, got ${cosmeticPvcBottleResult.ruleVersion}`);
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
      "Claim substantiation file: hydration efficacy test and dermatologist test report linked to 修護 and 保濕 claims.",
      "化粧品GMP / ISO 22716 certificate for manufacturing site.",
      "Post-market surveillance SOP: adverse event reporting within 15 days, consumer complaint intake, and safety alert monitoring.",
      "Recall SOP and CAPA plan prepared with seller notification, recall quantity log, and completion report template.",
      "Source and flow traceability ledger keeps lot C26TW02, import declaration number, receiver, quantity, delivery date, and five-year retention owner."
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
  "cosmetic-gmp-readiness-present",
  "cosmetic-claim-substantiation-present",
  "cosmetic-adverse-reporting-present",
  "cosmetic-recall-procedure-present",
  "cosmetic-source-flow-records-present"
]) {
  if (!tradeCompleteResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Trade complete review: expected cosmetic pass finding ${findingId}`);
  }
}

if (!tradeCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "cosmetic-pif" && doc.status === "ready")) {
  throw new Error("Trade complete review: expected ready cosmetic PIF checklist item");
}

for (const checklistId of ["cosmetic-adverse-reporting", "cosmetic-recall-procedure", "cosmetic-source-flow-records"]) {
  if (!tradeCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === checklistId && doc.status === "ready")) {
    throw new Error(`Trade complete review: expected ready checklist item ${checklistId}`);
  }
}

if (!tradeCompleteResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "cosmetic-claim-substantiation" && doc.status === "ready")) {
  throw new Error("Trade complete review: expected ready cosmetic claim substantiation checklist item");
}

if (!Array.isArray(tradeCompleteResult.actionPlan?.ownerSummary)) {
  throw new Error("Trade complete review: expected action plan owner summary");
}

const cosmeticNoDocsResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Bare Hydration Serum",
    productType: "leave-on serum / cosmetic",
    ingredientsText: "Water, Glycerin 5%, Panthenol 1%, Phenoxyethanol 0.6%",
    labelText: "Product name: Bare Hydration Serum. Net volume 30ml. Ingredients: Water, Glycerin, Panthenol, Phenoxyethanol. Made in Korea. Batch BH2606. EXP 2029-06-01. Taiwan importer pending.",
    origin: "Korea",
    manufacturer: "Annaanda Beauty Lab",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "920"
  })
});

if (!cosmeticNoDocsResponse.ok) {
  throw new Error(`Cosmetic no-docs review: Review API returned ${cosmeticNoDocsResponse.status}`);
}

const cosmeticNoDocsResult = await cosmeticNoDocsResponse.json();

for (const findingId of [
  "cosmetic-product-notification-needed",
  "cosmetic-pif-readiness-needed",
  "cosmetic-gmp-readiness-needed",
  "cosmetic-adverse-reporting-needed",
  "cosmetic-recall-procedure-needed",
  "cosmetic-source-flow-records-needed"
]) {
  if (!cosmeticNoDocsResult.findings?.some((finding) => finding.id === findingId && finding.status === "needs_info")) {
    throw new Error(`Cosmetic no-docs review: expected needs_info finding ${findingId}`);
  }
}

for (const checklistId of [
  "cosmetic-product-notification",
  "cosmetic-pif",
  "cosmetic-gmp",
  "cosmetic-adverse-reporting",
  "cosmetic-recall-procedure",
  "cosmetic-source-flow-records"
]) {
  if (!cosmeticNoDocsResult.actionPlan?.documentChecklist?.some((doc) => doc.id === checklistId && doc.status === "needed")) {
    throw new Error(`Cosmetic no-docs review: expected needed checklist item ${checklistId}`);
  }
}

const cosmeticPartialDocsResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Cica Balance Lotion",
    productType: "leave-on lotion / cosmetic",
    ingredientsText: "Water, Glycerin 4%, Centella Asiatica Extract, Phenoxyethanol 0.7%",
    labelText: [
      "Product name: Cica Balance Lotion. Net volume 50ml. Ingredients: Water, Glycerin, Centella Asiatica Extract, Phenoxyethanol.",
      "Made in Korea. Taiwan importer: Taiwan Importer Co. Batch CBL2606. EXP 2029-06-01.",
      "Cosmetic product notification registration number TW-COS-2026-01021.",
      "PIF product information file and safety assessment prepared.",
      "GMP / ISO 22716 certificate prepared for the manufacturing site."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Beauty Lab / Taiwan Importer Co.",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "1100"
  })
});

if (!cosmeticPartialDocsResponse.ok) {
  throw new Error(`Cosmetic partial-docs review: Review API returned ${cosmeticPartialDocsResponse.status}`);
}

const cosmeticPartialDocsResult = await cosmeticPartialDocsResponse.json();

for (const findingId of [
  "cosmetic-product-notification-present",
  "cosmetic-pif-readiness-present",
  "cosmetic-gmp-readiness-present"
]) {
  if (!cosmeticPartialDocsResult.findings?.some((finding) => finding.id === findingId && finding.status === "pass")) {
    throw new Error(`Cosmetic partial-docs review: expected pass finding ${findingId}`);
  }
}

for (const findingId of [
  "cosmetic-adverse-reporting-needed",
  "cosmetic-recall-procedure-needed",
  "cosmetic-source-flow-records-needed"
]) {
  if (!cosmeticPartialDocsResult.findings?.some((finding) => finding.id === findingId && finding.status === "needs_info")) {
    throw new Error(`Cosmetic partial-docs review: expected needs_info finding ${findingId}`);
  }
}

for (const [checklistId, status] of [
  ["cosmetic-product-notification", "ready"],
  ["cosmetic-pif", "ready"],
  ["cosmetic-gmp", "ready"],
  ["cosmetic-adverse-reporting", "needed"],
  ["cosmetic-recall-procedure", "needed"],
  ["cosmetic-source-flow-records", "needed"]
]) {
  if (!cosmeticPartialDocsResult.actionPlan?.documentChecklist?.some((doc) => doc.id === checklistId && doc.status === status)) {
    throw new Error(`Cosmetic partial-docs review: expected ${status} checklist item ${checklistId}`);
  }
}

const cosmeticClaimGapResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    productName: "Hydra Calm Ampoule",
    productType: "leave-on serum / general cosmetics",
    ingredientsText: "Water, Glycerin 5%, Niacinamide 2%, Phenoxyethanol 0.5%",
    labelText: [
      "品名：舒緩保濕安瓶. 容量：30ml. 全成分：Water, Glycerin, Niacinamide, Phenoxyethanol.",
      "原產地：韓國. 進口商：Taiwan Importer Co. 批號：HC2606.",
      "Clinically proven 48-hour moisturizing and dermatologist tested for sensitive skin."
    ].join(" "),
    origin: "Korea",
    manufacturer: "Annaanda Beauty Lab / Taiwan Importer Co.",
    hsCode: "3304.99",
    incoterms: "DAP Taipei",
    shipmentPurpose: "commercial sale",
    invoiceValue: "980"
  })
});

if (!cosmeticClaimGapResponse.ok) {
  throw new Error(`Cosmetic claim review: Review API returned ${cosmeticClaimGapResponse.status}`);
}

const cosmeticClaimGapResult = await cosmeticClaimGapResponse.json();

if (!cosmeticClaimGapResult.findings?.some((finding) => finding.id === "cosmetic-claim-substantiation-needed")) {
  throw new Error("Cosmetic claim review: expected claim substantiation finding");
}

if (!cosmeticClaimGapResult.actionPlan?.documentChecklist?.some((doc) => doc.id === "cosmetic-claim-substantiation" && doc.status === "needed")) {
  throw new Error("Cosmetic claim review: expected needed claim substantiation checklist item");
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
  { query: "\uB300\uB9CC INCI \uC131\uBD84\uBA85", expectedTerm: "INCI Ingredient Name" },
  { query: "營養標示", expectedTerm: "Nutrition Labeling" },
  { query: "過敏原標示", expectedTerm: "Food Allergen Labeling" },
  { query: "\uB300\uB9CC \uC54C\uB808\uB974\uAC90 \uD45C\uC2DC", expectedTerm: "Food Allergen Labeling" },
  { query: "PIF", expectedTerm: "Cosmetic Product Information File", expectedFirst: "Cosmetic Product Information File" },
  { query: "\uB300\uB9CC \uD654\uC7A5\uD488 PIF", expectedTerm: "Cosmetic Product Information File" },
  { query: "化妆品备案", expectedTerm: "Cosmetic Product Notification" },
  { query: "輸入化粧品檢驗", expectedTerm: "Imported Cosmetics Inspection" },
  { query: "화장품 금지성분", expectedTerm: "Cosmetic Prohibited Ingredients" },
  { query: "限用成分", expectedTerm: "Cosmetic Restricted Ingredients" },
  { query: "化粧品色素", expectedTerm: "Cosmetic Colorants" },
  { query: "防腐劑", expectedTerm: "Cosmetic Preservatives" },
  { query: "防曬成分", expectedTerm: "Cosmetic Sunscreen Ingredients" },
  { query: "식품 효능표현", expectedTerm: "Food Labeling and Claims" },
  { query: "甜味宣稱", expectedTerm: "Food Labeling and Claims" },
  { query: "식품 의료효능 표시 근거자료", expectedTerm: "Food Labeling and Claims" },
  { query: "微甜 不甜 甜味宣稱", expectedTerm: "Food Labeling and Claims" },
  { query: "免申請查驗", expectedTerm: "Food Import Inspection Exemption" },
  { query: "輸入食品查驗", expectedTerm: "Imported Food Inspection" },
  { query: "수입식품 통관검사", expectedTerm: "Imported Food Inspection" },
  { query: "HS 0307 health certificate", expectedTerm: "Food Import Health Certificate" },
  { query: "HS-0307 위생증명서", expectedTerm: "Food Import Health Certificate" },
  { query: "食品業者登錄", expectedTerm: "Food Business Registration for Importers" },
  { query: "產品資訊表", expectedTerm: "Product Information Sheet" },
  { query: "業務用食品標示", expectedTerm: "Business-use Food Intact Package Labeling" },
  { query: "查驗登記", expectedTerm: "Food Additive Inspection Registration", expectedFirst: "Food Additive Inspection Registration" },
  { query: "식품첨가물 허가 조회 등록번호", expectedTerm: "Food Additive Inspection Registration" },
  { query: "複方食品添加物", expectedTerm: "Compound Food Additive Import Documents", expectedFirst: "Compound Food Additive Import Documents" },
  { query: "官方衛生證明", expectedTerm: "Compound Food Additive Import Documents" },
  { query: "food additive functional class sweetener preservative", expectedTerm: "Food Additive Functional Classes" },
  { query: "甜味劑 防腐劑 乳化劑", expectedTerm: "Food Additive Functional Classes" },
  { query: "sodium glutamate", expectedTerm: "Monosodium Glutamate" },
  { query: "안식향산나트륨", expectedTerm: "Benzoic Acid and Benzoates" },
  { query: "benzoates", expectedTerm: "Benzoic Acid and Benzoates" },
  { query: "flavour enhancers", expectedTerm: "Food Additive Functional Classes" },
  { query: "Health Food", expectedTerm: "Health Food" },
  { query: "health food permit", expectedTerm: "Health Food Permit" },
  { query: "健康食品查驗登記", expectedTerm: "Health Food Permit" },
  { query: "許可證字號", expectedTerm: "Health Food Permit" },
  { query: "小綠人", expectedTerm: "Health Food Standard Logo and Legend" },
  { query: "Formula for Certain Disease", expectedTerm: "Formula for Certain Disease" },
  { query: "Food Ingredient Integration Query Platform", expectedTerm: "Food Ingredient Integration Query Platform" },
  { query: "식품원료 통합조회 사용제한 주의사항", expectedTerm: "Food Ingredient Integration Query Platform" },
  { query: "food contact packaging", expectedTerm: "Food Contact Utensils, Containers and Packaging" },
  { query: "plastic food contact surface reusable disposable", expectedTerm: "Plastic Food Contact Labeling" },
  { query: "PVC high-fat high-temperature food warning", expectedTerm: "PVC/PVDC Food Contact Warning" },
  { query: "plastic infant feeding bottles BPA food utensils containers packages sanitation standard", expectedTerm: "Food Contact Material Sanitation Standards" },
  { query: "食品器具容器包裝衛生標準 雙酚A 鄰苯二甲酸酯", expectedTerm: "Food Contact Material Sanitation Standards" },
  { query: "化粧品GMP", expectedTerm: "Cosmetic Good Manufacturing Practice", expectedFirst: "Cosmetic Good Manufacturing Practice" },
  { query: "化粧品產品資訊檔案", expectedTerm: "Cosmetic Product Information File", expectedFirst: "Cosmetic Product Information File" },
  { query: "化妝品產品登錄", expectedTerm: "Cosmetic Product Notification", expectedFirst: "Cosmetic Product Notification" },
  { query: "邊境查驗", expectedTerm: "Imported Cosmetics Inspection" },
  { query: "抽批檢驗", expectedTerm: "Imported Cosmetics Inspection" },
  { query: "15-day adverse event reporting cosmetics", expectedTerm: "Cosmetic Serious Adverse Effect Reporting" },
  { query: "嚴重不良反應通報", expectedTerm: "Cosmetic Serious Adverse Effect Reporting" },
  { query: "化粧品回收 回收作業計畫書", expectedTerm: "Cosmetic Recall" },
  { query: "回收作業計畫", expectedTerm: "Cosmetic Recall" },
  { query: "source and flow data lot number five-year retention cosmetic", expectedTerm: "Cosmetic Source and Flow Records" },
  { query: "源流資料", expectedTerm: "Cosmetic Source and Flow Records" },
  { query: "化粧品產品登錄", expectedTerm: "Cosmetic Product Notification", expectedFirst: "Cosmetic Product Notification" },
  { query: "화장품 의료효능 표현 허위 과장 광고", expectedTerm: "Cosmetic Claims Criteria" },
  { query: "醫療效能 虛偽誇大 化粧品標示宣傳廣告", expectedTerm: "Cosmetic Claims Criteria" },
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
  { query: "food recall and destruction downstream notification five-year records", expectedTerm: "Food Recall and Destruction" },
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

const ambiguityCases = [
  { query: "casein", expectedTerm: "Casein and Caseinates", expectedOtherTerm: "Milk" },
  { query: "preservative", expectedTerm: "Cosmetic Preservatives", expectedOtherTerm: "Food Additive Functional Classes" }
];

for (const testCase of ambiguityCases) {
  const response = await fetch(`${baseUrl}/api/knowledge/search?q=${encodeURIComponent(testCase.query)}`);

  if (!response.ok) {
    throw new Error(`${testCase.query}: Knowledge API returned ${response.status}`);
  }

  const result = await response.json();
  const term = Array.isArray(result.terms)
    ? result.terms.find((candidate) => candidate.canonicalName === testCase.expectedTerm)
    : null;

  if (!term) {
    throw new Error(`${testCase.query}: expected ambiguous term ${testCase.expectedTerm}`);
  }

  const ambiguity = Array.isArray(term.ambiguousAliases)
    ? term.ambiguousAliases.find((alias) => alias.otherTerms?.includes(testCase.expectedOtherTerm))
    : null;

  if (!ambiguity) {
    throw new Error(`${testCase.query}: expected ambiguity note linking ${testCase.expectedTerm} to ${testCase.expectedOtherTerm}`);
  }

  const summaryTerms = Array.isArray(result.ambiguity?.terms)
    ? result.ambiguity.terms.map((candidate) => candidate.canonicalName)
    : [];

  if (!summaryTerms.includes(testCase.expectedTerm) || !summaryTerms.includes(testCase.expectedOtherTerm)) {
    throw new Error(`${testCase.query}: expected result-level ambiguity summary for ${testCase.expectedTerm} and ${testCase.expectedOtherTerm}`);
  }
}

const sourceCases = [
  { query: "simple asphyxiants", expectedSource: "global-unece-ghs-rev11-pdf" },
  { query: "April 1 2026 tariff", expectedSource: "jp-customs-tariff-schedule" },
  { query: "mofcom export control", expectedSource: "cn-mofcom-export-control-portal" },
  { query: "GC453 CCC CODE", expectedSource: "tw-customs-tariff-database-download" },
  { query: "CCC import export regulation", expectedSource: "tw-trade-ccc-import-export-regulations" },
  {
    query: "CCC import export regulations Taiwan",
    expectedSource: "tw-trade-ccc-import-export-regulations",
    expectedFirstSource: "tw-trade-ccc-import-export-regulations"
  },
  { query: "imported cosmetics inspection", expectedSource: "tw-tfda-imported-cosmetics-inspection" },
  { query: "免申請查驗 通關代碼", expectedSource: "tw-tfda-food-import-inspection-exemptions" },
  { query: "Regulations of Inspection of Imported Foods and Related Products", expectedSource: "tw-tfda-imported-food-inspection-regulations" },
  { query: "TFDA inspections guidance law regulations imported food fees", expectedSource: "tw-tfda-inspections-law-regulations-index" },
  { query: "systematic inspection imported food document review", expectedSource: "tw-tfda-systematic-inspection-imported-food" },
  { query: "shellfish HS 0307 health certificate harvest area", expectedSource: "tw-tfda-shellfish-hs0307-health-certificate" },
  { query: "food business registration import business operators product liability insurance", expectedSource: "tw-tfda-food-business-registration-importers" },
  { query: "compound food additive composition report official health certificate", expectedSource: "tw-tfda-compound-food-additive-import-documents" },
  { query: "food additive inspection registration permit document", expectedSource: "tw-tfda-food-additive-registration-materials" },
  { query: "food additive permit query registration number license number", expectedSource: "tw-tfda-food-additive-permit-query" },
  {
    query: "food additive permit query Taiwan TFDA",
    expectedSource: "tw-tfda-food-additive-permit-query",
    expectedFirstSource: "tw-tfda-food-additive-permit-query"
  },
  { query: "Health Food Governing Act permit number standard logo approved health care effects", expectedSource: "tw-moj-health-food-governing-act" },
  { query: "Enforcement Rules of Health Food Control Act Article 13 labeling", expectedSource: "tw-tfda-health-food-enforcement-rules" },
  { query: "Formula for Certain Disease warning doctor dietitian principal display panel", expectedSource: "tw-tfda-formula-for-certain-disease-labeling-2025" },
  { query: "Food Ingredient Integration Query Platform usage limits cautionary notes", expectedSource: "tw-tfda-food-ingredient-integration-query-platform" },
  { query: "Food Ingredient Integration Query Platform direct query scientific name", expectedSource: "tw-tfda-food-ingredient-query-platform-direct" },
  { query: "Labelling requirements prepackaged food ingredients of GMOs", expectedSource: "tw-tfda-gmo-prepackaged-food-labeling" },
  { query: "prepackaged milk flavored milk milk drink milk powder product names labeling", expectedSource: "tw-tfda-milk-product-name-labeling" },
  { query: "pesticide residue limits in animal products dairy meat", expectedSource: "tw-tfda-animal-product-pesticide-residue-limits" },
  { query: "TFDA Food Business Information Query Links ingredient permit query", expectedSource: "tw-tfda-food-business-info-query-links" },
  { query: "Regulations on the Labeling of Food Utensils Food Containers or Packaging for food contact use", expectedSource: "tw-tfda-food-contact-packaging-labeling-regulations" },
  { query: "Food utensils containers packaging plastics Article 26 required labelled", expectedSource: "tw-tfda-food-contact-packaging-required-items" },
  { query: "Sanitation Standards for Food Utensils Containers and Packages plastic infant feeding bottles BPA", expectedSource: "tw-moj-food-contact-sanitation-standards" },
  { query: "food containers heat resistance microwave safe material use properly", expectedSource: "tw-tfda-food-container-smart-use-2026" },
  { query: "cosmetic product registration platform fadenbook", expectedSource: "tw-tfda-cosmetic-product-registration-zone" },
  { query: "TFDA cosmetics guidance law regulations microorganism limits GMP", expectedSource: "tw-tfda-cosmetics-law-regulations-index" },
  { query: "Cosmetics Good Manufacturing Practice Regulations quality system site evidence", expectedSource: "tw-tfda-cosmetics-gmp-regulations" },
  { query: "Establishment Standards for Cosmetics Manufactory manufacturing site", expectedSource: "tw-tfda-cosmetics-manufactory-standards" },
  { query: "cosmetic GMP product information file latest announcement", expectedSource: "tw-tfda-cosmetic-announcements" },
  {
    query: "TFDA cosmetic adverse event quality management platform",
    expectedSource: "tw-tfda-cosmetic-adverse-event-qms-platform",
    expectedFirstSource: "tw-tfda-cosmetic-adverse-event-qms-platform"
  },
  { query: "cosmetics post-market surveillance quality monitoring adverse event reporting system", expectedSource: "tw-tfda-cosmetics-management-framework" },
  { query: "cosmetic serious adverse effects hygiene safety hazards report within 15 days", expectedSource: "tw-moj-cosmetic-serious-adverse-reporting" },
  { query: "cosmetics recall class 1 class 2 class 3 seller notification recall proposal", expectedSource: "tw-moj-cosmetics-recall-regulations" },
  { query: "cosmetic source and flow data lot import declaration five-year retention", expectedSource: "tw-moj-cosmetic-source-flow-data" },
  { query: "Regulations Governing Criteria Label Promotion Advertisement Deception Exaggeration Medical efficacy Cosmetic Products", expectedSource: "tw-moj-cosmetic-claims-criteria" },
  { query: "Mercury CAS 7439 prohibited cosmetic ingredient", expectedSource: "tw-tfda-cosmetic-prohibited-ingredients" },
  { query: "化粧品成分使用限制 限量標準", expectedSource: "tw-tfda-cosmetic-restricted-ingredients" },
  { query: "CI 77891 colorant usage restriction", expectedSource: "tw-tfda-cosmetic-colorants" },
  { query: "Phenoxyethanol preservative limit caution", expectedSource: "tw-tfda-cosmetic-preservatives" },
  { query: "防曬係數 PIF 功能性佐證資料", expectedSource: "tw-tfda-cosmetic-sunscreen-ingredients" },
  { query: "false exaggerated misleading medical efficacy food advertisement", expectedSource: "tw-tfda-food-false-exaggerated-medical-efficacy-claims" },
  { query: "Slightly Sweet Not Sweet prepackaged food", expectedSource: "tw-tfda-sweetness-claim-prepackaged-food" },
  { query: "tariff query information", expectedSource: "tw-customs-tariff-system" },
  { query: "pesticide residue limits crop classification", expectedSource: "tw-moj-food-pesticide-residue-limits" },
  { query: "veterinary drug residue limits imported products", expectedSource: "tw-moj-food-veterinary-drug-residue-limits" },
  { query: "contaminants and toxins mycotoxins metals foods", expectedSource: "tw-moj-food-contaminants-toxins" },
  { query: "microorganisms in foods sanitation standard pathogens", expectedSource: "tw-tfda-food-microorganisms-standard" },
  { query: "food traceability source track flow records", expectedSource: "tw-tfda-food-traceability" },
  { query: "Regulations of recall and destruction for food related products progress reports", expectedSource: "tw-moj-food-recall-destruction" },
  { query: "good hygiene practice food manufacturing storage transportation", expectedSource: "tw-tfda-food-ghp-regulations" },
  { query: "Foreign Trade Act exporter importer registration", expectedSource: "tw-moj-foreign-trade-act" },
  { query: "Regulations Governing Import of Commodities import permit negative list", expectedSource: "tw-moj-import-commodities-regulations" },
  { query: "Regulations Governing Export of Commodities origin marking export permit", expectedSource: "tw-moj-export-commodities-regulations" },
  { query: "Registration of Exporters and Importers English name availability", expectedSource: "tw-moj-exporter-importer-registration" },
  { query: "commodity classification import export regulation guide negative list SHTC", expectedSource: "tw-trade-commodity-classification-guide" },
  { query: "Customs Act import declaration invoice packing list single window", expectedSource: "tw-moj-customs-act" },
  { query: "Strategic High-tech Commodities International Import Certificate end user", expectedSource: "tw-moj-shtc-export-import-regulations" },
  { query: "戰略性高科技貨品 國際進口證明書 最終用途", expectedSource: "tw-trade-shtc-bilingual-glossary" },
  { query: "進口報單", expectedSource: "tw-moj-customs-act" },
  { query: "import cargo clearance 15-day declaration invoice packing list single window", expectedSource: "tw-customs-import-cargo-clearance" },
  { query: "customs valuation transaction value duty-paid value royalties assists", expectedSource: "tw-customs-valuation" },
  { query: "SHTC export permit", expectedSource: "tw-moj-shtc-export-import-regulations" },
  { query: "國際進口證明書", expectedSource: "tw-moj-shtc-export-import-regulations" }
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

  if (testCase.expectedFirstSource && result.sources?.[0]?.id !== testCase.expectedFirstSource) {
    throw new Error(`${testCase.query}: expected first source ${testCase.expectedFirstSource}, got ${result.sources?.[0]?.id ?? "none"}`);
  }
}

const evidenceCases = [
  { query: "進口報單", expectedTerm: "Customs Declaration", expectedSource: "tw-moj-customs-act" },
  { query: "SHTC export permit", expectedTerm: "SHTC Export Permit", expectedSource: "tw-moj-shtc-export-import-regulations" },
  { query: "國際進口證明書", expectedTerm: "International Import Certificate", expectedSource: "tw-moj-shtc-export-import-regulations" }
];

for (const testCase of evidenceCases) {
  const response = await fetch(`${baseUrl}/api/knowledge/evidence?q=${encodeURIComponent(testCase.query)}`);

  if (!response.ok) {
    throw new Error(`${testCase.query}: Knowledge evidence API returned ${response.status}`);
  }

  const result = await response.json();
  const matchedTerm = Array.isArray(result.terms)
    ? result.terms.some((term) => term.canonicalName === testCase.expectedTerm)
    : false;
  const matchedSource = Array.isArray(result.sources)
    ? result.sources.some((source) => source.id === testCase.expectedSource)
    : false;

  if (!matchedTerm) {
    throw new Error(`${testCase.query}: expected evidence term ${testCase.expectedTerm}`);
  }

  if (!matchedSource) {
    throw new Error(`${testCase.query}: expected evidence source ${testCase.expectedSource}`);
  }

  if (!result.summary || !Array.isArray(result.suggestedActions)) {
    throw new Error(`${testCase.query}: expected evidence summary and suggested actions`);
  }
}

const archiveDbUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const publicReviewArchiveEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE === "1";
const publicReviewArchiveReadEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ === "1";
const publicReviewArchiveWriteEnabled = process.env.LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE === "1";
const archiveToken = process.env.LABELPASS_REVIEW_ARCHIVE_TOKEN;
const archiveHeaders = archiveToken ? { authorization: `Bearer ${archiveToken}` } : {};
const expectedArchiveReadStorage =
  process.env.LABELPASS_EXPECT_ARCHIVE_READ_STORAGE ??
  process.env.LABELPASS_EXPECT_ARCHIVE_STORAGE ??
  (archiveDbUrl && publicReviewArchiveEnabled && (publicReviewArchiveReadEnabled || archiveToken) ? "database" : "disabled");
const expectedArchiveWriteStorage =
  process.env.LABELPASS_EXPECT_ARCHIVE_WRITE_STORAGE ??
  process.env.LABELPASS_EXPECT_ARCHIVE_STORAGE ??
  (archiveDbUrl && publicReviewArchiveEnabled && (publicReviewArchiveWriteEnabled || archiveToken) ? "database" : "disabled");
const validArchiveStates = new Set(["database", "disabled", "unavailable"]);

const archiveListResponse = await fetch(`${baseUrl}/api/reviews`, { headers: archiveHeaders });

if (!archiveListResponse.ok) {
  throw new Error(`Review archive list: API returned ${archiveListResponse.status}`);
}

const archiveList = await archiveListResponse.json();

if (!validArchiveStates.has(expectedArchiveReadStorage)) {
  throw new Error(
    `Review archive: LABELPASS_EXPECT_ARCHIVE_READ_STORAGE must be database, disabled, or unavailable. Got ${expectedArchiveReadStorage}`
  );
}

if (!validArchiveStates.has(expectedArchiveWriteStorage)) {
  throw new Error(
    `Review archive: LABELPASS_EXPECT_ARCHIVE_WRITE_STORAGE must be database, disabled, or unavailable. Got ${expectedArchiveWriteStorage}`
  );
}

if (!validArchiveStates.has(archiveList.storage) || !Array.isArray(archiveList.reviews)) {
  throw new Error("Review archive list: expected storage state and reviews array");
}

if (archiveList.storage !== expectedArchiveReadStorage) {
  throw new Error(`Review archive list: expected ${expectedArchiveReadStorage}, got ${archiveList.storage}`);
}

const archiveSmokeId = `smoke-${Date.now()}`;
const archiveSaveResponse = await fetch(`${baseUrl}/api/reviews?dryRun=1`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...archiveHeaders },
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

if (archiveSave.storage !== expectedArchiveWriteStorage) {
  throw new Error(`Review archive save: expected ${expectedArchiveWriteStorage}, got ${archiveSave.storage}`);
}

if (archiveSave.storage === "database" && archiveSave.reviewId !== archiveSmokeId) {
  throw new Error("Review archive save: database response did not preserve app review id");
}

console.log(
  `API smoke test passed: ${cases.length + 25} review cases, ${knowledgeCases.length} knowledge cases, ${ambiguityCases.length} ambiguity cases, ${sourceCases.length} source cases, ${evidenceCases.length} evidence cases, 2 archive cases (read ${expectedArchiveReadStorage}, write ${expectedArchiveWriteStorage}).`
);
