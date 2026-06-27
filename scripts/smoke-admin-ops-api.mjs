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
const paymentDryRunPayload = {
  action: "payment_status",
  id: "00000000-0000-4000-8000-000000000002",
  status: "paid",
  requestId: `smoke-admin-payment-${Date.now()}`,
  note: "payment dry-run smoke check"
};
const chatDryRunPayload = {
  action: "chat_thread_status",
  id: "00000000-0000-4000-8000-000000000003",
  status: "active",
  requestId: `smoke-admin-chat-${Date.now()}`,
  note: "chat gate dry-run smoke check"
};
const handoffPayload = {
  draft: {
    id: `smoke-handoff-${Date.now()}`,
    createdAt: new Date().toISOString(),
    productName: "Smoke PIF Cream",
    productType: "leave-on cosmetic cream",
    routeId: "tw_cosmetic",
    routeLabel: "대만 화장품",
    status: "needs_info",
    score: 62,
    priority: "collect_documents",
    nextAction: "PIF, INCI, GMP 증빙을 전문가 상담 전에 보강",
    expertScope: ["자료 보강", "PIF 목차 확인", "INCI 제한성분 대조"],
    paymentGate: {
      label: "견적·결제 준비",
      detail: "보강 증빙 확인 후 상담방을 엽니다."
    },
    logistics: {
      trigger: "라벨·증빙 버전 고정 후 선적 연결",
      documents: ["중문 라벨", "PIF", "GMP 증빙"]
    },
    evidenceCount: 5,
    neededDocuments: 3
  },
  requestId: `smoke-handoff-request-${Date.now()}`,
  metadata: { smoke: true }
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
checks.push(
  await fetchJson("admin payment dry run", `${baseUrl}/api/admin/ops/actions?dryRun=1&smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(paymentDryRunPayload)
  })
);
checks.push(
  await fetchJson("admin chat dry run", `${baseUrl}/api/admin/ops/actions?dryRun=1&smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(chatDryRunPayload)
  })
);
checks.push(await fetchJson("handoff readiness", `${baseUrl}/api/handoff/requests?smoke=${Date.now()}`));
checks.push(
  await fetchJson("handoff dry run", `${baseUrl}/api/handoff/requests?dryRun=1&smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(handoffPayload)
  })
);
checks.push(
  await fetchJson("handoff write without token", `${baseUrl}/api/handoff/requests?smoke=${Date.now()}`, {
    method: "POST",
    body: JSON.stringify(handoffPayload)
  })
);

const errors = [];
const readiness = checks[0];
const dryRun = checks[1];
const unauthorized = checks[2];
const paymentDryRun = checks[3];
const chatDryRun = checks[4];
const handoffReadiness = checks[5];
const handoffDryRun = checks[6];
const handoffUnauthorized = checks[7];

if (!readiness.ok) errors.push(`Readiness endpoint returned ${readiness.status}`);
if (!readiness.body?.supportedActions?.expert_match_status?.includes("matched")) {
  errors.push("Readiness endpoint did not expose expected expert_match_status transitions");
}
if (!readiness.body?.supportedActions?.payment_status?.includes("paid")) {
  errors.push("Readiness endpoint did not expose expected payment_status transitions");
}
if (!readiness.body?.supportedActions?.chat_thread_status?.includes("active")) {
  errors.push("Readiness endpoint did not expose expected chat_thread_status transitions");
}
if (!dryRun.ok || dryRun.body?.dryRun !== true || dryRun.body?.applied !== false) {
  errors.push(`Dry-run endpoint returned unexpected response ${dryRun.status}`);
}
if (!paymentDryRun.ok || paymentDryRun.body?.dryRun !== true || paymentDryRun.body?.applied !== false || paymentDryRun.body?.action !== "payment_status") {
  errors.push(`Payment dry-run endpoint returned unexpected response ${paymentDryRun.status}`);
}
if (!chatDryRun.ok || chatDryRun.body?.dryRun !== true || chatDryRun.body?.applied !== false || chatDryRun.body?.action !== "chat_thread_status") {
  errors.push(`Chat dry-run endpoint returned unexpected response ${chatDryRun.status}`);
}
if (!handoffReadiness.ok || !handoffReadiness.body?.targetTables?.includes("expert_matches")) {
  errors.push(`Handoff readiness endpoint returned unexpected response ${handoffReadiness.status}`);
}
if (
  !handoffDryRun.ok ||
  handoffDryRun.body?.dryRun !== true ||
  handoffDryRun.body?.applied !== false ||
  !handoffDryRun.body?.plannedRecords?.expertMatch ||
  !handoffDryRun.body?.entityIds?.shipmentRequestId
) {
  errors.push(`Handoff dry-run endpoint returned unexpected response ${handoffDryRun.status}`);
}
if (unauthorized.status !== 401) {
  errors.push(`Write without token should return 401, got ${unauthorized.status}`);
}
if (handoffUnauthorized.status !== 401) {
  errors.push(`Handoff write without token should return 401, got ${handoffUnauthorized.status}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, baseUrl, checks, errors }, null, 2));
  process.exit(1);
}

console.log(
  `Admin ops API smoke test passed: storage=${readiness.body.storage}, writesReady=${readiness.body.writesReady}, dryRun=${dryRun.body.action}`
);
