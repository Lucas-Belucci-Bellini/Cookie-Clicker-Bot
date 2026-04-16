// ============================================================
//  🍪 COOKIE CLICKER BOT — Full Idle Automator
//  Desenvolvedor: Script gerado para uso no console do navegador
//  Instruções: Abra o Cookie Clicker, pressione F12,
//  vá até a aba "Console" e cole este script inteiro.
// ============================================================

// ============================================================
//  ⚙️  CONFIGURAÇÕES AJUSTÁVEIS — Modifique aqui à vontade
// ============================================================
const CONFIG = {
  // Intervalo base de clique no biscoito (ms). Menor = mais rápido.
  intervaloCliqueBase: 50,

  // Intervalo de clique durante o Frenzy (Golden Cookie ativo) (ms)
  intervaloCliqueFrenzy: 10,

  // A cada quantos ms o bot verifica compras (builds/upgrades)
  intervaloCompras: 3000,

  // A cada quantos ms o bot verifica Golden Cookies / Renas
  intervaloGoldenCookie: 500,

  // Quantidade de prestígio ACUMULADO para ascender automaticamente.
  // O bot vai ascender quando os "Prestige levels available" atingirem este valor.
  prestigioParaAscender: 100,

  // Percentual máximo do saldo de cookies a gastar numa única compra (0 a 1).
  // Ex: 0.5 = gasta até 50% dos cookies de uma vez. Evita ficar sem saldo.
  limiteGastoUnico: 0.5,

  // Ativar log detalhado no console? (true/false)
  logAtivado: true,
};

// ============================================================
//  🛠️  UTILITÁRIOS
// ============================================================

/** Loga mensagem no console se o log estiver ativado */
function log(msg) {
  if (CONFIG.logAtivado) {
    console.log(`[🍪 BOT ${new Date().toLocaleTimeString()}] ${msg}`);
  }
}

/** Verifica se o jogo está carregado e acessível */
function jogoCarregado() {
  return typeof Game !== "undefined" && Game.ready;
}

// ============================================================
//  1. AUTO CLICKER DINÂMICO
//     Clica no biscoito principal. Aumenta a velocidade durante
//     o efeito de Frenzy (Golden Cookie que multiplica CpS).
// ============================================================
let intervaloClique = null;

function iniciarAutoClicker() {
  // Remove qualquer loop anterior para evitar duplicatas
  if (intervaloClique) clearInterval(intervaloClique);

  const velocidade = estaEmFrenzy()
    ? CONFIG.intervaloCliqueFrenzy
    : CONFIG.intervaloCliqueBase;

  intervaloClique = setInterval(() => {
    if (!jogoCarregado()) return;
    Game.ClickCookie(); // Função nativa do Cookie Clicker
  }, velocidade);
}

/** Verifica se algum efeito de Frenzy está ativo (ex: "Frenzy", "Click Frenzy") */
function estaEmFrenzy() {
  if (!jogoCarregado()) return false;
  for (const buff in Game.buffs) {
    const nome = buff.toLowerCase();
    if (nome.includes("frenzy") || nome.includes("click frenzy")) {
      return true;
    }
  }
  return false;
}

// ============================================================
//  2. AUTO GOLDEN COOKIE / WRATH COOKIE / RENA
//     Clica automaticamente em todos os objetos especiais
//     que aparecem na tela.
// ============================================================

function clicarObjetosEspeciais() {
  if (!jogoCarregado()) return;

  // Itera sobre todos os "shimmer" (brilhos) do jogo
  Game.shimmers.forEach((shimmer) => {
    if (shimmer.life > 0) {
      shimmer.pop(); // Clica no objeto especial
      log(`🌟 Clicado: ${shimmer.type}`);
    }
  });
}

// ============================================================
//  3. COMPRA INTELIGENTE DE UPGRADES E CONSTRUÇÕES
//     Prioriza o item com melhor custo-benefício:
//     - Upgrades disponíveis são comprados primeiro (alto impacto).
//     - Construções são compradas pela menor proporção custo/CpS.
// ============================================================

function comprarUpgradesDisponiveis() {
  if (!jogoCarregado()) return;

  // Percorre os upgrades na loja
  Game.UpgradesInStore.forEach((upgrade) => {
    const preco = upgrade.getPrice();
    const saldo = Game.cookies;

    // Só compra se o preço couber dentro do limite configurado
    if (preco <= saldo * CONFIG.limiteGastoUnico) {
      upgrade.buy(1);
      log(`🔬 Upgrade comprado: "${upgrade.name}" por ${formatarNumero(preco)} cookies`);
    }
  });
}

function comprarMelhorConstrucao() {
  if (!jogoCarregado()) return;

  const saldo = Game.cookies;
  let melhorOpcao = null;
  let melhorRazao = Infinity; // Menor custo por CpS gerado = melhor

  Game.ObjectsById.forEach((obj) => {
    if (!obj || obj.locked) return;

    const preco = obj.price;

    // Só considera se cabe no limite de gasto único
    if (preco > saldo * CONFIG.limiteGastoUnico) return;

    // CpS que esta construção adiciona ao comprar mais uma unidade
    const cpsPorUnidade = obj.baseCps * Game.globalCpsMult || 1;
    const razao = preco / cpsPorUnidade;

    if (razao < melhorRazao) {
      melhorRazao = razao;
      melhorOpcao = obj;
    }
  });

  if (melhorOpcao) {
    melhorOpcao.buy(1);
    log(
      `🏗️  Construção comprada: "${melhorOpcao.name}" por ${formatarNumero(melhorOpcao.price)} cookies`
    );
  }
}

