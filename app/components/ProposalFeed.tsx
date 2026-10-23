"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import ProposalCard from "./ProposalCard";
import { getFollowedTopics, setFollowedTopics } from "../../lib/community-preferences";

type Proposal = {
  id: string;
  title: string;
  description: string;
  government_scope: string;
  locality: string | null;
  created_at: string;
  problem: string;
  solution: string;
  expected_benefits: string | null;
  categories: { name: string }[] | { name: string } | null;
};

type Stats = { proposal_id: string; support_count: number; comment_count: number; is_author: boolean };
type FeedTab = "for-you" | "popular" | "recent";

function categoryName(proposal: Proposal) {
  return Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name;
}

export default function ProposalFeed({ mode = "home" }: { mode?: "home" | "explore" }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [search, setSearch] = useState("");
  const [localitySearch, setLocalitySearch] = useState("");
  const [scope, setScope] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [followedTopics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    const syncTopics = () => setTopics(getFollowedTopics());
    syncTopics();
    window.addEventListener("voxia:topics-changed", syncTopics);
    return () => window.removeEventListener("voxia:topics-changed", syncTopics);
  }, []);

  function toggleTopic(topic: string) {
    const next = followedTopics.includes(topic) ? followedTopics.filter((item) => item !== topic) : [...followedTopics, topic];
    setFollowedTopics(next);
    setTopics(next);
  }

  useEffect(() => {
    let active = true;
    const pageSize = 30;
    const start = page * pageSize;
    async function loadFeed() {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const supabase = createClient();
        const [proposalResult, statsResult, categoryResult] = await Promise.all([
          supabase.from("proposals").select("id,title,description,problem,solution,expected_benefits,government_scope,locality,created_at,categories(name)", { count: "exact" }).eq("status", "approved").order("created_at", { ascending: false }).range(start, start + pageSize - 1),
          supabase.rpc("get_proposal_stats"),
          supabase.from("categories").select("name").order("name")
        ]);
        if (!active) return;
        if (proposalResult.error) throw proposalResult.error;
        const nextProposals = (proposalResult.data ?? []) as Proposal[];
        setProposals((current) => page === 0 ? nextProposals : [...current, ...nextProposals.filter((item) => !current.some((existing) => existing.id === item.id))]);
        setHasMore((proposalResult.count ?? start + nextProposals.length) > start + nextProposals.length);
        if (!statsResult.error) setStats((current) => ({ ...current, ...Object.fromEntries(((statsResult.data ?? []) as Stats[]).map((item) => [item.proposal_id, item])) }));
        if (!categoryResult.error) setCategories(((categoryResult.data ?? []) as { name: string }[]).map((item) => item.name));
      } catch {
        if (active) setError("Não foi possível carregar as propostas. Tente novamente em instantes.");
      } finally {
        if (active) setLoading(false);
        if (active) setLoadingMore(false);
      }
    }
    void loadFeed();
    return () => { active = false; };
  }, [page, retryToken]);

  useEffect(() => {
    if (mode !== "explore") return;
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("tema");
    if (topic) { setSearch(topic.replaceAll("-", " ")); setCategory(topic); }
  }, [mode]);

  const visibleProposals = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return proposals.filter((proposal) => {
      const text = `${proposal.title} ${proposal.description} ${proposal.problem} ${proposal.solution} ${proposal.expected_benefits ?? ""} ${proposal.locality ?? ""} ${categoryName(proposal) ?? ""}`.toLocaleLowerCase("pt-BR");
      const locality = (proposal.locality ?? "").toLocaleLowerCase("pt-BR");
      return (!query || text.includes(query))
        && (!localitySearch.trim() || locality.includes(localitySearch.trim().toLocaleLowerCase("pt-BR")))
        && (!scope || proposal.government_scope === scope)
        && (!category || categoryName(proposal) === category);
    }).sort((first, second) => {
      if (tab === "for-you" && followedTopics.length) {
        const firstMatch = followedTopics.includes(categoryName(first) ?? "") ? 1 : 0;
        const secondMatch = followedTopics.includes(categoryName(second) ?? "") ? 1 : 0;
        if (firstMatch !== secondMatch) return secondMatch - firstMatch;
      }
      if (tab === "popular" || tab === "for-you") {
        const supportDifference = Number(stats[second.id]?.support_count ?? 0) - Number(stats[first.id]?.support_count ?? 0);
        if (supportDifference) return supportDifference;
      }
      return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
    });
  }, [proposals, stats, search, localitySearch, scope, category, tab, followedTopics]);

  return <section className="feed-section" aria-label={mode === "home" ? "Feed de propostas" : "Explorar propostas"}>
    {mode === "home" ? <>
      <div className="feed-title-row"><div><p className="eyebrow">Da comunidade</p><h2>Propostas em debate</h2></div><Link className="quiet-link" href="/explorar">Todas as propostas <span aria-hidden="true">→</span></Link></div>
      <Link className="composer-prompt" href="/propostas/nova"><span className="composer-plus" aria-hidden="true">＋</span><span><strong>O que precisa mudar onde você vive?</strong><small>Conte o problema e sugira um caminho.</small></span><span className="composer-button">Escrever proposta</span></Link>
    </> : <>
      <p className="eyebrow">Ideias em circulação</p><h1 className="page-title">Explorar propostas</h1><p className="page-intro">Encontre demandas e soluções por assunto, localidade ou esfera de governo.</p>
      <div className="explore-filters"><label className="sr-only" htmlFor="proposal-search">Buscar propostas</label><input id="proposal-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar problemas e soluções"/><label className="sr-only" htmlFor="locality-filter">Filtrar por município, estado ou bairro</label><input id="locality-filter" type="search" value={localitySearch} onChange={(event) => setLocalitySearch(event.target.value)} placeholder="Município, estado ou bairro"/><label className="sr-only" htmlFor="scope-filter">Filtrar por esfera</label><select id="scope-filter" value={scope} onChange={(event) => setScope(event.target.value)}><option value="">Todas as esferas</option><option value="municipal">Municipal</option><option value="state">Estadual</option><option value="federal">Federal</option></select><label className="sr-only" htmlFor="category-filter">Filtrar por tema</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todos os temas</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><p className="filter-guidance">Informe apenas a cidade, o bairro ou a região — não publique endereços residenciais nem locais que possam expor alguém.</p>
    </>}
    {categories.length > 0 && <section className="interest-panel" aria-label="Temas acompanhados"><div><strong>Assuntos que você acompanha</strong><small>{followedTopics.length ? "Eles aparecem primeiro na sua seleção Para você." : "Marque temas para dar prioridade a eles no seu feed."}</small></div><div className="interest-chips">{categories.slice(0, 10).map((topic) => <button key={topic} type="button" className={followedTopics.includes(topic) ? "interest-chip active" : "interest-chip"} aria-pressed={followedTopics.includes(topic)} onClick={() => toggleTopic(topic)}>{followedTopics.includes(topic) ? "✓ " : "+ "}{topic}</button>)}</div></section>}
    <div className="feed-tabs" role="tablist" aria-label="Ordenar propostas">
      {([{ id: "for-you", label: "Para você" }, { id: "popular", label: "Populares" }, { id: "recent", label: "Recentes" }] as { id: FeedTab; label: string }[]).map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    {loading && <p className="notice" role="status">Carregando propostas…</p>}
    {!loading && error && <div className="empty" role="alert"><h3>Não foi possível carregar</h3><p>{error}</p><button type="button" className="primary" onClick={() => setRetryToken((value) => value + 1)}>Tentar novamente</button></div>}
    {!loading && !error && visibleProposals.length === 0 && <div className="empty"><h3>{proposals.length ? "Nenhuma proposta encontrada" : "Ainda não há propostas publicadas"}</h3><p>{proposals.length ? hasMore ? "Não encontramos resultados nesta parte do feed. Carregue mais propostas ou ajuste os filtros." : "Tente outros termos ou retire algum filtro." : "Quando uma proposta for publicada, você poderá encontrá-la aqui."}</p>{mode === "explore" && (search || localitySearch || scope || category) && <button type="button" className="text-action" onClick={() => { setSearch(""); setLocalitySearch(""); setScope(""); setCategory(""); }}>Limpar filtros</button>}{hasMore && <button type="button" className="primary" onClick={() => setPage((value) => value + 1)} disabled={loadingMore}>{loadingMore ? "Carregando…" : "Carregar mais propostas"}</button>}</div>}
    {!loading && !error && visibleProposals.length > 0 && <div className="proposal-list">{visibleProposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} initialStats={stats[proposal.id]} />)}</div>}
    {!loading && !error && hasMore && visibleProposals.length > 0 && <button type="button" className="load-more-button" onClick={() => setPage((value) => value + 1)} disabled={loadingMore}>{loadingMore ? "Carregando propostas…" : "Carregar mais propostas"}</button>}
  </section>;
}
