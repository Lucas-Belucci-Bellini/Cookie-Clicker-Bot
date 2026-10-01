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

## V6.12 — Ascensão robusta + análise estatística de upgrades

A V6.12 fecha o primeiro ciclo de integração atacando diretamente os dois pontos que mais exigiam confiabilidade: a transição de ascensão e a escolha econômica de upgrades.

### Ascensão robusta

A ascensão agora possui fases explícitas:

`READY` → `ASCENDING` → `RECOVERING` → `WAITING_REINCARNATION` → `READY`

Quando `Game.Ascend()` é chamado, a V6 guarda um snapshot do estado anterior e faz uma verificação pós-ascensão antes de liberar a automação novamente. Se a transição não puder ser confirmada, o bot entra em `FAILED`, pausa e limpa os timers para não continuar operando em um estado inconsistente.

Também foi adicionado um limite de **payback estimado da ascensão**, além do limite de recuperação já existente.

### Upgrades com estatística + payback

A seleção de upgrades deixou de ser simplesmente "o mais barato".

`upgradeAnalysis()` combina preço, ganho estimado de CpS, ganho estimado de clique, sinais de multiplicadores/edifícios/kitten, orçamento disponível, payback estimado e observações reais de compras anteriores do mesmo upgrade.

Após uma compra, a V6 registra o CpS antes/depois para alimentar futuras análises. Assim, a heurística inicial pode ser complementada por dados observados no próprio runtime.

APIs novas/ajustadas: `upgradeAnalysis()`, `upgradeStatProfile()`, `verifyAscensionTransition()` e `ascensionAnalysis()`.

As métricas continuam sendo estimativas, porque o efeito de alguns upgrades e a recuperação após ascensão dependem do estado real do Cookie Clicker.

## V6.11 — Health + Telemetry

A V6.11 adiciona uma camada de saúde operacional e telemetria ao Scheduler.

### Health

Cada tarefa do Scheduler passa a registrar:

- última execução;
- última execução bem-sucedida;
- quantidade de execuções;
- falhas consecutivas;
- duração aproximada;
- idade desde a última execução;
- estado `HEALTHY`, `DEGRADED`, `STALE` ou `UNKNOWN`.

APIs:

`taskHealthSnapshot()`
`healthSummary()`
`healthHistory()`
`clearHealthHistory()`
`healthCycle()`

A saúde também aparece no diagnóstico do módulo e pode ser consultada pelo Scheduler.

### Telemetry

A V6.11 mantém histórico limitado de snapshots de saúde para permitir observar a evolução do bot sem criar armazenamento infinito.

Configuração:

```js
CookieBotV6.config({
  healthEnabled: true,
  healthHistoryMaxEntries: 96
})
```

Métricas adicionais incluem `healthChecks` e `healthRecoveries`.

## V6.10 — Scheduler + Watchdog

A V6.10 substitui a coordenação dos módulos por um **Scheduler centralizado**, mantendo o clique rápido em timer separado.

### Scheduler

O Scheduler:

- mantém uma fila única de tarefas;
- executa tarefas por intervalo;
- ordena tarefas por prioridade;
- registra última execução, falhas e quantidade de execuções;
- ativa somente os módulos opcionais realmente habilitados;
- mantém o clique em timer próprio, porque o Scheduler trabalha em escala de segundos.

Prioridades principais:

`shimmers > prestige > purchases > wrinklers > minigames > dragon > seasons > sugar lumps > reports`.

### Watchdog

O Watchdog verifica tarefas que ficaram além do intervalo esperado.

Quando uma tarefa fica atrasada além da margem configurada, o Watchdog tenta executá-la novamente e registra a recuperação.

Configuração:

```js
CookieBotV6.config({
  schedulerIntervalMs: 1000,
  watchdogIntervalMs: 10000,
  watchdogGraceMs: 15000
})
```

APIs adicionadas:

- `operationalState()`
- `registerTask()`
- `schedulerTick()`
- `watchdogTick()`
- `startScheduler()`
- `stopScheduler()`
- `configureScheduler()`

