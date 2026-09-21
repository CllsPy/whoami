# Novo design do Caracol - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

Esta feature vive em `plano/new-design/`, não em `.specs/features/`, por pedido do dono do projeto.
Os validadores recebem o caminho explícito: `validate_spec.py plano/new-design/spec.md`, `validate_tasks.py plano/new-design/tasks.md`.
O relatório do Verifier vai para `plano/new-design/validation.md`.

---

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: nenhum `AGENTS.md` ou `CONTRIBUTING.md`; `vitest.config.ts` (prazos, sem meta de cobertura); handoff de `.specs/STATE.md` (flake de socket na integração). Strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Modelo da arte (`src/caracolArt/model.ts`) | unit | Todos os ramos; 1:1 com ARTE-02 a ARTE-07, ARTE-12, ARTE-13, ARTE-15, LOJA-02 a LOJA-04, LISTA-01, LISTA-02, LISTA-04 | `tests/caracol-art.test.ts` | `npx vitest run tests/caracol-art.test.ts` |
| Desenho (`src/caracolArt/PlayerArt.tsx`, `SnailArt.tsx`) | unit (render em node) | Toda camada renderiza com o próprio `data-layer`; 15 peças × 2 personagens | `tests/caracol-avatar.test.ts` | `npx vitest run tests/caracol-avatar.test.ts` |
| Componentes de avatar (`src/CaracolAvatar.tsx`) | unit (render em node) | 1:1 com ARTE-01, ARTE-07 a ARTE-11, ARTE-13, MAPA-01 a MAPA-03 | `tests/caracol-avatar.test.ts` | `npx vitest run tests/caracol-avatar.test.ts` |
| Loja (`src/CaracolShop.tsx`) | unit (render + funções puras) | 1:1 com LOJA-01 a LOJA-12; comportamento movido fixado antes da mudança | `tests/caracol-shop.test.ts` | `npx vitest run tests/caracol-shop.test.ts` |
| Lista (`src/CaracolPlayers.tsx`) | unit (render) | 1:1 com LISTA-01 a LISTA-03; comportamento movido fixado antes da mudança | `tests/caracol-players.test.ts` | `npx vitest run tests/caracol-players.test.ts` |
| Mapa (`src/CaracolMap.tsx`) | unit (render) | 1:1 com MAPA-01 a MAPA-06; comportamento movido fixado antes da mudança | `tests/caracol-map.test.ts` | `npx vitest run tests/caracol-map.test.ts` |
| Splash (`src/caracolArt/splash.ts`, arquivo gerado) | unit | 1:1 com SPL-01 a SPL-04 | `tests/caracol-splash.test.ts` | `npx vitest run tests/caracol-splash.test.ts` |
| Ligação em `src/CaracolGame.tsx` | unit (teste-guarda que lê o fonte; nenhum teste importa o arquivo, que abre socket) | Ausência de `CosmeticAvatar`, helpers de mapa e `☠` | `tests/caracol-guard.test.ts` | `npx vitest run tests/caracol-guard.test.ts` |
| CSS (`src/styles.css`) | unit (teste-guarda) quando a spec exige remoção; senão none | Ausência de `.cosmetic-`, regras `circle` de token e glifos | `tests/caracol-guard.test.ts` | `npx vitest run tests/caracol-guard.test.ts` |
| Config e scripts (`vitest.config.ts`, `package.json`, `scripts/render-caracol-splash.ts`) | none | Build gate; o script é coberto pelo teste de deriva de SPL-03 | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute. Não há linter configurado no projeto (sem eslint, biome ou prettier); o typecheck faz esse papel.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários só em arquivos novos | `npx vitest run tests/caracol-art.test.ts tests/caracol-avatar.test.ts tests/caracol-shop.test.ts tests/caracol-players.test.ts tests/caracol-map.test.ts tests/caracol-splash.test.ts tests/caracol-guard.test.ts` (arquivos que ainda não existem são ignorados pelo filtro) |
| Full | Fim de cada fase | `npm test` |
| Build | Tasks que mexem em ligação, CSS ou config, e fim da feature | `npm run typecheck && npm run build && npm test` |

