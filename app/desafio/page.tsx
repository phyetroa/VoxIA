"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import AppShell from "../components/AppShell";

type Challenge = { title: string; prompt: string; starts_on: string; ends_on: string };
export default function ChallengePage() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: queryError } = await createClient().rpc("get_current_civic_challenge");
        if (!active) return;
        if (queryError) setError("O desafio está indisponível enquanto a atualização do banco não for aplicada."); else setChallenge((data?.[0] ?? null) as Challenge | null);
      } catch { if (active) setError("Não foi possível carregar o desafio agora."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  return <AppShell showRightPanel={false}><section className="content-page"><p className="eyebrow">Participação em foco</p><h1 className="page-title">Desafio cívico</h1><p className="page-intro">Uma pergunta para transformar uma preocupação local em uma proposta clara e responsável.</p>
    {loading && <p role="status" className="notice">Buscando desafio atual…</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && (challenge ? <article className="challenge-card"><span>VÁLIDO DE {new Date(`${challenge.starts_on}T12:00:00`).toLocaleDateString("pt-BR")} A {new Date(`${challenge.ends_on}T12:00:00`).toLocaleDateString("pt-BR")}</span><h2>{challenge.title}</h2><p>{challenge.prompt}</p><Link className="primary" href="/propostas/nova">Apresentar uma proposta</Link></article> : <div className="empty"><h2>Nenhum desafio ativo</h2><p>Confira as propostas da comunidade enquanto um novo tema é preparado.</p><Link href="/explorar">Explorar propostas</Link></div>)}
  </section></AppShell>;
}
