// ============================================================
// 🍪 COOKIE CLICKER BOT — V5.7 OBSERVABILITY LAYER
// Camada de diagnóstico para a V5.6: SelfTest + Dashboard + Telemetria
// Uso: carregue a V5.6 primeiro e depois cole este arquivo.
// ============================================================

(() => {
  'use strict';

  const VERSION = '5.7.0';
  const GLOBAL_KEY = '__COOKIE_CLICKER_BOT_V5__';
  const LAYER_KEY = '__COOKIE_CLICKER_BOT_V5_7__';

  const bot = window[GLOBAL_KEY] || window.CookieBotV5;
  if (!bot) {
    console.error('[🍪 BOT V5.7] V5.6 não encontrada. Carregue cookieclicker-bot-v5.js primeiro.');
    return;
  }

  const state = {
    startedAt: Date.now(),
    selfTests: 0,
    dashboards: 0,
    telemetry: 0,
    lastSelfTest: null,
    lastDashboard: null
  };

  const safe = (fn, fallback = null) => {
    try { return fn(); } catch (error) {
      console.error('[🍪 BOT V5.7] erro:', error);
      return fallback;
    }
  };

  function capabilityReport() {
    return safe(() => typeof bot.capabilities === 'function' ? bot.capabilities() : {}, {});
  }

  function gameReady() {
    return typeof Game !== 'undefined' && !!Game && !!Game.ready;
  }

  function operationalState() {
    return safe(() => typeof bot.operationalState === 'function'
      ? bot.operationalState()
      : 'UNKNOWN', 'UNKNOWN');
  }

  function taskHealth() {
    const scheduler = safe(() => bot._schedulerState?.(), null);
    if (scheduler) return scheduler;
    return {
      available: typeof bot.configureScheduler === 'function',
      note: 'A V5.6 não expõe os heartbeats internos; use SelfTest + diagnóstico de capacidades.'
    };
  }

  function selfTest() {
    state.selfTests++;
    const capabilities = capabilityReport();
    const results = {};

    results.core = {
      status: gameReady() ? 'SUPPORTED' : 'DEGRADED',
      detail: gameReady() ? 'Cookie Clicker pronto' : 'Game ainda não está pronto'
    };

    results.api = {
      status: typeof bot.start === 'function' && typeof bot.stop === 'function'
        ? 'SUPPORTED' : 'ERROR',
      detail: 'API principal detectada'
    };

    results.clicker = {
      status: typeof bot.start === 'function' ? 'SUPPORTED' : 'ERROR',
      detail: 'Controle de ciclo principal disponível'
    };

    for (const [name, item] of Object.entries(capabilities)) {
      results[name] = {
        status: item.supported ? 'SUPPORTED' : 'UNAVAILABLE',
        detail: item.reason
      };
    }

    const unavailable = Object.values(results).filter(x => x.status === 'UNAVAILABLE').length;
    const errors = Object.values(results).filter(x => x.status === 'ERROR').length;
    const overall = errors > 0 ? 'ERROR' : unavailable > 0 ? 'DEGRADED' : 'HEALTHY';

    const report = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      overall,
      gameReady: gameReady(),
      operationalState: operationalState(),
      modules: results,
      unavailable,
      errors
    };

    state.lastSelfTest = report;

    console.group('🧪 COOKIE BOT V5.7 — SELF TEST');
    console.log('Estado geral:', overall);
    console.table(Object.fromEntries(
      Object.entries(results).map(([name, item]) => [name, item.status])
    ));
    console.groupEnd();

    return report;
  }

  function telemetry() {
    state.telemetry++;
    const diagnostics = safe(() => typeof bot.diagnostics === 'function' ? bot.diagnostics() : null, null);
    const history = safe(() => typeof bot.performanceHistory === 'function' ? bot.performanceHistory() : [], []);
    const lastHistory = history.length ? history[history.length - 1] : null;

    const report = {
      generatedAt: new Date().toISOString(),
      version: VERSION,
      state: operationalState(),
      gameReady: gameReady(),
      cookies: gameReady() ? Number(Game.cookies || 0) : 0,
      cps: gameReady() ? Number(Game.cookiesPs || 0) : 0,
      prestige: gameReady() ? Number(Game.prestige || 0) : 0,
      historyEntries: history.length,
      lastHistory,
      diagnosticsAvailable: !!diagnostics,
      layer: {
        selfTests: state.selfTests,
        dashboards: state.dashboards,
        telemetry: state.telemetry
      }
    };

    return report;
  }

  function dashboard() {
    state.dashboards++;
    const test = state.lastSelfTest || selfTest();
    const data = telemetry();

    console.clear();
    console.group('🍪 COOKIE CLICKER BOT V5.7');
    console.log('CORE:', test.overall);
    console.log('GAME:', test.gameReady ? 'OK' : 'DEGRADED');
    console.log('STATE:', data.state);
    console.log('COOKIES:', data.cookies);
    console.log('CpS:', data.cps);
    console.log('PRESTIGE:', data.prestige);
    console.log('HISTORY:', data.historyEntries);
    console.log('SELF TESTS:', state.selfTests);
    console.groupEnd();

    console.group('🧩 MÓDULOS');
    console.table(Object.fromEntries(
      Object.entries(test.modules).map(([name, item]) => [
        name,
        { status: item.status, detail: item.detail }
      ])
    ));
    console.groupEnd();

    console.group('📡 TELEMETRIA');
    console.table(data);
    console.groupEnd();

    state.lastDashboard = { test, data };
    return state.lastDashboard;
  }

  function report() {
    const test = selfTest();
    const data = telemetry();
    console.group('📊 COOKIE BOT V5.7 — RELATÓRIO');
    console.table({
      versão: VERSION,
      estado: data.state,
      saúde: test.overall,
      cookies: data.cookies,
      cps: data.cps,
      prestígio: data.prestige,
      módulosIndisponíveis: test.unavailable,
      erros: test.errors,
      histórico: data.historyEntries
    });
    console.groupEnd();
    return { test, data };
  }

  function watch(intervalMs = 1800000) {
    const delay = Math.max(10000, Number(intervalMs) || 1800000);
    if (state.reportTimer) clearInterval(state.reportTimer);
    state.reportTimer = setInterval(report, delay);
    report();
    return state.reportTimer;
  }

  function stopWatch() {
    if (state.reportTimer) clearInterval(state.reportTimer);
    state.reportTimer = null;
    return true;
  }

  function api() {
    return {
      version: VERSION,
      selfTest,
      telemetry,
      dashboard,
      report,
      watch,
      stopWatch,
      capabilityReport,
      operationalState,
      taskHealth
    };
  }

  if (window[LAYER_KEY]?.stopWatch) safe(() => window[LAYER_KEY].stopWatch());
  window[LAYER_KEY] = api();
  window.CookieBotV57 = window[LAYER_KEY];

  console.log('%c🍪 Cookie Clicker Bot V5.7 carregado', 'font-weight:bold;font-size:14px');
  console.log('Comandos: CookieBotV57.selfTest(), .dashboard(), .telemetry(), .report(), .watch()');

  selfTest();
  dashboard();
})();