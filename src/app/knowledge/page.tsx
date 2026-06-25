import Link from "next/link";
import { ArrowLeft, Database, Search, ShieldCheck } from "lucide-react";
import { searchKnowledge } from "@/lib/knowledge-search";
import KnowledgeSearchClient from "./search-client";

export default function KnowledgePage() {
  const totals = searchKnowledge("").totals;

  return (
    <main className="knowledge-shell">
      <section className="knowledge-hero">
        <div>
          <Link className="knowledge-back" href="/">
            <ArrowLeft size={17} />
            Back to review
          </Link>
          <p className="eyebrow">Regulatory memory</p>
          <h1>Ingredient and source search</h1>
          <p>
            Search INCI, CAS, Korean, Traditional Chinese, Simplified Chinese, Japanese, common names,
            abbreviations, and official Taiwan rule aliases from the reusable LabelPass knowledge base.
          </p>
        </div>
        <div className="knowledge-stats">
          <span>
            <Database size={18} />
            {totals.sources.toLocaleString()} official sources
          </span>
          <span>
            <Search size={18} />
            {totals.aliases.toLocaleString()} search aliases
          </span>
          <span>
            <ShieldCheck size={18} />
            {totals.ruleLinks.toLocaleString()} rule links
          </span>
        </div>
      </section>

      <KnowledgeSearchClient />
    </main>
  );
}
