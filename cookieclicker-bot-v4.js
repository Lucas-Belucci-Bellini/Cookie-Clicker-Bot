// ╔══════════════════════════════════════════════════════════════════╗
// ║          🍪 COOKIE CLICKER BOT — EDIÇÃO DEFINITIVA v4.0          ║
// ║                                                                  ║
// ║  Reescrita da v3 com timer de espera pós-ascensão                ║
// ║                                                                  ║
// ║  Novidades:                                                      ║
// ║   • Timer de 5 minutos após reencarnação para evitar início      ║
// ║     imediato (conforme solicitado pelo usuário)                  ║
// ║   • Melhoria na detecção de estado de reencarnação               ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  COMO USAR:
//   1. Abra Cookie Clicker (web ou Steam)
//   2. F12 → aba Console
//   3. Cole TODO este script e pressione Enter
//   4. Comandos:
//        BOT.parar()    BOT.pausar()    BOT.retomar()
//        BOT.status()   BOT.resetStats()
//        BOT.ascendAgora()    (força ascensão imediata)
//   5. Atalhos: Alt+P (pausar/retomar), Alt+S (status)

// ════════════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURAÇÕES — Ajuste antes de rodar
// ════════════════════════════════════════════════════════════════════
const CONFIG = {
  // ── Clique ──────────────────────────────────────────────────────
  intervaloCliqueBase:        50,   // ms entre cliques normais
  intervaloCliqueFrenzy:      10,   // ms durante Frenzy / Click Frenzy
  intervaloCliqueElder:       20,   // ms durante Elder Frenzy
  pausarDuranteCursedFinger:  true, // não clica durante Cursed Finger (já dá CpS×10 sozinho)

  // ── Compras ─────────────────────────────────────────────────────
  intervaloCompras:           3000, // ms entre ciclos de compra
  limiteGastoUnico:           0.5,  // máx. fração do saldo gasto numa compra
  comprarUpgradesFirst:       true, // upgrades antes de edifícios
  reservaMinima:              0,    // cookies que NUNCA serão gastos
  reservaParaMagia:           true, // reserva cookies para Hand of Fate quando perto de Click Frenzy

  // ── Objetos Especiais ───────────────────────────────────────────
  intervaloGoldenCookie:      250,  // ms entre varreduras de shimmers
  clicarWrathCookies:         true, // clicar em Wrath Cookies (vermelhos)
  clicarRenas:                true, // clicar em renas (temporada Natal)

  // ── Wrinklers (a estratégia ótima é mantê-los alimentados) ──────
  estourarWrinklers:          true,
  wrinklersParaManter:        10,   // mantém 10 wrinklers gordos (multiplica banco ~13×)
  estourarSomenteSeShinyOuFora: true,// só estoura se ultrapassar o limite OU for shiny
  intervaloWrinklers:         30000,

  // ── Modo Noturno (pausa cliques mas mantém o resto) ─────────────
  modoNoturnoAtivo:           false,// desativado por padrão na v3 (estava mais atrapalhando)
  horarioInicioNoite:         23,
  horarioFimNoite:            7,

  // ── Ascensão ────────────────────────────────────────────────────
  prestigioParaAscender:      100,  // chips LÍQUIDOS necessários para ascender
  intervaloVerificaAscensao:  60000,
  confirmarAntesDeAscender:   false,// se true, pede confirmação no console
  delayPosReencarnacao:       300000, // 5 minutos (300.000 ms) de espera após "acender" / reencarnar

  // ── Grimório ────────────────────────────────────────────────────
  usarGrimorio:               true,
  magiaPrioridade:            'FSM',// 'FSM' (Force the Hand of Fate) | 'GF' (Gambler's Fever Dream)
  intervaloGrimorio:          10000,
  comboFSMcomFrenzy:          true, // só conjura FSM em cima de Frenzy para combo brutal

  // ── Jardim ──────────────────────────────────────────────────────
  gerenciarJardim:            true,
  sementeFavorita:            'queenbeet',
  intervaloJardim:            60000,

  // ── Pantheon ────────────────────────────────────────────────────
  gerenciarPanteon:           true,
  intervaloPanteon:           120000,// só troca quando há swaps disponíveis

  // ── Mercado de Ações (Bank, não Office!) ────────────────────────
  gerenciarMercado:           true,
  limiarVendaMercado:         1.5,  // vende quando preço >= 150% do base
  limiarCompraMercado:        0.75, // compra quando preço <= 75% do base
  intervaloMercado:           30000,

  // ── Sugar Lumps ─────────────────────────────────────────────────
  colherSugarLumps:           true,
  esperarLumpMaduro:          true, // true = espera 22h (ripe); false = colhe aos 20h (mature)
  intervaloSugarLump:         300000,// checa a cada 5 min

  // ── Dragão ──────────────────────────────────────────────────────
  gerenciarDragao:            true,
  auraNormal:                 'Radiant Appetite',
  auraFrenzy:                 'Dragon Cursor',
  intervaloDragao:            30000,

  // ── Temporadas ──────────────────────────────────────────────────
  prioridadeTemporadas:       ['valentines','christmas','halloween','easter','fools'],

  // ── Estatísticas ────────────────────────────────────────────────
  salvarStatsLocalStorage:    true,
  intervaloStatusPeriodico:   300000,// 5 min entre status automáticos

  // ── Log ─────────────────────────────────────────────────────────
  logAtivado:                 true,
  logNivel:                   'info',// 'debug' | 'info' | 'warn'
};

