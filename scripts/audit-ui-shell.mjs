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

const mojibakePattern = /[\uFFFD\uE000-\uF8FF]|(?:銝|嚗|瑼|撟|靽|甈|賳|窶|鴞|貐|諡|麮|穈|篣|謔|渥|庖)/u;

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
    shell: '<AppShell active="review">'
  },
  {
    file: "src/app/workspace/page.tsx",
    shell: '<AppShell active="workspace" className="workspace-shell">'
  },
  {
    file: "src/app/knowledge/page.tsx",
    shell: '<AppShell active="knowledge">'
  },
  {
    file: "src/app/knowledge/aliases/page.tsx",
    shell: '<AppShell active="aliases">'
  },
  {
    file: "src/app/admin/layout.tsx",
    shell: '<AppShell active="admin" className="admin-shell">',
    extra: '<AdminSectionNav badges={badges} />'
  }
];

for (const route of routeShells) {
  const source = read(route.file);
  requireIncludes(source, route.shell, route.file);
  if (route.extra) requireIncludes(source, route.extra, route.file);
}

const appShellSource = read("src/components/app-shell.tsx");
requireIncludes(appShellSource, "AppSidebar", "src/components/app-shell.tsx sidebar ownership");
requireIncludes(appShellSource, "type AppNavKey", "src/components/app-shell.tsx typed active nav");
requireIncludes(appShellSource, '["lp-shell", className].filter(Boolean).join(" ")', "src/components/app-shell.tsx stable shell class composition");
requireIncludes(appShellSource, 'data-app-shell="persistent"', "src/components/app-shell.tsx persistent shell contract");

const reviewHomeSource = read("src/app/page.tsx");
requireIncludes(reviewHomeSource, "actionPlanStats", "src/app/page.tsx review action plan summary");
requireIncludes(reviewHomeSource, "handoffCards", "src/app/page.tsx review operational handoff cards");
requireIncludes(reviewHomeSource, "function handoffCards(result: ReviewResult | null", "src/app/page.tsx handoff cards visible before and after review");
requireIncludes(reviewHomeSource, "const routeHandoffCards = handoffCards(result, selectedRoute);", "src/app/page.tsx steady handoff card source");
requireIncludes(reviewHomeSource, 'className={`lp-action-plan', "src/app/page.tsx review action plan panel");
requireIncludes(reviewHomeSource, 'data-steady-handoff="true"', "src/app/page.tsx stable pre/post review handoff area");
requireIncludes(reviewHomeSource, 'className="lp-handoff-grid"', "src/app/page.tsx review handoff grid");
requireIncludes(reviewHomeSource, 'href: "/workspace#review-queue"', "src/app/page.tsx customer review status handoff link");
requireIncludes(reviewHomeSource, 'href: "/workspace#expert-cases"', "src/app/page.tsx customer expert status handoff link");
requireIncludes(reviewHomeSource, 'href: "/workspace#shipment-events"', "src/app/page.tsx customer shipment status handoff link");
requireIncludes(reviewHomeSource, 'className="lp-route-summary"', "src/app/page.tsx compact selected route summary");
if (reviewHomeSource.includes("<small>{route.description}</small>")) {
  fail("src/app/page.tsx: route selector must stay compact; selected route detail belongs in lp-route-summary");
}
if (/href\s*:\s*"\/admin\//.test(reviewHomeSource) || /href="\/admin\//.test(reviewHomeSource)) {
  fail("src/app/page.tsx: customer review screen must not deep-link directly into admin routes");
}

