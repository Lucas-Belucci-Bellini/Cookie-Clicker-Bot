// ╔══════════════════════════════════════════════════════════════════╗
// ║          🍪 COOKIE CLICKER BOT — EDIÇÃO SUPREMA v2.0            ║
// ║   Inspirado nas melhores práticas do CookieBot (prinzstani)     ║
// ║   Filosofia: trabalho bom deve ser estudado e aprimorado.       ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  COMO USAR:
//  1. Abra Cookie Clicker no navegador (ou Steam via mod local)
//  2. Pressione F12 → aba "Console"
//  3. Cole este script inteiro e pressione Enter
//  4. Para parar:  BOT.parar()
//  5. Para pausar: BOT.pausar()
//  6. Para retomar: BOT.retomar()
//  7. Para ver status: BOT.status()

// ════════════════════════════════════════════════════════════════════
//  ⚙️  PAINEL DE CONFIGURAÇÕES — Ajuste aqui antes de rodar
// ════════════════════════════════════════════════════════════════════
const CONFIG = {
  // ── Clique ──────────────────────────────────────────────────────
  intervaloCliqueBase:    50,   // ms entre cliques normais
  intervaloCliqueFrenzy:  10,   // ms durante Click Frenzy / Frenzy
  intervaloCliqueElder:   20,   // ms durante Elder Frenzy

  // ── Compras ─────────────────────────────────────────────────────
  intervaloCompras:       3000, // ms entre ciclos de compra
  limiteGastoUnico:       0.5,  // máx. % do saldo gasto numa compra
  comprarUpgradesFirst:   true, // upgrades têm prioridade sobre edifícios
  reservaMinima:          0,    // cookies mínimos para manter em caixa (0 = desativado)

  // ── Objetos Especiais ────────────────────────────────────────────
  intervaloGoldenCookie:  250,  // ms de varredura por shimmers
  clicarWrathCookies:     true, // clicar em Wrath Cookies também
  clicarRenas:            true, // clicar em Reindeer (Natal)

  // ── Wrinklers ───────────────────────────────────────────────────
  estourarWrinklers:      true, // estourar gordas larvas ao atingir o limite
  wrinklersParaManter:    0,    // quantos wrinklers manter (0 = estourar todos quando cheios)
  intervaloWrinklers:     30000,// ms entre verificações de wrinklers

  // ── Modo Noturno ─────────────────────────────────────────────────
  modoNoturnoAtivo:       true, // pausa cliques entre 23h-7h (como o CookieBot original)
  horarioInicioNoite:     23,   // hora de início do modo noturno
  horarioFimNoite:        7,    // hora de fim do modo noturno

  // ── Ascensão ────────────────────────────────────────────────────
  prestigioParaAscender:  100,  // chips de prestígio LÍQUIDOS necessários para ascender
  intervaloVerificaAscensao: 60000, // ms entre verificações de ascensão

  // ── Grimório (Wizard Tower) ──────────────────────────────────────
  usarGrimorio:           true, // usar magias automaticamente
  magiaPrioridade:        'FSM',// 'FSM' = Force the Hand of Fate, 'GF' = Gambler's Fever Dream
  intervaloGrimorio:      10000,// ms entre tentativas de magia

  // ── Jardim (Garden) ─────────────────────────────────────────────
  gerenciarJardim:        true, // plantar/colher automaticamente
  sementeFavorita:        'queenbeet', // semente mais valiosa para maximizar CpS

  // ── Panteon (Pantheon) ───────────────────────────────────────────
  gerenciarPanteon:       true, // configurar espíritos automaticamente

  // ── Mercado de Ações (Stock Market) ─────────────────────────────
  gerenciarMercado:       true, // comprar/vender ações automaticamente
  limiarVendaMercado:     1.5,  // vender quando preço >= 150% do custo base

  // ── Log ─────────────────────────────────────────────────────────
  logAtivado:             true, // exibir logs no console
  logNivel:               'info',// 'debug' | 'info' | 'warn'
};

