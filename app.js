const defaultProposals = [
  { id: "sombra", area: "Municipal", title: "Mais sombra e água nos pontos de ônibus", text: "Instalar coberturas verdes e bebedouros em corredores de maior movimento.", supports: 2418, comments: [{ author: "Marina", text: "Ótima ideia para dias de muito calor." }] },
  { id: "educacao", area: "Nacional", title: "Educação financeira como conteúdo escolar", text: "Ampliar o ensino de planejamento, consumo consciente e direitos do consumidor.", supports: 1926, comments: [] },
  { id: "obras", area: "Estadual", title: "Dados abertos para acompanhar obras públicas", text: "Um painel simples para consultar prazos, custos e etapas de cada obra.", supports: 1567, comments: [] }
];
const references = [
  { source: "PLANALTO", title: "Constituição da República Federativa do Brasil", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm" },
  { source: "INW", title: "Constituição: o que é e como funciona no Brasil", url: "https://inw.org.br/constituicao-o-que-e-e-como-funciona-no-brasil/" },
  { source: "PLANALTO", title: "Portal da legislação brasileira", url: "https://www4.planalto.gov.br/legislacao/copy_of_home" },
  { source: "CONARQ", title: "Leis e decretos-leis arquivísticos", url: "https://www.gov.br/conarq/pt-br/legislacao-arquivistica/leis-e-decretos-leis" },
  { source: "TSE", title: "Proposta de governo — Eleições 2026", url: "https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026/flavio-bolsonaro" }
];
let proposals = JSON.parse(localStorage.getItem("voxia-proposals")) || defaultProposals;
let supportedIds = JSON.parse(localStorage.getItem("voxia-supports")) || [];
let activeProposalId = null;
const proposalGrid = document.querySelector("#proposal-grid");
const referenceList = document.querySelector("#reference-list");
const authDialog = document.querySelector("#auth-dialog");
const proposalDialog = document.querySelector("#proposal-dialog");
const commentsDialog = document.querySelector("#comments-dialog");
const saveProposals = () => localStorage.setItem("voxia-proposals", JSON.stringify(proposals));
const userName = () => localStorage.getItem("voxia-user");
const requireUser = (callback) => userName() ? callback() : authDialog.showModal();
const formatNumber = (value) => new Intl.NumberFormat("pt-BR").format(value);
function renderProposals(filter = document.querySelector("[data-filter].active")?.dataset.filter || "all") {
  const visible = filter === "all" ? proposals : proposals.filter((proposal) => proposal.area === filter);
  proposalGrid.innerHTML = visible.map((proposal) => {
    const isSupported = supportedIds.includes(proposal.id);
    return `<article class="proposal"><div class="proposal-top"><span class="tag">${proposal.area}</span><span class="status">${proposal.pending ? "Em moderação" : "Em debate"}</span></div><h3>${proposal.title}</h3><p>${proposal.text}</p><div class="proposal-bottom"><button class="support ${isSupported ? "is-supported" : ""}" data-support="${proposal.id}">${isSupported ? "✓ Apoiado" : "♢ Apoiar"} · ${formatNumber(proposal.supports)}</button><button class="comments" data-comments="${proposal.id}">◌ ${proposal.comments.length} comentários</button></div></article>`;
  }).join("");
}
function renderReferences() { referenceList.innerHTML = references.map((reference) => `<article class="reference"><small>${reference.source}</small><h3>${reference.title}</h3><a href="${reference.url}" target="_blank" rel="noopener noreferrer">Acessar fonte ↗</a></article>`).join(""); }
function renderComments() { const proposal = proposals.find((item) => item.id === activeProposalId); document.querySelector("#comments-title").textContent = proposal.title; document.querySelector("#comments-list").innerHTML = proposal.comments.length ? proposal.comments.map((comment) => `<article class="comment"><strong>${comment.author}</strong><p>${comment.text}</p></article>`).join("") : "<p>Ainda não há comentários. Comece a conversa.</p>"; }
document.querySelector("#filter-button").addEventListener("click", () => { const filters = document.querySelector("#filters"); filters.hidden = !filters.hidden; });
document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active")); button.classList.add("active"); renderProposals(button.dataset.filter); }));
proposalGrid.addEventListener("click", (event) => { const supportId = event.target.dataset.support; const commentsId = event.target.dataset.comments; if (supportId) requireUser(() => { const proposal = proposals.find((item) => item.id === supportId); if (supportedIds.includes(supportId)) { supportedIds = supportedIds.filter((id) => id !== supportId); proposal.supports--; } else { supportedIds.push(supportId); proposal.supports++; } localStorage.setItem("voxia-supports", JSON.stringify(supportedIds)); saveProposals(); renderProposals(); }); if (commentsId) requireUser(() => { activeProposalId = commentsId; renderComments(); commentsDialog.showModal(); }); });
document.querySelectorAll("[data-auth]").forEach((button) => button.addEventListener("click", () => authDialog.showModal()));
document.querySelectorAll("[data-create]").forEach((button) => button.addEventListener("click", () => requireUser(() => proposalDialog.showModal())));
document.querySelector("#demo-login-form").addEventListener("submit", (event) => { event.preventDefault(); localStorage.setItem("voxia-user", document.querySelector("#display-name").value.trim()); authDialog.close(); document.querySelectorAll(".login-button").forEach((button) => button.textContent = "Meu perfil"); });
document.querySelector("#proposal-form").addEventListener("submit", (event) => { event.preventDefault(); proposals.unshift({ id: crypto.randomUUID(), title: document.querySelector("#proposal-title").value.trim(), area: document.querySelector("#proposal-area").value, text: document.querySelector("#proposal-text").value.trim(), supports: 0, comments: [], pending: true }); saveProposals(); renderProposals(); proposalDialog.close(); event.target.reset(); document.querySelector("#explorar").scrollIntoView({ behavior: "smooth" }); });
document.querySelector("#comment-form").addEventListener("submit", (event) => { event.preventDefault(); const text = document.querySelector("#comment-text").value.trim(); proposals.find((item) => item.id === activeProposalId).comments.push({ author: userName(), text }); saveProposals(); renderComments(); renderProposals(); event.target.reset(); });
document.querySelector(".close-dialog").addEventListener("click", () => authDialog.close()); document.querySelector(".close-proposal").addEventListener("click", () => proposalDialog.close()); document.querySelector(".close-comments").addEventListener("click", () => commentsDialog.close());
document.querySelector("#theme-toggle").addEventListener("click", () => { const current = document.body.dataset.theme || "light"; document.body.dataset.theme = current === "light" ? "dark" : current === "dark" ? "classic" : "light"; localStorage.setItem("voxia-theme", document.body.dataset.theme); });
document.querySelector(".menu-button").addEventListener("click", () => { const menu = document.querySelector("#mobile-nav"); menu.hidden = !menu.hidden; });
document.body.dataset.theme = localStorage.getItem("voxia-theme") || "light"; if (userName()) document.querySelectorAll(".login-button").forEach((button) => button.textContent = "Meu perfil"); renderProposals(); renderReferences();
