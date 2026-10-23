"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { getSavedProposalIds, setProposalSaved } from "../../lib/community-preferences";

type Comment = { id: number; body: string; created_at: string; display_name: string };
type Stats = { proposal_id: string; support_count: number; comment_count: number; is_author?: boolean };
type ProposalDetails = { id: string; title: string; description: string; problem?: string; solution?: string; expected_benefits?: string | null; government_scope: string; locality: string | null; created_at: string; categories: { name: string }[] | { name: string } | null };

export default function ProposalCard({ proposal, initialStats }: { proposal: ProposalDetails; initialStats?: Stats }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [supportCount, setSupportCount] = useState(Number(initialStats?.support_count ?? 0));
  const [commentCount, setCommentCount] = useState(Number(initialStats?.comment_count ?? 0));
  const [canDelete, setCanDelete] = useState(Boolean(initialStats?.is_author));
  const [deleted, setDeleted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => setCanDelete(Boolean(initialStats?.is_author)), [initialStats?.is_author]);

  useEffect(() => {
    const syncSaved = () => setSaved(getSavedProposalIds().includes(proposal.id));
    syncSaved();
    window.addEventListener("voxia:saved-changed", syncSaved);
    return () => window.removeEventListener("voxia:saved-changed", syncSaved);
  }, [proposal.id]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function syncUser(currentUserId: string | null) {
      setUserId(currentUserId);
      if (!currentUserId) { setSupported(false); setCanDelete(false); return; }
      const [{ data: support }, { data: ownsProposal }] = await Promise.all([
        supabase.from("proposal_supports").select("proposal_id").eq("proposal_id", proposal.id).eq("profile_id", currentUserId).maybeSingle(),
        supabase.rpc("can_delete_own_proposal", { p_proposal: proposal.id })
      ]);
      if (active) { setSupported(Boolean(support)); setCanDelete(Boolean(ownsProposal)); }
    }
    supabase.auth.getUser().then(({ data }) => { if (active) void syncUser(data.user?.id ?? null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void syncUser(session?.user?.id ?? null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [proposal.id]);

  async function toggleSupport() {
    if (!userId) { setNotice("Entre na sua conta para apoiar uma proposta."); return; }
    setBusy(true); setNotice("");
    try {
      const supabase = createClient();
      const result = supported
        ? await supabase.from("proposal_supports").delete().eq("proposal_id", proposal.id).eq("profile_id", userId)
        : await supabase.from("proposal_supports").insert({ proposal_id: proposal.id, profile_id: userId });
      if (result.error) setNotice(result.error.code === "23505" ? "Você já apoia esta proposta." : "Não foi possível atualizar seu apoio agora.");
      else { setSupported(!supported); setSupportCount((count) => count + (supported ? -1 : 1)); }
    } catch {
      setNotice("Não foi possível conectar ao Voxia. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
    const nextVisible = !showComments;
    setShowComments(nextVisible);
    if (!nextVisible) return;
    setCommentsLoading(true); setNotice("");
    try {
      const { data, error } = await createClient().rpc("get_proposal_comments", { proposal: proposal.id });
      if (error) setNotice("Não foi possível carregar os comentários. Tente novamente.");
      else setComments((data ?? []) as Comment[]);
    } catch {
      setNotice("Não foi possível conectar para carregar os comentários.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function sendComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setNotice("Entre na sua conta para comentar."); return; }
    setBusy(true); setNotice("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("proposal_comments").insert({ proposal_id: proposal.id, author_id: userId, body: comment.trim() });
      if (error) setNotice("Não foi possível publicar o comentário. Verifique o texto e tente novamente.");
      else {
        const { data, error: refreshError } = await supabase.rpc("get_proposal_comments", { proposal: proposal.id });
        if (refreshError) setNotice("Comentário publicado, mas não foi possível atualizar a conversa.");
        else setComments((data ?? []) as Comment[]);
        setCommentCount((count) => count + 1); setComment("");
      }
    } catch {
      setNotice("Não foi possível conectar para publicar o comentário.");
    } finally {
      setBusy(false);
    }
  }

  async function shareProposal() {
    const appRoot = window.location.pathname.startsWith("/VoxIA") ? "/VoxIA" : "";
    const url = `${window.location.origin}${appRoot}/explorar#proposta-${proposal.id}`;
    try {
      if (navigator.share) await navigator.share({ title: proposal.title, text: "Veja esta proposta na Voxia", url });
      else { await navigator.clipboard.writeText(url); setNotice("Link da proposta copiado."); }
    } catch { setNotice("Não foi possível compartilhar o link."); }
  }

  function toggleSaved() {
    const nextSaved = !saved;
    setProposalSaved(proposal.id, nextSaved);
    setSaved(nextSaved);
    setNotice(nextSaved ? "Proposta salva para consultar depois." : "Proposta removida dos salvos.");
  }

  async function deleteProposal() {
    if (!window.confirm("Apagar esta proposta? Os apoios e comentários também serão removidos.")) return;
    setBusy(true); setNotice("");
    try {
      const { error } = await createClient().rpc("delete_own_proposal", { p_proposal: proposal.id });
      if (error) setNotice("Não foi possível apagar a proposta. Apenas o autor pode removê-la.");
      else setDeleted(true);
    } catch {
      setNotice("Não foi possível conectar para apagar a proposta.");
    } finally {
      setBusy(false);
    }
  }

  async function reportContent(commentId?: number) {
    if (!userId) { setNotice("Entre na sua conta para denunciar conteúdo."); return; }
    const reason = window.prompt("Explique por que este conteúdo deve ser revisado (8 a 1.000 caracteres):")?.trim();
    if (!reason) return;
    if (reason.length < 8 || reason.length > 1000) { setNotice("A justificativa precisa ter entre 8 e 1.000 caracteres."); return; }
    setBusy(true); setNotice("");
    try {
      const { error } = await createClient().rpc("report_community_content", { p_proposal: proposal.id, p_comment: commentId ?? null, p_reason: reason });
      if (error) throw error;
      setNotice("Denúncia enviada para revisão. O conteúdo não foi ocultado automaticamente.");
    } catch { setNotice("Não foi possível enviar. Você pode já ter denunciado este conteúdo ou a migração do banco ainda não foi aplicada."); }
    finally { setBusy(false); }
  }

  const category = Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name;
  const scopes: Record<string, string> = { municipal: "Municipal", state: "Estadual", federal: "Federal" };

  if (deleted) return null;

  return <article id={`proposta-${proposal.id}`} className="proposal-card">
    <p className="proposal-meta">{category ?? "Cidadania"} · {scopes[proposal.government_scope] ?? "Brasil"}{proposal.locality ? ` · ${proposal.locality}` : ""}</p>
    <h3>{proposal.title}</h3><p>{proposal.description}</p><small>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</small>
    {(proposal.problem || proposal.solution || proposal.expected_benefits) && <details className="proposal-details"><summary>Problema, solução e benefícios</summary><div>{proposal.problem && <section><strong>Problema identificado</strong><p>{proposal.problem}</p></section>}{proposal.solution && <section><strong>Solução sugerida</strong><p>{proposal.solution}</p></section>}{proposal.expected_benefits && <section><strong>Benefícios esperados</strong><p>{proposal.expected_benefits}</p></section>}</div></details>}
    <div className="proposal-actions"><button className={supported ? "text-action active" : "text-action"} type="button" onClick={toggleSupport} disabled={busy} aria-pressed={supported}>♥ {supportCount} apoios</button><button className="text-action" type="button" onClick={loadComments} disabled={commentsLoading} aria-expanded={showComments}>{commentsLoading ? "Carregando comentários…" : `◷ ${commentCount} comentários`}</button><button className="text-action" type="button" onClick={toggleSaved} aria-pressed={saved}>{saved ? "▣ Salva" : "▢ Salvar"}</button><button className="text-action" type="button" onClick={shareProposal}>↗ Compartilhar</button><Link className="text-action" href={`/acompanhamento?id=${proposal.id}`}>Acompanhar</Link>{userId && <button className="text-action" type="button" onClick={() => void reportContent()} disabled={busy}>Denunciar</button>}{canDelete && <button className="text-action delete-action" type="button" onClick={deleteProposal} disabled={busy}>Apagar</button>}</div>
    {showComments && <section className="comments" aria-label="Comentários da proposta">
      {comments.length === 0 && <p className="notice">Ainda não há comentários. Inicie um debate respeitoso.</p>}
      {comments.map((item) => <div className="comment" key={item.id}><strong>{item.display_name || "Cidadão"}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleDateString("pt-BR")}</small>{userId && <button className="text-action report-comment" type="button" onClick={() => void reportContent(item.id)} disabled={busy}>Denunciar comentário</button>}</div>)}
      {userId ? <form className="comment-form" onSubmit={sendComment}><label className="sr-only" htmlFor={`comment-${proposal.id}`}>Escreva um comentário</label><input id={`comment-${proposal.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} required placeholder="Escreva um comentário respeitoso"/><button type="submit" className="primary" disabled={busy || !comment.trim()}>{busy ? "Enviando…" : "Comentar"}</button></form> : <p className="notice"><Link href="/entrar">Entre na Voxia</Link> para comentar.</p>}
    </section>}
    {notice && <p className="notice" role="status">{notice}</p>}
  </article>;
}
