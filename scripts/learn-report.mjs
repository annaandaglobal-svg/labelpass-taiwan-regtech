// Learning-queue report: what the consult chat couldn't answer, ranked by frequency — the worklist
// for the next verified research pass. Usage: pnpm learn:report
import { readFile } from "node:fs/promises";

const QUEUE = "data/knowledge/learning-queue.json";

let queue;
try {
  queue = JSON.parse(await readFile(QUEUE, "utf8"));
} catch {
  console.log("No learning queue yet (data/knowledge/learning-queue.json missing or empty).");
  process.exit(0);
}

const topics = Array.isArray(queue.topics) ? queue.topics : [];
if (!topics.length) {
  console.log("Learning queue is empty — no uncovered consult topics captured yet.");
  process.exit(0);
}

const byStatus = (s) => topics.filter((t) => t.status === s).sort((a, b) => b.count - a.count);
const pending = byStatus("pending");

console.log(`Learning queue (updated ${queue.updatedAt ?? "n/a"}) — ${topics.length} topic(s):`);
for (const status of ["pending", "researched", "ingested", "not-applicable"]) {
  const rows = byStatus(status);
  if (!rows.length) continue;
  console.log(`\n[${status}] ${rows.length}`);
  for (const t of rows) console.log(`  ${String(t.count).padStart(3)}×  ${t.query}   (first ${String(t.firstSeen).slice(0, 10)})`);
}
if (pending.length) {
  console.log(`\n▶ Next verified research pass: ${pending.slice(0, 10).map((t) => t.query).join(", ")}`);
}
