"use client";

import { BookOpen, ExternalLink, Loader2, Search, Tags } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KnowledgeSearchResult } from "@/lib/knowledge-search";

const examples = ["SDS", "HS코드", "원산지 표시", "INCI", "營養標示", "過敏原標示", "PIF", "化妆品备案"];

export default function KnowledgeSearchClient() {
  const [query, setQuery] = useState("땅콩");
  const [data, setData] = useState<KnowledgeSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!trimmed) {
        setData(null);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      fetch(`/api/knowledge/search?q=${encodeURIComponent(trimmed)}&limit=12`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("search_failed");
          return response.json();
        })
        .then((result: KnowledgeSearchResult) => setData(result))
        .catch((searchError) => {
          if (searchError.name !== "AbortError") setError("Search failed. Try another term.");
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <section className="knowledge-workbench">
      <div className="knowledge-searchbar">
        <Search size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ingredient, CAS, INCI, local name, or source"
          aria-label="Knowledge search"
        />
        {loading && <Loader2 className="spin" size={18} />}
      </div>

      <div className="knowledge-examples">
        {examples.map((example) => (
          <button key={example} onClick={() => setQuery(example)}>
            {example}
          </button>
        ))}
      </div>

      {error && <div className="knowledge-alert">{error}</div>}

      {data && (
        <div className="knowledge-summary">
          <span>{data.totals.terms.toLocaleString()} terms</span>
          <span>{data.totals.aliases.toLocaleString()} aliases</span>
          <span>{data.totals.ruleLinks.toLocaleString()} rule links</span>
          <span>{data.totals.sources.toLocaleString()} sources</span>
        </div>
      )}

      <div className="knowledge-results">
        <section>
          <h2>Matched Terms</h2>
          <div className="knowledge-result-list">
            {data?.terms.map((term) => (
              <article className="knowledge-term" key={term.id}>
                <div className="knowledge-term-head">
                  <Tags size={18} />
                  <div>
                    <h3>{term.canonicalName}</h3>
                    <span>{term.category.replaceAll("_", " ")}</span>
                  </div>
                  <b>{Math.round(term.score)}</b>
                </div>

                <div className="knowledge-aliases">
                  {term.aliases.map((alias) => (
                    <span key={`${term.id}-${alias.value}-${alias.language}-${alias.type}`}>
                      {alias.value}
                      <small>{[alias.type, alias.language, alias.jurisdiction].filter(Boolean).join(" / ")}</small>
                    </span>
                  ))}
                </div>

                <div className="knowledge-identifiers">
                  {term.identifiers.cas.map((value) => <span key={`cas-${value}`}>CAS {value}</span>)}
                  {term.identifiers.inci.slice(0, 4).map((value) => <span key={`inci-${value}`}>INCI {value}</span>)}
                  {term.identifiers.colorIndex.map((value) => <span key={`ci-${value}`}>{value}</span>)}
                </div>

                {term.rules.length > 0 && (
                  <div className="knowledge-rules">
                    {term.rules.slice(0, 6).map((rule) => (
                      <span key={`${term.id}-${rule.ruleCode}`}>
                        {rule.ruleCode}
                        <small>{rule.basis}</small>
                      </span>
                    ))}
                  </div>
                )}

                {term.notes && <p>{term.notes}</p>}
              </article>
            ))}

            {data && data.terms.length === 0 && <div className="knowledge-empty">No matched term yet.</div>}
          </div>
        </section>

        <section>
          <h2>Matched Sources</h2>
          <div className="knowledge-result-list">
            {data?.sources.map((source) => (
              <article className="knowledge-source" key={source.id}>
                <div className="knowledge-term-head">
                  <BookOpen size={18} />
                  <div>
                    <h3>{source.title}</h3>
                    <span>{source.authority}</span>
                  </div>
                </div>
                <div className="knowledge-identifiers">
                  <span>{source.jurisdiction}</span>
                  <span>{source.domain}</span>
                  <span>{source.sourceType}</span>
                  {source.browserCapture && <span>browser capture</span>}
                  {source.manualFallback && <span>manual fallback</span>}
                </div>
                <a href={source.url} target="_blank" rel="noreferrer">
                  Open official source <ExternalLink size={15} />
                </a>
              </article>
            ))}

            {data && data.sources.length === 0 && <div className="knowledge-empty">No matched source yet.</div>}
          </div>
        </section>
      </div>
    </section>
  );
}
