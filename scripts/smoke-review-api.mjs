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

console.log(`API smoke test passed: ${cases.length} review cases, ${knowledgeCases.length} knowledge cases.`);
