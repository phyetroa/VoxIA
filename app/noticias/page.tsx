import AppShell from "../components/AppShell";

export default function NewsPage() {
  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">ACOMPANHE O PAÍS</p><h1 className="page-title">Notícias nacionais</h1><p className="page-intro">Acesse uma fonte jornalística nacional para acompanhar fatos e debates do Brasil.</p>
    <article className="news-source-card"><span className="reference-badge">Agência Brasil · EBC</span><h2>Informação pública nacional</h2><p>A Voxia direciona você à Agência Brasil, veículo público de notícias. A cobertura jornalística é independente do debate e das opiniões publicadas na Voxia.</p><a className="primary" href="https://agenciabrasil.ebc.com.br/" target="_blank" rel="noreferrer">Acessar Agência Brasil ↗</a></article>
    <p className="legal-disclaimer">Ao abrir o link, você acessará outro site e estará sujeito às políticas e aos conteúdos dessa organização.</p>
  </section></AppShell>;
}
