import Link from "next/link";
import AppShell from "./components/AppShell";
import ProposalFeed from "./components/ProposalFeed";

export default function Home() {
  return <AppShell>
    <section className="home-intro">
      <p className="eyebrow">PARTICIPAÇÃO CIDADÃ</p>
      <h1>Sua voz constrói um Brasil melhor.</h1>
      <p>Ideias cidadãs, propostas e soluções para transformar a sua comunidade.</p>
      <Link className="intro-create-link" href="/propostas/nova">＋ Apresente uma proposta</Link>
    </section>
    <section className="mission-card" aria-labelledby="mission-title">
      <div className="mission-mark" aria-hidden="true">V</div>
      <div><p className="eyebrow">PARA QUE EXISTE A VOXIA?</p><h2 id="mission-title">Ideias cidadãs mais perto de quem decide.</h2>
        <p>A Voxia dá visibilidade às propostas e melhorias da população para que pessoas com poder político — como representantes e gestores públicos — possam conhecê-las, dialogar com a sociedade e transformá-las em ações.</p>
        <small>A Voxia é independente: aproxima e acompanha a participação, mas não representa o governo nem garante que uma proposta será adotada.</small>
      </div>
    </section>
    <ProposalFeed />
    <footer className="app-footer">Voxia é uma plataforma independente. Não representa órgãos públicos. <Link href="/referencias">Fontes e transparência</Link></footer>
  </AppShell>;
}
