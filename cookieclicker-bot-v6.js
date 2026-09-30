// ============================================================
// 🍪 COOKIE CLICKER BOT — V6 STABLE
// Runtime-first rewrite: núcleo pequeno, compatível e observável.
// Uso: Cookie Clicker Web -> F12 -> Console -> cole o arquivo inteiro.
// ============================================================

(() => {
  'use strict';

  const VERSION = '6.11.0';
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
    autoReincarnate: false,
    buyHeavenlyUpgrades: true,
    prestigeThreshold: 100,
    postAscensionDelayMs: 4000,
    ascensionMinGainRatio: 0.05,
    ascensionMaxRecoverySeconds: 21600,
    ascensionRecoverySafetyFactor: 3,

    // Estourar wrinklers por padrão também fica desligado.
    popWrinklers: false,
    wrinklersToKeep: 0,

    spendingLimit: 0.75,
    reserveCookies: 0,
    reserveCookiesRatio: 0.10,
    economyEnabled: true,
    targetPaybackSeconds: 3600,
    upgradeValueWeight: 1.2,
    buildingValueWeight: 1,
    historyEnabled: true,
    historyMaxEntries: 96,
    healthEnabled: true,
    healthHistoryMaxEntries: 96,

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
    schedulerIntervalMs: 1000,
    watchdogIntervalMs: 10000,
    watchdogGraceMs: 15000,


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
    schedulerTimer: null,
    watchdogTimer: null,
    schedulerTasks: new Map(),
    taskLastRun: new Map(),
    taskFailures: new Map(),
    taskRunCount: new Map(),
    taskDurationMs: new Map(),
    taskLastSuccess: new Map(),
    taskHealth: new Map(),
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

  function effectiveCookieReserve() {
    const bank = cookies();
    const ratio = Math.max(0, Math.min(1, Number(CONFIG.reserveCookiesRatio || 0)));
    return Math.max(0, Number(CONFIG.reserveCookies || 0), bank * ratio);
  }

  function economicBudget() {
    const bank = cookies();
    const limit = Math.max(0, Math.min(1, Number(CONFIG.spendingLimit)));
    return Math.max(0, bank * limit - effectiveCookieReserve());
  }

  function economicEfficiency(price, value, payback) {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(value) || value <= 0) return 0;
    const normalizedPayback = Number.isFinite(payback) && payback > 0 ? payback : CONFIG.targetPaybackSeconds;
    const target = Math.max(1, Number(CONFIG.targetPaybackSeconds) || 3600);
    return (value / price) * Math.min(2, target / Math.max(1, normalizedPayback));
  }

  function economicScoreBuilding(building) {
    const price = getBuildingPrice(building);
    const value = getBuildingCps(building);
    if (!Number.isFinite(price) || price <= 0 || value <= 0 || price > economicBudget()) return 0;
    const payback = price / value;
    return economicEfficiency(price, value, payback) * Number(CONFIG.buildingValueWeight || 1);
  }

  function economicScoreUpgrade(upgrade) {
    if (!upgrade || upgrade.bought || typeof upgrade.buy !== 'function') return 0;
    const price = safe(() => Number(upgrade.getPrice()), Infinity, 'preço de upgrade inválido');
    if (!Number.isFinite(price) || price <= 0 || price > economicBudget()) return 0;

    const profile = upgradeStatProfile(upgrade);
    const value = Math.max(0.000001, Number(profile?.utilityScore || 0));
    const payback = price / value;
    const affordability = Math.max(0, Math.min(1, economicBudget() / price));

    return economicEfficiency(price, value, payback) *
      Number(CONFIG.upgradeValueWeight || 1) *
      affordability;
  }

  function chooseEconomicAction() {
    if (!gameReady()) return null;

    const upgrades = Array.isArray(Game.UpgradesInStore)
      ? Game.UpgradesInStore.filter(u => u && !u.bought).map(u => ({
          type: 'upgrade', item: u, score: economicScoreUpgrade(u)
        })).filter(x => x.score > 0)
      : [];

    const buildings = Array.isArray(Game.ObjectsById)
      ? Game.ObjectsById.filter(b => b && !b.locked).map(b => ({
          type: 'building', item: b, score: economicScoreBuilding(b)
        })).filter(x => x.score > 0)
      : [];

    return upgrades.concat(buildings).sort((a, b) => b.score - a.score)[0] || null;
  }

  function executeEconomicAction(action) {
    if (!action || isPaused()) return false;
    return safe(() => {
      action.item.buy(1);
      if (action.type === 'upgrade') {
        state.stats.upgrades++;
        state.lastAction = 'upgrade:economia:' + String(action.item.name || action.item.id);
      } else {
        state.stats.buildings++;
        state.lastAction = 'building:economia:' + String(action.item.name || action.item.id);
      }
      state.stats.economicDecisions++;
      return true;
    }, false, 'decisão econômica falhou');
  }

  function economicReport() {
    const data = {
      generatedAt: new Date().toISOString(),
      cookies: cookies(),
      cps: cps(),
      budget: economicBudget(),
      economicDecisions: state.stats.economicDecisions,
      economicNoops: state.stats.economicNoops,
      lastAction: state.lastAction
    };
    saveHistory(data);
    console.group('🍪 CookieBot V6 — Economia');
    console.table(data);
    console.groupEnd();
    return data;
  }


  function grimoireMinigame() {
    const obj = Game && Game.ObjectsById && Game.ObjectsById[7];
    return obj && obj.minigame ? obj.minigame : null;
  }

  function grimoireSpellList(minigame) {
    if (!minigame) return [];
    if (Array.isArray(minigame.spells)) return minigame.spells;
    if (minigame.spellsByName && typeof minigame.spellsByName === 'object') {
      return Object.keys(minigame.spellsByName).map(k => minigame.spellsByName[k]);
    }
    return [];
  }

  function findGrimoireSpell(minigame) {
    const requested = String(CONFIG.grimoireSpell || '').trim().toLowerCase();
    const spells = grimoireSpellList(minigame);
    if (requested) {
      return spells.find(s => String(s.name || '').toLowerCase() === requested) ||
        spells.find(s => String(s.name || '').toLowerCase().includes(requested)) || null;
    }
    return spells.find(s => /frenzy|conjure|hand of fate/i.test(String(s.name || ''))) || spells[0] || null;
  }

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


  function gardenMinigame() {
    const farm = Game && Game.ObjectsById && Game.ObjectsById[2];
    return farm && farm.minigame ? farm.minigame : null;
  }

  function gardenTiles(garden) {
    if (!garden) return [];
    if (Array.isArray(garden.plot)) return garden.plot;
    if (Array.isArray(garden.tiles)) return garden.tiles;
    return [];
  }

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

  function gardenCycle() {
    if (!CONFIG.gardenEnabled) return false;
    const harvested = harvestGarden();
    const planted = plantGarden();
    return harvested || planted;
  }


  function marketMinigame() {
    const bank = Game && Game.ObjectsById && Game.ObjectsById[5];
    return bank && bank.minigame ? bank.minigame : null;
  }

  function marketGoods(minigame) {
    if (!minigame) return [];
    const source = minigame.goodsById || minigame.goods;
    if (!source) return [];
    if (Array.isArray(source)) return source;
    return Object.keys(source).map(k => source[k]).filter(Boolean);
  }

  function marketPrice(good) {
    return Number(good && (good.val !== undefined ? good.val : good.price));
  }

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

  function ascensionAnalysis() {
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
    const threshold = Math.max(0, Number(CONFIG.prestigeThreshold) || 0);

    const enoughPrestige = gain >= threshold;
    const meaningfulGain = currentPrestige === 0 || gainRatio >= minGainRatio;
    const recoverable = recoverySeconds <= maxRecovery;
    const worthIt = enoughPrestige && meaningfulGain && recoverable;

    let reason = 'ascensão não compensa neste momento';
    if (!enoughPrestige) reason = 'ganho de prestígio abaixo do limite';
    else if (!meaningfulGain) reason = 'ganho percentual de prestígio pequeno';
    else if (!recoverable) reason = 'tempo estimado de recuperação muito alto';
    else reason = 'ganho permanente supera o custo estimado de recuperação';

    return {
      worthIt,
      reason,
      currentPrestige,
      potentialPrestige,
      gain,
      gainRatio,
      currentMultiplier,
      projectedMultiplier,
      multiplierGainPercent,
      recoverySeconds,
      estimatedPaybackSeconds
    };
  }

  function upgradeStatProfile(upgrade) {
    if (!upgrade) return null;

    const desc = String(upgrade.desc || '').toLowerCase();
    const name = String(upgrade.name || '').toLowerCase();
    const text = desc + ' ' + name;

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

    const utilityScore =
      estimatedCpsGain * 2 +
      estimatedClickGain +
      keywordSignals.building * Math.max(1, cps() * 0.01);

    return {
      estimatedCpsGain,
      estimatedClickGain,
      utilityScore,
      signals: keywordSignals
    };
  }

  function shouldAscend() {
    const analysis = ascensionAnalysis();
    return CONFIG.autoAscend && !state.ascending && !isPaused() && analysis.worthIt;
  }

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

  function registerTimeout(name, delay, fn) {
    const id = setTimeout(() => {
      state.timeouts.delete(id);
      safe(fn, null, name + ' falhou');
    }, Math.max(0, Number(delay) || 0));
    state.timeouts.add(id);
    return id;
  }

  function performAscension() {
    const analysis = ascensionAnalysis();
    if (!gameReady() || state.ascending || !CONFIG.autoAscend || !analysis.worthIt) return false;
    if (typeof Game.Ascend !== 'function') return false;

    state.ascending = true;

    try {
      Game.Ascend(1);
      state.stats.ascensions++;
      state.lastAction = 'ascensão';

      registerTimeout('pós-ascensão', CONFIG.postAscensionDelayMs, () => {
        try {
          buyHeavenlyUpgrades();

          if (CONFIG.autoReincarnate && typeof Game.Reincarnate === 'function') {
            registerTimeout('reencarnação', CONFIG.postAscensionDelayMs, () => {
              try {
                Game.Reincarnate(1);
                state.stats.reincarnations++;
                state.lastAction = 'reencarnação';
              } catch (error) {
                state.stats.errors++;
                state.lastError = String(error.message || error);
                log('error', 'reencarnação falhou', error);
              } finally {
                state.ascending = false;
                if (CONFIG.autoReincarnate) {
                  state.active = true;
                  state.paused = false;
                  configureTimers();
                }
              }
            });
            return;
          }

          state.ascending = false;
          state.active = false;
          state.paused = true;
          clearAllTimers();
          log('warn', 'Ascensão concluída; bot pausado porque autoReincarnate está desativado.');
        } catch (error) {
          state.stats.errors++;
          state.lastError = String(error.message || error);
          state.ascending = false;
          state.active = false;
          state.paused = true;
          clearAllTimers();
          log('error', 'pós-ascensão falhou; bot pausado por segurança', error);
        }
      });

      log('info', 'Ascensão executada: +' + String(analysis.gain) +
        ' prestígio; ganho permanente estimado de ' +
        String(analysis.multiplierGainPercent.toFixed(2)) + '%.');
      return true;
    } catch (error) {
      state.ascending = false;
      state.active = false;
      state.paused = true;
      clearAllTimers();
      state.stats.errors++;
      state.lastError = String(error.message || error);
      log('error', 'ascensão falhou; bot pausado por segurança', error);
      return false;
    }
  }

  function tryAscend() {
    return performAscension();
  }

  function pantheonMinigame() {
    const temple = Game && Game.ObjectsById && Game.ObjectsById[6];
    return temple && temple.minigame ? temple.minigame : null;
  }

  function pantheonGods(minigame) {
    if (!minigame) return [];
    const source = minigame.godsById || minigame.gods;
    if (!source) return [];
    if (Array.isArray(source)) return source.filter(Boolean);
    return Object.keys(source).map(key => source[key]).filter(Boolean);
  }

  function findPantheonGod(minigame) {
    const requested = String(CONFIG.pantheonGod || '').trim().toLowerCase();
    if (!requested) return null;
    return pantheonGods(minigame).find(god =>
      String(god.name || '').toLowerCase() === requested
    ) || pantheonGods(minigame).find(god =>
      String(god.name || '').toLowerCase().includes(requested)
    ) || null;
  }

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

  function dragonAuras() {
    if (!gameExists()) return [];
    const source = Game.dragonAuras;
    if (!source) return [];
    if (Array.isArray(source)) return source.filter(Boolean);
    return Object.keys(source).map(key => source[key]).filter(Boolean);
  }

  function findDragonAura(name) {
    const requested = String(name || '').trim().toLowerCase();
    if (!requested) return null;
    return dragonAuras().find(aura =>
      String(aura.name || '').toLowerCase() === requested
    ) || dragonAuras().find(aura =>
      String(aura.name || '').toLowerCase().includes(requested)
    ) || null;
  }

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

  function sugarLumpReady() {
    if (!gameReady()) return false;
    if (typeof Game.canLumps === 'function' && !Game.canLumps()) return false;
    const lumpTime = Number(Game.lumpT || 0);
    const minimum = Math.max(0, Number(CONFIG.sugarLumpMinTime) || 0);
    return lumpTime > minimum;
  }

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

  function taskHealthSnapshot() {
    const now = Date.now();
    return [...state.schedulerTasks.values()].map(task => {
      const lastRun = state.taskLastRun.get(task.name) || 0;
      const lastSuccess = state.taskLastSuccess.get(task.name) || 0;
      const failures = state.taskFailures.get(task.name) || 0;
      const runs = state.taskRunCount.get(task.name) || 0;
      const durationMs = state.taskDurationMs.get(task.name) || 0;
      const ageMs = lastRun ? now - lastRun : Infinity;
      let health = 'UNKNOWN';
      if (lastSuccess && ageMs <= task.intervalMs + (Number(CONFIG.watchdogGraceMs) || 15000)) health = failures ? 'DEGRADED' : 'HEALTHY';
      else if (lastRun) health = 'STALE';
      return { name: task.name, health, intervalMs: task.intervalMs, lastRun, lastSuccess, ageMs, failures, runs, durationMs };
    });
  }

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

  function healthHistory() {
    return [...state.healthHistory];
  }

  function clearHealthHistory() {
    state.healthHistory = [];
    return true;
  }

  function healthCycle() {
    if (!state.active || state.paused) return null;
    const before = healthSummary();
    if ((before.counts.STALE || 0) > 0) state.stats.healthRecoveries++;
    return before;
  }

  function operationalState() {
    if (!state.active) return 'IDLE';
    if (state.paused) return 'PAUSED';
    if (state.ascending) return 'ASCENDING';
    if (hasBuff('click frenzy') || hasBuff('elder frenzy')) return 'BUFF_ACTIVE';
    return 'RUNNING';
  }

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
    return true;
  }

  function runScheduledTask(task, now, recovery = false) {
    const started = performance.now();
    try {
      task.handler();
      const duration = performance.now() - started;
      state.taskLastRun.set(task.name, now);
      state.taskFailures.set(task.name, 0);
      state.taskLastSuccess.set(task.name, now);
      state.taskDurationMs.set(task.name, duration);
      state.taskRunCount.set(task.name, (state.taskRunCount.get(task.name) || 0) + 1);
      if (recovery) log('warn', 'Watchdog recuperou: ' + task.name);
      return { ok: true, duration };
    } catch (error) {
      const failures = (state.taskFailures.get(task.name) || 0) + 1;
      state.taskLastRun.set(task.name, now);
      state.taskFailures.set(task.name, failures);
      state.stats.errors++;
      log('error', 'Falha na tarefa ' + task.name, error);
      return { ok: false, failures };
    }
  }

  function schedulerTick() {
    if (!state.active || state.paused) return;
    state.stats.schedulerTicks = (state.stats.schedulerTicks || 0) + 1;
    const now = Date.now();
    [...state.schedulerTasks.values()]
      .sort((a, b) => b.priority - a.priority)
      .forEach(task => {
        const last = state.taskLastRun.get(task.name) || 0;
        if (now - last >= task.intervalMs) runScheduledTask(task, now);
      });
  }

  function watchdogTick() {
    if (!state.active || state.paused) return;
    const now = Date.now();
    const grace = Math.max(5000, Number(CONFIG.watchdogGraceMs) || 15000);
    for (const task of state.schedulerTasks.values()) {
      const last = state.taskLastRun.get(task.name) || 0;
      if (now - last > task.intervalMs + grace) {
        state.stats.watchdogRestarts = (state.stats.watchdogRestarts || 0) + 1;
        runScheduledTask(task, now, true);
      }
    }
  }

  function startScheduler() {
    stopScheduler();
    state.schedulerTimer = setInterval(schedulerTick, Math.max(100, Number(CONFIG.schedulerIntervalMs) || 1000));
    state.watchdogTimer = setInterval(watchdogTick, Math.max(5000, Number(CONFIG.watchdogIntervalMs) || 10000));
    return true;
  }

  function stopScheduler() {
    if (state.schedulerTimer) clearInterval(state.schedulerTimer);
    if (state.watchdogTimer) clearInterval(state.watchdogTimer);
    state.schedulerTimer = null;
    state.watchdogTimer = null;
    return true;
  }

  function configureScheduler() {
    state.schedulerTasks.clear();
    state.taskLastRun.clear();
    state.taskFailures.clear();
    state.taskRunCount.clear();
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
    if (CONFIG.healthEnabled) registerTask('health', CONFIG.statusMs, 6, healthCycle);
    return state.schedulerTasks.size;
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
    stopScheduler();
    state.schedulerTasks.clear();
    state.taskLastRun.clear();
    state.taskFailures.clear();
    state.taskRunCount.clear();
    state.timeouts.forEach(id => clearTimeout(id));
    state.timeouts.clear();
  }


  function historyKey() {
    return '__COOKIE_CLICKER_BOT_V6_HISTORY__';
  }

  function loadHistory() {
    if (!CONFIG.historyEnabled || typeof localStorage === 'undefined') return [];
    return safe(() => {
      const raw = localStorage.getItem(historyKey());
      const parsed = raw ? JSON.parse(raw) : [];
      state.history = Array.isArray(parsed) ? parsed.slice(-Math.max(1, Number(CONFIG.historyMaxEntries) || 96)) : [];
      return [...state.history];
    }, [], 'histórico não pôde ser carregado');
  }

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

  function performanceHistory() {
    return [...state.history];
  }

  function clearHistory() {
    state.history = [];
    if (typeof localStorage !== 'undefined') {
      safe(() => localStorage.removeItem(historyKey()), null, 'histórico não pôde ser limpo');
    }
    return true;
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

  function configureTimers() {
    clearAllTimers();
    // Clicks permanecem em timer próprio porque o scheduler trabalha em escala de segundos.
    addTimer('click', clickDelay(), clickCookie);
    configureScheduler();
    startScheduler();
  }


  function stop() {
    clearAllTimers();
    state.active = false;
    state.paused = false;
    state.ascending = false;
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
    loadHistory();

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
      shouldAscend,
      buyHeavenlyUpgrades,
      performAscension,
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

  console.log('%c🍪 Cookie Clicker Bot V' + VERSION + ' carregado', 'font-weight:bold;font-size:14px');
  console.log('Se o jogo já estiver pronto, o V6 inicia sozinho. Se não estiver, execute CookieBotV6.start() após carregar.');
  console.log('Diagnóstico: CookieBotV6.diagnostics()');

  CookieBotV6.start();
})();
