import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const paths = {
  registry: path.join(root, "data", "knowledge", "source-registry.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  termIndex: path.join(root, "data", "knowledge", "term-index.json"),
  queue: path.join(root, "data", "knowledge", "regulatory-update-queue.json")
};

const expiringSoonDays = Number(process.env.LABELPASS_UPDATE_EXPIRING_SOON_DAYS ?? 7);

function compareStable(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function compact(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣一-龥ぁ-んァ-ン]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toDate(value) {
  const time = Date.parse(String(value ?? ""));
  return Number.isFinite(time) ? new Date(time) : null;
}

function severityFor(source, changeType) {
  if (changeType === "content_changed") return source.priority === "high" ? "high" : "medium";
  if (changeType === "fetch_or_parse_regressed") return source.priority === "high" ? "high" : "medium";
  if (changeType === "source_stale") return source.priority === "high" ? "medium" : "low";
  return source.priority === "high" ? "medium" : "low";
}

function statusFor(changeType) {
  if (changeType === "baseline_watch") return "watching";
  if (changeType === "source_expiring_soon") return "pending_refresh";
  return "detected";
}

function candidateKey(sourceId, changeType, result) {
  if (changeType === "source_expiring_soon") {
    const date = String(result.cache_expires_at ?? "").slice(0, 10) || "unknown";
    return `${sourceId}:${changeType}:${date}`;
  }
  if (changeType === "baseline_watch") {
    return `${sourceId}:${changeType}`;
  }
  return `${sourceId}:${changeType}:${String(result.content_hash ?? "nohash").slice(0, 16)}`;
}

function inferAffectedProducts(source) {
  const text = [source.domain, source.source_type, ...(source.tags ?? [])].join(" ").toLowerCase();
  const products = [];
  if (/cosmetic|pif|化粧|化妝/.test(text)) products.push("cosmetics");
  if (/food|allergen|nutrition|additive|食品/.test(text)) products.push("food");
  if (/customs|tariff|ccc|import|export|origin|permit|shtc|bsmi/.test(text)) products.push("import_export");
  if (!products.length) products.push(source.domain ?? "general");
  return [...new Set(products)];
}

function nextActionFor(changeType, source) {
  if (changeType === "content_changed") {
    return "원문 변경분을 확인하고 영향 용어·룰 후보를 승인 큐에서 분류합니다.";
  }
  if (changeType === "fetch_or_parse_regressed") {
    return "공식 페이지를 브라우저로 열어 텍스트/스크린샷 캡처를 보강합니다.";
  }
  if (changeType === "source_stale") {
    return "강제 크롤링으로 원문 캐시를 갱신하고 해시 변화를 확인합니다.";
  }
  if (changeType === "source_expiring_soon") {
    return `${source.cache_days ?? "기본"}일 갱신 주기 만료 전 자동 크롤링 대상에 올립니다.`;
  }
  return "운영자가 주기적으로 감시해야 하는 대만 핵심 소스입니다.";
}

function preserveDecision(previousByKey, item) {
  const previous = previousByKey.get(item.candidate_key);
  if (!previous) return item;

  const durableStatuses = new Set(["triaged", "approved", "rejected", "applied", "superseded"]);
  if (durableStatuses.has(previous.status)) {
    return {
      ...item,
      status: previous.status,
      reviewer_notes: previous.reviewer_notes ?? item.reviewer_notes,
      decision: previous.decision ?? item.decision,
      decided_at: previous.decided_at ?? item.decided_at
    };
  }

  return {
    ...item,
    status: previous.status ?? item.status,
    reviewer_notes: previous.reviewer_notes ?? item.reviewer_notes
  };
}

function buildTermLinks(termIndex, sourceId) {
  return (termIndex.terms ?? [])
    .filter((term) => (term.source_keys ?? []).includes(sourceId))
    .slice(0, 20)
    .map((term) => ({
      term_key: term.id,
      canonical_name: term.canonical_name,
      category: term.category ?? "term"
    }));
}

const [registry, index, termIndex, previousQueue] = await Promise.all([
  readJson(paths.registry, { sources: [] }),
  readJson(paths.index, { results: [], failures: [] }),
  readJson(paths.termIndex, { terms: [] }),
  readJson(paths.queue, { items: [], source_states: {} })
]);

const sourcesById = new Map((registry.sources ?? []).map((source) => [source.id, source]));
const previousByKey = new Map((previousQueue.items ?? []).map((item) => [item.candidate_key, item]));
const previousStates = previousQueue.source_states ?? {};
const detectionTime = toDate(process.env.LABELPASS_UPDATE_NOW) ?? toDate(index.generated_at) ?? new Date();
const expiringSoonAt = new Date(detectionTime.getTime() + expiringSoonDays * 24 * 60 * 60 * 1000);
const items = [];

for (const result of index.results ?? []) {
  const source = sourcesById.get(result.id);
  if (!source) continue;

  const previous = previousStates[result.id];
  const currentHash = result.content_hash ?? null;
  const previousHash = previous?.content_hash ?? null;
  const expiresAt = toDate(result.cache_expires_at);
  const changeTypes = [];

  if (previousHash && currentHash && previousHash !== currentHash) {
    changeTypes.push("content_changed");
  }

  if ((previous?.parse_error === null || previous?.parse_error === undefined) && result.parse_error) {
    changeTypes.push("fetch_or_parse_regressed");
  }

  if (result.cache_status === "stale") {
    changeTypes.push("source_stale");
  } else if (expiresAt && expiresAt > detectionTime && expiresAt <= expiringSoonAt) {
    changeTypes.push("source_expiring_soon");
  }

  if (source.jurisdiction === "TW" && source.priority === "high" && (source.cache_days ?? registry.default_cache_days ?? 14) <= 14) {
    changeTypes.push("baseline_watch");
  }

  for (const changeType of [...new Set(changeTypes)]) {
    const affectedTerms = buildTermLinks(termIndex, result.id);
    const item = {
      candidate_key: candidateKey(result.id, changeType, result),
      source_key: result.id,
      title: result.title,
      source_url: result.url,
      authority: result.authority,
      jurisdiction: result.jurisdiction,
      domain: result.domain,
      source_type: result.source_type,
      source_priority: result.priority,
      change_type: changeType,
      severity: severityFor(source, changeType),
      status: statusFor(changeType),
      detected_at: detectionTime.toISOString(),
      fetched_at: result.fetched_at ?? null,
      cache_expires_at: result.cache_expires_at ?? null,
      previous_hash: previousHash,
      current_hash: currentHash,
      affected_domains: [result.domain, ...(result.tags ?? [])].filter(Boolean).slice(0, 12),
      affected_terms: affectedTerms,
      affected_products: inferAffectedProducts(source),
      evidence: {
        document_path: result.document_path ?? null,
        fetched_url: result.fetched_url ?? result.url,
        extra_fetched_urls: result.extra_fetched_urls ?? [],
        text_chars: result.text_chars ?? 0,
        format: result.format ?? null,
        from_cache: Boolean(result.from_cache),
        browser_capture: Boolean(result.browser_capture),
        manual_fallback: Boolean(result.manual_fallback),
        parse_error: result.parse_error ?? null,
        excerpt: String(result.excerpt ?? "").slice(0, 700)
      },
      next_action: nextActionFor(changeType, source),
      reviewer_notes: null,
      decision: null,
      decided_at: null,
      metadata: {
        generated_by: "scripts/detect-regulatory-updates.mjs",
        source_registry_version: index.source_registry_version ?? registry.version ?? null,
        source_tags: result.tags ?? [],
        compact_title: compact(result.title)
      }
    };

    items.push(preserveDecision(previousByKey, item));
  }
}

for (const failure of index.failures ?? []) {
  const source = sourcesById.get(failure.id);
  if (!source) continue;
  const item = {
    candidate_key: `${failure.id}:fetch_failed:${compact(failure.error).slice(0, 24) || "error"}`,
    source_key: failure.id,
    title: source.title,
    source_url: source.url,
    authority: source.authority,
    jurisdiction: source.jurisdiction,
    domain: source.domain,
    source_type: source.source_type,
    source_priority: source.priority,
    change_type: "fetch_failed",
    severity: source.priority === "high" ? "high" : "medium",
    status: "detected",
    detected_at: detectionTime.toISOString(),
    fetched_at: null,
    cache_expires_at: null,
    previous_hash: previousStates[failure.id]?.content_hash ?? null,
    current_hash: null,
    affected_domains: [source.domain, ...(source.tags ?? [])].filter(Boolean).slice(0, 12),
    affected_terms: buildTermLinks(termIndex, failure.id),
    affected_products: inferAffectedProducts(source),
    evidence: {
      document_path: null,
      fetched_url: source.url,
      text_chars: 0,
      parse_error: failure.error ?? "fetch failed"
    },
    next_action: "공식 페이지를 브라우저로 확인하고 수동 캡처 또는 대체 공식 URL을 등록합니다.",
    reviewer_notes: null,
    decision: null,
    decided_at: null,
    metadata: {
      generated_by: "scripts/detect-regulatory-updates.mjs",
      source_registry_version: index.source_registry_version ?? registry.version ?? null,
      source_tags: source.tags ?? []
    }
  };
  items.push(preserveDecision(previousByKey, item));
}

items.sort((a, b) => {
  const severityRank = { high: 0, medium: 1, low: 2 };
  const statusRank = { detected: 0, pending_refresh: 1, watching: 2, triaged: 3, approved: 4, rejected: 5, applied: 6, superseded: 7 };
  return (
    (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
    (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
    compareStable(a.source_key, b.source_key)
  );
});

const sourceStates = Object.fromEntries(
  (index.results ?? []).map((result) => [
    result.id,
    {
      title: result.title,
      content_hash: result.content_hash ?? null,
      fetched_at: result.fetched_at ?? null,
      cache_expires_at: result.cache_expires_at ?? null,
      cache_status: result.cache_status ?? null,
      parse_error: result.parse_error ?? null,
      document_path: result.document_path ?? null
    }
  ])
);

const queue = {
  generated_at: detectionTime.toISOString(),
  source_registry_version: index.source_registry_version ?? registry.version ?? null,
  crawl_generated_at: index.generated_at ?? null,
  expiring_soon_days: expiringSoonDays,
  summary: {
    total: items.length,
    detected: items.filter((item) => item.status === "detected").length,
    pending_refresh: items.filter((item) => item.status === "pending_refresh").length,
    watching: items.filter((item) => item.status === "watching").length,
    approved: items.filter((item) => item.status === "approved").length,
    high: items.filter((item) => item.severity === "high").length,
    medium: items.filter((item) => item.severity === "medium").length,
    low: items.filter((item) => item.severity === "low").length
  },
  items,
  source_states: sourceStates
};

await writeFile(paths.queue, `${JSON.stringify(queue, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: "data/knowledge/regulatory-update-queue.json",
      summary: queue.summary
    },
    null,
    2
  )
);
