"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
      return () => listener.subscription.unsubscribe();
    } catch {
      setError("O acesso ainda não está configurado nesta versão do site.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href }
      });
      if (authError) throw authError;
      setMessage("Enviamos um link de acesso para seu e-mail. Abra a mensagem para entrar na Voxia.");
    } catch {
      setError("Não foi possível enviar o link agora. Confira o e-mail e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSignedIn(false);
  }

  return <main className="auth-page"><Link className="brand" href="/"><span>V</span> Voxia</Link><section className="auth-card"><p className="eyebrow">SUA VOZ NO DEBATE</p><h1>{signedIn ? "Você entrou." : "Entre na Voxia"}</h1>{signedIn ? <><p>Sua sessão está ativa. Agora você pode enviar uma proposta para moderação.</p><div className="actions"><Link className="primary" href="/propostas/nova">Apresentar proposta</Link><button className="secondary button" type="button" onClick={handleSignOut}>Sair</button></div></> : <><p>Digite seu e-mail e enviaremos um link seguro para entrar ou criar sua conta.</p><form onSubmit={handleSubmit}><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com"/><button className="primary" type="submit" disabled={loading}>{loading ? "Enviando…" : "Enviar link de acesso"}</button></form><p className="notice">A Voxia usa autenticação por e-mail gerenciada pelo Supabase. Sua senha não é armazenada no site.</p></>}{message && <p className="success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section></main>;
}