O diagnóstico também passa a informar se Scheduler e Watchdog estão ativos.

## V6.9 — Sugar Lumps

A V6.9 reconstrói o módulo de **Sugar Lumps** com execução opcional e conservadora.

O módulo:

- verifica se a API de Sugar Lumps existe;
- respeita `Game.canLumps()`;
- verifica o tempo do lump antes de agir;
- executa somente o modo `harvest`;
- registra cada coleta;
- não altera automaticamente prédios, minigames ou outros sistemas do jogo.

Configuração:

```js
CookieBotV6.config({
  sugarLumpsEnabled: true,
  sugarLumpMinTime: 0,
  sugarLumpMode: 'harvest'
})
```

API adicionada: `sugarLumpReady()` e `manageSugarLump()`.

O módulo permanece desligado por padrão para evitar comportamento inesperado antes da validação dentro do jogo.

## V6.8 — Dragon + Seasons

A V6.8 reconstrói os módulos de **Dragon Aura** e **Seasons** e mantém ambos desligados por padrão.

### Dragon

O módulo:

- verifica se o Dragon já atingiu o nível mínimo necessário;
- descobre as auras disponíveis pela API do jogo;
- evita trocar para a mesma aura repetidamente;
- usa `Dragon's Fortune` durante Click Frenzy quando configurado;
- usa `Radiant Appetite` como padrão fora de Click Frenzy;
- permite uma aura personalizada por configuração;
- registra cada troca.

Configuração:

```js
CookieBotV6.config({
  dragonEnabled: true,
  dragonPreferClickFrenzy: true,
  dragonAura: 'Radiant Appetite'
})
```

### Seasons

O módulo de Seasons:

- só executa quando habilitado;
- não tenta iniciar outra temporada se uma já estiver ativa;
- usa uma lista de prioridade configurável;
- registra a temporada iniciada;
- usa `Game.startSeason()` somente quando a API existe.

Configuração:

```js
CookieBotV6.config({
  seasonsEnabled: true,
  seasonPriority: ['christmas', 'halloween', 'easter', 'valentines', 'fools']
})
```

APIs adicionadas: `dragonAuras()`, `findDragonAura()`, `manageDragon()` e `manageSeason()`.

### Correção adicional do Pantheon

Durante a reconstrução da V6.8 também foi corrigida a referência do Temple/Pantheon: o módulo passou a procurar o minigame no índice correto de `Game.ObjectsById`, em vez da referência incorreta usada anteriormente.

## V6.7 — Ascensão inteligente, upgrades por estatística e Pantheon

A V6.7 corrige dois pontos centrais da reconstrução: a decisão de ascensão agora calcula se o reset compensa antes de chamar `Game.Ascend()`, e a economia passa a estimar o valor dos upgrades por sinais estatísticos em vez de usar apenas preço/descrição genérica.

### Ascensão

A análise `ascensionAnalysis()` considera:

- prestígio atual e prestígio potencial;
- ganho absoluto e ganho percentual;
- aumento estimado do multiplicador permanente de CpS;
- tempo de recuperação estimado após o reset;
- fator de segurança para evitar estimativas otimistas demais;
- limite mínimo de ganho;
- limite máximo de recuperação.

`shouldAscend()` só libera a ascensão quando a análise retorna `worthIt: true`.

```js
CookieBotV6.ascensionAnalysis()
```

Se `autoReincarnate` estiver desligado, a V6 agora **para e pausa o bot após `Game.Ascend()`**, em vez de continuar executando tarefas enquanto o jogo está na tela de ascensão. Isso evita o estado inconsistente que fazia a automação parecer travada/quebrada.

### Upgrades por estatística

`upgradeStatProfile()` cria uma estimativa de valor usando sinais disponíveis no próprio objeto do upgrade e sua descrição, incluindo:

- ganho direto de CpS;
- multiplicadores de CpS;
- bônus de clique;
- multiplicadores de clique;
- efeitos relacionados a edifícios;
- efeitos de leite/kitten;
- sinais textuais de produção e multiplicadores.

