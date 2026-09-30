// ============================================================
// 🍪 COOKIE CLICKER BOT — V5 ULTIMATE
// 50+ funções, núcleo seguro e automação modular
// Uso: Cookie Clicker Web -> F12 -> Console -> cole o arquivo
// ============================================================

(() => {
  'use strict';

  const VERSION = '5.5.0';
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

    economyEnabled: true,
    reserveCookiesRatio: 0.10,
    purchaseScoreThreshold: 0,
    targetPaybackSeconds: 3600,
    buffAggressionMultiplier: 1.35,
    upgradeValueWeight: 1.20,
    buildingValueWeight: 1.00,
    reportIntervalMs: 1800000,
    prestigeThreshold: 100,
    historyMaxEntries: 96,
    historyEnabled: true,

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
      errors: 0,
      economicDecisions: 0,
      reports: 0,
      economicNoops: 0
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
  function detectCapabilities() {
    const gameExists = typeof Game !== 'undefined' && !!Game;
    const objects = gameExists ? (Game.Objects || {}) : {};
    const wizard = objects['Wizard tower']?.minigame;
    const farm = objects.Farm?.minigame;
    const bank = objects.Bank?.minigame;
    const temple = objects.Temple?.minigame;

    const report = {
      shimmers: {
        supported: gameExists && Array.isArray(Game.shimmers),
        reason: gameExists && Array.isArray(Game.shimmers) ? 'Game.shimmers disponível' : 'Game.shimmers ausente'
      },
      purchases: {
        supported: gameExists && Array.isArray(Game.ObjectsById),
        reason: gameExists && Array.isArray(Game.ObjectsById) ? 'Game.ObjectsById disponível' : 'lista de edifícios ausente'
      },
      upgrades: {
        supported: gameExists && Array.isArray(Game.UpgradesInStore),
        reason: gameExists && Array.isArray(Game.UpgradesInStore) ? 'Game.UpgradesInStore disponível' : 'lista de upgrades ausente'
      },
      prestige: {
        supported: gameExists && typeof Game.HowMuchPrestige === 'function',
        reason: gameExists && typeof Game.HowMuchPrestige === 'function' ? 'HowMuchPrestige disponível' : 'HowMuchPrestige ausente'
      },
      ascension: {
        supported: gameExists && typeof Game.Ascend === 'function',
        reason: gameExists && typeof Game.Ascend === 'function' ? 'Game.Ascend disponível' : 'Game.Ascend ausente'
      },
      wrinklers: {
        supported: gameExists && Array.isArray(Game.wrinklers),
        reason: gameExists && Array.isArray(Game.wrinklers) ? 'Game.wrinklers disponível' : 'Game.wrinklers ausente'
      },
      grimoire: {
        supported: !!wizard && typeof wizard.castSpell === 'function',
        reason: !wizard ? 'Wizard tower/minigame ausente' : typeof wizard.castSpell === 'function' ? 'castSpell disponível' : 'castSpell ausente'
      },
      garden: {
        supported: !!farm && Array.isArray(farm.plot) && typeof farm.useTool === 'function',
        reason: !farm ? 'Farm/minigame ausente' : !Array.isArray(farm.plot) ? 'farm.plot ausente' : typeof farm.useTool !== 'function' ? 'farm.useTool ausente' : 'API básica do Garden disponível'
      },
      market: {
        supported: !!bank && !!(bank.goodsById || bank.goods) && (typeof bank.buyGood === 'function' || typeof bank.sellGood === 'function'),
        reason: !bank ? 'Bank/minigame ausente' : !(bank.goodsById || bank.goods) ? 'lista de goods ausente' : 'API básica do Market disponível'
      },
      pantheon: {
        supported: !!temple && typeof temple.slotGod === 'function',
        reason: !temple ? 'Temple/minigame ausente' : typeof temple.slotGod === 'function' ? 'slotGod disponível' : 'slotGod ausente'
      },
      dragon: {
        supported: gameExists && Number(Game.dragonLevel || 0) >= 5 && typeof Game.SetDragonAura === 'function' && !!Game.dragonAuras,
        reason: !gameExists ? 'Game ausente' : Number(Game.dragonLevel || 0) < 5 ? 'nível do dragão abaixo de 5' : typeof Game.SetDragonAura !== 'function' ? 'SetDragonAura ausente' : !Game.dragonAuras ? 'dragonAuras ausente' : 'API de aura disponível'
      },
      seasons: {
        supported: gameExists && typeof Game.startSeason === 'function',
        reason: gameExists && typeof Game.startSeason === 'function' ? 'startSeason disponível' : 'startSeason ausente'
      },
      sugarLumps: {
        supported: gameExists && (typeof Game.canLumps === 'function' || typeof Game.clickLump === 'function'),
        reason: !gameExists ? 'Game ausente' : typeof Game.canLumps === 'function' || typeof Game.clickLump === 'function' ? 'API de sugar lumps disponível' : 'API de sugar lumps ausente'
      }
    };

    return report;
  }

  // 11
  function capability(name) {
    return !!detectCapabilities()[name]?.supported;
  }

  // 12
  function clickInterval() {
    if (hasBuff('click frenzy')) return CONFIG.clickFrenzyMs;
    if (hasBuff('elder frenzy')) return CONFIG.clickElderMs;
    if (hasBuff('frenzy')) return CONFIG.clickFrenzyMs;
    return CONFIG.clickNormalMs;
  }

  // 13
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

  // 14
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

  // 16
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

  // 20
  function effectiveCookieReserve() {
    const cookies = Number(Game.cookies || 0);
    const ratio = Math.max(0, Math.min(0.95, Number(CONFIG.reserveCookiesRatio || 0)));
    return Math.max(Number(CONFIG.reserveCookies || 0), cookies * ratio);
  }

  // 21
  function economicBudget() {
    const cookies = Math.max(0, Number(Game.cookies || 0));
    const reserve = Math.min(cookies, effectiveCookieReserve());
    const limitRatio = Math.max(0, Math.min(1, Number(CONFIG.spendingLimit ?? 1)));
    const limitBudget = cookies * limitRatio;
    return Math.max(0, Math.min(cookies - reserve, limitBudget));
  }

  // 22
  function economicEfficiency(price, value, payback) {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(value) || value <= 0) return -Infinity;
    const target = Math.max(1, Number(CONFIG.targetPaybackSeconds || 3600));
    const paybackFactor = Math.min(3, Math.max(0.05, target / Math.max(1, payback)));
    return (value / price) * paybackFactor;
  }

  // 21
  function economicScoreBuilding(building) {
    if (!building) return -Infinity;
    const price = getBuildingPrice(building);
    const cps = getBuildingMarginalCps(building);
    if (!Number.isFinite(price) || price <= 0 || cps <= 0) return -Infinity;
    const payback = price / cps;
    const cookies = Number(Game.cookies || 0);
    const reserve = effectiveCookieReserve();
    if (price > economicBudget() || cookies - price < reserve) return -Infinity;
    const affordability = Math.max(0, Math.min(1, economicBudget() / price));
    const buff = hasBuff('click frenzy') || hasBuff('elder frenzy') || hasBuff('frenzy')
      ? Math.max(1, Number(CONFIG.buffAggressionMultiplier || 1)) : 1;
    const value = cps * Number(CONFIG.buildingValueWeight || 1) * buff;
    return economicEfficiency(price, value, payback) * affordability;
  }

  // 22
  function economicScoreUpgrade(upgrade) {
    if (!upgrade || upgrade.bought) return -Infinity;
    const price = safe(() => Number(upgrade.getPrice()), Infinity, 'preço de upgrade inválido');
    const cookies = Number(Game.cookies || 0);
    const reserve = effectiveCookieReserve();
    if (!Number.isFinite(price) || price <= 0 || cookies - price < reserve) return -Infinity;
    let value = 1;
    const desc = String(upgrade.desc || upgrade.name || '').toLowerCase();
    if (desc.includes('cookies per second') || desc.includes('cps') || desc.includes('cookie')) value += 1;
    if (desc.includes('click')) value += 0.5;
    if (hasBuff('click frenzy') && desc.includes('click')) value *= Number(CONFIG.buffAggressionMultiplier || 1);
    const affordability = Math.max(0, Math.min(1, economicBudget() / price));
    const estimatedGain = Math.max(0.000001, value * Number(CONFIG.upgradeValueWeight || 1));
    const estimatedPayback = Math.max(1, price / estimatedGain);
    return economicEfficiency(price, estimatedGain, estimatedPayback) * affordability;
  }

  // 23
  function chooseEconomicAction() {
    if (economicBudget() <= 0) return null;
    if (!gameReady() || isPaused() || !CONFIG.economyEnabled) return null;
    const candidates = [];
    (Game.UpgradesInStore || []).forEach(upgrade => {
      const score = economicScoreUpgrade(upgrade);
      if (Number.isFinite(score)) candidates.push({ type: 'upgrade', target: upgrade, score });
    });
    (Game.ObjectsById || []).forEach(building => {
      if (!building || building.locked) return;
      const score = economicScoreBuilding(building);
      if (Number.isFinite(score)) candidates.push({ type: 'building', target: building, score });
    });
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0] || null;
    return best && best.score >= Number(CONFIG.purchaseScoreThreshold || 0) ? best : null;
  }

  // 24
  function executeEconomicAction() {
    const choice = chooseEconomicAction();
    if (!choice) {
      state.stats.economicNoops++;
      return false;
    }
    return safe(() => {
      if (choice.type === 'upgrade') {
        if (typeof choice.target.buy !== 'function' || choice.target.bought) return false;
        choice.target.buy(1);
        state.stats.upgrades++;
        state.stats.purchases++;
        state.stats.economicDecisions++;
        state.lastAction = 'economy:upgrade:' + choice.target.name;
        return true;
      }
      if (typeof choice.target.buy !== 'function') return false;
      choice.target.buy(1);
      state.stats.buildings++;
      state.stats.purchases++;
      state.stats.economicDecisions++;
      state.lastAction = 'economy:building:' + choice.target.name;
      return true;
    }, false, 'decisão econômica falhou');
  }

  // 25
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

  // 21
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

  // 31
  function purchaseCycle() {
    if (!gameReady() || isPaused()) return;
    if (CONFIG.economyEnabled) {
      executeEconomicAction();
      return;
    }
    buyStoreUpgrades();
    buyBestBuilding();
  }

  // 23
  function prestigeGain() {
    if (!gameReady() || typeof Game.HowMuchPrestige !== 'function') return 0;
    return safe(() => {
      const total = Math.max(0, Number(Game.cookiesReset || 0) + Number(Game.cookiesEarned || 0));
      const current = Math.max(0, Number(Game.prestige || 0));
      const potential = Math.max(0, Number(Game.HowMuchPrestige(total)));
      return Math.max(0, Math.floor(potential - current));
    }, 0, 'cálculo de prestígio falhou');
  }

  // 24
  function shouldAscend() {
    return CONFIG.autoAscend && !state.ascending && prestigeGain() >= Math.max(0, CONFIG.prestigeThreshold);
  }

  // 25
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

  // 26
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

  // 27
  function countWrinklers() {
    if (!gameReady() || !Array.isArray(Game.wrinklers)) return 0;
    return Game.wrinklers.filter(w => w && w.phase > 0 && Number(w.sucked || 0) > 0).length;
  }

  // 28
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

  // 29
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

  // 30
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

  // 31
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

  // 32
  function gardenCycle() {
    harvestGarden();
    plantGarden();
  }

  // 33
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

  // 34
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

  // 35
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

  // 36
  function manageSeason() {
    if (!gameReady() || !CONFIG.manageSeasons || isPaused()) return;
    if (Game.season || typeof Game.startSeason !== 'function') return;
    for (const season of CONFIG.seasonPriority) {
      if (!season) continue;
      const started = safe(() => Game.startSeason(season), false, 'temporada falhou');
      if (started !== false) break;
    }
  }

  // 37
  function manageSugarLump() {
    if (!gameReady() || !CONFIG.manageSugarLumps || isPaused()) return;
    if (typeof Game.canLumps === 'function' && Game.canLumps() && Number(Game.lumpT || 0) > 0) {
      safe(() => {
        if (typeof Game.clickLump === 'function') Game.clickLump();
      }, null, 'sugar lump falhou');
    }
  }

  // 38
  function cookiesPerHour() {
    const elapsed = (Date.now() - state.startedAt) / 3600000;
    if (elapsed <= 0 || !gameReady()) return 0;
    return Math.max(0, (Number(Game.cookies || 0) - state.cookiesAtStart) / elapsed);
  }

  // 39
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

  // 40
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

  // 41
  function resetStats() {
    Object.keys(state.stats).forEach(key => { state.stats[key] = 0; });
    state.cookiesAtStart = Number(typeof Game !== 'undefined' ? Game.cookies || 0 : 0);
    state.startedAt = Date.now();
    log('info', '♻️ Estatísticas resetadas.');
  }

  // 42
  function saveState() {
    safe(() => {
      localStorage.setItem(GLOBAL_KEY + ':stats', JSON.stringify(state.stats));
      localStorage.setItem(GLOBAL_KEY + ':startedAt', String(state.startedAt));
    }, null, 'persistência falhou');
  }

  // 43
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

  // 45
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
    if (capability('shimmers')) registerTimer(setInterval(clickShimmers, CONFIG.shimmerScanMs));
    if (capability('purchases')) registerTimer(setInterval(purchaseCycle, CONFIG.purchaseScanMs));
    if (capability('wrinklers')) registerTimer(setInterval(manageWrinklers, CONFIG.wrinklerScanMs));
    if (capability('grimoire')) registerTimer(setInterval(castGrimoire, CONFIG.grimoireScanMs));
    if (capability('garden')) registerTimer(setInterval(gardenCycle, CONFIG.gardenScanMs));
    if (capability('market')) registerTimer(setInterval(manageMarket, CONFIG.marketScanMs));
    if (capability('pantheon')) registerTimer(setInterval(managePantheon, CONFIG.pantheonScanMs));
    if (capability('dragon')) registerTimer(setInterval(manageDragon, CONFIG.dragonScanMs));
    if (capability('seasons')) registerTimer(setInterval(manageSeason, CONFIG.seasonScanMs));
    if (capability('sugarLumps')) registerTimer(setInterval(manageSugarLump, CONFIG.sugarLumpScanMs));
    if (capability('prestige')) registerTimer(setInterval(() => {
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
    registerTimer(setInterval(periodicReport, CONFIG.reportIntervalMs));
    registerTimer(setInterval(saveState, 30000));

    window.addEventListener('keydown', handleKey);
    log('info', '🟢 V5 iniciado — 50+ funções disponíveis.');
  }

  // 46
  function stop() {
    clearTimers();
    window.removeEventListener('keydown', handleKey);
    saveState();
    state.active = false;
    state.paused = false;
    state.ascending = false;
    log('info', '🔴 V5 parado.');
  }

  // 47
  function pause() {
    if (!state.active) return;
    state.paused = true;
    stopClicker();
    log('info', '⏸️ V5 pausado.');
  }

  // 48
  function resume() {
    if (!state.active) return;
    state.paused = false;
    startClicker();
    log('info', '▶️ V5 retomado.');
  }

  // 49
  function emergencyStop() {
    clearTimers();
    stopClicker();
    state.active = false;
    state.paused = true;
    state.ascending = false;
    log('warn', '🛑 PARADA DE EMERGÊNCIA executada.');
  }

  // 57
  function economicReport() {
    if (!gameReady()) return null;
    const choice = chooseEconomicAction();
    const report = {
      generatedAt: new Date().toISOString(),
      cookies: Number(Game.cookies || 0),
      cps: Number(Game.cookiesPs || 0),
      reserve: effectiveCookieReserve(),
      spendingLimit: CONFIG.spendingLimit,
      reserveRatio: CONFIG.reserveCookiesRatio,
      economyEnabled: CONFIG.economyEnabled,
      buffActive: hasBuff('frenzy') || hasBuff('click frenzy') || hasBuff('elder frenzy'),
      recommendedAction: choice ? { type: choice.type, name: choice.target?.name || 'desconhecido', score: choice.score } : null,
      decisions: state.stats.economicDecisions
    };
    console.group('🧠 Cookie Bot V5.4 — Relatório Econômico');
    console.table(report);
    console.groupEnd();
    return report;
  }

  // 58
  function historyKey() {
    return GLOBAL_KEY + ':history';
  }

  // 59
  function loadHistory() {
    if (!CONFIG.historyEnabled) return [];
    return safe(() => {
      const raw = localStorage.getItem(historyKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }, [], 'histórico inválido');
  }

  // 60
  function saveHistory(entry) {
    if (!CONFIG.historyEnabled) return;
    safe(() => {
      const history = loadHistory();
      history.push(entry);
      const max = Math.max(1, Math.floor(Number(CONFIG.historyMaxEntries || 96)));
      localStorage.setItem(historyKey(), JSON.stringify(history.slice(-max)));
    }, null, 'gravação do histórico falhou');
  }

  // 61
  function performanceHistory() {
    return loadHistory();
  }

  // 62
  function clearHistory() {
    safe(() => localStorage.removeItem(historyKey()), null, 'limpeza do histórico falhou');
    return true;
  }

  // 63
  function periodicReport() {
    if (!state.active || state.paused) return;
    state.stats.reports++;
    const snapshot = sessionSnapshot();
    const economy = economicReport();
    const previous = loadHistory().at(-1) || null;
    const reportEntry = {
      generatedAt: new Date().toISOString(),
      cookies: snapshot.cookies,
      cps: snapshot.cps,
      cookiesPerHour: snapshot.cookiesPerHour,
      purchases: state.stats.purchases,
      economicDecisions: state.stats.economicDecisions,
      economicNoops: state.stats.economicNoops,
      ascensions: state.stats.ascensions,
      errors: state.stats.errors,
      lastAction: state.lastAction || 'nenhuma',
      deltaCookies: previous ? snapshot.cookies - previous.cookies : 0,
      deltaCps: previous ? snapshot.cps - previous.cps : 0
    };
    saveHistory(reportEntry);
    console.group('🍪 Cookie Clicker Bot V5.4 — Relatório de 30 minutos');
    console.table({
      versão: VERSION,
      cookies: snapshot?.cookies ?? Number(Game.cookies || 0),
      cps: snapshot?.cps ?? Number(Game.cookiesPs || 0),
      compras: state.stats.purchases,
      decisõesEconômicas: state.stats.economicDecisions,
      ascensões: state.stats.ascensions,
      prestígioDisponível: prestigeGain(),
      erros: state.stats.errors,
      últimaAção: state.lastAction || 'nenhuma',
      variaçãoCookies: reportEntry.deltaCookies,
      variaçãoCpS: reportEntry.deltaCps
    });
    console.log('Relatório econômico:', economy);
    console.groupEnd();
  }

  // 64
  function diagnostics() {
    const gameExists = typeof Game !== 'undefined' && !!Game;
    const capabilities = detectCapabilities();
    const report = {
      version: VERSION,
      gameReady: gameReady(),
      active: state.active,
      paused: state.paused,
      game: {
        cookies: gameExists ? Number(Game.cookies || 0) : 0,
        cps: gameExists ? Number(Game.cookiesPs || 0) : 0,
        prestige: gameExists ? Number(Game.prestige || 0) : 0,
        buildings: gameExists && Array.isArray(Game.ObjectsById) ? Game.ObjectsById.length : 0,
        upgrades: gameExists && Array.isArray(Game.UpgradesInStore) ? Game.UpgradesInStore.length : 0,
        wrinklers: gameExists && Array.isArray(Game.wrinklers) ? Game.wrinklers.length : 0,
        dragonLevel: gameExists ? Number(Game.dragonLevel || 0) : 0
      },
      capabilities
    };
    console.group('🍪 Cookie Clicker Bot V5 — Diagnóstico');
    console.table(Object.fromEntries(Object.entries(capabilities).map(([name, item]) => [name, item.supported ? 'OK' : 'INDISPONÍVEL'])));
    console.log(report);
    console.groupEnd();
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

  // 66
  function api() {
    return {
      version: VERSION,
      start, stop, pause, resume, emergencyStop,
      status: showStatus,
      diagnostics,
      economicReport,
      periodicReport,
      performanceHistory,
      clearHistory,
      capabilities: detectCapabilities,
      capability,
      resetStats,
      config,
      prestigeGain,
      clickShimmers,
      purchaseCycle,
      performAscension
    };
  }

  // 67 — proteção contra múltiplas instâncias
  if (window[GLOBAL_KEY]?.stop) {
    safe(() => window[GLOBAL_KEY].stop(), null, 'instância anterior não pôde ser parada');
  }

  window[GLOBAL_KEY] = api();
  window.CookieBotV5 = window[GLOBAL_KEY];

  console.log('%c🍪 Cookie Clicker Bot V' + VERSION + ' carregado', 'font-weight:bold;font-size:14px');
  console.log('Comandos: CookieBotV5.status(), .diagnostics(), .pause(), .resume(), .stop(), .emergencyStop(), .config({...})');
  CookieBotV5.start();
})();
