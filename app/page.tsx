"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";
import SiteHeader from "./components/SiteHeader";
import ProposalCard from "./components/ProposalCard";

type Proposal = {
  id: string;
  title: string;
  description: string;
  government_scope: string;
  locality: string | null;
  created_at: string;
  categories: { name: string }[] | { name: string } | null;
};

const legalSources = [
  { title: "Constituição Federal", detail: "Base constitucional para direitos, cidadania e políticas públicas.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm" },
  { title: "Lei nº 7.716/1989", detail: "Crimes resultantes de preconceito de raça ou de cor.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm" }
];

export default function Home() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [stats, setStats] = useState<Record<string, { proposal_id: string; support_count: number; comment_count: number }>>({});

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) { setSignedIn(Boolean(data.user)); setAuthLoaded(true); }
      });
      supabase.from("proposals").select("id,title,description,government_scope,locality,created_at,categories(name)").eq("status", "approved").order("created_at", { ascending: false }).limit(20)
        .then(async ({ data, error: queryError }) => {
          if (!active) return;
          if (queryError) setError("Não foi possível carregar as propostas agora.");
          else {
            setProposals((data ?? []) as Proposal[]);
            if (data?.length) {
              const { data: statsData } = await supabase.rpc("get_proposal_stats");
              if (active) setStats(Object.fromEntries(((statsData ?? []) as { proposal_id: string; support_count: number; comment_count: number }[]).map((item) => [item.proposal_id, item])));
            }
          }
          setLoading(false);
        });
    } catch {
      setError("O banco de dados ainda não foi conectado à versão publicada.");
      setLoading(false);
    }
    return () => { active = false; };
  }, []);

  return (
    <main>
      <SiteHeader />
      <section id="inicio" className="hero">
        <div className="profile-row"><span className="avatar"><img src="/VoxIA/voxia-mark.png" alt="" /></span><div><strong>@voxia</strong><small>Participação cidadã</small></div></div>
        <p className="eyebrow">PARTICIPAÇÃO CIDADÃ DIGITAL</p>
        <h1>Ideias que entram no <em>debate público.</em></h1>
        <p>Uma plataforma independente para propor, acompanhar e apoiar mudanças para o Brasil.</p>
        <div className="actions"><a className="primary" href="#propostas">Explorar propostas</a><Link className="secondary" href="/propostas/nova">Apresentar proposta</Link></div>
      </section>
      <section id="propostas" className="section feed">
        <p className="eyebrow">PROPOSTAS APROVADAS</p><h2>O que está em debate</h2>
        {loading && <p className="notice" role="status">Carregando propostas…</p>}
        {!loading && error && <div className="empty" role="status"><p>{error}</p></div>}
        {!loading && !error && proposals.length === 0 && <div className="empty"><div className="empty-icon">✦</div><h3>A comunidade ainda está começando.</h3><p>As propostas publicadas aparecerão aqui. {signedIn ? "Você já pode compartilhar uma ideia com a comunidade." : "Crie uma conta para publicar sua ideia e participar."}</p>{authLoaded && (signedIn ? <Link className="primary" href="/propostas/nova">Apresentar proposta</Link> : <Link className="primary" href="/entrar">Criar conta</Link>)}</div>}
        {proposals.length > 0 && <div className="proposal-list">{proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} initialStats={stats[proposal.id]} />)}</div>}
      </section>
      <section id="como-funciona" className="steps"><div><p className="eyebrow">SIMPLES E TRANSPARENTE</p><h2>Sua voz tem um caminho.</h2></div><ol><li><strong>01</strong><span><b>Envie</b> uma proposta com problema, solução e referências.</span></li><li><strong>02</strong><span><b>Explore</b> recebe sua proposta assim que você publicar.</span></li><li><strong>03</strong><span><b>Participe</b> comentando, apoiando e compartilhando ideias.</span></li></ol></section>
      <section id="referencias" className="section"><p className="eyebrow">BASE PARA DECIDIR</p><h2>Referências jurídicas iniciais</h2><div className="sources">{legalSources.map((source) => <a key={source.title} href={source.url} target="_blank" rel="noreferrer"><small>FONTE OFICIAL</small><h3>{source.title}</h3><p>{source.detail}</p><span>Acessar fonte ↗</span></a>)}</div><p className="notice">As referências têm caráter informativo e não constituem aconselhamento jurídico individual.</p></section>
      <footer>Voxia é uma plataforma independente de participação cidadã. Não representa órgãos públicos.</footer>
    </main>
  );
}
