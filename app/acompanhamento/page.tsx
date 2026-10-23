"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Update = { id: number; stage: string; description: string; evidence_url: string | null; created_at: string };
const stageLabels: Record<string, string> = { received: "Proposta recebida", discussion: "Em discussão comunitária", analysis: "Em análise ou preparação", forwarded: "Encaminhada ao órgão responsável", awaiting_response: "Aguardando resposta oficial", official_response: "Resposta do órgão", in_progress: "Resultado em andamento", completed: "Resultado concluído" };

export default function TrackingPage() {
  const [proposalId, setProposalId] = useState("");
  const [title, setTitle] = useState("");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    setProposalId(id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) { setError("O link não contém um identificador válido de proposta."); setLoading(false); return; }
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const [{ data: proposal, error: proposalError }, { data, error: updatesError }, { data: { user } }] = await Promise.all([
          supabase.from("proposals").select("id,title").eq("id", id).eq("status", "approved").maybeSingle(),
          supabase.from("proposal_updates").select("id,stage,description,evidence_url,created_at").eq("proposal_id", id).order("created_at", { ascending: true }),
          supabase.auth.getUser()
        ]);
        if (proposalError) throw proposalError;
        if (updatesError) throw updatesError;
        if (!proposal) throw new Error("not_found");
        if (active) {
          setTitle(proposal.title); setUpdates((data ?? []) as Update[]);
          if (user) {
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
            setIsModerator(profile?.role === "moderator" || profile?.role === "admin");
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error && cause.message === "not_found" ? "Esta proposta não está publicada ou não foi encontrada." : "O histórico não carregou. A atualização do banco pode ainda não ter sido aplicada.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function addUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(event.currentTarget);
    setSubmitting(true); setError("");
    try {
      const { error: updateError } = await createClient().rpc("record_proposal_update", {
        p_proposal: proposalId, p_stage: String(values.get("stage")), p_description: String(values.get("description")), p_evidence_url: String(values.get("evidence_url") || "") || null
      });
      if (updateError) throw updateError;
      const { data, error: reloadError } = await createClient().from("proposal_updates").select("id,stage,description,evidence_url,created_at").eq("proposal_id", proposalId).order("created_at", { ascending: true });
      if (reloadError) throw reloadError;
      setUpdates((data ?? []) as Update[]); form.reset();
    } catch { setError("Não foi possível registrar a atualização. Revise os dados e a comprovação exigida para este estágio."); }
    finally { setSubmitting(false); }
  }

  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">Transparência e acompanhamento</p><h1 className="page-title">O caminho da proposta</h1>
    {loading && <p className="notice" role="status">Carregando histórico…</p>}
    {error && <div className="empty"><p className="form-error" role="alert">{error}</p><Link href="/explorar">Voltar para Explorar</Link></div>}
    {!loading && !error && <><h2 className="tracking-proposal-title">{title}</h2><p className="page-intro">As atualizações são registradas por moderadores. Encaminhamentos, respostas e conclusões exigem link de comprovação; a Voxia não declara resultados sem evidência.</p>
      <ol className="tracking-timeline">{updates.map((item) => <li key={item.id}><span className="timeline-dot" aria-hidden="true"/><div><div className="tracking-heading"><strong>{stageLabels[item.stage] ?? "Atualização"}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("pt-BR")}</time></div><p>{item.description}</p>{item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer">Consultar comprovação ↗</a>}</div></li>)}</ol>
      {isModerator && <section className="proposal-form-panel tracking-editor"><h2>Registrar atualização oficial</h2><p className="notice">Esta ação fica associada à sua conta de moderação. Encaminhamento, resposta e conclusão exigem fonte pública HTTPS.</p><form onSubmit={(event) => void addUpdate(event)}><label htmlFor="tracking-stage">Etapa</label><select name="stage" id="tracking-stage" defaultValue="discussion"><option value="discussion">Em discussão comunitária</option><option value="analysis">Em análise ou preparação</option><option value="forwarded">Encaminhada ao órgão responsável</option><option value="awaiting_response">Aguardando resposta oficial</option><option value="official_response">Resposta do órgão</option><option value="in_progress">Resultado em andamento</option><option value="completed">Resultado concluído</option></select><label htmlFor="tracking-description">Descrição e contexto</label><textarea id="tracking-description" name="description" minLength={8} maxLength={3000} required/><label htmlFor="tracking-evidence">Link de comprovação (HTTPS, obrigatório para encaminhamento/resposta/conclusão)</label><input id="tracking-evidence" name="evidence_url" type="url" placeholder="https://…"/><button className="primary" type="submit" disabled={submitting}>{submitting ? "Registrando…" : "Adicionar ao histórico"}</button></form></section>}
      <p className="notice">Uma proposta publicada na Voxia não significa compromisso ou decisão do poder público. O status descreve somente o que foi documentado nesta plataforma.</p>
      <Link href={`/explorar#proposta-${proposalId}`}>Voltar à proposta</Link>
    </>}
  </section></AppShell>;
}
