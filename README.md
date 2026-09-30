# Cookie Clicker Bot

Este repositório mantém as versões históricas do bot e evolui uma versão por vez, sem apagar V1–V5.9.

## V6.1 — Módulo de Ascensão e Progressão Celestial

A V6.1 reconstrói o primeiro módulo removido da V5, mantendo o núcleo V6 pequeno e adicionando a progressão pós-prestígio como um módulo isolado.

- cálculo de decisão de ascensão separado de `performAscension()`;
- compra de Heavenly Upgrades (`pool === 'prestige'`) quando disponíveis;
- reencarnação opcional após a ascensão;
- timeouts pós-ascensão rastreados e canceláveis por `stop()`;
- estado `ascending` impede tarefas incompatíveis durante a transição;
- estatísticas próprias para ascensões, upgrades celestiais e reencarnações;
- `CookieBotV6.shouldAscend()`, `.buyHeavenlyUpgrades()` e `.performAscension()` expostos na API.

Por segurança, `autoAscend` e `autoReincarnate` continuam desligados por padrão. `buyHeavenlyUpgrades` fica habilitado para que upgrades celestiais elegíveis sejam comprados quando uma ascensão ocorrer.

```js
CookieBotV6.config({
  autoAscend: true,
  autoReincarnate: false,
  buyHeavenlyUpgrades: true,
  postAscensionDelayMs: 4000
})
```

## V6 — Stable Runtime Rewrite

A V6 foi criada porque a V5 acumulou complexidade antes de ter validação suficiente no runtime real do Cookie Clicker.

### Objetivo

**Runtime primeiro. Complexidade depois.**

A V6 separa o núcleo realmente necessário das integrações opcionais.

### Núcleo V6

- auto-click do cookie principal;
- coleta de Golden Cookies, Wrath Cookies e Reindeer;
- compra automática de upgrades;
- compra automática de edifícios por ROI de CpS;
- gerenciamento opcional de wrinklers;
- cálculo de prestígio;
- ascensão automática opcional;
- scheduler simples e previsível;
- parada, pausa e retomada;
- diagnóstico do ambiente;
- status e relatórios;
- proteção contra múltiplas instâncias;
- tratamento individual de erros;
- detecção de APIs antes de usar recursos opcionais.

### Segurança operacional

A V6 **não ativa ascensão automática nem estouro de wrinklers por padrão**. Essas ações podem alterar significativamente o progresso do jogo e devem ser habilitadas explicitamente:

```js
CookieBotV6.config({
  autoAscend: true,
  popWrinklers: true
})
```

### Uso

Abra o Cookie Clicker, F12 → Console e cole o conteúdo completo de:

```text
cookieclicker-bot-v6.js
```

Se o jogo já estiver carregado, o bot inicia sozinho.

Comandos:

```js
CookieBotV6.status()
CookieBotV6.diagnostics()
CookieBotV6.pause()
CookieBotV6.resume()
CookieBotV6.stop()
CookieBotV6.start()
CookieBotV6.report()
```

### Diagnóstico

Se o bot não fizer nada:

```js
CookieBotV6.diagnostics()
```

O diagnóstico mostra se o objeto `Game` existe, se o runtime está pronto, quais APIs principais estão disponíveis e quantos edifícios, upgrades, shimmers e wrinklers foram detectados.

### Configuração

Exemplos:

```js
CookieBotV6.config({ spendingLimit: 0.50 })
CookieBotV6.config({ clickGolden: false })
CookieBotV6.config({ clickWrath: false })
CookieBotV6.config({ buyBuildings: false })
CookieBotV6.config({ buyUpgrades: false })
CookieBotV6.config({ autoAscend: true, prestigeThreshold: 100 })
```

### Por que a V6 é diferente da V5?

A V5 tentou concentrar scheduler, watchdog, economia, histórico, health checks e vários adaptadores de minigames em uma única execução.

A V6 começa novamente pelo caminho crítico:

```
Game disponível
   ↓
Cookie principal
   ↓
Shimmers
   ↓
Compras
   ↓
Wrinklers / Prestígio
   ↓
Diagnóstico
   ↓
Integrações opcionais
```

Se uma integração opcional não existir, o núcleo continua funcionando.

### Validação

A V6 foi revisada estruturalmente e construída para depender apenas de APIs centrais conhecidas do runtime do Cookie Clicker. Ela ainda precisa ser executada dentro do Cookie Clicker para uma validação real de comportamento; uma revisão de código não substitui esse teste.

As versões V1–V5.9 permanecem no repositório para comparação e preservação histórica.
