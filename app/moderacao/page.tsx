"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Report = { report_id: number; proposal_id: string; proposal_title: string; comment_id: number | null; comment_body: string | null; reason: string; created_at: string };
export default function ModerationPage() {
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role !== "moderator" && profile?.role !== "admin") return;
        if (active) setAuthorized(true);
        const { data, error: queryError } = await supabase.rpc("get_open_community_reports");
        if (queryError) throw queryError;
        if (active) setReports((data ?? []) as Report[]);
      } catch { if (active) setError("Não foi possível consultar a fila. Confira a conexão e a migração de moderação."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, []);
  async function resolve(report: Report, hideComment: boolean) {
    const resolution = window.prompt("Registre a decisão da moderação (mínimo 5 caracteres):")?.trim();
    if (!resolution) return;
    try {
      const { error: resolveError } = await createClient().rpc("resolve_community_report", { p_report: report.report_id, p_resolution: resolution, p_hide_comment: hideComment });
      if (resolveError) throw resolveError;
      setReports((current) => current.filter((item) => item.report_id !== report.report_id)); setNotice("Denúncia analisada e decisão registrada.");
    } catch { setError("A decisão não foi salva. Tente novamente."); }
  }
  return <AppShell showRightPanel={false}><section className="content-page"><p className="eyebrow">Área restrita</p><h1 className="page-title">Fila de moderação</h1><p className="page-intro">Denúncias são analisadas por pessoas autorizadas. Conteúdo não é removido automaticamente.</p>
    {loading && <p role="status" className="notice">Verificando permissões e carregando fila…</p>}{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
    {!loading && !authorized && <div className="empty"><h2>Acesso restrito</h2><p>Somente moderadores autorizados podem consultar denúncias.</p><Link href="/">Voltar ao início</Link></div>}
    {!loading && authorized && !error && reports.length===0 && <div className="empty"><h2>Nenhuma denúncia pendente</h2><p>A fila está em dia.</p></div>}
    {authorized && <div className="report-list">{reports.map((report) => <article className="report-card" key={report.report_id}><small>Recebida em {new Date(report.created_at).toLocaleString("pt-BR")}</small><h2>{report.proposal_title}</h2>{report.comment_body && <blockquote>{report.comment_body}</blockquote>}<p><strong>Motivo informado:</strong> {report.reason}</p><Link href={`/explorar#proposta-${report.proposal_id}`}>Abrir proposta →</Link><div className="my-proposal-tools"><button type="button" className="secondary button" onClick={() => void resolve(report,false)}>Manter visível e concluir análise</button>{report.comment_id && <button type="button" className="text-action delete-action" onClick={() => void resolve(report,true)}>Ocultar comentário e concluir</button>}</div></article>)}</div>}
  </section></AppShell>;
}
