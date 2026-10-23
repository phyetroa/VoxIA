"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/AppShell";

type NewsItem = { title: string; link: string; summary: string; publishedAt: string };

const feedUrl = "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml";

function plainText(value: string) {
  return new DOMParser().parseFromString(value, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(feedUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("feed unavailable");
      const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("invalid feed");
      const items = Array.from(xml.querySelectorAll("item")).flatMap((item) => {
        const title = item.querySelector("title")?.textContent?.trim() ?? "";
        const rawLink = item.querySelector("link")?.textContent?.trim() ?? "";
        const fullSummary = plainText(item.querySelector("description")?.textContent ?? "");
        const summary = fullSummary.length > 360 ? `${fullSummary.slice(0, 357).trimEnd()}…` : fullSummary;
        const publishedAt = item.querySelector("pubDate")?.textContent?.trim() ?? "";
        try {
          const url = new URL(rawLink);
          if (!title || url.protocol !== "https:" || (url.hostname !== "ebc.com.br" && !url.hostname.endsWith(".ebc.com.br"))) return [];
          return [{ title, link: url.href, summary, publishedAt }];
        } catch {
          return [];
        }
      }).slice(0, 15);
      if (!items.length) throw new Error("no items");
      setNews(items);
      setUpdatedAt(new Date().toISOString());
    } catch {
      setError("Não foi possível carregar as notícias agora. Verifique sua conexão e tente atualizar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNews(); }, [loadNews]);

  return <AppShell showRightPanel={false}><section className="content-page news-page">
    <p className="eyebrow">ACOMPANHE O PAÍS</p>
    <h1 className="page-title">Notícias nacionais</h1>
    <p className="page-intro">Manchetes e resumos recentes da Agência Brasil, direto nesta página. A Voxia não produz nem endossa o conteúdo jornalístico.</p>
    <div className="news-feed-heading"><span className="reference-badge">Agência Brasil · EBC</span><button type="button" className="text-action" onClick={() => void loadNews()} disabled={loading}>{loading ? "Atualizando…" : "Atualizar notícias ↻"}</button></div>
    {loading && <p className="empty" role="status">Carregando as notícias mais recentes…</p>}
    {!loading && error && <div className="empty" role="alert"><h2>Notícias indisponíveis</h2><p>{error}</p><button type="button" className="primary" onClick={() => void loadNews()}>Tentar novamente</button></div>}
    {!loading && !error && <div className="news-list">{news.map((item, index) => <article className="news-item" key={`${item.link}-${index}`}>
      <small>{formatDate(item.publishedAt)} · Agência Brasil</small>
      <h2><a href={item.link} target="_blank" rel="noreferrer">{item.title}</a></h2>
      {item.summary && <p>{item.summary}</p>}
      <a className="news-read-more" href={item.link} target="_blank" rel="noreferrer">Ler matéria completa ↗</a>
    </article>)}</div>}
    {updatedAt && <p className="news-updated">Feed consultado em {formatDate(updatedAt)}. As matérias e seus direitos pertencem à Agência Brasil/EBC.</p>}
    <p className="legal-disclaimer">As notícias são carregadas de um feed RSS público da Agência Brasil. Para ler a matéria completa, você será direcionado ao site da EBC.</p>
  </section></AppShell>;
}
