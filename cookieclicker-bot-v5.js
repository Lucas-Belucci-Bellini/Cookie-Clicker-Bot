// ============================================================
// 🍪 COOKIE CLICKER BOT — V5 ULTIMATE
// 50+ funções, núcleo seguro e automação modular
// Uso: Cookie Clicker Web -> F12 -> Console -> cole o arquivo
// ============================================================

(() => {
  'use strict';

  const VERSION = '5.2.0';
  const GLOBAL_KEY = '__COOKIE_CLICKER_BOT_V5__';

  // ============================================================
  // CONFIGURAÇÃO
  // ============================================================
  const CONFIG = {
    clickNormalMs: 50,
    clickFrenzyMs: 10,
    clickElderMs: 20,
    shimmerScanMs: 200,
    purchaseScanMs: 2500,
    statusScanMs: 15000,
    prestigeScanMs: 30000,
    wrinklerScanMs: 15000,
    grimoireScanMs: 10000,
    gardenScanMs: 15000,
    marketScanMs: 10000,
    pantheonScanMs: 20000,
    dragonScanMs: 30000,
    seasonScanMs: 30000,
    sugarLumpScanMs: 30000,

    spendingLimit: 0.50,
    reserveCookies: 0,
    prestigeThreshold: 100,

    clickGolden: true,
    clickWrath: true,
    clickReindeer: true,
    popWrinklers: true,
    wrinklersToKeep: 0,

    useGrimoire: true,
    grimoireSpell: 'Force the Hand of Fate',
    manageGarden: true,
    favoriteSeed: 'queenbeet',
    manageMarket: true,
    managePantheon: true,
    manageDragon: true,
    manageSeasons: true,
    seasonPriority: ['valentines', 'christmas', 'halloween', 'easter', 'fools'],
    manageSugarLumps: true,

    autoAscend: true,
    autoReincarnate: true,
    buyHeavenlyUpgrades: true,
    postAscensionDelayMs: 4000,

    nightMode: false,
    nightStart: 23,
    nightEnd: 7,

    periodicStatus: true,
    logEnabled: true,
    logLevel: 'info'
  };

  // ============================================================
  // ESTADO
  // ============================================================
  const state = {
    active: false,
    paused: false,
    ascending: false,
    clickTimer: null,
    timers: new Set(),
    timeouts: new Set(),
    startedAt: 0,
    cookiesAtStart: 0,
    lastCookies: 0,
    lastClickMode: '',
    lastPrestige: 0,
    lastAction: '',
    stats: {
      clicks: 0,
      shimmers: 0,
      purchases: 0,
      upgrades: 0,
      buildings: 0,
      wrinklers: 0,
      spells: 0,
      gardenHarvests: 0,
      gardenPlants: 0,
      marketBuys: 0,
      marketSells: 0,
      ascensions: 0,
      heavenlyUpgrades: 0,
      reincarnations: 0,
      errors: 0
    }
  };

  // ============================================================
  // 50 FUNÇÕES PRINCIPAIS
  // ============================================================

  // 01
  function gameReady() {
    return typeof Game !== 'undefined' && !!Game && !!Game.ready;
  }

  // 02
  function log(level, message, error) {
    if (!CONFIG.logEnabled) return;
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const current = levels[CONFIG.logLevel] ?? 1;
    if ((levels[level] ?? 1) < current) return;
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'debug' ? '🔎' : '🍪';
    const extra = error ? ' ' + String(error.message || error) : '';
    console.log('[' + prefix + ' BOT V5 ' + new Date().toLocaleTimeString('pt-BR') + '] ' + message + extra);
  }

  // 03
  function safe(action, fallback, label) {
    try {
      return action();
    } catch (error) {
      state.stats.errors++;
      log('error', label || 'operação falhou', error);
      return fallback;
    }
  }

  // 04
  function formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    if (n >= 1e60) return n.toExponential(2);
    if (n >= 1e15) return (n / 1e15).toFixed(2) + ' quadrilhões';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + ' trilhões';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + ' bilhões';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + ' milhões';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + ' mil';
    return Math.floor(n).toString();
  }

  // 05
  function registerTimer(id) {
    if (id) state.timers.add(id);
    return id;
  }

  // 06
  function clearTimers() {
    if (state.clickTimer) {
      clearInterval(state.clickTimer);
      state.clickTimer = null;
    }
    state.timers.forEach(id => clearInterval(id));
    state.timers.clear();
    state.timeouts.forEach(id => clearTimeout(id));
    state.timeouts.clear();
  }

  // 07
  function registerTimeout(id) {
    if (id) state.timeouts.add(id);
    return id;
  }

  // 07
  function nightModeActive() {
    if (!CONFIG.nightMode) return false;
    const hour = new Date().getHours();
    return hour >= CONFIG.nightStart || hour < CONFIG.nightEnd;
  }

  // 08
  function isPaused() {
    return !state.active || state.paused || state.ascending;
  }

  // 09
  function hasBuff(name) {
    if (!gameReady() || !Game.buffs) return false;
    return Object.keys(Game.buffs).some(key => key.toLowerCase().includes(name.toLowerCase()));
  }

  // 10
  function clickInterval() {
    if (hasBuff('click frenzy')) return CONFIG.clickFrenzyMs;
    if (hasBuff('elder frenzy')) return CONFIG.clickElderMs;
    if (hasBuff('frenzy')) return CONFIG.clickFrenzyMs;
    return CONFIG.clickNormalMs;
  }

  // 11
  function startClicker() {
    if (!gameReady()) return;
    if (state.clickTimer) clearInterval(state.clickTimer);
    const delay = Math.max(1, clickInterval());
    state.lastClickMode = delay === CONFIG.clickNormalMs ? 'normal' : 'buff';
    state.clickTimer = setInterval(() => {
      if (isPaused() || nightModeActive()) return;
      safe(() => {
        Game.ClickCookie();
        state.stats.clicks++;
      }, null, 'clique principal falhou');
    }, delay);
  }

  // 12
  function stopClicker() {
    if (state.clickTimer) {
      clearInterval(state.clickTimer);
      state.clickTimer = null;
    }
  }

  // 13
  function shimmerAllowed(shimmer) {
    if (!shimmer) return false;
    const type = String(shimmer.type || '').toLowerCase();
    if (type.includes('reindeer')) return CONFIG.clickReindeer;
    if (type.includes('wrath')) return CONFIG.clickWrath;
    return CONFIG.clickGolden;
  }

  // 14
  function clickShimmers() {
    if (!gameReady() || isPaused() || !Array.isArray(Game.shimmers)) return;
    Game.shimmers.slice().forEach(shimmer => {
      if (!shimmerAllowed(shimmer)) return;
      safe(() => {
        if (typeof shimmer.pop === 'function' && shimmer.life > 0) {
          shimmer.pop();
          state.stats.shimmers++;
        }
      }, null, 'shimmer falhou');
    });
  }

  // 15
  function getBuildingPrice(building) {
    return safe(() => {
      if (building && typeof building.getPrice === 'function') return Number(building.getPrice());
      return Number(building?.price);
    }, Infinity, 'preço do edifício inválido');
  }

  // 16
  function getBuildingMarginalCps(building) {
    return safe(() => {
      const base = Number(building?.storedCps ?? building?.baseCps ?? 0);
      const mult = Number(Game.globalCpsMult ?? 1);
      const cps = base * mult;
      return Number.isFinite(cps) && cps > 0 ? cps : 0;
    }, 0, 'CpS marginal inválido');
  }

  // 17
  function canSpend(price) {
    if (!Number.isFinite(price) || price < 0) return false;
    const cookies = Number(Game.cookies || 0);
    return price + CONFIG.reserveCookies <= cookies * Math.max(0, Math.min(1, CONFIG.spendingLimit));
  }

  // 18
  function buyBestBuilding() {
    if (!gameReady() || isPaused()) return false;
    let best = null;
    let bestRoi = Infinity;
    (Game.ObjectsById || []).forEach(building => {
      if (!building || building.locked) return;
      const price = getBuildingPrice(building);
      const cps = getBuildingMarginalCps(building);
      if (!canSpend(price) || cps <= 0) return;
      const roi = price / cps;
      if (roi < bestRoi) {
        bestRoi = roi;
        best = building;
      }
    });
    if (!best) return false;
    return safe(() => {
      const price = getBuildingPrice(best);
      best.buy(1);
      state.stats.buildings++;
      state.stats.purchases++;
      state.lastAction = 'building:' + best.name;
      log('debug', '🏗️ ' + best.name + ' comprado por ' + formatNumber(price));
      return true;
    }, false, 'compra de edifício falhou');
  }

  // 19
  function buyStoreUpgrades() {
    if (!gameReady() || isPaused() || !Array.isArray(Game.UpgradesInStore)) return 0;
    let bought = 0;
    Game.UpgradesInStore.slice().forEach(upgrade => {
      const price = safe(() => Number(upgrade.getPrice()), Infinity, 'preço de upgrade inválido');
      if (!canSpend(price)) return;
      safe(() => {
        if (typeof upgrade.buy === 'function' && !upgrade.bought) {
          upgrade.buy(1);
          bought++;
          state.stats.upgrades++;
          state.stats.purchases++;
          state.lastAction = 'upgrade:' + upgrade.name;
        }
      }, null, 'compra de upgrade falhou');
    });
    return bought;
  }

  // 20
  function purchaseCycle() {
    if (!gameReady() || isPaused()) return;
    buyStoreUpgrades();
    buyBestBuilding();
  }

  // 21
  function prestigeGain() {
    if (!gameReady() || typeof Game.HowMuchPrestige !== 'function') return 0;
    return safe(() => {
      const total = Math.max(0, Number(Game.cookiesReset || 0) + Number(Game.cookiesEarned || 0));
      const current = Math.max(0, Number(Game.prestige || 0));
      const potential = Math.max(0, Number(Game.HowMuchPrestige(total)));
      return Math.max(0, Math.floor(potential - current));
    }, 0, 'cálculo de prestígio falhou');
  }

  // 22
  function shouldAscend() {
    return CONFIG.autoAscend && !state.ascending && prestigeGain() >= Math.max(0, CONFIG.prestigeThreshold);
  }

  // 23
  function buyHeavenlyUpgrades() {
    if (!gameReady() || !CONFIG.buyHeavenlyUpgrades) return 0;
    let bought = 0;
    Object.keys(Game.Upgrades || {}).forEach(name => {
      const upgrade = Game.Upgrades[name];
      if (!upgrade || upgrade.bought || upgrade.pool !== 'prestige') return;
      safe(() => {
        if (typeof upgrade.canBuy === 'function' && upgrade.canBuy()) {
          upgrade.buy();
          bought++;
          state.stats.heavenlyUpgrades++;
        }
      }, null, 'upgrade celestial falhou: ' + name);
    });
    return bought;
  }

  // 24
  function performAscension() {
    if (!gameReady() || state.ascending || !shouldAscend()) return false;
    state.ascending = true;
    stopClicker();
    const gain = prestigeGain();
    log('info', '🚀 Ascendendo com +' + formatNumber(gain) + ' prestígio');
    return safe(() => {
      if (typeof Game.Ascend !== 'function') {
        state.ascending = false;
        return false;
      }
      Game.Ascend(1);
      state.stats.ascensions++;
      state.lastPrestige = gain;
      registerTimeout(setTimeout(() => {
        buyHeavenlyUpgrades();
        if (CONFIG.autoReincarnate && typeof Game.Reincarnate === 'function') {
          registerTimeout(setTimeout(() => {
            safe(() => {
              Game.Reincarnate(1);
              state.stats.reincarnations++;
              state.ascending = false;
              startClicker();
              log('info', '♻️ Reencarnação concluída.');
            }, null, 'reencarnação falhou');
          }, CONFIG.postAscensionDelayMs));
        } else {
          state.ascending = false;
          startClicker();
        }
      }, CONFIG.postAscensionDelayMs));
      return true;
    }, false, 'ascensão falhou');
  }

  // 25
  function countWrinklers() {
    if (!gameReady() || !Array.isArray(Game.wrinklers)) return 0;
    return Game.wrinklers.filter(w => w && w.phase > 0 && Number(w.sucked || 0) > 0).length;
  }

  // 26
  function manageWrinklers() {
    if (!gameReady() || !CONFIG.popWrinklers || isPaused()) return;
    const active = (Game.wrinklers || []).filter(w => w && w.phase > 0 && Number(w.sucked || 0) > 0);
    const keep = Math.max(0, Math.floor(CONFIG.wrinklersToKeep));
    const toPop = Math.max(0, active.length - keep);
    if (!toPop) return;
    active.slice(0, toPop).forEach(w => safe(() => {
      if (typeof w.hp !== 'undefined' && w.hp <= 0) return;
      if (typeof w.click === 'function') {
        w.click();
        state.stats.wrinklers++;
      } else if (typeof w.hp !== 'undefined') {
        w.hp = 0;
      }
    }, null, 'wrinkler falhou'));
  }

  // 27
  function castGrimoire() {
    if (!gameReady() || !CONFIG.useGrimoire || isPaused()) return false;
    const tower = Game.Objects?.['Wizard tower'];
    const minigame = tower?.minigame;
    if (!minigame || typeof minigame.castSpell !== 'function') return false;
    const requested = String(CONFIG.grimoireSpell || '').toLowerCase();
    const spell = minigame.spells?.[CONFIG.grimoireSpell]
      || minigame.spellsByName?.[CONFIG.grimoireSpell]
      || Object.values(minigame.spells || {}).find(s => String(s.name || '').toLowerCase() === requested)
      || Object.values(minigame.spellsByName || {}).find(s => String(s.name || '').toLowerCase() === requested);
    if (!spell) return false;
    const magic = Number(minigame.magic || 0);
    const cost = Number(spell.costMin || spell.cost || 0);
    if (magic < cost) return false;
    return safe(() => {
      minigame.castSpell(spell);
      state.stats.spells++;
      return true;
    }, false, 'grimório falhou');
  }

  // 28
  function harvestGarden() {
    if (!gameReady() || !CONFIG.manageGarden || isPaused()) return 0;
    const farm = Game.Objects?.Farm?.minigame;
    if (!farm || !Array.isArray(farm.plot)) return 0;
    let count = 0;
    if (typeof farm.getTile === 'function' && typeof farm.harvest === 'function') {
      const rows = farm.plot.length;
      const cols = Array.isArray(farm.plot[0]) ? farm.plot[0].length : 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tile = safe(() => farm.getTile(x, y), null, 'leitura de célula do jardim falhou');
          if (!tile || tile[0] <= 0) continue;
          const plant = farm.plantsById?.[tile[0] - 1];
          if (plant && Number(tile[1] || 0) >= Number(plant.mature || 100)) {
            safe(() => { farm.harvest(x, y); count++; state.stats.gardenHarvests++; }, null, 'colheita falhou');
          }
        }
      }
      return count;
    }
    farm.plot.forEach(cell => {
      const id = Array.isArray(cell) ? cell[0] : -1;
      const age = Array.isArray(cell) ? Number(cell[1] || 0) : 0;
      const plant = farm.plantsById?.[id];
      if (plant && age >= Number(plant.mature || 100) && typeof farm.harvest === 'function') {
        safe(() => { farm.harvest(cell); count++; state.stats.gardenHarvests++; }, null, 'colheita falhou');
      }
    });
    return count;
  }

  // 29
  function plantGarden() {
    if (!gameReady() || !CONFIG.manageGarden || isPaused()) return 0;
    const farm = Game.Objects?.Farm?.minigame;
    if (!farm || !Array.isArray(farm.plot) || typeof farm.useTool !== 'function') return 0;
    const plant = farm.plantsByName?.[CONFIG.favoriteSeed] || farm.plants?.[CONFIG.favoriteSeed];
    if (!plant) return 0;
    let count = 0;
    if (typeof farm.getTile === 'function') {
      const rows = farm.plot.length;
      const cols = Array.isArray(farm.plot[0]) ? farm.plot[0].length : 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tile = safe(() => farm.getTile(x, y), null, 'leitura de célula do jardim falhou');
          if (!tile || tile[0] !== 0) continue;
          safe(() => { farm.useTool(plant.id + 1, x, y); count++; state.stats.gardenPlants++; }, null, 'plantio falhou');
        }
      }
      return count;
    }
    farm.plot.forEach((cell, index) => {
      const id = Array.isArray(cell) ? cell[0] : -1;
      if (id < 0) safe(() => { farm.useTool(index, plant.id); count++; state.stats.gardenPlants++; }, null, 'plantio falhou');
    });
    return count;
  }

  // 30
  function gardenCycle() {
    harvestGarden();
    plantGarden();
  }

  // 31
  function manageMarket() {
    if (!gameReady() || !CONFIG.manageMarket || isPaused()) return;
    const bank = Game.Objects?.Bank?.minigame;
    if (!bank) return;
    const goods = bank.goodsById || bank.goods || [];
    goods.forEach(good => {
      const price = Number(good.val || 0);
      const base = Number(good.basePrice || 0);
      const stock = Number(good.stock || 0);
      if (base <= 0) return;
      safe(() => {
        if (price >= base * 1.5 && stock > 0 && typeof bank.sellGood === 'function') {
          bank.sellGood(good.id, stock);
          state.stats.marketSells += stock;
        } else if (price <= base * 0.75 && typeof bank.buyGood === 'function') {
          bank.buyGood(good.id, 1);
          state.stats.marketBuys++;
        }
      }, null, 'mercado falhou');
    });
  }

  // 32
  function managePantheon() {
    if (!gameReady() || !CONFIG.managePantheon || isPaused()) return;
    const temple = Game.Objects?.Temple?.minigame;
    if (!temple || typeof temple.slotGod !== 'function') return;
    const gods = temple.gods || {};
    const preferred = Object.values(gods).find(g => /mokalsium/i.test(g.name || ''));
    if (preferred) safe(() => {
      try {
        temple.slotGod(preferred, 0);
      } catch (firstError) {
        temple.slotGod(0, preferred.id);
      }
    }, null, 'panteão falhou');
  }

  // 33
  function manageDragon() {
    if (!gameReady() || !CONFIG.manageDragon || isPaused()) return;
    if (!Game.specialTab || !Game.specialTab.click) return;
    const dragon = Number(Game.dragonLevel || 0);
    if (dragon < 5 || typeof Game.SetDragonAura !== 'function') return;
    const targetName = hasBuff('click frenzy') ? "Dragon's Fortune" : "Radiant Appetite";
    const auras = Game.dragonAuras || {};
    const target = Object.keys(auras).find(id => String(auras[id]?.name || '').toLowerCase() === targetName.toLowerCase());
    if (target == null) return;
    if (Number(Game.dragonAura) === Number(target)) return;
    safe(() => Game.SetDragonAura(Number(target), 0), null, 'aura do dragão falhou');
  }

  // 34
  function manageSeason() {
    if (!gameReady() || !CONFIG.manageSeasons || isPaused()) return;
    if (Game.season || typeof Game.startSeason !== 'function') return;
    for (const season of CONFIG.seasonPriority) {
      if (!season) continue;
      const started = safe(() => Game.startSeason(season), false, 'temporada falhou');
      if (started !== false) break;
    }
  }

  // 35
  function manageSugarLump() {
    if (!gameReady() || !CONFIG.manageSugarLumps || isPaused()) return;
    if (typeof Game.canLumps === 'function' && Game.canLumps() && Number(Game.lumpT || 0) > 0) {
      safe(() => {
        if (typeof Game.clickLump === 'function') Game.clickLump();
      }, null, 'sugar lump falhou');
    }
  }

  // 36
  function cookiesPerHour() {
    const elapsed = (Date.now() - state.startedAt) / 3600000;
    if (elapsed <= 0 || !gameReady()) return 0;
    return Math.max(0, (Number(Game.cookies || 0) - state.cookiesAtStart) / elapsed);
  }

  // 37
  function sessionSnapshot() {
    return {
      version: VERSION,
      active: state.active,
      paused: state.paused,
      cookies: Number(Game.cookies || 0),
      cps: Number(Game.cookiesPs || 0),
      prestige: Number(Game.prestige || 0),
      prestigeGain: prestigeGain(),
      wrinklers: countWrinklers(),
      cookiesPerHour: cookiesPerHour(),
      lastAction: state.lastAction,
      stats: { ...state.stats }
    };
  }

  // 38
  function showStatus() {
    if (!gameReady()) {
      console.warn('[🍪 BOT V5] Cookie Clicker ainda não está pronto.');
      return;
    }
    console.group('🍪 Cookie Clicker Bot V5 — Status');
    console.table(sessionSnapshot());
    console.table(state.stats);
    console.groupEnd();
  }

  // 39
  function resetStats() {
    Object.keys(state.stats).forEach(key => { state.stats[key] = 0; });
    state.cookiesAtStart = Number(typeof Game !== 'undefined' ? Game.cookies || 0 : 0);
    state.startedAt = Date.now();
    log('info', '♻️ Estatísticas resetadas.');
  }

  // 40
  function saveState() {
    safe(() => {
      localStorage.setItem(GLOBAL_KEY + ':stats', JSON.stringify(state.stats));
      localStorage.setItem(GLOBAL_KEY + ':startedAt', String(state.startedAt));
    }, null, 'persistência falhou');
  }

  // 41
  function loadState() {
    safe(() => {
      const raw = localStorage.getItem(GLOBAL_KEY + ':stats');
      if (raw) Object.assign(state.stats, JSON.parse(raw));
    }, null, 'carregamento de estado falhou');
  }

  // 42
  function handleKey(event) {
    if (!event.altKey) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      state.paused ? resume() : pause();
    }
    if (key === 's') {
      event.preventDefault();
      showStatus();
    }
  }

  // 43
  function start() {
    if (!gameReady()) {
      console.warn('[🍪 BOT V5] Aguarde o Cookie Clicker carregar.');
      return;
    }
    if (state.active) return;
    loadState();
    state.active = true;
    state.paused = false;
    state.ascending = false;
    state.startedAt = Date.now();
    state.cookiesAtStart = Number(Game.cookies || 0);
    state.lastCookies = state.cookiesAtStart;

    startClicker();
    registerTimer(setInterval(clickShimmers, CONFIG.shimmerScanMs));
    registerTimer(setInterval(purchaseCycle, CONFIG.purchaseScanMs));
    registerTimer(setInterval(manageWrinklers, CONFIG.wrinklerScanMs));
    registerTimer(setInterval(castGrimoire, CONFIG.grimoireScanMs));
    registerTimer(setInterval(gardenCycle, CONFIG.gardenScanMs));
    registerTimer(setInterval(manageMarket, CONFIG.marketScanMs));
    registerTimer(setInterval(managePantheon, CONFIG.pantheonScanMs));
    registerTimer(setInterval(manageDragon, CONFIG.dragonScanMs));
    registerTimer(setInterval(manageSeason, CONFIG.seasonScanMs));
    registerTimer(setInterval(manageSugarLump, CONFIG.sugarLumpScanMs));
    registerTimer(setInterval(() => {
      if (shouldAscend()) performAscension();
    }, CONFIG.prestigeScanMs));
    registerTimer(setInterval(() => {
      if (state.active && !state.paused && !state.ascending) {
        const desired = clickInterval();
        const mode = desired === CONFIG.clickNormalMs ? 'normal' : 'buff';
        if (mode !== state.lastClickMode) startClicker();
      }
    }, 1000));
    if (CONFIG.periodicStatus) registerTimer(setInterval(showStatus, CONFIG.statusScanMs));
    registerTimer(setInterval(saveState, 30000));

    window.addEventListener('keydown', handleKey);
    log('info', '🟢 V5 iniciado — 50+ funções disponíveis.');
  }

  // 44
  function stop() {
    clearTimers();
    window.removeEventListener('keydown', handleKey);
    saveState();
    state.active = false;
    state.paused = false;
    state.ascending = false;
    log('info', '🔴 V5 parado.');
  }

  // 45
  function pause() {
    if (!state.active) return;
    state.paused = true;
    stopClicker();
    log('info', '⏸️ V5 pausado.');
  }

  // 46
  function resume() {
    if (!state.active) return;
    state.paused = false;
    startClicker();
    log('info', '▶️ V5 retomado.');
  }

  // 47
  function emergencyStop() {
    clearTimers();
    stopClicker();
    state.active = false;
    state.paused = true;
    state.ascending = false;
    log('warn', '🛑 PARADA DE EMERGÊNCIA executada.');
  }

  // 48
  function diagnostics() {
    const gameExists = typeof Game !== 'undefined' && !!Game;
    const report = {
      gameReady: gameReady(),
      hasShimmers: gameExists && !!Game.shimmers,
      buildings: gameExists && Array.isArray(Game.ObjectsById) ? Game.ObjectsById.length : 0,
      upgrades: gameExists && Array.isArray(Game.UpgradesInStore) ? Game.UpgradesInStore.length : 0,
      wrinklers: gameExists && Array.isArray(Game.wrinklers) ? Game.wrinklers.length : 0,
      wizardTower: gameExists && !!Game.Objects?.['Wizard tower']?.minigame,
      farm: gameExists && !!Game.Objects?.Farm?.minigame,
      bank: gameExists && !!Game.Objects?.Bank?.minigame,
      temple: gameExists && !!Game.Objects?.Temple?.minigame,
      dragonLevel: gameExists ? Number(Game.dragonLevel || 0) : 0
    };
    console.table(report);
    return report;
  }

  // 49
  function config(nextConfig) {
    if (!nextConfig || typeof nextConfig !== 'object') return { ...CONFIG };
    Object.assign(CONFIG, nextConfig);
    if (state.active) startClicker();
    log('info', '⚙️ Configuração atualizada.');
    return { ...CONFIG };
  }

  // 50
  function api() {
    return {
      version: VERSION,
      start, stop, pause, resume, emergencyStop,
      status: showStatus,
      diagnostics,
      resetStats,
      config,
      prestigeGain,
      clickShimmers,
      purchaseCycle,
      performAscension
    };
  }

  // 51 — proteção contra múltiplas instâncias
  if (window[GLOBAL_KEY]?.stop) {
    safe(() => window[GLOBAL_KEY].stop(), null, 'instância anterior não pôde ser parada');
  }

  window[GLOBAL_KEY] = api();
  window.CookieBotV5 = window[GLOBAL_KEY];

  console.log('%c🍪 Cookie Clicker Bot V5.2.0 carregado', 'font-weight:bold;font-size:14px');
  console.log('Comandos: CookieBotV5.status(), .diagnostics(), .pause(), .resume(), .stop(), .emergencyStop(), .config({...})');
  CookieBotV5.start();
})();
