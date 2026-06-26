import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");

const paths = {
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  termRegistry: path.join(root, "data", "knowledge", "term-registry.json")
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}%.+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/[\s.-]+/g, "");
}

function hasAlphanumeric(value) {
  return /[\p{Letter}\p{Number}]/u.test(String(value ?? ""));
}

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function isHighConfidence(confidence) {
  return Number(confidence ?? 0) >= 0.9;
}

function rowHasNotes(row) {
  return hasText(row?.notes) || hasText(row?.termNotes);
}

function isShortAmbiguousRow(row) {
  const value = String(row?.aliasValue ?? "").trim();
  const normalized = compactText(value);
  if (!normalized) return false;
  if (/^\d{2,7}-\d{2}-\d$/.test(value)) return false;
  if (rowHasNotes(row)) return false;

  const type = String(row?.aliasType ?? "").toLowerCase();
  const ambiguousTypes = new Set(["abbreviation", "alias", "common_name", "trade_name", "marketing_name", "short_name"]);
  const shortUppercase = value === value.toUpperCase() && /[a-z]/i.test(value);

  return (
    ambiguousTypes.has(type) &&
    normalized.length <= 5 &&
    (normalized.length <= 3 || shortUppercase || Number(row?.confidence ?? 0) >= 0.8)
  );
}

function sortBySeverity(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.maxConfidence !== b.maxConfidence) return b.maxConfidence - a.maxConfidence;
  if (a.termCount !== b.termCount) return b.termCount - a.termCount;
  return a.alias.localeCompare(b.alias);
}

function formatTermList(terms) {
  const names = terms.map((term) => term.canonical_name || term.id).filter(Boolean);
  const visible = names.slice(0, 3);
  const remainder = names.length - visible.length;
  return remainder > 0 ? `${visible.join(" / ")} +${remainder} more` : visible.join(" / ");
}

