# Novo design do Caracol: retratos no traço Waldo - Specification

## Problem Statement

Os avatares do Caracol são montados com caixas de CSS (`CosmeticAvatar`, `src/CaracolGame.tsx:663`), e as peças da loja viram manchas de poucos pixels.
O relógio é um círculo de 10% do avatar e os óculos são uma barra de 7% de altura (`src/styles.css:948-949`), então no card da loja o relógio Digital e o Dourado diferem por um ponto de uns 6 px.
O jogador compra sem ver o que compra, e no mapa não reconhece o caracol vestido.
O estudo aprovado mostra que o padrão dos retratos do Where's Waldo resolve isso: busto em círculo, tinta preta, cor chapada e a peça como identidade do personagem.

Insumos aprovados: o canvas [Caracol no traço Waldo](https://claude.ai/artifact/RfVXMMf32X9vnRfh4byRKg) e o protótipo [estudo/arte.mjs](estudo/arte.mjs).
Onde esta spec e o estudo divergirem, vale esta spec.

## Goals

- [ ] Cada uma das 15 peças aparece no card da loja no recorte do próprio slot, nas abas Você e Caracol (30 cards).
- [ ] Um único desenho por personagem alimenta bolso, cartão do caracol, lista, abas, legenda, loja, mapa e splash.
- [ ] `grep -rn "cosmetic-avatar\|CosmeticAvatar" src` não encontra nada no fim da feature.
- [ ] Nenhum arquivo em `server/` ou `shared/` muda: o protocolo, o banco e o catálogo seguem iguais.
- [ ] Um avatar não re-renderiza no tick de 1 s quando o outfit dele não mudou.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ícone do app (`public/icons/caracol.svg`, favicon, apple-touch-icon) | Precisa ler em 16 px; o retrato não foi desenhado para esse tamanho. Decisão separada. |
| Símbolos e revelação da Roleta | Já têm estudo aprovado próprio em `plano/roleta-ui/`. |
| Peças novas, preços ou slots novos no catálogo | A feature troca o desenho, não a economia. |
| Escolha de tom de pele, cabelo ou corpo base | Não pedido, e o catálogo não tem slot para isso. |
| Animação dos personagens (acenar, piscar, andar) | Não pedido; o tick de 1 s já re-renderiza a tela. |
| Converter a splash em PNG por tamanho de aparelho | O formato SVG atual é mantido. A dúvida sobre o suporte do iOS fica registrada como risco no design. |
| Personagens do Waldo ou marcas que os identifiquem | Copiamos a gramática visual, não os personagens: nada de gorro com pompom listrado vermelho e branco. |
| Mudanças em servidor, protocolo ou banco | O outfit continua sendo o mesmo `Record<slot, itemId \| null>`. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Direção visual | Gramática do Waldo com a paleta do jogo: busto em círculo, tinta `#151525`, cor chapada, sem sombra | Estudo aprovado pelo dono do projeto ("gostei bastante") | y |
| Recorte do card da loja | O recorte do slot da peça: boné mostra a cabeça, relógio mostra o pulso, calça mostra as pernas | É o que torna a peça legível no card | y |
| Retrato (busto) | Bolso, cartão do caracol, lista, abas e legenda usam o recorte `portrait` | Estudo aprovado | y |
| Relógio no retrato do jogador | O jogador acena com o braço erguido, e o relógio fica no pulso levantado | Sem isso o relógio fica fora do busto | y |
| Peças do caracol | Relógio preso na antena, óculos na ponta dos olhos, boné entre as antenas | O caracol não tem pulso nem rosto humano | y |
| Estado "sem saldo" na loja | Peça em cor, com anel tracejado `#6e6a7b` (`--muted-dark`) no lugar do anel sólido | O cinza do estudo apagava a cor da peça, que é o que o card existe para mostrar, e repetia o visual de "morta". Decidido no polish com os dois lado a lado em [estudo/polish-desktop.png](estudo/polish-desktop.png) | y |
| Estado "equipado" na loja | Anel ácido e selo de check no canto superior direito | Estudo aprovado | y |
| Morta na lista | Retrato em cinza com selo de caveira desenhado, no lugar do glifo `☠` | Estudo aprovado (prancha "No mapa") | y |
| Provador | Passar o ponteiro ou o foco num card veste a peça na prévia | Estudo aprovado (prancha da loja) | y |
| Tom de pele do jogador | `#c78261` para todos, o mesmo do avatar atual (`src/styles.css:933`) | Os dois tons renderizaram bem no polish; manter evita mudar a aparência de todo jogador. O protótipo já usa essa cor | y |
| Tinta tremida (filtro SVG) | Só quando o avatar tem 56 px ou mais | Conferido no render do polish: abaixo de 56 px o tremido só borra o traço, e o filtro custaria em cada token do mapa | n |
| Prioridade de tom quando a linha acumula estados | morta > alvo > você > padrão | Morte é o fato mais forte; alvo é perigo imediato; "você" já tem a faixa ácida na linha | n |
| Caracol no mapa | Desenho de corpo inteiro (a concha é a silhueta que se reconhece de longe) | O retrato esconderia a concha | n |
| Jogador no mapa | Retrato em círculo de raio 9 (você, alvo) ou 7 (demais), com anel da cor do tom | No desktop (0,95 px por unidade) o retrato lê. No celular (0,47) vira um ponto de 6 a 8 px em que só a cor do anel lê, como o boneco de hoje; raio maior só amontoa o Sudeste ([estudo/polish-mobile.png](estudo/polish-mobile.png)) | n |
| Morta no mapa | Retrato em cinza dentro do halo tracejado atual | Coerente com a lista | n |
| Visual da splash | Caracol sem peças | A splash é estática; o visual global muda durante o jogo | n |
| Ordem de desenho no mapa | Mortos embaixo, depois os demais, o alvo, e você por cima | No render do polish, o token de São Paulo sumia sob Guarulhos e Campinas | n |
| Provador sem mouse | O medalhão do card é um botão que alterna a prova | Com hover e foco apenas, o provador não existe no celular | n |
| Paleta da arte | Hex copiados para o módulo de arte, com teste de paridade contra `:root` | Atributos de apresentação SVG não aceitam `var()`, e a splash é arquivo estático | n |
| Testes de componente | `renderToStaticMarkup` em ambiente node, com `esbuild.jsx: 'automatic'` no `vitest.config.ts` | Verificado: sem essa opção o vitest falha com "React is not defined"; com ela, renderiza | y |
| Geração da splash | Script rodado com `tsx --tsconfig tsconfig.app.json` | Verificado: sem `--tsconfig` o tsx não compila o JSX | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Retratos no traço Waldo em toda a interface ⭐ MVP

**User Story**: Como jogador, quero ver meu personagem e o caracol como retratos desenhados, com as peças bem visíveis, para reconhecer o meu visual e o do caracol de relance.

**Why P1**: É a troca de linguagem visual. Sem ela a loja nova não tem o que mostrar.

**Acceptance Criteria**:

1. WHEN o outfit tem a peça X no slot S THEN o componente de arte SHALL renderizar exatamente uma camada `data-layer="X"` e nenhuma outra camada de peça do slot S. <!-- ARTE-01 -->
2. WHEN um slot do outfit é `null` THEN o componente SHALL não renderizar camada de peça desse slot, exceto camisa e calça do jogador, que SHALL renderizar as camadas `shirt-default` e `pants-default`. <!-- ARTE-02 -->
3. WHILE o jogador usa um boné, o componente SHALL omitir a camada `fringe`. <!-- ARTE-03 -->
4. WHILE o jogador usa óculos, o componente SHALL omitir a camada `eyes`, porque cada par de óculos desenha os próprios olhos. <!-- ARTE-04 -->
5. The system SHALL ter arte para os dois personagens de todo id de `CARACOL_COSMETIC_CATALOG`. <!-- ARTE-05 -->
6. IF o outfit contém um id sem arte THEN o componente SHALL tratar aquele slot como `null` e não lançar erro. <!-- ARTE-06 -->
7. WHEN o componente recebe um recorte THEN o `viewBox` do SVG SHALL ser o retângulo da tabela de recortes do [design](design.md#recortes) para aquele personagem e recorte. <!-- ARTE-07 -->
8. WHEN o avatar é um medalhão THEN o componente SHALL renderizar o desenho dentro de um elemento com a classe `caracol-medallion`, recortado em círculo e com fundo `#fffdf8`. <!-- ARTE-08 -->
9. WHEN o tamanho do avatar é 56 px ou mais THEN o componente SHALL aplicar o filtro de tinta; abaixo de 56 px SHALL renderizar sem atributo `filter`. <!-- ARTE-09 -->
10. WHEN dois avatares são renderizados na mesma página THEN os ids de `clipPath` e `filter` de um SHALL ser diferentes dos do outro. <!-- ARTE-10 -->
11. The medalhão SHALL ter `role="img"` com o `aria-label` recebido, e o SVG interno SHALL ter `aria-hidden="true"`. <!-- ARTE-11 -->
12. The paleta da arte SHALL usar os mesmos hex dos tokens `--night`, `--paper`, `--acid`, `--acid-dark`, `--coral`, `--sky` e `--lavender` de `:root` em `src/styles.css`. <!-- ARTE-12 -->
13. The comparação de props do avatar SHALL considerar iguais dois outfits com os mesmos valores por slot, mesmo sendo objetos diferentes, para que o avatar não re-renderize no tick. <!-- ARTE-13 -->
14. The system SHALL renderizar legenda do mapa, bolso, cartão do caracol e lista de jogadores com o componente novo, sem nenhuma ocorrência de `CosmeticAvatar` ou `cosmetic-avatar` em `src/`. <!-- ARTE-14 -->
15. The arte SHALL usar pele `#c78261` no jogador, e concha `#d86b51` e corpo `#efb37d` no caracol, as cores do avatar atual. <!-- ARTE-15 -->

**Independent Test**: Renderizar o componente com `renderToStaticMarkup` para cada peça e cada recorte e conferir camadas, `viewBox` e ids; abrir o jogo e ver bolso, cartão do caracol e lista com os retratos.

---

### P1: A loja mostra a peça em destaque ⭐ MVP

**User Story**: Como jogador na loja, quero ver cada peça em close no personagem da aba, para saber o que estou comprando sem ler o nome.

**Why P1**: É o pedido original: "seria mais fácil ver as mudanças visuais".

**Acceptance Criteria**:

1. WHEN a loja mostra o card de uma peça THEN o card SHALL renderizar o personagem da aba com o outfit equipado mais essa peça no slot dela, no recorte do slot. <!-- LOJA-01 -->
2. WHILE a peça está equipada, o medalhão do card SHALL ter o tom `equipped` e o selo de check. <!-- LOJA-02 -->
3. WHILE a peça não foi comprada e `you.coins < item.price`, o medalhão do card SHALL ter o tom `unaffordable`. <!-- LOJA-03 -->
4. IF nem LOJA-02 nem LOJA-03 valem para a peça THEN o medalhão do card SHALL ter o tom `default`. <!-- LOJA-04 -->
5. WHEN a aba ativa muda THEN título, descrição, prévia e todos os cards SHALL passar a usar o personagem da aba. <!-- LOJA-05 -->
6. The prévia da loja SHALL mostrar o personagem da aba de corpo inteiro (recorte `full`) e em retrato (recorte `portrait`), com o outfit equipado. <!-- LOJA-06 -->
7. The abas "Você" e "Caracol" SHALL mostrar o retrato de 32 px do outfit equipado de cada personagem. <!-- LOJA-07 -->

**Independent Test**: Renderizar a gaveta com um estado de exemplo e conferir, para cada card, o `viewBox` do recorte do slot e o tom; clicar em Usar e Comprar no jogo e ver o card mudar de tom.

---

### P2: Provador

**User Story**: Como jogador, quero passar o mouse numa peça e ver meu personagem inteiro com ela, para decidir antes de gastar moedas.

**Why P2**: O card já mostra a peça em close. O provador acrescenta o contexto do visual inteiro, mas a loja funciona sem ele.

**Acceptance Criteria**:

1. WHEN o ponteiro entra num card ou o foco entra num botão do card THEN a prévia SHALL mostrar o outfit equipado com a peça do card no slot dela e o rótulo "Provando". <!-- LOJA-08 -->
2. WHEN o ponteiro sai do card ou o foco sai do botão THEN a prévia SHALL voltar ao outfit equipado e ao rótulo "Visual atual". <!-- LOJA-09 -->
3. WHEN a aba ativa muda THEN a prova em curso SHALL ser descartada. <!-- LOJA-10 -->
4. The provador SHALL não chamar `onPurchase` nem `onEquip`. <!-- LOJA-11 -->
5. WHEN o jogador aciona o botão do medalhão de um card THEN a prévia SHALL provar a peça; acionar de novo SHALL desfazer a prova; o botão SHALL expor o estado em `aria-pressed`. <!-- LOJA-12 -->

**Independent Test**: No jogo, passar o mouse em "Cargo" e ver a prévia vestir a calça e dizer "Provando"; tirar o mouse e ver o visual equipado de volta, sem mudança de saldo. No celular, tocar no medalhão do card e ver a mesma prova.

---

### P2: Estados na lista de jogadores

**User Story**: Como jogador, quero ver de relance quem sou eu, quem é o alvo e quem morreu na lista, pelo próprio retrato.

**Why P2**: A lista já comunica esses estados por texto e borda. O retrato reforça, mas não é o que falta hoje.

**Acceptance Criteria**:

1. WHEN a linha é do próprio jogador THEN o medalhão SHALL ter o tom `you`. <!-- LISTA-01 -->
2. WHEN a linha é do alvo atual do caracol THEN o medalhão SHALL ter o tom `target`. <!-- LISTA-02 -->
3. WHEN o jogador da linha está morto THEN a linha SHALL mostrar o retrato com tom `dead` e o `aria-label` "<nick> morta", no lugar do glifo `☠`. <!-- LISTA-03 -->
4. IF mais de um estado vale para a mesma linha THEN o tom SHALL seguir a prioridade `dead` > `target` > `you` > `default`. <!-- LISTA-04 -->

**Independent Test**: Renderizar a lista com cinco jogadores (você, alvo, morto, você e alvo, comum) e conferir o tom de cada medalhão.

---

### P2: Mapa com retratos

**User Story**: Como jogador, quero reconhecer no mapa as pessoas pelo retrato e o caracol pela roupa do dia.

**Why P2**: O mapa funciona com os tokens atuais; a mudança é de leitura, não de regra.

**Acceptance Criteria**:

1. WHEN um jogador vivo aparece no mapa THEN o token SHALL ser o retrato dele recortado em círculo de raio 9 para você e para o alvo, e 7 para os demais, com o anel da cor do tom. <!-- MAPA-01 -->
2. WHILE a posição do caracol é conhecida, o token do caracol SHALL ser o desenho de corpo inteiro com o outfit global, com 40 unidades de largura e o pé sobre a posição. <!-- MAPA-02 -->
3. WHEN o jogador está morto THEN o token SHALL ser o retrato dele em cinza dentro do halo tracejado. <!-- MAPA-03 -->
4. IF `world.snail.lat` ou `world.snail.lon` é `null` (Blooper) THEN o mapa SHALL não renderizar o token do caracol nem a rota. <!-- MAPA-04 -->
5. The legenda do mapa SHALL representar "mortos" com o mesmo halo tracejado cinza do token, no lugar do glifo `☠`. <!-- MAPA-05 -->
6. The mapa SHALL desenhar os tokens na ordem mortos, demais, alvo, você, para que você e o alvo nunca fiquem cobertos. <!-- MAPA-06 -->

**Independent Test**: Renderizar os componentes de token com outfits de exemplo e conferir raio, anel e recorte; no jogo, tirar Blooper na roleta e ver o caracol sumir do mapa.

---

### P3: Splash do PWA com a arte nova

**User Story**: Como jogador que abre o Caracol pelo ícone do celular, quero ver o caracol no traço novo enquanto o app carrega.

**Why P3**: A splash aparece por um instante e só no PWA instalado.

**Acceptance Criteria**:

1. The arquivo `public/icons/caracol-splash.svg` SHALL ser gerado por `scripts/render-caracol-splash.ts` a partir do mesmo componente de arte, com fundo `#151525`, o retrato do caracol sem peças num medalhão e a palavra CARACOL. <!-- SPL-01 -->
2. The SVG da splash SHALL não ter referência externa: nenhum `href`, `url()` ou `@import` para fora do próprio arquivo. <!-- SPL-02 -->
3. IF o conteúdo de `public/icons/caracol-splash.svg` difere da saída atual do gerador THEN o teste de deriva SHALL falhar. <!-- SPL-03 -->
4. The splash SHALL manter `viewBox="0 0 1170 2532"`, as dimensões atuais. <!-- SPL-04 -->

**Independent Test**: Rodar `npm run splash:caracol`, abrir o SVG no navegador, e rodar a suíte para ver o teste de deriva passar.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | ARTE-06: id desconhecido vira slot vazio. Tamanho e recorte são props tipadas, chamadas só de dentro do cliente: N/A because não há entrada externa. |
| Failure / partial-failure states | ARTE-06. A renderização é pura e não faz I/O: N/A because não há falha parcial possível. |
| Idempotency / retry / duplicate handling | N/A because a feature não envia eventos ao servidor; LOJA-11 garante que o provador também não envia. |
| Auth boundaries & rate limits | N/A because só a apresentação muda; o servidor continua validando compra e equipamento como hoje. |
| Concurrency / ordering | ARTE-13 (payload a cada 1 s com objetos novos) e ARTE-10 (várias instâncias na mesma página). |
| Data lifecycle / expiry | N/A because nada é gravado. |
| Observability | N/A because a renderização acontece só no cliente; peça sem arte é pega no CI por ARTE-05, não em produção. |
| External-dependency failure | N/A because a arte é embutida no bundle e não depende de rede. A splash é arquivo estático servido pelo nginx. |
| State-transition integrity | LOJA-02 a LOJA-04 (tom do card deriva de comprada, equipada e saldo), LISTA-04 (prioridade), LOJA-10 e LOJA-12 (prova descartada na troca de aba e alternada pelo botão). |

---

## Edge Cases

- WHEN todos os slots do outfit são `null` THEN o jogador SHALL aparecer com camisa `shirt-default` (céu) e calça `pants-default` (jeans), e o caracol SHALL aparecer sem peças.
- WHEN o jogador equipa boné e óculos ao mesmo tempo THEN o retrato SHALL omitir franja e olhos e mostrar os olhos desenhados pelos óculos.
- WHEN a peça em prova é a mesma que já está equipada THEN a prévia SHALL mostrar o mesmo outfit, com o rótulo "Provando".
- IF o servidor aplica Moeda ou Raio THEN o tom `unaffordable` SHALL usar o `item.price` recebido, que já vem com o fator aplicado (`server/caracol/game.ts:1335`).
- WHEN o jogador é o alvo e está morto ao mesmo tempo THEN a linha SHALL mostrar o tom `dead`.
- WHEN a lista tem um único jogador THEN a lista SHALL renderizar um medalhão, sem erro de id duplicado.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ARTE-01 | P1: Retratos | T5, T6, T7 | Pending |
| ARTE-02 | P1: Retratos | T3 | Pending |
| ARTE-03 | P1: Retratos | T3 | Pending |
| ARTE-04 | P1: Retratos | T3 | Pending |
| ARTE-05 | P1: Retratos | T2 | Pending |
| ARTE-06 | P1: Retratos | T3 | Pending |
| ARTE-07 | P1: Retratos | T2, T7 | Pending |
| ARTE-08 | P1: Retratos | T8, T9 | Pending |
| ARTE-09 | P1: Retratos | T7 | Pending |
| ARTE-10 | P1: Retratos | T7 | Pending |
| ARTE-11 | P1: Retratos | T8 | Pending |
| ARTE-12 | P1: Retratos | T2 | Pending |
| ARTE-13 | P1: Retratos | T4, T7 | Pending |
| ARTE-14 | P1: Retratos | T13, T14 | Pending |
| ARTE-15 | P1: Retratos | T2, T5, T6 | Pending |
| LOJA-01 | P1: Loja | T11 | Pending |
| LOJA-02 | P1: Loja | T4, T11 | Pending |
| LOJA-03 | P1: Loja | T4, T11 | Pending |
| LOJA-04 | P1: Loja | T4, T11 | Pending |
| LOJA-05 | P1: Loja | T10 | Pending |
| LOJA-06 | P1: Loja | T12 | Pending |
| LOJA-07 | P1: Loja | T12 | Pending |
| LOJA-08 | P2: Provador | T17 | Pending |
| LOJA-09 | P2: Provador | T17 | Pending |
| LOJA-10 | P2: Provador | T17 | Pending |
| LOJA-11 | P2: Provador | T17 | Pending |
| LOJA-12 | P2: Provador | T17 | Pending |
| LISTA-01 | P2: Lista | T4, T16 | Pending |
| LISTA-02 | P2: Lista | T4, T16 | Pending |
| LISTA-03 | P2: Lista | T16, T21 | Pending |
| LISTA-04 | P2: Lista | T4 | Pending |
| MAPA-01 | P2: Mapa | T18, T20 | Pending |
| MAPA-02 | P2: Mapa | T18, T20 | Pending |
| MAPA-03 | P2: Mapa | T18, T20 | Pending |
| MAPA-04 | P2: Mapa | T19, T20 | Pending |
| MAPA-05 | P2: Mapa | T20, T21 | Pending |
| MAPA-06 | P2: Mapa | T20 | Pending |
| SPL-01 | P3: Splash | T22 | Pending |
| SPL-02 | P3: Splash | T22 | Pending |
| SPL-03 | P3: Splash | T23 | Pending |
| SPL-04 | P3: Splash | T22 | Pending |

**ID format:** `ARTE` (desenho e componente), `LOJA`, `LISTA`, `MAPA`, `SPL` (splash).

**Coverage:** 41 total, 41 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] O dono do projeto identifica as 15 peças pelo card, nas duas abas, sem ler o nome (UAT).
- [ ] `grep -rn "cosmetic-avatar\|CosmeticAvatar\|mapPlayerAvatar\|mapSnailAvatar" src` volta vazio.
- [ ] `npm run typecheck`, `npm run build` e `npm test` passam, e a suíte existente passa sem mudança de asserção.
- [ ] `git diff main --stat -- server shared` volta vazio.
- [ ] Com 20 jogadores no mapa, o React Profiler não mostra re-render de avatar num tick em que nenhum outfit mudou (UAT).
