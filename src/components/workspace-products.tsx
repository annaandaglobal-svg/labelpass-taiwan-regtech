"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, Cloud, Layers, Link2, Check, Users } from "lucide-react";
import {
  deriveProductCard,
  getOwnerKey,
  getTeamKey,
  setTeamKey,
  loadSavedReviews,
  mergeSavedReviews,
  persistSavedReviews,
  skuKeyForReview,
  REVIEW_PIPELINE,
  type ProductCard,
  type SavedReview
} from "@/lib/saved-reviews";
import { fetchArchivedReviews, archiveReview } from "@/lib/review-archive-client";
import { distinctClients, loadSkuMeta, saveSkuMeta, setSkuMetaField, type SkuMeta } from "@/lib/sku-meta";
import { buildShareableReport, encodeReport } from "@/lib/report-share";

function categoryEmoji(category: string) {
  if (category === "화장품") return "🧴";
  if (category === "식품") return "🥫";
  if (category === "건강식품") return "💊";
  if (category === "원료·첨가물") return "🧪";
  if (category === "미용기기") return "🔌";
  return "📦";
}

function nextActionFor(card: ProductCard) {
  if (card.status === "fail") return `수정 필요 ${card.failCount}건 — 성분·표기를 보완한 뒤 다시 검토하세요.`;
  if (card.status === "warn") return `확인 ${card.warnCount}건 — 문구·라벨·증빙을 보강하면 통과 가능성이 올라갑니다.`;
  if (card.status === "needs_info") return "함량·수입자·시험자료 등 추가 자료를 채우면 판정이 확정됩니다.";
  return "즉시 멈출 항목이 없습니다 — 전문가 검수·인허가 서류 준비로 넘어가세요.";
}

const NO_CLIENT = "__none__";

const filters: Array<{ key: "all" | "fail" | "warn" | "pass"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "fail", label: "수정 필요" },
  { key: "warn", label: "확인 권장" },
  { key: "pass", label: "진행 가능" }
];

