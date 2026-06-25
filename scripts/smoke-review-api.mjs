const baseUrl = process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000";

const input = {
  productName: "Glow Repair Toner",
  productType: "leave-on toner / general cosmetics",
  ingredientsText: "Water, Glycerin, Triclosan 0.4%, Methylisothiazolinone 0.002%, Mercury",
  labelText: "Made in Korea. Instantly treats eczema and removes acne permanently.",
  origin: "Korea",
  manufacturer: "Annaanda Lab",
  invoiceValue: "1200"
};

const response = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input)
});

if (!response.ok) {
  throw new Error(`Review API returned ${response.status}`);
}

const result = await response.json();

if (result.status !== "fail") {
  throw new Error(`Expected fail status, got ${result.status}`);
}

if (!Array.isArray(result.findings) || result.findings.length < 3) {
  throw new Error(`Expected at least 3 findings, got ${result.findings?.length ?? 0}`);
}

if (!result.findings.some((finding) => String(finding.source).includes("InfoId"))) {
  throw new Error("Expected at least one TFDA InfoId source in findings");
}

console.log(`Review API smoke test passed: ${result.findings.length} findings, status ${result.status}.`);
