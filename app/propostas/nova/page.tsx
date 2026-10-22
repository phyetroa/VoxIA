"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase/client";
import AppShell from "../../components/AppShell";

type Category = { id: number; name: string };

export default function NewProposalPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [publishedProposalId, setPublishedProposalId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      Promise.all([supabase.auth.getUser(), supabase.from("categories").select("id,name").order("name")]).then(([userResult, categoryResult]) => {
        if (!active) return;
        setSignedIn(Boolean(userResult.data.user));
        setCategories((categoryResult.data ?? []) as Category[]);
        if (categoryResult.error) setError("Não foi possível carregar as categorias.");
        setLoading(false);
      });
    } catch {
      setError("O acesso ao banco ainda não está configurado.");
      setLoading(false);
    }
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setError("");
    setMessage("");
    const form = new FormData(formElement);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Entre na sua conta antes de enviar uma proposta.");
      const { data: proposalId, error: insertError } = await supabase.rpc("submit_proposal", {
        p_title: String(form.get("title")),
        p_description: String(form.get("description")),
        p_category_id: Number(form.get("category_id")),
        p_government_scope: String(form.get("government_scope")),
        p_locality: String(form.get("locality") || "") || null,
        p_problem: String(form.get("problem")),
        p_solution: String(form.get("solution")),
        p_expected_benefits: String(form.get("expected_benefits") || "") || null
      });
      if (insertError) throw insertError;
      setPublishedProposalId(proposalId as string);
      setMessage("Proposta publicada! Ela já está disponível na área Explorar.");
      formElement.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Não foi possível enviar a proposta agora.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <AppShell showRightPanel={false}><section className="content-page"><p role="status">Carregando…</p></section></AppShell>;
  if (!signedIn) return <AppShell showRightPanel={false}><section className="content-page"><p className="eyebrow">PARTICIPE DA VOXIA</p><h1 className="page-title">Entre para participar</h1><p className="page-intro">Você precisa entrar para enviar uma proposta.</p><Link className="primary" href="/entrar">Entrar com e-mail</Link></section></AppShell>;

  return <AppShell showRightPanel={false}><section className="content-page"><p className="eyebrow">NOVA PARTICIPAÇÃO</p><h1 className="page-title">Apresente uma proposta</h1><p className="page-intro">Após o envio, sua proposta ficará disponível imediatamente na área Explorar.</p><section className="proposal-form-panel"><form onSubmit={handleSubmit}>
    <label htmlFor="title">Título</label><input id="title" name="title" minLength={8} maxLength={140} required/>
    <label htmlFor="description">Descrição detalhada</label><textarea id="description" name="description" minLength={30} maxLength={8000} required rows={5}/>
    <label htmlFor="category_id">Categoria</label><select id="category_id" name="category_id" required defaultValue=""><option value="" disabled>Selecione uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
    <label htmlFor="government_scope">Esfera de governo</label><select id="government_scope" name="government_scope" required defaultValue="federal"><option value="municipal">Municipal</option><option value="state">Estadual</option><option value="federal">Federal</option></select>
    <label htmlFor="locality">Localidade (opcional)</label><input id="locality" name="locality" maxLength={140} placeholder="Cidade, estado ou região"/>
    <label htmlFor="problem">Qual problema precisa ser resolvido?</label><textarea id="problem" name="problem" minLength={10} maxLength={3000} required rows={3}/>
    <label htmlFor="solution">Qual solução você sugere?</label><textarea id="solution" name="solution" minLength={10} maxLength={3000} required rows={3}/>
    <label htmlFor="expected_benefits">Benefícios esperados (opcional)</label><textarea id="expected_benefits" name="expected_benefits" maxLength={3000} rows={3}/>
    <button className="primary" type="submit" disabled={sending}>{sending ? "Publicando…" : "Publicar proposta"}</button>
  </form>{message && <div className="success" role="status"><p>{message}</p>{publishedProposalId && <Link href={`/explorar#proposta-${publishedProposalId}`}>Ver minha proposta em Explorar</Link>}</div>}{error && <p className="form-error" role="alert">{error}</p>}<p className="notice">As publicações são imediatas. Compartilhe apenas informações responsáveis e respeitosas. As referências jurídicas são informativas e não substituem orientação jurídica.</p></section></section></AppShell>;
}