const workspaceSource = read("src/app/workspace/page.tsx");
requireNoMojibake(workspaceSource, "src/app/workspace/page.tsx");
requireIncludes(workspaceSource, "getPlatformOpsSnapshot", "src/app/workspace/page.tsx workspace ops data");
requireIncludes(workspaceSource, "buildPlatformOpsActionQueue", "src/app/workspace/page.tsx workspace action queue");
requireIncludes(workspaceSource, "workspaceActionQueue", "src/app/workspace/page.tsx customer action queue");
requireIncludes(workspaceSource, "launchHandoffSteps", "src/app/workspace/page.tsx customer launch handoff steps");
requireIncludes(workspaceSource, 'aria-label="전문가·결제·물류 요청 흐름"', "src/app/workspace/page.tsx customer request flow strip");
requireIncludes(workspaceSource, 'item.href !== "/admin/settings"', "src/app/workspace/page.tsx filters internal admin settings");
requireIncludes(workspaceSource, "customerActionHref", "src/app/workspace/page.tsx customer-safe operation href mapping");
requireIncludes(workspaceSource, 'className="workspace-dashboard"', "src/app/workspace/page.tsx workspace layout");
requireIncludes(workspaceSource, 'className="workspace-action-list"', "src/app/workspace/page.tsx workspace action queue UI");
requireIncludes(workspaceSource, 'id="review-queue"', "src/app/workspace/page.tsx review status anchor");
requireIncludes(workspaceSource, 'id="expert-cases"', "src/app/workspace/page.tsx expert status anchor");
requireIncludes(workspaceSource, 'id="shipment-events"', "src/app/workspace/page.tsx shipment status anchor");
requireIncludes(workspaceSource, 'href="/knowledge"', "src/app/workspace/page.tsx knowledge handoff");
if (/href\s*:\s*"\/admin\//.test(workspaceSource) || /href="\/admin\//.test(workspaceSource)) {
  fail("src/app/workspace/page.tsx: customer workspace must not deep-link directly into admin routes");
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

const adminExpertsSource = read("src/app/admin/experts/page.tsx");
const adminPaymentsSource = read("src/app/admin/payments/page.tsx");
requireIncludes(adminExpertsSource, "consultationStages", "src/app/admin/experts/page.tsx consultation pipeline model");
requireIncludes(adminExpertsSource, 'className="admin-pipeline-rail"', "src/app/admin/experts/page.tsx pipeline rail");
requireIncludes(adminExpertsSource, 'className={`admin-gate-card ${paymentRequiredCount > 0 ? "blocked" : "ready"}`}', "src/app/admin/experts/page.tsx payment gate card");
requireIncludes(adminExpertsSource, 'href="/admin/payments"', "src/app/admin/experts/page.tsx payment gate link");
requireIncludes(adminExpertsSource, "payment_required", "src/app/admin/experts/page.tsx payment-required gate copy");
requireIncludes(adminExpertsSource, "admin-stage-chip", "src/app/admin/experts/page.tsx compact row stage chip");
requireIncludes(adminExpertsSource, "chatGateLabel", "src/app/admin/experts/page.tsx friendly chat gate labels");
requireIncludes(adminExpertsSource, 'className="admin-ops-disclosure"', "src/app/admin/experts/page.tsx quiet ops controls");
requireIncludes(adminPaymentsSource, "consultationStages", "src/app/admin/payments/page.tsx consultation pipeline model");
requireIncludes(adminPaymentsSource, 'className="admin-pipeline-rail"', "src/app/admin/payments/page.tsx pipeline rail");
requireIncludes(adminPaymentsSource, "payment_required", "src/app/admin/payments/page.tsx payment-required gate");
requireIncludes(adminPaymentsSource, "chatThreadStatus active", "src/app/admin/payments/page.tsx chat thread gate summary");
requireIncludes(adminPaymentsSource, "admin-stage-chip", "src/app/admin/payments/page.tsx compact row stage chip");
requireIncludes(adminPaymentsSource, "chatGateLabel", "src/app/admin/payments/page.tsx friendly chat gate labels");
requireIncludes(adminPaymentsSource, 'className="admin-ops-disclosure"', "src/app/admin/payments/page.tsx quiet ops controls");
if (adminExpertsSource.indexOf('aria-label="전문가 상담 파이프라인"') > adminExpertsSource.indexOf('aria-label="전문가 매칭 상태 요약"')) {
  fail("src/app/admin/experts/page.tsx: consultation pipeline must appear before metric cards");
}
if (adminPaymentsSource.indexOf('aria-label="결제 상담 파이프라인"') > adminPaymentsSource.indexOf('aria-label="결제 운영 상태 요약"')) {
  fail("src/app/admin/payments/page.tsx: consultation pipeline must appear before metric cards");
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
requireNoMojibake(appSidebarSource, "src/components/app-sidebar.tsx");
requireIncludes(appSidebarSource, 'data-shell-sidebar="persistent"', "src/components/app-sidebar.tsx persistent sidebar contract");
requireIncludes(appSidebarSource, 'data-shell-nav="primary"', "src/components/app-sidebar.tsx primary shell nav contract");
requireIncludes(appSidebarSource, "primaryNavItems", "src/components/app-sidebar.tsx primary nav items");
requireIncludes(appSidebarSource, "utilityNavItems", "src/components/app-sidebar.tsx utility nav items");
requireIncludes(appSidebarSource, "data-shell-nav-count={primaryNavItems.length}", "src/components/app-sidebar.tsx primary shell nav count");
requireIncludes(appSidebarSource, 'data-shell-nav="utility"', "src/components/app-sidebar.tsx utility nav contract");
requireIncludes(appSidebarSource, 'data-shell-nav-item={item.key}', "src/components/app-sidebar.tsx stable nav item ids");
requireIncludes(appSidebarSource, 'className="lp-utility-label"', "src/components/app-sidebar.tsx internal utility label");
for (const navLabel of ["워크스페이스", "검토", "지식 검색"]) {
  requireIncludes(appSidebarSource, `label: "${navLabel}"`, "src/components/app-sidebar.tsx primary nav labels");
}
requireIncludes(appSidebarSource, 'label: "용어 검수"', "src/components/app-sidebar.tsx utility aliases label");
requireIncludes(appSidebarSource, 'label: "운영 관리"', "src/components/app-sidebar.tsx utility nav label");
if (appSidebarSource.indexOf('key: "workspace"') > appSidebarSource.indexOf('key: "review"')) {
  fail("src/components/app-sidebar.tsx: workspace must be the first primary navigation item");
}

const lpNavLink = cssRule(css, ".lp-nav a");
requireIncludes(lpNavLink, "min-width: 0", "src/app/globals.css .lp-nav a");
requireMaxPx(lpNavLink, "min-height", 36, "src/app/globals.css .lp-nav a");
requireMaxPx(lpNavLink, "font-size", 13, "src/app/globals.css .lp-nav a");
requireIncludes(css, ".lp-utility-nav", "src/app/globals.css admin utility nav treatment");
const lpUtilityNav = cssRule(css, ".lp-utility-nav");
requireIncludes(lpUtilityNav, "grid-template-columns: repeat(2, minmax(0, 1fr))", "src/app/globals.css compact utility nav grid");
const lpUtilityNavLink = cssRule(css, ".lp-sidebar .lp-utility-nav a");
requireMaxPx(lpUtilityNavLink, "min-height", 30, "src/app/globals.css .lp-sidebar .lp-utility-nav a");
requireMaxPx(lpUtilityNavLink, "font-size", 11, "src/app/globals.css .lp-sidebar .lp-utility-nav a");
requireIncludes(css, ".lp-utility-label", "src/app/globals.css internal utility label");
requireIncludes(css, ".lp-utility-nav a.active", "src/app/globals.css admin utility active treatment");
requireIncludes(css, ".admin-pipeline-rail", "src/app/globals.css consultation pipeline rail");
requireIncludes(css, ".admin-pipeline-step", "src/app/globals.css consultation pipeline step");
requireIncludes(css, ".admin-gate-grid", "src/app/globals.css consultation gate grid");
requireIncludes(css, ".admin-stage-chip", "src/app/globals.css compact admin stage chip");
requireIncludes(css, ".admin-ops-disclosure", "src/app/globals.css quiet admin ops controls");
if (css.includes('.lp-nav a[data-shell-nav-item="admin"]')) {
  fail('src/app/globals.css: admin must not be styled as a primary .lp-nav tab');
}

const lpButton = cssRule(css, ".lp-button");
requireMaxPx(lpButton, "min-height", 36, "src/app/globals.css .lp-button");
requireMaxPx(lpButton, "font-size", 13, "src/app/globals.css .lp-button");

const routeGrid = cssRule(css, ".lp-route-grid");
requireIncludes(routeGrid, "grid-template-columns: repeat(7, minmax(0, 1fr))", "src/app/globals.css compact route segmented grid");
const routeCard = cssRule(css, ".lp-route-card");
requireIncludes(routeCard, "display: inline-flex", "src/app/globals.css compact route segmented controls");
requireIncludes(routeCard, "text-align: center", "src/app/globals.css centered compact route labels");
requireMaxPx(routeCard, "min-height", 44, "src/app/globals.css .lp-route-card");
requireMaxPx(routeCard, "padding", 8, "src/app/globals.css .lp-route-card");
requireIncludes(css, ".lp-route-summary", "src/app/globals.css selected route summary");
const handoffGrid = cssRule(css, ".lp-handoff-grid");
requireIncludes(handoffGrid, "grid-template-columns: repeat(2, minmax(0, 1fr))", "src/app/globals.css result handoff grid must not compress into four columns");
const handoffCard = cssRule(css, ".lp-handoff-card");
requireMaxPx(handoffCard, "min-height", 76, "src/app/globals.css .lp-handoff-card");

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
requireIncludes(homePageSource, 'href="/workspace"', "src/app/page.tsx workspace top action");
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
  ".lp-nav { grid-template-columns: repeat(3, minmax(0, 1fr));",
  "src/app/globals.css mobile primary nav"
);
requireCompactIncludes(
  mobileCss,
  "@media (max-width: 680px) { .lp-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); } .lp-nav a { flex-direction: column; justify-content: center;",
  "src/app/globals.css narrow mobile primary nav stability"
);
requireCompactIncludes(mobileCss, ".lp-nav a { justify-content: center;", "src/app/globals.css mobile primary nav links");
requireCompactIncludes(
  mobileCss,
  ".admin-section-nav { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow-x: visible;",
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

requireIncludes(css, ".lp-action-plan", "src/app/globals.css review action plan panel");
requireIncludes(css, ".lp-handoff-grid", "src/app/globals.css review handoff grid");
requireIncludes(css, ".lp-handoff-card", "src/app/globals.css review handoff card");
requireIncludes(css, ".lp-handoff-card:hover", "src/app/globals.css review handoff hover");
requireIncludes(css, ".workspace-dashboard", "src/app/globals.css workspace dashboard");
requireIncludes(css, ".workspace-product-row", "src/app/globals.css workspace product rows");
requireIncludes(css, ".workspace-handoff-strip", "src/app/globals.css workspace customer request flow");
requireIncludes(css, ".workspace-handoff-step", "src/app/globals.css workspace customer request flow cards");
requireIncludes(css, ".workspace-action-list", "src/app/globals.css workspace action list");
requireIncludes(css, ".workspace-shipment-grid", "src/app/globals.css workspace shipment grid");
requireIncludes(css, ".workspace-action-item p", "src/app/globals.css compact workspace action copy");
requireIncludes(css, ".workspace-action-item small", "src/app/globals.css compact workspace action metadata");
requireIncludes(css, ".admin-queue-link", "src/app/globals.css linked admin queue card");
requireIncludes(css, ".admin-queue-item.review > span", "src/app/globals.css admin queue review tone");
requireIncludes(css, ".admin-queue-item.waiting > span", "src/app/globals.css admin queue waiting tone");
const workspaceActionCopy = cssRule(css, ".workspace-action-item p");
requireIncludes(workspaceActionCopy, "-webkit-line-clamp: 1", "src/app/globals.css workspace action rows must stay compact");
const workspaceAction = cssRule(css, ".workspace-action-item");
requireIncludes(workspaceAction, "grid-template-columns: 76px minmax(0, 1fr)", "src/app/globals.css workspace action rows must use compact row layout");
const adminQueueCopy = cssRule(css, ".admin-queue-item p");
requireIncludes(adminQueueCopy, "-webkit-line-clamp: 1", "src/app/globals.css admin queue rows must stay compact");
const adminQueueItem = cssRule(css, ".admin-queue-item");
requireIncludes(adminQueueItem, "grid-template-columns: 74px minmax(0, 1fr)", "src/app/globals.css admin queue rows must use compact row layout");

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
requireIncludes(adminOpsCardSource, 'className="admin-connection-checklist"', "src/components/admin-ops-readiness-card.tsx Supabase connection checklist");
requireIncludes(adminOpsCardSource, "SUPABASE_DB_URL", "src/components/admin-ops-readiness-card.tsx DB URL setup copy");
requireIncludes(adminOpsCardSource, "LABELPASS_ENABLE_ADMIN_DB_PREVIEW=1", "src/components/admin-ops-readiness-card.tsx preview gate setup copy");
requireIncludes(adminOpsCardSource, "LABELPASS_ENABLE_ADMIN_DB_WRITES=1", "src/components/admin-ops-readiness-card.tsx write gate setup copy");
requireIncludes(adminOpsCardSource, "LABELPASS_ADMIN_OPS_TOKEN", "src/components/admin-ops-readiness-card.tsx admin token setup copy");
requireIncludes(css, ".admin-ops-disclosure:not([open]) > :not(summary)", "src/app/globals.css closed admin ops disclosure");
requireIncludes(css, ".admin-connection-checklist", "src/app/globals.css Supabase connection checklist");
requireIncludes(css, ".admin-connection-checklist > span.locked", "src/app/globals.css locked connection checklist state");
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