**Flake conhecido**: `tests/game.integration.test.ts` falha às vezes com `Timeout esperando <evento>` (handoff de `.specs/STATE.md`).
Se isso acontecer no gate Full ou Build, reexecute uma vez e registre no commit da task. Nunca trate como verde uma falha que se repete.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Fundação

Infra de teste e o modelo puro da arte.

```
T1
T2 -> T3 -> T4
```

### Phase 2: Desenho e componentes

O desenho portado do estudo e o componente que o recorta.

```
T5 -> T7
T6 -> T7
T7 -> T8 -> T9
```

### Phase 3: Loja e interface (P1)

A loja com a peça em destaque, e o fim do `CosmeticAvatar`.

```
T10 -> T11 -> T12 -> T14
T13 -> T14
```

### Phase 4: Lista e provador (P2)

```
T15 -> T16
T17
```

### Phase 5: Mapa (P2)

```
T18 -> T20
T19 -> T20
T20 -> T21
```

### Phase 6: Splash (P3)

```
T22 -> T23
```

---

## Task Breakdown

### Phase 1: Fundação

#### T1: Habilitar JSX nos testes

**What**: Adicionar `esbuild: { jsx: 'automatic' }` ao `vitest.config.ts`, com um comentário dizendo que sem isso o vitest não renderiza `.tsx` ("React is not defined").
**Where**: `vitest.config.ts`
**Depends on**: None
**Reuses**: O bloco de comentário que já explica os prazos no mesmo arquivo
**Requirement**: infraestrutura para ARTE-01, ARTE-07 a ARTE-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `vitest.config.ts` tem `esbuild: { jsx: 'automatic' }`
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: o mesmo número de testes de antes, todos passando

**Tests**: none
**Gate**: build

**Commit**: `test(caracol): let vitest render tsx components`

---

#### T2: Modelo da arte: paleta, peças e recortes

**What**: Criar `CARACOL_ART_PALETTE`, `CARACOL_ART_ITEM_IDS`, `CARACOL_ART_CROPS` e `caracolArtViewBox` com os valores das tabelas do design.
**Where**: `src/caracolArt/model.ts`
**Depends on**: None
**Reuses**: `CROPS` de `plano/new-design/estudo/arte.mjs`; tokens de `src/styles.css:9-26`
**Requirement**: ARTE-05, ARTE-07, ARTE-12, ARTE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-art.test.ts` prova que o conjunto de `CARACOL_ART_ITEM_IDS` é igual ao conjunto de ids de `CARACOL_COSMETIC_CATALOG` (ARTE-05)
- [ ] Teste confere `caracolArtViewBox` para os 7 recortes dos 2 personagens contra a tabela do design (ARTE-07)
- [ ] Teste lê `:root` de `src/styles.css` e confere `ink`, `paper`, `acid`, `acidDark`, `coral`, `sky` e `lavender` contra `--night`, `--paper`, `--acid`, `--acid-dark`, `--coral`, `--sky` e `--lavender` (ARTE-12)
- [ ] Teste confere `skin = #c78261`, `shell = #d86b51` e `snailBody = #efb37d` (ARTE-15)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): add the art model with palette and crops`

---

#### T3: Camadas visíveis