// ════════════════════════════════════════════════════════════════════
//  🔧 NÚCLEO DO BOT
// ════════════════════════════════════════════════════════════════════
const BOT = (() => {
  const VERSAO = '4.0.0';
  const STORAGE_KEY = 'cookieClickerBot_v4_stats';

  const estado = {
    ativo:           false,
    pausado:         false,
    intervalos:      [],
    clickInterval:   null,
    frenzyAtivo:     false,
    clickFrenzyAtivo:false,
    elderFrenzy:     false,
    cursedFinger:    false,
    ascendendo:      false,
    iniciadoEm:      null,
    velocidadeAtual: null, // permite detectar mudança real
    estatisticas: {
      cliques:             0,
      goldensCaptados:     0,
      wrathsCaptados:      0,
      renasCaptadas:       0,
      comprasFeitas:       0,
      ascensoes:           0,
      wrinklersEstourados: 0,
      magiasConjuradas:    0,
      lumpsColhidos:       0,
      cookiesIniciais:     0,
    },
  };

  // ── Utilitários ─────────────────────────────────────────────────
  const NIVEIS_LOG = { debug: 0, info: 1, warn: 2 };
  const ICONES_LOG = { debug: '🔍', info: '🍪', warn: '⚠️' };

  function log(nivel, msg) {
    if (!CONFIG.logAtivado) return;
    if (NIVEIS_LOG[nivel] < NIVEIS_LOG[CONFIG.logNivel]) return;
    const hora = new Date().toLocaleTimeString('pt-BR');
    console.log(`[${ICONES_LOG[nivel]} BOT ${hora}] ${msg}`);
  }

  function jogoOk() {
    return typeof Game !== 'undefined' && Game.ready && !estado.ascendendo;
  }

  function formatNum(n) {
    if (!isFinite(n)) return '∞';
    if (n >= 1e18) return (n / 1e18).toFixed(2) + ' quint.';
    if (n >= 1e15) return (n / 1e15).toFixed(2) + ' quat.';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + ' tri';
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + ' bi';
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + ' mi';
    if (n >= 1e3)  return (n / 1e3).toFixed(2)  + ' k';
    return Math.floor(n).toString();
  }

  function eHorarioNoturno() {
    if (!CONFIG.modoNoturnoAtivo) return false;
    const h = new Date().getHours();
    const ini = CONFIG.horarioInicioNoite;
    const fim = CONFIG.horarioFimNoite;
    return ini > fim ? (h >= ini || h < fim) : (h >= ini && h < fim);
  }

  function registrarIntervalo(id) {
    estado.intervalos.push(id);
    return id;
  }

  function limparIntervalos() {
    if (estado.clickInterval) clearInterval(estado.clickInterval);
    estado.intervalos.forEach(clearInterval);
    estado.intervalos = [];
    estado.clickInterval = null;
  }

  function saldoDisponivel() {
    return Math.max(0, Game.cookies - CONFIG.reservaMinima);
  }

  // ════════════════════════════════════════════════════════════════
  //  📦 PERSISTÊNCIA EM localStorage
  // ════════════════════════════════════════════════════════════════
  function salvarStats() {
    if (!CONFIG.salvarStatsLocalStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado.estatisticas));
    } catch (e) { /* localStorage cheio ou bloqueado */ }
  }

  function carregarStats() {
    if (!CONFIG.salvarStatsLocalStorage) return;
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (!dados) return;
      const carregado = JSON.parse(dados);
      Object.assign(estado.estatisticas, carregado);
      log('debug', `Stats anteriores carregadas: ${carregado.cliques} cliques, ${carregado.ascensoes} ascensões`);
    } catch (e) { /* dados corrompidos */ }
  }

  function resetStats() {
    Object.keys(estado.estatisticas).forEach(k => { estado.estatisticas[k] = 0; });
    estado.estatisticas.cookiesIniciais = jogoOk() ? Game.cookies : 0;
    salvarStats();
    log('info', '📊 Estatísticas resetadas.');
  }

  // ════════════════════════════════════════════════════════════════
  //  1. DETECÇÃO DE BUFFS — Frenzy / Click Frenzy / Elder / Cursed
  // ════════════════════════════════════════════════════════════════
  function detectarBuffs() {
    if (!jogoOk()) return;
    let frenzy = false, click = false, elder = false, cursed = false;

    for (const nome in Game.buffs) {
      const n = nome.toLowerCase();
      if (n === 'elder frenzy')         elder  = true;
      else if (n === 'click frenzy')    click  = true;
      else if (n === 'frenzy')          frenzy = true;
      else if (n === 'cursed finger')   cursed = true;
      else if (n === 'dragonflight')    click  = true; // dragonflight = click multiplier
    }

    const mudou =
      frenzy !== estado.frenzyAtivo ||
      click  !== estado.clickFrenzyAtivo ||
      elder  !== estado.elderFrenzy ||
      cursed !== estado.cursedFinger;

    estado.frenzyAtivo      = frenzy;
    estado.clickFrenzyAtivo = click;
    estado.elderFrenzy      = elder;
    estado.cursedFinger     = cursed;

    if (mudou) iniciarAutoClicker();
  }

  // ════════════════════════════════════════════════════════════════
  //  2. AUTO CLICKER — Velocidade adaptativa
  // ════════════════════════════════════════════════════════════════
  function velocidadeIdeal() {
    if (estado.cursedFinger && CONFIG.pausarDuranteCursedFinger) return null;
    if (eHorarioNoturno()) return null;
    if (estado.clickFrenzyAtivo) return CONFIG.intervaloCliqueFrenzy;
    if (estado.elderFrenzy)      return CONFIG.intervaloCliqueElder;
    if (estado.frenzyAtivo)      return CONFIG.intervaloCliqueFrenzy;
    return CONFIG.intervaloCliqueBase;
  }

  function iniciarAutoClicker() {
    if (estado.clickInterval) { clearInterval(estado.clickInterval); estado.clickInterval = null; }
    if (!estado.ativo || estado.pausado) return;

    const vel = velocidadeIdeal();
    estado.velocidadeAtual = vel;
    if (vel === null) {
      log('debug', '⏸  Cliques pausados (noturno/cursed finger)');
      return;
    }

    estado.clickInterval = setInterval(() => {
      if (!jogoOk() || estado.pausado) return;
      try {
        Game.ClickCookie();
        estado.estatisticas.cliques++;
      } catch (e) {}
    }, vel);
  }

  // ════════════════════════════════════════════════════════════════
  //  3. SHIMMERS — Golden Cookies, Renas, Wrath Cookies
  // ════════════════════════════════════════════════════════════════
  function clicarShimmers() {
    if (!jogoOk() || estado.pausado) return;
    if (!Game.shimmers || Game.shimmers.length === 0) return;

    Game.shimmers.forEach(s => {
      if (s.type === 'golden') {
        if (s.wrath && !CONFIG.clicarWrathCookies) return;
        s.pop();
        if (s.wrath) estado.estatisticas.wrathsCaptados++;
        else estado.estatisticas.goldensCaptados++;
        log('info', `✨ ${s.wrath ? 'Wrath' : 'Golden'} Cookie captado!`);
      } else if (s.type === 'reindeer' && CONFIG.clicarRenas) {
        s.pop();
        estado.estatisticas.renasCaptadas++;
        log('info', '🦌 Rena captada!');
      }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  4. COMPRAS — Edifícios e Upgrades (Eficiência Marginal)
  // ════════════════════════════════════════════════════════════════
  function cicloDeCompras() {
    if (!jogoOk() || estado.pausado) return;

    // 1. Upgrades (se configurado para priorizar)
    if (CONFIG.comprarUpgradesFirst) {
      const comprou = tentarComprarUpgrade();
      if (comprou) return;
    }

    // 2. Edifícios (baseado em custo/benefício)
    tentarComprarEdificio();

    // 3. Upgrades (se não comprou antes)
    if (!CONFIG.comprarUpgradesFirst) {
      tentarComprarUpgrade();
    }
  }

  function tentarComprarUpgrade() {
    const upgrades = Game.UpgradesInStore;
    if (upgrades.length === 0) return false;

    // Filtra upgrades que podemos pagar e que não são cosméticos/switchers caros
    const acessiveis = upgrades.filter(u => {
      if (u.pool === 'toggle') return false;
      const preco = u.getPrice();
      return preco <= saldoDisponivel() && preco <= Game.cookies * CONFIG.limiteGastoUnico;
    });

    if (acessiveis.length === 0) return false;

    // Pega o mais barato dos acessíveis
    acessiveis.sort((a, b) => a.getPrice() - b.getPrice());
    const alvo = acessiveis[0];

    try {
      alvo.buy();
      estado.estatisticas.comprasFeitas++;
      log('info', `💸 Upgrade: "${alvo.name}" comprado.`);
      return true;
    } catch (e) { return false; }
  }

  function tentarComprarEdificio() {
    const edificios = Game.ObjectsById;
    let melhorEdif = null;
    let melhorROI  = 0;

    edificios.forEach(obj => {
      const preco = obj.getPrice();
      if (preco > saldoDisponivel() || preco > Game.cookies * CONFIG.limiteGastoUnico) return;

      // Cálculo simples de ROI: CpS adicional / Preço
      // Game.cookiesPs é o global, cada prédio tem seu cps individual
      const cpsAdicional = obj.storedCps * Game.globalCpsMult;
      const roi = cpsAdicional / preco;

      if (roi > melhorROI) {
        melhorROI = roi;
        melhorEdif = obj;
      }
    });

    if (melhorEdif) {
      try {
        melhorEdif.buy(1);
        estado.estatisticas.comprasFeitas++;
        log('debug', `🏗️ Edifício: ${melhorEdif.name} comprado.`);
        return true;
      } catch (e) { return false; }
    }
    return false;
  }

  // ════════════════════════════════════════════════════════════════
  //  5. WRINKLERS — Estratégia de retenção
  // ════════════════════════════════════════════════════════════════
  function gerenciarWrinklers() {
    if (!jogoOk() || !CONFIG.estourarWrinklers || estado.pausado) return;
    if (!Game.wrinklers) return;

    const ativos = Game.wrinklers.filter(w => w.phase > 0);
    const count  = ativos.length;

    if (count > CONFIG.wrinklersParaManter) {
      // Estoura os que não são shiny, do menor para o maior (em termos de cookies digeridos)
      const paraEstourar = ativos
        .filter(w => w.type === 0 || !CONFIG.estourarSomenteSeShinyOuFora)
        .sort((a, b) => a.sucked - b.sucked);

      if (paraEstourar.length > 0) {
        const alvo = paraEstourar[0];
        alvo.hp = 0; // mata o wrinkler
        estado.estatisticas.wrinklersEstourados++;
        log('debug', `💥 Wrinkler estourado (população: ${count}).`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  6. GRIMÓRIO — Hand of Fate Combo
  // ════════════════════════════════════════════════════════════════
  function usarGrimorio() {
    if (!jogoOk() || !CONFIG.usarGrimorio || estado.pausado) return;
    const tower = Game.Objects['Wizard tower'];
    if (!tower || !tower.minigame) return;
    const g = tower.minigame;

    // Só conjura se tiver magia suficiente
    const magiaAlvo = CONFIG.magiaPrioridade === 'FSM' ? 'force the hand of fate' : 'gambler\'s fever dream';
    const spell = g.spells[magiaAlvo];
    if (!spell) return;

    const custo = g.getSpellCost(spell);
    if (g.magic < custo) return;

    // Estratégia FSM: esperar por Frenzy se configurado
    if (CONFIG.magiaPrioridade === 'FSM' && CONFIG.comboFSMcomFrenzy && !estado.frenzyAtivo) return;

    try {
      g.castSpell(spell);
      estado.estatisticas.magiasConjuradas++;
      log('info', `🪄 Magia conjurada: ${spell.name}`);
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════
  //  7. PANTHEON
  // ════════════════════════════════════════════════════════════════
  function configurarPanteon() {
    if (!jogoOk() || !CONFIG.gerenciarPanteon || estado.pausado) return;
    const temple = Game.Objects['Temple'];
    if (!temple || !temple.minigame) return;
    const p = temple.minigame;

    if (p.swaps < 1) return;

    const alvo = ['jeremy', 'mokalsium', 'cyclius']; // Exemplo de setup genérico
    alvo.forEach((nome, slot) => {
      const lower = nome.toLowerCase();
      const deus = p.gods[lower];
      if (!deus) return;
      if (p.slot[slot] === deus.id) return; // já está no slot certo

      try {
        p.slotGod(deus, slot);
        log('debug', `⛩️  ${nome} → slot ${slot}`);
      } catch (e) { /* swap bloqueado */ }
    });
  }

  // ════════════════════════════════════════════════════════════════
  //  8. JARDIM
  // ════════════════════════════════════════════════════════════════
  function gerenciarJardim() {
    if (!jogoOk() || !CONFIG.gerenciarJardim || estado.pausado) return;
    const fc = Game.Objects['Farm'];
    if (!fc || !fc.minigame) return;
    const j = fc.minigame;
    if (j.freeze) return;

    const semente = j.plants[CONFIG.sementeFavorita];
    if (!semente) return;

    const cols = j.plot[0] ? j.plot[0].length : 0;
    const rows = j.plot ? j.plot.length : 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = j.getTile(x, y);
        if (!tile) continue;

        if (tile[0] === 0) {
          if (semente.unlocked && (j.nextSeed === undefined || j.nextSeed <= 0)) {
            try {
              j.useTool(semente.id + 1, x, y);
            } catch (e) {}
          }
        } else {
          const planta = j.plantsById[tile[0] - 1];
          const age    = tile[1];
          if (planta && age >= planta.mature) {
            try {
              j.harvest(x, y);
            } catch (e) {}
          }
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  9. MERCADO DE AÇÕES
  // ════════════════════════════════════════════════════════════════
  function gerenciarMercado() {
    if (!jogoOk() || !CONFIG.gerenciarMercado || estado.pausado) return;
    const banco = Game.Objects['Bank'];
    if (!banco || !banco.minigame) return;
    const m = banco.minigame;
    if (!m.goodsById) return;

    for (let i = 0; i < m.goodsById.length; i++) {
      const acao = m.goodsById[i];
      if (!acao) continue;

      const precoAtual = acao.val;
      const precoBase  = acao.basePrice || acao.val;
      const qtd        = acao.stock || 0;
      const max        = m.getGoodMaxStock ? m.getGoodMaxStock(acao) : (acao.maxStock || 100);

      if (qtd > 0 && precoAtual >= precoBase * CONFIG.limiarVendaMercado) {
        try {
          m.sellGood(acao.id, qtd);
          log('info', `📈 Vendido ${qtd}× ${acao.symbol || acao.name} @ ${precoAtual.toFixed(2)}`);
        } catch (e) {}
      }
      else if (precoAtual <= precoBase * CONFIG.limiarCompraMercado && qtd < max) {
        const espaco = max - qtd;
        const podeComprar = Math.floor(Game.cookies / (precoAtual * 1000) / 10);
        const quant = Math.min(10, espaco, podeComprar);
        if (quant > 0) {
          try {
            m.buyGood(acao.id, quant);
            log('debug', `📉 Comprado ${quant}× ${acao.symbol || acao.name} @ ${precoAtual.toFixed(2)}`);
          } catch (e) {}
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  10. SUGAR LUMPS
  // ════════════════════════════════════════════════════════════════
  function colherSugarLump() {
    if (!jogoOk() || !CONFIG.colherSugarLumps || estado.pausado) return;
    if (!Game.canLumps || !Game.canLumps()) return;
    if (!Game.lumpT) return;

    const idade = Date.now() - Game.lumpT;
    const alvo  = CONFIG.esperarLumpMaduro
      ? (Game.lumpRipeAge   || 22*3600*1000)
      : (Game.lumpMatureAge || 20*3600*1000);

    if (idade < alvo) return;

    try {
      const antes = Game.lumps || 0;
      Game.clickLump();
      const depois = Game.lumps || 0;
      if (depois > antes) {
        estado.estatisticas.lumpsColhidos++;
        log('info', `🍬 Sugar Lump colhido! Total na sessão: ${estado.estatisticas.lumpsColhidos}`);
      }
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════
  //  11. DRAGÃO
  // ════════════════════════════════════════════════════════════════
  function buscarAuraPorNome(nome) {
    if (!Game.dragonAuras) return null;
    for (const id in Game.dragonAuras) {
      if (Game.dragonAuras[id] && Game.dragonAuras[id].name === nome) {
        return { id: parseInt(id, 10), aura: Game.dragonAuras[id] };
      }
    }
    return null;
  }

  function configurarDragao() {
    if (!jogoOk() || !CONFIG.gerenciarDragao || estado.pausado) return;
    if (typeof Game.dragonLevel !== 'number') return;
    if (Game.dragonLevel < 5) return;

    const nomeAlvo = estado.frenzyAtivo ? CONFIG.auraFrenzy : CONFIG.auraNormal;
    const alvo = buscarAuraPorNome(nomeAlvo);
    if (!alvo) return;

    if (Game.dragonAura === alvo.id) return;

    try {
      Game.SetDragonAura(alvo.id, 0);
      if (typeof Game.ConfirmPrompt === 'function') Game.ConfirmPrompt();
      log('debug', `🐉 Aura → "${nomeAlvo}"`);
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════
  //  12. TEMPORADAS
  // ════════════════════════════════════════════════════════════════
  const MAPA_TEMPORADAS = {
    valentines: 'Lovesick biscuit',
    christmas:  'Festive biscuit',
    halloween:  'Ghostly biscuit',
    easter:     'Bunny biscuit',
    fools:      "Fool's biscuit",
  };

  function verificarTemporada() {
    if (!jogoOk() || estado.pausado) return;

    for (const chave of CONFIG.prioridadeTemporadas) {
      const nomeUp = MAPA_TEMPORADAS[chave];
      if (!nomeUp) continue;
      const up = Game.Upgrades[nomeUp];
      if (!up || up.bought || !up.unlocked) continue;

      const preco = up.getPrice();
      if (preco <= Game.cookies * CONFIG.limiteGastoUnico) {
        try {
          up.buy();
          log('info', `🗓️  Temporada: "${nomeUp}" ativada`);
          return;
        } catch (e) {}
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  13. ASCENSÃO
  // ════════════════════════════════════════════════════════════════
  function calcularGanhoPrestigio() {
    if (!jogoOk()) return 0;
    try {
      const total = (Game.cookiesReset || 0) + (Game.cookiesEarned || 0);
      const chips = Game.HowMuchPrestige(total);
      return Math.floor(chips - Game.prestige);
    } catch (e) { return 0; }
  }

  function verificarAscensao() {
    if (!jogoOk() || estado.ascendendo || estado.pausado) return;
    const ganho = calcularGanhoPrestigio();
    if (ganho < CONFIG.prestigioParaAscender) return;

    if (CONFIG.confirmarAntesDeAscender) {
      const ok = window.confirm(
        `Bot: ascender agora? Ganho de ${ganho} prestige chips.`
      );
      if (!ok) {
        log('info', '⏭️  Ascensão adiada pelo usuário (próxima verificação em 5min).');
        setTimeout(verificarAscensao, 300000);
        return;
      }
    }

    executarAscensao(ganho);
  }

  function ascendAgora() {
    if (!jogoOk()) { log('warn', 'Jogo não pronto.'); return; }
    const ganho = calcularGanhoPrestigio();
    log('info', `🚀 Ascensão forçada pelo usuário (ganho: ${ganho}).`);
    executarAscensao(ganho);
  }

  function executarAscensao(ganho) {
    log('info', `✨ Ascendendo! +${ganho} prestige chips`);
    estado.ascendendo = true;
    estado.estatisticas.ascensoes++;
    if (estado.clickInterval) clearInterval(estado.clickInterval);

    try {
      Game.Ascend(1);
    } catch (e) {
      log('warn', `Erro ao ascender: ${e.message}`);
      estado.ascendendo = false;
      return;
    }

    setTimeout(() => {
      comprarUpgradesCelestiais();
      setTimeout(() => {
        try {
          Game.Reincarnate(1);
          log('info', '♻️  Reencarnado!');
          estado.estatisticas.cookiesIniciais = 0;
          salvarStats();
        } catch (e) {
          log('warn', `Erro ao reencarnar: ${e.message}`);
        }
        
        // Timer de 5 minutos solicitado pelo usuário após "acender" / reencarnar
        log('info', `⏳ Aguardando ${CONFIG.delayPosReencarnacao / 60000} minutos para retomar as atividades...`);
        setTimeout(() => {
          estado.ascendendo = false;
          iniciarAutoClicker();
          log('info', '🚀 Bot retomou as atividades após o timer pós-ascensão.');
        }, CONFIG.delayPosReencarnacao);

      }, 3000);
    }, 3000);
  }

  const HEAVENLY_PRIORIDADE = [
    'Permanent upgrade slot I', 'Permanent upgrade slot II', 'Permanent upgrade slot III',
    'Permanent upgrade slot IV', 'Permanent upgrade slot V', 'How to bake your dragon',
    'A crumbly egg', 'Heavenly cookies', 'Tin of butter cookies', 'Tin of british tea biscuits',
    'Box of macarons', 'Box of brand biscuits', 'Lasting fortune', 'Lucky digit',
    'Lucky number', 'Lucky payout', 'Heavenly luck', 'Sugar baking', 'Sugar craving',
    'Sugar aging process', 'Season switcher', 'Starter kit', 'Starter kitchen',
  ];

  function comprarUpgradesCelestiais() {
    if (typeof Game === 'undefined') return;
    for (const nome of HEAVENLY_PRIORIDADE) {
      const up = Game.Upgrades[nome];
      if (up && !up.bought && up.canBuy && up.canBuy()) {
        try { up.buy(); log('info', `⭐ Prio: "${nome}"`); } catch (e) {}
      }
    }
    for (const nome in Game.Upgrades) {
      const up = Game.Upgrades[nome];
      if (up && up.pool === 'prestige' && !up.bought && up.canBuy && up.canBuy()) {
        try { up.buy(); log('info', `⭐ Celestial: "${up.name}"`); } catch (e) {}
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  14. STATUS PANEL
  // ════════════════════════════════════════════════════════════════
  function exibirStatus() {
    if (!jogoOk()) return;
    const dur = estado.iniciadoEm ? Math.floor((Date.now() - estado.iniciadoEm) / 1000) : 0;
    const hh = String(Math.floor(dur / 3600)).padStart(2, '0');
    const mm = String(Math.floor((dur % 3600) / 60)).padStart(2, '0');
    const ss = String(dur % 60).padStart(2, '0');

    const ganhoSessao = estado.estatisticas.cookiesIniciais
      ? Game.cookies - estado.estatisticas.cookiesIniciais
      : 0;
    const cookiesPorHora = dur > 0 ? (ganhoSessao / dur) * 3600 : 0;

    console.group(`%c🍪 BOT v${VERSAO} — sessão ${hh}:${mm}:${ss}`, 'color:#d97706;font-weight:bold');
    console.log(`Estado: ${estado.pausado ? '⏸ Pausado' : '▶️ Ativo'} | Noturno: ${eHorarioNoturno() ? 'sim' : 'não'}`);
    console.log(`Buffs: Frenzy=${estado.frenzyAtivo} | Click=${estado.clickFrenzyAtivo} | Elder=${estado.elderFrenzy} | Cursed=${estado.cursedFinger}`);
    console.log(`Cookies: ${formatNum(Game.cookies)} (CpS ${formatNum(Game.cookiesPs)}) — sessão +${formatNum(ganhoSessao)} (${formatNum(cookiesPorHora)}/h)`);
    console.log(`Prestige: ${formatNum(Game.prestige)} | Próxima ascensão: +${calcularGanhoPrestigio()} chips`);
    console.table(estado.estatisticas);
    console.groupEnd();
  }

  // ════════════════════════════════════════════════════════════════
  //  15. ATALHOS DE TECLADO
  // ════════════════════════════════════════════════════════════════
  function handleKey(ev) {
    if (!ev.altKey) return;
    const k = ev.key.toLowerCase();
    if (k === 'p') {
      ev.preventDefault();
      estado.pausado ? retomar() : pausar();
    } else if (k === 's') {
      ev.preventDefault();
      exibirStatus();
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  🔁 LOOP PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  function iniciar() {
    if (!jogoOk()) {
      console.warn('⚠️  Aguarde o Cookie Clicker carregar antes de iniciar o bot.');
      return;
    }
    if (estado.ativo) {
      log('warn', 'Bot já está ativo. Use BOT.parar() antes.');
      return;
    }

    carregarStats();
    estado.estatisticas.cookiesIniciais = Game.cookies;
    estado.ativo      = true;
    estado.pausado    = false;
    estado.iniciadoEm = Date.now();

    log('info', `🟢 Bot DEFINITIVO v${VERSAO} iniciado!`);
    console.table(CONFIG);

    iniciarAutoClicker();

    registrarIntervalo(setInterval(detectarBuffs,            2000));
    registrarIntervalo(setInterval(clicarShimmers,           CONFIG.intervaloGoldenCookie));
    registrarIntervalo(setInterval(cicloDeCompras,           CONFIG.intervaloCompras));
    registrarIntervalo(setInterval(gerenciarWrinklers,       CONFIG.intervaloWrinklers));
    registrarIntervalo(setInterval(usarGrimorio,             CONFIG.intervaloGrimorio));
    registrarIntervalo(setInterval(configurarPanteon,        CONFIG.intervaloPanteon));
    registrarIntervalo(setInterval(gerenciarJardim,          CONFIG.intervaloJardim));
    registrarIntervalo(setInterval(gerenciarMercado,         CONFIG.intervaloMercado));
    registrarIntervalo(setInterval(colherSugarLump,          CONFIG.intervaloSugarLump));
    registrarIntervalo(setInterval(configurarDragao,         CONFIG.intervaloDragao));
    registrarIntervalo(setInterval(verificarTemporada,       CONFIG.intervaloCompras));
    registrarIntervalo(setInterval(verificarAscensao,        CONFIG.intervaloVerificaAscensao));
    registrarIntervalo(setInterval(salvarStats,              30000));
    registrarIntervalo(setInterval(exibirStatus,             CONFIG.intervaloStatusPeriodico));
    registrarIntervalo(setInterval(iniciarAutoClicker,       60000));

    window.addEventListener('keydown', handleKey);
    setTimeout(exibirStatus, 2000);

    log('info', '✅ Todos os módulos ativos. Atalhos: Alt+P (pausa), Alt+S (status).');
  }

  function parar() {
    limparIntervalos();
    window.removeEventListener('keydown', handleKey);
    salvarStats();
    estado.ativo   = false;
    estado.pausado = false;
    log('info', '🔴 Bot parado.');
  }

  function pausar() {
    if (!estado.ativo) { log('warn', 'Bot não está ativo.'); return; }
    estado.pausado = true;
    if (estado.clickInterval) { clearInterval(estado.clickInterval); estado.clickInterval = null; }
    log('info', '⏸  Bot pausado.');
  }

  function retomar() {
    if (!estado.ativo) { log('warn', 'Bot não está ativo. Use BOT.iniciar().'); return; }
    estado.pausado = false;
    iniciarAutoClicker();
    log('info', '▶️  Bot retomado.');
  }

  return {
    iniciar,
    parar,
    pausar,
    retomar,
    status:       exibirStatus,
    resetStats,
    ascendAgora,
    estado,
    config:       CONFIG,
    versao:       VERSAO,
  };
})();

BOT.iniciar();
