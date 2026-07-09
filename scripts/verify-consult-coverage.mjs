// Coverage regression for the AI consult chat: a battery of COMMON, real Korean-exporter questions
// that must resolve to curated-KB context (citations), so the chat answers from grounded knowledge
// rather than falling through to the AI-inference / "not confirmed" tail. This tests RETRIEVAL only
// (deterministic, no OpenAI key needed): a known ingredient returns citations even with the LLM off
// (source "retrieval-only"). If coverage drops, CI fails here instead of users hitting dead-ends.
//
// Requires a running server (LABELPASS_BASE_URL, default http://127.0.0.1:3000), same as smoke:api.

const baseUrl = process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000";

// Common ingredients / regulated topics / natural-language questions a real exporter asks. Every one
// of these must be covered by the curated KB. (Made-up ingredients are intentionally NOT here — those
// SHOULD fall through; this battery guards the things we claim to know.)
const MUST_COVER = [
  "글리세린 화장품에 써도 돼?",
  "나이아신아마이드 대만 규제",
  "페녹시에탄올 한도",
  "티타늄디옥사이드 자외선차단",
  "레티놀 화장품 괜찮아?",
  "살리실산 화장품",
  "파라벤 대만",
  "벤조페논 자외선",
  "아스파탐 표시",
  "안식향산 보존료",
  "소르빈산 한도",
  "이산화황 건조과일",
  "카페인 음료 표시",
  "스테비아 감미료",
  "레시틴",
  "홍국 건강식품",
  "콜라겐 효능표방",
  "하이드로퀴논 미백",
  "무기비소 쌀",
  "잔류농약 차",
  "에틸렌옥사이드 라면",
  "붕사 어묵",
  "PVC 식품포장",
  "영유아식 관세",
  "수단레드 고춧가루",
  "알레르겐 표시",
  "중문 라벨 필수",
  "3-MCPD 간장",
  "히스타민 생선",
  "화장품 미백 표현 써도 돼?"
];

async function coverageFor(question) {
  const response = await fetch(`${baseUrl}/api/consult`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for "${question}"`);
  const data = await response.json();
  // Grounded ⇔ retrieval found ≥1 curated citation. LLM on → "kb-grounded"; LLM off → "retrieval-only".
  const covered = Array.isArray(data.citations) && data.citations.length >= 1 && (data.source === "kb-grounded" || data.source === "retrieval-only");
  return { covered, source: data.source, cites: (data.citations ?? []).length };
}

const misses = [];
for (const q of MUST_COVER) {
  try {
    const { covered, source, cites } = await coverageFor(q);
    if (!covered) misses.push(`${q}  [source=${source}, cites=${cites}]`);
  } catch (e) {
    misses.push(`${q}  [error: ${e.message}]`);
  }
}

const covered = MUST_COVER.length - misses.length;
if (misses.length) {
  console.error(`Consult coverage FAILED: ${covered}/${MUST_COVER.length} common queries grounded. Uncovered:`);
  for (const m of misses) console.error("  ✗ " + m);
  process.exit(1);
}
console.log(`Consult coverage passed: ${covered}/${MUST_COVER.length} common queries resolve to curated-KB citations.`);
