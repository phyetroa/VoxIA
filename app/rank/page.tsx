"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";
import ProposalCard from "../components/ProposalCard";

type Proposal = { id: string; title: string; description: string; problem: string; solution: string; expected_benefits: string | null; government_scope: string; locality: string | null; created_at: string; categories: { name: string }[] | { name: string } | null };
type Stats = { proposal_id: string; support_count: number; comment_count: number; is_author: boolean };

export default function RankPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadRanking() {
      try {
        const supabase = createClient();
        const [proposalResult, statsResult] = await Promise.all([
          supabase.from("proposals").select("id,title,description,problem,solution,expected_benefits,government_scope,locality,created_at,categories(name)").eq("status", "approved").order("created_at", { ascending: false }).limit(100),
          supabase.rpc("get_proposal_stats")
        ]);
        if (proposalResult.error) throw proposalResult.error;
        if (active) {
          setProposals((proposalResult.data ?? []) as Proposal[]);
          setStats(Object.fromEntries(((statsResult.data ?? []) as Stats[]).map((item) => [item.proposal_id, item])));
        }
      } catch {
        if (active) setError("Não foi possível carregar o ranking agora.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadRanking();
    return () => { active = false; };
  }, []);

  const ranked = [...proposals].sort((first, second) => Number(stats[second.id]?.support_count ?? 0) - Number(stats[first.id]?.support_count ?? 0) || new Date(second.created_at).getTime() - new Date(first.created_at).getTime());

  return <AppShell>
    <section className="content-page">
      <p className="eyebrow">Vozes em destaque</p><h1 className="page-title">Rank Voxia</h1><p className="page-intro">As propostas aprovadas com mais apoios da comunidade.</p>
      {loading && <p className="notice" role="status">Carregando ranking…</p>}
      {!loading && error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && ranked.length === 0 && <div className="empty"><h2>O ranking está começando.</h2><p>Quando houver propostas aprovadas, as mais apoiadas aparecerão aqui.</p><Link className="primary" href="/explorar">Explorar propostas</Link></div>}
      {!loading && !error && ranked.length > 0 && <div className="proposal-list">{ranked.map((proposal, index) => <div className="rank-item" key={proposal.id}><span className="rank-number" aria-label={`Posição ${index + 1}`}>#{index + 1}</span><ProposalCard proposal={proposal} initialStats={stats[proposal.id]} /></div>)}</div>}
    </section>
  </AppShell>;
}
