const legalSources = [
  { title: "Constituição Federal", detail: "Base constitucional para direitos, cidadania e políticas públicas.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm" },
  { title: "Lei nº 7.716/1989", detail: "Crimes resultantes de preconceito de raça ou de cor.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm" }
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio"><span>V</span> Voxia</a>
        <nav aria-label="Navegação principal"><a href="#propostas">Explorar</a><a href="#como-funciona">Como funciona</a><a href="#referencias">Referências</a></nav>
        <a className="login" href="/entrar">Entrar</a>
      </header>
      <section id="inicio" className="hero">
        <div className="profile-row"><span className="avatar">V</span><div><strong>@voxia</strong><small>Participação cidadã</small></div></div>
        <p className="eyebrow">PARTICIPAÇÃO CIDADÃ DIGITAL</p>
        <h1>Ideias que entram no <em>debate público.</em></h1>
        <p>Uma plataforma independente para propor, acompanhar e apoiar mudanças para o Brasil.</p>
        <div className="actions"><a className="primary" href="#propostas">Explorar propostas</a><a className="secondary" href="/propostas/nova">Apresentar proposta</a></div>
      </section>
      <section id="propostas" className="section feed">
        <p className="eyebrow">PROPOSTAS APROVADAS</p><h2>O que está em debate</h2>
        <div className="empty"><div className="empty-icon">✦</div><h3>A comunidade ainda está começando.</h3><p>Quando propostas aprovadas forem publicadas, elas aparecerão aqui. Você já pode criar uma conta e enviar uma ideia para moderação.</p><a className="primary" href="/entrar">Criar conta</a></div>
      </section>
      <section id="como-funciona" className="steps"><div><p className="eyebrow">SIMPLES E TRANSPARENTE</p><h2>Sua voz tem um caminho.</h2></div><ol><li><strong>01</strong><span><b>Envie</b> uma proposta com problema, solução e referências.</span></li><li><strong>02</strong><span><b>Moderação</b> revisa conteúdo e referências jurídicas sugeridas.</span></li><li><strong>03</strong><span><b>Participe</b> apoiando propostas aprovadas.</span></li></ol></section>
      <section id="referencias" className="section"><p className="eyebrow">BASE PARA DECIDIR</p><h2>Referências jurídicas iniciais</h2><div className="sources">{legalSources.map((source) => <a key={source.title} href={source.url} target="_blank" rel="noreferrer"><small>FONTE OFICIAL</small><h3>{source.title}</h3><p>{source.detail}</p><span>Acessar fonte ↗</span></a>)}</div><p className="notice">As referências têm caráter informativo e não constituem aconselhamento jurídico individual.</p></section>
      <footer>Voxia é uma plataforma independente de participação cidadã. Não representa órgãos públicos.</footer>
    </main>
  );
}