**What**: Implementar `caracolArtLayers(wearer, outfit)`, que devolve as camadas visíveis na ordem de desenho do design.
**Where**: `src/caracolArt/model.ts` (modify)
**Depends on**: T2
**Reuses**: A ordem de `layerPlan` em `plano/new-design/estudo/arte.mjs`
**Requirement**: ARTE-02, ARTE-03, ARTE-04, ARTE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Outfit vazio do jogador devolve `['legs', 'pants-default', 'arms', 'shirt-default', 'head', 'fringe', 'eyes', 'mouth']` (ARTE-02)
- [ ] Outfit vazio do caracol devolve `['body', 'stalks', 'head']` (ARTE-02)
- [ ] Outfit completo devolve a ordem do design, com uma camada por slot
- [ ] Com boné, `fringe` some; sem boné, aparece (ARTE-03)
- [ ] Com óculos, `eyes` some; sem óculos, aparece (ARTE-04)
- [ ] Id fora de `CARACOL_ART_ITEM_IDS` num slot vira o default do slot, sem lançar erro (ARTE-06)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): resolve which art layers an outfit shows`

---

#### T4: Tons e comparação de outfit

**What**: Implementar `caracolPlayerTone`, `caracolShopItemTone`, `sameCaracolOutfit` e `CARACOL_INK_MIN_PX`.
**Where**: `src/caracolArt/model.ts` (modify)
**Depends on**: T3
**Reuses**: `CARACOL_COSMETIC_SLOTS` de `shared/caracol.ts`
**Requirement**: ARTE-13, LOJA-02, LOJA-03, LOJA-04, LISTA-01, LISTA-02, LISTA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `caracolPlayerTone` coberto nas 8 combinações de `isYou`, `isTarget` e `alive`, com prioridade `dead` > `target` > `you` > `default` (LISTA-01, LISTA-02, LISTA-04)
- [ ] `caracolShopItemTone`: equipada devolve `equipped`, mesmo com saldo zero (LOJA-02); não comprada com `coins < price` devolve `unaffordable` (LOJA-03); não comprada com `coins === price` devolve `default`; comprada e não equipada devolve `default` mesmo com `coins < price` (LOJA-04)
- [ ] `sameCaracolOutfit` devolve `true` para dois objetos diferentes com os mesmos valores e `false` quando um slot difere (ARTE-13)
- [ ] `CARACOL_INK_MIN_PX === 56`
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): add medallion tones and outfit comparison`

---

### Phase 2: Desenho e componentes

#### T5: Arte do jogador

**What**: Portar o desenho do jogador para JSX em `PLAYER_ART`, uma função por camada, cada uma devolvendo `<g data-layer="<chave>">`.
**Where**: `src/caracolArt/PlayerArt.tsx`
**Depends on**: T1, T3
**Reuses**: `playerBase` e `playerItems` de `plano/new-design/estudo/arte.mjs`, sem mudar coordenadas nem cores
**Requirement**: ARTE-01, ARTE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `PLAYER_ART` é `Record<PlayerArtLayer, …>`, então o TypeScript recusa camada faltando
- [ ] `tests/caracol-avatar.test.ts` renderiza cada camada dentro de `<svg>` e encontra exatamente um `data-layer` com a chave dela
- [ ] A camada `shirt-striped` referencia três `clipPath` distintos, montados pelo `ids.clip` recebido
- [ ] A camada `head` usa `#c78261` (ARTE-15)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): draw the player art layers`

---

#### T6: Arte do caracol

**What**: Portar o desenho do caracol para JSX em `SNAIL_ART`, uma função por camada.
**Where**: `src/caracolArt/SnailArt.tsx`
**Depends on**: T1, T3
**Reuses**: `snailBase` e `snailItems` de `plano/new-design/estudo/arte.mjs`
**Requirement**: ARTE-01, ARTE-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SNAIL_ART` é `Record<SnailArtLayer, …>`
- [ ] Teste renderiza cada camada e encontra exatamente um `data-layer` com a chave dela
- [ ] A camada `body` usa `#d86b51` na concha e `#efb37d` no corpo (ARTE-15)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): draw the snail art layers`

---

#### T7: CaracolFigure

**What**: Criar `CaracolFigure`, o `<svg>` que monta as camadas de `caracolArtLayers` no `viewBox` do recorte, com ids de `useId`, tinta a partir de 56 px e `React.memo` com `sameFigureProps`.
**Where**: `src/CaracolAvatar.tsx`
**Depends on**: T5, T6
**Reuses**: O filtro de tinta do estudo; `caracolArtViewBox` e `sameCaracolOutfit` de T2 e T4
**Requirement**: ARTE-01, ARTE-07, ARTE-09, ARTE-10, ARTE-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Para cada uma das 15 peças nos 2 personagens, a saída tem exatamente um `data-layer="<id>"` e nenhuma outra peça daquele slot (ARTE-01)
- [ ] O `viewBox` renderizado é igual a `caracolArtViewBox` nos 14 pares de personagem e recorte (ARTE-07)
- [ ] Com `sizePx = 55` não há atributo `filter`; com `56` há, e o id referenciado existe no mesmo `<svg>` (ARTE-09)
- [ ] Duas figuras no mesmo `renderToStaticMarkup` não compartilham nenhum id (ARTE-10)
- [ ] `sameFigureProps` devolve `true` com outfits iguais em objetos novos e `false` quando o recorte muda (ARTE-13)
- [ ] O `<svg>` tem `aria-hidden="true"`
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): add the figure component that crops the art`

