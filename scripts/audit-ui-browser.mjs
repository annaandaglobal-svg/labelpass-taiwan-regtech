import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = (process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const failures = [];
const expectedPrimaryNavKeys = ["workspace", "review", "knowledge"];
const expectedPrimaryNavHrefs = ["/workspace", "/", "/knowledge"];
const expectedUtilityNavKeys = ["aliases", "admin"];
const expectedUtilityNavHrefs = ["/knowledge/aliases", "/admin"];
const expectedNavKeys = ["workspace", "review", "knowledge", "aliases", "admin"];
const expectedNavHrefs = ["/workspace", "/", "/knowledge", "/knowledge/aliases", "/admin"];
const expectedAdminSectionHrefs = [
  "/admin",
  "/admin/companies",
  "/admin/users",
  "/admin/reviews",
  "/admin/experts",
  "/admin/payments",
  "/admin/logistics",
  "/admin/settings"
];

const routes = [
  { path: "/workspace", active: "workspace" },
  { path: "/", active: "review" },
  { path: `/knowledge?q=PIF&uiBrowserAudit=${Date.now()}`, active: "knowledge" },
  { path: "/knowledge/aliases?lane=active&priority=high", active: "aliases" },
  { path: "/admin", active: "admin", admin: true },
  { path: "/admin/experts", active: "admin", admin: true },
  { path: "/admin/payments", active: "admin", admin: true },
  { path: "/admin/logistics", active: "admin", admin: true }
];

const viewports = [
  { name: "desktop", width: 1440, height: 1080, mobile: false },
  { name: "mobile", width: 390, height: 920, mobile: true }
];

const shellTransitionSteps = [
  { key: "review", path: "/", active: "review" },
  { key: "knowledge", path: "/knowledge", active: "knowledge" },
  { key: "aliases", path: "/knowledge/aliases", active: "aliases" },
  { key: "admin", path: "/admin", active: "admin", admin: true },
  { key: "workspace", path: "/workspace", active: "workspace" }
];

function fail(message) {
  failures.push(message);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function chromeCandidates() {
  const candidates = [process.env.CHROME_PATH].filter(Boolean);

  if (process.platform === "win32") {
    candidates.push(
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
      join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe")
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium"
    );
  }

  return candidates;
}

function findChrome() {
  return chromeCandidates().find((candidate) => candidate && existsSync(candidate));
}

async function waitForHttp(url, label, timeoutMs = 15000) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${label} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`${label} did not become ready: ${lastError?.message ?? "timeout"}`);
}

async function waitForJson(url, label, timeoutMs = 15000) {
  const response = await waitForHttp(url, label, timeoutMs);
  return response.json();
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      } else {
        pending.resolve(message.result ?? {});
      }
    });

    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  command(method, params = {}) {
    const id = this.nextId++;
    const payload = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    this.socket?.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    const text = result.exceptionDetails.text ?? "Runtime evaluation failed";
    throw new Error(text);
  }

  return result.result.value;
}