O score econômico combina esse valor estimado com preço, payback e capacidade de compra. Assim, o upgrade mais barato não é automaticamente considerado o melhor.

### Pantheon

A V6.7 também reconstrói o Pantheon como módulo opcional:

- detecção do minigame do Temple;
- busca de deus por nome;
- seleção de slot configurável;
- tentativa compatível com as assinaturas conhecidas de `slotGod`;
- contador de alterações;
- desativado por padrão.

Configuração:

```js
CookieBotV6.config({
  pantheonEnabled: true,
  pantheonGod: 'Godzamok',
  pantheonSlot: 0
})
```

APIs: `ascensionAnalysis()`, `upgradeStatProfile()`, `pantheonMinigame()`, `pantheonGods()`, `findPantheonGod()` e `managePantheon()`.

## V6.6 — Stock Market

Módulo opcional do Stock Market: detecção do minigame do Bank, leitura de `goods`/`goodsById`, avaliação de preço e operações de compra/venda com limites configuráveis. O módulo permanece desligado por padrão e não força operações sem configuração de thresholds.

Configuração: `marketEnabled`, `marketBuyThreshold`, `marketSellThreshold` e `marketMaxSpendRatio`.

APIs: `marketMinigame()`, `marketGoods()` e `manageMarket()`.

## V6.5 — Garden

Módulo opcional de automação do Garden: detecção da fazenda, leitura de `plot`/`tiles`, colheita de plantas maduras e plantio opcional por ID. O plantio automático permanece desligado por padrão.

Configuração: `gardenEnabled`, `gardenHarvestMature`, `gardenAutoPlant` e `gardenPlantId`.

APIs: `gardenMinigame()`, `gardenTiles()`, `harvestGarden()`, `plantGarden()` e `gardenCycle()`.

## V6.4 — Grimoire

A V6.4 reconstrói a automação do Grimoire como módulo opcional e isolado.

- detecção do minigame no Wizard Tower;
- compatibilidade com `spells` e `spellsByName`;
- seleção por nome configurável ou fallback conservador;
- limite mínimo de magia;
- contador de conjurações;
- API `grimoireMinigame()`, `findGrimoireSpell()` e `castGrimoire()`;
- desativado por padrão para não alterar a estratégia do jogador sem configuração explícita.

Configuração: `grimoireEnabled`, `grimoireSpell` e `grimoireMinMagic`.

## V6.3 — Persistência e Histórico

A V6.3 adiciona persistência local sem acoplar o runtime a uma camada externa.

- histórico limitado por historyMaxEntries;
- armazenamento em localStorage;
- carregamento automático ao iniciar;
- snapshots dos relatórios;
- performanceHistory() para consulta;
- clearHistory() para limpeza explícita;
- falhas de persistência são isoladas pelo safe().

APIs: CookieBotV6.loadHistory(), .saveHistory(entry), .performanceHistory() e .clearHistory().

## V6.2 — Módulo Econômico

A V6.2 reconstrói o motor econômico da V5 como um módulo independente do runtime.

- orçamento baseado em limite de gasto + reserva absoluta/proporcional;
- avaliação conjunta de upgrades e edifícios;
- eficiência normalizada por preço, valor e payback;
- `chooseEconomicAction()` seleciona a ação de maior pontuação;
- `executeEconomicAction()` executa a decisão com tratamento seguro de erro;
- relatório econômico periódico;
- contadores de decisões e decisões sem ação;
- sem a escala artificial de `1e6` que existia em uma versão antiga da V5.

Configuração principal:

```js
CookieBotV6.config({
  economyEnabled: true,
  spendingLimit: 0.75,
  reserveCookies: 0,
  reserveCookiesRatio: 0.10,
  targetPaybackSeconds: 3600
})
```

APIs: `CookieBotV6.economicBudget()`, `.chooseEconomicAction()`, `.executeEconomicAction()` e `.economicReport()`.

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


## V6.13 — Observações empíricas persistentes e janela de medição

