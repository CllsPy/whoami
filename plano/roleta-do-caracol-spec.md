# Roleta do Caracol - Specification

## Problem Statement

No Caracol, o jogador passa horas parado na própria cidade e só tem duas decisões para tomar: acelerar o caracol ou mandar ele atrás de outra pessoa.
Entre uma decisão e outra não acontece nada que seja dele, e o jogo vira esperar.
A Roleta dá a cada jogador um momento próprio por dia, com sorte e azar na mesma medida, sem abrir brecha na economia de moedas.

Insumos aprovados: [roleta-do-caracol.md](roleta-do-caracol.md) (design) e [roleta-ui/](roleta-ui/) (interface).
Onde esta spec e o design doc divergirem, vale esta spec.

## Goals

- [ ] Todo jogador vivo com cidade consegue girar a roleta uma vez a cada 24 horas e recebe exatamente um dos 13 itens.
- [ ] A chance de buff e de debuff é 1/2 cada, independente do tamanho das listas.
- [ ] Nenhum item altera a taxa de ganho de moedas por tempo.
- [ ] Efeitos e cooldown sobrevivem a reinício do servidor e à morte do jogador.
- [ ] A interface segue o estudo aprovado em `plano/roleta-ui/`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Qualquer item que mude a taxa de ganho de moedas por um período | O pagamento de moedas é preguiçoso e em lote; um multiplicador por tempo atravessa o fim do efeito e paga errado sem gerar erro. Decisão registrada na seção 5 do design doc. |
| Obstáculo | Removido pelo dono do projeto. |
| Remover, trocar ou devolver um item sorteado | A regra é conviver com o que veio. Remover debuff anularia o risco do giro. |
| Tempo de espera global para o Raio | Mitigação prevista no design doc só se o Raio incomodar em produção. |
| Push notification para resultado da roleta ou expiração de efeito | Os avisos existentes (alvo, aproximação, morte) já disparam push quando o efeito muda o alvo. Avisar cada giro seria ruído. |
| Esconder o ETA do histórico de quem está com Blooper | O histórico é global e público. Censurar por leitor exigiria paginação por conta. Vazamento aceito. |
| Painel de administração para ajustar durações | As durações vivem no catálogo em código; ajustar é um commit. |
| Ranking ou estatística de giros | Não pedido. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Janela do giro | 24 horas corridas desde `lastRouletteAt`, no relógio do servidor | Sem código de fuso, sem corrida às 00:00, e segue AD-003. | y |
| Quem pode girar | Só jogador vivo e com cidade | Cogumelo, Star e Bullet Bill não fazem sentido sem cidade; girar morto seria sorteio sem risco. | y |
| Itens que pedem alvo | Viram carga guardada, gasta depois por uma ação | O jogador não sabe o que vai sair, então não escolhe alvo no momento do giro. | y |
| Mesmo item de novo com efeito ativo | Renova o prazo e recarrega as cargas ao máximo, nunca soma | Duas Bananas seguidas valem 4h a partir de agora. | y |
| Visibilidade dos efeitos | Pública, na lista de jogadores | É o que transforma a roleta em jogo social. | y |
| Morte e efeitos | A morte não remove efeito nenhum | Senão morrer de propósito vira a saída para qualquer debuff. | y |
| Bumerangue é carga, não instantâneo | 1 carga, validade 24h, gasta com o evento `caracol:boomerang` | Precisa de alvo escolhido depois do giro. O design doc listava como instantâneo na seção 3; esta spec corrige. | n |
| Arredondamento da Bomba | O saldo passa a `floor(saldo / 2)` | Valor exato e testável. Com saldo ímpar o jogador perde a moeda do meio. | n |
| Arredondamento do Bumerangue | Transfere `floor(saldo_do_alvo × 0,2)` | Valor exato e testável. Com alvo pobre o roubo pode ser zero e a carga é gasta mesmo assim. | n |
| Escudo contra ataque | O atacante paga o custo ou gasta a carga, o escudo absorve e o ataque não tem efeito | É o que dá valor ao escudo, como no Mario Kart: o casco se gasta no escudo. | n |
| Resposta ao atacante bloqueado | `ok: true` com estado atualizado, mais notice `shield` ao atacante e ao alvo | A ação aconteceu e foi cobrada. Uma falha não pode mudar estado, então não serve. | n |
| Dois Cascos vermelhos ativos ao mesmo tempo | Vale a trava criada mais recentemente; quando ela vence, volta a valer a anterior se ainda estiver ativa | Só existe um alvo no mundo. A regra é determinística e testável. | n |
| Star e Casco vermelho no mesmo jogador | Star prevalece | Invencibilidade é a promessa mais forte do jogo. | y |
| Destino do Bullet Bill | A cidade do catálogo `cityById` mais distante da posição atual do caracol; empate pelo menor `id` | Determinístico e sem depender de outros jogadores. | n |
| Onde o fator de preço vale | Moeda e Raio multiplicam redirect, aceleração, desconto e loja | "Tudo que você compra". O desconto pessoal continua valendo só onde já vale hoje. | n |
| O que o Congelamento bloqueia | redirect, buy-speed, buy-discount, shop-purchase e boomerang | São as ações que gastam ou atacam. Vestir item comprado e escolher cidade seguem livres. | n |
| O que o Blooper esconde | Posição, distância e ETA do caracol. O nome do alvo continua visível | O alvo já aparece na lista de jogadores; esconder só no cartão seria incoerente. | n |
| Frase do cartão sem alvo | "Dormindo em Brasília" só quando o caracol está em Brasília; fora dela, "Sem alvo no mapa" | Hoje a frase mente depois de toda morte, porque o caracol fica onde alcançou a pessoa. | n |
| Expiração | Derivada de `expiresAt` comparado ao relógio, nunca um timer agendado | Mesmo princípio registrado no handoff de `powerup-de-dica`: estado de tempo é derivado. | y |
| Serialização | Giro e bumerangue passam pela fila já usada pela loja (`enqueueShopMutation`) | A fila é global e já resolve a corrida de checar e depois gravar. | y |
| Sorteio injetável | `CaracolManagerOptions.random`, padrão `Math.random` | Igual ao `clock` já injetado. Sem isso a feature é intestável. | y |
| Testes de integração | Preferir o manager com `clock`, `random` e `tickOnce()` a sockets reais quando o comportamento não depende do transporte | O handoff registra flake intermitente de timeout de socket em `tests/game.integration.test.ts`. | n |