function formatConfidence(confidence) {
  const value = Number(confidence ?? 0);
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const termIndex = await readJson(paths.termIndex);
const termRegistry = await readJson(paths.termRegistry);

const registryVersion = termRegistry.version ?? "unknown";
const scannedTerms = Array.isArray(termIndex.terms) ? termIndex.terms : [];

const aliasRows = [];

for (const term of scannedTerms) {
  const aliases = Array.isArray(term.aliases) ? term.aliases : [];
  const seenInTerm = new Map();

  for (const alias of aliases) {
    const value = String(alias?.value ?? "").trim();
    if (!value) continue;

    const normalized = String(alias?.normalized ?? normalizeText(value)).trim();
    if (!normalized) continue;
    if (!hasAlphanumeric(normalized)) continue;

    const key = normalized;
    const current = seenInTerm.get(key);
    const confidence = Number(alias?.confidence ?? 0);
    const note = String(alias?.note ?? "").trim();

    if (!current) {
      seenInTerm.set(key, {
        termId: term.id,
        canonicalName: term.canonical_name ?? term.id,
        aliasValue: value,
        aliasNormalized: normalized,
        aliasType: String(alias?.type ?? "alias"),
        confidence,
        notes: note,
        termNotes: String(term?.notes ?? "").trim()
      });
      continue;
    }

    if (confidence > current.confidence) {
      current.aliasValue = value;
      current.aliasType = String(alias?.type ?? current.aliasType);
      current.confidence = confidence;
    }

    if (!hasText(current.notes) && hasText(note)) {
      current.notes = note;
    }
  }

  aliasRows.push(...seenInTerm.values());
}

const aliasGroups = new Map();
for (const row of aliasRows) {
  const group = aliasGroups.get(row.aliasNormalized);
  if (group) {
    group.rows.push(row);
  } else {
    aliasGroups.set(row.aliasNormalized, { alias: row.aliasNormalized, rows: [row] });
  }
}

const collisionGroups = [];
const shortAmbiguousFindings = [];

for (const group of aliasGroups.values()) {
  const rowsByTerm = new Map();
  for (const row of group.rows) {
    const existing = rowsByTerm.get(row.termId);
    if (!existing || row.confidence > existing.confidence) {
      rowsByTerm.set(row.termId, row);
    }
  }

  const rows = [...rowsByTerm.values()];
  const uniqueTerms = new Map(rows.map((row) => [row.termId, { id: row.termId, canonical_name: row.canonicalName }]));
  const termCount = uniqueTerms.size;

  if (termCount > 1) {
    const highConfidenceRows = rows.filter((row) => isHighConfidence(row.confidence));
    const notedHighConfidenceRows = highConfidenceRows.filter((row) => hasText(row.notes) || hasText(row.termNotes));
    const unnotedHighConfidenceRows = highConfidenceRows.filter((row) => !hasText(row.notes) && !hasText(row.termNotes));
    const maxConfidence = rows.reduce((max, row) => Math.max(max, Number(row.confidence ?? 0)), 0);
    const highConfidenceCollision = highConfidenceRows.length >= 2;
    const strictBlocker = highConfidenceCollision && unnotedHighConfidenceRows.length >= 2;

    collisionGroups.push({
      alias: group.alias,
      termCount,
      maxConfidence,
      priority: strictBlocker ? 0 : highConfidenceCollision ? 1 : 2,
      strictBlocker,
      highConfidenceCollision,
      unnotedHighConfidenceRows,
      notedHighConfidenceRows,
      terms: rows.map((row) => ({
        id: row.termId,
        canonical_name: row.canonicalName,
        confidence: row.confidence,
        aliasValue: row.aliasValue,
        aliasType: row.aliasType,
        notes: row.notes || row.termNotes || ""
      }))
    });
    continue;
  }

  const row = rows[0];
  if (row && isShortAmbiguousRow(row)) {
    shortAmbiguousFindings.push({
      alias: row.aliasNormalized,
      termCount: 1,
      maxConfidence: Number(row.confidence ?? 0),
      priority: 3,
      strictBlocker: false,
      highConfidenceCollision: false,
      unnotedHighConfidenceRows: [],
      notedHighConfidenceRows: [],
      terms: [
        {
          id: row.termId,
          canonical_name: row.canonicalName,
          confidence: row.confidence,
          aliasValue: row.aliasValue,
          aliasType: row.aliasType,
          notes: row.termNotes || ""
        }
      ]
    });
  }
}

collisionGroups.sort(sortBySeverity);
shortAmbiguousFindings.sort(sortBySeverity);

const strictBlockers = collisionGroups.filter((group) => group.strictBlocker);
const highConfidenceCollisions = collisionGroups.filter((group) => group.highConfidenceCollision);
const findings = [...collisionGroups, ...shortAmbiguousFindings].sort(sortBySeverity);

const summary = {
  generated_at: new Date().toISOString(),
  registry_version: registryVersion,
  terms_scanned: scannedTerms.length,
  aliases_scanned: aliasRows.length,
  collision_groups: collisionGroups.length,
  high_confidence_collisions: highConfidenceCollisions.length,
  short_ambiguous_aliases_without_notes: shortAmbiguousFindings.length,
  strict_blockers: strictBlockers.length
};

console.log("Alias audit summary");
console.log(`- Registry version: ${summary.registry_version}`);
console.log(`- Terms scanned: ${summary.terms_scanned}`);
console.log(`- Aliases scanned: ${summary.aliases_scanned}`);
console.log(`- Collision groups: ${summary.collision_groups}`);
console.log(`- High-confidence collisions: ${summary.high_confidence_collisions}`);
console.log(`- Short or ambiguous aliases without notes: ${summary.short_ambiguous_aliases_without_notes}`);
console.log(`- Strict blockers: ${summary.strict_blockers}`);

if (findings.length > 0) {
  console.log("");
  console.log("Top findings");

  for (const finding of findings.slice(0, 20)) {
    const statusBits = [];
    if (finding.strictBlocker) statusBits.push("strict");
    if (finding.highConfidenceCollision) statusBits.push("high-confidence");
    if (finding.termCount > 1) statusBits.push("collision");
    if (!finding.highConfidenceCollision && finding.termCount === 1) statusBits.push("short/ambiguous");

    const terms = formatTermList(finding.terms);
    const aliasValues = finding.terms.map((term) => term.aliasValue).filter(Boolean);
    const notes = finding.terms.map((term) => term.notes).filter(Boolean);
    const line = [
      finding.alias,
      `terms=${terms}`,
      `confidence=${formatConfidence(finding.maxConfidence)}`,
      `status=${statusBits.join(", ") || "review"}`,
      notes.length > 0 ? `notes=${notes[0]}` : "notes=missing"
    ];

    if (aliasValues.length > 0) {
      line.push(`examples=${aliasValues.slice(0, 3).join(" / ")}`);
    }

    console.log(`- ${line.join(" | ")}`);
  }
}

if (strict && strictBlockers.length > 0) {
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
