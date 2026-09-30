// ============================================================
// 🍪 COOKIE CLICKER BOT — V6 STABLE
// Runtime-first rewrite: núcleo pequeno, compatível e observável.
// Uso: Cookie Clicker Web -> F12 -> Console -> cole o arquivo inteiro.
// ============================================================

(() => {
  'use strict';

  const VERSION = '6.0.0';
  const KEY = '__COOKIE_CLICKER_BOT_V6__';

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
    prestigeThreshold: 100,

    // Estourar wrinklers por padrão também fica desligado.
    popWrinklers: false,
    wrinklersToKeep: 0,

    spendingLimit: 0.75,
    reserveCookies: 0,

    // Minigames são opcionais e só executam quando a API real estiver presente.
    grimoire: false,
    garden: false,
    market: false,
    pantheon: false,
    dragon: false,

    logging: true
  };

  const state = {
    active: false,
    paused: false,
    startedAt: 0,
    cookiesAtStart: 0,
    lastAction: 'nenhuma',
    lastError: null,
    timers: new Map(),
    stats: {
      clicks: 0,
      shimmers: 0,
      upgrades: 0,
      buildings: 0,
      wrinklers: 0,
      ascensions: 0,
      errors: 0,
      ticks: 0
    }
  };

  function log(level, message, error) {
    if (!CONFIG.logging) return;
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🍪';
    console.log(
      '[' + prefix + ' CookieBot V' + VERSION + '] ' +
      new Date().toLocaleTimeString('pt-BR') + ' — ' + message +
      (error ? ' — ' + String(error.message || error) : '')
    );
  }

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

  function gameExists() {
    return typeof Game !== 'undefined' && Game !== null;
  }

  function gameReady() {
    if (!gameExists()) return false;
    // Algumas versões expõem Game.ready; outras deixam a flag ausente.
    if (Game.ready === false) return false;
    return Array.isArray(Game.ObjectsById) && typeof Game.ClickCookie === 'function';
  }

  function waitForGame() {
    if (gameReady()) return true;
    log('warn', 'Cookie Clicker ainda não está pronto. O V6 vai aguardar.');
    return false;
  }

  function cookies() {
    return gameExists() ? Number(Game.cookies || 0) : 0;
  }

  function cps() {
    return gameExists() ? Number(Game.cookiesPs || 0) : 0;
  }

  function isPaused() {
    return !state.active || state.paused;
  }

  function hasBuff(text) {
    if (!gameExists() || !Game.buffs) return false;
    const wanted = String(text).toLowerCase();
    return Object.keys(Game.buffs).some(name => name.toLowerCase().includes(wanted));
  }

  function clickDelay() {
    if (hasBuff('click frenzy')) return 5;
    if (hasBuff('elder frenzy')) return 8;
    if (hasBuff('frenzy')) return 12;
    return Math.max(5, Number(CONFIG.clickMs) || 25);
  }

  function clickCookie() {
    if (isPaused() || !gameReady()) return false;
    return safe(() => {
      Game.ClickCookie();
      state.stats.clicks++;
      state.lastAction = 'click';
      return true;
    }, false, 'clique do cookie falhou');
  }

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

  function affordable(price) {
    if (!Number.isFinite(price) || price < 0) return false;
    const bank = cookies();
    const limit = Math.max(0, Math.min(1, Number(CONFIG.spendingLimit)));
    return price + Number(CONFIG.reserveCookies || 0) <= bank * limit;
  }

  function buyBestUpgrade() {
    if (isPaused() || !CONFIG.buyUpgrades || !gameReady()) return false;
    if (!Array.isArray(Game.UpgradesInStore)) return false;

    const candidates = Game.UpgradesInStore
      .filter(u => u && !u.bought && typeof u.buy === 'function')
      .map(u => ({ item: u, price: safe(() => Number(u.getPrice()), Infinity, 'preço de upgrade inválido') }))
      .filter(x => affordable(x.price))
      .sort((a, b) => a.price - b.price);

    const choice = candidates[0];
    if (!choice) return false;

    return safe(() => {
      choice.item.buy();
      state.stats.upgrades++;
      state.lastAction = 'upgrade:' + String(choice.item.name || choice.item.id);
      return true;
    }, false, 'compra de upgrade falhou');
  }

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

  function purchaseCycle() {
    if (isPaused() || !gameReady()) return;
    // Primeiro tenta o upgrade mais barato disponível.
    // Se não houver, usa ROI de edifícios.
    if (buyBestUpgrade()) return;
    buyBestBuilding();
  }

  function activeWrinklers() {
    if (!gameReady() || !Array.isArray(Game.wrinklers)) return [];
    return Game.wrinklers.filter(w =>
      w &&
      Number(w.phase || 0) > 0 &&
      (Number(w.sucked || 0) > 0 || w.close)
    );
  }

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

  function prestigeGain() {
    if (!gameReady() || typeof Game.HowMuchPrestige !== 'function') return 0;
    return safe(() => {
      const total = Math.max(0, Number(Game.cookiesReset || 0) + Number(Game.cookiesEarned || 0));
      const current = Math.max(0, Number(Game.prestige || 0));
      return Math.max(0, Math.floor(Number(Game.HowMuchPrestige(total)) - current));
    }, 0, 'prestígio falhou');
  }

  function tryAscend() {
    if (!CONFIG.autoAscend || isPaused() || !gameReady()) return false;
    if (prestigeGain() < Math.max(0, Number(CONFIG.prestigeThreshold))) return false;
    if (typeof Game.Ascend !== 'function') return false;

    return safe(() => {
      Game.Ascend(1);
      state.stats.ascensions++;
      state.lastAction = 'ascensão';
      return true;
    }, false, 'ascensão falhou');
  }

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
      dragon: typeof Game.SetDragonAura === 'function' && Number(Game.dragonLevel || 0) >= 5
    };
  }

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
      cookiesPerHour: elapsed > 0 ? Math.max(0, (cookies() - state.cookiesAtStart) / elapsed) : 0,
      lastAction: state.lastAction,
      lastError: state.lastError
    };
  }

  function status() {
    const data = session();
    console.group('🍪 CookieBot V6 — Status');
    console.table(data);
    console.table(state.stats);
    console.table(moduleStatus());
    console.groupEnd();
    return { ...data, stats: { ...state.stats }, modules: moduleStatus() };
  }

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

  function runTask(name, fn) {
    if (!state.active || state.paused) return;
    state.stats.ticks++;
    safe(fn, null, 'tarefa ' + name + ' falhou');
  }

  function addTimer(name, interval, fn) {
    removeTimer(name);
    const id = setInterval(() => runTask(name, fn), Math.max(50, Number(interval) || 1000));
    state.timers.set(name, id);
  }

  function removeTimer(name) {
    const id = state.timers.get(name);
    if (id) clearInterval(id);
    state.timers.delete(name);
  }

  function clearAllTimers() {
    state.timers.forEach(id => clearInterval(id));
    state.timers.clear();
  }

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
      lastAction: state.lastAction
    };
    console.group('🍪 CookieBot V6 — Relatório');
    console.table(data);
    console.groupEnd();
    return data;
  }

  function configureTimers() {
    clearAllTimers();

    addTimer('click', clickDelay(), clickCookie);
    addTimer('shimmers', CONFIG.shimmerMs, clickShimmers);
    addTimer('purchases', CONFIG.purchaseMs, purchaseCycle);
    addTimer('wrinklers', CONFIG.wrinklerMs, manageWrinklers);
    addTimer('prestige', CONFIG.prestigeMs, tryAscend);
    addTimer('status', CONFIG.statusMs, status);
    addTimer('report', CONFIG.reportMs, report);
  }

  function stop() {
    clearAllTimers();
    state.active = false;
    state.paused = false;
    log('info', 'Bot parado.');
    return true;
  }

  function pause() {
    if (!state.active) return false;
    state.paused = true;
    log('info', 'Bot pausado.');
    return true;
  }

  function resume() {
    if (!state.active) return false;
    state.paused = false;
    log('info', 'Bot retomado.');
    return true;
  }

  function start() {
    if (state.active) return true;
    if (!waitForGame()) return false;

    state.active = true;
    state.paused = false;
    state.startedAt = Date.now();
    state.cookiesAtStart = cookies();
    state.lastError = null;

    configureTimers();
    log('info', 'Bot V6 iniciado.');
    log('info', 'Use CookieBotV6.status(), .diagnostics(), .pause(), .resume() ou .stop().');
    return true;
  }

  function config(next) {
    if (!next || typeof next !== 'object') return { ...CONFIG };
    Object.assign(CONFIG, next);
    if (state.active) configureTimers();
    return { ...CONFIG };
  }

  function api() {
    return {
      version: VERSION,
      start,
      stop,
      pause,
      resume,
      status,
      diagnostics,
      report,
      config,
      prestigeGain,
      clickCookie,
      clickShimmers,
      purchaseCycle,
      buyBestUpgrade,
      buyBestBuilding,
      manageWrinklers,
      moduleStatus
    };
  }

  // Encerra uma instância anterior sem destruir os arquivos/versões antigas.
  if (window[KEY] && typeof window[KEY].stop === 'function') {
    safe(() => window[KEY].stop(), null, 'instância V6 anterior');
  }

  window[KEY] = api();
  window.CookieBotV6 = window[KEY];

  console.log('%c🍪 Cookie Clicker Bot V6.0.0 carregado', 'font-weight:bold;font-size:14px');
  console.log('Se o jogo já estiver pronto, o V6 inicia sozinho. Se não estiver, execute CookieBotV6.start() após carregar.');
  console.log('Diagnóstico: CookieBotV6.diagnostics()');

  CookieBotV6.start();
})();
