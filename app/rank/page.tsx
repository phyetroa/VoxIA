"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import SiteHeader from "../components/SiteHeader";
import ProposalCard from "../components/ProposalCard";

type Proposal = {
  id: string;
  title: string;
  description: string;
  government_scope: string;
  locality: string | null;
  created_at: string;
  categories: { name: string }[] | { name: string } | null;
};

type Stats = { proposal_id: string; support_count: number; comment_count: number; is_author: boolean };

export default function RankPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([
      supabase.from("proposals").select("id,title,description,government_scope,locality,created_at,categories(name)").eq("status", "approved").order("created_at", { ascending: false }).limit(100),
      supabase.rpc("get_proposal_stats")
    ]).then(([proposalResult, statsResult]) => {
      if (!active) return;
      if (proposalResult.error || statsResult.error) setError("Não foi possível carregar o ranking agora.");
      else {
        setProposals((proposalResult.data ?? []) as Proposal[]);
        setStats(Object.fromEntries(((statsResult.data ?? []) as Stats[]).map((item) => [item.proposal_id, item])));
      }
      setLoading(false);
    }).catch(() => {
      if (active) { setError("Não foi possível carregar o ranking agora."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const ranked = [...proposals].sort((first, second) => {
    const supportDifference = Number(stats[second.id]?.support_count ?? 0) - Number(stats[first.id]?.support_count ?? 0);
    return supportDifference || new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });

  return <main>
    <SiteHeader />
    <section className="section feed rank-page">
      <p className="eyebrow">VOZES EM DESTAQUE</p>
      <h1>Rank Voxia</h1>
      <p className="rank-intro">As propostas aprovadas com mais apoios da comunidade.</p>
      {loading && <p className="notice" role="status">Carregando ranking…</p>}
      {!loading && error && <div className="empty" role="status">{error}</div>}
      {!loading && !error && ranked.length === 0 && <div className="empty"><h2>O ranking está começando.</h2><p>Quando houver propostas aprovadas, as mais apoiadas aparecerão aqui.</p><Link className="primary" href="/#propostas">Explorar propostas</Link></div>}
      {!loading && !error && ranked.length > 0 && <div className="proposal-list">{ranked.map((proposal, index) => <div className="rank-item" key={proposal.id}><span className="rank-number" aria-label={`Posição ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><ProposalCard proposal={proposal} initialStats={stats[proposal.id]} /></div>)}</div>}
    </section>
  </main>;
}
