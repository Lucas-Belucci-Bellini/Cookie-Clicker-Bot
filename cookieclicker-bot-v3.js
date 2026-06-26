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
      ? ['Skruu