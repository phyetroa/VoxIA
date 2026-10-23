"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import UserAvatar from "./UserAvatar";
import Brand from "./Brand";

const navigation = [
  { href: "/", label: "Início", icon: "⌂", mobile: true },
  { href: "/explorar", label: "Explorar", icon: "⌕", mobile: true },
  { href: "/rank", label: "Rank", icon: "↗", mobile: true },
  { href: "/salvos", label: "Salvos", icon: "▢", mobile: true },
  { href: "/referencias", label: "Leis e direitos", icon: "§", mobile: false },
  { href: "/noticias", label: "Notícias", icon: "▣", mobile: false },
  { href: "/minhas-propostas", label: "Minhas propostas", icon: "▤", mobile: false },
  { href: "/perfil", label: "Perfil", icon: "◉", mobile: true },
  { href: "/configuracoes", label: "Configurações", icon: "⚙", mobile: false }
];

export default function SiteHeader() {
  const pathname = usePathname().replace(/^\/VoxIA/, "") || "/";
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  return <>
    <aside className="app-sidebar">
      <div className="sidebar-brand"><Brand /></div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigation.map((item) => <Link key={item.href} className={pathname === item.href ? "sidebar-item active" : "sidebar-item"} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
          <span className="sidebar-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </Link>)}
      </nav>
      <Link className="sidebar-create" href="/propostas/nova"><span aria-hidden="true">＋</span> Criar proposta</Link>
      <div className="sidebar-account">
        {user ? <><Link href="/perfil" className="sidebar-user"><UserAvatar user={user} /><span><strong>{user.user_metadata?.name ?? "Minha conta"}</strong><small>{user.email}</small></span></Link><Link className="sidebar-secondary" href="/entrar">Conta e sessão</Link></> : <Link className="sidebar-login" href="/entrar">Entrar ou criar conta</Link>}
      </div>
    </aside>
    <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
      {navigation.filter((item) => item.mobile).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "mobile-nav-item active" : "mobile-nav-item"} aria-current={pathname === item.href ? "page" : undefined}><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></Link>)}
      <Link href="/propostas/nova" className="mobile-nav-item mobile-create"><span aria-hidden="true">＋</span><small>Criar</small></Link>
    </nav>
  </>;
}
