/* CS2 Config Manager — landing page: i18n toggle + latest-release download. */

const REPO = "brunobach/cs2-config-manager";

const STRINGS = {
  en: {
    "nav.features": "Features",
    "nav.docs": "Docs",
    "nav.download": "Download",
    "hero.eyebrow": "Free &amp; open source · Windows",
    "hero.title": "One config manager for all your CS2 accounts",
    "hero.sub":
      "Manage, compare and transfer Counter-Strike 2 configs across multiple Steam accounts — with automatic backups and a live crosshair preview.",
    "hero.download": "Download for Windows",
    "hero.github": "View on GitHub",
    "hero.note": "Windows 10/11 · 64-bit · MIT License",
    "features.title": "Everything your configs need",
    "features.sub": "Built for players who juggle more than one Steam account.",
    "features.detect.title": "Automatic Steam detection",
    "features.detect.body":
      "Finds your Steam install via the registry and lists every account with CS2 configs — avatars, resolution, binds and last played at a glance.",
    "features.edit.title": "See &amp; edit everything",
    "features.edit.body":
      "Video, crosshair (with live preview), viewmodel, mouse, radar/HUD, binds and 400+ convars — friendly editors plus a raw file editor.",
    "features.transfer.title": "Transfer between accounts",
    "features.transfer.body":
      "Copy video, convars and binds (or everything) to another account in two clicks. Steam Cloud–aware: configs survive the next game launch.",
    "features.compare.title": "Compare accounts",
    "features.compare.body":
      "Side-by-side diff of two accounts' configs, grouped by category, with a “differences only” filter.",
    "features.backups.title": "Automatic backups",
    "features.backups.body":
      "Every edit, transfer or restore snapshots your files first. Manual snapshots and one-click restore included.",
    "features.shots.title": "Screenshots gallery",
    "features.shots.body":
      "Browse each account's CS2 screenshots (Steam F12 captures) right in the profile, and jump to the cfg folder in one click.",
    "steps.title": "Up and running in a minute",
    "steps.1.title": "Download &amp; install",
    "steps.1.body":
      "Grab the latest <code>*-setup.exe</code> from Releases and run it. Windows may show a SmartScreen warning — click <strong>More info → Run anyway</strong> (the installer is not code-signed yet).",
    "steps.2.title": "Close CS2 &amp; Steam",
    "steps.2.body":
      "Before editing or transferring, close the game (and preferably Steam) so Steam Cloud can't overwrite your changes. The app warns you when either is running.",
    "steps.3.title": "Manage everything",
    "steps.3.body":
      "Pick an account to view, edit, compare, transfer or back up its configs — all changes are snapshotted automatically.",
    "docs.title": "Documentation",
    "docs.sub": "Everything lives in the repository — pick your language.",
    "docs.readme.title": "README (English)",
    "docs.readme.body": "Features, install guide, development setup and project structure.",
    "docs.readmept.title": "README (Português)",
    "docs.readmept.body": "Funcionalidades, instalação, setup de desenvolvimento e estrutura do projeto.",
    "docs.releases.title": "Releases &amp; changelog",
    "docs.releases.body": "Every version, installer downloads and what changed.",
    "docs.issues.title": "Issues &amp; feedback",
    "docs.issues.body": "Found a bug or have an idea? Open an issue — contributions welcome.",
    "docs.more": "Open ↗",
    "footer.made":
      'Made by <a href="https://github.com/brunobach" target="_blank" rel="noopener">brunobach</a> · MIT License',
    "footer.note": "Not affiliated with Valve or Steam. Counter-Strike is a trademark of Valve Corporation.",
  },
  "pt-BR": {
    "nav.features": "Funcionalidades",
    "nav.docs": "Docs",
    "nav.download": "Baixar",
    "hero.eyebrow": "Gratuito &amp; open source · Windows",
    "hero.title": "Um gerenciador de configs para todas as suas contas de CS2",
    "hero.sub":
      "Gerencie, compare e transfira configs de Counter-Strike 2 entre várias contas Steam — com backups automáticos e preview ao vivo da crosshair.",
    "hero.download": "Baixar para Windows",
    "hero.github": "Ver no GitHub",
    "hero.note": "Windows 10/11 · 64-bit · Licença MIT",
    "features.title": "Tudo que suas configs precisam",
    "features.sub": "Feito para quem joga em mais de uma conta Steam.",
    "features.detect.title": "Detecção automática da Steam",
    "features.detect.body":
      "Encontra sua instalação da Steam pelo registro e lista todas as contas com configs de CS2 — avatar, resolução, binds e última partida num relance.",
    "features.edit.title": "Veja e edite tudo",
    "features.edit.body":
      "Vídeo, crosshair (com preview ao vivo), viewmodel, mouse, radar/HUD, binds e 400+ convars — editores amigáveis e um editor de arquivo puro.",
    "features.transfer.title": "Transfira entre contas",
    "features.transfer.body":
      "Copie vídeo, convars e binds (ou tudo) para outra conta em dois cliques. Ciente da Steam Cloud: as configs sobrevivem à próxima abertura do jogo.",
    "features.compare.title": "Compare contas",
    "features.compare.body":
      "Diff lado a lado das configs de duas contas, agrupado por categoria, com filtro “somente diferenças”.",
    "features.backups.title": "Backups automáticos",
    "features.backups.body":
      "Toda edição, transferência ou restauração salva um snapshot antes. Snapshots manuais e restauração em um clique inclusos.",
    "features.shots.title": "Galeria de capturas",
    "features.shots.body":
      "Veja as screenshots de CS2 de cada conta (capturas do F12 da Steam) direto no perfil, e pule para a pasta cfg em um clique.",
    "steps.title": "Pronto em um minuto",
    "steps.1.title": "Baixe e instale",
    "steps.1.body":
      "Pegue o <code>*-setup.exe</code> mais recente em Releases e execute. O Windows pode mostrar um aviso do SmartScreen — clique em <strong>Mais informações → Executar mesmo assim</strong> (o instalador ainda não é assinado).",
    "steps.2.title": "Feche o CS2 e a Steam",
    "steps.2.body":
      "Antes de editar ou transferir, feche o jogo (e de preferência a Steam) para a Steam Cloud não sobrescrever suas mudanças. O app avisa quando um dos dois está aberto.",
    "steps.3.title": "Gerencie tudo",
    "steps.3.body":
      "Escolha uma conta para ver, editar, comparar, transferir ou backupear as configs — toda alteração gera um snapshot automático.",
    "docs.title": "Documentação",
    "docs.sub": "Tudo mora no repositório — escolha seu idioma.",
    "docs.readme.title": "README (English)",
    "docs.readme.body": "Features, install guide, development setup and project structure.",
    "docs.readmept.title": "README (Português)",
    "docs.readmept.body": "Funcionalidades, instalação, setup de desenvolvimento e estrutura do projeto.",
    "docs.releases.title": "Releases e changelog",
    "docs.releases.body": "Todas as versões, downloads do instalador e o que mudou.",
    "docs.issues.title": "Issues e feedback",
    "docs.issues.body": "Achou um bug ou tem uma ideia? Abra uma issue — contribuições são bem-vindas.",
    "docs.more": "Abrir ↗",
    "footer.made":
      'Feito por <a href="https://github.com/brunobach" target="_blank" rel="noopener">brunobach</a> · Licença MIT',
    "footer.note": "Sem afiliação com Valve ou Steam. Counter-Strike é marca registrada da Valve Corporation.",
  },
};

