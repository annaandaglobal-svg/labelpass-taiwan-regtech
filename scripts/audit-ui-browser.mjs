import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = (process.env.LABELPASS_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const failures = [];
const expectedNavKeys = ["workspace", "review", "knowledge", "aliases", "admin"];
const expectedNavHrefs = ["/workspace", "/", "/knowledge", "/knowledge/aliases", "/admin"];

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
      activeItems,
      controls,
      adminHeroRect: rect(adminHero),
      adminSectionNavRect: rect(adminSectionNav)
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
    if ((snapshot.adminHeroRect?.height ?? 0) > 92) fail(`${label}: admin hero is too tall at ${snapshot.adminHeroRect?.height}px`);
    if (viewport.name === "desktop" && (snapshot.adminSectionNavRect?.height ?? 0) > 44) {
      fail(`${label}: desktop admin secondary nav is too tall at ${snapshot.adminSectionNavRect?.height}px`);
    }
  }
}

function between(value, min, max) {
  return typeof value === "number" && value >= min && value <= max;
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