// ════════════════════════════════════════════════════════════════════
//  🔧 NÚCLEO DO BOT — Estado global e utilitários
// ════════════════════════════════════════════════════════════════════
const BOT = (() => {
  // Estado interno
  const estado = {
    ativo:        false,
    pausado:      false,
    intervalos:   [],
    clickInterval:null,
    frenzyAtivo:  false,
    elderFrenzy:  false,
    ascendendo:   false,
    versao:       '2.0.0',
    iniciadoEm:   null,
    estatisticas: {
      cliques:        0,
      goldensCaptados: 0,
      comprasFeitas:  0,
      ascensoes:      0,
      wrinklersEstourados: 0,
    },
  };

  // ── Utilitários ────────────────────────────────────────────────
  function log(nivel, msg) {
    if (!CONFIG.logAtivado) return;
    const niveis = { debug: 0, info: 1, warn: 2 };
    if (niveis[nivel] < niveis[CONFIG.logNivel]) return;
    const hora = new Date().toLocaleTimeString('pt-BR');
    const icones = { debug: '🔍', info: '🍪', warn: '⚠️' };
    console.log(`[${icones[nivel]} BOT ${hora}] ${msg}`);
  }

  function jogoOk() {
    return typeof Game !== 'undefined' && Game.ready && !estado.ascendendo;
  }

  function formatNum(n) {
    if (n >= 1e15) return (n / 1e15).toFixed(2) + ' quatrilhões';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + ' trilhões';
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + ' bilhões';
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + ' milhões';
    if (n >= 1e3)  return (n / 1e3).toFixed(2)  + ' mil';
    return Math.floor(n).toString();
  }

  function eHorarioNoturno() {
    if (!CONFIG.modoNoturnoAtivo) return false;
    const h = new Date().getHours();
    return h >= CONFIG.horarioInicioNoite || h < CONFIG.horarioFimNoite;
  }

  function registrarIntervalo(id) {
    estado.intervalos.push(id);
    return id;
  }

  function limparIntervalos() {
    if (estado.clickInterval) clearInterval(estado.clickInterval);
    estado.intervalos.forEach(id => clearInterval(id));
    estado.intervalos = [];
  }

  // ════════════════════════════════════════════════════════════════
  //  1. AUTO CLICKER DINÂMICO
  //     Velocidade adaptativa: base → frenzy → elder frenzy
  //     Modo noturno: para cliques entre 23h-7h (usa Golden Switch)
  // ════════════════════════════════════════════════════════════════
  function detectarBuffs() {
    if (!jogoOk()) return;
    let frenzy = false, elder = false;
    for (const nome in Game.buffs) {
      const n = nome.toLowerCase();
      if (n === 'frenzy' || n === 'click frenzy' || n.includes('frenzy')) frenzy = true;
      if (n === 'elder frenzy') elder = true;
    }
    // Reinicia clicker apenas se o estado mudou
    if (frenzy !== estado.frenzyAtivo || elder !== estado.elderFrenzy) {
      estado.frenzyAtivo = frenzy;
      estado.elderFrenzy = elder;
      iniciarAutoClicker();
    }
  }

  function iniciarAutoClicker() {
    if (estado.clickInterval) clearInterval(estado.clickInterval);
    if (!estado.ativo || estado.pausado) return;

    if (eHorarioNoturno()) {
      ativarModoNoturno();
      return;
    }

    let intervalo = CONFIG.intervaloCliqueBase;
    if (estado.elderFrenzy) intervalo = CONFIG.intervaloCliqueElder;
    else if (estado.frenzyAtivo) intervalo = CONFIG.intervaloCliqueFrenzy;

    estado.clickInterval = setInterval(() => {
      if (!jogoOk() || estado.pausado) return;
      if (eHorarioNoturno()) { iniciarAutoClicker(); return; }
      Game.ClickCookie();
      estado.estatisticas.cliques++;
    }, intervalo);
  }

  // ════════════════════════════════════════════════════════════════
  //  MODO NOTURNO
  //  Ativa o Golden Switch (se disponível) para maximizar CpS passivo
  //  sem clicar — simulando comportamento humano
  // ════════════════════════════════════════════════════════════════
  function ativarModoNoturno() {
    if (!jogoOk()) return;
    // Tenta ativar o Golden Switch para bônus noturno
    const gs = Game.Upgrades['Golden switch'];
    if (gs && gs.bought && !Game.goldenSwitchActive) {
      try { Game.goldenSwitchOn = 1; } catch(e) {}
      log('info', '🌙 Modo noturno: Golden Switch ativado para bônus passivo.');
    } else {
      log('debug', '🌙 Modo noturno: aguardando amanhecer (sem cliques).');
    }
  }

  function desativarModoNoturno() {
    if (!jogoOk()) return;
    try { if (Game.goldenSwitchOn) Game.goldenSwitchOn = 0; } catch(e) {}
  }

  // ════════════════════════════════════════════════════════════════
  //  2. AUTO GOLDEN COOKIE / WRATH COOKIE / RENAS
  //     Varre todos os shimmers ativos e os "poppa"
  //     Wrath Cookies são opcionais (causam debuffs mas dão cookies)
  // ════════════════════════════════════════════════════════════════
  function clicarShimmers() {
    if (!jogoOk() || estado.pausado) return;
    if (!Game.shimmers) return;

    Game.shimmers.forEach(shimmer => {
      if (shimmer.life <= 0) return;

      const tipo = (shimmer.type || '').toLowerCase();

      if (tipo === 'golden') {
        shimmer.pop();
        estado.estatisticas.goldensCaptados++;
        log('info', `🌟 Golden Cookie capturado! Total: ${estado.estatisticas.goldensCaptados}`);
      } else if (tipo === 'wrath' && CONFIG.clicarWrathCookies) {
        shimmer.pop();
        log('warn', '😈 Wrath Cookie clicado (pode causar debuff)');
      } else if (tipo === 'reindeer' && CONFIG.clicarRenas) {
        shimmer.pop();
        log('info', '🦌 Rena capturada!');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  3. COMPRA INTELIGENTE DE UPGRADES E EDIFÍCIOS
  //     Estratégia:
  //     1) Upgrades de loja sempre primeiro (retorno garantido)
  //     2) Edifícios pelo menor custo por CpS gerado
  //     3) Respeita o limite de gasto único e a reserva mínima
  // ════════════════════════════════════════════════════════════════
  function saldoDisponivel() {
    const saldo = Game.cookies;
    return Math.max(0, saldo - CONFIG.reservaMinima);
  }

  function comprarUpgrades() {
    if (!jogoOk()) return;
    let comprou = false;

    // Ordena upgrades por preço (mais baratos primeiro = menor risco)
    const upgrades = [...Game.UpgradesInStore].sort((a, b) => a.getPrice() - b.getPrice());

    for (const up of upgrades) {
      const preco = up.getPrice();
      const disponivel = saldoDisponivel();

      // Nunca gastar mais que o limite configurado de uma vez
      if (preco > disponivel * CONFIG.limiteGastoUnico) continue;

      // Ignorar upgrades de Temporada que trocam a temporada ativa
      if (up.pool === 'toggle') continue;

      up.buy(1);
      estado.estatisticas.comprasFeitas++;
      log('info', `🔬 Upgrade: "${up.name}" → ${formatNum(preco)} cookies`);
      comprou = true;
    }
    return comprou;
  }

  function calcularEficienciaEdificio(obj) {
    // Eficiência = CpS adicionado por unidade comprada / preço
    // Usamos o delta real do jogo para maior precisão
    const cpsBefore = Game.cookiesPs;
    const preco = obj.price;
    if (preco <= 0) return 0;

    // Estimativa: baseCps * multiplicadores globais * (1 + bônus de quantidade)
    const cpsPorUnidade = (obj.storedCps || obj.baseCps || 0) * (Game.globalCpsMult || 1);
    if (cpsPorUnidade <= 0) return 0;

    return cpsPorUnidade / preco; // Maior = melhor
  }

  function comprarMelhorEdificio() {
    if (!jogoOk()) return;
    const disponivel = saldoDisponivel();

    let melhor = null;
    let melhorEficiencia = -Infinity;

    Game.ObjectsById.forEach(obj => {
      if (!obj || obj.locked) return;
      const preco = obj.price;
      if (preco > disponivel * CONFIG.limiteGastoUnico) return;

      const eficiencia = calcularEficienciaEdificio(obj);
      if (eficiencia > melhorEficiencia) {
        melhorEficiencia = eficiencia;
        melhor = obj;
      }
    });

    if (melhor) {
      melhor.buy(1);
      estado.estatisticas.comprasFeitas++;
      log('info', `🏗️  Edifício: "${melhor.name}" → ${formatNum(melhor.price)} cookies (eff: ${melhorEficiencia.toExponential(2)})`);
    }
  }

  function cicloDeCompras() {
    if (!jogoOk() || estado.pausado) return;

    if (CONFIG.comprarUpgradesFirst) {
      comprarUpgrades();
      comprarMelhorEdificio();
    } else {
      comprarMelhorEdificio();
      comprarUpgrades();
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  4. GERENCIAMENTO DE WRINKLERS
  //     Wrinklers absorvem cookies mas os devolvem com 110% ao serem
  //     estourados. Estratégia: mantém N wrinklers e estoura o resto.
  // ════════════════════════════════════════════════════════════════
  function gerenciarWrinklers() {
    if (!jogoOk() || !CONFIG.estourarWrinklers || estado.pausado) return;
    if (!Game.wrinklers) return;

    const ativos = Game.wrinklers.filter(w => w.phase === 2); // fase 2 = gordinho
    const gordos  = ativos.filter(w => w.sucked > 0);

    // Se temos mais wrinklers gordos do que queremos manter, estouramos os extras
    const paraEstourar = gordos.length - CONFIG.wrinklersParaManter;
    if (paraEstourar <= 0) return;

    let estourados = 0;
    for (const w of gordos) {
      if (estourados >= paraEstourar) break;
      w.hp = 0; // força o estouro
      estourados++;
      estado.estatisticas.wrinklersEstourados++;
    }

    if (estourados > 0) {
      log('info', `🐛 ${estourados} wrinkler(es) estourado(s)! Total: ${estado.estatisticas.wrinklersEstourados}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  5. GRIMÓRIO — Wizard Tower (minijogo de magias)
  //     Magia principal: Force the Hand of Fate (invoca Golden Cookie)
  //     Só conjura quando a magia está disponível e temos magia suficiente
  // ════════════════════════════════════════════════════════════════
  function usarGrimorio() {
    if (!jogoOk() || !CONFIG.usarGrimorio || estado.pausado) return;

    const wt = Game.Objects['Wizard tower'];
    if (!wt || !wt.minigame) return;

    const grimorio = wt.minigame;
    if (!grimorio || grimorio.magic < grimorio.magicM) return; // magia não cheia

    // Tenta conjurar a magia prioritária
    const magia = grimorio.spells[CONFIG.magiaPrioridade === 'FSM'
      ? 'hand of fate'
      : "gambler's fever dream"];

    if (!magia) return;

    // Custo máximo da magia (custa mais quando há buffs ativos)
    const custo = Math.ceil(grimorio.getSpellCost(magia));
    if (grimorio.magic < custo) return;

    // Não conjura durante Frenzy (já temos buff, evitar desperdício)
    if (estado.frenzyAtivo && CONFIG.magiaPrioridade === 'FSM') return;

    try {
      grimorio.castSpell(magia);
      log('info', `🔮 Magia conjurada: "${magia.name}" (custo: ${custo.toFixed(1)})`);
    } catch(e) {
      log('debug', `Grimório: ${e.message}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  6. PANTEON — Configuração automática de espíritos
  //     Configuração ideal depende do momento do jogo:
  //     - Dia:   Mokalsium (CpS), Godzamok (cliques), Holobore
  //     - Noite: Skruuia (wrinklers), Mokalsium, Cyclius
  // ════════════════════════════════════════════════════════════════
  function configurarPanteon() {
    if (!jogoOk() || !CONFIG.gerenciarPanteon || estado.pausado) return;

    const templo = Game.Objects['Temple'];
    if (!templo || !templo.minigame) return;

    const panteon = templo.minigame;
    const noturno = eHorarioNoturno();

    // Espíritos: slot 0 = diamante (maior bônus), 1 = rubi, 2 = jade
    const configuracoes = {
      dia:   ['Mokalsium', 'Godzamok', 'Holobore'],
      noite: ['Skruuia',   'Mokalsium', 'Cyclius'],
    };

    const alvo = noturno ? configuracoes.noite : configuracoes.dia;

    alvo.forEach((nomeEspirito, slot) => {
      const espirito = panteon.gods[nomeEspirito];
      if (!espirito) return;

      // Verifica se já está no slot correto
      if (panteon.slot[slot] === espirito.id) return;

      // Tenta encaixar o espírito no slot
      try {
        panteon.slotGod(espirito, slot);
        log('debug', `⛩️  Espírito "${nomeEspirito}" → slot ${slot}`);
      } catch(e) {
        // Sem swaps disponíveis ou espírito bloqueado
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  7. JARDIM — Gerenciamento de plantas
  //     Estratégia: plantar Queenbeet (maximiza CpS passivo)
  //     Colhe plantas maduras automaticamente
  // ════════════════════════════════════════════════════════════════
  function gerenciarJardim() {
    if (!jogoOk() || !CONFIG.gerenciarJardim || estado.pausado) return;

    const fc = Game.Objects['Farm'];
    if (!fc || !fc.minigame) return;

    const jardim = fc.minigame;
    if (jardim.freeze) return; // jardim congelado

    const cols = jardim.X;
    const rows = jardim.Y;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = jardim.getTile(x, y);
        if (!tile || tile[0] === 0) {
          // Solo vazio: tenta plantar a semente favorita
          const semente = jardim.plants[CONFIG.sementeFavorita];
          if (semente && semente.unlocked && jardim.nextSeed <= 0) {
            jardim.useTool(x, y);
            log('debug', `🌱 Plantando "${CONFIG.sementeFavorita}" em [${x},${y}]`);
          }
        } else {
          // Planta existente: colhe se madura (age >= matureAge)
          const plantaId = tile[0] - 1;
          const planta = jardim.plantsById[plantaId];
          const age = tile[1];
          if (planta && age >= planta.mature) {
            jardim.harvest(x, y);
            log('debug', `🌾 Colhido: "${planta.name}" [${x},${y}]`);
          }
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  8. MERCADO DE AÇÕES — Stock Market (Brokerage)
  //     Compra quando preço está baixo, vende quando está alto.
  //     Estratégia conservadora: vende acima de 150% do valor base.
  // ════════════════════════════════════════════════════════════════
  function gerenciarMercado() {
    if (!jogoOk() || !CONFIG.gerenciarMercado || estado.pausado) return;

    const escritorio = Game.Objects['Office'];
    if (!escritorio || !escritorio.minigame) return;

    const mercado = escritorio.minigame;

    for (const simbolo in mercado.goodsById) {
      const acao = mercado.goodsById[simbolo];
      if (!acao) continue;

      const precoAtual = acao.val;
      const precoBase  = acao.baseVal || precoAtual;
      const quantidade = acao.stock;

      // Vender se preço >= limiar configurado
      if (quantidade > 0 && precoAtual >= precoBase * CONFIG.limiarVendaMercado) {
        try {
          mercado.sellGood(acao.id, quantidade);
          log('info', `📈 Ação vendida: ${acao.name} x${quantidade} @ ${precoAtual.toFixed(2)}`);
        } catch(e) {}
      }

      // Comprar se preço está abaixo de 75% do base e temos dinheiro
      if (precoAtual < precoBase * 0.75 && Game.cookies > precoAtual * 10) {
        try {
          mercado.buyGood(acao.id, Math.min(10, acao.maxStock - quantidade));
          log('debug', `📉 Ação comprada: ${acao.name} @ ${precoAtual.toFixed(2)}`);
        } catch(e) {}
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  9. GERENCIAMENTO DE TEMPORADAS (Seasons)
  //     Prioridade: Valentim (bônus cookies) → Natal (renas) →
  //                 Halloween (biscoitos assustadores) → Business Day
  // ════════════════════════════════════════════════════════════════
  function verificarTemporada() {
    if (!jogoOk() || estado.pausado) return;

    // Lista de upgrades de temporada em ordem de prioridade
    const temporadasPrioridade = [
      "Lovesick biscuit",   // Valentim
      "Festive biscuit",    // Natal
      "Ghostly biscuit",    // Halloween
      "Fool's biscuit",     // Business Day
    ];

    for (const nomeUpgrade of temporadasPrioridade) {
      const up = Game.Upgrades[nomeUpgrade];
      if (up && !up.bought && up.unlocked) {
        const preco = up.getPrice();
        if (preco <= Game.cookies * CONFIG.limiteGastoUnico) {
          up.buy();
          log('info', `🗓️  Temporada ativada: "${nomeUpgrade}"`);
          break;
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  10. AUTO ASCENSÃO (Prestige) + GERENCIAMENTO PÓS-ASCENSÃO
  //      Calcula o ganho líquido de chips celestiais.
  //      Após ascender: compra upgrades celestiais → reencarna.
  // ════════════════════════════════════════════════════════════════
  function calcularGanhoPrestigio() {
    if (!jogoOk()) return 0;
    try {
      const totalCookies = Game.cookiesReset + Game.cookiesEarned;
      const chipsPotenciais = Game.HowMuchPrestige(totalCookies);
      return chipsPotenciais - Game.prestige;
    } catch(e) {
      return 0;
    }
  }

  function verificarAscensao() {
    if (!jogoOk() || estado.ascendendo || estado.pausado) return;

    const ganho = calcularGanhoPrestigio();
    if (ganho < CONFIG.prestigioParaAscender) return;

    log('info', `✨ Ascensão iniciada! Ganho de prestígio: ${ganho} chips`);
    estado.ascendendo = true;
    estado.estatisticas.ascensoes++;

    // Para cliques durante a ascensão
    if (estado.clickInterval) clearInterval(estado.clickInterval);

    try {
      Game.Ascend(1);
    } catch(e) {
      log('warn', `Erro ao ascender: ${e.message}`);
      estado.ascendendo = false;
      return;
    }

    setTimeout(() => {
      comprarUpgradesCelestiais();
      setTimeout(() => {
        try {
          Game.Reincarnate(1);
          log('info', '♻️  Reencarnado! Ciclo reiniciado.');
        } catch(e) {
          log('warn', `Erro ao reencarnar: ${e.message}`);
        }
        estado.ascendendo = false;
        iniciarAutoClicker();
      }, 3000);
    }, 3000);
  }

  function comprarUpgradesCelestiais() {
    if (typeof Game === 'undefined') return;

    // Ordem de prioridade para upgrades celestiais:
    // 1. Permanentes que aumentam CpS passivo
    // 2. Upgrades de clique
    // 3. Restantes
    const prioridades = [
      'Permanent upgrade slot I', 'Permanent upgrade slot II',
      'Permanent upgrade slot III', 'Permanent upgrade slot IV',
      'Permanent upgrade slot V',
      'How to bake your dragon',
      'A crumbly egg', 'Tin of butter cookies',
      'Wrinkspire depths',
    ];

    // Primeiro: compra em ordem de prioridade
    for (const nome of prioridades) {
      const up = Game.Upgrades[nome];
      if (up && !up.bought && up.canBuy()) {
        up.buy();
        log('info', `⭐ Celestial prioritário: "${nome}"`);
      }
    }

    // Depois: compra todos os outros disponíveis
    for (const nome in Game.Upgrades) {
      const up = Game.Upgrades[nome];
      if (up && up.pool === 'prestige' && !up.bought && up.canBuy()) {
        up.buy();
        log('info', `⭐ Celestial: "${up.name}"`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  11. DRAGÃO — Aura do Dragão (Krumblor)
  //      Configura a melhor aura de acordo com o estágio do jogo
  // ════════════════════════════════════════════════════════════════
  function configurarDragao() {
    if (!jogoOk() || estado.pausado) return;
    if (!Game.Upgrades['A crumbly egg'] || !Game.Upgrades['A crumbly egg'].bought) return;

    // Durante o jogo ativo: Breath of Milk (bônus de leite)
    // Durante frenzy: Dragon Frenzy
    // Padrão: Radiant Appetite (multiplica ganho de cookies)
    const auraAlvo = estado.frenzyAtivo ? 'Dragon Frenzy' : 'Radiant Appetite';

    try {
      if (Game.dragonAura !== Game.dragonAuras[auraAlvo]) {
        Game.SetDragonAura(Game.dragonAuras[auraAlvo], 0);
        log('debug', `🐉 Aura do dragão: "${auraAlvo}"`);
      }
    } catch(e) {}
  }

  // ════════════════════════════════════════════════════════════════
  //  12. PAINEL DE STATUS — Exibe no console um resumo completo
  // ════════════════════════════════════════════════════════════════
  function exibirStatus() {
    if (!jogoOk()) return;
    const duracao = estado.iniciadoEm
      ? Math.floor((Date.now() - estado.iniciadoEm) / 1000)
      : 0;
    const hh = String(Math.floor(duracao/3600)).padStart(2,'0');
    const mm = String(Math.floor((duracao%3600)/60)).padStart(2,'0');
    const ss = String(duracao%60).padStart(2,'0');

    console.group(`🍪 BOT STATUS — v${estado.versao} — Ativo há ${hh}:${mm}:${ss}`);
    console.log(`🔘 Estado: ${estado.pausado ? '⏸ Pausado' : '▶️ Rodando'}`);
    console.log(`🌙 Modo noturno: ${eHorarioNoturno() ? 'Sim' : 'Não'}`);
    console.log(`🍪 Cookies: ${formatNum(Game.cookies)} (CpS: ${formatNum(Game.cookiesPs)})`);
    console.log(`✨ Prestígio: ${Game.prestige} | Ganho potencial: ${calcularGanhoPrestigio()}`);
    console.log(`⚡ Frenzy: ${estado.frenzyAtivo ? 'SIM' : 'Não'} | Elder: ${estado.elderFrenzy ? 'SIM' : 'Não'}`);
    console.table(estado.estatisticas);
    console.groupEnd();
  }

  // ════════════════════════════════════════════════════════════════
  //  🔁 LOOP PRINCIPAL — Orquestra todos os módulos
  // ════════════════════════════════════════════════════════════════
  function iniciar() {
    if (!jogoOk()) {
      console.warn('⚠️  Aguarde o Cookie Clicker carregar completamente antes de rodar o bot!');
      return;
    }

    if (estado.ativo) {
      log('warn', 'Bot já está ativo. Use BOT.parar() antes de reiniciar.');
      return;
    }

    estado.ativo    = true;
    estado.pausado  = false;
    estado.iniciadoEm = Date.now();

    log('info', `🟢 Bot SUPREMO v${estado.versao} iniciado!`);
    console.table(CONFIG);

    // ── Módulo 1: Auto Clicker (com detector de estado) ───────────
    iniciarAutoClicker();

    // Verifica mudança de buffs a cada 2s (ajusta velocidade)
    registrarIntervalo(setInterval(detectarBuffs, 2000));

    // Verifica modo noturno a cada minuto
    registrarIntervalo(setInterval(() => {
      if (eHorarioNoturno()) { ativarModoNoturno(); iniciarAutoClicker(); }
      else { desativarModoNoturno(); iniciarAutoClicker(); }
    }, 60000));

    // ── Módulo 2: Golden Cookies / Shimmers ──────────────────────
    registrarIntervalo(setInterval(clicarShimmers, CONFIG.intervaloGoldenCookie));

    // ── Módulo 3: Compras inteligentes ───────────────────────────
    registrarIntervalo(setInterval(cicloDeCompras, CONFIG.intervaloCompras));

    // ── Módulo 4: Wrinklers ───────────────────────────────────────
    registrarIntervalo(setInterval(gerenciarWrinklers, CONFIG.intervaloWrinklers));

    // ── Módulo 5: Grimório ────────────────────────────────────────
    registrarIntervalo(setInterval(usarGrimorio, CONFIG.intervaloGrimorio));

    // ── Módulo 6: Panteon ─────────────────────────────────────────
    registrarIntervalo(setInterval(configurarPanteon, 30000));

    // ── Módulo 7: Jardim ──────────────────────────────────────────
    registrarIntervalo(setInterval(gerenciarJardim, 60000));

    // ── Módulo 8: Mercado de Ações ────────────────────────────────
    registrarIntervalo(setInterval(gerenciarMercado, 30000));

    // ── Módulo 9: Temporadas ──────────────────────────────────────
    registrarIntervalo(setInterval(verificarTemporada, CONFIG.intervaloCompras));

    // ── Módulo 10: Ascensão ───────────────────────────────────────
    registrarIntervalo(setInterval(verificarAscensao, CONFIG.intervaloVerificaAscensao));

    // ── Módulo 11: Dragão ─────────────────────────────────────────
    registrarIntervalo(setInterval(configurarDragao, 15000));

    // ── Status periódico (a cada 5 minutos) ───────────────────────
    registrarIntervalo(setInterval(exibirStatus, 300000));

    // Status imediato
    setTimeout(exibirStatus, 2000);

    log('info', '✅ Todos os módulos ativos. Comandos: BOT.parar() | BOT.pausar() | BOT.retomar() | BOT.status()');
  }

  // ════════════════════════════════════════════════════════════════
  //  CONTROLES PÚBLICOS
  // ════════════════════════════════════════════════════════════════
  function parar() {
    limparIntervalos();
    estado.ativo   = false;
    estado.pausado = false;
    log('info', '🔴 Bot parado. Execute BOT.iniciar() para reiniciar.');
  }

  function pausar() {
    if (!estado.ativo) { log('warn', 'Bot não está ativo.'); return; }
    estado.pausado = true;
    if (estado.clickInterval) clearInterval(estado.clickInterval);
    log('info', '⏸  Bot pausado. Execute BOT.retomar() para continuar.');
  }

  function retomar() {
    if (!estado.ativo) { log('warn', 'Bot não está ativo. Use BOT.iniciar()'); return; }
    estado.pausado = false;
    iniciarAutoClicker();
    log('info', '▶️  Bot retomado!');
  }

  // ════════════════════════════════════════════════════════════════
  //  API PÚBLICA
  // ════════════════════════════════════════════════════════════════
  return {
    iniciar,
    parar,
    pausar,
    retomar,
    status: exibirStatus,
    estado,
    config: CONFIG,
  };
})();

// ════════════════════════════════════════════════════════════════════
//  🚀 INICIALIZAÇÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════════════════
BOT.iniciar();