async function waitForSnapshot(client, route, viewport) {
  const started = Date.now();
  let lastError;
  const expectedPath = new URL(route.path, `${baseUrl}/`).pathname;

  while (Date.now() - started < 15000) {
    try {
      const snapshot = await evaluate(client, snapshotExpression());
      if (snapshot.path === expectedPath && snapshot.readyState === "complete" && snapshot.shellCount === 1) {
        return snapshot;
      }
      lastError = new Error(`path=${snapshot.path} ready=${snapshot.readyState} shell=${snapshot.shellCount}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`${viewport.name} ${route.path} did not become auditable: ${lastError?.message ?? "timeout"}`);
}

function snapshotExpression() {
  return `(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom)
      };
    };
    const styleOf = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        display: s.display,
        gridTemplateColumns: s.gridTemplateColumns,
        position: s.position,
        overflowY: s.overflowY,
        fontSize: s.fontSize,
        minHeight: s.minHeight,
        whiteSpace: s.whiteSpace
      };
    };
    const navItems = Array.from(document.querySelectorAll("[data-shell-nav-item]")).map((el) => ({
      key: el.getAttribute("data-shell-nav-item"),
      href: new URL(el.getAttribute("href") || "", location.href).pathname,
      text: (el.textContent || "").replace(/\\s+/g, " ").trim(),
      current: el.getAttribute("aria-current") === "page",
      rect: rect(el)
    }));
    const navItemsIn = (selector) => Array.from(document.querySelectorAll(selector)).map((el) => ({
      key: el.getAttribute("data-shell-nav-item"),
      href: new URL(el.getAttribute("href") || "", location.href).pathname,
      text: (el.textContent || "").replace(/\\s+/g, " ").trim(),
      current: el.getAttribute("aria-current") === "page",
      rect: rect(el)
    }));
    const activeItems = navItems.filter((item) => item.current);
    const controls = Array.from(document.querySelectorAll(".lp-button, .admin-secondary-action, .admin-section-nav a, .admin-ops-dry-run button, .admin-row-action button"))
      .map((el) => ({
        selector: el.className || el.tagName.toLowerCase(),
        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
        rect: rect(el),
        style: styleOf(el)
      }))
      .filter((item) => item.rect && item.rect.width > 0 && item.rect.height > 0);
    const shell = document.querySelector("[data-app-shell='persistent']");
    const sidebar = document.querySelector("[data-shell-sidebar='persistent']");
    const content = document.querySelector("[data-shell-content='stable']");
    const adminHero = document.querySelector(".admin-hero, .admin-section-hero");
    const adminSectionNav = document.querySelector(".admin-section-nav");
    const adminSectionItems = Array.from(document.querySelectorAll(".admin-section-nav a")).map((el) => ({
      href: new URL(el.getAttribute("href") || "", location.href).pathname,
      text: (el.textContent || "").replace(/\\s+/g, " ").trim(),
      current: el.getAttribute("aria-current") === "page",
      rect: rect(el),
      style: styleOf(el)
    }));
    const adminCtas = Array.from(document.querySelectorAll(".admin-hero .admin-secondary-action, .admin-section-hero .admin-secondary-action")).map((el) => {
      const hero = el.closest(".admin-hero, .admin-section-hero");
      const s = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute("href") ? new URL(el.getAttribute("href"), location.href).pathname : "",
        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
        rect: rect(el),
        heroRect: rect(hero),
        style: {
          display: s.display,
          width: s.width,
          maxWidth: s.maxWidth,
          minHeight: s.minHeight,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          justifySelf: s.justifySelf,
          alignSelf: s.alignSelf,
          gridColumn: s.gridColumn,
          flexGrow: s.flexGrow,
          whiteSpace: s.whiteSpace
        }
      };
    });
    const adminTriage = document.querySelector("[data-admin-triage='primary']");
    const adminPriorityCards = Array.from(document.querySelectorAll(".admin-priority-card")).map((el) => ({
      href: el.getAttribute("href") ? new URL(el.getAttribute("href"), location.href).pathname : "",
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120),
      rect: rect(el),
      style: styleOf(el)
    }));
    const adminTriageLinks = Array.from(document.querySelectorAll(".admin-triage-groups a")).map((el) => ({
      href: new URL(el.getAttribute("href") || "", location.href).pathname,
      text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
      rect: rect(el),
      style: styleOf(el)
    }));
    const searchInput = document.querySelector(".kb-searchbar input");

    return {
      path: location.pathname,
      readyState: document.readyState,
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      shellCount: document.querySelectorAll("[data-app-shell='persistent']").length,
      sidebarCount: document.querySelectorAll("[data-shell-sidebar='persistent']").length,
      contentCount: document.querySelectorAll("[data-shell-content='stable']").length,
      shellRect: rect(shell),
      sidebarRect: rect(sidebar),
      contentRect: rect(content),
      shellStyle: styleOf(shell),
      sidebarStyle: styleOf(sidebar),
      primaryCount: Number(document.querySelector("[data-shell-nav='primary']")?.getAttribute("data-shell-nav-count") || 0),
      utilityCount: Number(document.querySelector("[data-shell-nav='utility']")?.getAttribute("data-shell-nav-count") || 0),
      navItems,
      primaryItems: navItemsIn("[data-shell-nav='primary'] [data-shell-nav-item]"),
      utilityItems: navItemsIn("[data-shell-nav='utility'] [data-shell-nav-item]"),
      activeItems,
      controls,
      adminCtas,
      adminSectionItems,
      adminHeroRect: rect(adminHero),
      adminSectionNavRect: rect(adminSectionNav),
      adminTriageRect: rect(adminTriage),
      adminPriorityCards,
      adminTriageLinks,
      adminRowLiveLockButtons: document.querySelectorAll(".admin-row-action-lock").length,
      adminDirectRowActions: document.querySelectorAll(".admin-table-row > span > .admin-row-action").length,
      searchInputValue: searchInput?.value ?? null,
      searchInputCount: document.querySelectorAll(".kb-searchbar input").length
    };
  })()`;
}

function assertSnapshot(snapshot, route, viewport) {
  const label = `${viewport.name} ${route.path}`;

  if (snapshot.shellCount !== 1) fail(`${label}: expected one persistent app shell, found ${snapshot.shellCount}`);
  if (snapshot.sidebarCount !== 1) fail(`${label}: expected one persistent sidebar, found ${snapshot.sidebarCount}`);
  if (snapshot.contentCount !== 1) fail(`${label}: expected one stable content frame, found ${snapshot.contentCount}`);
  if (snapshot.primaryCount !== 3) fail(`${label}: primary nav count drifted to ${snapshot.primaryCount}`);
  if (snapshot.utilityCount !== 2) fail(`${label}: utility nav count drifted to ${snapshot.utilityCount}`);

  const keys = snapshot.navItems.map((item) => item.key);
  const hrefs = snapshot.navItems.map((item) => item.href);
  const primaryKeys = snapshot.primaryItems.map((item) => item.key);
  const primaryHrefs = snapshot.primaryItems.map((item) => item.href);
  const utilityKeys = snapshot.utilityItems.map((item) => item.key);
  const utilityHrefs = snapshot.utilityItems.map((item) => item.href);
  if (primaryKeys.join("|") !== expectedPrimaryNavKeys.join("|")) fail(`${label}: primary nav key order changed to ${primaryKeys.join(", ")}`);
  if (primaryHrefs.join("|") !== expectedPrimaryNavHrefs.join("|")) fail(`${label}: primary nav href order changed to ${primaryHrefs.join(", ")}`);
  if (utilityKeys.join("|") !== expectedUtilityNavKeys.join("|")) fail(`${label}: utility nav key order changed to ${utilityKeys.join(", ")}`);
  if (utilityHrefs.join("|") !== expectedUtilityNavHrefs.join("|")) fail(`${label}: utility nav href order changed to ${utilityHrefs.join(", ")}`);
  if (keys.join("|") !== expectedNavKeys.join("|")) fail(`${label}: nav key order changed to ${keys.join(", ")}`);
  if (hrefs.join("|") !== expectedNavHrefs.join("|")) fail(`${label}: nav href order changed to ${hrefs.join(", ")}`);

  if (snapshot.activeItems.length !== 1) {
    fail(`${label}: expected one active nav item, found ${snapshot.activeItems.length}`);
  } else if (snapshot.activeItems[0].key !== route.active) {
    fail(`${label}: active nav should be ${route.active}, found ${snapshot.activeItems[0].key}`);
  }

  if (snapshot.documentWidth > snapshot.viewport.width + 4) {
    fail(`${label}: horizontal page overflow ${snapshot.documentWidth}px for ${snapshot.viewport.width}px viewport`);
  }

  if (viewport.name === "desktop") {
    if (snapshot.shellStyle?.display !== "grid") fail(`${label}: app shell is not a grid`);
    if (!snapshot.shellStyle?.gridTemplateColumns?.startsWith("224px ")) {
      fail(`${label}: desktop shell columns changed to ${snapshot.shellStyle?.gridTemplateColumns}`);
    }
    if (!between(snapshot.sidebarRect?.width, 218, 230)) {
      fail(`${label}: desktop sidebar width is ${snapshot.sidebarRect?.width}px`);
    }
    if (!between(snapshot.contentRect?.left, 218, 232)) {
      fail(`${label}: desktop content starts at ${snapshot.contentRect?.left}px instead of after sidebar`);
    }
    if (snapshot.sidebarStyle?.position !== "sticky") fail(`${label}: desktop sidebar position is ${snapshot.sidebarStyle?.position}`);
    if (snapshot.sidebarStyle?.overflowY !== "auto") fail(`${label}: desktop sidebar overflow-y is ${snapshot.sidebarStyle?.overflowY}`);
  }

  if (viewport.name === "mobile") {
    if (snapshot.shellStyle?.display !== "grid") fail(`${label}: mobile app shell is not a grid`);
    if (snapshot.sidebarRect?.width < viewport.width - 4) {
      fail(`${label}: mobile sidebar width ${snapshot.sidebarRect?.width}px does not span viewport`);
    }
    if ((snapshot.sidebarRect?.height ?? 0) > 230) {
      fail(`${label}: mobile sidebar is too tall at ${snapshot.sidebarRect?.height}px`);
    }
    if ((snapshot.contentRect?.top ?? 0) < (snapshot.sidebarRect?.bottom ?? 0) - 2) {
      fail(`${label}: mobile content overlaps sticky sidebar`);
    }
  }

  for (const control of snapshot.controls) {
    const controlLabel = `${label}: ${control.selector} "${control.text}"`;
    const height = control.rect?.height ?? 0;
    const width = control.rect?.width ?? 0;
    const isAdminSecondary = `${control.selector}`.includes("admin-secondary-action");
    const isAdminSectionNav = `${control.selector}`.includes("admin-section-nav") || height <= 32;
    const isLpButton = `${control.selector}`.includes("lp-button");

    if (isAdminSecondary && height > 38) fail(`${controlLabel} is too tall at ${height}px`);
    if (isAdminSecondary && width > 280) fail(`${controlLabel} is too wide at ${width}px`);
    if (isAdminSectionNav && height > 44) fail(`${controlLabel} secondary nav/action is too tall at ${height}px`);
    if (isLpButton && height > 46) fail(`${controlLabel} primary action is too tall at ${height}px`);
  }

  if (route.admin) {
    if (!snapshot.adminSectionNavRect) fail(`${label}: admin secondary nav is missing`);
    const adminHrefs = snapshot.adminSectionItems.map((item) => item.href);
    if (adminHrefs.join("|") !== expectedAdminSectionHrefs.join("|")) {
      fail(`${label}: admin secondary nav structure changed to ${adminHrefs.join(", ")}`);
    }
    if ((snapshot.adminHeroRect?.height ?? 0) > 92) fail(`${label}: admin hero is too tall at ${snapshot.adminHeroRect?.height}px`);
    if (viewport.name === "desktop" && (snapshot.adminSectionNavRect?.height ?? 0) > 44) {
      fail(`${label}: desktop admin secondary nav is too tall at ${snapshot.adminSectionNavRect?.height}px`);
    }
    if (snapshot.adminRowLiveLockButtons !== 0) {
      fail(`${label}: row-level live lock buttons reappeared (${snapshot.adminRowLiveLockButtons})`);
    }
    if (snapshot.adminDirectRowActions !== 0) {
      fail(`${label}: row actions are visible without an operations disclosure (${snapshot.adminDirectRowActions})`);
    }
    if (route.path === "/admin") {
      if (!snapshot.adminTriageRect) fail(`${label}: admin first-priority triage strip is missing`);
      if (snapshot.adminPriorityCards.length !== 1) fail(`${label}: expected one primary priority card, found ${snapshot.adminPriorityCards.length}`);
      if (snapshot.adminTriageLinks.length !== 5) fail(`${label}: expected five admin triage group links, found ${snapshot.adminTriageLinks.length}`);
      const priority = snapshot.adminPriorityCards[0];
      if (priority && (priority.rect?.height ?? 0) > 132) fail(`${label}: primary priority card is too tall at ${priority.rect?.height}px`);
      if (priority && !priority.text.includes("지금 먼저") && !priority.text.includes("대기 없음")) {
        fail(`${label}: primary priority card does not clearly name the first action`);
      }
    } else if (snapshot.adminPriorityCards.length > 0 || snapshot.adminTriageLinks.length > 0) {
      fail(`${label}: admin first-priority triage strip leaked outside admin home`);
    }
  } else if (snapshot.adminSectionItems.length > 0) {
    fail(`${label}: admin secondary nav leaked outside admin routes`);
  }

  for (const cta of snapshot.adminCtas) {
    const ctaLabel = `${label}: admin hero CTA "${cta.text}"`;
    const ctaWidth = cta.rect?.width ?? 0;
    const ctaHeight = cta.rect?.height ?? 0;
    const heroWidth = cta.heroRect?.width ?? 0;
    const widthRatio = heroWidth > 0 ? ctaWidth / heroWidth : 0;
    const fontSize = px(cta.style?.fontSize);

    if (ctaHeight > 38) fail(`${ctaLabel} is too tall at ${ctaHeight}px`);
    if (ctaWidth > (viewport.name === "desktop" ? 240 : 168)) fail(`${ctaLabel} is too wide at ${ctaWidth}px`);
    if (widthRatio > (viewport.name === "desktop" ? 0.42 : 0.58)) {
      fail(`${ctaLabel} consumes ${Math.round(widthRatio * 100)}% of the hero width`);
    }
    if (fontSize && fontSize > 13.5) fail(`${ctaLabel} font-size is too large at ${cta.style.fontSize}`);
    if (cta.style?.display === "block") fail(`${ctaLabel} became block-level instead of compact inline-flex`);
    if (cta.style?.gridColumn === "1 / -1" || cta.style?.flexGrow === "1") fail(`${ctaLabel} is expanding like a full-width hero action`);
  }
}

function between(value, min, max) {
  return typeof value === "number" && value >= min && value <= max;
}

function px(value) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function navStructure(snapshot) {
  return {
    primary: snapshot.primaryItems.map((item) => `${item.key}:${item.href}`).join("|"),
    utility: snapshot.utilityItems.map((item) => `${item.key}:${item.href}`).join("|"),
    all: snapshot.navItems.map((item) => `${item.key}:${item.href}`).join("|"),
    primaryCount: snapshot.primaryCount,
    utilityCount: snapshot.utilityCount
  };
}

function assertSameNavigation(before, after, label) {
  const left = navStructure(before);
  const right = navStructure(after);

  for (const key of Object.keys(left)) {
    if (left[key] !== right[key]) fail(`${label}: navigation ${key} changed from ${left[key]} to ${right[key]}`);
  }
}

function assertShellContinuity(before, after, label, viewport) {
  assertSameNavigation(before, after, label);
  if (after.shellCount !== 1 || after.sidebarCount !== 1 || after.contentCount !== 1) {
    fail(`${label}: persistent shell/sidebar/content counts changed after route movement`);
  }
  if (viewport.name === "desktop") {
    if (!between(after.sidebarRect?.width, 218, 230)) fail(`${label}: sidebar width changed to ${after.sidebarRect?.width}px`);
    if (Math.abs((before.sidebarRect?.left ?? 0) - (after.sidebarRect?.left ?? 0)) > 2) {
      fail(`${label}: sidebar horizontal position shifted from ${before.sidebarRect?.left}px to ${after.sidebarRect?.left}px`);
    }
  }
}

async function clickShellNavItem(client, key) {
  await evaluate(
    client,
    `(() => {
      const link = document.querySelector("[data-shell-nav-item='${key}']");
      if (!link) throw new Error("missing shell nav item ${key}");
      link.click();
      return true;
    })()`
  );
}

async function runShellTransitionAudit(client, viewport) {
  await client.command("Page.navigate", { url: routeUrl("/workspace") });
  let previous = await waitForSnapshot(client, { path: "/workspace", active: "workspace" }, viewport);
  assertSnapshot(previous, { path: "/workspace", active: "workspace" }, viewport);

  for (const step of shellTransitionSteps) {
    await clickShellNavItem(client, step.key);
    const current = await waitForSnapshot(client, step, viewport);
    assertSnapshot(current, step, viewport);
    assertShellContinuity(previous, current, `${viewport.name} client route ${previous.path} -> ${step.path}`, viewport);
    previous = current;
  }
}

async function waitForSearchSnapshot(client, query, viewport) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < 15000) {
    try {
      const snapshot = await waitForSnapshot(client, { path: "/knowledge", active: "knowledge" }, viewport);
      if (snapshot.searchInputValue === query) return snapshot;
      lastError = new Error(`search value=${snapshot.searchInputValue}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`${viewport.name} /knowledge search did not settle: ${lastError?.message ?? "timeout"}`);
}

