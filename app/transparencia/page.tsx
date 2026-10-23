"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Metrics = { published_proposals: number; total_supports: number; total_comments: number; forwarded_with_evidence: number; official_replies_with_evidence: number; completed_with_evidence: number };
const emptyMetrics: Metrics = { published_proposals: 0, total_supports: 0, total_comments: 0, forwarded_with_evidence: 0, official_replies_with_evidence: 0, completed_with_evidence: 0 };

export default function TransparencyPage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: queryError } = await createClient().rpc("get_public_transparency");
        if (!active) return;
        if (queryError) setError("O painel aguarda a aplicação da migração de transparência no banco.");
        else if (data?.[0]) setMetrics(data[0] as Metrics);
      } catch { if (active) setError("Não foi possível consultar o painel agora."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  const cards = [["Propostas publicadas", metrics.published_proposals], ["Apoios registrados", metrics.total_supports], ["Comentários", metrics.total_comments], ["Encaminhadas com comprovação", metrics.forwarded_with_evidence], ["Respostas oficiais documentadas", metrics.official_replies_with_evidence], ["Resultados concluídos com evidência", metrics.completed_with_evidence]] as const;
  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">Dados abertos da comunidade</p><h1 className="page-title">Transparência Voxia</h1><p className="page-intro">Acompanhe a participação registrada na plataforma e os encaminhamentos que têm comprovação pública.</p>
    {loading && <p role="status" className="notice">Atualizando indicadores…</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {!error && <div className="transparency-grid">{cards.map(([label, value]) => <article className="transparency-card" key={label}><strong>{loading ? "—" : Number(value).toLocaleString("pt-BR")}</strong><span>{label}</span></article>)}</div>}
    <div className="transparency-note"><h2>O que esses números significam</h2><p>Apoios e comentários são atividade interna da Voxia, não representam a população brasileira. Encaminhamentos, respostas e conclusões só entram nos indicadores quando há atualização com link de evidência. Um resultado não é considerado concluído sem comprovação.</p><Link href="/explorar">Consultar propostas e históricos →</Link></div>
  </section></AppShell>;
}
