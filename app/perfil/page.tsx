"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";
import UserAvatar from "../components/UserAvatar";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (active && currentUser) {
          setUser(currentUser);
          setCreatedAt(currentUser.created_at);
          const { data, error: profileError } = await supabase.from("profiles").select("display_name").eq("id", currentUser.id).maybeSingle();
          if (profileError) throw profileError;
          setDisplayName(data?.display_name ?? currentUser.email?.split("@")[0] ?? "Cidadão");
        }
      } catch {
        if (active) setError("Não foi possível carregar seu perfil.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const name = displayName.trim();
    if (name.length < 2 || name.length > 60) { setError("O nome deve ter entre 2 e 60 caracteres."); return; }
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await createClient().from("profiles").update({ display_name: name }).eq("id", user.id);
    if (updateError) setError("Não foi possível salvar seu nome agora.");
    else setMessage("Perfil atualizado.");
    setSaving(false);
  }

  async function connectGoogle() {
    setConnectingGoogle(true);
    setError("");
    try {
      const { error: linkError } = await createClient().auth.linkIdentity({
        provider: "google",
        options: { scopes: "openid email profile", redirectTo: `${window.location.origin}${window.location.pathname}` }
      });
      if (linkError) throw linkError;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "";
      setError(/manual linking|manual_identity_linking/i.test(detail)
        ? "A conexão com Google ainda não está habilitada no Supabase. É preciso ativar o provedor Google e a vinculação manual de identidades."
        : /already linked|identity.*exists/i.test(detail)
          ? "Esta conta Google já está vinculada a outra conta Voxia. Entre na conta correspondente para usar essa foto."
          : "Não foi possível conectar ao Google. Confira a configuração do provedor no Supabase e tente novamente.");
      setConnectingGoogle(false);
    }
  }

  return <AppShell showRightPanel={false}><section className="content-page profile-page">
    <p className="eyebrow">Sua conta</p><h1 className="page-title">Perfil</h1>
    {loading && <p className="notice" role="status">Carregando perfil…</p>}
    {!loading && !user && <div className="empty"><h2>Entre para acessar seu perfil</h2><p>Seu perfil e suas propostas são privados para sua conta.</p><Link className="primary" href="/entrar">Entrar ou criar conta</Link></div>}
    {!loading && user && <>
      <div className="profile-summary"><UserAvatar user={user} size="large"/><div><h2>{displayName}</h2><p>{user.email}</p><small>Membro desde {new Date(createdAt).toLocaleDateString("pt-BR")}</small></div></div>
      {!user.identities?.some((identity) => identity.provider === "google") && <div className="avatar-setup"><p>Para usar a foto do perfil do Gmail, conecte sua conta Google. A Voxia só recebe os dados básicos de perfil autorizados.</p><button className="secondary button" type="button" onClick={connectGoogle} disabled={connectingGoogle}>{connectingGoogle ? "Conectando…" : "Conectar Google para importar foto"}</button><small>Requer que Google OAuth e vinculação de identidades estejam habilitados no Supabase.</small></div>}
      {user.identities?.some((identity) => identity.provider === "google") && !user.identities.find((identity) => identity.provider === "google")?.identity_data?.picture && !user.identities.find((identity) => identity.provider === "google")?.identity_data?.avatar_url && <p className="notice">Conta Google conectada. Não foi encontrada uma foto pública no perfil; exibimos suas iniciais.</p>}
      <form className="profile-form" onSubmit={saveProfile}><label htmlFor="display-name">Nome de exibição</label><input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={60} required/><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar perfil"}</button></form>
      <div className="profile-links"><Link href="/minhas-propostas">Acompanhar minhas propostas →</Link><Link href="/configuracoes">Configurações de aparência →</Link></div>
    </>}
    {message && <p className="success" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </section></AppShell>;
}
