"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import UserAvatar from "./UserAvatar";

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return <header className="topbar">
    <Link className="brand" href="/"><span>V</span> Voxia</Link>
    <nav aria-label="Navegação principal"><a href="/#propostas">Explorar</a><a href="/#como-funciona">Como funciona</a><a href="/#referencias">Referências</a></nav>
    {user ? <Link className="account-link" href="/entrar" aria-label={`Conta de ${user.email ?? "usuário"}`}><UserAvatar user={user}/><span>{user.email}</span></Link> : <Link className="login" href="/entrar">Entrar</Link>}
  </header>;
}