async function setKnowledgeSearchQuery(client, query) {
  await evaluate(
    client,
    `(() => {
      const input = document.querySelector(".kb-searchbar input");
      if (!input) throw new Error("knowledge search input is missing");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(query)});
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ${JSON.stringify(query)} }));
      return input.value;
    })()`
  );
}

async function runSearchNavigationAudit(client, viewport) {
  await client.command("Page.navigate", { url: routeUrl(`/knowledge?uiBrowserAudit=${Date.now()}`) });
  const before = await waitForSnapshot(client, { path: "/knowledge", active: "knowledge" }, viewport);
  assertSnapshot(before, { path: "/knowledge", active: "knowledge" }, viewport);
  if (before.searchInputCount !== 1) fail(`${viewport.name} /knowledge: expected one search input before search, found ${before.searchInputCount}`);

  const query = "SHTC export permit";
  await setKnowledgeSearchQuery(client, query);
  const after = await waitForSearchSnapshot(client, query, viewport);
  assertSnapshot(after, { path: "/knowledge", active: "knowledge" }, viewport);
  assertSameNavigation(before, after, `${viewport.name} knowledge search before/after`);
  if (after.searchInputCount !== 1) fail(`${viewport.name} /knowledge: expected one search input after search, found ${after.searchInputCount}`);
}