**Open questions:** none - tudo resolvido ou registrado acima.

---

## User Stories

### P1: Girar a roleta uma vez por dia ⭐ MVP

**User Story**: Como jogador vivo no mapa, quero girar a roleta uma vez por dia e receber um item surpresa, para ter um momento meu entre as decisões de acelerar e redirecionar.

**Why P1**: É a feature. Sem o giro nada mais existe.

**Acceptance Criteria**:

1. WHEN um jogador vivo e com cidade envia `caracol:roulette` e não girou nas últimas 24 horas THEN o servidor SHALL sortear exatamente um item do catálogo de 13 e aplicá-lo à conta dele. <!-- ROL-01 -->
2. The system SHALL sortear em dois passos: primeiro a categoria com probabilidade 1/2 para buff e 1/2 para debuff, depois o item com probabilidade uniforme dentro da lista sorteada. <!-- ROL-02 -->
3. WHEN o giro é aplicado THEN o servidor SHALL gravar `lastRouletteAt` com o instante do relógio do servidor. <!-- ROL-03 -->
4. IF o jogador envia `caracol:roulette` antes de `lastRouletteAt + 24h` THEN o servidor SHALL responder `ROULETTE_COOLDOWN` e não alterar estado nenhum. <!-- ROL-04 -->
5. IF o jogador está morto ou sem cidade THEN o servidor SHALL responder `NEEDS_CITY` e não alterar estado nenhum. <!-- ROL-05 -->
6. IF o socket não está autenticado THEN o servidor SHALL responder `NOT_AUTHENTICATED`. <!-- ROL-06 -->
7. WHEN dois `caracol:roulette` da mesma conta chegam antes do primeiro terminar THEN o servidor SHALL aplicar exatamente um giro e responder `ROULETTE_COOLDOWN` ao outro. <!-- ROL-07 -->
8. WHERE `CaracolManagerOptions.random` é informado, o manager SHALL usá-lo nos dois passos do sorteio. <!-- ROL-08 -->
9. WHEN o giro é aplicado THEN o ack SHALL conter o `itemId` sorteado, a categoria e o estado atualizado. <!-- ROL-09 -->
10. WHEN o giro é aplicado THEN o servidor SHALL gravar uma entrada de histórico do tipo `roulette` com o nick do jogador e o nome do item. <!-- ROL-10 -->
11. IF a gravação no store falha durante o giro THEN o servidor SHALL responder `ROULETTE_FAILED` e manter em memória o estado anterior, com o giro ainda disponível. <!-- ROL-11 -->
12. The system SHALL expor em `you.roulette` o instante `availableAt` (ou `null` quando disponível) e o `lastItemId` do último giro. <!-- ROL-12 -->

