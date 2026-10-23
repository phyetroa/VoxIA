"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Category = { id: number; name: string };
type Proposal = { id: string; title: string; description: string; problem: string; solution: string; expected_benefits: string | null; category_id: number; status: string; moderation_reason: string | null; created_at: string; government_scope: string; locality: string | null; categories: { name: string }[] | { name: string } | null };
const labels: Record<string, string> = { pending: "Em análise", approved: "Publicada", rejected: "Recusada", changes_requested: "Precisa de ajustes" };

export default function MyProposalsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadMine() {
      try {
        const supabase = createClient();
        const [{ data: { user: currentUser }, error: userError }, { data: rows, error: queryError }, { data: categoryRows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("proposals").select("id,title,description,problem,solution,expected_benefits,category_id,status,moderation_reason,created_at,government_scope,locality,categories(name)").order("created_at", { ascending: false }),
          supabase.from("categories").select("id,name").order("name")
        ]);
        if (userError) throw userError;
        if (!currentUser) { if (active) setUser(null); return; }
        if (queryError) throw queryError;
        if (active) { setUser(currentUser); setProposals((rows ?? []) as Proposal[]); setCategories((categoryRows ?? []) as Category[]); }
      } catch {
        if (active) setError("Não foi possível carregar suas propostas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadMine();
    return () => { active = false; };
  }, []);

  async function saveProposal(event: FormEvent<HTMLFormElement>, proposal: Proposal) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true); setError(""); setNotice("");
    try {
      const { error: saveError } = await createClient().rpc("update_own_proposal", {
        p_proposal: proposal.id, p_title: String(values.get("title")), p_description: String(values.get("description")),
        p_category_id: Number(values.get("category_id")), p_government_scope: String(values.get("government_scope")),
        p_locality: String(values.get("locality") || "") || null, p_problem: String(values.get("problem")),
        p_solution: String(values.get("solution")), p_expected_benefits: String(values.get("expected_benefits") || "") || null
      });
      if (saveError) throw saveError;
      const { data, error: reloadError } = await createClient().from("proposals").select("id,title,description,problem,solution,expected_benefits,category_id,status,moderation_reason,created_at,government_scope,locality,categories(name)").eq("id", proposal.id).single();
      if (reloadError) throw reloadError;
      setProposals((current) => current.map((item) => item.id === proposal.id ? data as Proposal : item));
      setEditing(null); setNotice("Alterações salvas. A publicação continua visível e seu histórico permanece preservado.");
    } catch {
      setError("Não foi possível salvar. Confirme a conexão e se a atualização do banco já foi aplicada.");
    } finally { setSaving(false); }
  }

  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">Seu histórico</p><h1 className="page-title">Minhas propostas</h1><p className="page-intro">Acompanhe suas publicações, faça correções e consulte o caminho documentado de cada proposta.</p>
    {loading && <p className="notice" role="status">Carregando suas propostas…</p>}
    {!loading && !user && <div className="empty"><h2>Entre para ver seu histórico</h2><Link className="primary" href="/entrar">Entrar</Link></div>}
    {!loading && user && error && <p className="form-error" role="alert">{error}</p>}
    {!loading && user && notice && <p className="success" role="status">{notice}</p>}
    {!loading && user && !error && proposals.length === 0 && <div className="empty"><h2>Você ainda não publicou propostas.</h2><p>Compartilhe uma ideia para sua comunidade.</p><Link className="primary" href="/propostas/nova">Criar proposta</Link></div>}
    {!loading && user && <div className="my-proposal-list">{proposals.map((proposal) => <article key={proposal.id} className="my-proposal-card">
      <div className="my-proposal-heading"><span className={`status-pill status-${proposal.status}`}>{labels[proposal.status] ?? proposal.status}</span><small>{new Date(proposal.created_at).toLocaleDateString("pt-BR")}</small></div>
      <h2>{proposal.title}</h2><p>{proposal.description}</p><small>{Array.isArray(proposal.categories) ? proposal.categories[0]?.name : proposal.categories?.name} · {proposal.government_scope} {proposal.locality ? `· ${proposal.locality}` : ""}</small>
      {proposal.moderation_reason && <p className="moderation-reason"><strong>Orientação da moderação:</strong> {proposal.moderation_reason}</p>}
      <div className="my-proposal-tools">{proposal.status === "approved" && <Link className="text-action" href={`/acompanhamento?id=${proposal.id}`}>Acompanhar histórico</Link>}{proposal.status === "approved" && <button className="text-action" type="button" onClick={() => { setEditing(editing === proposal.id ? null : proposal.id); setError(""); }}>Editar proposta</button>}</div>
      {editing === proposal.id && <form className="proposal-form-panel edit-proposal-form" onSubmit={(event) => void saveProposal(event, proposal)}>
        <label htmlFor={`edit-title-${proposal.id}`}>Título</label><input id={`edit-title-${proposal.id}`} name="title" minLength={8} maxLength={140} defaultValue={proposal.title} required />
        <label htmlFor={`edit-description-${proposal.id}`}>Descrição</label><textarea id={`edit-description-${proposal.id}`} name="description" minLength={30} maxLength={8000} defaultValue={proposal.description} required />
        <label htmlFor={`edit-category-${proposal.id}`}>Categoria</label><select id={`edit-category-${proposal.id}`} name="category_id" defaultValue={proposal.category_id} required>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
        <label htmlFor={`edit-scope-${proposal.id}`}>Esfera</label><select id={`edit-scope-${proposal.id}`} name="government_scope" defaultValue={proposal.government_scope}><option value="municipal">Municipal</option><option value="state">Estadual</option><option value="federal">Federal</option></select>
        <label htmlFor={`edit-locality-${proposal.id}`}>Localidade</label><input id={`edit-locality-${proposal.id}`} name="locality" maxLength={140} defaultValue={proposal.locality ?? ""} />
        <label htmlFor={`edit-problem-${proposal.id}`}>Problema</label><textarea id={`edit-problem-${proposal.id}`} name="problem" minLength={10} maxLength={3000} defaultValue={proposal.problem} required />
        <label htmlFor={`edit-solution-${proposal.id}`}>Solução sugerida</label><textarea id={`edit-solution-${proposal.id}`} name="solution" minLength={10} maxLength={3000} defaultValue={proposal.solution} required />
        <label htmlFor={`edit-benefits-${proposal.id}`}>Benefícios esperados</label><textarea id={`edit-benefits-${proposal.id}`} name="expected_benefits" maxLength={3000} defaultValue={proposal.expected_benefits ?? ""} />
        <div className="my-proposal-tools"><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</button><button className="text-action" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
      </form>}
    </article>)}</div>}
  </section></AppShell>;
}
