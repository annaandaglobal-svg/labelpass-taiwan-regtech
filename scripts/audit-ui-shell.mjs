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

const mojibakePattern = /[�\uE000-\uF8FF]|(?:銝|嚗|瑼|撟|靽|甈|賳|窶|鴞|貐|諡|麮|穈|篣|謔|渥|庖)/u;

function requireNoMojibake(source, label) {
  const match = source.match(mojibakePattern);
  if (match) fail(`${label}: contains mojibake token ${match[0]}`);
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
    extra: '<AdminSectionNav badges={badges} />'
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
const adminUiFiles = [
  ...walk(join(repoRoot, "src/app/admin")).filter((filePath) => filePath.endsWith(".tsx")),
  ...walk(join(repoRoot, "src/components")).filter((filePath) => /admin-.*\.tsx$/.test(relative(repoRoot, filePath).replaceAll("\\", "/"))),
  join(repoRoot, "src/lib/platform-admin.ts")
];
for (const filePath of adminUiFiles) {
  const label = relative(repoRoot, filePath).replaceAll("\\", "/");
  requireNoMojibake(read(label), label);
}
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
requireIncludes(shellRule, "grid-template-columns: 224px minmax(0, 1fr)", "src/app/globals.css .lp-shell");

const sidebarRule = cssRule(css, ".lp-sidebar");
requireIncludes(sidebarRule, "position: sticky", "src/app/globals.css .lp-sidebar");
requireIncludes(sidebarRule, "height: 100dvh", "src/app/globals.css .lp-sidebar");
requireIncludes(sidebarRule, "overflow-y: auto", "src/app/globals.css .lp-sidebar");

const appSidebarSource = read("src/components/app-sidebar.tsx");
requireIncludes(appSidebarSource, 'data-shell-nav="primary"', "src/components/app-sidebar.tsx primary shell nav contract");
requireIncludes(appSidebarSource, "data-shell-nav-count={navItems.length}", "src/components/app-sidebar.tsx primary shell nav count");
requireIncludes(appSidebarSource, 'data-shell-nav-item={item.key}', "src/components/app-sidebar.tsx stable nav item ids");
for (const navLabel of ["검토 콘솔", "지식 검색", "용어 정리", "운영 관리"]) {
  requireIncludes(appSidebarSource, `label: "${navLabel}"`, "src/components/app-sidebar.tsx primary nav labels");
}

const lpNavLink = cssRule(css, ".lp-nav a");
requireMaxPx(lpNavLink, "min-height", 36, "src/app/globals.css .lp-nav a");
requireMaxPx(lpNavLink, "font-size", 13, "src/app/globals.css .lp-nav a");
requireIncludes(css, '.lp-nav a[data-shell-nav-item="admin"]', "src/app/globals.css admin utility nav treatment");
requireIncludes(css, '.lp-nav a[data-shell-nav-item="admin"].active', "src/app/globals.css admin utility active treatment");

const lpButton = cssRule(css, ".lp-button");
requireMaxPx(lpButton, "min-height", 36, "src/app/globals.css .lp-button");
requireMaxPx(lpButton, "font-size", 13, "src/app/globals.css .lp-button");

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
requireIncludes(homePageSource, 'className="lp-button secondary" href="#intake"', "src/app/page.tsx intake top action visual weight");
requireIncludes(homePageSource, 'className="lp-intake-panel" id="intake"', "src/app/page.tsx intake anchor");
requireIncludes(homePageSource, "aria-label={route.label}", "src/app/page.tsx route card accessible label");
requireIncludes(homePageSource, "<b>{route.shortLabel}</b>", "src/app/page.tsx compact route card label");
if (homePageSource.includes('onClick={() => void runReview()} disabled={!readiness.canReview || isReviewing}>\n              {isReviewing ? <Loader2 className="lp-spin" size={16} /> : <ShieldCheck size={16} />}\n              1차 검토')) {
  fail("src/app/page.tsx: topbar must not duplicate a disabled review action before intake");
}

const mobileStart = css.indexOf("@media (max-width: 980px)");
const mobileCss = mobileStart >= 0 ? css.slice(mobileStart) : "";
requireCompactIncludes(mobileCss, ".lp-shell { grid-template-columns: 1fr; }", "src/app/globals.css mobile shell");
requireCompactIncludes(mobileCss, ".lp-sidebar { position: sticky; top: 0; z-index: 20; height: auto;", "src/app/globals.css mobile sidebar");
requireCompactIncludes(
  mobileCss,
  ".lp-nav { grid-template-columns: repeat(4, minmax(0, 1fr));",
  "src/app/globals.css mobile primary nav"
);
requireCompactIncludes(mobileCss, ".lp-nav a { justify-content: center;", "src/app/globals.css mobile primary nav links");
requireCompactIncludes(
  mobileCss,
  ".admin-section-nav { display: flex; flex-wrap: nowrap; overflow-x: auto;",
  "src/app/globals.css mobile admin secondary nav"
);

const adminPrimaryAction = cssRule(css, ".admin-primary-action");
requireMaxPx(adminPrimaryAction, "min-height", 32, "src/app/globals.css .admin-primary-action");
requireMaxPx(adminPrimaryAction, "font-size", 12, "src/app/globals.css .admin-primary-action");
if (/width\s*:\s*100%/i.test(adminPrimaryAction)) fail("src/app/globals.css .admin-primary-action: must stay compact, not full-width");

const adminSectionNav = cssRule(css, ".admin-section-nav");
if (/admin-sidebar|admin-brand|admin-back|admin-nav/.test(css)) fail("src/app/globals.css: legacy separate admin sidebar/nav styles must not return");
requireIncludes(adminSectionNavSource, 'className="admin-section-nav"', "src/components/admin-section-nav.tsx isolated secondary nav class");
if (adminSectionNavSource.includes("admin-nav admin-section-nav")) fail("src/components/admin-section-nav.tsx: secondary admin nav must not inherit oversized admin-nav styles");
requireIncludes(adminSectionNavSource, 'data-shell-nav="admin-secondary"', "src/components/admin-section-nav.tsx secondary shell nav contract");
requireIncludes(adminSectionNavSource, "admin-section-badge", "src/components/admin-section-nav.tsx compact nav badges");
requireIncludes(adminSectionNavSource, "data-admin-section-has-badge", "src/components/admin-section-nav.tsx stable badge marker");
requireIncludes(adminSectionNav, "position: sticky", "src/app/globals.css .admin-section-nav");
requireIncludes(adminSectionNav, "display: grid", "src/app/globals.css .admin-section-nav");
requireIncludes(adminSectionNav, "grid-template-columns: repeat(8, minmax(0, 1fr))", "src/app/globals.css .admin-section-nav");
requireIncludes(adminSectionNav, "box-shadow: none", "src/app/globals.css .admin-section-nav");
requireMaxPx(adminSectionNav, "padding", 8, "src/app/globals.css .admin-section-nav");

const adminSectionNavLink = cssRule(css, ".admin-section-nav a");
requireMaxPx(adminSectionNavLink, "min-height", 30, "src/app/globals.css .admin-section-nav a");
requireMaxPx(adminSectionNavLink, "font-size", 12, "src/app/globals.css .admin-section-nav a");
const adminSectionBadge = cssRule(css, ".admin-section-badge");
requireMaxPx(adminSectionBadge, "height", 18, "src/app/globals.css .admin-section-badge");
requireMaxPx(adminSectionBadge, "font-size", 10, "src/app/globals.css .admin-section-badge");

const adminHero = `${cssRule(css, ".admin-hero")} ${cssRule(css, ".admin-section-hero")}`;
requireMaxPx(adminHero, "min-height", 60, "src/app/globals.css admin hero");

const adminHeroTitle = `${cssRule(css, ".admin-hero h1")} ${cssRule(css, ".admin-section-hero h1")}`;
requireMaxPx(adminHeroTitle, "font-size", 17, "src/app/globals.css admin hero title");

const adminMetric = cssRule(css, ".admin-metric");
requireMaxPx(adminMetric, "min-height", 86, "src/app/globals.css .admin-metric");
requireMaxPx(adminMetric, "padding", 12, "src/app/globals.css .admin-metric");

const adminMetricValue = cssRule(css, ".admin-metric strong");
requireMaxPx(adminMetricValue, "font-size", 21, "src/app/globals.css .admin-metric strong");

const adminOpsDryRun = cssRule(css, ".admin-ops-dry-run button");
requireMaxPx(adminOpsDryRun, "min-height", 38, "src/app/globals.css .admin-ops-dry-run button");
requireMaxPx(adminOpsDryRun, "font-size", 13, "src/app/globals.css .admin-ops-dry-run button");
if (/width\s*:\s*100%/i.test(adminOpsDryRun)) fail("src/app/globals.css .admin-ops-dry-run button: must stay compact, not full-width");

const adminRowAction = cssRule(css, ".admin-row-action button");
requireMaxPx(adminRowAction, "min-height", 32, "src/app/globals.css .admin-row-action button");
requireMaxPx(adminRowAction, "font-size", 12, "src/app/globals.css .admin-row-action button");
if (/width\s*:\s*100%/i.test(adminRowAction)) fail("src/app/globals.css .admin-row-action button: must stay compact, not full-width");

const adminHomeSource = read("src/app/admin/page.tsx");
if (adminHomeSource.includes("AdminOpsReadinessCard")) fail("src/app/admin/page.tsx: operations readiness detail belongs in settings, not the admin landing screen");
const adminOpsCardSource = read("src/components/admin-ops-readiness-card.tsx");
requireIncludes(adminOpsCardSource, '<details className="admin-ops-disclosure">', "src/components/admin-ops-readiness-card.tsx compact disclosure");
requireIncludes(css, ".admin-ops-disclosure:not([open]) > :not(summary)", "src/app/globals.css closed admin ops disclosure");
const rowActionSource = read("src/components/admin-row-action-dry-run.tsx");
requireIncludes(rowActionSource, "<details", "src/components/admin-row-action-dry-run.tsx row action disclosure");
requireIncludes(rowActionSource, "<summary>", "src/components/admin-row-action-dry-run.tsx row action disclosure");
requireIncludes(rowActionSource, 'className="admin-row-action-note"', "src/components/admin-row-action-dry-run.tsx operator note capture");
requireIncludes(rowActionSource, 'className="admin-row-action-lock"', "src/components/admin-row-action-dry-run.tsx locked live apply state");
requireIncludes(rowActionSource, "operator_note_required", "src/components/admin-row-action-dry-run.tsx audit metadata");
requireIncludes(css, ".admin-row-action:not([open]) > :not(summary)", "src/app/globals.css closed row action disclosure");
requireIncludes(css, ".admin-row-action-note input", "src/app/globals.css row action note input");
requireIncludes(css, ".admin-row-action button.admin-row-action-lock", "src/app/globals.css row action locked button");

if (failures.length) {
  console.error("UI shell audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI shell audit passed: stable sidebar shell and compact admin actions are guarded.");