A V6.13 continua a reconstrução modular da V6 e melhora a parte estatística dos upgrades.

### O que mudou

- observações de upgrades agora são persistidas em `localStorage`;
- a quantidade máxima de observações é configurável por `upgradeObservationMaxEntries`;
- a compra não é mais tratada como evidência estatística imediatamente;
- cada upgrade comprado cria uma observação pendente;
- após `upgradeObservationWindowMs`, a V6 mede o CpS novamente;
- o delta observado alimenta as próximas análises de upgrade;
- o Scheduler ganhou a tarefa `upgradeObservations`;
- durante a transição de ascensão, tarefas normais de automação ficam bloqueadas;
- o clique automático também respeita `ascensionPhase`;
- `operationalState()` passa a expor estados como `ASCENDING`, `RECOVERING` e `WAITING_REINCARNATION`.

### Novas configurações

- `upgradeObservationWindowMs: 5000`
- `upgradeObservationMaxEntries: 96`

### Novas APIs

- `upgradeObservationKey()`
- `loadUpgradeObservations()`
- `saveUpgradeObservations()`
- `finalizeUpgradeObservations()`

### Objetivo

A V6 passa a separar **estimativa** de **observação real**. O motor econômico ainda usa heurísticas para decidir imediatamente, mas pode acumular evidência de execuções anteriores para ajustar o valor esperado dos upgrades.

> Validação desta etapa: análise estrutural do código no GitHub. Não foi executada uma sessão real dentro do Cookie Clicker nesta etapa.


## V6.14 — Observabilidade da ascensão

A V6.14 fortalece o módulo de ascensão sem alterar o comportamento automático padrão.

### Novidades

- novo estado `ascensionOutcome`;
- registro explícito de início, sucesso, falha e reencarnação;
- novo `ascensionReport()`;
- o relatório geral passa a incluir o estado da ascensão;
- o status da sessão passa a expor `ascensionPhase`;
- falhas de ascensão preservam a causa e o momento da falha;
- uma ascensão verificada registra ganho de prestígio e ganho percentual estimado.

### Fluxo observado

`READY → ASCENDING → RECOVERING → WAITING_REINCARNATION → READY`

Em caso de falha:

`qualquer estado de transição → FAILED → PAUSED`

Isso deixa a V6 mais diagnosticável quando uma ascensão apresentar comportamento diferente do esperado no runtime.

> Validação desta etapa: análise estrutural do código no GitHub. Não foi executada uma sessão real dentro do Cookie Clicker.


## V6.15 — Scheduler/Watchdog resiliente

A V6.15 fecha uma lacuna do módulo de execução: o Scheduler e o Watchdog agora entendem falha explícita de tarefa.

### Melhorias

- retorno `false` de uma tarefa agora é tratado como falha;
- `taskHealth` passa a registrar `HEALTHY`, `DEGRADED` e `FAILED`;
- o Health/Telemetry usa esse estado explícito antes de inferir saúde apenas pelos tempos;
- o Watchdog respeita a máquina de estados da ascensão e não força automações normais durante transições;
- tarefas permitidas durante transições continuam sendo `health`, `status` e `upgradeObservations`;
- contadores de execução, falhas e duração continuam preservados.

Isso reduz o risco de o sistema considerar uma tarefa saudável quando ela executou, mas informou explicitamente que não conseguiu completar sua operação.

> Validação: código verificado estruturalmente no GitHub. Nenhuma sessão real do Cookie Clicker foi executada nesta etapa.


## V6.16 — Estatística empírica mais confiável

A V6.16 melhora o módulo de decisão econômica usando as observações reais coletadas após compras.

### Melhorias

- observações contaminadas por buffs conhecidos não entram no cálculo estatístico;
- o relatório distingue `observations` de `cleanObservations`;
- o peso estatístico máximo agora é configurável;
- compras do mesmo upgrade não criam observações pendentes duplicadas em uma janela de cooldown;
- cada observação registra a variação bruta de CpS e o motivo de eventual contaminação;
- o motor continua combinando estimativa heurística + evidência empírica, em vez de confiar cegamente em uma única medição.