function routeUrl(path) {
  return new URL(path, `${baseUrl}/`).href;
}

async function run() {
  await waitForHttp(baseUrl, "LabelPass app", 10000);

  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("Chrome or Chromium was not found. Set CHROME_PATH to run the browser UI audit.");
  }

  const port = await getFreePort();
  const userDataDir = await mkdtemp(join(tmpdir(), "labelpass-ui-audit-"));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-sandbox",
    "about:blank"
  ];
  const browser = spawn(chromePath, args, { stdio: "ignore" });

  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`, "Chrome DevTools", 15000);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, {
      method: "PUT"
    }).then((response) => response.json());
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    await client.command("Page.enable");
    await client.command("Runtime.enable");

    for (const viewport of viewports) {
      await client.command("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile
      });
      await client.command("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile });

      for (const route of routes) {
        await client.command("Page.navigate", { url: routeUrl(route.path) });
        const snapshot = await waitForSnapshot(client, route, viewport);
        assertSnapshot(snapshot, route, viewport);
      }

      await runShellTransitionAudit(client, viewport);
      await runSearchNavigationAudit(client, viewport);
    }

    client.close();
  } finally {
    browser.kill();
    await new Promise((resolve) => {
      browser.once("exit", resolve);
      setTimeout(resolve, 1500);
    });
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }).catch(() => {});
  }

  if (failures.length) {
    console.error("Browser UI audit failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Browser UI audit passed: ${routes.length} routes across ${viewports.length} viewports kept a stable shell and compact controls.`);
}

run().catch((error) => {
  console.error(`Browser UI audit failed: ${error.message}`);
  process.exit(1);
});
