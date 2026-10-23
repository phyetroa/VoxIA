"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Notification = { id: number; proposal_id: string | null; kind: string; message: string; created_at: string; read_at: string | null };
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setSignedIn(Boolean(user));
        if (user) {
          const { data, error: queryError } = await supabase.from("notifications").select("id,proposal_id,kind,message,created_at,read_at").order("created_at", { ascending: false }).limit(50);
          if (queryError) throw queryError;
          setItems((data ?? []) as Notification[]);
        }
      } catch { if (active) setError("Não foi possível carregar as notificações. A atualização do banco pode ainda não ter sido aplicada."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, []);
  async function markRead(item: Notification) {
    try {
      const { error: updateError } = await createClient().rpc("mark_notification_read", { p_notification: item.id });
      if (updateError) throw updateError;
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
    } catch { setError("Não foi possível marcar como lida. Tente novamente."); }
  }
  return <AppShell showRightPanel={false}><section className="content-page"><p className="eyebrow">Atividade da sua conta</p><h1 className="page-title">Notificações</h1><p className="page-intro">Apoios, comentários e atualizações documentadas das suas propostas.</p>
    {loading && <p className="notice" role="status">Carregando…</p>}{error && <p className="form-error" role="alert">{error}</p>}{!loading && !signedIn && <div className="empty"><p>Entre para consultar suas notificações.</p><Link className="primary" href="/entrar">Entrar</Link></div>}
    {!loading && signedIn && items.length===0 && !error && <div className="empty"><h2>Nenhuma notificação por enquanto</h2><p>Quando alguém apoiar, comentar ou registrar uma atualização, ela aparecerá aqui.</p></div>}
    <div className="notification-list">{items.map((item) => <article key={item.id} className={item.read_at ? "notification-item" : "notification-item unread"}><div><p>{item.message}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("pt-BR")}</time></div><div className="my-proposal-tools">{item.proposal_id && <Link href={`/acompanhamento?id=${item.proposal_id}`}>Ver histórico</Link>}{!item.read_at && <button className="text-action" type="button" onClick={() => void markRead(item)}>Marcar como lida</button>}</div></article>)}</div>
  </section></AppShell>;
}
