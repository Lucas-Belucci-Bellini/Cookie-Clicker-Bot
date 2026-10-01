// ============================================================
// 🍪 COOKIE CLICKER BOT — V6 STABLE
// Runtime-first rewrite: núcleo pequeno, compatível e observável.
// Uso: Cookie Clicker Web -> F12 -> Console -> cole o arquivo inteiro.
// ============================================================

(() => {
  'use strict';

  const VERSION = '6.24.0';
  const KEY = '__COOKIE_CLICKER_BOT_V6__';
  const CONTROL_KEY = '__COOKIE_CLICKER_BOT_CONTROL__';
  const CONTROL = window[CONTROL_KEY] || { broken: false, updatedAt: 0, version: null };
  window[CONTROL_KEY] = CONTROL;

  const CONFIG = {
    clickMs: 25,
    shimmerMs: 250,
    purchaseMs: 2000,
    statusMs: 30000,
    wrinklerMs: 15000,
    prestigeMs: 15000,
    reportMs: 1800000,

    buyBuildings: true,
    buyUpgrades: true,
    clickGolden: true,
    clickWrath: true,
    clickReindeer: true,

    // Mantido desligado por padrão: ascensão é uma ação irreversível no fluxo normal.
    autoAscend: false,
    autoReincarnate: false,
    buyHeavenlyUpgrades: true,
    prestigeThreshold: 100,
    postAscensionDelayMs: 4000,
    ascensionMinGainRatio: 0.05,
    ascensionMaxRecoverySeconds: 21600,
    ascensionRecoverySafetyFactor: 3,
    ascensionMaxPaybackSeconds: 43200,
    ascensionVerificationDelayMs: 1200,
    upgradeObservationWindowMs: 5000,
    upgradeObservationMaxEntries: 96,
    upgradeObservationCooldownMs: 7000,
    upgradeStatisticalMaxWeight: 0.60,

    // Estourar wrinklers por padrão também fica desligado.
    popWrinklers: false,
    wrinklersToKeep: 0,

    spendingLimit: 0.75,
    reserveCookies: 0,
    reserveCookiesRatio: 0.10,
    economyEnabled: true,
    targetPaybackSeconds: 3600,
    upgradeMaxPaybackSeconds: 7200,
    estimatedClicksPerSecond: 10,
    upgradeClickValueWeight: 0.25,
    upgradeFallbackEnabled: true,
    upgradeValueWeight: 1.2,
    buildingValueWeight: 1,
    historyEnabled: true,
    historyMaxEntries: 96,
    healthEnabled: true,
    healthHistoryMaxEntries: 96,
    healthRecoveryCooldownMs: 15000,

    // Minigames são opcionais e só executam quando a API real estiver presente.
    grimoire: false,
    garden: false,
    market: false,
    grimoireEnabled: false,
    grimoireSpell: '',
    grimoireMinMagic: 0,
    gardenEnabled: false,
    gardenHarvestMature: true,
    gardenAutoPlant: false,
    gardenPlantId: null,
    marketEnabled: false,
    marketBuyThreshold: 0,
    marketSellThreshold: 0,
    marketMaxSpendRatio: 0.10,
    pantheon: false,
    pantheonEnabled: false,
    pantheonSlot: 0,
    pantheonGod: '',
    dragon: false,
    dragonEnabled: false,
    dragonAura: '',
    dragonPreferClickFrenzy: true,
    seasonsEnabled: false,
    seasonPriority: ['christmas', 'halloween', 'easter', 'valentines', 'fools'],
    sugarLumpsEnabled: false,
    sugarLumpMinTime: 0,
    sugarLumpMode: 'harvest',
    goldenSpawnDefaultAmount: 10,
    goldenSpawnDefaultIntervalSeconds: 5,
    schedulerIntervalMs: 1000,
    watchdogIntervalMs: 10000,
    watchdogGraceMs: 15000,
    watchdogMaxRecoveryAttempts: 2,
    watchdogRecoveryCooldownMs: 15000,


    logging: true
  };

  const state = {
    active: false,
    paused: false,
    hardStopped: false,
    startedAt: 0,
    cookiesAtStart: 0,
    lastAction: 'nenhuma',
    lastError: null,
    timers: new Map(),
    schedulerTimer: null,
    watchdogTimer: null,
    schedulerTasks: new Map(),
    taskLastRun: new Map(),
    taskFailures: new Map(),
    taskRunCount: new Map(),
    taskRecoveryAttempts: new Map(),
    taskLastRecovery: new Map(),
    taskDurationMs: new Map(),
    taskLastSuccess: new Map(),
    taskHealth: new Map(),
    ascensionPhase: 'READY',
    ascensionSnapshot: null,
    ascensionOutcome: null,
    upgradeObservations: [],
    pendingUpgradeObservations: [],
    goldenSpawnTimer: null,
    goldenSpawnRemaining: 0,
    healthHistory: [],
    timeouts: new Set(),
    ascending: false,
    history: [],
    stats: {
      clicks: 0,
      shimmers: 0,
      upgrades: 0,
      buildings: 0,
      wrinklers: 0,
      ascensions: 0,
      heavenlyUpgrades: 0,
      reincarnations: 0,
      economicDecisions: 0,
      economicNoops: 0,
      historySaves: 0,
      grimoireCasts: 0,
      gardenHarvests: 0,
      gardenPlantings: 0,
      marketBuys: 0,
      marketSells: 0,
      pantheonChanges: 0,
      dragonAuraChanges: 0,
      seasonsStarted: 0,
      sugarLumpsHarvested: 0,
      schedulerTicks: 0,
      watchdogRestarts: 0,
      healthChecks: 0,
      healthRecoveries: 0,
      healthStaleDetections: 0,
      upgradeAnalyses: 0,
      ascensionChecks: 0,
      ascensionFailures: 0,
      errors: 0,
      ticks: 0
    }
  };

  // ============================================================
  // MÓDULO 01 — RUNTIME / SEGURANÇA / ACESSO AO GAME
  // Aqui ficam logging, tratamento de erros e helpers de compatibilidade.
  // ============================================================
  /** log: Registra mensagens no console respeitando a configuração de logging. */
  function log(level, message, error) {
    if (!CONFIG.logging) return;
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🍪';
    console.log(
      '[' + prefix + ' CookieBot V' + VERSION + '] ' +
      new Date().toLocaleTimeString('pt-BR') + ' — ' + message +
      (error ? ' — ' + String(error.message || error) : '')
    );
  }

  /** safe: Executa uma operação protegida, registra exceções e devolve fallback. */
  function safe(fn, fallback, label) {
    try {
      return fn();
    } catch (error) {
      state.stats.errors++;
      state.lastError = String(error.message || error);
      log('error', label || 'operação falhou', error);
      return fallback;
    }
  }

  /** gameExists: Verifica se o objeto Game existe. */
  function gameExists() {
    return typeof Game !== 'undefined' && Game !== null;
  }

  /** gameReady: Confirma que a API mínima do Cookie Clicker está pronta. */
  function gameReady() {
    if (!gameExists()) return false;
    // Algumas versões expõem Game.ready; outras deixam a flag ausente.
    if (Game.ready === false) return false;
    return Array.isArray(Game.ObjectsById) && typeof Game.ClickCookie === 'function';
  }

  /** waitForGame: Faz a checagem de prontidão usada pela inicialização. */
  function waitForGame() {
    if (gameReady()) return true;
    log('warn', 'Cookie Clicker ainda não está pronto. O V6 vai aguardar.');
    return false;
  }

  /** cookies: Lê a quantidade atual de cookies. */
  function cookies() {
    return gameExists() ? Number(Game.cookies || 0) : 0;
  }

  /** cps: Lê a produção atual de cookies por segundo. */
  function cps() {
    return gameExists() ? Number(Game.cookiesPs || 0) : 0;
  }

  /** isPaused: Informa se a instância não deve executar tarefas. */
  function isPaused() {
    return !state.active || state.paused;
  }

  /** hasBuff: Procura um buff pelo nome. */
  function hasBuff(text) {
    if (!gameExists() || !Game.buffs) return false;
    const wanted = String(text).toLowerCase();
    return Object.keys(Game.buffs).some(name => name.toLowerCase().includes(wanted));
  }

  /** clickDelay: Calcula o intervalo de clique considerando buffs ativos. */
  function clickDelay() {
    if (hasBuff('click frenzy')) return 5;
    if (hasBuff('elder frenzy')) return 8;
    if (hasBuff('frenzy')) return 12;
    return Math.max(5, Number(CONFIG.clickMs) || 25);
  }

  // ============================================================
  // MÓDULO 02 — CLIQUE E SHIMMERS
  // Automação direta de cookie, golden cookies, wrath cookies e reindeer.
  // ============================================================
  /** clickCookie: Executa um clique no cookie quando o estado permite. */
  function clickCookie() {
    if (isPaused() || state.ascensionPhase !== 'READY' || !gameReady()) return false;
    return safe(() => {
      Game.ClickCookie();
      state.stats.clicks++;
      state.lastAction = 'click';
      return true;
    }, false, 'clique do cookie falhou');
  }

  /** clickShimmers: Processa shimmers compatíveis com a configuração. */
  function clickShimmers() {
    if (isPaused() || !gameReady() || !Array.isArray(Game.shimmers)) return 0;
    let count = 0;

    Game.shimmers.slice().forEach(shimmer => {
      const type = String(shimmer && shimmer.type || '').toLowerCase();
      if (type.includes('reindeer') && !CONFIG.clickReindeer) return;
      if (type.includes('wrath') && !CONFIG.clickWrath) return;
      if (!type.includes('reindeer') && !type.includes('wrath') && !CONFIG.clickGolden) return;

      safe(() => {
        if (typeof shimmer.pop === 'function' && Number(shimmer.life || 0) > 0) {
          shimmer.pop();
          count++;
          state.stats.shimmers++;
          state.lastAction = 'shimmer:' + type;
        }
      }, null, 'shimmer falhou');
    });

    return count;
  }

  /** getBuildingPrice: Obtém o preço atual de um prédio. */
  function getBuildingPrice(building) {
    return safe(() => {
      if (!building) return Infinity;
      if (typeof building.getPrice === 'function') {
        const price = Number(building.getPrice());
        if (Number.isFinite(price)) return price;
      }
      const bulk = Number(building.bulkPrice);
      if (Number.isFinite(bulk)) return bulk;
      return Number(building.price);
    }, Infinity, 'preço de edifício inválido');
  }

  /** getBuildingCps: Estima o CpS fornecido por um prédio. */
  function getBuildingCps(building) {
    return safe(() => {
      if (!building) return 0;
      const amount = Number(building.amount || 0);
      const total = Number(building.storedTotalCps);
      if (amount > 0 && Number.isFinite(total) && total > 0) {
        return (total / amount) * Number(Game.globalCpsMult || 1);
      }
      const stored = Number(building.storedCps || building.baseCps || 0);
      return Math.max(0, stored * Number(Game.globalCpsMult || 1));
    }, 0, 'CpS de edifício inválido');
  }

  /** affordable: Verifica se uma compra cabe no orçamento configurado. */
  function affordable(price) {
    if (!Number.isFinite(price) || price < 0) return false;
    const bank = cookies();
    const limit = Math.max(0, Math.min(1, Number(CONFIG.spendingLimit)));
    return price + Number(CONFIG.reserveCookies || 0) <= bank * limit;
  }

  // ============================================================
  // MÓDULO 03 — ECONOMIA E COMPRAS
  // Escolha de upgrades/prédios, orçamento, ROI e execução de compras.
  // ============================================================
  /** buyBestUpgrade: Seleciona e compra o upgrade economicamente mais adequado. */
  function buyBestUpgrade() {
    if (isPaused() || !CONFIG.buyUpgrades || !gameReady()) return false;
    if (!Array.isArray(Game.UpgradesInStore)) return false;

    const candidates = Game.UpgradesInStore
      .filter(u => u && !u.bought && typeof u.buy === 'function')
      .map(u => {
        const analysis = upgradeAnalysis(u);
        return { item: u, analysis, score: economicScoreUpgrade(u) };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    const choice = candidates[0];
    if (!choice) return false;

    return executeEconomicAction({
      type: 'upgrade',
      item: choice.item,
      score: choice.score,
      analysis: choice.analysis
    });
  }

  /** buyBestBuilding: Seleciona e compra o prédio com melhor ROI disponível. */
  function buyBestBuilding() {
    if (isPaused() || !CONFIG.buyBuildings || !gameReady()) return false;
    if (!Array.isArray(Game.ObjectsById)) return false;

    const candidates = Game.ObjectsById
      .filter(b => b && !b.locked && typeof b.buy === 'function')
      .map(b => {
        const price = getBuildingPrice(b);
        const buildingCps = getBuildingCps(b);
        return {
          item: b,
          price,
          buildingCps,
          roi: buildingCps > 0 ? price / buildingCps : Infinity
        };
      })
      .filter(x => affordable(x.price) && Number.isFinite(x.roi))
      .sort((a, b) => a.roi - b.roi);

    const choice = candidates[0];
    if (!choice) return false;

    return safe(() => {
      choice.item.buy(1);
      state.stats.buildings++;
      state.lastAction = 'building:' + String(choice.item.name || choice.item.id);
      return true;
    }, false, 'compra de edifício falhou');
  }

  /** effectiveCookieReserve: Calcula a reserva mínima de cookies que deve ser preservada. */
  function effectiveCookieReserve() {
    const bank = cookies();
    const ratio = Math.max(0, Math.min(1, Number(CONFIG.reserveCookiesRatio || 0)));
    return Math.max(0, Number(CONFIG.reserveCookies || 0), bank * ratio);
  }

  /** economicBudget: Calcula o orçamento líquido disponível para compras. */
  function economicBudget() {
    const bank = cookies();
    const limit = Math.max(0, Math.min(1, Number(CONFIG.spendingLimit)));
    return Math.max(0, bank * limit - effectiveCookieReserve());
  }

  /** economicEfficiency: Converte preço, valor e payback em score econômico. */
  function economicEfficiency(price, value, payback) {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(value) || value <= 0) return 0;
    const normalizedPayback = Number.isFinite(payback) && payback > 0 ? payback : CONFIG.targetPaybackSeconds;
    const target = Math.max(1, Number(CONFIG.targetPaybackSeconds) || 3600);
    return (value / price) * Math.min(2, target / Math.max(1, normalizedPayback));
  }

  /** economicScoreBuilding: Calcula o score econômico de um prédio. */
  function economicScoreBuilding(building) {
    const price = getBuildingPrice(building);
    const value = getBuildingCps(building);
    if (!Number.isFinite(price) || price <= 0 || value <= 0 || price > economicBudget()) return 0;
    const payback = price / value;
    return economicEfficiency(price, value, payback) * Number(CONFIG.buildingValueWeight || 1);
  }

  /** getUpgradePrice: Obtém o preço de um upgrade usando fallbacks da API. */
  function getUpgradePrice(upgrade) {
    if (!upgrade) return Infinity;
    return safe(() => {
      if (typeof upgrade.getPrice === 'function') return Number(upgrade.getPrice());
      if (Number.isFinite(Number(upgrade.basePrice))) return Number(upgrade.basePrice);
      if (Number.isFinite(Number(upgrade.price))) return Number(upgrade.price);
      return Infinity;
    }, Infinity, 'preço de upgrade inválido');
  }

  /** upgradeCanBuyNow: Verifica se um upgrade pode ser comprado neste instante. */
  function upgradeCanBuyNow(upgrade) {
    if (!upgrade || upgrade.bought || typeof upgrade.buy !== 'function') return false;
    if (upgrade.pool === 'toggle') return false;
    const price = getUpgradePrice(upgrade);
    if (!Number.isFinite(price) || price <= 0) return false;
    if (typeof upgrade.canBuy === 'function') {
      return safe(() => Boolean(upgrade.canBuy()), false, 'canBuy de upgrade falhou');
    }
    return cookies() >= price;
  }

  /** economicScoreUpgrade: Calcula o score econômico de um upgrade com fallback de compra. */
  function economicScoreUpgrade(upgrade) {
    if (!upgrade || upgrade.bought || typeof upgrade.buy !== 'function') return 0;
    const analysis = upgradeAnalysis(upgrade);
    if (!analysis) return 0;
    if (analysis.worthIt) return Number(analysis.score || 0);

    // Não deixa a heurística econômica impedir a compra de todo upgrade
    // realmente disponível. O fallback só entra quando o upgrade é comprável.
    if (CONFIG.upgradeFallbackEnabled && upgradeCanBuyNow(upgrade)) {
      const price = getUpgradePrice(upgrade);
      const bank = Math.max(1, cookies());
      const urgency = Math.max(0, Math.min(1, 1 - (price / bank)));
      return 0.0001 + urgency * 0.01;
    }

    return 0;
  }

  /** chooseEconomicAction: Compara upgrades e prédios e retorna a ação escolhida. */
  function chooseEconomicAction() {
    if (!gameReady()) return null;

    const store = Array.isArray(Game.UpgradesInStore) ? Game.UpgradesInStore : [];
    const upgrades = CONFIG.buyUpgrades
      ? store.filter(u => u && !u.bought && typeof u.buy === 'function')
          .map(u => ({ type: 'upgrade', item: u, score: economicScoreUpgrade(u) }))
          .filter(x => x.score > 0)
      : [];

    const strictUpgrades = upgrades.filter(x => {
      const a = upgradeAnalysis(x.item);
      return a && a.worthIt;
    });

    // Upgrades economicamente válidos sempre competem com prédios.
    const buildings = CONFIG.buyBuildings && strictUpgrades.length === 0
      ? (Array.isArray(Game.ObjectsById) ? Game.ObjectsById.filter(b => b && !b.locked).map(b => ({
          type: 'building', item: b, score: economicScoreBuilding(b)
        })).filter(x => x.score > 0) : [])
      : [];

    if (strictUpgrades.length) {
      return strictUpgrades.sort((a, b) => b.score - a.score)[0] || null;
    }

    // Quando não há upgrade com payback aceitável, prioriza um upgrade
    // realmente comprável antes de recorrer a prédios.
    if (upgrades.length) {
      return upgrades.sort((a, b) => b.score - a.score)[0] || null;
    }

    return buildings.sort((a, b) => b.score - a.score)[0] || null;
  }

  /** executeEconomicAction: Executa uma compra e registra o resultado. */
  function executeEconomicAction(action) {
    if (!action || isPaused()) return false;
    return safe(() => {
      const before = {
        cookies: cookies(),
        cps: cps(),
        time: Date.now()
      };
      const priceBefore = action.type === 'upgrade' ? getUpgradePrice(action.item) : 0;
      if (action.type === 'upgrade' && !upgradeCanBuyNow(action.item)) {
        return false;
      }

      action.item.buy(action.type === 'upgrade' ? undefined : 1);
      const after = {
        cookies: cookies(),
        cps: cps(),
        time: Date.now()
      };

      if (action.type === 'upgrade') {
        if (!action.item.bought && cookies() >= before.cookies - Math.max(0, priceBefore) * 0.5) {
          return false;
        }
        state.stats.upgrades++;
        state.lastAction = 'upgrade:economia:' + String(action.item.name || action.item.id);
        recordUpgradeObservation(action.item, action.analysis || upgradeAnalysis(action.item), before, after);
      } else {
        state.stats.buildings++;
        state.lastAction = 'building:economia:' + String(action.item.name || action.item.id);
      }
      state.stats.economicDecisions++;
      return true;
    }, false, 'decisão econômica falhou');
  }

  /** upgradeObservationKey: Retorna a chave de armazenamento das observações de upgrades. */
  function upgradeObservationKey() {
    return '__COOKIE_CLICKER_BOT_V6_UPGRADE_OBSERVATIONS__';
  }

  /** loadUpgradeObservations: Carrega observações estatísticas salvas. */
  function loadUpgradeObservations() {
    if (typeof localStorage === 'undefined') return [];
    return safe(() => {
      const raw = localStorage.getItem(upgradeObservationKey());
      const parsed = raw ? JSON.parse(raw) : [];
      const max = Math.max(1, Math.floor(Number(CONFIG.upgradeObservationMaxEntries) || 96));
      state.upgradeObservations = Array.isArray(parsed) ? parsed.slice(-max) : [];
      return [...state.upgradeObservations];
    }, [], 'observações de upgrades não puderam ser carregadas');
  }

  /** saveUpgradeObservations: Persiste observações estatísticas de upgrades. */
  function saveUpgradeObservations() {
    if (typeof localStorage === 'undefined') return false;
    return safe(() => {
      const max = Math.max(1, Math.floor(Number(CONFIG.upgradeObservationMaxEntries) || 96));
      state.upgradeObservations = state.upgradeObservations.slice(-max);
      localStorage.setItem(upgradeObservationKey(), JSON.stringify(state.upgradeObservations));
      return true;
    }, false, 'observações de upgrades não puderam ser salvas');
  }

  /** finalizeUpgradeObservations: Finaliza janelas de medição e registra CpS observado. */
  function finalizeUpgradeObservations() {
    if (!state.pendingUpgradeObservations.length || !gameExists()) return 0;
    const now = Date.now();
    const ready = [];
    const pending = [];

    state.pendingUpgradeObservations.forEach(observation => {
      if (now < observation.finalizeAt) {
        pending.push(observation);
        return;
      }

      const currentCps = cps();
      const windowMs = Math.max(0, now - Number(observation.createdAtMs || now));
      const delta = currentCps - Number(observation.baselineCps || 0);
      const activeBuff = typeof Game.hasBuff === 'function' && (
        Game.hasBuff('Click frenzy') || Game.hasBuff('Frenzy') || Game.hasBuff('Dragonflight')
      );
      ready.push({
        ...observation,
        kind: 'upgrade-observation',
        afterCps: currentCps,
        observedCpsDelta: Math.max(0, delta),
        rawCpsDelta: delta,
        contaminated: Boolean(activeBuff),
        contaminationReason: activeBuff ? 'buff ativo durante a janela' : null,
        observedAt: new Date(now).toISOString(),
        observationWindowMs: windowMs
      });
    });

    state.pendingUpgradeObservations = pending;
    if (!ready.length) return 0;

    state.upgradeObservations.push(...ready);
    const max = Math.max(1, Math.floor(Number(CONFIG.upgradeObservationMaxEntries) || 96));
    if (state.upgradeObservations.length > max) state.upgradeObservations = state.upgradeObservations.slice(-max);
    saveUpgradeObservations();
    return ready.length;
  }

  /** recordUpgradeObservation: Abre uma nova janela de observação após comprar um upgrade. */
  function recordUpgradeObservation(upgrade, analysis, before, after) {
    if (!upgrade) return false;
    const now = Date.now();
    const cooldown = Math.max(0, Number(CONFIG.upgradeObservationCooldownMs) || 7000);
    const duplicate = state.pendingUpgradeObservations.some(o =>
      o && (o.id === upgrade.id || o.name === String(upgrade.name || upgrade.id)) &&
      now - Number(o.createdAtMs || 0) < cooldown
    );
    if (duplicate) return false;
    state.pendingUpgradeObservations.push({
      id: upgrade.id,
      name: String(upgrade.name || upgrade.id || 'upgrade'),
      price: Number(analysis?.price || 0),
      expectedCpsGain: Number(analysis?.estimatedCpsGain || 0),
      expectedClickGain: Number(analysis?.estimatedClickGain || 0),
      baselineCps: Number(after?.cps ?? before?.cps ?? 0),
      baselineCookies: Number(after?.cookies ?? before?.cookies ?? 0),
      createdAtMs: now,
      finalizeAt: now + Math.max(1000, Number(CONFIG.upgradeObservationWindowMs) || 5000)
    });
    return true;
  }

  /** economicReport: Gera e persiste um relatório econômico. */
  function economicReport() {
    const data = {
      generatedAt: new Date().toISOString(),
      cookies: cookies(),
      cps: cps(),
      budget: economicBudget(),
      economicDecisions: state.stats.economicDecisions,
      economicNoops: state.stats.economicNoops,
      ascension: ascensionReport(),
      lastAction: state.lastAction
    };
    saveHistory(data);
    console.group('🍪 CookieBot V6 — Economia');
    console.table(data);
    console.groupEnd();
    return data;
  }


  // ============================================================
  // MÓDULO 04 — GRIMOIRE
  // Adaptador defensivo para a API variável do minigame do Wizard Tower.
  // ============================================================
  /** grimoireMinigame: Obtém o minigame do Grimoire quando disponível. */
  function grimoireMinigame() {
    const obj = Game && Game.ObjectsById && Game.ObjectsById[7];
    return obj && obj.minigame ? obj.minigame : null;
  }

  /** grimoireSpellList: Normaliza a lista de feitiços do Grimoire. */
  function grimoireSpellList(minigame) {
    if (!minigame) return [];
    if (Array.isArray(minigame.spells)) return minigame.spells;
    if (minigame.spellsByName && typeof minigame.spellsByName === 'object') {
      return Object.keys(minigame.spellsByName).map(k => minigame.spellsByName[k]);
    }
    return [];
  }

  /** findGrimoireSpell: Localiza um feitiço por nome ou identificador. */
  function findGrimoireSpell(minigame) {
    const requested = String(CONFIG.grimoireSpell || '').trim().toLowerCase();
    const spells = grimoireSpellList(minigame);
    if (requested) {
      return spells.find(s => String(s.name || '').toLowerCase() === requested) ||
        spells.find(s => String(s.name || '').toLowerCase().includes(requested)) || null;
    }
    return spells.find(s => /frenzy|conjure|hand of fate/i.test(String(s.name || ''))) || spells[0] || null;
  }

  /** castGrimoire: Tenta conjurar o feitiço configurado. */
  function castGrimoire() {
    if (!CONFIG.grimoireEnabled || isPaused() || !gameReady()) return false;
    const minigame = grimoireMinigame();
    if (!minigame || typeof minigame.castSpell !== 'function') return false;

    const magic = Number(minigame.magic);
    const minMagic = Math.max(0, Number(CONFIG.grimoireMinMagic) || 0);
    if (Number.isFinite(magic) && magic < minMagic) return false;

    const spell = findGrimoireSpell(minigame);
    if (!spell) return false;

    return safe(() => {
      const result = minigame.castSpell(spell);
      state.stats.grimoireCasts++;
      state.lastAction = 'grimoire:' + String(spell.name || spell.id || 'spell');
      return result !== false;
    }, false, 'Grimoire falhou');
  }


  // ============================================================
  // MÓDULO 05 — GARDEN
  // Leitura de tiles, colheita e plantio opcional.
  // ============================================================
  /** gardenMinigame: Obtém o minigame do Garden quando disponível. */
  function gardenMinigame() {
    const farm = Game && Game.ObjectsById && Game.ObjectsById[2];
    return farm && farm.minigame ? farm.minigame : null;
  }

  /** gardenTiles: Normaliza a grade de tiles do Garden. */
  function gardenTiles(garden) {
    if (!garden) return [];
    if (Array.isArray(garden.plot)) return garden.plot;
    if (Array.isArray(garden.tiles)) return garden.tiles;
    return [];
  }

  /** harvestGarden: Colhe plantas maduras conforme configuração. */
  function harvestGarden() {
    if (!CONFIG.gardenEnabled || isPaused() || !gameReady()) return false;
    const garden = gardenMinigame();
    if (!garden) return false;
    const tiles = gardenTiles(garden);
    let harvested = 0;
    tiles.forEach((tile, index) => {
      if (!tile) return;
      const age = Number(tile.age || 0);
      const mature = tile.mature === undefined || age >= Number(tile.mature);
      const occupied = tile.id !== undefined && tile.id !== 0 || tile.plantId;
      if (!occupied || (CONFIG.gardenHarvestMature && !mature)) return;
      safe(() => {
        if (typeof tile.harvest === 'function') tile.harvest();
        else if (typeof garden.harvest === 'function') garden.harvest(index);
        else return;
        harvested++;
      }, null, 'colheita do Garden falhou');
    });
    state.stats.gardenHarvests += harvested;
    if (harvested) state.lastAction = 'garden:harvest:' + harvested;
    return harvested > 0;
  }

  /** plantGarden: Planta a espécie configurada quando possível. */
  function plantGarden() {
    if (!CONFIG.gardenEnabled || !CONFIG.gardenAutoPlant || isPaused() || !gameReady()) return false;
    const garden = gardenMinigame();
    const plantId = CONFIG.gardenPlantId;
    if (!garden || plantId === null || plantId === undefined) return false;
    const tiles = gardenTiles(garden);
    let planted = 0;
    tiles.forEach((tile, index) => {
      const empty = !tile || tile.id === 0 || tile.id === -1 || tile.plantId === 0;
      if (!empty) return;
      const ok = safe(() => {
        if (typeof garden.clickTile === 'function') return garden.clickTile(index, plantId);
        if (typeof garden.plant === 'function') return garden.plant(index, plantId);
        return false;
      }, false, 'plantio do Garden falhou');
      if (ok !== false) planted++;
    });
    state.stats.gardenPlantings += planted;
    if (planted) state.lastAction = 'garden:plant:' + planted;
    return planted > 0;
  }

  /** gardenCycle: Executa o ciclo automático do Garden. */
  function gardenCycle() {
    if (!CONFIG.gardenEnabled) return false;
    const harvested = harvestGarden();
    const planted = plantGarden();
    return harvested || planted;
  }


  // ============================================================
  // MÓDULO 06 — STOCK MARKET
  // Leitura de mercadorias e gerenciamento opcional de compra/venda.
  // ============================================================
  /** marketMinigame: Obtém o minigame do Stock Market quando disponível. */
  function marketMinigame() {
    const bank = Game && Game.ObjectsById && Game.ObjectsById[5];
    return bank && bank.minigame ? bank.minigame : null;
  }

  /** marketGoods: Lista as mercadorias conhecidas do mercado. */
  function marketGoods(minigame) {
    if (!minigame) return [];
    const source = minigame.goodsById || minigame.goods;
    if (!source) return [];
    if (Array.isArray(source)) return source;
    return Object.keys(source).map(k => source[k]).filter(Boolean);
  }

  /** marketPrice: Obtém o preço atual de uma mercadoria. */
  function marketPrice(good) {
    return Number(good && (good.val !== undefined ? good.val : good.price));
  }

  /** manageMarket: Executa a política configurada do mercado. */
  function manageMarket() {
    if (!CONFIG.marketEnabled || isPaused() || !gameReady()) return false;
    const market = marketMinigame();
    if (!market) return false;
    const goods = marketGoods(market);
    const budget = cookies() * Math.max(0, Math.min(1, Number(CONFIG.marketMaxSpendRatio) || 0));
    let changed = false;

    for (const good of goods) {
      const price = marketPrice(good);
      if (!Number.isFinite(price) || price < 0) continue;

      const stock = Number(good.stock || 0);
      const maxStock = Number(good.maxStock || good.stockMax || 0);
      const canBuy = typeof market.buyGood === 'function' && price > 0 &&
        price <= Number(CONFIG.marketBuyThreshold) && cookies() >= price &&
        (!maxStock || stock < maxStock) && price <= budget;
      const canSell = typeof market.sellGood === 'function' &&
        price >= Number(CONFIG.marketSellThreshold) && stock > 0;

      if (canBuy) {
        safe(() => market.buyGood(good.id), null, 'compra no Market falhou');
        state.stats.marketBuys++;
        state.lastAction = 'market:buy:' + String(good.name || good.id);
        changed = true;
        break;
      }
      if (canSell) {
        safe(() => market.sellGood(good.id), null, 'venda no Market falhou');
        state.stats.marketSells++;
        state.lastAction = 'market:sell:' + String(good.name || good.id);
        changed = true;
        break;
      }
    }
    return changed;
  }

  // ============================================================
  // MÓDULO 07 — WRINKLERS E CICLO DE COMPRAS
  // Coordena compras econômicas e gerenciamento de wrinklers.
  // ============================================================
  /** purchaseCycle: Coordena a decisão de compra da economia. */
  function purchaseCycle() {
    if (isPaused() || !gameReady()) return;
    if (CONFIG.economyEnabled) {
      const action = chooseEconomicAction();
      if (executeEconomicAction(action)) return;
      state.stats.economicNoops++;
      return;
    }
    if (buyBestUpgrade()) return;
    buyBestBuilding();
  }

  /** activeWrinklers: Lista wrinklers ativos que podem ser gerenciados. */
  function activeWrinklers() {
    if (!gameReady() || !Array.isArray(Game.wrinklers)) return [];
    return Game.wrinklers.filter(w =>
      w &&
      Number(w.phase || 0) > 0 &&
      (Number(w.sucked || 0) > 0 || w.close)
    );
  }

  /** manageWrinklers: Gerencia wrinklers de acordo com a reserva configurada. */
  function manageWrinklers() {
    if (isPaused() || !CONFIG.popWrinklers) return 0;
    const active = activeWrinklers();
    const keep = Math.max(0, Math.floor(Number(CONFIG.wrinklersToKeep) || 0));
    const targets = active
      .sort((a, b) => Number(b.sucked || 0) - Number(a.sucked || 0))
      .slice(0, Math.max(0, active.length - keep));

    targets.forEach(w => safe(() => {
      if (typeof w.hp !== 'undefined') w.hp = 0;
      else if (typeof w.click === 'function') w.click();
      state.stats.wrinklers++;
      state.lastAction = 'wrinkler';
    }, null, 'wrinkler falhou'));

    return targets.length;
  }

  // ============================================================
  // MÓDULO 08 — ASCENSÃO / PRESTÍGIO / REINCARNAÇÃO
  // Análise econômica, transição, verificação e recuperação segura.
  // ============================================================
  /** prestigeGain: Calcula ganho potencial de prestígio. */
  function prestigeGain() {
    if (!gameReady() || typeof Game.HowMuchPrestige !== 'function') return 0;
    return safe(() => {
      const total = Math.max(0, Number(Game.cookiesReset || 0) + Number(Game.cookiesEarned || 0));
      const current = Math.max(0, Number(Game.prestige || 0));
      return Math.max(0, Math.floor(Number(Game.HowMuchPrestige(total)) - current));
    }, 0, 'prestígio falhou');
  }

  /** ascensionAnalysis: Estima ganho, recuperação e payback de uma ascensão. */
  function ascensionAnalysis() {
    state.stats.ascensionChecks = (state.stats.ascensionChecks || 0) + 1;
    if (!gameReady()) {
      return {
        worthIt: false,
        reason: 'jogo não está pronto',
        currentPrestige: 0,
        potentialPrestige: 0,
        gain: 0,
        gainRatio: 0,
        currentMultiplier: 1,
        projectedMultiplier: 1,
        multiplierGainPercent: 0,
        recoverySeconds: Infinity,
        estimatedPaybackSeconds: Infinity
      };
    }

    const currentPrestige = Math.max(0, Number(Game.prestige || 0));
    const gain = Math.max(0, prestigeGain());
    const potentialPrestige = currentPrestige + gain;
    const currentMultiplier = 1 + currentPrestige / 100;
    const projectedMultiplier = 1 + potentialPrestige / 100;
    const multiplierGainPercent = currentMultiplier > 0
      ? ((projectedMultiplier / currentMultiplier) - 1) * 100
      : 0;

    const bank = Math.max(0, cookies());
    const currentCps = Math.max(0, cps());
    const safetyFactor = Math.max(1, Number(CONFIG.ascensionRecoverySafetyFactor) || 3);
    const recoverySeconds = currentCps > 0 ? (bank / currentCps) * safetyFactor : Infinity;
    const multiplierGain = Math.max(0, projectedMultiplier - currentMultiplier);
    const estimatedPaybackSeconds = multiplierGain > 0 && currentCps > 0
      ? recoverySeconds / multiplierGain
      : Infinity;

    const minGainRatio = Math.max(0, Number(CONFIG.ascensionMinGainRatio) || 0);
    const gainRatio = currentPrestige > 0 ? gain / currentPrestige : Infinity;
    const maxRecovery = Math.max(0, Number(CONFIG.ascensionMaxRecoverySeconds) || 0);
    const maxPayback = Math.max(0, Number(CONFIG.ascensionMaxPaybackSeconds) || 0);
    const threshold = Math.max(0, Number(CONFIG.prestigeThreshold) || 0);

    const enoughPrestige = gain >= threshold;
    const meaningfulGain = currentPrestige === 0 || gainRatio >= minGainRatio;
    const recoverable = recoverySeconds <= maxRecovery;
    const paybackAcceptable = estimatedPaybackSeconds <= maxPayback;
    const worthIt = enoughPrestige && meaningfulGain && recoverable && paybackAcceptable;

    let reason = 'ascensão não compensa neste momento';
    if (!enoughPrestige) reason = 'ganho de prestígio abaixo do limite';
    else if (!meaningfulGain) reason = 'ganho percentual de prestígio pequeno';
    else if (!recoverable) reason = 'tempo estimado de recuperação muito alto';
    else if (!paybackAcceptable) reason = 'payback estimado muito alto';
    else reason = 'ganho permanente supera recuperação e payback estimados';

    return {
      worthIt, reason, currentPrestige, potentialPrestige, gain, gainRatio,
      currentMultiplier, projectedMultiplier, multiplierGainPercent,
      recoverySeconds, estimatedPaybackSeconds,
      thresholds: { minGainRatio, maxRecovery, maxPayback, prestigeThreshold: threshold }
    };
  }

  /** upgradeStatProfile: Estima valor estatístico/econômico de um upgrade. */
  function upgradeStatProfile(upgrade) {
    if (!upgrade) return null;

    const desc = String(upgrade.desc || '').toLowerCase();
    const name = String(upgrade.name || '').toLowerCase();
    const text = desc + ' ' + name;
    const price = safe(() => Number(upgrade.getPrice()), Infinity, 'preço de upgrade inválido');

    const directCps = Number(upgrade.cps || 0);
    const cpsMultiplier = Number(upgrade.cpsMult || upgrade.cpsMultPercent || 0);
    const clickValue = Number(upgrade.click || upgrade.clickCps || 0);
    const clickMultiplier = Number(upgrade.clickMult || 0);

    const keywordSignals = {
      cps: /(cookies per second|cookie production|cps|cookies\/second)/i.test(text) ? 1 : 0,
      click: /(click|clique)/i.test(text) ? 1 : 0,
      multiplier: /(\+|increase|multipl|%)/i.test(text) ? 1 : 0,
      building: /(building|edifício|grandma|farm|mine|factory|bank|temple|wizard|shipment|alchemy|portal|time machine|antimatter|prism|chancemaker|fractal|javascript|you)/i.test(text) ? 1 : 0,
      kitten: /kitten|milk/i.test(text) ? 1 : 0
    };

    const estimatedCpsGain =
      Math.max(0, directCps) +
      Math.max(0, cpsMultiplier) * Math.max(1, cps()) +
      keywordSignals.cps * Math.max(1, cps() * 0.05) +
      keywordSignals.multiplier * Math.max(0, cps() * 0.02) +
      keywordSignals.kitten * Math.max(0, cps() * 0.05);

    const estimatedClickGain =
      Math.max(0, clickValue) +
      Math.max(0, clickMultiplier) * Math.max(1, cps() * 0.01) +
      keywordSignals.click * Math.max(1, cps() * 0.01);

    const utilityScore = estimatedCpsGain * 2 + estimatedClickGain +
      keywordSignals.building * Math.max(1, cps() * 0.01);

    const observations = state.upgradeObservations.filter(o =>
      o && (o.id === upgrade.id || o.name === String(upgrade.name || upgrade.id))
    );
    const cleanObservations = observations.filter(o => o.contaminated !== true);
    const observedAverage = cleanObservations.length
      ? cleanObservations.reduce((sum, o) => sum + Math.max(0, Number(o.observedCpsDelta || 0)), 0) / cleanObservations.length
      : 0;
    const maxStatisticalWeight = Math.max(0, Math.min(0.90, Number(CONFIG.upgradeStatisticalMaxWeight) || 0.60));
    const statisticalWeight = cleanObservations.length
      ? Math.min(maxStatisticalWeight, 0.15 + cleanObservations.length * 0.05)
      : 0;
    const clickConversionRate = Math.max(0, Number(CONFIG.estimatedClicksPerSecond) || 10);
    const clickValueWeight = Math.max(0, Number(CONFIG.upgradeClickValueWeight) || 0.25);
    const estimatedTotalGainPerSecond = estimatedCpsGain +
      estimatedClickGain * clickConversionRate * clickValueWeight;
    const expectedGainPerSecond = estimatedTotalGainPerSecond * (1 - statisticalWeight) +
      observedAverage * statisticalWeight;
    const paybackSeconds = price > 0 && expectedGainPerSecond > 0
      ? price / expectedGainPerSecond
      : Infinity;
    const budget = economicBudget();
    const affordableNow = Number.isFinite(price) && price > 0 && price <= budget;
    const paybackTarget = Math.max(1, Number(CONFIG.targetPaybackSeconds) || 3600);
    const maxPayback = Math.max(paybackTarget, Number(CONFIG.upgradeMaxPaybackSeconds) || paybackTarget * 2);
    const worthIt = affordableNow && expectedGainPerSecond > 0 && paybackSeconds <= maxPayback;
    const affordability = price > 0 && Number.isFinite(price)
      ? Math.max(0, Math.min(1, budget / price))
      : 0;
    const score = worthIt
      ? economicEfficiency(price, expectedGainPerSecond, paybackSeconds) *
        Number(CONFIG.upgradeValueWeight || 1) * affordability
      : 0;

    state.stats.upgradeAnalyses = (state.stats.upgradeAnalyses || 0) + 1;
    return {
      price, estimatedCpsGain, estimatedClickGain, utilityScore,
      expectedGainPerSecond, estimatedTotalGainPerSecond, observedAverage,
      observations: observations.length, cleanObservations: cleanObservations.length,
      statisticalWeight, paybackSeconds, paybackTarget, maxPayback,
      clickConversionRate, clickValueWeight, affordableNow, worthIt, score,
      signals: keywordSignals
    };
  }

  /** upgradeAnalysis: Alias público para a análise estatística de upgrades. */
  function upgradeAnalysis(upgrade) {
    return upgradeStatProfile(upgrade);
  }

  /** shouldAscend: Verifica se a configuração permite iniciar ascensão. */
  function shouldAscend() {
    const analysis = ascensionAnalysis();
    return CONFIG.autoAscend && !state.ascending && !isPaused() && analysis.worthIt;
  }

  /** buyHeavenlyUpgrades: Compra upgrades celestiais disponíveis. */
  function buyHeavenlyUpgrades() {
    if (!gameReady() || !CONFIG.buyHeavenlyUpgrades || !Game.Upgrades) return 0;
    let bought = 0;

    Object.keys(Game.Upgrades).forEach(name => {
      const upgrade = Game.Upgrades[name];
      if (!upgrade || upgrade.bought || upgrade.pool !== 'prestige') return;

      safe(() => {
        if (typeof upgrade.canBuy === 'function' && upgrade.canBuy()) {
          upgrade.buy();
          bought++;
          state.stats.heavenlyUpgrades++;
          state.lastAction = 'heavenly-upgrade:' + String(upgrade.name || name);
        }
      }, null, 'upgrade celestial falhou: ' + name);
    });

    return bought;
  }

  /** registerTimeout: Registra um timeout rastreável e cancelável. */
  function registerTimeout(name, delay, fn) {
    if (state.hardStopped) return null;
    const id = setTimeout(() => {
      state.timeouts.delete(id);
      if (state.hardStopped) return;
      safe(fn, null, name + ' falhou');
    }, Math.max(0, Number(delay) || 0));
    state.timeouts.add(id);
    return id;
  }

  /** verifyAscensionTransition: Verifica sinais de que a ascensão realmente ocorreu. */
  function verifyAscensionTransition(snapshot) {
    if (!gameReady() || !snapshot) return false;
    const currentCookies = cookies();
    const resetNow = Number(Game.cookiesReset || 0);
    const cookieDrop = currentCookies < snapshot.cookies * 0.25;
    const resetIncreased = resetNow > snapshot.cookiesReset;
    const reincarnated = typeof Game.Reincarnate === 'function' && Number(Game.cookies || 0) === 0 && snapshot.cookies > 0;
    return cookieDrop || resetIncreased || reincarnated;
  }

  /** ascensionReport: Retorna o estado e resultado da última ascensão. */
  function ascensionReport() {
    const analysis = ascensionAnalysis();
    const snapshot = state.ascensionSnapshot;
    return {
      phase: state.ascensionPhase,
      active: state.active,
      paused: state.paused,
      ascending: state.ascending,
      analysis,
      snapshot: snapshot ? { ...snapshot } : null,
      outcome: state.ascensionOutcome ? { ...state.ascensionOutcome } : null,
      failures: state.stats.ascensionFailures || 0,
      ascensions: state.stats.ascensions || 0,
      reincarnations: state.stats.reincarnations || 0
    };
  }

  /** failAscension: Entra em falha segura e interrompe a automação. */
  function failAscension(reason, error) {
    state.stats.ascensionFailures = (state.stats.ascensionFailures || 0) + 1;
    state.stats.errors++;
    state.lastError = String((error && (error.message || error)) || reason);
    state.ascensionOutcome = {
      ok: false,
      reason: String(reason),
      error: error ? String(error.message || error) : null,
      at: new Date().toISOString()
    };
    state.ascensionPhase = 'FAILED';
    state.ascending = false;
    state.active = false;
    state.paused = true;
    clearAllTimers();
    log('error', reason, error);
    return false;
  }

  /** recoverAscensionFailure: Recupera manualmente um estado FAILED sem repetir ascensão. */
  function recoverAscensionFailure() {
    if (state.ascensionPhase !== 'FAILED') return false;
    if (!gameReady()) return false;

    state.ascending = false;
    state.ascensionPhase = 'READY';
    state.ascensionSnapshot = null;
    state.lastError = null;
    state.paused = false;
    state.active = true;
    state.ascensionOutcome = {
      ok: null,
      reason: 'falha de ascensão reconhecida; estado recuperado manualmente',
      recoveredAt: new Date().toISOString()
    };

    configureTimers();
    log('warn', 'Estado de ascensão recuperado manualmente; nenhuma nova ascensão foi disparada.');
    return true;
  }

  /** performAscension: Executa o fluxo de ascensão, verificação e pós-ascensão. */
  function performAscension() {
    if (state.hardStopped) return false;
    const analysis = ascensionAnalysis();
    if (!gameReady() || state.ascending || !CONFIG.autoAscend || !analysis.worthIt) return false;
    if (typeof Game.Ascend !== 'function') return false;

    state.ascending = true;
    state.ascensionPhase = 'ASCENDING';
    state.ascensionOutcome = {
      ok: null,
      reason: 'ascensão em andamento',
      startedAt: new Date().toISOString()
    };
    state.ascensionSnapshot = {
      cookies: cookies(),
      cps: cps(),
      prestige: Number(Game.prestige || 0),
      cookiesReset: Number(Game.cookiesReset || 0),
      startedAt: Date.now(),
      analysis
    };

    try {
      Game.Ascend(1);
      state.stats.ascensions++;
      state.lastAction = 'ascensão';

      registerTimeout('verificação-pós-ascensão', CONFIG.ascensionVerificationDelayMs, () => {
        const snapshot = state.ascensionSnapshot;
        if (!snapshot) return failAscension('estado de ascensão perdido');

        if (!verifyAscensionTransition(snapshot)) {
          return failAscension('ascensão não pôde ser verificada com segurança');
        }

        state.ascensionOutcome = {
          ok: true,
          reason: 'ascensão verificada',
          verifiedAt: new Date().toISOString(),
          gain: analysis.gain,
          multiplierGainPercent: analysis.multiplierGainPercent
        };
        state.ascensionPhase = 'RECOVERING';
        registerTimeout('pós-ascensão', CONFIG.postAscensionDelayMs, () => {
          try {
            if (!gameReady()) return failAscension('jogo não ficou pronto após ascensão');

            buyHeavenlyUpgrades();

            if (CONFIG.autoReincarnate && typeof Game.Reincarnate === 'function') {
              state.ascensionPhase = 'WAITING_REINCARNATION';
              registerTimeout('reencarnação', CONFIG.postAscensionDelayMs, () => {
                try {
                  if (!gameReady()) return failAscension('jogo não ficou pronto para reencarnação');
                  Game.Reincarnate(1);
                  state.stats.reincarnations++;
                  state.lastAction = 'reencarnação';
                  state.ascensionPhase = 'READY';
                  state.ascending = false;
                  state.ascensionSnapshot = null;
                  state.ascensionOutcome = {
                    ...(state.ascensionOutcome || {}),
                    reincarnated: true,
                    reincarnatedAt: new Date().toISOString()
                  };
                  state.active = true;
                  state.paused = false;
                  configureTimers();
                } catch (error) {
                  failAscension('reencarnação falhou; bot pausado por segurança', error);
                }
              });
              return;
            }

            state.ascensionPhase = 'READY';
            state.ascending = false;
            state.ascensionSnapshot = null;
            state.active = false;
            state.paused = true;
            clearAllTimers();
            log('warn', 'Ascensão verificada; bot pausado porque autoReincarnate está desativado.');
          } catch (error) {
            failAscension('pós-ascensão falhou; bot pausado por segurança', error);
          }
        });
      });

      log('info', 'Ascensão executada: +' + String(analysis.gain) +
        ' prestígio; ganho permanente estimado de ' +
        String(analysis.multiplierGainPercent.toFixed(2)) + '%.');
      return true;
    } catch (error) {
      return failAscension('ascensão falhou; bot pausado por segurança', error);
    }
  }

  /** tryAscend: Tenta ascensão pelo caminho automático. */
  function tryAscend() {
    return performAscension();
  }

  // ============================================================
  // MÓDULO 09 — PANTHEON
  // Seleção defensiva de templo/gods quando habilitado.
  // ============================================================
  /** pantheonMinigame: Obtém o minigame do Pantheon. */
  function pantheonMinigame() {
    const temple = Game && Game.ObjectsById && Game.ObjectsById[6];
    return temple && temple.minigame ? temple.minigame : null;
  }

  /** pantheonGods: Normaliza a lista de deuses disponíveis. */
  function pantheonGods(minigame) {
    if (!minigame) return [];
    const source = minigame.godsById || minigame.gods;
    if (!source) return [];
    if (Array.isArray(source)) return source.filter(Boolean);
    return Object.keys(source).map(key => source[key]).filter(Boolean);
  }

  /** findPantheonGod: Localiza um deus do Pantheon. */
  function findPantheonGod(minigame) {
    const requested = String(CONFIG.pantheonGod || '').trim().toLowerCase();
    if (!requested) return null;
    return pantheonGods(minigame).find(god =>
      String(god.name || '').toLowerCase() === requested
    ) || pantheonGods(minigame).find(god =>
      String(god.name || '').toLowerCase().includes(requested)
    ) || null;
  }

  /** managePantheon: Aplica a configuração de slot/deus do Pantheon. */
  function managePantheon() {
    if (!CONFIG.pantheonEnabled || isPaused() || !gameReady()) return false;
    const temple = pantheonMinigame();
    if (!temple || typeof temple.slotGod !== 'function') return false;

    const god = findPantheonGod(temple);
    if (!god) return false;

    const slot = Math.max(0, Math.floor(Number(CONFIG.pantheonSlot) || 0));
    const current = Array.isArray(temple.slot) ? temple.slot[slot] : null;
    if (current && (current.id === god.id || current === god)) return false;

    return safe(() => {
      let result = false;
      try {
        result = temple.slotGod(god, slot);
      } catch (_) {
        result = temple.slotGod(slot, god.id);
      }
      if (result !== false) {
        state.stats.pantheonChanges++;
        state.lastAction = 'pantheon:' + String(god.name || god.id);
        return true;
      }
      return false;
    }, false, 'Pantheon falhou');
  }

  // ============================================================
  // MÓDULO 10 — DRAGON / SEASONS / SUGAR LUMPS
  // Automação opcional dos sistemas sazonais e progressão especial.
  // ============================================================
  /** dragonAuras: Obtém a lista de auras do Dragon. */
  function dragonAuras() {
    if (!gameExists()) return [];
    const source = Game.dragonAuras;
    if (!source) return [];
    if (Array.isArray(source)) return source.filter(Boolean);
    return Object.keys(source).map(key => source[key]).filter(Boolean);
  }

  /** findDragonAura: Localiza uma aura do Dragon. */
  function findDragonAura(name) {
    const requested = String(name || '').trim().toLowerCase();
    if (!requested) return null;
    return dragonAuras().find(aura =>
      String(aura.name || '').toLowerCase() === requested
    ) || dragonAuras().find(aura =>
      String(aura.name || '').toLowerCase().includes(requested)
    ) || null;
  }

  /** manageDragon: Aplica a aura do Dragon conforme configuração. */
  function manageDragon() {
    if (!CONFIG.dragonEnabled || isPaused() || !gameReady()) return false;
    if (typeof Game.SetDragonAura !== 'function') return false;
    if (Number(Game.dragonLevel || 0) < 5) return false;

    const preferred = hasBuff('click frenzy') && CONFIG.dragonPreferClickFrenzy
      ? "Dragon's Fortune"
      : (CONFIG.dragonAura || 'Radiant Appetite');

    const aura = findDragonAura(preferred);
    if (!aura) return false;

    const auraId = Number(aura.id);
    if (!Number.isFinite(auraId)) return false;
    if (Number(Game.dragonAura) === auraId) return false;

    return safe(() => {
      const result = Game.SetDragonAura(auraId, 0);
      if (result !== false) {
        state.stats.dragonAuraChanges++;
        state.lastAction = 'dragon-aura:' + String(aura.name || aura.id);
        return true;
      }
      return false;
    }, false, 'aura do dragão falhou');
  }

  /** manageSeason: Inicia uma temporada compatível com a prioridade configurada. */
  function manageSeason() {
    if (!CONFIG.seasonsEnabled || isPaused() || !gameReady()) return false;
    if (typeof Game.startSeason !== 'function') return false;
    if (Game.season) return false;

    const priorities = Array.isArray(CONFIG.seasonPriority) ? CONFIG.seasonPriority : [];
    for (const season of priorities) {
      if (!season) continue;
      const started = safe(() => Game.startSeason(season), false, 'temporada falhou');
      if (started !== false) {
        state.stats.seasonsStarted++;
        state.lastAction = 'season:' + String(season);
        return true;
      }
    }
    return false;
  }

  /** sugarLumpReady: Verifica se um Sugar Lump está pronto para coleta. */
  function sugarLumpReady() {
    if (!gameReady()) return false;
    if (typeof Game.canLumps === 'function' && !Game.canLumps()) return false;
    const lumpTime = Number(Game.lumpT || 0);
    const minimum = Math.max(0, Number(CONFIG.sugarLumpMinTime) || 0);
    return lumpTime > minimum;
  }

  /** manageSugarLump: Coleta Sugar Lump quando habilitado. */
  function manageSugarLump() {
    if (!CONFIG.sugarLumpsEnabled || isPaused() || !gameReady()) return false;
    if (!sugarLumpReady() || typeof Game.clickLump !== 'function') return false;

    if (CONFIG.sugarLumpMode !== 'harvest') return false;

    return safe(() => {
      Game.clickLump();
      state.stats.sugarLumpsHarvested++;
      state.lastAction = 'sugar-lump:harvest';
      return true;
    }, false, 'Sugar Lump falhou');
  }

  // ============================================================
  // MÓDULO 11 — STATUS E DIAGNÓSTICO
  // Exposição do estado do bot e das capacidades encontradas no jogo.
  // ============================================================
  /** moduleStatus: Resume capacidades detectadas dos módulos. */
  function moduleStatus() {
    if (!gameExists()) return {};
    const wizard = Game.Objects && Game.Objects['Wizard tower'];
    const farm = Game.Objects && Game.Objects.Farm;
    const bank = Game.Objects && Game.Objects.Bank;
    const temple = Game.Objects && Game.Objects.Temple;

    return {
      core: gameReady(),
      shimmers: Array.isArray(Game.shimmers),
      wrinklers: Array.isArray(Game.wrinklers),
      grimoire: !!(wizard && wizard.minigame && typeof wizard.minigame.castSpell === 'function'),
      garden: !!(farm && farm.minigame),
      market: !!(bank && bank.minigame),
      pantheon: !!(temple && temple.minigame && typeof temple.minigame.slotGod === 'function'),
      dragon: typeof Game.SetDragonAura === 'function' && Number(Game.dragonLevel || 0) >= 5,
      seasons: typeof Game.startSeason === 'function',
      sugarLumps: typeof Game.clickLump === 'function' && typeof Game.canLumps === 'function',
      scheduler: !!state.schedulerTimer,
      watchdog: !!state.watchdogTimer,
      health: CONFIG.healthEnabled
    };
  }

  /** session: Retorna métricas básicas da sessão. */
  function session() {
    const elapsed = state.startedAt ? (Date.now() - state.startedAt) / 3600000 : 0;
    return {
      version: VERSION,
      active: state.active,
      paused: state.paused,
      cookies: cookies(),
      cps: cps(),
      prestige: gameExists() ? Number(Game.prestige || 0) : 0,
      prestigeGain: prestigeGain(),
      ascensionPhase: state.ascensionPhase,
      cookiesPerHour: elapsed > 0 ? Math.max(0, (cookies() - state.cookiesAtStart) / elapsed) : 0,
      lastAction: state.lastAction,
      lastError: state.lastError
    };
  }

  /** status: Mostra status, estatísticas e módulos no console. */
  function status() {
    const data = session();
    console.group('🍪 CookieBot V6 — Status');
    console.table(data);
    console.table(state.stats);
    console.table(moduleStatus());
    console.groupEnd();
    return { ...data, stats: { ...state.stats }, modules: moduleStatus() };
  }

  /** diagnostics: Mostra diagnóstico operacional do jogo e da V6. */
  function diagnostics() {
    const report = {
      version: VERSION,
      gameExists: gameExists(),
      gameReady: gameReady(),
      active: state.active,
      paused: state.paused,
      timers: [...state.timers.keys()],
      modules: moduleStatus(),
      game: gameExists() ? {
        cookies: cookies(),
        cps: cps(),
        buildings: Array.isArray(Game.ObjectsById) ? Game.ObjectsById.length : 0,
        upgradesInStore: Array.isArray(Game.UpgradesInStore) ? Game.UpgradesInStore.length : 0,
        shimmers: Array.isArray(Game.shimmers) ? Game.shimmers.length : 0,
        wrinklers: Array.isArray(Game.wrinklers) ? Game.wrinklers.length : 0
      } : null,
      lastError: state.lastError
    };
    console.group('🔎 CookieBot V6 — Diagnostics');
    console.log(report);
    console.groupEnd();
    return report;
  }

  // ============================================================
  // MÓDULO 12 — HEALTH / SCHEDULER / WATCHDOG
  // Observabilidade, execução periódica e recuperação controlada.
  // ============================================================
  /** runTask: Executa uma tarefa de timer com proteção contra falhas. */
  function runTask(name, fn) {
    if (state.hardStopped || !state.active || state.paused) return;
    state.stats.ticks++;
    safe(fn, null, 'tarefa ' + name + ' falhou');
  }

  /** taskHealthSnapshot: Produz snapshot de saúde de todas as tarefas. */
  function taskHealthSnapshot() {
    const now = Date.now();
    return [...state.schedulerTasks.values()].map(task => {
      const lastRun = state.taskLastRun.get(task.name) || 0;
      const lastSuccess = state.taskLastSuccess.get(task.name) || 0;
      const failures = state.taskFailures.get(task.name) || 0;
      const runs = state.taskRunCount.get(task.name) || 0;
      const durationMs = state.taskDurationMs.get(task.name) || 0;
      const ageMs = lastRun ? now - lastRun : Infinity;
      let health = state.taskHealth.get(task.name) || 'UNKNOWN';
      if (health === 'HEALTHY' && lastSuccess && ageMs > task.intervalMs + (Number(CONFIG.watchdogGraceMs) || 15000)) health = 'STALE';
      else if (health === 'UNKNOWN' && lastSuccess && ageMs <= task.intervalMs + (Number(CONFIG.watchdogGraceMs) || 15000)) health = failures ? 'DEGRADED' : 'HEALTHY';
      else if (health === 'UNKNOWN' && lastRun) health = 'STALE';
      return { name: task.name, health, intervalMs: task.intervalMs, lastRun, lastSuccess, ageMs, failures, runs, durationMs };
    });
  }

  /** healthSummary: Resume contagens de saúde das tarefas. */
  function healthSummary() {
    state.stats.healthChecks = (state.stats.healthChecks || 0) + 1;
    const tasks = taskHealthSnapshot();
    const counts = tasks.reduce((a, t) => { a[t.health] = (a[t.health] || 0) + 1; return a; }, {});
    const summary = {
      generatedAt: new Date().toISOString(),
      operationalState: operationalState(),
      scheduler: !!state.schedulerTimer,
      watchdog: !!state.watchdogTimer,
      tasks,
      counts,
      errors: state.stats.errors,
      watchdogRestarts: state.stats.watchdogRestarts || 0
    };
    if (CONFIG.healthEnabled) {
      state.healthHistory.push(summary);
      const max = Math.max(1, Math.floor(Number(CONFIG.healthHistoryMaxEntries) || 96));
      if (state.healthHistory.length > max) state.healthHistory = state.healthHistory.slice(-max);
    }
    return summary;
  }

  /** healthHistory: Retorna histórico de saúde. */
  function healthHistory() {
    return [...state.healthHistory];
  }

  /** clearHealthHistory: Limpa o histórico de saúde em memória. */
  function clearHealthHistory() {
    state.healthHistory = [];
    return true;
  }

  /** healthCycle: Observa saúde e registra detecções de tarefas STALE. */
  function healthCycle() {
    if (!state.active || state.paused) return null;
    const before = healthSummary();
    const stale = Number(before.counts.STALE || 0);
    if (stale > 0) {
      state.stats.healthStaleDetections = (state.stats.healthStaleDetections || 0) + stale;
    }
    // Health observa e registra. A recuperação real pertence ao Watchdog,
    // evitando contar uma detecção de STALE como se fosse uma recuperação.
    return {
      ...before,
      recoveryOwner: 'watchdog',
      staleDetected: stale
    };
  }

  /** operationalState: Determina o estado operacional atual da V6. */
  function operationalState() {
    if (!state.active) return 'IDLE';
    if (state.paused) return 'PAUSED';
    if (state.ascensionPhase !== 'READY') return state.ascensionPhase;
    if (state.ascending) return 'ASCENDING';
    if (hasBuff('click frenzy') || hasBuff('elder frenzy')) return 'BUFF_ACTIVE';
    return 'RUNNING';
  }

  /** registerTask: Registra uma tarefa no Scheduler. */
  function registerTask(name, intervalMs, priority, handler) {
    if (!name || typeof handler !== 'function') return false;
    state.schedulerTasks.set(name, {
      name,
      intervalMs: Math.max(100, Number(intervalMs) || 1000),
      priority: Number(priority) || 0,
      handler
    });
    state.taskLastRun.set(name, 0);
    state.taskFailures.set(name, 0);
    state.taskRunCount.set(name, 0);
    state.taskRecoveryAttempts.set(name, 0);
    state.taskLastRecovery.set(name, 0);
    return true;
  }

  /** runScheduledTask: Executa uma tarefa do Scheduler e registra sucesso/falha. */
  function runScheduledTask(task, now, recovery = false) {
    const started = performance.now();
    try {
      const result = task.handler();
      const duration = performance.now() - started;
      const failed = result === false;
      state.taskLastRun.set(task.name, now);
      state.taskRunCount.set(task.name, (state.taskRunCount.get(task.name) || 0) + 1);
      state.taskDurationMs.set(task.name, duration);
      if (failed) {
        const failures = (state.taskFailures.get(task.name) || 0) + 1;
        state.taskFailures.set(task.name, failures);
        state.taskHealth.set(task.name, 'DEGRADED');
        state.stats.errors++;
        log('warn', 'Tarefa retornou false: ' + task.name);
        return { ok: false, failures, duration };
      }
      state.taskFailures.set(task.name, 0);
      state.taskLastSuccess.set(task.name, now);
      state.taskHealth.set(task.name, 'HEALTHY');
      if (recovery) log('warn', 'Watchdog recuperou: ' + task.name);
      return { ok: true, duration };
    } catch (error) {
      const failures = (state.taskFailures.get(task.name) || 0) + 1;
      state.taskLastRun.set(task.name, now);
      state.taskFailures.set(task.name, failures);
      state.taskHealth.set(task.name, 'FAILED');
      state.stats.errors++;
      log('error', 'Falha na tarefa ' + task.name, error);
      return { ok: false, failures };
    }
  }

  /** schedulerTick: Executa tarefas cujo intervalo já venceu. */
  function schedulerTick() {
    if (state.hardStopped || !state.active || state.paused) return;
    state.stats.schedulerTicks = (state.stats.schedulerTicks || 0) + 1;
    const now = Date.now();
    const transitionActive = state.ascensionPhase !== 'READY';
    [...state.schedulerTasks.values()]
      .sort((a, b) => b.priority - a.priority)
      .forEach(task => {
        if (transitionActive && !['health', 'status', 'upgradeObservations'].includes(task.name)) return;
        const last = state.taskLastRun.get(task.name) || 0;
        if (now - last >= task.intervalMs) runScheduledTask(task, now);
      });
  }

  /** watchdogTick: Detecta tarefas atrasadas e tenta recuperação controlada. */
  function watchdogTick() {
    if (state.hardStopped || !state.active || state.paused) return;
    const transitionActive = state.ascensionPhase !== 'READY';
    const now = Date.now();
    const grace = Math.max(5000, Number(CONFIG.watchdogGraceMs) || 15000);
    for (const task of state.schedulerTasks.values()) {
      if (transitionActive && !['health', 'status', 'upgradeObservations'].includes(task.name)) continue;
      const last = state.taskLastRun.get(task.name) || 0;
      if (now - last > task.intervalMs + grace) {
        const attempts = state.taskRecoveryAttempts.get(task.name) || 0;
        const lastRecovery = state.taskLastRecovery.get(task.name) || 0;
        const cooldown = Math.max(5000, Number(CONFIG.watchdogRecoveryCooldownMs) || 15000);
        if (attempts >= Math.max(1, Number(CONFIG.watchdogMaxRecoveryAttempts) || 2) &&
            now - lastRecovery < cooldown) {
          state.taskHealth.set(task.name, 'STALE');
          continue;
        }
        const result = runScheduledTask(task, now, true);
        state.taskLastRecovery.set(task.name, now);
        if (result && result.ok) {
          state.taskRecoveryAttempts.set(task.name, 0);
          state.stats.watchdogRestarts = (state.stats.watchdogRestarts || 0) + 1;
        } else {
          state.taskRecoveryAttempts.set(task.name, attempts + 1);
        }
      }
    }
  }

  /** startScheduler: Inicia Scheduler e Watchdog. */
  function startScheduler() {
    if (state.hardStopped) return false;
    stopScheduler();
    state.schedulerTimer = setInterval(schedulerTick, Math.max(100, Number(CONFIG.schedulerIntervalMs) || 1000));
    state.watchdogTimer = setInterval(watchdogTick, Math.max(5000, Number(CONFIG.watchdogIntervalMs) || 10000));
    return true;
  }

  /** stopScheduler: Para Scheduler e Watchdog. */
  function stopScheduler() {
    if (state.schedulerTimer) clearInterval(state.schedulerTimer);
    if (state.watchdogTimer) clearInterval(state.watchdogTimer);
    state.schedulerTimer = null;
    state.watchdogTimer = null;
    return true;
  }

  /** configureScheduler: Reconstrói a tabela de tarefas conforme CONFIG. */
  function configureScheduler() {
    state.schedulerTasks.clear();
    state.taskLastRun.clear();
    state.taskFailures.clear();
    state.taskRunCount.clear();
    state.taskRecoveryAttempts.clear();
    state.taskLastRecovery.clear();
    state.taskDurationMs.clear();
    state.taskLastSuccess.clear();
    state.taskHealth.clear();

    registerTask('shimmers', CONFIG.shimmerMs, 100, clickShimmers);
    registerTask('prestige', CONFIG.prestigeMs, 90, tryAscend);
    registerTask('purchases', CONFIG.purchaseMs, 80, purchaseCycle);
    registerTask('wrinklers', CONFIG.wrinklerMs, 70, manageWrinklers);
    if (CONFIG.grimoireEnabled) registerTask('grimoire', CONFIG.shimmerMs, 60, castGrimoire);
    if (CONFIG.gardenEnabled) registerTask('garden', CONFIG.purchaseMs, 50, gardenCycle);
    if (CONFIG.marketEnabled) registerTask('market', CONFIG.purchaseMs, 40, manageMarket);
    if (CONFIG.pantheonEnabled) registerTask('pantheon', CONFIG.purchaseMs, 30, managePantheon);
    if (CONFIG.dragonEnabled) registerTask('dragon', CONFIG.purchaseMs, 20, manageDragon);
    if (CONFIG.seasonsEnabled) registerTask('season', CONFIG.purchaseMs, 15, manageSeason);
    if (CONFIG.sugarLumpsEnabled) registerTask('sugarLump', CONFIG.purchaseMs, 10, manageSugarLump);
    registerTask('status', CONFIG.statusMs, 4, status);
    registerTask('report', CONFIG.reportMs, 5, report);
    registerTask('economicReport', CONFIG.reportMs, 5, economicReport);
    registerTask('upgradeObservations', 1000, 7, finalizeUpgradeObservations);
    if (CONFIG.healthEnabled) registerTask('health', CONFIG.statusMs, 6, healthCycle);
    return state.schedulerTasks.size;
  }

  /** addTimer: Cria um timer de intervalo rastreável. */
  function addTimer(name, interval, fn) {
    if (state.hardStopped) return;
    removeTimer(name);
    const id = setInterval(() => runTask(name, fn), Math.max(50, Number(interval) || 1000));
    state.timers.set(name, id);
  }

  /** removeTimer: Remove um timer específico. */
  function removeTimer(name) {
    const id = state.timers.get(name);
    if (id) clearInterval(id);
    state.timers.delete(name);
  }

  /** clearAllTimers: Cancela timers, Scheduler e timeouts controlados. */
  function clearAllTimers() {
    if (state.goldenSpawnTimer) clearInterval(state.goldenSpawnTimer);
    state.goldenSpawnTimer = null;
    state.goldenSpawnRemaining = 0;
    state.timers.forEach(id => clearInterval(id));
    state.timers.clear();
    stopScheduler();
    state.schedulerTasks.clear();
    state.taskLastRun.clear();
    state.taskFailures.clear();
    state.taskRunCount.clear();
    state.timeouts.forEach(id => clearTimeout(id));
    state.timeouts.clear();
  }


  // ============================================================
  // MÓDULO 13 — PERSISTÊNCIA
  // Histórico da sessão e observações estatísticas de upgrades.
  // ============================================================
  /** historyKey: Retorna a chave de armazenamento do histórico. */
  function historyKey() {
    return '__COOKIE_CLICKER_BOT_V6_HISTORY__';
  }

  /** loadHistory: Carrega histórico persistido. */
  function loadHistory() {
    if (!CONFIG.historyEnabled || typeof localStorage === 'undefined') return [];
    return safe(() => {
      const raw = localStorage.getItem(historyKey());
      const parsed = raw ? JSON.parse(raw) : [];
      state.history = Array.isArray(parsed) ? parsed.slice(-Math.max(1, Number(CONFIG.historyMaxEntries) || 96)) : [];
      return [...state.history];
    }, [], 'histórico não pôde ser carregado');
  }

  /** saveHistory: Adiciona e persiste uma entrada de histórico. */
  function saveHistory(entry) {
    if (!CONFIG.historyEnabled || typeof localStorage === 'undefined') return false;
    return safe(() => {
      state.history.push({
        generatedAt: new Date().toISOString(),
        ...entry
      });
      const max = Math.max(1, Math.floor(Number(CONFIG.historyMaxEntries) || 96));
      if (state.history.length > max) state.history = state.history.slice(-max);
      localStorage.setItem(historyKey(), JSON.stringify(state.history));
      state.stats.historySaves++;
      return true;
    }, false, 'histórico não pôde ser salvo');
  }

  /** performanceHistory: Retorna cópia do histórico atual. */
  function performanceHistory() {
    return [...state.history];
  }

  /** clearHistory: Limpa histórico em memória e no armazenamento. */
  function clearHistory() {
    state.history = [];
    if (typeof localStorage !== 'undefined') {
      safe(() => localStorage.removeItem(historyKey()), null, 'histórico não pôde ser limpo');
    }
    return true;
  }

  /** report: Gera relatório da sessão atual. */
  function report() {
    if (!state.active || !gameReady()) return null;
    const data = {
      generatedAt: new Date().toISOString(),
      cookies: cookies(),
      cps: cps(),
      prestigeGain: prestigeGain(),
      clicks: state.stats.clicks,
      shimmers: state.stats.shimmers,
      upgrades: state.stats.upgrades,
      buildings: state.stats.buildings,
      errors: state.stats.errors,
      economicDecisions: state.stats.economicDecisions,
      economicNoops: state.stats.economicNoops,
      lastAction: state.lastAction
    };
    saveHistory(data);
    console.group('🍪 CookieBot V6 — Relatório');
    console.table(data);
    console.groupEnd();
    return data;
  }

  // ============================================================
  // MÓDULO 14 — CICLO DE VIDA / TIMERS / API
  // Inicialização, parada, break global, help e superfície pública.
  // ============================================================
  /** bot_spawn_golden_cookies: Spawna uma quantidade controlada de Golden Cookies usando a API do jogo. */
  function bot_spawn_golden_cookies(amount, intervalSeconds) {
    if (state.hardStopped || !gameReady()) return false;
    if (typeof Game.shimmer !== 'function') {
      log('warn', 'Golden Cookie spawn indisponível: Game.shimmer não existe.');
      return false;
    }

    const total = Math.max(1, Math.floor(Number(amount) || CONFIG.goldenSpawnDefaultAmount || 10));
    const interval = Math.max(0, Number(intervalSeconds) || CONFIG.goldenSpawnDefaultIntervalSeconds || 5);

    if (state.goldenSpawnTimer) {
      clearInterval(state.goldenSpawnTimer);
      state.goldenSpawnTimer = null;
    }

    let spawned = 0;
    state.goldenSpawnRemaining = total;

    const spawnOne = () => {
      if (state.hardStopped || !state.active) {
        if (state.goldenSpawnTimer) clearInterval(state.goldenSpawnTimer);
        state.goldenSpawnTimer = null;
        state.goldenSpawnRemaining = 0;
        return;
      }

      safe(() => {
        new Game.shimmer('golden');
        spawned++;
        state.goldenSpawnRemaining = Math.max(0, total - spawned);
        state.lastAction = 'golden-cookie:spawn';
        log('info', 'Golden Cookie spawnado ' + spawned + '/' + total + '.');

        if (spawned >= total && state.goldenSpawnTimer) {
          clearInterval(state.goldenSpawnTimer);
          state.goldenSpawnTimer = null;
          state.goldenSpawnRemaining = 0;
        }
        return true;
      }, false, 'spawn de Golden Cookie falhou');
    };

    // O primeiro Golden Cookie nasce imediatamente; os seguintes respeitam o intervalo.
    spawnOne();
    if (spawned >= total) return true;

    if (interval === 0) {
      while (spawned < total && !state.hardStopped) spawnOne();
      return spawned === total;
    }

    state.goldenSpawnTimer = setInterval(spawnOne, interval * 1000);
    return true;
  }

  /** configureTimers: Configura timer de clique e todos os módulos agendados. */
  function configureTimers() {
    clearAllTimers();
    // Clicks permanecem em timer próprio porque o scheduler trabalha em escala de segundos.
    addTimer('click', clickDelay(), clickCookie);
    configureScheduler();
    startScheduler();
  }


  /** stop: Para a execução normal da instância. */
  function stop() {
    clearAllTimers();
    state.active = false;
    state.paused = false;
    state.ascending = false;
    log('info', 'Bot parado.');
    return true;
  }

  /** Bot_Start: Libera eventual break global e inicia o bot. */
  function Bot_Start() {
    CONTROL.broken = false;
    CONTROL.updatedAt = Date.now();
    CONTROL.version = VERSION;
    state.hardStopped = false;
    const started = start();
    log('info', started ? 'Bot_Start: bot iniciado.' : 'Bot_Start: jogo ainda não está pronto.');
    return started;
  }

  /** Bot_Stop: Para normalmente a instância sem manter bloqueio global. */
  function Bot_Stop() {
    const stopped = stop();
    CONTROL.broken = false;
    CONTROL.updatedAt = Date.now();
    CONTROL.version = VERSION;
    log('info', 'Bot_Stop: execução normal encerrada.');
    return stopped;
  }

  /** Bot_Stop_And_Break: Interrompe tudo e ativa bloqueio global para troca de versão. */
  function Bot_Stop_And_Break() {
    CONTROL.broken = true;
    CONTROL.updatedAt = Date.now();
    CONTROL.version = VERSION;

    state.hardStopped = true;
    clearAllTimers();
    state.active = false;
    state.paused = true;
    state.ascending = false;
    state.ascensionPhase = state.ascensionPhase === 'ASCENDING' ? 'FAILED' : state.ascensionPhase;
    log('warn', 'Bot_Stop_And_Break: V6 completamente interrompida. Nenhum auto-start será feito até Bot_Start.');
    return true;
  }

  /** pause: Pausa a automação sem destruir a instância. */
  function pause() {
    if (!state.active) return false;
    state.paused = true;
    log('info', 'Bot pausado.');
    return true;
  }

  /** resume: Retoma uma instância pausada. */
  function resume() {
    if (!state.active) return false;
    state.paused = false;
    log('info', 'Bot retomado.');
    return true;
  }

  /** start: Inicializa estado da sessão e configura os timers. */
  function start() {
    if (state.hardStopped) return false;
    if (state.active) return true;
    if (!waitForGame()) return false;

    state.active = true;
    state.paused = false;
    state.startedAt = Date.now();
    state.cookiesAtStart = cookies();
    state.lastError = null;
    loadHistory();
    loadUpgradeObservations();

    configureTimers();
    log('info', 'Bot V6 iniciado.');
    log('info', 'Use CookieBotV6.status(), .diagnostics(), .pause(), .resume() ou .stop().');
    return true;
  }

  /** config: Lê ou atualiza configurações do bot. */
  function config(next) {
    if (!next || typeof next !== 'object') return { ...CONFIG };
    Object.assign(CONFIG, next);
    if (state.active) configureTimers();
    return { ...CONFIG };
  }

  /**
   * Help central da V6.
   * Sem argumento: mostra comandos, módulos e pontos principais de manutenção.
   * Com tópico: retorna detalhes do comando/módulo solicitado.
   *
   * Exemplos:
   *   Bot_Help()
   *   Bot_Help('upgrades')
   *   Bot_Help('ascension')
   *   Bot_Help('scheduler')
   *   Bot_Help('lifecycle')
   */
  /** Bot_Help: Função interna do módulo; consulte Bot_Help() para o ponto de manutenção relacionado. */
  function Bot_Help(topic) {
    const topics = {
      lifecycle: {
        title: 'Controle do bot',
        commands: {
          Bot_Start: 'inicia/libera a V6',
          Bot_Stop: 'para normalmente sem bloquear outra execução',
          Bot_Stop_And_Break: 'para tudo e ativa o bloqueio global para troca de versão',
          'CookieBotV6.start': 'inicia a instância pela API',
          'CookieBotV6.stop': 'para a instância pela API',
          'CookieBotV6.pause': 'pausa tarefas',
          'CookieBotV6.resume': 'retoma tarefas'
        },
        edit: 'Altere a seção Lifecycle/Controles para modificar o comportamento de início, pausa, parada e troca de versão.'
      },
      upgrades: {
        title: 'Upgrades e compras',
        commands: {
          'CookieBotV6.upgradeAnalysis(upgrade)': 'analisa preço, ganho estimado, observações e payback',
          'CookieBotV6.economicScoreUpgrade(upgrade)': 'transforma a análise em score econômico',
          'CookieBotV6.chooseEconomicAction()': 'escolhe entre upgrades e prédios',
          'CookieBotV6.buyBestUpgrade()': 'compra o upgrade selecionado'
        },
        edit: 'A principal lógica fica nas funções upgradeStatProfile, economicScoreUpgrade, chooseEconomicAction e executeEconomicAction.'
      },
      ascension: {
        title: 'Ascensão',
        commands: {
          'CookieBotV6.ascensionAnalysis()': 'calcula ganho, recuperação e payback estimados',
          'CookieBotV6.shouldAscend()': 'decide se a configuração permite ascensão',
          'CookieBotV6.performAscension()': 'executa a ascensão aprovada',
          'CookieBotV6.verifyAscensionTransition(snapshot)': 'confere se a transição ocorreu',
          'CookieBotV6.recoverAscensionFailure()': 'recupera manualmente um estado FAILED sem repetir a ascensão'
        },
        edit: 'Mexa primeiro em ascensionAnalysis/verifyAscensionTransition; performAscension controla o fluxo e failAscension trata falhas.'
      },
      scheduler: {
        title: 'Scheduler, Watchdog e Health',
        commands: {
          'CookieBotV6.schedulerTick()': 'executa tarefas vencidas',
          'CookieBotV6.watchdogTick()': 'detecta tarefas atrasadas e tenta recuperação',
          'CookieBotV6.taskHealthSnapshot()': 'mostra saúde por tarefa',
          'CookieBotV6.healthSummary()': 'resume a saúde do Scheduler'
        },
        edit: 'registerTask define tarefas; runScheduledTask executa e registra resultado; watchdogTick é o dono da recuperação.'
      },
      golden: {
        title: 'Golden Cookies',
        commands: {
          'bot_spawn_golden_cookies()': 'spawna 10 Golden Cookies por padrão, com 5 segundos entre eles',
          'bot_spawn_golden_cookies(quantidade, intervalo)': 'define quantidade e intervalo em segundos'
        },
        edit: 'A função bot_spawn_golden_cookies usa Game.shimmer("golden"). O timer é rastreado por clearAllTimers para obedecer Bot_Stop e Bot_Stop_And_Break.'
      },
      minigames: {
        title: 'Minigames',
        commands: {
          Grimoire: 'grimoireMinigame, grimoireSpellList, findGrimoireSpell, castGrimoire',
          Garden: 'gardenMinigame, gardenTiles, harvestGarden, plantGarden, gardenCycle',
          Market: 'marketMinigame, marketGoods, marketPrice, manageMarket',
          Pantheon: 'pantheonMinigame, pantheonGods, findPantheonGod, managePantheon',
          Dragon: 'dragonAuras, findDragonAura, manageDragon',
          Seasons: 'manageSeason',
          'Sugar Lumps': 'sugarLumpReady, manageSugarLump'
        },
        edit: 'Cada minigame possui seu próprio bloco de funções e configuração. Por padrão, vários módulos permanecem desativados.'
      },
      persistence: {
        title: 'Histórico e estatísticas',
        commands: {
          'CookieBotV6.performanceHistory()': 'retorna histórico salvo',
          'CookieBotV6.clearHistory()': 'limpa histórico em memória e armazenamento',
          'CookieBotV6.loadUpgradeObservations()': 'carrega observações estatísticas',
          'CookieBotV6.saveUpgradeObservations()': 'persiste observações estatísticas'
        },
        edit: 'historyKey/upgradeObservationKey definem chaves de armazenamento; load/save controlam persistência.'
      },
      diagnostics: {
        title: 'Diagnóstico',
        commands: {
          'CookieBotV6.status()': 'status resumido',
          'CookieBotV6.diagnostics()': 'diagnóstico do jogo e do bot',
          'CookieBotV6.report()': 'relatório da sessão',
          'CookieBotV6.economicReport()': 'relatório econômico',
          'CookieBotV6.ascensionReport()': 'relatório de ascensão'
        },
        edit: 'Use status/diagnostics antes de alterar lógica; lastError, taskHealth e stats ajudam a localizar falhas.'
      },
      architecture: {
        title: 'Arquitetura da V6',
        order: [
          'CONFIG -> configurações editáveis',
          'state -> estado em memória da instância',
          'helpers -> acesso seguro ao Game',
          'módulos de jogo -> cliques, economia, minigames e ascensão',
          'health/scheduler -> execução periódica e recuperação',
          'persistence -> histórico e observações',
          'lifecycle -> start/stop/break/help/API'
        ],
        edit: 'Prefira alterar apenas o módulo responsável. Evite criar timers novos fora de configureTimers/configureScheduler.'
      }
    };

    if (topic) {
      const key = String(topic).trim().toLowerCase();
      const aliases = {
        start: 'lifecycle', stop: 'lifecycle', break: 'lifecycle', bot: 'lifecycle',
        upgrade: 'upgrades', upgrades: 'upgrades', compra: 'upgrades', compras: 'upgrades', golden: 'golden', goldencookies: 'golden',
        ascend: 'ascension', ascension: 'ascension', prestígio: 'ascension',
        scheduler: 'scheduler', watchdog: 'scheduler', health: 'scheduler',
        minigame: 'minigames', minigames: 'minigames',
        history: 'persistence', persistencia: 'persistence', persistência: 'persistence',
        status: 'diagnostics', diagnostico: 'diagnostics', diagnóstico: 'diagnostics',
        arquitetura: 'architecture', architecture: 'architecture'
      };
      const resolved = topics[key] ? key : aliases[key];
      const result = resolved ? { topic: resolved, ...topics[resolved] } : {
        topic: key,
        title: 'Tópico não encontrado',
        availableTopics: Object.keys(topics),
        hint: 'Use Bot_Help() para ver o índice.'
      };
      console.group('📚 CookieBot V' + VERSION + ' — Help');
      console.log(result);
      console.groupEnd();
      return result;
    }

    const index = {
      version: VERSION,
      commands: [
        'Bot_Start()',
        'Bot_Stop()',
        'Bot_Stop_And_Break()',
        'Bot_Help()',
        'CookieBotV6.status()',
        'CookieBotV6.diagnostics()',
        'CookieBotV6.config({...})',
        'bot_spawn_golden_cookies()'
      ],
      topics: Object.fromEntries(Object.entries(topics).map(([key, value]) => [key, value.title])),
      maintenance: {
        config: 'CONFIG',
        state: 'state',
        economy: 'upgradeStatProfile / economicScoreUpgrade / chooseEconomicAction / executeEconomicAction',
        ascension: 'ascensionAnalysis / verifyAscensionTransition / performAscension',
        scheduler: 'registerTask / runScheduledTask / schedulerTick / watchdogTick',
        persistence: 'historyKey / loadHistory / saveHistory / upgradeObservationKey / loadUpgradeObservations'
      }
    };

    console.group('📚 CookieBot V' + VERSION + ' — Help');
    console.table(index.topics);
    console.log(index);
    console.log('Detalhe: Bot_Help("upgrades"), Bot_Help("ascension"), etc.');
    console.groupEnd();
    return index;
  }

  /** api: Monta a API pública exposta em CookieBotV6. */
  function api() {
    return {
      version: VERSION,
      start,
      Bot_Start,
      Bot_Stop,
      Bot_Help,
      Bot_Stop_And_Break,
      stop,
      pause,
      resume,
      status,
      diagnostics,
      report,
      ascensionReport,
      config,
      prestigeGain,
      shouldAscend,
      upgradeAnalysis,
      buyHeavenlyUpgrades,
      performAscension,
      recoverAscensionFailure,
      clickCookie,
      clickShimmers,
      purchaseCycle,
      buyBestUpgrade,
      buyBestBuilding,
      manageWrinklers,
      effectiveCookieReserve,
      economicBudget,
      economicScoreBuilding,
      economicScoreUpgrade,
      chooseEconomicAction,
      executeEconomicAction,
      economicReport,
      historyKey,
      loadHistory,
      upgradeObservationKey,
      loadUpgradeObservations,
      saveUpgradeObservations,
      finalizeUpgradeObservations,
      saveHistory,
      performanceHistory,
      clearHistory,
      grimoireMinigame,
      findGrimoireSpell,
      castGrimoire,
      gardenMinigame,
      gardenTiles,
      harvestGarden,
      plantGarden,
      gardenCycle,
      marketMinigame,
      marketGoods,
      manageMarket,
      pantheonMinigame,
      pantheonGods,
      findPantheonGod,
      managePantheon,
      dragonAuras,
      findDragonAura,
      manageDragon,
      manageSeason,
      sugarLumpReady,
      manageSugarLump,
      ascensionAnalysis,
      upgradeStatProfile,
      verifyAscensionTransition,
      moduleStatus,
      operationalState,
      registerTask,
      schedulerTick,
      watchdogTick,
      startScheduler,
      stopScheduler,
      configureScheduler,
      taskHealthSnapshot,
      healthSummary,
      healthHistory,
      clearHealthHistory,
      healthCycle
    };
  }

  // Encerra uma instância anterior sem destruir os arquivos/versões antigas.
  if (window[KEY] && typeof window[KEY].stop === 'function') {
    safe(() => window[KEY].stop(), null, 'instância V6 anterior');
  }

  window[KEY] = api();
  window.CookieBotV6 = window[KEY];
  window.Bot_Start = Bot_Start;
  window.Bot_Stop = Bot_Stop;
  window.Bot_Help = Bot_Help;
  window.bot_spawn_golden_cookies = bot_spawn_golden_cookies;
  window.Bot_Stop_And_Break = Bot_Stop_And_Break;
  CONTROL.version = VERSION;
  CONTROL.updatedAt = Date.now();

  console.log('%c🍪 Cookie Clicker Bot V' + VERSION + ' carregado', 'font-weight:bold;font-size:14px');
  console.log('Controles globais: Bot_Start(), Bot_Stop(), Bot_Stop_And_Break(), Bot_Help().');
  console.log('Diagnóstico: CookieBotV6.diagnostics()');

  if (CONTROL.broken) {
    state.hardStopped = true;
    state.active = false;
    state.paused = true;
    console.warn('[CookieBot V' + VERSION + '] Break global ativo. Use Bot_Start() para liberar esta versão.');
  } else {
    CookieBotV6.start();
  }
})();