Configurações novas:

- `upgradeObservationCooldownMs: 7000`
- `upgradeStatisticalMaxWeight: 0.60`

> Validação: estrutura do código verificada no GitHub. Nenhuma sessão real do Cookie Clicker foi executada nesta etapa.


## V6.17 — Watchdog com recuperação controlada

A V6.17 endurece a recuperação automática do Scheduler/Watchdog.

- recuperação só conta como `watchdogRestart` quando a tarefa realmente executa com sucesso;
- cada tarefa possui limite de tentativas de recuperação;
- tentativas malsucedidas entram em estado `STALE` sem loop infinito;
- existe cooldown entre ciclos de recuperação;
- contadores de tentativa e último recovery são reinicializados junto com o Scheduler;
- o estado de ascensão continua protegido contra execução de tarefas normais durante transições.

Novas configurações:

- `watchdogMaxRecoveryAttempts: 2`
- `watchdogRecoveryCooldownMs: 15000`

> Validação: estrutura do código verificada no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.18 — Payback econômico refinado

A V6.18 melhora a avaliação econômica dos upgrades.

- upgrades de clique passam a ter uma conversão configurável para valor econômico por segundo;
- o cálculo separa ganho estimado total de ganho observado;
- o limite máximo de payback deixa de ser um multiplicador fixo escondido;
- o relatório da análise passa a expor `paybackTarget`, `maxPayback`, `clickConversionRate` e `clickValueWeight`.

Configurações novas:

- `upgradeMaxPaybackSeconds: 7200`
- `estimatedClicksPerSecond: 10`
- `upgradeClickValueWeight: 0.25`

Isso deixa explícito que o bot não deve comparar upgrades de CpS e upgrades de clique como se fossem exatamente a mesma coisa.

> Validação: estrutura do código verificada no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.19 — Health separado de Recovery

A V6.19 corrige a semântica da telemetria de saúde.

Antes, detectar uma tarefa como `STALE` incrementava `healthRecoveries` mesmo sem uma recuperação efetivamente executada. Agora:

- `healthStaleDetections` registra detecções de tarefas `STALE`;
- a recuperação real continua sendo responsabilidade do Watchdog;
- `healthRecoveries` não é incrementado apenas por detecção;
- `healthCycle()` informa explicitamente `recoveryOwner: 'watchdog'`.

Isso deixa os números de saúde mais confiáveis para diagnosticar o bot.

> Validação: estrutura do código verificada no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.20 — Recuperação controlada de falha de ascensão

A V6.20 adiciona `recoverAscensionFailure()`.

Quando uma ascensão entra em `FAILED`, o bot não tenta automaticamente repetir a operação. A nova função permite reconhecer a falha e retornar o estado para `READY` de forma controlada.

Fluxo:

`FAILED → READY`

A recuperação:

- exige que o Cookie Clicker esteja disponível;
- limpa o snapshot da ascensão anterior;
- encerra o estado `ascending`;
- remove o erro atual;
- reconfigura os timers;
- não dispara uma nova ascensão automaticamente.

A função fica disponível pela API como `CookieBotV6.recoverAscensionFailure()`.

> Validação: estrutura do código verificada no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.21 — Compra de upgrades restaurada

A V6.21 corrige o fluxo que podia deixar upgrades disponíveis sem compra.

O problema era que o motor econômico descartava qualquer upgrade cujo `worthIt` fosse falso. Como esse cálculo é heurístico, um upgrade que estava efetivamente disponível podia acabar sem candidato válido.

Agora:

- `upgradeAnalysis()` continua sendo usado para priorizar upgrades;
- `economicScoreUpgrade()` possui fallback configurável com `upgradeFallbackEnabled: true`;
- upgrades realmente compráveis podem ser selecionados mesmo quando a heurística de payback não consegue classificá-los como `worthIt`;
- `getUpgradePrice()` aceita `getPrice()`, `basePrice` ou `price`;
- `upgradeCanBuyNow()` usa `canBuy()` quando a API do jogo fornece essa função;
- `chooseEconomicAction()` dá preferência a upgrades economicamente válidos e, na ausência deles, tenta um upgrade realmente comprável antes de recorrer a edifícios;
- `buyBestUpgrade()` usa o mesmo caminho, evitando duas regras diferentes para comprar upgrades;
- a execução verifica novamente a possibilidade de compra antes de chamar `buy()`.

