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

async function fetchSource(source, cacheDays) {
  const rawPath = path.join(rawDir, `${source.id}.raw`);
  let body;
  let fromCache = false;
  let manualFallback = false;
  let browserCapture = false;
  let contentType = source.content_type ?? "";

  if (source.format?.toLowerCase() === "manual") {
    body = Buffer.from(source.manual_extract ?? "", "utf8");
    contentType = "text/plain";
    manualFallback = true;
  } else if (source.format?.toLowerCase() === "browser_capture" && source.browser_capture_path) {
    body = await readFile(path.join(root, source.browser_capture_path));
    contentType = "text/plain";
    browserCapture = true;
  } else if (await isFresh(rawPath, cacheDays)) {
    body = await readFile(rawPath);
    fromCache = true;
  } else {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), source.timeout_ms ?? 25000);
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8"
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`${source.id}: ${response.status} ${response.statusText}`);
      }

      contentType = response.headers.get("content-type") ?? contentType;
      body = Buffer.from(await response.arrayBuffer());
      await writeFile(rawPath, body);
    } catch (error) {
      try {
        body = await readFile(rawPath);
        fromCache = true;
      } catch {
        if (source.browser_capture_path) {
          body = await readFile(path.join(root, source.browser_capture_path));
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
    `fetched_at: ${now.toISOString()}`,
    `content_hash: ${hash}`,
    `from_cache: ${fromCache}`,
    `manual_fallback: ${manualFallback}`,
    `browser_capture: ${browserCapture}`,
    `parse_error: ${parsed.parse_error ?? ""}`,
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
    authority: source.authority,
    jurisdiction: source.jurisdiction,
    domain: source.domain,
    source_type: source.source_type,
    priority: source.priority,
    tags: source.tags,
    format: parsed.format,
    fetched_at: now.toISOString(),
    from_cache: fromCache,
    manual_fallback: manualFallback,
    browser_capture: browserCapture,
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
const results = [];
const failures = [];

for (const source of registry.sources) {
  const cacheDays = source.cache_days ?? registry.default_cache_days ?? 14;
  try {
    results.push(await fetchSource(source, cacheDays));
  } catch (error) {
    failures.push({
      id: source.id,
      url: source.url,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

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
  console.log(JSON.stringify({ output: "data/knowledge/index.json", sources: results.length }, null, 2));
}