function cicloDeCompras() {
  comprarUpgradesDisponiveis();
  comprarMelhorConstrucao();
}

// ============================================================
//  4. AUTO ASCENSÃO (PRESTIGE)
//     Monitora os níveis de prestígio disponíveis. Quando
//     atingir o limite configurado, acende automaticamente.
// ============================================================

function verificarAscensao() {
  if (!jogoCarregado()) return;

  // Níveis de prestígio que seriam ganhos ao ascender agora
  const prestigioDisponivel = Game.prestige - Game.Achievements["Transcendence"]
    ? 0
    : 0; // Fallback seguro

  // Maneira mais confiável: calcular via HeavenlyChips
  const chipsPotenciais = Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned);
  const chipsAtuais = Game.prestige;
  const ganhoLiquido = chipsPotenciais - chipsAtuais;

  if (ganhoLiquido >= CONFIG.prestigioParaAscender) {
    log(`✨ Iniciando ascensão! Ganho de prestígio: ${ganhoLiquido}`);
    executarAscensao();
  }
}

// ============================================================
//  5. GERENCIAMENTO DE ASCENSÃO
//     1. Realiza o Ascend (reset com prestígio).
//     2. Compra upgrades da árvore celestial disponíveis.
//     3. Reencarna para reiniciar o ciclo de jogo.
// ============================================================

function executarAscensao() {
  if (!jogoCarregado()) return;

  // Passo 1: Ascender
  Game.Ascend(1);
  log("🚀 Ascendido! Comprando upgrades celestiais...");

  // Aguarda o jogo processar a ascensão antes de continuar
  setTimeout(() => {
    comprarUpgradesCelestiais();

    // Passo 3: Reencarnar após comprar upgrades
    setTimeout(() => {
      Game.Reincarnate(1);
      log("♻️  Reencarnado! Reiniciando ciclo de automação...");

      // Reinicia o auto-clicker com a velocidade base
      iniciarAutoClicker();
    }, 2000);
  }, 2000);
}

function comprarUpgradesCelestiais() {
  if (!jogoCarregado()) return;

  // Itera pelos upgrades do plano celestial (Heavenly upgrades)
  for (const nome in Game.Upgrades) {
    const upgrade = Game.Upgrades[nome];

    // Upgrade celestial = pool "prestige"
    if (
      upgrade.pool === "prestige" &&
      upgrade.canBuy() &&
      !upgrade.bought
    ) {
      upgrade.buy();
      log(`⭐ Upgrade celestial comprado: "${upgrade.name}"`);
    }
  }
}

// ============================================================
//  UTILITÁRIO: Formatar números grandes de forma legível
// ============================================================
function formatarNumero(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + " trilhões";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " bilhões";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " milhões";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + " mil";
  return n.toFixed(0);
}

// ============================================================
//  6. LOOP INFINITO — Orquestra todos os módulos acima
// ============================================================

// Armazena todos os intervalos para poder pausar o bot facilmente
const INTERVALOS = [];

function iniciarBot() {
  if (!jogoCarregado()) {
    console.warn("[🍪 BOT] Aguarde o Cookie Clicker carregar completamente antes de rodar o bot.");
    return;
  }

  log("🟢 Bot iniciado! Configurações atuais:");
  console.table(CONFIG);

  // --- Módulo 1: Auto Clicker (velocidade dinâmica) ---
  iniciarAutoClicker();

  // Monitora se entrou ou saiu de Frenzy para ajustar a velocidade
  INTERVALOS.push(
    setInterval(() => {
      iniciarAutoClicker(); // Reinicia com velocidade correta para o estado atual
    }, 5000) // Verifica a cada 5 segundos
  );

  // --- Módulo 2: Auto Golden Cookie / Rena ---
  INTERVALOS.push(
    setInterval(clicarObjetosEspeciais, CONFIG.intervaloGoldenCookie)
  );

  // --- Módulo 3: Compras inteligentes ---
  INTERVALOS.push(
    setInterval(cicloDeCompras, CONFIG.intervaloCompras)
  );

  // --- Módulo 4 e 5: Verificação de ascensão ---
  INTERVALOS.push(
    setInterval(verificarAscensao, 60000) // Verifica a cada 1 minuto
  );

  log("✅ Todos os módulos estão ativos. Para parar, execute: pararBot()");
}

// ============================================================
//  🛑 FUNÇÃO PARA PARAR O BOT
//     Execute pararBot() no console para interromper tudo.
// ============================================================
function pararBot() {
  if (intervaloClique) clearInterval(intervaloClique);
  INTERVALOS.forEach((id) => clearInterval(id));
  INTERVALOS.length = 0;
  log("🔴 Bot pausado. Execute iniciarBot() para retomar.");
}

// ============================================================
//  🚀 INICIALIZAÇÃO AUTOMÁTICA
// ============================================================
iniciarBot();
