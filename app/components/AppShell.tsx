import Link from "next/link";
import { ReactNode } from "react";
import SiteHeader from "./SiteHeader";

const topics = ["Educação", "Saúde", "Segurança", "Mobilidade", "Meio ambiente"];

export default function AppShell({ children, showRightPanel = true }: { children: ReactNode; showRightPanel?: boolean }) {
  return <div className="app-frame">
    <SiteHeader />
    <div className="app-columns">
      <main className="app-main">{children}</main>
      {showRightPanel && <aside className="app-right-panel">
        <section className="side-card"><p className="side-kicker">TEMAS EM DESTAQUE</p><div className="topic-list">{topics.map((topic) => <Link href={`/explorar?tema=${encodeURIComponent(topic)}`} key={topic}>#{topic.toLowerCase().replaceAll(" ", "-")}</Link>)}</div><Link className="side-link" href="/explorar">Explorar todos os temas →</Link></section>
        <section className="side-card"><p className="side-kicker">VOXIA É PARTICIPAÇÃO</p><p>Um espaço independente para ideias, propostas e soluções cidadãs.</p><Link className="side-link" href="/referencias">Conheça as fontes e referências →</Link></section>
        <section className="side-card"><p className="side-kicker">ACOMPANHE O PAÍS</p><p>Leia notícias nacionais em uma fonte jornalística pública.</p><a className="side-link" href="https://agenciabrasil.ebc.com.br/" target="_blank" rel="noreferrer">Abrir Agência Brasil ↗</a></section>
        <p className="side-disclaimer">A Voxia é independente e não representa órgãos públicos.</p>
      </aside>}
    </div>
  </div>;
}