---

#### T8: CaracolMedallion

**What**: Criar `CaracolMedallion`, o retrato circular em HTML, com tom, selo e `--medallion-size`.
**Where**: `src/CaracolAvatar.tsx` (modify)
**Depends on**: T7
**Reuses**: `CaracolFigure`; o markup do design
**Requirement**: ARTE-08, ARTE-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O wrapper tem `role="img"` e o `aria-label` recebido, e o SVG interno tem `aria-hidden="true"` (ARTE-11)
- [ ] O desenho fica dentro de `.caracol-medallion.tone-<tom>` (ARTE-08)
- [ ] `size={40}` produz `--medallion-size:40px` e nenhum `width` inline
- [ ] O tom `equipped` renderiza `.badge-check`, o tom `dead` renderiza `.badge-skull`, e os outros tons não renderizam selo
- [ ] Sem `crop`, o recorte é `portrait`
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): add the portrait medallion`

---

#### T9: Estilos do medalhão

**What**: Adicionar o bloco `.caracol-avatar`, `.caracol-medallion`, os tons e os selos ao CSS, incluindo o tamanho de 68 px do card da loja dentro da media query de 620 px.
**Where**: `src/styles.css` (modify)
**Depends on**: T8
**Reuses**: Tokens `--acid`, `--acid-dark`, `--coral` e `--night`
**Requirement**: ARTE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Círculo com `border-radius: 50%`, `overflow: hidden`, fundo `#fffdf8` e tamanho por `var(--medallion-size)`
- [ ] Anéis: `you` acid-dark; `target` coral; `equipped` ácido com contorno night; `default` night fino
- [ ] `dead` com `filter: grayscale(1)` e `opacity: .55`; nenhum outro tom usa cinza
- [ ] `unaffordable` mantém a peça em cor e troca o anel sólido por `outline: 2px dashed var(--muted-dark)` com `outline-offset: 1px`
- [ ] Em ≤ 620 px, a prévia da loja mostra o corpo inteiro com 120 px de altura e o retrato com 72 px
- [ ] Os selos ficam fora do círculo, no canto superior direito (check) e inferior direito (caveira)
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`

**Tests**: none
**Gate**: build

**Commit**: `style(caracol): style the portrait medallion and its tones`

---

### Phase 3: Loja e interface (P1)

#### T10: Extrair a loja

**What**: Mover `ShopDrawer` e `cosmeticSlotLabel` para um arquivo próprio como `CaracolShopDrawer`, sem mudar markup nem comportamento, e fazer `CaracolGame` importar de lá.
**Where**: `src/CaracolShop.tsx` (new file; CaracolGame only switches to importing it)
**Depends on**: T1
**Reuses**: `src/CaracolGame.tsx:688-732`; o precedente de `CaracolRoulette.tsx`
**Requirement**: LOJA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-shop.test.ts` fixa o comportamento atual: título "Seu guarda-roupa" na aba `player` e "O guarda-roupa do caracol" na aba `snail` (LOJA-05); botão "Equipado" desabilitado para a peça equipada, "Usar" para a comprada, "Comprar" com o preço para a não comprada, desabilitado quando `coins < price`
- [ ] O teste não importa `CaracolGame.tsx`
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `refactor(caracol): move the shop drawer to its own file`

---

#### T11: Cards da loja com o recorte do slot

**What**: Trocar o avatar do card por `CaracolMedallion` de 88 px, no recorte do slot da peça, com o tom de `caracolShopItemTone`.
**Where**: `src/CaracolShop.tsx` (modify)
**Depends on**: T10, T8, T4
**Reuses**: O `previewOutfit` que o card já calcula
**Requirement**: LOJA-01, LOJA-02, LOJA-03, LOJA-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Nos 15 cards de cada aba, o `viewBox` do medalhão é o recorte do slot da peça (LOJA-01)
- [ ] O medalhão do card mostra a peça do card e as outras peças equipadas nos outros slots (LOJA-01)
- [ ] Peça equipada: `tone-equipped` e `.badge-check` (LOJA-02)
- [ ] Não comprada com saldo menor que `item.price`: `tone-unaffordable` (LOJA-03)
- [ ] Os demais casos: `tone-default` (LOJA-04)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): show each shop item close up on the character`

---

#### T12: Prévia e abas da loja

**What**: Trocar a prévia por corpo inteiro (176 px de altura) e retrato (112 px), e os avatares das abas por medalhões de 32 px.
**Where**: `src/CaracolShop.tsx` (modify)
**Depends on**: T11
**Reuses**: `CaracolFigure` e `CaracolMedallion`
**Requirement**: LOJA-06, LOJA-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A prévia tem uma figura com o `viewBox` do recorte `full` e um medalhão `portrait`, os dois com o outfit equipado da aba (LOJA-06)
- [ ] Cada aba tem um medalhão de 32 px com o outfit equipado do próprio personagem, seja qual for a aba ativa (LOJA-07)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): show the full body and portrait in the shop preview`

