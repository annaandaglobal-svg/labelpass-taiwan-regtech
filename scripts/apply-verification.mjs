// Stamp confidence/provenance onto terms from data/knowledge/verification-log.json.
// - Terms listed in the log → confidence:"verified" + verifiedAt + verifiedSources (primary URLs).
// - Terms whose notes still signal uncertainty → confidence:"inferred" (next verification target).
// - Everything else (legacy bulk) is left unstamped.
// Run after adding a verification-log batch: pnpm apply:verification
import { readFileSync, writeFileSync } from "node:fs";

const REG = "data/knowledge/term-registry.json";
const LOG = "data/knowledge/verification-log.json";
const reg = JSON.parse(readFileSync(REG, "utf8"));
const log = JSON.parse(readFileSync(LOG, "utf8"));
const byId = new Map(reg.terms.map((t) => [t.id, t]));

// Field is `verification` (NOT `confidence` — that name is already an alias-match numeric score).
let verified = 0, missing = [];
for (const t of reg.terms) if (typeof t.confidence === "string") delete t.confidence; // clean any earlier stray
for (const entry of log.entries || []) {
  for (const id of entry.terms || []) {
    const t = byId.get(id);
    if (!t) { missing.push(id); continue; }
    t.verification = "verified";
    t.verifiedAt = entry.verifiedAt;
    t.verifiedSources = entry.sources;
    verified++;
  }
}

// Mark still-uncertain terms as inferred (unless already verified).
const uncertain = /확인 필요|확인 권장|UNVERIFIED|추정|미확인|미등재|신소재|非傳統|약품\/신소재|확인이 필요/;
let inferred = 0;
for (const t of reg.terms) {
  if (t.verification === "verified") continue;
  if (typeof t.notes === "string" && uncertain.test(t.notes)) { t.verification = "inferred"; inferred++; }
}

writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n", "utf8");
console.log(`Applied: ${verified} verified (from log), ${inferred} inferred.`);
if (missing.length) console.error(`WARNING — log references ${missing.length} unknown term id(s): ${missing.join(", ")}`);
