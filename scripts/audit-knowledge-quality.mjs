import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const writeReport = process.argv.includes("--write-report");
const strict = process.argv.includes("--strict");

const paths = {
  registry: path.join(root, "data", "knowledge", "source-registry.json"),
  index: path.join(root, "data", "knowledge", "index.json"),
  report: path.join(root, "docs", "knowledge-quality-report.md")
};

const mojibakePattern = /[�]|銝|嚗|瑼|撟|靽|甈|/;
const weakCapturePattern =
  /access denied|forbidden|captcha|security check|temporarily unavailable|blocked|just a moment|unsupported document/i;

function severityRank(severity) {
  return { high: 0, medium: 1, low: 2 }[severity] ?? 3;
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity,
    source_id: finding.sourceId,
    title: finding.title,
    reason: finding.reason,
    text_chars: finding.textChars,
    priority: finding.priority,
    document_path: finding.documentPath
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sourcePriority(source, result) {
  return source?.priority ?? result.priority ?? "medium";
}

function isHighPriority(priority) {
  return priority === "high";
}

function markdownTable(rows) {
  if (rows.length === 0) return "No findings.\n";

  const header = "| Severity | Source | Reason | Text chars | Priority |\n| --- | --- | --- | ---: | --- |\n";
  const body = rows
    .map((row) => {
      const source = row.document_path ? `[${row.source_id}](../${row.document_path})` : row.source_id;
      return `| ${row.severity} | ${source} | ${row.reason.replaceAll("|", "\\|")} | ${row.text_chars} | ${row.priority} |`;
    })
    .join("\n");
  return `${header}${body}\n`;
}

const [registry, index] = await Promise.all([readJson(paths.registry), readJson(paths.index)]);
const sourcesById = new Map((registry.sources ?? []).map((source) => [source.id, source]));
const resultsById = new Map((index.results ?? []).map((result) => [result.id, result]));
const findings = [];

function hasStrongCompanion(source) {
  return (source?.companion_source_ids ?? []).some((companionId) => {
    const companion = resultsById.get(companionId);
    return companion && !companion.parse_error && (companion.text_chars ?? 0) >= 2000;
  });
}

for (const result of index.results ?? []) {
  const source = sourcesById.get(result.id);
  const priority = sourcePriority(source, result);
  const documentPath = result.document_path ?? "";
  const document = documentPath ? await readFile(path.join(root, documentPath), "utf8") : "";
  const textChars = result.text_chars ?? 0;

  if (result.parse_error) {
    addFinding(findings, {
      severity: "high",
      sourceId: result.id,
      title: result.title,
      reason: `Parser reported: ${result.parse_error}`,
      textChars,
      priority,
      documentPath
    });
  }

  if (textChars < 500) {
    addFinding(findings, {
      severity: "high",
      sourceId: result.id,
      title: result.title,
      reason: "Extract is too short to be reliable evidence",
      textChars,
      priority,
      documentPath
    });
  } else if (isHighPriority(priority) && textChars < 2000 && !hasStrongCompanion(source)) {
    addFinding(findings, {
      severity: "medium",
      sourceId: result.id,
      title: result.title,
      reason: "High-priority source has a shallow extract",
      textChars,
      priority,
      documentPath
    });
  }

  if (result.browser_capture && textChars < 1200) {
    addFinding(findings, {
      severity: "high",
      sourceId: result.id,
      title: result.title,
      reason: "Browser capture looks like a blocked or incomplete page",
      textChars,
      priority,
      documentPath
    });
  }

  if (weakCapturePattern.test(document) && textChars < 2000) {
    addFinding(findings, {
      severity: "medium",
      sourceId: result.id,
      title: result.title,
      reason: "Document contains blocked-page or unsupported-document language",
      textChars,
      priority,
      documentPath
    });
  }

  if (mojibakePattern.test(document)) {
    addFinding(findings, {
      severity: "medium",
      sourceId: result.id,
      title: result.title,
      reason: "Document contains likely mojibake; recrawl or browser capture may be needed",
      textChars,
      priority,
      documentPath
    });
  }

  if (result.format === "pdf" && !result.page_count && textChars < 2000) {
    addFinding(findings, {
      severity: "medium",
      sourceId: result.id,
      title: result.title,
      reason: "PDF source has no page count and a shallow extract",
      textChars,
      priority,
      documentPath
    });
  }
}

findings.sort((a, b) => {
  const severity = severityRank(a.severity) - severityRank(b.severity);
  if (severity !== 0) return severity;
  return a.text_chars - b.text_chars;
});

const summary = {
  generated_at: new Date().toISOString(),
  crawl_generated_at: index.generated_at,
  sources: index.results?.length ?? 0,
  high: findings.filter((finding) => finding.severity === "high").length,
  medium: findings.filter((finding) => finding.severity === "medium").length,
  low: findings.filter((finding) => finding.severity === "low").length,
  findings: findings.length
};

if (writeReport) {
  const report = [
    "# Knowledge Quality Report",
    "",
    `Crawl index: ${summary.crawl_generated_at}`,
    "",
    "This report flags source extracts that may be too thin, blocked, encoded incorrectly, or otherwise weak as reusable regulatory evidence. It is an operations backlog, not a legal conclusion.",
    "",
    "## Summary",
    "",
    `- Sources checked: ${summary.sources}`,
    `- High findings: ${summary.high}`,
    `- Medium findings: ${summary.medium}`,
    `- Low findings: ${summary.low}`,
    "",
    "## Findings",
    "",
    markdownTable(findings),
    "",
    "## Remediation Pattern",
    "",
    "1. Re-open the official source in the browser when automated fetches are shallow or blocked.",
    "2. Save visible text and a screenshot under `data/knowledge/browser-captures/`.",
    "3. Add or update `browser_capture_path` and `screenshot_path` in `data/knowledge/source-registry.json`.",
    "4. Run `pnpm crawl:knowledge`, `pnpm build:knowledge-seed`, and `pnpm validate:knowledge`.",
    ""
  ].join("\n");
  await writeFile(paths.report, report, "utf8");
}

console.log(JSON.stringify({ summary, top_findings: findings.slice(0, 20) }, null, 2));

if (strict && summary.high > 0) {
  process.exit(1);
}
