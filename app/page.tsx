"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

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

const scopes: Record<string, string> = { municipal: "Municipal", state: "Estadual", federal: "Federal" };

export default function Home() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      supabase.from("proposals").select("id,title,description,government_scope,locality,created_at,categories(name)").eq("status", "approved").order("created_at", { ascending: false }).limit(20)
        .then(({ data, error: queryError }) => {
          if (!active) return;
          if (queryError) setError("Não foi possível carregar as propostas agora.");
          else setProposals((data ?? []) as Proposal[]);
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
      <header className="topbar">
        <Link className="brand" href="/"><span>V</span> Voxia</Link>
        <nav aria-label="Navegação principal"><a href="#propostas">Explorar</a><a href="#como-funciona">Como funciona</a><a href="#referencias">Referências</a></nav>
        <Link className="login" href="/entrar">Entrar</Link>
      </header>
      <section id="inicio" className="hero">
        <div className="profile-row"><span className="avatar">V</span><div><strong>@voxia</strong><small>Participação cidadã</small></div></div>
        <p className="eyebrow">PARTICIPAÇÃO CIDADÃ DIGITAL</p>
        <h1>Ideias que entram no <em>debate público.</em></h1>
        <p>Uma plataforma independente para propor, acompanhar e apoiar mudanças para o Brasil.</p>
        <div className="actions"><a className="primary" href="#propostas">Explorar propostas</a><Link className="secondary" href="/propostas/nova">Apresentar proposta</Link></div>
      </section>
      <section id="propostas" className="section feed">
        <p className="eyebrow">PROPOSTAS APROVADAS</p><h2>O que está em debate</h2>
        {loading && <p className="notice" role="status">Carregando propostas…</p>}
        {!loading && error && <div className="empty" role="status"><p>{error}</p></div>}
        {!loading && !error && proposals.length === 0 && <div className="empty"><div className="empty-icon">✦</div><h3>A comunidade ainda está começando.</h3><p>Quando propostas aprovadas forem publicadas, elas aparecerão aqui. Você já pode criar uma conta e enviar uma ideia para moderação.</p><Link className="primary" href="/entrar">Criar conta</Link></div>}
        {proposals.length > 0 && <div className="proposal-list">{proposals.map((proposal) => <article className="proposal-card" key={proposal.id}><p className="proposal-meta">{(Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name) ?? "Cidadania"} · {scopes[proposal.government_scope] ?? "Brasil"}{proposal.locality ? ` · ${proposal.locality}` : ""}</p><h3>{proposal.title}</h3><p>{proposal.description}</p><small>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</small></article>)}</div>}
      </section>
      <section id="como-funciona" className="steps"><div><p className="eyebrow">SIMPLES E TRANSPARENTE</p><h2>Sua voz tem um caminho.</h2></div><ol><li><strong>01</strong><span><b>Envie</b> uma proposta com problema, solução e referências.</span></li><li><strong>02</strong><span><b>Moderação</b> revisa conteúdo e referências jurídicas sugeridas.</span></li><li><strong>03</strong><span><b>Participe</b> apoiando propostas aprovadas.</span></li></ol></section>
      <section id="referencias" className="section"><p className="eyebrow">BASE PARA DECIDIR</p><h2>Referências jurídicas iniciais</h2><div className="sources">{legalSources.map((source) => <a key={source.title} href={source.url} target="_blank" rel="noreferrer"><small>FONTE OFICIAL</small><h3>{source.title}</h3><p>{source.detail}</p><span>Acessar fonte ↗</span></a>)}</div><p className="notice">As referências têm caráter informativo e não constituem aconselhamento jurídico individual.</p></section>
      <footer>Voxia é uma plataforma independente de participação cidadã. Não representa órgãos públicos.</footer>
    </main>
  );
}
