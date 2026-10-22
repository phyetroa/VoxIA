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
    <ProposalFeed />
    <footer className="app-footer">Voxia é uma plataforma independente. Não representa órgãos públicos. <Link href="/referencias">Fontes e transparência</Link></footer>
  </AppShell>;
}