export function WorkspaceProducts() {
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const [synced, setSynced] = useState(false);
  const [skuMeta, setSkuMeta] = useState<Record<string, SkuMeta>>({});
  const [groupByClient, setGroupByClient] = useState(false);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [copiedKey, setCopiedKey] = useState<string>("");
  const [teamCode, setTeamCode] = useState<string>("");
  const [teamInput, setTeamInput] = useState<string>("");
  const [teamBusy, setTeamBusy] = useState(false);

  // Pull the (opt-in) Supabase archive for the current owner/team scope and merge into local.
  // Disabled/offline → returns silently, leaving localStorage as the source of truth.
  async function pullArchive(local: SavedReview[]): Promise<boolean> {
    const remote = await fetchArchivedReviews(getOwnerKey());
    if (remote.length === 0) return false;
    const merged = mergeSavedReviews(local, remote);
    persistSavedReviews(merged);
    setReviews(merged);
    // Sync organisation tags carried on the archived reviews — fills any SKU not tagged locally
    // (so a teammate's client/assignee tags appear when the same team code is used).
    const localMeta = loadSkuMeta();
    let metaChanged = false;
    for (const review of remote) {
      if (!review.meta || (!review.meta.client && !review.meta.assignee)) continue;
      const key = skuKeyForReview(review);
      if (!localMeta[key]) {
        localMeta[key] = review.meta;
        metaChanged = true;
      }
    }
    if (metaChanged) {
      saveSkuMeta(localMeta);
      setSkuMeta(localMeta);
    }
    return true;
  }

  // Push a SKU's current tags to the archive (upserts the meta on the stored review) so a team
  // code syncs them across devices. No-op when the archive is disabled. Called on input blur.
  function pushMetaToArchive(key: string) {
    const review = reviewByKey.get(key);
    if (!review) return;
    void archiveReview({ ...review, meta: loadSkuMeta()[key] ?? {} }, getOwnerKey());
  }

  useEffect(() => {
    const local = loadSavedReviews();
    setReviews(local);
    setSkuMeta(loadSkuMeta());
    setTeamCode(getTeamKey());
    setTeamInput(getTeamKey());
    let active = true;
    pullArchive(local).then((did) => {
      if (active && did) setSynced(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function applyTeamCode() {
    setTeamBusy(true);
    const clean = setTeamKey(teamInput);
    setTeamCode(clean);
    setTeamInput(clean);
    const did = await pullArchive(loadSavedReviews());
    setSynced(did);
    setTeamBusy(false);
  }

  function leaveTeam() {
    setTeamKey("");
    setTeamCode("");
    setTeamInput("");
    setSynced(false);
  }

  const reviewByKey = useMemo(() => {
    const map = new Map<string, SavedReview>();
    for (const review of reviews) map.set(skuKeyForReview(review), review);
    return map;
  }, [reviews]);

  const cards = useMemo(() => reviews.map(deriveProductCard), [reviews]);

  const clients = useMemo(() => distinctClients(skuMeta), [skuMeta]);

  const counts = useMemo(
    () => ({
      total: cards.length,
      fail: cards.filter((c) => c.status === "fail").length,
      warn: cards.filter((c) => c.status === "warn" || c.status === "needs_info").length,
      pass: cards.filter((c) => c.status === "pass").length
    }),
    [cards]
  );

  const visible = useMemo(() => {
    let list = cards;
    if (filter === "fail") list = list.filter((c) => c.status === "fail");
    else if (filter === "warn") list = list.filter((c) => c.status === "warn" || c.status === "needs_info");
    else if (filter === "pass") list = list.filter((c) => c.status === "pass");
    if (clientFilter !== "all") {
      list = list.filter((c) => {
        const client = skuMeta[c.skuKey]?.client;
        return clientFilter === NO_CLIENT ? !client : client === clientFilter;
      });
    }
    return list;
  }, [cards, filter, clientFilter, skuMeta]);

  // When grouping is on, bucket the visible cards under their client/brand (unassigned last).
  const groups = useMemo(() => {
    if (!groupByClient) return null;
    const buckets = new Map<string, ProductCard[]>();
    for (const card of visible) {
      const client = skuMeta[card.skuKey]?.client || NO_CLIENT;
      const bucket = buckets.get(client) ?? [];
      bucket.push(card);
      buckets.set(client, bucket);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => {
      if (a === NO_CLIENT) return 1;
      if (b === NO_CLIENT) return -1;
      return a.localeCompare(b, "ko");
    });
  }, [groupByClient, visible, skuMeta]);

  function updateMeta(key: string, field: keyof SkuMeta, value: string) {
    setSkuMeta((prev) => setSkuMetaField(prev, key, field, value));
  }

  function supplierRequestHref(card: ProductCard): string | null {
    const review = reviewByKey.get(card.skuKey);
    if (!review) return null;
    const report = buildShareableReport(review.input, review.result);
    return `${window.location.origin}/report/view?d=${encodeReport(report)}`;
  }

  async function copySupplierLink(card: ProductCard) {
    const href = supplierRequestHref(card);
    if (!href) return;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      window.prompt("공급사에 전달할 보완요청 링크를 복사하세요:", href);
    }
    setCopiedKey(card.skuKey);
    window.setTimeout(() => setCopiedKey((current) => (current === card.skuKey ? "" : current)), 2000);
  }

  const teamBar = (
    <div className="wp-team">
      <div className="wp-team-copy">
        <b>팀 워크스페이스</b>
        <span>
          {teamCode
            ? `팀 코드 "${teamCode}"로 연결됨 — 같은 코드를 입력한 기기끼리 제품이 공유됩니다.`
            : "팀 코드를 입력하면 같은 코드를 쓰는 기기끼리 제품이 공유됩니다. 로그인 없는 공용 키이며, 클라우드 저장이 켜져 있어야 실제 동기화됩니다."}
        </span>
      </div>
      <div className="wp-team-controls">
        <input
          type="text"
          value={teamInput}
          placeholder="예: annaanda-team"
          onChange={(event) => setTeamInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void applyTeamCode();
          }}
          aria-label="팀 코드"
        />
        <button type="button" className="lp-button" disabled={teamBusy || !teamInput.trim()} onClick={() => void applyTeamCode()}>
          {teamBusy ? "연결 중…" : "적용"}
        </button>
        {teamCode && (
          <button type="button" className="workspace-button" onClick={leaveTeam}>
            해제
          </button>
        )}
      </div>
    </div>
  );

  if (cards.length === 0) {
    return (
      <article className="workspace-panel workspace-panel-wide">
        {teamBar}
        <div className="wp-empty">
          <Boxes size={22} />
          <b>아직 검토한 제품이 없습니다.</b>
          <span>성분·라벨을 검토하면 실제 제품이 상태별로 여기에 쌓입니다. 여러 제품은 일괄 검토가 빠릅니다. 팀 코드를 입력하면 동료가 검토한 제품을 불러올 수 있습니다.</span>
          <div className="wp-empty-actions">
            <Link className="lp-button" href="/review">
              성분·라벨 검토
              <ArrowRight size={15} />
            </Link>
            <Link className="workspace-button" href="/review/bulk">
              <Layers size={15} />
              여러 제품 일괄 검토
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const renderCard = (card: ProductCard) => {
    const meta = skuMeta[card.skuKey] ?? {};
    const showSupplier = card.status === "fail" || card.status === "warn" || card.status === "needs_info";
    return (
      <div key={card.id} className="pipe-row">
        <div className="pipe-top">
          <div className="ic" aria-hidden="true">
            {categoryEmoji(card.category)}
          </div>
          <div className="pipe-id">
            <div className="nm">{card.name}</div>
            <div className="mt">
              {card.category} · {card.score}/100 · {new Date(card.generatedAt).toLocaleDateString("ko-KR")}
            </div>
          </div>
          <div className="act">
            <span className={`chip ${card.chip}`}>{card.statusLabel}</span>
            <Link className="linkbtn" href="/review">
              다시 검토
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="wp-meta">
          <label className="wp-meta-field">
            <span>클라이언트·브랜드</span>
            <input
              type="text"
              value={meta.client ?? ""}
              placeholder="예: A뷰티 / 자사"
              onChange={(event) => updateMeta(card.skuKey, "client", event.target.value)}
              onBlur={() => pushMetaToArchive(card.skuKey)}
            />
          </label>
          <label className="wp-meta-field">
            <span>담당자</span>
            <input
              type="text"
              value={meta.assignee ?? ""}
              placeholder="예: 김규제"
              onChange={(event) => updateMeta(card.skuKey, "assignee", event.target.value)}
              onBlur={() => pushMetaToArchive(card.skuKey)}
            />
          </label>
          {showSupplier && (
            <button type="button" className="wp-supplier-btn" onClick={() => copySupplierLink(card)}>
              {copiedKey === card.skuKey ? <Check size={13} /> : <Link2 size={13} />}
              {copiedKey === card.skuKey ? "링크 복사됨" : "공급사 보완요청 링크"}
            </button>
          )}
        </div>

        <div className="pipe-steps">
          {REVIEW_PIPELINE.map((label, index) => (
            <div key={label} className={`pstep${index < card.step ? " done" : index === card.step ? " now" : ""}`}>
              {label}
            </div>
          ))}
        </div>
        <p className="pipe-next">다음: {nextActionFor(card)}</p>
      </div>
    );
  };

  return (
    <article className="workspace-panel workspace-panel-wide" data-real-products="true">
      <div className="workspace-panel-head">
        <div>
          <span>
            내 제품 · 검토 결과
            {synced && (
              <em className="wp-sync" title="이 브라우저의 검토가 서버(Supabase)에 저장돼 있습니다">
                <Cloud size={12} />
                클라우드 저장됨
              </em>
            )}
          </span>
          <h2>검토한 {counts.total}개 제품의 상태</h2>
        </div>
        <div className="wp-head-actions">
          <button
            type="button"
            className={groupByClient ? "workspace-button on" : "workspace-button"}
            onClick={() => setGroupByClient((value) => !value)}
            aria-pressed={groupByClient}
          >
            <Users size={15} />
            클라이언트별 보기
          </button>
          <Link className="workspace-button" href="/review/bulk">
            <Layers size={15} />
            일괄 검토
          </Link>
        </div>
      </div>

      {teamBar}

      <div className="wp-filters" role="tablist" aria-label="상태 필터">
        {filters.map((item) => {
          const badge =
            item.key === "all" ? counts.total : item.key === "fail" ? counts.fail : item.key === "warn" ? counts.warn : counts.pass;
          return (
            <button key={item.key} type="button" className={item.key === filter ? "on" : ""} onClick={() => setFilter(item.key)}>
              {item.label} <em>{badge}</em>
            </button>
          );
        })}
      </div>

      {clients.length > 0 && (
        <div className="wp-client-filters" aria-label="클라이언트 필터">
          <button type="button" className={clientFilter === "all" ? "on" : ""} onClick={() => setClientFilter("all")}>
            전체 클라이언트
          </button>
          {clients.map((client) => (
            <button key={client} type="button" className={clientFilter === client ? "on" : ""} onClick={() => setClientFilter(client)}>
              {client}
            </button>
          ))}
          <button type="button" className={clientFilter === NO_CLIENT ? "on" : ""} onClick={() => setClientFilter(NO_CLIENT)}>
            미지정
          </button>
        </div>
      )}

      {groups ? (
        <div className="workspace-product-groups">
          {groups.map(([client, groupCards]) => (
            <section key={client} className="wp-group">
              <div className="wp-group-head">
                <b>{client === NO_CLIENT ? "미지정 클라이언트" : client}</b>
                <em>{groupCards.length}개</em>
              </div>
              <div className="workspace-product-list">{groupCards.map(renderCard)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="workspace-product-list">{visible.map(renderCard)}</div>
      )}
    </article>
  );
}
