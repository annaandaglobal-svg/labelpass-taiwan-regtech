import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) fail(`${label}: missing ${needle}`);
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

function requireCompactIncludes(source, needle, label) {
  if (!compact(source).includes(compact(needle))) fail(`${label}: missing ${compact(needle)}`);
}

function cssRule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = Array.from(css.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "gm")));
  return matches.map((match) => match[1]).join("\n");
}

function cssNumber(rule, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rule.match(new RegExp(`${escaped}\\s*:\\s*(\\d+)px`, "i"));
  return match ? Number(match[1]) : null;
}

function requireMaxPx(rule, property, max, label) {
  const value = cssNumber(rule, property);
  if (value == null) {
    fail(`${label}: missing ${property}`);
    return;
  }
  if (value > max) fail(`${label}: ${property} ${value}px exceeds ${max}px`);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    return statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const routeShells = [
  {
    file: "src/app/page.tsx",
    shell: '<main className="lp-shell">',
    sidebar: '<AppSidebar active="review" />'
  },
  {
    file: "src/app/knowledge/page.tsx",
    shell: '<main className="lp-shell">',
    sidebar: '<AppSidebar active="knowledge" />'
  },
  {
    file: "src/app/knowledge/aliases/page.tsx",
    shell: '<main className="lp-shell">',
    sidebar: '<AppSidebar active="aliases" />'
  },
  {
    file: "src/app/admin/layout.tsx",
    shell: '<main className="lp-shell admin-shell">',
    sidebar: '<AppSidebar active="admin" />',
    extra: '<AdminSectionNav />'
  }
];

for (const route of routeShells) {
  const source = read(route.file);
  requireIncludes(source, route.shell, route.file);
  requireIncludes(source, route.sidebar, route.file);
  if (route.extra) requireIncludes(source, route.extra, route.file);
}

for (const filePath of walk(join(repoRoot, "src/app/admin"))) {
  if (!filePath.endsWith("page.tsx")) continue;
  const label = relative(repoRoot, filePath).replaceAll("\\", "/");
  const source = read(label);
  if (source.includes("AppSidebar")) fail(`${label}: admin pages must use src/app/admin/layout.tsx for navigation`);
  if (source.includes('className="lp-shell')) fail(`${label}: admin pages must not create a second product shell`);
}

const requiredAdminRoutes = [
  "/admin",
  "/admin/companies",
  "/admin/users",
  "/admin/reviews",
  "/admin/experts",
  "/admin/payments",
  "/admin/logistics",
  "/admin/settings"
];
const adminNavSource = read("src/lib/platform-admin.ts");
const adminSectionNavSource = read("src/components/admin-section-nav.tsx");
for (const href of requiredAdminRoutes) {
  requireIncludes(adminNavSource, `href: "${href}"`, "src/lib/platform-admin.ts adminNav");
  requireIncludes(adminSectionNavSource, `"${href}"`, "src/components/admin-section-nav.tsx icons");
  if (href !== "/admin") {
    const pagePath = `src/app${href}/page.tsx`;
    if (!existsSync(join(repoRoot, pagePath))) fail(`${pagePath}: missing admin route page`);
  }
}

const css = read("src/app/globals.css");
const shellRule = cssRule(css, ".lp-shell");
requireIncludes(shellRule, "display: grid", "src/app/globals.css .lp-shell");
requireIncludes(shellRule, "grid-template-columns: 236px minmax(0, 1fr)", "src/app/globals.css .lp-shell");

const sidebarRule = cssRule(css, ".lp-sidebar");
requireIncludes(sidebarRule, "position: sticky", "src/app/globals.css .lp-sidebar");
requireIncludes(sidebarRule, "height: 100vh", "src/app/globals.css .lp-sidebar");

const reviewWorkbench = cssRule(css, ".lp-workbench");
requireIncludes(
  reviewWorkbench,
  "grid-template-columns: minmax(300px, 0.92fr) minmax(360px, 1fr) minmax(270px, 0.72fr)",
  "src/app/globals.css .lp-workbench"
);

const reviewWorkbenchBreakpoint = css.indexOf("@media (max-width: 1220px)");
if (reviewWorkbenchBreakpoint < 0) {
  fail("src/app/globals.css: review console must keep the three-column workbench until the 1220px breakpoint");
}

const homePageSource = read("src/app/page.tsx");
requireIncludes(homePageSource, 'href="#intake"', "src/app/page.tsx top action");
requireIncludes(homePageSource, 'className="lp-intake-panel" id="intake"', "src/app/page.tsx intake anchor");
requireIncludes(homePageSource, "aria-label={route.label}", "src/app/page.tsx route card accessible label");
requireIncludes(homePageSource, "<b>{route.shortLabel}</b>", "src/app/page.tsx compact route card label");
if (homePageSource.includes('onClick={() => void runReview()} disabled={!readiness.canReview || isReviewing}>\n              {isReviewing ? <Loader2 className="lp-spin" size={16} /> : <ShieldCheck size={16} />}\n              1차 검토')) {
  fail("src/app/page.tsx: topbar must not duplicate a disabled review action before intake");
}

const mobileStart = css.indexOf("@media (max-width: 980px)");
const mobileCss = mobileStart >= 0 ? css.slice(mobileStart) : "";
requireCompactIncludes(mobileCss, ".lp-shell { grid-template-columns: 1fr; }", "src/app/globals.css mobile shell");
requireCompactIncludes(mobileCss, ".lp-sidebar { position: static; height: auto;", "src/app/globals.css mobile sidebar");
requireCompactIncludes(
  mobileCss,
  ".lp-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
  "src/app/globals.css mobile primary nav"
);
requireCompactIncludes(mobileCss, ".lp-nav a { justify-content: center;", "src/app/globals.css mobile primary nav links");

const adminPrimaryAction = cssRule(css, ".admin-primary-action");
requireMaxPx(adminPrimaryAction, "min-height", 38, "src/app/globals.css .admin-primary-action");
requireMaxPx(adminPrimaryAction, "font-size", 13, "src/app/globals.css .admin-primary-action");
if (/width\s*:\s*100%/i.test(adminPrimaryAction)) fail("src/app/globals.css .admin-primary-action: must stay compact, not full-width");

const adminSectionNav = cssRule(css, ".admin-section-nav");
requireIncludes(adminSectionNav, "position: sticky", "src/app/globals.css .admin-section-nav");
requireMaxPx(adminSectionNav, "padding", 8, "src/app/globals.css .admin-section-nav");

const adminSectionNavLink = cssRule(css, ".admin-section-nav a");
requireMaxPx(adminSectionNavLink, "min-height", 32, "src/app/globals.css .admin-section-nav a");
requireMaxPx(adminSectionNavLink, "font-size", 12, "src/app/globals.css .admin-section-nav a");

const adminHero = `${cssRule(css, ".admin-hero")} ${cssRule(css, ".admin-section-hero")}`;
requireMaxPx(adminHero, "min-height", 80, "src/app/globals.css admin hero");

const adminHeroTitle = `${cssRule(css, ".admin-hero h1")} ${cssRule(css, ".admin-section-hero h1")}`;
requireMaxPx(adminHeroTitle, "font-size", 20, "src/app/globals.css admin hero title");

const adminMetric = cssRule(css, ".admin-metric");
requireMaxPx(adminMetric, "min-height", 100, "src/app/globals.css .admin-metric");
requireMaxPx(adminMetric, "padding", 14, "src/app/globals.css .admin-metric");

const adminMetricValue = cssRule(css, ".admin-metric strong");
requireMaxPx(adminMetricValue, "font-size", 24, "src/app/globals.css .admin-metric strong");

const adminOpsDryRun = cssRule(css, ".admin-ops-dry-run button");
requireMaxPx(adminOpsDryRun, "min-height", 38, "src/app/globals.css .admin-ops-dry-run button");
requireMaxPx(adminOpsDryRun, "font-size", 13, "src/app/globals.css .admin-ops-dry-run button");
if (/width\s*:\s*100%/i.test(adminOpsDryRun)) fail("src/app/globals.css .admin-ops-dry-run button: must stay compact, not full-width");

const adminRowAction = cssRule(css, ".admin-row-action button");
requireMaxPx(adminRowAction, "min-height", 32, "src/app/globals.css .admin-row-action button");
requireMaxPx(adminRowAction, "font-size", 12, "src/app/globals.css .admin-row-action button");
if (/width\s*:\s*100%/i.test(adminRowAction)) fail("src/app/globals.css .admin-row-action button: must stay compact, not full-width");

if (failures.length) {
  console.error("UI shell audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI shell audit passed: stable sidebar shell and compact admin actions are guarded.");
