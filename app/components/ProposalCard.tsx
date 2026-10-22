"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

type Comment = { id: number; body: string; created_at: string; display_name: string };
type Stats = { proposal_id: string; support_count: number; comment_count: number };

export default function ProposalCard({ proposal, initialStats }: { proposal: { id: string; title: string; description: string; government_scope: string; locality: string | null; created_at: string; categories: { name: string }[] | { name: string } | null }; initialStats?: Stats }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [supportCount, setSupportCount] = useState(Number(initialStats?.support_count ?? 0));
  const [commentCount, setCommentCount] = useState(Number(initialStats?.comment_count ?? 0));
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      if (data.user) supabase.from("proposal_supports").select("proposal_id").eq("proposal_id", proposal.id).eq("profile_id", data.user.id).maybeSingle().then(({ data: row }) => { if (active) setSupported(Boolean(row)); });
    });
    return () => { active = false; };
  }, [proposal.id]);

  async function toggleSupport() {
    if (!userId) { setNotice("Entre na sua conta para apoiar uma proposta."); return; }
    setBusy(true); setNotice("");
    const supabase = createClient();
    const result = supported
      ? await supabase.from("proposal_supports").delete().eq("proposal_id", proposal.id).eq("profile_id", userId)
      : await supabase.from("proposal_supports").insert({ proposal_id: proposal.id, profile_id: userId });
    if (result.error) setNotice("Não foi possível atualizar seu apoio agora.");
    else { setSupported(!supported); setSupportCount((count) => count + (supported ? -1 : 1)); }
    setBusy(false);
  }

  async function loadComments() {
    const nextVisible = !showComments;
    setShowComments(nextVisible);
    if (!nextVisible) return;
    const { data, error } = await createClient().rpc("get_proposal_comments", { proposal: proposal.id });
    if (error) setNotice("Não foi possível carregar os comentários.");
    else setComments((data ?? []) as Comment[]);
  }

  async function sendComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setNotice("Entre na sua conta para comentar."); return; }
    setBusy(true); setNotice("");
    const { error } = await createClient().from("proposal_comments").insert({ proposal_id: proposal.id, author_id: userId, body: comment.trim() });
    if (error) setNotice("Não foi possível publicar o comentário. Verifique o texto e tente novamente.");
    else {
      const { data } = await createClient().rpc("get_proposal_comments", { proposal: proposal.id });
      setComments((data ?? []) as Comment[]); setCommentCount((count) => count + 1); setComment("");
    }
    setBusy(false);
  }

  async function shareProposal() {
    const url = `${window.location.origin}${window.location.pathname}#proposta-${proposal.id}`;
    try {
      if (navigator.share) await navigator.share({ title: proposal.title, text: "Veja esta proposta na Voxia", url });
      else { await navigator.clipboard.writeText(url); setNotice("Link da proposta copiado."); }
    } catch { setNotice("Não foi possível compartilhar o link."); }
  }

  const category = Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name;
  const scopes: Record<string, string> = { municipal: "Municipal", state: "Estadual", federal: "Federal" };

  return <article id={`proposta-${proposal.id}`} className="proposal-card">
    <p className="proposal-meta">{category ?? "Cidadania"} · {scopes[proposal.government_scope] ?? "Brasil"}{proposal.locality ? ` · ${proposal.locality}` : ""}</p>
    <h3>{proposal.title}</h3><p>{proposal.description}</p><small>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</small>
    <div className="proposal-actions"><button className={supported ? "text-action active" : "text-action"} type="button" onClick={toggleSupport} disabled={busy} aria-pressed={supported}>♥ {supportCount} apoios</button><button className="text-action" type="button" onClick={loadComments}>◷ {commentCount} comentários</button><button className="text-action" type="button" onClick={shareProposal}>↗ Compartilhar</button></div>
    {showComments && <section className="comments" aria-label="Comentários da proposta">
      {comments.length === 0 && <p className="notice">Ainda não há comentários. Inicie um debate respeitoso.</p>}
      {comments.map((item) => <div className="comment" key={item.id}><strong>{item.display_name || "Cidadão"}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleDateString("pt-BR")}</small></div>)}
      {userId ? <form className="comment-form" onSubmit={sendComment}><label className="sr-only" htmlFor={`comment-${proposal.id}`}>Escreva um comentário</label><input id={`comment-${proposal.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} required placeholder="Escreva um comentário respeitoso"/><button type="submit" className="primary" disabled={busy || !comment.trim()}>{busy ? "Enviando…" : "Comentar"}</button></form> : <p className="notice"><Link href="/entrar">Entre na Voxia</Link> para comentar.</p>}
    </section>}
    {notice && <p className="notice" role="status">{notice}</p>}
  </article>;
}