Nova configuração:

`upgradeFallbackEnabled: true`

A análise estatística continua influenciando a escolha; ela deixa de ser um bloqueio absoluto para a compra.

> Validação: estrutura do código e presença do novo fluxo verificadas no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.22 — Controles globais de ciclo de vida

A V6.22 adiciona comandos globais para controlar completamente a execução do bot no console.

### Iniciar

`Bot_Start()`

Inicia a instância V6 carregada e libera um eventual bloqueio global anterior.

### Parar

`Bot_Stop()`

Para normalmente a instância atual e mantém o código disponível para ser iniciado novamente com `Bot_Start()`.

### Parar e bloquear

`Bot_Stop_And_Break()`

É o comando indicado antes de trocar para outra versão do bot.

Ele:

- cancela timers e Scheduler;
- cancela timeouts rastreados;
- desativa a instância;
- ativa um bloqueio global persistente na página;
- impede que a próxima versão carregada faça o auto-start;
- só libera novamente quando `Bot_Start()` for executado.

Exemplo de troca segura de versão:

```text
Bot_Stop_And_Break()

// agora cole/carregue a nova versão

Bot_Start()
```

A V6 também expõe esses comandos em `window`, então podem ser chamados diretamente no console sem depender de `CookieBotV6`.

> Observação: JavaScript já executado não pode ser literalmente apagado da página, mas o V6 cancela seus timers/timeouts controlados e bloqueia novas execuções do ciclo do bot.
> Validação: estrutura e controles globais verificados no código da V6.22. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.23 — Help central + documentação interna

A V6.23 adiciona um sistema de ajuda acessível diretamente pelo console:

```js
Bot_Help()
Bot_Help('upgrades')
Bot_Help('ascension')
Bot_Help('scheduler')
Bot_Help('lifecycle')
Bot_Help('minigames')
Bot_Help('persistence')
Bot_Help('diagnostics')
Bot_Help('architecture')
```

`Bot_Help()` mostra o índice de comandos e os principais pontos de manutenção. Um tópico retorna os comandos e as funções relacionadas àquela área.

### Documentação do código

A V6.23 também documenta a estrutura interna do arquivo para facilitar manutenção por outra pessoa ou por uma futura versão do próprio projeto.

Foram adicionados:

- cabeçalhos separando os módulos da V6;
- documentação das configurações e responsabilidades por área;
- comentário de propósito nas funções da V6;
- indicação, no Help, de quais funções devem ser alteradas para cada subsistema;
- descrição do fluxo de Lifecycle, Economia, Ascensão, Scheduler/Watchdog e Persistência.

A organização recomendada para manutenção é:

`CONFIG → state → helpers → módulos de jogo → health/scheduler → persistence → lifecycle/API`

Assim, uma alteração específica deve começar pelo módulo indicado pelo `Bot_Help()`, evitando criar lógica duplicada ou timers paralelos desnecessários.

> Validação: V6.23.0 verificada no GitHub com 109 funções documentadas e balanceamento estrutural de chaves, parênteses e colchetes. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.24 — Spawn controlado de Golden Cookies

A V6.24 incorpora na V6 a lógica existente de `new Game.shimmer("golden")`, transformando-a em um comando controlado e rastreável.

Comando principal:

```js
bot_spawn_golden_cookies()
```

Por padrão:

- quantidade: 10 Golden Cookies;
- intervalo: 5 segundos;
- primeiro Golden Cookie: imediato;
- timer do restante: controlado pela V6.

Também é possível definir os valores:

```js
bot_spawn_golden_cookies(25, 5)
```

ou usar o alias:

