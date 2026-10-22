"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import UserAvatar from "../components/UserAvatar";
import Brand from "../components/Brand";

type AuthMode = "login" | "signup" | "recovery" | "update-password";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      if (new URLSearchParams(window.location.search).has("passwordRecovery")) setMode("update-password");
      supabase.auth.getUser().then(({ data }) => {
        if (active) setUser(data.user);
      }).catch(() => {
        if (active) setError("Não foi possível verificar sua sessão. Atualize a página e tente novamente.");
      });
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY") setMode("update-password");
      });
      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch {
      setError("O acesso ao Supabase ainda não está configurado.");
      return () => { active = false; };
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (authError) throw authError;
        setUser(data.user);
        setMessage("Você entrou na Voxia. Sua sessão está ativa.");
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Use uma senha com pelo menos 8 caracteres.");
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });
        if (authError) throw authError;

        if (!data.session || !data.user) {
          setUser(null);
          setMessage("Não foi possível iniciar sua sessão. Se você já tem uma conta, entre ou recupere sua senha.");
          return;
        }

        setUser(data.user);
        setMessage("Conta criada. Você já está conectado e pode participar da Voxia.");
      } else if (mode === "recovery") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}${window.location.pathname}?passwordRecovery=true`
        });
        if (authError) throw authError;
        setMessage("Se houver uma conta para esse e-mail, enviaremos as instruções de recuperação.");
      } else {
        if (password.length < 8) throw new Error("Use uma senha com pelo menos 8 caracteres.");
        if (password !== confirmation) throw new Error("As senhas não conferem.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setPassword("");
        setConfirmation("");
        setMode("login");
        setMessage("Senha atualizada. Entre com seu e-mail e a nova senha.");
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "";
      if (detail.includes("caracteres") || detail.includes("conferem")) setError(detail);
      else if (/invalid login credentials/i.test(detail)) setError("E-mail ou senha incorretos. Confira os dados ou recupere sua senha.");
      else if (/user already registered/i.test(detail)) setError("Este e-mail já possui conta. Use a opção Entrar ou recupere sua senha.");
      else if (/email not confirmed/i.test(detail)) setError("Esta conta antiga ainda está pendente de confirmação no Supabase. Peça a confirmação ao administrador ou crie uma conta com outro e-mail.");
      else if (/rate limit|too many requests|over_email_send_rate_limit/i.test(detail)) setError("O serviço limitou temporariamente as tentativas. Aguarde um pouco e tente novamente.");
      else if (/signup.*disabled|signups not allowed/i.test(detail)) setError("O cadastro está desativado nas configurações de autenticação do Supabase.");
      else if (/password.*(weak|short|characters)|at least \d+ characters/i.test(detail)) setError("A senha não atende ao mínimo exigido pelo Supabase. Use uma senha mais longa.");
      else if (/invalid email/i.test(detail)) setError("Confira o formato do e-mail e tente novamente.");
      else if (/failed to fetch|network|fetch/i.test(detail)) setError("Não foi possível conectar ao Supabase. Verifique sua internet e tente novamente.");
      else setError(detail ? `O Supabase recusou a operação: ${detail}` : "Não foi possível concluir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    setPassword("");
    setConfirmation("");
  }

  async function handleSignOut() {
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await createClient().auth.signOut();
      if (authError) throw authError;
      setUser(null);
      setMessage("Você saiu da sua conta.");
      setMode("login");
      setPassword("");
    } catch {
      setError("Não foi possível sair agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signup" ? "Crie sua conta" : mode === "recovery" ? "Recupere sua senha" : mode === "update-password" ? "Defina uma senha" : user ? "Você entrou." : "Entre na Voxia";

  return <main className="auth-page">
    <Brand />
    <section className="auth-card">
      <p className="eyebrow">SUA VOZ NO DEBATE</p>
      <h1>{title}</h1>
      {user && mode !== "update-password" ? <>
        <div className="signed-in-profile">
          <UserAvatar user={user} size="large" />
          <div><strong>{user.user_metadata?.name ?? "Sua conta Voxia"}</strong><span>{user.email}</span></div>
        </div>
        <p>Sua sessão está ativa. Agora você pode participar da comunidade.</p>
        <div className="actions">
          <Link className="primary" href="/propostas/nova">Apresentar proposta</Link>
          <button className="secondary button" type="button" onClick={handleSignOut} disabled={loading}>{loading ? "Saindo…" : "Sair"}</button>
        </div>
      </> : <>
        {mode === "login" || mode === "signup" ? <div className="auth-tabs" role="tablist" aria-label="Acesso à Voxia">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Entrar</button>
          <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}>Criar conta</button>
        </div> : null}
        <p>{mode === "login" ? "Entre com o e-mail e a senha da sua conta." : mode === "signup" ? "Crie sua conta com e-mail e senha. O acesso é liberado assim que o cadastro for concluído." : mode === "recovery" ? "Informe seu e-mail para receber instruções de recuperação da senha." : "Escolha uma nova senha para sua conta."}</p>
        <form onSubmit={handleSubmit}>
          {mode !== "update-password" && <>
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" />
          </>}
          {(mode === "login" || mode === "signup" || mode === "update-password") && <>
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "Sua senha" : "Pelo menos 8 caracteres"} />
          </>}
          {mode === "update-password" && <>
            <label htmlFor="confirmation">Confirme a nova senha</label>
            <input id="confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Digite a senha novamente" />
          </>}
          <button className="primary auth-submit" type="submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta e entrar" : mode === "recovery" ? "Enviar instruções" : "Salvar nova senha"}</button>
        </form>
        {mode === "login" && <button type="button" className="auth-text-button recovery-link" onClick={() => changeMode("recovery")}>Esqueci minha senha</button>}
        {(mode === "recovery" || mode === "update-password") && <p className="auth-back"><button type="button" className="auth-text-button" onClick={() => changeMode("login")}>Voltar para entrar</button></p>}
        {mode === "login" && <p className="notice">Sua conta é protegida pela senha. Não compartilhe seus dados de acesso.</p>}
      </>}
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </main>;
}
