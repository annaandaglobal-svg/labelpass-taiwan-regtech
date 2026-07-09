// LEARNING QUEUE
// -----------------------------------------------------------------------------
// When the consult chat hits a topic the curated KB doesn't cover, we capture it here so a
// human-verified learning pass (research → verify → ingest) can close the gap and the tool keeps
// improving on unknowns over time.
//
// Persistence is best-effort: on a writable filesystem (local/dev) it appends to
// data/knowledge/learning-queue.json; on read-only serverless (prod) the write silently no-ops and
// the consult route's [consult-unknown] log is the signal instead. Never throws — capture must never
// break a user's request. NOTHING here is auto-ingested; promotion to the curated KB is verified.

import { promises as fs } from "node:fs";
import path from "node:path";

const QUEUE_PATH = path.join(process.cwd(), "data", "knowledge", "learning-queue.json");

export type LearningTopic = {
  query: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: "pending" | "requested" | "researched" | "ingested" | "not-applicable";
  userRequested?: boolean;
};

type LearningQueue = { updatedAt: string | null; note?: string; topics: LearningTopic[] };

const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);

/**
 * Record an unknown consult topic. Best-effort: increments the count if seen before, else appends.
 * Returns silently on any error (read-only fs, parse failure) so it can never break the caller.
 */
export async function recordUnknownTopic(query: string, nowIso: string): Promise<void> {
  const key = normalize(query);
  if (key.length < 2) return;
  try {
    let queue: LearningQueue;
    try {
      queue = JSON.parse(await fs.readFile(QUEUE_PATH, "utf8")) as LearningQueue;
    } catch {
      queue = { updatedAt: null, topics: [] };
    }
    if (!Array.isArray(queue.topics)) queue.topics = [];
    const existing = queue.topics.find((t) => normalize(t.query) === key);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = nowIso;
    } else {
      queue.topics.push({ query: query.trim().slice(0, 200), count: 1, firstSeen: nowIso, lastSeen: nowIso, status: "pending" });
    }
    queue.updatedAt = nowIso;
    await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n", "utf8");
  } catch {
    // read-only prod fs or any I/O error — the consult route's log line is the fallback signal.
  }
}

/**
 * Mark a topic as an explicit USER research request — bumps it to status "requested" and flags
 * userRequested so the next verified pass prioritises it. Best-effort like recordUnknownTopic.
 */
export async function requestResearch(query: string, nowIso: string): Promise<void> {
  const key = normalize(query);
  if (key.length < 2) return;
  try {
    let queue: LearningQueue;
    try {
      queue = JSON.parse(await fs.readFile(QUEUE_PATH, "utf8")) as LearningQueue;
    } catch {
      queue = { updatedAt: null, topics: [] };
    }
    if (!Array.isArray(queue.topics)) queue.topics = [];
    const existing = queue.topics.find((t) => normalize(t.query) === key);
    if (existing) {
      existing.userRequested = true;
      existing.lastSeen = nowIso;
      if (existing.status === "pending") existing.status = "requested";
    } else {
      queue.topics.push({ query: query.trim().slice(0, 200), count: 1, firstSeen: nowIso, lastSeen: nowIso, status: "requested", userRequested: true });
    }
    queue.updatedAt = nowIso;
    await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n", "utf8");
  } catch {
    // read-only prod — server log is the signal instead.
  }
}
