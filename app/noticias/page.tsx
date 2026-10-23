"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";

type NewsItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: string;
  image: string;
  source: string;
  region: string;
};

type NewsFeed = {
  updatedAt: string;
  articles: NewsItem[];
  unavailableSources: string[];
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [unavailableSources, setUnavailableSources] = useState<string[]>([]);
  const [region, setRegion] = useState("Todas");

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/VoxIA/news-feed.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("feed unavailable");
      const feed = await response.json() as NewsFeed;
      if (!Array.isArray(feed.articles) || !feed.articles.length) throw new Error("no items");
      setNews(feed.articles);
      setUpdatedAt(feed.updatedAt);
      setUnavailableSources(feed.unavailableSources ?? []);
    } catch {
      setError("Não foi possível carregar as notícias agora. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNews(); }, [loadNews]);

  const visibleNews = useMemo(() => region === "Todas" ? news : news.filter((item) => item.region === region), [news, region]);

  return <AppShell showRightPanel={false}><section className="content-page news-page">
    <p className="eyebrow">Acompanhe o país</p>
    <h1 className="page-title">Notícias nacionais</h1>
    <p className="page-intro">Manchetes e imagens de veículos jornalísticos reconhecidos, incluindo G1/Globo e notícias do G1 Pernambuco, com reportagens do NE1 quando publicadas no portal. A Voxia não produz nem endossa o conteúdo jornalístico.</p>
    <div className="news-feed-heading">
      <div className="news-filters" aria-label="Filtrar notícias por região">
        {["Todas", "Brasil", "Pernambuco"].map((value) => <button type="button" key={value} className={`news-filter${region === value ? " active" : ""}`} aria-pressed={region === value} onClick={() => setRegion(value)}>{value}</button>)}
      </div>
      <button type="button" className="text-action" onClick={() => void loadNews()} disabled={loading}>{loading ? "Atualizando…" : "Atualizar notícias ↻"}</button>
    </div>
    {loading && <p className="empty" role="status">Carregando as notícias mais recentes…</p>}
    {!loading && error && <div className="empty" role="alert"><h2>Notícias indisponíveis</h2><p>{error}</p><button type="button" className="primary" onClick={() => void loadNews()}>Tentar novamente</button></div>}
    {!loading && !error && visibleNews.length === 0 && <p className="empty" role="status">Ainda não há notícias para este filtro.</p>}
    {!loading && !error && visibleNews.length > 0 && <div className="news-list">{visibleNews.map((item) => <article className="news-item" key={item.link}>
      {item.image && <img className="news-cover" src={item.image} alt={`Imagem da matéria: ${item.title}`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
      <div className="news-content">
        <small>{formatDate(item.publishedAt)} · {item.source}</small>
        <h2><a href={item.link} target="_blank" rel="noreferrer">{item.title}</a></h2>
        {item.summary && <p>{item.summary}</p>}
        <a className="news-read-more" href={item.link} target="_blank" rel="noreferrer">Ler matéria completa ↗</a>
      </div>
    </article>)}</div>}
    {updatedAt && <p className="news-updated">Última atualização do feed: {formatDate(updatedAt)}.{unavailableSources.length > 0 ? ` Fontes temporariamente indisponíveis: ${unavailableSources.join(", ")}.` : ""}</p>}
    <p className="legal-disclaimer">A Voxia reúne títulos, resumos e imagens publicados nos feeds RSS da Agência Brasil, G1, Folha de S.Paulo e CNN Brasil. A cobertura local inclui notícias recentes do G1 Pernambuco e reportagens do NE1 quando publicadas pelo portal. Os créditos, as matérias completas e os direitos sobre as imagens pertencem aos respectivos veículos. O feed é atualizado periodicamente.</p>
  </section></AppShell>;
}
