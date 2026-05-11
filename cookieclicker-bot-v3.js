// ╔══════════════════════════════════════════════════════════════════╗
// ║          🍪 COOKIE CLICKER BOT — EDIÇÃO DEFINITIVA v3.0          ║
// ║                                                                  ║
// ║  Reescrita da v2 com correção de bugs críticos e novas features ║
// ║                                                                  ║
// ║  Corrige:                                                        ║
// ║   • Stock Market (estava lendo 'Office' em vez de 'Bank')       ║
// ║   • Wrath Cookies (tipo é 'golden' com .wrath=1, não 'wrath')   ║
// ║   • Aura do Dragão (comparação ID × objeto)                     ║
// ║   • Heavenly upgrades inexistentes                              ║
// ║   • Pantheon ignorando cooldown de swaps                        ║
// ║   • Estratégia de wrinklers (default agora mantém 10 alimentados)║
// ║                                                                  ║
// ║  Novidades:                                                      ║
// ║   • Auto-colheita de Sugar Lumps (item ignorado pela v2)        ║
// ║   • Detecção de Cursed Finger (não desperdiça CPU)              ║
// ║   • Persistência de estatísticas em localStorage                ║
// ║   • Atalhos de teclado (Alt+P pausar, Alt+S status)             ║
// ║   • Cálculo de eficiência marginal real para edifícios          ║
// ║   • Combo Force Hand of Fate durante Click Frenzy               ║
// ║   • Confirmação opcional antes de ascender                      ║
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
  const VERSAO = '3.0.0';
  const STORAGE_KEY = 'cookieClickerBot_v3_stats';

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
      // Recheca condições — buffs/horários podem ter mudado
      if (velocidadeIdeal() !== estado.velocidadeAtual) { iniciarAutoClicker(); return; }
      Game.ClickCookie(0); // 0 = sem efeito visual (mais rápido)
      estado.estatisticas.cliques++;
    }, vel);
  }

  // ════════════════════════════════════════════════════════════════
  //  3. SHIMMERS — Golden / Wrath / Reindeer
  //  Bug fix: Wrath Cookie é type='golden' com .wrath=1 (não type='wrath')
  // ════════════════════════════════════════════════════════════════
  function clicarShimmers() {
    if (!jogoOk() || estado.pausado || !Game.shimmers) return;

    for (const s of Game.shimmers) {
      if (s.life <= 0) continue;

      if (s.type === 'golden') {
        const wrath = !!s.wrath;
        if (wrath && !CONFIG.clicarWrathCookies) continue;

        s.pop();
        if (wrath) {
          estado.estatisticas.wrathsCaptados++;
          log('warn', `😈 Wrath Cookie clicado (total: ${estado.estatisticas.wrathsCaptados})`);
        } else {
          estado.estatisticas.goldensCaptados++;
          log('info', `🌟 Golden Cookie capturado (total: ${estado.estatisticas.goldensCaptados})`);
        }
      } else if (s.type === 'reindeer' && CONFIG.clicarRenas) {
        s.pop();
        estado.estatisticas.renasCaptadas++;
        log('info', `🦌 Rena capturada (total: ${estado.estatisticas.renasCaptadas})`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  4. COMPRAS — Upgrades e Edifícios
  //  Edifícios são ordenados pelo Payback Period (PP) real
  // ════════════════════════════════════════════════════════════════
  function comprarUpgrades() {
    if (!jogoOk()) return false;
    let comprou = false;

    // Ordena por preço crescente (compra o mais barato primeiro)
    const upgrades = [...Game.UpgradesInStore].sort((a, b) => a.getPrice() - b.getPrice());

    for (const up of upgrades) {
      // Pula upgrades de toggle (temporadas, milk picker etc.) — tratados em outros módulos
      if (up.pool === 'toggle') continue;
      // Pula upgrades de cookies "vault" do dragão (não dão CpS direto)
      if (up.pool === 'dragon') continue;

      const preco = up.getPrice();
      const disp = saldoDisponivel();
      if (preco > disp * CONFIG.limiteGastoUnico) continue;

      try {
        up.buy(1);
        estado.estatisticas.comprasFeitas++;
        log('info', `🔬 Upgrade: "${up.name}" → ${formatNum(preco)}`);
        comprou = true;
      } catch (e) { /* já comprado / bloqueado */ }
    }
    return comprou;
  }

  // Calcula o ganho de CpS que UMA unidade adicional do edifício traria
  function ganhoCpSdaProximaUnidade(obj) {
    if (!obj || obj.amount === undefined) return 0;
    // storedTotalCps = CpS atual de todas as unidades do edifício
    // baseCps        = CpS base de UMA unidade (sem multiplicadores)
    // A diferença ao comprar +1 é aproximadamente (storedTotalCps / amount) se amount>0
    // Para amount=0, usamos storedCps (que considera multiplicadores em 1 unidade)
    const cpsAtual = obj.storedTotalCps || 0;
    if (obj.amount > 0 && cpsAtual > 0) {
      return cpsAtual / obj.amount;
    }
    return (obj.storedCps || obj.baseCps || 0) * (Game.globalCpsMult || 1);
  }

  function comprarMelhorEdificio() {
    if (!jogoOk()) return;
    const disp = saldoDisponivel();
    let melhor = null;
    let melhorEficiencia = -Infinity; // CpS ganho / preço

    Game.ObjectsById.forEach(obj => {
      if (!obj || obj.locked) return;
      const preco = obj.bulkPrice !== undefined ? obj.bulkPrice : obj.price;
      if (preco > disp * CONFIG.limiteGastoUnico) return;

      const ganho = ganhoCpSdaProximaUnidade(obj);
      if (ganho <= 0) return;

      const eficiencia = ganho / preco;
      if (eficiencia > melhorEficiencia) {
        melhorEficiencia = eficiencia;
        melhor = obj;
      }
    });

    if (melhor) {
      try {
        melhor.buy(1);
        estado.estatisticas.comprasFeitas++;
        log('info', `🏗️  ${melhor.name} → ${formatNum(melhor.price)} (PP ≈ ${(1/melhorEficiencia).toExponential(1)}s)`);
      } catch (e) { /* sem cookies suficientes */ }
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
  //  5. WRINKLERS — Estratégia ótima: manter N alimentados
  //  Cada wrinkler devolve 110% do que sugou; 10 wrinklers ≈ banco×13
  // ════════════════════════════════════════════════════════════════
  function gerenciarWrinklers() {
    if (!jogoOk() || !CONFIG.estourarWrinklers || estado.pausado || !Game.wrinklers) return;

    // Conta apenas wrinklers em fase 2 (gordos/sugando)
    const gordos = Game.wrinklers.filter(w => w && w.phase === 2);
    const shinies = gordos.filter(w => w.type === 1); // type=1 é shiny (vale mais ao estourar)

    // Estoura shinies sempre (eles não dão o bônus de cookies devolvidos mas dão achievements)
    if (CONFIG.estourarSomenteSeShinyOuFora) {
      for (const w of shinies) {
        popWrinkler(w);
      }
    }

    // Conta wrinklers normais (não-shiny) gordos
    const normais = gordos.filter(w => w.type !== 1);
    const excedente = normais.length - CONFIG.wrinklersParaManter;

    if (excedente <= 0) return;

    // Estoura os mais "cheios" primeiro (sugaram mais → devolvem mais)
    const ordenados = [...normais].sort((a, b) => (b.sucked || 0) - (a.sucked || 0));
    let estourados = 0;
    for (const w of ordenados) {
      if (estourados >= excedente) break;
      popWrinkler(w);
      estourados++;
    }

    if (estourados > 0) {
      log('info', `🐛 ${estourados} wrinkler(s) estourado(s). Total: ${estado.estatisticas.wrinklersEstourados}`);
    }
  }

  function popWrinkler(w) {
    try {
      w.hp = 0; // dispara morte na próxima atualização
      estado.estatisticas.wrinklersEstourados++;
    } catch (e) { /* wrinkler inválido */ }
  }

  // ════════════════════════════════════════════════════════════════
  //  6. GRIMÓRIO — Wizard Tower
  //  Combo opcional: só conjura FSM em cima de Frenzy (lucro brutal)
  // ════════════════════════════════════════════════════════════════
  function usarGrimorio() {
    if (!jogoOk() || !CONFIG.usarGrimorio || estado.pausado) return;
    const wt = Game.Objects['Wizard tower'];
    if (!wt || !wt.minigame) return;
    const g = wt.minigame;

    const chaveMagia = CONFIG.magiaPrioridade === 'FSM'
      ? 'hand of fate'
      : "gambler's fever dream";
    const magia = g.spells[chaveMagia];
    if (!magia) return;

    const custo = Math.ceil(g.getSpellCost(magia));
    if (g.magic < custo) return;

    // Combo brutal: só lança FSM durante Frenzy (garante Click Frenzy combinado)
    if (CONFIG.magiaPrioridade === 'FSM' && CONFIG.comboFSMcomFrenzy && !estado.frenzyAtivo) {
      return;
    }

    try {
      g.castSpell(magia);
      estado.estatisticas.magiasConjuradas++;
      log('info', `🔮 Magia: "${magia.name}" (custo ${custo}) — total: ${estado.estatisticas.magiasConjuradas}`);
    } catch (e) {
      log('debug', `Grimório erro: ${e.message}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  7. PANTHEON — Configuração de espíritos
  //  Respeita o cooldown de swaps (não tenta trocar à toa)
  // ════════════════════════════════════════════════════════════════
  function configurarPanteon() {
    if (!jogoOk() || !CONFIG.gerenciarPanteon || estado.pausado) return;
    const templo = Game.Objects['Temple'];
    if (!templo || !templo.minigame) return;
    const p = templo.minigame;

    // Sem swaps disponíveis? Não faz nada (evita logs/erros inúteis)
    if (typeof p.swaps === 'number' && p.swaps <= 0) return;

    const noturno = eHorarioNoturno();
    // Configuração: diamond (slot 0, +bônus), ruby (slot 1), jade (slot 2)
    const alvo = noturno
      ? ['Skruuia', 'Mokalsium', 'Cyclius']   // wrinkler-mode + CpS
      : ['Holobore', 'Godzamok', 'Mokalsium']; // CpS + cliques

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
  //  8. JARDIM — Bug fix: useTool(plantId+1) para plantar
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

        // Tile vazio: planta se a semente está desbloqueada e não há cooldown
        if (tile[0] === 0) {
          if (semente.unlocked && (j.nextSeed === undefined || j.nextSeed <= 0)) {
            try {
              j.useTool(semente.id + 1, x, y); // +1 porque 0=harvest, 1+=planta
            } catch (e) { /* tile bloqueado */ }
          }
        } else {
          // Tile com planta: colhe se madura
          const planta = j.plantsById[tile[0] - 1];
          const age    = tile[1];
          if (planta && age >= planta.mature) {
            try {
              j.harvest(x, y);
            } catch (e) { /* já colhida */ }
          }
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  9. MERCADO DE AÇÕES — BUG FIX: É no 'Bank', não 'Office'
  // ════════════════════════════════════════════════════════════════
  function gerenciarMercado() {
    if (!jogoOk() || !CONFIG.gerenciarMercado || estado.pausado) return;
    const banco = Game.Objects['Bank']; // ← v2 estava lendo 'Office' (inexistente)
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

      // Vender se preço >= limiar
      if (qtd > 0 && precoAtual >= precoBase * CONFIG.limiarVendaMercado) {
        try {
          m.sellGood(acao.id, qtd);
          log('info', `📈 Vendido ${qtd}× ${acao.symbol || acao.name} @ ${precoAtual.toFixed(2)}`);
        } catch (e) {}
      }
      // Comprar se preço <= limiar e temos margem
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
  //  10. SUGAR LUMPS — Novidade na v3
  //  Tipos diferentes têm "melhor hora" diferente; padrão: aos 22h (ripe)
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
    } catch (e) {
      log('debug', `Lump erro: ${e.message}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  11. DRAGÃO — Aura
  //  BUG FIX v2: Game.dragonAura é ID; Game.dragonAuras[nome] é undefined
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
    // Precisa ter o dragão "treinado" no mínimo para ter auras
    if (Game.dragonLevel < 5) return;

    const nomeAlvo = estado.frenzyAtivo ? CONFIG.auraFrenzy : CONFIG.auraNormal;
    const alvo = buscarAuraPorNome(nomeAlvo);
    if (!alvo) return;

    if (Game.dragonAura === alvo.id) return; // já está correta

    try {
      Game.SetDragonAura(alvo.id, 0);
      // SetDragonAura abre confirmação visual; força a confirmação:
      if (typeof Game.ConfirmPrompt === 'function') Game.ConfirmPrompt();
      log('debug', `🐉 Aura → "${nomeAlvo}"`);
    } catch (e) { /* dragão não pronto */ }
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
        // empurra a próxima verificação para 5 minutos para não spamar
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
        estado.ascendendo = false;
        iniciarAutoClicker();
      }, 3000);
    }, 3000);
  }

  // Upgrades celestiais com prioridade — só nomes que realmente existem
  const HEAVENLY_PRIORIDADE = [
    'Permanent upgrade slot I',
    'Permanent upgrade slot II',
    'Permanent upgrade slot III',
    'Permanent upgrade slot IV',
    'Permanent upgrade slot V',
    'How to bake your dragon',
    'A crumbly egg',
    'Heavenly cookies',
    'Tin of butter cookies',
    'Tin of british tea biscuits',
    'Box of macarons',
    'Box of brand biscuits',
    'Lasting fortune',
    'Lucky digit',
    'Lucky number',
    'Lucky payout',
    'Heavenly luck',
    'Sugar baking',
    'Sugar craving',
    'Sugar aging process',
    'Season switcher',
    'Starter kit',
    'Starter kitchen',
  ];

  function comprarUpgradesCelestiais() {
    if (typeof Game === 'undefined') return;

    // Primeiro: prioridades (na ordem)
    for (const nome of HEAVENLY_PRIORIDADE) {
      const up = Game.Upgrades[nome];
      if (up && !up.bought && up.canBuy && up.canBuy()) {
        try {
          up.buy(); log('info', `⭐ Prio: "${nome}"`);
        } catch (e) {}
      }
    }

    // Depois: tudo que sobrar
    for (const nome in Game.Upgrades) {
      const up = Game.Upgrades[nome];
      if (up && up.pool === 'prestige' && !up.bought && up.canBuy && up.canBuy()) {
        try {
          up.buy(); log('info', `⭐ Celestial: "${up.name}"`);
        } catch (e) {}
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
    // Reaplica auto-clicker periodicamente para cobrir mudança de modo noturno
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

// ════════════════════════════════════════════════════════════════════
//  🚀 INICIALIZAÇÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════════════════
BOT.iniciar();
