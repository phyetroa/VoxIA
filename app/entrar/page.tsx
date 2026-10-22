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
    try {
      const supabase = createClient();
      if (new URLSearchParams(window.location.search).has("passwordRecovery")) setMode("update-password");
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY") setMode("update-password");
      });
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
      if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        setUser(data.user);
        setMessage("Login realizado. Você já pode participar da Voxia.");
      } else if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href.split("?")[0] }
        });
        if (authError) throw authError;
        if (data.session) setUser(data.user);
        else setMessage("Conta criada. Se a confirmação de e-mail estiver ativada, confira sua caixa de entrada para concluir o cadastro.");
      } else if (mode === "recovery") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}?passwordRecovery=true`
        });
        if (authError) throw authError;
        setMessage("Se houver uma conta para esse e-mail, enviaremos as instruções para redefinir a senha.");
      } else {
        if (password.length < 8) throw new Error("Use uma senha com pelo menos 8 caracteres.");
        if (password !== confirmation) throw new Error("As senhas não conferem.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setPassword("");
        setConfirmation("");
        setMode("login");
        setMessage("Senha atualizada. Nos próximos acessos, entre com seu e-mail e senha sem precisar de link.");
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes("caracteres") || cause instanceof Error && cause.message.includes("conferem")
        ? cause.message
        : mode === "login"
          ? "E-mail ou senha incorretos. Se sua conta foi criada por link, use “Esqueci minha senha” para cadastrar uma senha."
          : "Não foi possível concluir. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setError("");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMessage("");
  }

  const title = mode === "signup" ? "Crie sua conta" : mode === "recovery" ? "Recupere sua senha" : mode === "update-password" ? "Defina uma senha" : user ? "Você entrou." : "Entre na Voxia";

  return <main className="auth-page"><Brand /><section className="auth-card"><p className="eyebrow">SUA VOZ NO DEBATE</p><h1>{title}</h1>{user && mode !== "update-password" ? <><div className="signed-in-profile"><UserAvatar user={user} size="large"/><div><strong>{user.user_metadata?.name ?? "Sua conta Voxia"}</strong><span>{user.email}</span></div></div><p>Sua sessão está ativa. Agora você pode enviar uma proposta para a comunidade.</p><div className="actions"><Link className="primary" href="/propostas/nova">Apresentar proposta</Link><button className="secondary button" type="button" onClick={handleSignOut}>Sair</button></div></> : <>
    <p>{mode === "login" ? "Entre com seu e-mail e senha. Quem já tem senha não precisa receber link por e-mail." : mode === "signup" ? "Crie sua conta com e-mail e senha para participar da Voxia." : mode === "recovery" ? "Informe o e-mail da conta para receber instruções de recuperação." : "Escolha uma senha para usar nos próximos acessos sem link por e-mail."}</p>
    <form onSubmit={handleSubmit}>
      {mode !== "update-password" && <><label htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com"/> </>}
      {(mode === "login" || mode === "signup" || mode === "update-password") && <><label htmlFor="password">Senha</label><input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres"/></>}
      {mode === "update-password" && <><label htmlFor="confirmation">Confirme a senha</label><input id="confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Digite a senha novamente"/></>}
      <button className="primary" type="submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : mode === "recovery" ? "Enviar instruções" : "Salvar senha"}</button>
    </form>
    {mode === "login" && <div className="auth-options"><button type="button" className="auth-text-button" onClick={() => changeMode("recovery")}>Esqueci minha senha</button><p>Primeira vez aqui? <button type="button" className="auth-text-button" onClick={() => changeMode("signup")}>Criar conta</button></p></div>}
    {(mode === "signup" || mode === "recovery") && <p className="auth-back">Já tem uma senha? <button type="button" className="auth-text-button" onClick={() => changeMode("login")}>Entrar</button></p>}
    {mode === "login" && <p className="notice">A Voxia não entra em uma conta usando apenas o endereço de e-mail: a senha protege sua identidade. Contas antigas criadas por link podem definir uma senha em “Esqueci minha senha”.</p>}
  </>}{message && <p className="success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section></main>;
}
