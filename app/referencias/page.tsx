"use client";

import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { createClient } from "../../lib/supabase/client";

type Source = { id: number; name: string; url: string; source_type: "official" | "informational"; verified_at: string | null; is_active: boolean };
type LegalReference = { id: number; norm_name: string; device: string | null; summary: string; official_url: string; verified_at: string | null; is_verified: boolean };

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function ReferencesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [laws, setLaws] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadReferences() {
      try {
        const supabase = createClient();
        const [sourceResult, lawResult] = await Promise.all([
          supabase.from("knowledge_sources").select("id,name,url,source_type,verified_at,is_active").eq("is_active", true).order("id"),
          supabase.from("legal_references").select("id,norm_name,device,summary,official_url,verified_at,is_verified").eq("is_verified", true).order("norm_name")
        ]);
        if (sourceResult.error) throw sourceResult.error;
        if (active) {
          setSources((sourceResult.data ?? []) as Source[]);
          setLaws((lawResult.data ?? []) as LegalReference[]);
        }
      } catch {
        if (active) setError("Não foi possível carregar as referências do banco agora.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReferences();
    return () => { active = false; };
  }, []);

  return <AppShell>
    <section className="content-page">
      <p className="eyebrow">Leis, direitos e fontes</p>
      <h1 className="page-title">Referências para entender e participar.</h1>
      <p className="page-intro">Consulte os textos originais e materiais de apoio. Uma referência ajuda a contextualizar uma proposta, mas não é aconselhamento jurídico.</p>
      <div className="reference-section-heading"><h2>Normas verificadas</h2><span>Catálogo jurídico</span></div>
      {laws.length > 0 ? <div className="reference-grid">{laws.map((law) => <article className="reference-card law-card" key={law.id}>
        <span className="reference-badge verified">Norma verificada</span>
        <h3>{law.norm_name}</h3>
        {law.device && <strong className="reference-device">{law.device}</strong>}
        <p>{law.summary}</p>
        {law.verified_at && <small>Conferida em {formatDate(law.verified_at)}</small>}
        <a href={law.official_url} target="_blank" rel="noreferrer">Ler fonte oficial ↗</a>
      </article>)}</div> : <p className="empty" role="status">{loading ? "Carregando normas…" : "Ainda não há normas verificadas no catálogo."}</p>}
      <div className="reference-section-heading source-heading"><h2>Fontes cadastradas</h2><span>Links do banco Voxia</span></div>
      {loading && <p className="notice" role="status">Carregando fontes…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && sources.length === 0 && <p className="empty">Nenhuma fonte ativa foi cadastrada.</p>}
      <div className="reference-grid">{sources.map((source) => {
        const isElectoral = source.url.includes("tse.jus.br");
        const typeLabel = isElectoral ? "Informação eleitoral oficial" : source.source_type === "official" ? "Fonte institucional" : "Material informativo";
        return <article className="reference-card" key={source.id}>
          <span className={source.verified_at ? "reference-badge verified" : "reference-badge pending"}>{typeLabel}</span>
          <h3>{source.name}</h3>
          <p>{isElectoral ? "Página institucional do TSE com propostas de governo para consulta pública. A Voxia não endossa candidaturas ou conteúdo partidário." : source.source_type === "official" ? "Conteúdo publicado em portal institucional brasileiro." : "Conteúdo explicativo complementar; consulte também a norma original."}</p>
          <small>{source.verified_at ? `Link conferido em ${formatDate(source.verified_at)}` : "Data de conferência não registrada"}</small>
          <a href={source.url} target="_blank" rel="noreferrer">Abrir fonte ↗</a>
        </article>;
      })}</div>
      <p className="legal-disclaimer">A Voxia diferencia texto oficial, material explicativo e informação eleitoral. As associações entre temas e leis são informativas, podem precisar de revisão e não substituem orientação jurídica.</p>
    </section>
  </AppShell>;
}
