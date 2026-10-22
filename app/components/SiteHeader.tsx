"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import UserAvatar from "./UserAvatar";
import Brand from "./Brand";

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return <header className="topbar">
    <Brand />
    <nav aria-label="Navegação principal"><a href="/VoxIA/#propostas">Explorar</a><a href="/VoxIA/#como-funciona">Como funciona</a><Link href="/rank">Rank</Link><a href="/VoxIA/#referencias">Referências</a><a href="https://agenciabrasil.ebc.com.br/" target="_blank" rel="noreferrer">Notícias</a></nav>
    {user ? <Link className="account-link" href="/entrar" aria-label={`Conta de ${user.email ?? "usuário"}`}><UserAvatar user={user}/><span>{user.email}</span></Link> : <Link className="login" href="/entrar">Entrar</Link>}
  </header>;
}