const state = {
  lang: null,
  latestTag: null,
};

function detectLang() {
  const saved = localStorage.getItem("cs2cfg-lang");
  if (saved === "en" || saved === "pt-BR") return saved;
  return navigator.language && navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

function applyLang() {
  const dict = STRINGS[state.lang];
  document.documentElement.lang = state.lang === "pt-BR" ? "pt-BR" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = dict[el.dataset.i18n];
    if (value) el.innerHTML = value;
  });
  // O botão de download mostra a tag do latest release quando já resolvida.
  if (state.latestTag) {
    document.getElementById("download-label").innerHTML = `${dict["hero.download"]} · ${state.latestTag}`;
  }
  // O toggle mostra o idioma para o qual troca.
  document.getElementById("lang-label").textContent = state.lang === "en" ? "PT-BR" : "EN";
}

async function hydrateDownload() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!res.ok) return;
    const data = await res.json();
    const asset = (data.assets || []).find((a) => /setup\.exe$/i.test(a.name));
    if (asset) document.getElementById("download-btn").href = asset.browser_download_url;
    if (data.tag_name) {
      state.latestTag = data.tag_name;
      applyLang();
    }
  } catch {
    // Sem rede / rate limit: o botão fica apontando para a página de Releases.
  }
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

state.lang = detectLang();
applyLang();
hydrateDownload();
initReveal();

document.getElementById("lang-toggle").addEventListener("click", () => {
  state.lang = state.lang === "en" ? "pt-BR" : "en";
  localStorage.setItem("cs2cfg-lang", state.lang);
  applyLang();
});