---

#### T13: Trocar os avatares em CaracolGame

**What**: Usar `CaracolMedallion` na legenda (24 px), no bolso (64 px), no cartão do caracol (72 px) e na linha da lista (40 px, tom `default` por enquanto), e apagar `CosmeticAvatar`.
**Where**: `src/CaracolGame.tsx` (modify)
**Depends on**: T8
**Reuses**: Os `aria-label` que cada ponto já passa
**Requirement**: ARTE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-guard.test.ts` lê os `.tsx` de `src/` e não encontra `CosmeticAvatar` nem `cosmetic-avatar` (ARTE-14)
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `feat(caracol): use the portrait medallion across the game screen`

---

#### T14: Remover o CSS antigo de avatar

**What**: Apagar `src/styles.css:911-969` e `:1016-1017` e ajustar os seletores que dimensionavam `.cosmetic-avatar`.
**Where**: `src/styles.css` (modify)
**Depends on**: T12, T13
**Reuses**: -
**Requirement**: ARTE-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O teste-guarda também lê `src/styles.css` e não encontra `.cosmetic-` (ARTE-14)
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `style(caracol): drop the css box avatars`

---

### Phase 4: Lista e provador (P2)

#### T15: Extrair a lista de jogadores

**What**: Mover o cartão "No mapa" (`src/CaracolGame.tsx:615`) para `CaracolPlayersCard`, quebrando o markup em linhas legíveis sem mudar o resultado.
**Where**: `src/CaracolPlayers.tsx` (new file; CaracolGame only switches to importing it)
**Depends on**: T13
**Reuses**: `PlayerEffects` de `src/CaracolRoulette.tsx:102`
**Requirement**: preparação para LISTA-01 a LISTA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-players.test.ts` fixa o comportamento atual: título "1 pessoa" e "N pessoas"; classes `is-you`, `is-target` e `is-dead` nas linhas certas; selos "alvo" e "morta"
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `refactor(caracol): move the player list to its own file`

---

#### T16: Tons na lista

**What**: Dar a cada linha o tom de `caracolPlayerTone` e trocar o glifo `☠` do morto pelo medalhão com tom `dead`.
**Where**: `src/CaracolPlayers.tsx` (modify)
**Depends on**: T15, T4
**Reuses**: `CaracolMedallion`
**Requirement**: LISTA-01, LISTA-02, LISTA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Linha sua: `tone-you` (LISTA-01); linha do alvo: `tone-target` (LISTA-02)
- [ ] Linha de morto: `tone-dead`, `aria-label` "<nick> morta", nenhum `☠` no markup (LISTA-03)
- [ ] Linha sua e do alvo: `tone-target`; linha de morto e alvo: `tone-dead`
- [ ] O medalhão é filho direto da linha, fora do `div` de texto (risco de `.caracol-player-row div span`)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): mark you, the target and the dead on list portraits`

---

#### T17: Provador

**What**: Adicionar `shopPreviewReducer`, `shopPreview` e `shopCardHandlers`, pôr o medalhão do card dentro de um botão "Provar <nome>" com `aria-pressed`, e ligar ao card e à prévia.
**Where**: `src/CaracolShop.tsx` (modify)
**Depends on**: T12
**Reuses**: O `previewOutfit` do card
**Requirement**: LOJA-08, LOJA-09, LOJA-10, LOJA-11, LOJA-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `try` guarda a peça e `shopPreview` devolve o outfit com a peça no slot e o rótulo "Provando" (LOJA-08)
- [ ] `leave` limpa a prova, e o rótulo volta a "Visual atual" com o outfit equipado (LOJA-09)
- [ ] `tab` limpa a prova (LOJA-10)
- [ ] Com espiões, cada handler de `shopCardHandlers`, inclusive o `onClick` do medalhão, chama só `dispatch`, nunca `onPurchase` nem `onEquip` (LOJA-11)
- [ ] `toggle` numa peça fora de prova passa a prová-la; `toggle` na peça em prova desfaz (LOJA-12)
- [ ] O render tem, em cada card, um `button` com `aria-label` "Provar <nome>" e `aria-pressed="false"`; com a peça em prova, `aria-pressed="true"` (LOJA-12)
- [ ] Render inicial mostra "Visual atual"
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): try items on in the shop preview`

