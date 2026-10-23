import Link from "next/link";
import AppShell from "./components/AppShell";
import ProposalFeed from "./components/ProposalFeed";

export default function Home() {
  return <AppShell>
    <section className="home-intro">
      <p className="eyebrow">Participação cidadã, do bairro ao Brasil</p>
      <h1>Toda mudança pública começa com alguém apontando o que pode melhorar.</h1>
      <p>Propostas da população, debate aberto e acompanhamento de quem decide.</p>
      <Link className="intro-create-link" href="/propostas/nova">＋ Apresente uma ideia</Link>
    </section>
    <section className="mission-card" aria-labelledby="mission-title">
      <p className="eyebrow">O papel da Voxia</p><h2 id="mission-title">Da conversa à cobrança pública</h2>
      <p>A Voxia reúne propostas, torna visível o apoio dos cidadãos e abre espaço para o debate. A ideia é aproximar essas demandas de representantes e gestores que podem transformá-las em políticas públicas.</p>
      <small>A plataforma é independente. Quem exerce o poder público decide se implementa uma proposta; a sociedade pode acompanhar essa resposta.</small>
    </section>
    <ProposalFeed />
    <footer className="app-footer">Voxia é uma plataforma independente. Não representa órgãos públicos. <Link href="/referencias">Fontes e transparência</Link></footer>
  </AppShell>;
}