```js
Bot_Spawn_Golden_Cookies(10, 2)
```

O timer de spawn faz parte do ciclo de vida da V6. Portanto `Bot_Stop()` e `Bot_Stop_And_Break()` também interrompem o spawn em andamento.

A função pode ser consultada pelo Help:

```js
Bot_Help('golden')
```

A implementação foi baseada no mecanismo que já existia no histórico do repositório, evitando criar uma segunda lógica incompatível.

> Validação: código V6.24 verificado estruturalmente no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.25 — Comando de Golden Cookies por atribuição

A V6.25 adiciona uma forma direta de disparar o spawn usando uma atribuição no console:

```js
bot_golden_cookies = 10
```

A atribuição é interceptada pelo V6 e equivale a solicitar:

```js
bot_spawn_golden_cookies(10)
```

O intervalo usado é o configurado em `goldenSpawnDefaultIntervalSeconds` (5 segundos por padrão).

Também continua disponível a forma funcional:

```js
bot_golden_cookies(10)
```

e o comando completo:

```js
Bot_Spawn_Golden_Cookies(10, 2)
```

Assim, a V6 aceita tanto uma sintaxe curta de console quanto a API explícita.

> Validação: setter global, chamada funcional e estrutura do código verificados na V6.25. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.26 — Controlador global de execução

A V6.26 refatora os controles de ciclo de vida para não depender apenas das funções internas da versão atualmente carregada.

O controlador persistente fica em `window.__COOKIE_CLICKER_BOT_CONTROL__` e guarda:

- estado global de `break`;
- versão registrada;
- chave da instância V6 atual;
- modo atual do controlador;
- timestamp da última atualização.

### Comandos recomendados

```js
Bot_Start()
Bot_Stop()
Bot_Stop_And_Break()
Bot_Status()
Bot_Help()
```

### API alternativa

Também existe o objeto persistente:

```js
Bot.Start()
Bot.Stop()
Bot.Break()
Bot.Status()
Bot.Help()
```

`Bot_Status()` ou `Bot.Status()` mostra o controlador e a instância atual, facilitando verificar por que o bot não está iniciando ou parando.

Estados principais do controlador:

`RUNNING` → execução ativa

`STOPPED` → execução parada normalmente

`WAITING_GAME` → comando recebido, mas o Cookie Clicker ainda não está pronto

`BREAK` → execução bloqueada até `Bot_Start()`

A troca de versão recomendada permanece:

```text
Bot_Stop_And_Break()

// carregar a nova V6

Bot_Start()
Bot_Status()
```

O carregamento de uma nova V6 consulta o mesmo controlador persistente antes do auto-start.

> Validação: V6.26 verificada estruturalmente no GitHub. Os controles globais, controlador persistente, estados e API `Bot.*` foram confirmados no código. Não houve execução dentro de uma sessão real do Cookie Clicker.


## V6.27 — Burst de cliques com mouses virtuais

A V6.27 altera o clique automático para trabalhar em blocos configuráveis.

Configuração padrão:

```js
virtualMouseCount: 8
clicksPerVirtualMouse: 2
```

Isso significa:

```text
8 mouses virtuais × 2 cliques = 16 cliques por ciclo
```

O ciclo continua respeitando `clickDelay`. Portanto, com `clickMs: 25`, o modelo configurado representa aproximadamente 16 chamadas a `Game.ClickCookie()` a cada 25 ms.

A V6 calcula também uma taxa estimada de cliques por segundo a partir desse burst e usa esse valor na avaliação econômica dos upgrades de clique.

Para alterar:

```js
CookieBotV6.config({
  virtualMouseCount: 8,
  clicksPerVirtualMouse: 2,
  clickMs: 25
})
```

Para consultar:

```js
Bot_Help('clicking')
```

> Importante: isso emula os cliques chamando a API interna do Cookie Clicker; não cria oito dispositivos físicos nem oito eventos reais de mouse.
> Validação: estrutura da V6.27 verificada no GitHub. Não houve execução dentro de uma sessão real do Cookie Clicker.
