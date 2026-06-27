const baseUrl = (process.env.LABELPASS_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function fetchJson(label, url, options) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {})
    },
    cache: "no-store"
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { label, status: response.status, ok: response.ok, body };
}

const dryRunPayload = {
  action: "expert_match_status",
  id: "00000000-0000-4000-8000-000000000001",
  status: "matched",
  requestId: `smoke-admin-ops-${Date.now()}`,
  note: "dry-run smoke check"
};

const checks = [];
checks.push(await fetchJson("admin ops readiness", `${baseUrl}/api/admin/ops/actions?smoke=${Date.now()}`));
checks.push(
  await fetchJson("admin ops dry run", `${baseUrl}/api/admin/ops/actions?dryRun=1&smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(dryRunPayload)
  })
);
checks.push(
  await fetchJson("admin ops write without token", `${baseUrl}/api/admin/ops/actions?smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(dryRunPayload)
  })
);

const errors = [];
const readiness = checks[0];
const dryRun = checks[1];
const unauthorized = checks[2];

if (!readiness.ok) errors.push(`Readiness endpoint returned ${readiness.status}`);
if (!readiness.body?.supportedActions?.expert_match_status?.includes("matched")) {
  errors.push("Readiness endpoint did not expose expected expert_match_status transitions");
}
if (!dryRun.ok || dryRun.body?.dryRun !== true || dryRun.body?.applied !== false) {
  errors.push(`Dry-run endpoint returned unexpected response ${dryRun.status}`);
}
if (unauthorized.status !== 401) {
  errors.push(`Write without token should return 401, got ${unauthorized.status}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, baseUrl, checks, errors }, null, 2));
  process.exit(1);
}

console.log(
  `Admin ops API smoke test passed: storage=${readiness.body.storage}, writesReady=${readiness.body.writesReady}, dryRun=${dryRun.body.action}`
);
