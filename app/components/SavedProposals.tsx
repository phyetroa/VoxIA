"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { getSavedProposalIds } from "../../lib/community-preferences";
import ProposalCard from "./ProposalCard";

type Proposal = { id: string; title: string; description: string; government_scope: string; locality: string | null; created_at: string; categories: { name: string }[] | { name: string } | null };
type Stats = { proposal_id: string; support_count: number; comment_count: number; is_author: boolean };

export default function SavedProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setError("");
    const ids = getSavedProposalIds();
    if (!ids.length) { setProposals([]); setLoading(false); return; }
    try {
      const supabase = createClient();
      const [proposalResult, statsResult] = await Promise.all([
        supabase.from("proposals").select("id,title,description,government_scope,locality,created_at,categories(name)").eq("status", "approved").in("id", ids),
        supabase.rpc("get_proposal_stats")
      ]);
      if (proposalResult.error) throw proposalResult.error;
      const fetched = (proposalResult.data ?? []) as Proposal[];
      const order = new Map(ids.map((id, index) => [id, index]));
      fetched.sort((first, second) => (order.get(first.id) ?? 0) - (order.get(second.id) ?? 0));
      setProposals(fetched);
      setStats(Object.fromEntries(((statsResult.data ?? []) as Stats[]).map((item) => [item.proposal_id, item])));
    } catch {
      setError("Não foi possível carregar suas propostas salvas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
    window.addEventListener("voxia:saved-changed", loadSaved);
    return () => window.removeEventListener("voxia:saved-changed", loadSaved);
  }, [loadSaved]);

  return <section className="content-page">
    <p className="eyebrow">SUA COLEÇÃO</p><h1 className="page-title">Propostas salvas</h1><p className="page-intro">Guarde ideias para reler, comparar e acompanhar. Seus salvos ficam neste navegador.</p>
    {loading && <p className="notice" role="status">Carregando propostas salvas…</p>}
    {!loading && error && <div className="empty" role="alert"><p>{error}</p><button type="button" className="text-action" onClick={() => void loadSaved()}>Tentar novamente</button></div>}
    {!loading && !error && proposals.length === 0 && <div className="empty"><h2>Sua coleção começa com uma ideia.</h2><p>Salve propostas que merecem ser acompanhadas e elas ficarão reunidas aqui neste dispositivo.</p><Link className="primary" href="/explorar">Explorar propostas</Link></div>}
    {!loading && !error && proposals.length > 0 && <div className="proposal-list">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} initialStats={stats[proposal.id]} />)}</div>}
  </section>;
}
