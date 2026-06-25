const baseUrl = process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000";

const baseInput = {
  productName: "Glow Repair Toner",
  productType: "leave-on toner / general cosmetics",
  labelText: "Made in Korea. Instantly treats eczema and removes acne permanently.",
  origin: "Korea",
  manufacturer: "Annaanda Lab",
  invoiceValue: "1200"
};

const cases = [
  {
    name: "English restricted ingredients",
    ingredientsText: "Water, Glycerin, Triclosan 0.4%, Methylisothiazolinone 0.002%, Mercury",
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
  { query: "奇異果", expectedTerm: "Kiwifruit" }
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
}

console.log(`API smoke test passed: ${cases.length + 3} review cases, ${knowledgeCases.length} knowledge cases.`);
