import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(root, "data", "knowledge", "source-registry.json");
const rawDir = path.join(root, "data", "knowledge", "raw");
const docsDir = path.join(root, "data", "knowledge", "documents");
const indexPath = path.join(root, "data", "knowledge", "index.json");

const force = process.argv.includes("--force");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlyIds = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  : null;
const now = new Date();
const userAgent = "LabelPassRegulatoryCrawler/0.1 (+https://github.com/annaandaglobal-svg/labelpass-taiwan-regtech)";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, codepoint) => String.fromCodePoint(Number.parseInt(codepoint, 16)))
    .replace(/&#(\d+);/g, (_, codepoint) => String.fromCodePoint(Number.parseInt(codepoint, 10)))
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function htmlToText(html) {
  return normalizeWhitespace(
    decodeEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function markdownEscape(text) {
  return String(text).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function detectFormat(source, body, contentType = "") {
  const declaredFormat = source.format?.toLowerCase();
  if (declaredFormat) return declaredFormat;
  if (contentType.toLowerCase().includes("pdf")) return "pdf";
  if (contentType.toLowerCase().includes("xml")) return "xml";
  if (body.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  return "html";
}

async function extractText(source, body, contentType) {
  const format = detectFormat(source, body, contentType);

  if (format === "manual" || format === "text") {
    return {
      format,
      text: normalizeWhitespace(body.toString("utf8")),
      page_count: null,
      parse_error: null
    };
  }

  if (format === "pdf") {
    try {
      const parsed = await pdfParse(body);
      return {
        format,
        text: normalizeWhitespace(parsed.text),
        page_count: parsed.numpages ?? null,
        parse_error: null
      };
    } catch (error) {
      return {
        format,
        text: "",
        page_count: null,
        parse_error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return {
    format,
    text: htmlToText(body.toString("utf8")),
    page_count: null,
    parse_error: null
  };
}

async function fetchUrl(url, source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), source.timeout_ms ?? 25000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,application/rdf+xml,application/xml,application/pdf,text/plain;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`${source.id}: ${response.status} ${response.statusText}`);
    }

    return {
      url,
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

let ecfrTitlesPromise;

async function getEcfrTitles() {
  ecfrTitlesPromise ??= fetchUrl("https://www.ecfr.gov/api/versioner/v1/titles.json", {
    id: "ecfr-titles",
    timeout_ms: 25000
  }).then(({ body }) => JSON.parse(body.toString("utf8")).titles ?? []);
  return ecfrTitlesPromise;
}

async function buildEcfrApiUrl(source) {
  const ecfr = source.ecfr;
  if (!ecfr?.title) {
    throw new Error(`${source.id}: ecfr.title is required`);
  }

  const titleNumber = Number(ecfr.title);
  const date =
    ecfr.date ??
    (await getEcfrTitles()).find((title) => Number(title.number) === titleNumber)?.latest_issue_date;

  if (!date) {
    throw new Error(`${source.id}: could not resolve eCFR latest_issue_date for title ${ecfr.title}`);
  }

  const url = new URL(`https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${titleNumber}.xml`);
  for (const key of ["subtitle", "chapter", "subchapter", "part", "subpart", "section", "appendix"]) {
    if (ecfr[key]) url.searchParams.set(key, String(ecfr[key]));
  }
  return url.toString();
}

async function fetchEcfrSource(source) {
  const apiUrl = await buildEcfrApiUrl(source);
  return fetchUrl(apiUrl, source);
}

function isPublicationsOfficeRdf(url, body, contentType) {
  if (!/publications\.europa\.eu/i.test(url)) return false;
  const content = contentType.toLowerCase();
  const prefix = body.subarray(0, 400).toString("utf8");
  return content.includes("rdf") || prefix.includes("<rdf:RDF");
}

function extractPublicationsOfficeCandidates(rdf) {
  const candidates = [];
  const patterns = [
    /rdf:(?:about|resource)="([^"]+\/DOC_\d+)"/g,
    /rdf:(?:about|resource)="([^"]+\.pdf[^"]*)"/g
  ];

  for (const pattern of patterns) {
    for (const match of rdf.matchAll(pattern)) {
      const url = match[1].replace(/^http:/i, "https:");
      if (!candidates.includes(url)) candidates.push(url);
    }
  }

  return candidates;
}

async function appendExtraUrls(source, body, contentType) {
  if (!source.extra_urls?.length) {
    return { body, contentType, extraFetchedUrls: [] };
  }

  const chunks = [body];
  const extraFetchedUrls = [];

  for (const extraUrl of source.extra_urls) {
    try {
      const fetched = await fetchUrl(extraUrl, source);
      extraFetchedUrls.push(fetched.url ?? extraUrl);
      chunks.push(
        Buffer.from(`\n\n<!-- LabelPass extra official source: ${extraUrl} -->\n\n`, "utf8"),
        fetched.body
      );
    } catch {
      // Keep the primary official source usable if a companion page is temporarily unavailable.
    }
  }

  return {
    body: Buffer.concat(chunks),
    contentType,
    extraFetchedUrls
  };
}

async function resolvePublicationsOfficeDocument(source, body, contentType, depth = 0) {
  if (depth > 3 || !isPublicationsOfficeRdf(source.url, body, contentType)) {
    return { body, contentType };
  }

  const rdf = body.toString("utf8");
  const candidates = extractPublicationsOfficeCandidates(rdf);
  for (const url of candidates) {
    try {
      const fetched = await fetchUrl(url, source);
      if (fetched.body.subarray(0, 5).toString("ascii") === "%PDF-") {
        return fetched;
      }
      if (isPublicationsOfficeRdf(url, fetched.body, fetched.contentType)) {
        const nested = await resolvePublicationsOfficeDocument({ ...source, url }, fetched.body, fetched.contentType, depth + 1);
        if (nested.body.subarray(0, 5).toString("ascii") === "%PDF-") {
          return nested;
        }
      }
    } catch {
      // Try the next manifestation. Publications Office records often expose multiple equivalent item URLs.
    }
  }

  return { body, contentType };
}

async function isFresh(filePath, cacheDays) {
  if (force) return false;
  try {
    const info = await stat(filePath);
    const ageMs = now.getTime() - info.mtimeMs;
    return ageMs < cacheDays * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

async function fileMtime(filePath) {
  try {
    return new Date((await stat(filePath)).mtimeMs);
  } catch {
    return null;
  }
}

function cacheExpiresAt(fetchedAt, cacheDays) {
  return new Date(fetchedAt.getTime() + cacheDays * 24 * 60 * 60 * 1000);
}

async function fetchSource(source, cacheDays) {
  const rawPath = path.join(rawDir, `${source.id}.raw`);
  let body;
  let fromCache = false;
  let manualFallback = false;
  let browserCapture = false;
  let fetchedUrl = source.url;
  let fetchedAt = now;
  let extraFetchedUrls = [];
  let contentType = source.content_type ?? "";

  if (source.format?.toLowerCase() === "manual") {
    body = Buffer.from(source.manual_extract ?? "", "utf8");
    contentType = "text/plain";
    manualFallback = true;
    if (source.browser_capture_path) {
      const capturePath = path.join(root, source.browser_capture_path);
      fetchedAt = (await fileMtime(capturePath)) ?? now;
      browserCapture = true;
    }
  } else if (source.format?.toLowerCase() === "browser_capture" && source.browser_capture_path) {
    const capturePath = path.join(root, source.browser_capture_path);
    body = await readFile(capturePath);
    fetchedAt = (await fileMtime(capturePath)) ?? now;
    contentType = "text/plain";
    browserCapture = true;
  } else if (await isFresh(rawPath, cacheDays)) {
    body = await readFile(rawPath);
    fetchedAt = (await fileMtime(rawPath)) ?? now;
    fromCache = true;
  } else {
    try {
      const fetched = source.ecfr ? await fetchEcfrSource(source) : await fetchUrl(source.url, source);
      fetchedUrl = fetched.url ?? source.url;
      fetchedAt = now;
      const resolved = await resolvePublicationsOfficeDocument(source, fetched.body, fetched.contentType);
      const expanded = await appendExtraUrls(source, resolved.body, resolved.contentType || fetched.contentType || contentType);
      contentType = expanded.contentType;
      body = expanded.body;
      extraFetchedUrls = expanded.extraFetchedUrls;
      await writeFile(rawPath, body);
    } catch (error) {
      try {
        body = await readFile(rawPath);
        fetchedAt = (await fileMtime(rawPath)) ?? now;
        fromCache = true;
      } catch {
        if (source.browser_capture_path) {
          const capturePath = path.join(root, source.browser_capture_path);
          body = await readFile(capturePath);
          fetchedAt = (await fileMtime(capturePath)) ?? now;
          contentType = "text/plain";
          browserCapture = true;
        } else if (source.manual_extract) {
          body = Buffer.from(source.manual_extract, "utf8");
          contentType = "text/plain";
          manualFallback = true;
        } else {
          throw error;
        }
      }
    }
  }

  const parsed = await extractText(source, body, contentType);
  const text = parsed.text;
  const hash = sha256(body);
  const excerpt = text.slice(0, 8000);
  const expiresAt = cacheExpiresAt(fetchedAt, cacheDays);
  const cacheStatus = expiresAt <= now ? "stale" : "fresh";

  const doc = [
    "---",
    `id: ${source.id}`,
    `title: ${source.title}`,
    `url: ${source.url}`,
    `authority: ${source.authority}`,
    `jurisdiction: ${source.jurisdiction}`,
    `domain: ${source.domain}`,
    `source_type: ${source.source_type}`,
    `priority: ${source.priority}`,
    `format: ${parsed.format}`,
    `fetched_at: ${fetchedAt.toISOString()}`,
    `fetched_url: ${fetchedUrl}`,
    `extra_fetched_urls:${extraFetchedUrls.length ? ` ${extraFetchedUrls.join(", ")}` : ""}`,
    `cache_days: ${cacheDays}`,
    `cache_expires_at: ${expiresAt.toISOString()}`,
    `cache_status: ${cacheStatus}`,
    `content_hash: ${hash}`,
    `from_cache: ${fromCache}`,
    `manual_fallback: ${manualFallback}`,
    `browser_capture: ${browserCapture}`,
    `parse_error:${parsed.parse_error ? ` ${parsed.parse_error}` : ""}`,
    `tags: ${source.tags.join(", ")}`,
    "---",
    "",
    `# ${source.title}`,
    "",
    `Source: ${source.url}`,
    "",
    "## Extract",
    "",
    excerpt || "_Binary or unsupported document cached for later PDF parsing._",
    ""
  ].join("\n");

  await writeFile(path.join(docsDir, `${source.id}.md`), markdownEscape(doc), "utf8");

  return {
    id: source.id,
    title: source.title,
    url: source.url,
    fetched_url: fetchedUrl,
    extra_fetched_urls: extraFetchedUrls,
    authority: source.authority,
    jurisdiction: source.jurisdiction,
    domain: source.domain,
    source_type: source.source_type,
    priority: source.priority,
    tags: source.tags,
    excerpt,
    format: parsed.format,
    fetched_at: fetchedAt.toISOString(),
    from_cache: fromCache,
    manual_fallback: manualFallback,
    browser_capture: browserCapture,
    cache_days: cacheDays,
    cache_expires_at: expiresAt.toISOString(),
    cache_status: cacheStatus,
    content_hash: hash,
    bytes: body.length,
    text_chars: text.length,
    page_count: parsed.page_count,
    parse_error: parsed.parse_error,
    browser_capture_path: source.browser_capture_path ?? null,
    screenshot_path: source.screenshot_path ?? null,
    document_path: `data/knowledge/documents/${source.id}.md`
  };
}

await mkdir(rawDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

const registry = JSON.parse(await readFile(registryPath, "utf8"));
const selectedSources = onlyIds
  ? registry.sources.filter((source) => onlyIds.has(source.id))
  : registry.sources;

if (onlyIds && selectedSources.length !== onlyIds.size) {
  const knownIds = new Set(registry.sources.map((source) => source.id));
  const unknownIds = [...onlyIds].filter((id) => !knownIds.has(id));
  throw new Error(`Unknown source id(s) for --only: ${unknownIds.join(", ")}`);
}

let existingIndex = null;
if (onlyIds) {
  try {
    existingIndex = JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    existingIndex = null;
  }
}

const resultsById = new Map((existingIndex?.results ?? []).map((result) => [result.id, result]));
const failures = (existingIndex?.failures ?? []).filter((failure) => !onlyIds?.has(failure.id));

for (const source of selectedSources) {
  const cacheDays = source.cache_days ?? registry.default_cache_days ?? 14;
  try {
    resultsById.set(source.id, await fetchSource(source, cacheDays));
  } catch (error) {
    resultsById.delete(source.id);
    failures.push({
      id: source.id,
      url: source.url,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const results = registry.sources.map((source) => resultsById.get(source.id)).filter(Boolean);

const index = {
  generated_at: now.toISOString(),
  source_registry_version: registry.version,
  source_count: registry.sources.length,
  success_count: results.length,
  failure_count: failures.length,
  results,
  failures
};

await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

if (failures.length) {
  console.error(JSON.stringify({ output: "data/knowledge/index.json", failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        output: "data/knowledge/index.json",
        sources: results.length,
        refreshed: selectedSources.map((source) => source.id)
      },
      null,
      2
    )
  );
}