**Independent Test**: Com `clock` e `random` fixos, girar, conferir o item e o histórico; girar de novo e receber `ROULETTE_COOLDOWN`; avançar o relógio 24 horas e girar com sucesso.

---

### P1: A regra de ouro das moedas ⭐ MVP

**User Story**: Como dono do jogo, quero a garantia de que nenhum item muda a taxa de ganho de moedas por tempo, para que a roleta não crie moeda do nada em silêncio.

**Why P1**: É o risco que motivou reescrever o catálogo. Precisa de guarda automática desde o primeiro commit.

**Acceptance Criteria**:

1. The system SHALL produzir, para uma conta com qualquer um dos 13 efeitos ativo, o mesmo ganho de moedas por tempo que produziria sem efeito nenhum. <!-- EFX-01 -->
2. WHEN um efeito altera o saldo de alguém THEN o servidor SHALL liquidar as moedas pendentes dessa conta com `settleCoins` antes de alterar o saldo. <!-- EFX-02 -->

**Independent Test**: Para cada item, aplicar o efeito, avançar o relógio 1 hora com a conta offline e comparar o ganho com uma conta de controle sem efeito.

---

### P1: Ciclo de vida dos efeitos ⭐ MVP

**User Story**: Como jogador, quero que o que eu tirei valha pelo tempo prometido e depois acabe sozinho, para que a roleta seja justa e previsível.

**Why P1**: Todos os itens com tempo ou carga dependem disso.

**Acceptance Criteria**:

1. WHEN o mesmo item sai de novo para o mesmo dono com o efeito ainda ativo THEN o servidor SHALL renovar `expiresAt` para agora mais a duração do item e recarregar as cargas ao máximo, sem somar prazos nem cargas. <!-- EFX-03 -->
2. WHILE o relógio do servidor é maior ou igual a `expiresAt` de um efeito, o servidor SHALL tratá-lo como inexistente em todas as regras. <!-- EFX-04 -->
3. WHEN o tick encontra um efeito vencido THEN o servidor SHALL removê-lo do store e emitir `caracol:notice` com código `effect-expired` aos sockets do dono. <!-- EFX-05 -->
4. WHEN a última carga de um efeito com carga é gasta THEN o servidor SHALL remover o efeito. <!-- EFX-06 -->
5. WHEN o jogador morre THEN o servidor SHALL manter todos os efeitos ativos dele. <!-- EFX-07 -->
6. The system SHALL não expor nenhum evento ou ação que remova um efeito antes do prazo. <!-- EFX-08 -->
7. The system SHALL restaurar efeitos ativos e `lastRouletteAt` depois de reiniciar o servidor. <!-- PER-01 -->
8. WHEN o servidor inicia sobre um banco que já tem `caracol_accounts` THEN o schema SHALL adicionar `last_roulette_at` com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` e criar `caracol_effects` sem perder dados existentes. <!-- PER-02 -->
9. The system SHALL garantir no máximo um efeito por combinação de escopo, dono e item. <!-- PER-03 -->
10. The system SHALL oferecer o mesmo comportamento de efeitos e roleta no `MemoryCaracolStore` usado pelos testes. <!-- PER-04 -->

**Independent Test**: Aplicar Banana, reiniciar o manager sobre o mesmo store e conferir que o efeito continua; avançar 4 horas, rodar `tickOnce()` e conferir remoção e notice.

---

### P1: Buffs ⭐ MVP

**User Story**: Como jogador com sorte, quero que cada buff faça exatamente o que o cartão promete, para confiar na roleta.

**Why P1**: Metade dos giros cai aqui.

**Acceptance Criteria**:

1. WHEN sai Cogumelo THEN o servidor SHALL dar ao jogador 1 carga de Cogumelo com validade de 24 horas. <!-- EFX-10 -->
2. WHILE o jogador vivo e com cidade tem carga de Cogumelo, WHEN ele envia `caracol:select-city` com cidade válida THEN o servidor SHALL trocar a cidade e gastar a carga. <!-- EFX-11 -->
3. IF o jogador vivo e com cidade envia `caracol:select-city` sem carga de Cogumelo THEN o servidor SHALL responder `CITY_LOCKED`. <!-- EFX-12 -->
4. WHEN um jogador morto escolhe cidade THEN o servidor SHALL aceitar sem gastar a carga de Cogumelo. <!-- EFX-13 -->
5. WHEN sai Super Star THEN o servidor SHALL aplicar o efeito por 2 horas. <!-- EFX-14 -->
6. WHILE o jogador tem Star, a escolha automática de alvo SHALL excluí-lo dos candidatos. <!-- EFX-15 -->
7. WHEN Star é aplicado ao alvo atual THEN o servidor SHALL escolher outro alvo antes de responder o ack, mantendo o caracol na posição em que está. <!-- EFX-16 -->
8. IF um redirect aponta para um jogador com Star THEN o servidor SHALL responder `TARGET_PROTECTED` sem cobrar. <!-- EFX-17 -->
9. IF o caracol chega à cidade de um jogador com Star THEN o servidor SHALL não eliminá-lo. <!-- EFX-18 -->
10. WHEN sai Flor de Fogo THEN o servidor SHALL dar 3 cargas com validade de 2 horas. <!-- EFX-19 -->
11. WHILE o autor tem carga de Flor de Fogo, WHEN um redirect dele é aceito THEN o servidor SHALL cobrar 0 moedas, gastar 1 carga e manter `redirectLevel` inalterado. <!-- EFX-20 -->
12. WHEN sai Bumerangue THEN o servidor SHALL dar 1 carga com validade de 24 horas. <!-- EFX-21 -->
13. WHEN o jogador com carga envia `caracol:boomerang` para um alvo válido THEN o servidor SHALL transferir `floor(saldo_do_alvo × 0,2)` moedas do alvo para o autor e gastar a carga. <!-- EFX-22 -->
14. IF o alvo do bumerangue não existe, está morto, está sem cidade ou é o próprio autor THEN o servidor SHALL responder `TARGET_NOT_FOUND` e manter a carga. <!-- EFX-23 -->
15. IF o jogador envia `caracol:boomerang` sem carga THEN o servidor SHALL responder `NO_CHARGE`. <!-- EFX-24 -->
16. WHEN sai Bullet Bill THEN o servidor SHALL mover a cidade do jogador para a cidade de `cityById` mais distante da posição atual do caracol, com empate decidido pelo menor `id`, ignorando a trava de cidade. <!-- EFX-25 -->
17. WHEN sai Moeda THEN o servidor SHALL aplicar o efeito por 6 horas. <!-- EFX-26 -->
18. WHILE o jogador tem Moeda, o servidor SHALL multiplicar por 0,5 os preços que ele paga em redirect, aceleração, desconto e loja. <!-- EFX-27 -->
19. WHEN sai Casco defensivo THEN o servidor SHALL dar 1 carga com validade de 24 horas. <!-- EFX-28 -->
20. WHEN um redirect ou bumerangue de outro jogador mira o dono de um Casco defensivo THEN o servidor SHALL cobrar o atacante, gastar a carga do escudo, anular o efeito do ataque e emitir notice `shield` aos dois. <!-- EFX-29 -->
21. The system SHALL não gastar o Casco defensivo com resultado da própria roleta nem com a chegada natural do caracol. <!-- EFX-30 -->

**Independent Test**: Com `random` forçado para cada buff, aplicar e verificar o efeito observável: troca de cidade, alvo pulado, redirect a custo zero, moedas transferidas, cidade de destino, preço pela metade, ataque absorvido.

---

### P1: Debuffs ⭐ MVP

**User Story**: Como jogador sem sorte, quero que cada debuff doa exatamente o que o cartão promete, nem mais nem menos, para que o azar seja parte do jogo e não um bug.

**Why P1**: A outra metade dos giros.

**Acceptance Criteria**:

1. WHEN sai Casco vermelho THEN o servidor SHALL aplicar o efeito por 2 horas e tornar o dono o alvo antes de responder o ack. <!-- EFX-31 -->
2. WHILE existe Casco vermelho ativo de um jogador vivo, com cidade e sem Star, a escolha de alvo SHALL retornar o dono da trava criada mais recentemente. <!-- EFX-32 -->
3. IF um redirect aponta para qualquer jogador que não seja o dono da trava vigente THEN o servidor SHALL responder `TARGET_LOCKED` sem cobrar. <!-- EFX-33 -->
4. WHILE o mesmo jogador tem Star e Casco vermelho, o servidor SHALL aplicar a regra de Star. <!-- EFX-34 -->
5. WHEN sai Bomba THEN o servidor SHALL mudar o saldo do jogador para `floor(saldo / 2)`. <!-- EFX-35 -->
6. WHEN sai Raio THEN o servidor SHALL aplicar um efeito de escopo mundo por 1 hora. <!-- EFX-36 -->
7. WHILE o Raio está ativo, o servidor SHALL multiplicar por 2 os preços de redirect, aceleração, desconto e loja de todos os jogadores. <!-- EFX-37 -->
8. The system SHALL calcular cada preço como `max(piso, floor(base × 0,75^desconto × fatores))`, com piso 4 no redirect e 1 nos demais, o desconto pessoal só em redirect e aceleração, e fatores 0,5 da Moeda e 2 do Raio multiplicados entre si. <!-- EFX-38 -->
9. WHEN sai Blooper THEN o servidor SHALL aplicar o efeito por 2 horas. <!-- EFX-39 -->
10. WHILE o jogador tem Blooper, o estado enviado a ele SHALL trazer `lat`, `lon`, `distanceKm` e `etaMs` do caracol como `null` e `hidden` como `true`. <!-- EFX-40 -->
11. WHILE um jogador tem Blooper, o estado enviado aos demais SHALL continuar completo. <!-- EFX-41 -->
12. WHEN sai Congelamento THEN o servidor SHALL aplicar o efeito por 1 hora. <!-- EFX-42 -->
13. WHILE o jogador está congelado, o servidor SHALL recusar `caracol:redirect`, `caracol:buy-speed`, `caracol:buy-discount`, `caracol:shop-purchase` e `caracol:boomerang` com `FROZEN` e sem alterar estado. <!-- EFX-43 -->
14. WHILE o jogador está congelado, o servidor SHALL aceitar `caracol:shop-equip` e `caracol:select-city`. <!-- EFX-44 -->
15. WHEN sai Banana THEN o servidor SHALL aplicar o efeito por 4 horas. <!-- EFX-45 -->
16. WHILE o alvo atual tem Banana, o servidor SHALL mover o caracol a 1,5 vez a velocidade global e usar esse mesmo valor no ETA do estado e no aviso de aproximação. <!-- EFX-46 -->
17. The system SHALL manter `speedLevel` e a velocidade global exibida inalterados por qualquer efeito. <!-- EFX-47 -->

**Independent Test**: Com `random` forçado para cada debuff, aplicar e verificar: alvo travado, saldo pela metade, preço em dobro para outro jogador, estado sem posição, ação recusada, caracol mais rápido só contra o dono.

---

### P1: O cartão e a revelação ⭐ MVP

**User Story**: Como jogador, quero ver quando posso girar, o que saiu e o que está valendo, sem sair da tela do mapa.

**Why P1**: Sem interface a feature não existe para o jogador.

**Acceptance Criteria**:

1. The system SHALL exibir o cartão da roleta na coluna de controle, entre a carteira e o cartão do caracol, conforme `plano/roleta-ui/`. <!-- UI-01 -->
2. WHILE o giro está disponível, o cartão SHALL exibir o título "A roleta" e o botão "Girar a roleta" habilitado. <!-- UI-02 -->
3. WHILE o giro está em espera, o cartão SHALL exibir como título o tempo restante até `availableAt`, calculado com `serverNow` segundo AD-003 e atualizado a cada minuto. <!-- UI-03 -->
4. WHEN o ack do giro chega com sucesso THEN a interface SHALL abrir o takeover com símbolo, nome, categoria, descrição e duração do item, fechado pelo botão "Entendi". <!-- UI-04 -->
5. WHILE o jogador tem efeitos ativos, o cartão SHALL listar cada um com símbolo e tempo ou cargas restantes. <!-- UI-05 -->
6. The system SHALL exibir na lista de jogadores o símbolo de cada efeito ativo de cada jogador. <!-- UI-06 -->
7. WHILE o jogador tem Blooper, o mapa SHALL omitir o token e a rota do caracol, e o cartão do caracol SHALL mostrar distância e chegada como indisponíveis. <!-- UI-07 -->
8. WHILE não há alvo e o caracol está fora das coordenadas de Brasília, o cartão do caracol SHALL exibir "Sem alvo no mapa" em vez de "Dormindo em Brasília". <!-- UI-08 -->
9. WHILE o jogador está morto ou sem cidade, o cartão SHALL exibir o botão desabilitado e explicar que é preciso escolher uma cidade. <!-- UI-09 -->
10. WHILE o jogador está congelado, o cartão SHALL explicar o bloqueio e o tempo restante. <!-- UI-10 -->
11. The system SHALL desenhar os 13 símbolos como SVG inline de traço único, sem emoji. <!-- UI-11 -->
12. WHILE Moeda ou Raio está ativo, os botões de compra SHALL exibir o preço já calculado pelo servidor. <!-- UI-12 -->
13. IF o giro recebe `ROULETTE_COOLDOWN` THEN a interface SHALL exibir o estado de espera, sem mensagem de erro. <!-- UI-13 -->
14. WHILE o jogador tem carga de Bumerangue, o cartão SHALL oferecer campo de nick e botão para lançar. <!-- UI-14 -->
15. WHERE o sistema do jogador pede `prefers-reduced-motion`, o takeover SHALL aparecer sem animação de giro. <!-- UI-15 -->
16. The system SHALL definir `--ink-soft` em `:root` de `src/styles.css`, usado hoje por `.caracol-discount-note` sem definição. <!-- UI-16 -->

**Independent Test**: Rodar o app, girar, ver o takeover, fechar e conferir o cartão em espera com o efeito listado; abrir numa segunda conta e ver o símbolo do efeito na lista de jogadores.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | ROL-05, EFX-11, EFX-23, EFX-24. O nick do bumerangue é limpo pelo mesmo `cleanNickname` do redirect. |
| Failure / partial-failure states | ROL-11: nada muda em memória se a gravação falhar. |
| Idempotency / retry / duplicate handling | ROL-04, ROL-07, UI-13: repetir o giro devolve cooldown e a interface mostra o estado, sem erro. |
| Auth boundaries & rate limits | ROL-06. O próprio cooldown de 24 horas é o limite. |
| Concurrency / ordering | ROL-07 e a premissa de serialização pela fila da loja. |
| Data lifecycle / expiry | EFX-03 a EFX-06, PER-01 a PER-03. |
| Observability | ROL-10 grava histórico de todo giro. Falhas seguem o `console.error` existente em `afterReady`. Nada além disso: N/A because o Caracol não tem métricas nem tracing hoje. |
| External-dependency failure | ROL-11 cobre o PostgreSQL. Push: N/A because a roleta não envia push. |
| State-transition integrity | ROL-05, EFX-07, EFX-16, EFX-31, EFX-34. |

---

## Edge Cases

- IF todos os jogadores vivos estão com Star THEN o servidor SHALL deixar o caracol sem alvo e parado, e a interface SHALL seguir UI-08.
- IF o dono de um Casco vermelho morre THEN a escolha de alvo SHALL ignorar a trava dele, porque ela só vale para jogador vivo e com cidade.
- IF o alvo de um bumerangue tem 0 a 4 moedas THEN o servidor SHALL transferir 0 e gastar a carga.
- WHEN o jogador tira Bomba com saldo 1 THEN o saldo SHALL ficar 0.
- WHEN Moeda e Raio estão ativos ao mesmo tempo THEN o preço SHALL ser o preço sem efeito.
- WHEN o Bullet Bill é aplicado ao alvo atual THEN o jogador SHALL continuar sendo o alvo, agora mais longe.
- WHEN o giro é o primeiro da conta THEN `lastRouletteAt` nulo SHALL contar como disponível.
- IF o jogador tira Congelamento THEN o giro seguinte já estaria bloqueado pelo cooldown, e a interface SHALL mostrar os dois motivos sem conflito.

---

## Protocolo

Referência para a implementação, derivada das ACs acima.

| Direção | Nome | Payload | Resposta |
| --- | --- | --- | --- |
| cliente → servidor | `caracol:roulette` | nenhum | `CaracolRouletteResult` |
| cliente → servidor | `caracol:boomerang` | `{ targetNickname }` | `CaracolActionResult` |
| servidor → cliente | `caracol:notice` | novos códigos `roulette`, `effect-expired`, `shield` | - |
| histórico | `CaracolHistoryType` | novo tipo `roulette` | - |

Códigos de falha novos: `ROULETTE_COOLDOWN`, `ROULETTE_FAILED`, `NO_CHARGE`, `TARGET_PROTECTED`, `TARGET_LOCKED`, `FROZEN`.

Campos novos no estado: `you.roulette`, `you.effects`, `world.effects`, `players[].effectItemIds`, `world.snail.hidden`, e `lat`, `lon`, `distanceKm`, `etaMs` do caracol passam a aceitar `null`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ROL-01 | P1: Girar a roleta | - | Pending |
| ROL-02 | P1: Girar a roleta | - | Pending |
| ROL-03 | P1: Girar a roleta | - | Pending |
| ROL-04 | P1: Girar a roleta | - | Pending |
| ROL-05 | P1: Girar a roleta | - | Pending |
| ROL-06 | P1: Girar a roleta | - | Pending |
| ROL-07 | P1: Girar a roleta | - | Pending |
| ROL-08 | P1: Girar a roleta | - | Pending |
| ROL-09 | P1: Girar a roleta | - | Pending |
| ROL-10 | P1: Girar a roleta | - | Pending |
| ROL-11 | P1: Girar a roleta | - | Pending |
| ROL-12 | P1: Girar a roleta | - | Pending |
| EFX-01 | P1: Regra de ouro | - | Pending |
| EFX-02 | P1: Regra de ouro | - | Pending |
| EFX-03 | P1: Ciclo de vida | - | Pending |
| EFX-04 | P1: Ciclo de vida | - | Pending |
| EFX-05 | P1: Ciclo de vida | - | Pending |
| EFX-06 | P1: Ciclo de vida | - | Pending |
| EFX-07 | P1: Ciclo de vida | - | Pending |
| EFX-08 | P1: Ciclo de vida | - | Pending |
| PER-01 | P1: Ciclo de vida | - | Pending |
| PER-02 | P1: Ciclo de vida | - | Pending |
| PER-03 | P1: Ciclo de vida | - | Pending |
| PER-04 | P1: Ciclo de vida | - | Pending |
| EFX-10 | P1: Buffs | - | Pending |
| EFX-11 | P1: Buffs | - | Pending |
| EFX-12 | P1: Buffs | - | Pending |
| EFX-13 | P1: Buffs | - | Pending |
| EFX-14 | P1: Buffs | - | Pending |
| EFX-15 | P1: Buffs | - | Pending |
| EFX-16 | P1: Buffs | - | Pending |
| EFX-17 | P1: Buffs | - | Pending |
| EFX-18 | P1: Buffs | - | Pending |
| EFX-19 | P1: Buffs | - | Pending |
| EFX-20 | P1: Buffs | - | Pending |
| EFX-21 | P1: Buffs | - | Pending |
| EFX-22 | P1: Buffs | - | Pending |
| EFX-23 | P1: Buffs | - | Pending |
| EFX-24 | P1: Buffs | - | Pending |
| EFX-25 | P1: Buffs | - | Pending |
| EFX-26 | P1: Buffs | - | Pending |
| EFX-27 | P1: Buffs | - | Pending |
| EFX-28 | P1: Buffs | - | Pending |
| EFX-29 | P1: Buffs | - | Pending |
| EFX-30 | P1: Buffs | - | Pending |
| EFX-31 | P1: Debuffs | - | Pending |
| EFX-32 | P1: Debuffs | - | Pending |
| EFX-33 | P1: Debuffs | - | Pending |
| EFX-34 | P1: Debuffs | - | Pending |
| EFX-35 | P1: Debuffs | - | Pending |
| EFX-36 | P1: Debuffs | - | Pending |
| EFX-37 | P1: Debuffs | - | Pending |
| EFX-38 | P1: Debuffs | - | Pending |
| EFX-39 | P1: Debuffs | - | Pending |
| EFX-40 | P1: Debuffs | - | Pending |
| EFX-41 | P1: Debuffs | - | Pending |
| EFX-42 | P1: Debuffs | - | Pending |
| EFX-43 | P1: Debuffs | - | Pending |
| EFX-44 | P1: Debuffs | - | Pending |
| EFX-45 | P1: Debuffs | - | Pending |
| EFX-46 | P1: Debuffs | - | Pending |
| EFX-47 | P1: Debuffs | - | Pending |
| UI-01 | P1: Cartão e revelação | - | Pending |
| UI-02 | P1: Cartão e revelação | - | Pending |
| UI-03 | P1: Cartão e revelação | - | Pending |
| UI-04 | P1: Cartão e revelação | - | Pending |
| UI-05 | P1: Cartão e revelação | - | Pending |
| UI-06 | P1: Cartão e revelação | - | Pending |
| UI-07 | P1: Cartão e revelação | - | Pending |
| UI-08 | P1: Cartão e revelação | - | Pending |
| UI-09 | P1: Cartão e revelação | - | Pending |
| UI-10 | P1: Cartão e revelação | - | Pending |
| UI-11 | P1: Cartão e revelação | - | Pending |
| UI-12 | P1: Cartão e revelação | - | Pending |
| UI-13 | P1: Cartão e revelação | - | Pending |
| UI-14 | P1: Cartão e revelação | - | Pending |
| UI-15 | P1: Cartão e revelação | - | Pending |
| UI-16 | P1: Cartão e revelação | - | Pending |

**Coverage:** 78 total, 0 mapped to tasks, 78 unmapped ⚠️ (esperado: a fase de tasks ainda não rodou)

---

## Success Criteria

- [ ] O teste guarda-costas de EFX-01 passa para os 13 itens.
- [ ] Em 10 000 giros com `random` real, a proporção de buffs fica entre 48% e 52%.
- [ ] Um jogador consegue girar, ler o resultado e voltar ao mapa em menos de 10 segundos.
- [ ] Reiniciar o servidor no meio de um efeito não muda o tempo restante que o jogador vê.
- [ ] A suíte existente do Caracol continua passando sem alteração de asserção.
