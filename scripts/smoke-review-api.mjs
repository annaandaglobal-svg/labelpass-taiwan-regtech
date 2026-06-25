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

const knowledgeCases = [
  { query: "살리실산", expectedTerm: "Salicylic Acid" },
  { query: "水楊酸", expectedTerm: "Salicylic Acid" },
  { query: "IPBC", expectedTerm: "Iodopropynyl Butylcarbamate" }
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

console.log(`API smoke test passed: ${cases.length + 1} review cases, ${knowledgeCases.length} knowledge cases.`);