---

### Phase 5: Mapa (P2)

#### T18: Tokens do mapa

**What**: Criar `CaracolMapPlayer` e `CaracolMapSnail`.
**Where**: `src/CaracolAvatar.tsx` (modify)
**Depends on**: T8
**Reuses**: `CaracolFigure`; as cores de halo de `src/styles.css:971-974`
**Requirement**: MAPA-01, MAPA-02, MAPA-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com raio 9 e com raio 7, o círculo do `clipPath` tem o raio pedido, e o anel tem a classe do tom (MAPA-01)
- [ ] A figura do jogador usa o `viewBox` do recorte `portrait` e não tem `filter` de tinta
- [ ] `CaracolMapSnail` em `(x, y)` renderiza a figura `full` em `x − 20`, `y − 38`, com 40 × 40 (MAPA-02)
- [ ] Tom `dead`: o grupo referencia um filtro `feColorMatrix type="saturate" values="0"` com id da instância, e o anel é tracejado (MAPA-03)
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): add portrait tokens for the map`

---

#### T19: Extrair o mapa e a legenda

**What**: Mover `BrazilMap`, `project`, `featurePath` e a legenda (`src/CaracolGame.tsx:599`, `:640-661`, `:734-741`) para um arquivo próprio, sem mudar o resultado.
**Where**: `src/CaracolMap.tsx` (new file; CaracolGame only switches to importing it)
**Depends on**: T13
**Reuses**: O código movido, inclusive `mapPlayerAvatar`, `mapDeadAvatar` e `mapSnailAvatar`, que T20 apaga
**Requirement**: MAPA-04 (fixado antes da mudança)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-map.test.ts` fixa o comportamento atual com um GeoJSON de dois estados: um `path` por estado; token do caracol e rota presentes com `lat`/`lon`; nenhum dos dois com `lat: null` (MAPA-04); rótulo de nick para você, alvo e mortos
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `refactor(caracol): move the brazil map to its own file`

---

#### T20: Retratos no mapa e na legenda

