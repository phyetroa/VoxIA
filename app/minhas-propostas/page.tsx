"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Proposal = { id: string; title: string; description: string; status: string; moderation_reason: string | null; created_at: string; government_scope: string; locality: string | null; categories: { name: string }[] | { name: string } | null };
const labels: Record<string, string> = { pending: "Em análise", approved: "Publicada", rejected: "Recusada", changes_requested: "Precisa de ajustes" };

export default function MyProposalsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadMine() {
      try {
        const supabase = createClient();
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (active) setUser(currentUser);
        if (!currentUser) return;
        const { data, error: queryError } = await supabase.from("proposals").select("id,title,description,status,moderation_reason,created_at,government_scope,locality,categories(name)").eq("author_id", currentUser.id).order("created_at", { ascending: false });
        if (queryError) throw queryError;
        if (active) setProposals((data ?? []) as Proposal[]);
      } catch {
        if (active) setError("Não foi possível carregar suas propostas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMine();
    return () => { active = false; };
  }, []);

  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">Seu histórico</p><h1 className="page-title">Minhas propostas</h1><p className="page-intro">Acompanhe suas publicações e o estado de cada proposta.</p>
    {loading && <p className="notice" role="status">Carregando suas propostas…</p>}
    {!loading && !user && <div className="empty"><h2>Entre para ver seu histórico</h2><Link className="primary" href="/entrar">Entrar</Link></div>}
    {!loading && user && error && <p className="form-error" role="alert">{error}</p>}
    {!loading && user && !error && proposals.length === 0 && <div className="empty"><h2>Você ainda não publicou propostas.</h2><p>Compartilhe uma ideia para sua comunidade.</p><Link className="primary" href="/propostas/nova">Criar proposta</Link></div>}
    {!loading && user && !error && <div className="my-proposal-list">{proposals.map((proposal) => <article key={proposal.id} className="my-proposal-card"><div className="my-proposal-heading"><span className={`status-pill status-${proposal.status}`}>{labels[proposal.status] ?? proposal.status}</span><small>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</small></div><h2>{proposal.title}</h2><p>{proposal.description}</p><small>{Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name} · {proposal.government_scope} {proposal.locality ? `· ${proposal.locality}` : ""}</small>{proposal.moderation_reason && <p className="moderation-reason"><strong>Orientação da moderação:</strong> {proposal.moderation_reason}</p>}</article>)}</div>}
  </section></AppShell>;
}
