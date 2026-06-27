import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const writeQueue = process.argv.includes("--write-queue");

const paths = {
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  termRegistry: path.join(root, "data", "knowledge", "term-registry.json"),
  aliasReviewQueue: path.join(root, "data", "knowledge", "alias-review-queue.json")
};

function compareStable(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

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

const LOCAL_LANGUAGES = new Set(["zh", "zh-Hant", "zh-Hans", "ko", "ja"]);
const SHORT_NOTE_TYPES = new Set(["abbreviation", "symbol", "formula", "short_name", "permit_prefix"]);
const MOJIBAKE_PATTERN = /�|\?{2,}|(?:銝|嚗|瑼|撟|靽|甈|賳|窶|鴞|貐|諡|麮|穈|篣|謔)/u;

function rowHasNotes(row) {
  return hasText(row?.notes) || hasText(row?.termNotes);
}

function isMojibakeValue(value) {
  return MOJIBAKE_PATTERN.test(String(value ?? ""));
}

function isLocalAlias(alias) {
  return LOCAL_LANGUAGES.has(String(alias?.language ?? ""));
}

function isRelevantTaiwanTerm(term) {
  const category = String(term?.category ?? "");
  const sourceKeys = Array.isArray(term?.source_keys) ? term.source_keys : [];
  const aliases = Array.isArray(term?.aliases) ? term.aliases : [];

  return (
    sourceKeys.some((sourceKey) => String(sourceKey).startsWith("tw-")) ||
    aliases.some((alias) => String(alias?.jurisdiction ?? "") === "TW") ||
    /^(cosmetic|food|health|trade|customs|import|export)/.test(category)
  );
}

function hasReadableLocalAlias(term) {
  const aliases = Array.isArray(term?.aliases) ? term.aliases : [];
  return aliases.some((alias) => {
    const value = String(alias?.value ?? "").trim();
    return isLocalAlias(alias) && hasAlphanumeric(normalizeText(value)) && !isMojibakeValue(value);
  });
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
  return compareStable(a.alias, b.alias);
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

function hashId(parts) {
  return createHash("sha256").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 14);
}

function priorityLabel(priority) {
  if (priority <= 0) return "blocker";
  if (priority === 1) return "high";
  if (priority === 2) return "medium";
  if (priority === 3) return "low";
  return "backlog";
}

function issueForFinding(finding) {
  if (finding.issue) return finding.issue;
  if (finding.termCount > 1) return finding.highConfidenceCollision ? "alias-collision-high-confidence" : "alias-collision";
  return "alias-review";
}

function recommendedAction(finding) {
  const issue = issueForFinding(finding);
  if (finding.strictBlocker) {
    return "Resolve before promotion: split the alias, lower confidence, or add source-backed disambiguating notes for every affected term.";
  }
  if (issue === "alias-collision-high-confidence" || issue === "alias-collision") {
    return "Keep the alias searchable, but add source-backed context notes so search can ask for product category, jurisdiction, or intended use before ranking.";
  }
  if (issue === "mojibake") {
    return "Recrawl, manually capture, or replace the damaged alias with a readable source-backed value before using it in search.";
  }
  if (issue === "short-alias-note" || issue === "short-ambiguous-alias") {
    return "Add a short note explaining the regulatory context and keep matching exact or context-gated.";
  }
  if (issue === "missing-local-alias") {
    return "Add Traditional Chinese, Korean, Japanese, or local official aliases from a trusted source, or mark the term as intentionally global.";
  }
  return "Review alias provenance, confidence, and notes before promoting it into automated matching.";
}

function queueTerm(term) {
  return {
    term_id: term.id,
    canonical_name: term.canonical_name,
    confidence: Number(term.confidence ?? 0),
    alias_value: term.aliasValue,
    alias_type: term.aliasType,
    language: term.language || "und",
    jurisdiction: term.jurisdiction || "GLOBAL",
    notes: term.notes || ""
  };
}

function queueItemForFinding(finding, index) {
  const issue = issueForFinding(finding);
  const terms = finding.terms.map(queueTerm);
  const id = `alias-${hashId([
    issue,
    finding.alias,
    ...terms.map((term) => `${term.term_id}:${term.alias_value}:${term.confidence}`)
  ])}`;

  return {
    id,
    status: "review",
    issue,
    priority: priorityLabel(finding.priority),
    sort_order: index + 1,
    alias: finding.alias,
    term_count: finding.termCount,
    max_confidence: Number(finding.maxConfidence ?? 0),
    strict_blocker: Boolean(finding.strictBlocker),
    high_confidence_collision: Boolean(finding.highConfidenceCollision),
    recommended_action: recommendedAction(finding),
    terms
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

const termIndex = await readJson(paths.termIndex);
const termRegistry = await readJson(paths.termRegistry);

const registryVersion = termRegistry.version ?? "unknown";
const rawRegistryTerms = Array.isArray(termRegistry.terms) ? termRegistry.terms : [];
const scannedTerms = Array.isArray(termIndex.terms) ? termIndex.terms : [];
const rawAliasCount = scannedTerms.reduce((count, term) => count + (term.aliases?.length ?? 0), 0);

const aliasRows = [];
const mojibakeFindings = [];
const mojibakeFindingKeys = new Set();
const shortNoteFindings = [];
const localCoverageFindings = [];

function addMojibakeFinding({ term, alias, normalized, confidence, aliasType, aliasLanguage, aliasJurisdiction, note }) {
  const key = `${term.id}:${normalized}:${alias.value}`;
  if (mojibakeFindingKeys.has(key)) return;
  mojibakeFindingKeys.add(key);
  mojibakeFindings.push({
    alias: normalized,
    termCount: 1,
    maxConfidence: confidence,
    priority: 3,
    issue: "mojibake",
    strictBlocker: false,
    highConfidenceCollision: false,
    unnotedHighConfidenceRows: [],
    notedHighConfidenceRows: [],
    terms: [
      {
        id: term.id,
        canonical_name: term.canonical_name ?? term.id,
        confidence,
        aliasValue: alias.value,
        aliasType,
        language: aliasLanguage,
        jurisdiction: aliasJurisdiction,
        notes: note || String(term?.notes ?? "").trim()
      }
    ]
  });
}

for (const term of rawRegistryTerms) {
  for (const alias of Array.isArray(term.aliases) ? term.aliases : []) {
    const value = String(alias?.value ?? "").trim();
    if (!value || !isMojibakeValue(value)) continue;
    addMojibakeFinding({
      term,
      alias: { value },
      normalized: normalizeText(value),
      confidence: Number(alias?.confidence ?? 0),
      aliasType: String(alias?.type ?? "alias"),
      aliasLanguage: String(alias?.language ?? ""),
      aliasJurisdiction: String(alias?.jurisdiction ?? ""),
      note: String(alias?.note ?? "").trim()
    });
  }
}

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
    const aliasType = String(alias?.type ?? "alias");
    const aliasLanguage = String(alias?.language ?? "");
    const aliasJurisdiction = String(alias?.jurisdiction ?? "");

    if (isMojibakeValue(value)) {
      addMojibakeFinding({
        term,
        alias: { value },
        normalized,
        confidence,
        aliasType,
        aliasLanguage,
        aliasJurisdiction,
        note
      });
    }

    if (
      SHORT_NOTE_TYPES.has(aliasType.toLowerCase()) &&
      compactText(value).length <= 5 &&
      !note &&
      !String(term?.notes ?? "").trim()
    ) {
      shortNoteFindings.push({
        alias: normalized,
        termCount: 1,
        maxConfidence: confidence,
        priority: 3,
        issue: "short-alias-note",
        strictBlocker: false,
        highConfidenceCollision: false,
        unnotedHighConfidenceRows: [],
        notedHighConfidenceRows: [],
        terms: [
          {
            id: term.id,
            canonical_name: term.canonical_name ?? term.id,
            confidence,
            aliasValue: value,
            aliasType,
            language: aliasLanguage,
            jurisdiction: aliasJurisdiction,
            notes: "Short abbreviation or symbol should explain its regulatory context."
          }
        ]
      });
    }

    if (!current) {
      seenInTerm.set(key, {
        termId: term.id,
        canonicalName: term.canonical_name ?? term.id,
        aliasValue: value,
        aliasNormalized: normalized,
        aliasType,
        language: aliasLanguage,
        jurisdiction: aliasJurisdiction,
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

  if (isRelevantTaiwanTerm(term) && !hasReadableLocalAlias(term)) {
    localCoverageFindings.push({
      alias: normalizeText(term.canonical_name ?? term.id),
      termCount: 1,
      maxConfidence: 0,
      priority: 4,
      issue: "missing-local-alias",
      strictBlocker: false,
      highConfidenceCollision: false,
      unnotedHighConfidenceRows: [],
      notedHighConfidenceRows: [],
      terms: [
        {
          id: term.id,
          canonical_name: term.canonical_name ?? term.id,
          confidence: 0,
          aliasValue: term.canonical_name ?? term.id,
          aliasType: "coverage",
          language: "und",
          jurisdiction: "TW",
          notes: "Taiwan or regulated concept has no readable zh/ko/ja alias."
        }
      ]
    });
  }
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
        language: row.language,
        jurisdiction: row.jurisdiction,
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
      issue: "short-ambiguous-alias",
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
          language: row.language,
          jurisdiction: row.jurisdiction,
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
const findings = [
  ...collisionGroups,
  ...shortAmbiguousFindings,
  ...mojibakeFindings,
  ...shortNoteFindings,
  ...localCoverageFindings
].sort(sortBySeverity);

const summary = {
  generated_at: termIndex.generated_at ?? new Date().toISOString(),
  registry_version: registryVersion,
  terms_scanned: scannedTerms.length,
  aliases_scanned: rawAliasCount,
  alias_rows_scanned: aliasRows.length,
  collision_groups: collisionGroups.length,
  high_confidence_collisions: highConfidenceCollisions.length,
  short_ambiguous_aliases_without_notes: shortAmbiguousFindings.length,
  mojibake_aliases: mojibakeFindings.length,
  short_abbreviations_without_notes: shortNoteFindings.length,
  regulated_terms_without_local_alias: localCoverageFindings.length,
  strict_blockers: strictBlockers.length,
  review_items: findings.length
};

async function writeAliasReviewQueue() {
  const items = findings.map(queueItemForFinding);
  const queue = {
    generated_at: summary.generated_at,
    source: {
      registry_version: registryVersion,
      term_index_generated_at: termIndex.generated_at ?? null,
      term_index_path: "data/knowledge/term-index.json",
      term_registry_path: "data/knowledge/term-registry.json",
      audit_command: "pnpm build:alias-queue"
    },
    summary,
    items
  };

  await mkdir(path.dirname(paths.aliasReviewQueue), { recursive: true });
  await writeFile(paths.aliasReviewQueue, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`\nWrote alias review queue: ${path.relative(root, paths.aliasReviewQueue)} (${items.length} items)`);
}

console.log("Alias audit summary");
console.log(`- Registry version: ${summary.registry_version}`);
console.log(`- Terms scanned: ${summary.terms_scanned}`);
console.log(`- Aliases scanned: ${summary.aliases_scanned}`);
console.log(`- Alias rows scanned: ${summary.alias_rows_scanned}`);
console.log(`- Collision groups: ${summary.collision_groups}`);
console.log(`- High-confidence collisions: ${summary.high_confidence_collisions}`);
console.log(`- Short or ambiguous aliases without notes: ${summary.short_ambiguous_aliases_without_notes}`);
console.log(`- Mojibake aliases: ${summary.mojibake_aliases}`);
console.log(`- Short abbreviations without notes: ${summary.short_abbreviations_without_notes}`);
console.log(`- Regulated terms without readable local aliases: ${summary.regulated_terms_without_local_alias}`);
console.log(`- Strict blockers: ${summary.strict_blockers}`);

if (findings.length > 0) {
  console.log("");
  console.log("Top findings");

  for (const finding of findings.slice(0, 20)) {
    const statusBits = [];
    if (finding.strictBlocker) statusBits.push("strict");
    if (finding.issue) statusBits.push(finding.issue);
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

if (writeQueue) {
  await writeAliasReviewQueue();
}

if (strict && strictBlockers.length > 0) {
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