**What**: Usar `CaracolMapPlayer` (raio 9 para você e alvo, 7 para os demais, tom de `caracolPlayerTone`) e `CaracolMapSnail`, apagar os três helpers antigos, e desenhar "mortos" na legenda como o halo tracejado.
**Where**: `src/CaracolMap.tsx` (modify)
**Depends on**: T18, T19
**Reuses**: `caracolPlayerTone`
**Requirement**: MAPA-01, MAPA-02, MAPA-03, MAPA-04, MAPA-05, MAPA-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Com um estado de quatro jogadores (você, alvo, morto, comum), cada token tem o raio e o tom certos (MAPA-01, MAPA-03)
- [ ] O caracol aparece como figura `full` com `lat`/`lon` e some, junto com a rota, com `null` (MAPA-02, MAPA-04)
- [ ] A legenda não tem `☠`, e o item "mortos" usa o halo tracejado (MAPA-05)
- [ ] Com os jogadores passados fora de ordem, os tokens saem no markup na ordem mortos, demais, alvo, você (MAPA-06)
- [ ] O teste-guarda não encontra `mapPlayerAvatar`, `mapDeadAvatar` nem `mapSnailAvatar` em `src/`
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): draw players and the snail on the map as portraits`

---

#### T21: Limpar o CSS do mapa e da lista

**What**: Apagar `.map-avatar-*`, `.map-snail-*`, `.map-dead-avatar`, `.snail-token circle/text`, `.legend-skull` e `.caracol-skull`, e trocar `.map-player circle`, `.map-player-you circle` e `.map-player-target circle` por `.map-medallion-ring.tone-*`.
**Where**: `src/styles.css` (modify)
**Depends on**: T20, T16
**Reuses**: As cores de halo atuais
**Requirement**: LISTA-03, MAPA-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O teste-guarda não encontra, em `src/styles.css`, `.map-avatar-`, `.map-snail-`, `.map-dead-avatar`, `.caracol-skull`, `.legend-skull`, nem uma regra que termine em `circle` depois de `.map-player` ou `.snail-token`
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `style(caracol): drop the old map glyph styles`

---

### Phase 6: Splash (P3)

#### T22: Gerador da splash

**What**: Criar `renderCaracolSplash()`, que devolve o SVG da splash descrito no design.
**Where**: `src/caracolArt/splash.ts`
**Depends on**: T7
**Reuses**: `CaracolFigure` via `renderToStaticMarkup`; texto e fundo de `public/icons/caracol-splash.svg`
**Requirement**: SPL-01, SPL-02, SPL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `tests/caracol-splash.test.ts` confere `viewBox="0 0 1170 2532"` (SPL-04), o fundo `#151525`, o texto `CARACOL` e a figura do caracol sem nenhum `data-layer` de peça (SPL-01)
- [ ] A saída não tem `href`, `url(` para fora de `#…` nem `@import` (SPL-02)
- [ ] O texto `CARACOL` está em `y="1610"`, abaixo do medalhão (fim em `y = 1466`)
- [ ] Duas chamadas seguidas devolvem texto idêntico
- [ ] Gate check passes: quick
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(caracol): render the pwa splash from the new art`

---

#### T23: Script da splash e arquivo gerado

**What**: Criar o script que grava `public/icons/caracol-splash.svg`, o comando `npm run splash:caracol`, regenerar o arquivo e adicionar o teste de deriva.
**Where**: `scripts/render-caracol-splash.ts`
**Depends on**: T22
**Reuses**: `tsx --tsconfig tsconfig.app.json` (verificado para compilar o JSX)
**Requirement**: SPL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `package.json` tem `"splash:caracol": "tsx --tsconfig tsconfig.app.json scripts/render-caracol-splash.ts"`
- [ ] `npm run splash:caracol` regrava o arquivo, e um segundo `git diff` depois de rodar de novo vem vazio
- [ ] O teste de deriva compara o arquivo com `renderCaracolSplash()` e falha se diferirem (SPL-03)
- [ ] Gate check passes: `npm run typecheck && npm run build && npm test`
- [ ] Test count: suíte anterior intacta + os testes novos

**Tests**: unit
**Gate**: build

**Commit**: `build(caracol): add the splash generator script`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1
          T2 → T3 → T4
Phase 2:  T5 → T7
          T6 → T7 → T8 → T9
Phase 3:  T10 → T11 → T12 → T14
          T13 → T14
Phase 4:  T15 → T16
          T17
Phase 5:  T18 → T20
          T19 → T20 → T21
Phase 6:  T22 → T23
```

Execução estritamente sequencial dentro de cada fase. São 23 tasks, então no Execute a skill oferece sub-agentes em lotes de ~7 tasks por fases inteiras: fases 1-2 (9), 3-4 (8), 5-6 (6).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: JSX nos testes | 1 config | ✅ Granular |
| T2: Paleta, peças, recortes | 3 constantes + 1 função, 1 arquivo | ⚠️ OK, coeso |
| T3: Camadas visíveis | 1 função | ✅ Granular |
| T4: Tons e comparação | 3 funções pequenas, 1 arquivo | ⚠️ OK, coeso |
| T5: Arte do jogador | 1 mapa de camadas | ✅ Granular |
| T6: Arte do caracol | 1 mapa de camadas | ✅ Granular |
| T7: CaracolFigure | 1 componente | ✅ Granular |
| T8: CaracolMedallion | 1 componente | ✅ Granular |
| T9: CSS do medalhão | 1 bloco de CSS | ✅ Granular |
| T10: Extrair loja | 1 movimento | ✅ Granular |
| T11: Cards da loja | 1 trecho de componente | ✅ Granular |
| T12: Prévia e abas | 1 trecho de componente | ✅ Granular |
| T13: Pontos de uso em CaracolGame | 4 trocas iguais + 1 remoção, 1 arquivo | ⚠️ OK, coeso |
| T14: CSS antigo | 1 remoção | ✅ Granular |
| T15: Extrair lista | 1 movimento | ✅ Granular |
| T16: Tons na lista | 1 trecho de componente | ✅ Granular |
| T17: Provador | 1 reducer + 2 helpers ligados, 1 arquivo | ⚠️ OK, coeso |
| T18: Tokens do mapa | 2 componentes irmãos, 1 arquivo | ⚠️ OK, coeso |
| T19: Extrair mapa | 1 movimento | ✅ Granular |
| T20: Retratos no mapa | 1 trecho de componente | ✅ Granular |
| T21: CSS do mapa e lista | 1 remoção | ✅ Granular |
| T22: Gerador da splash | 1 função | ✅ Granular |
| T23: Script da splash | 1 script (+ linha no `package.json` e arquivo gerado) | ⚠️ OK, coeso |

## Diagram-Definition Cross-Check

Só dependências dentro da mesma fase aparecem no diagrama; as que apontam para fases anteriores ficam só no `Depends on`.

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | nenhuma seta | ✅ Match |
| T2 | None | nenhuma seta | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T1, T3 (fase 1) | nenhuma seta na fase 2 | ✅ Match |
| T6 | T1, T3 (fase 1) | nenhuma seta na fase 2 | ✅ Match |
| T7 | T5, T6 | T5 → T7, T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T1 (fase 1) | nenhuma seta na fase 3 | ✅ Match |
| T11 | T10, T8 (fase 2), T4 (fase 1) | T10 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T8 (fase 2) | nenhuma seta de entrada na fase 3 | ✅ Match |
| T14 | T12, T13 | T12 → T14, T13 → T14 | ✅ Match |
| T15 | T13 (fase 3) | nenhuma seta de entrada na fase 4 | ✅ Match |
| T16 | T15, T4 (fase 1) | T15 → T16 | ✅ Match |
| T17 | T12 (fase 3) | nenhuma seta na fase 4 | ✅ Match |
| T18 | T8 (fase 2) | nenhuma seta de entrada na fase 5 | ✅ Match |
| T19 | T13 (fase 3) | nenhuma seta de entrada na fase 5 | ✅ Match |
| T20 | T18, T19 | T18 → T20, T19 → T20 | ✅ Match |
| T21 | T20, T16 (fase 4) | T20 → T21 | ✅ Match |
| T22 | T7 (fase 2) | nenhuma seta na fase 6 | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Config | none | none | ✅ OK |
| T2 | Modelo da arte | unit | unit | ✅ OK |
| T3 | Modelo da arte | unit | unit | ✅ OK |
| T4 | Modelo da arte | unit | unit | ✅ OK |
| T5 | Desenho | unit | unit | ✅ OK |
| T6 | Desenho | unit | unit | ✅ OK |
| T7 | Componentes de avatar | unit | unit | ✅ OK |
| T8 | Componentes de avatar | unit | unit | ✅ OK |
| T9 | CSS sem remoção exigida | none | none | ✅ OK |
| T10 | Loja (+ ligação em CaracolGame) | unit | unit | ✅ OK |
| T11 | Loja | unit | unit | ✅ OK |
| T12 | Loja | unit | unit | ✅ OK |
| T13 | Ligação em CaracolGame | unit (guarda) | unit | ✅ OK |
| T14 | CSS com remoção exigida | unit (guarda) | unit | ✅ OK |
| T15 | Lista (+ ligação em CaracolGame) | unit | unit | ✅ OK |
| T16 | Lista | unit | unit | ✅ OK |
| T17 | Loja | unit | unit | ✅ OK |
| T18 | Componentes de avatar | unit | unit | ✅ OK |
| T19 | Mapa (+ ligação em CaracolGame) | unit | unit | ✅ OK |
| T20 | Mapa | unit | unit | ✅ OK |
| T21 | CSS com remoção exigida | unit (guarda) | unit | ✅ OK |
| T22 | Splash | unit | unit | ✅ OK |
| T23 | Script (+ arquivo gerado) | unit (deriva) | unit | ✅ OK |
