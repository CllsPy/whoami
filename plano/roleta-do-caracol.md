# Roleta do Caracol

Uma vez por dia cada jogador aperta um botão e ganha um item surpresa.
Metade dos itens ajuda (buff), metade atrapalha (debuff).
A inspiração é o Mario Kart: você não escolhe o que vem, você lida com o que veio.

Este documento explica o que vamos construir, por que cada peça existe e onde as coisas podem dar errado.
Se você nunca mexeu no Caracol, comece pela seção 1.

---

## 1. Como o Caracol funciona hoje

Antes de adicionar qualquer coisa, precisa entender três fatos sobre o jogo.
Eles são estranhos e mudam tudo que vem depois.

**Fato 1: o jogador não se move.**
Você escolhe uma cidade do Brasil e fica lá parado.
Quem anda é o caracol.

**Fato 2: só existe um caracol e um alvo.**
O mundo inteiro compartilha a mesma partida.
O caracol persegue uma pessoa de cada vez, e quando alcança, essa pessoa perde todas as moedas.

**Fato 3: a velocidade do caracol é de todo mundo.**
Se alguém paga para acelerar, o caracol fica mais rápido para o jogo inteiro.
Não existe "minha velocidade" e "sua velocidade".

```
+---------------------------------------------------+
|                    O MUNDO                        |
|                                                   |
|   [ caracol ]  ---- persegue ---->  [ alvo ]      |
|   velocidade                        1 pessoa      |
|   global                            por vez       |
|                                                   |
|   [ jogador ] [ jogador ] [ jogador ]  parados    |
+---------------------------------------------------+
```

Por que isso importa?
Porque no Mario Kart o cogumelo "aumenta sua velocidade".
Aqui você não tem velocidade.
Então todo item precisou ser traduzido para algo que existe neste jogo.

As cinco coisas que realmente existem e dá para mexer:

```
+------------------------+  +------------------------+
| 1. SALDO DE MOEDAS     |  | 2. CUSTOS              |
| so mudanca na hora     |  | quanto voce paga       |
| (ver secao 5)          |  |                        |
+------------------------+  +------------------------+

+------------------------+  +------------------------+
| 3. ALVO                |  | 4. VELOCIDADE          |
| quem o caracol persegue|  | quao rapido ele vem    |
+------------------------+  +------------------------+

+------------------------+
| 5. INFORMACAO          |
| o que voce ve e pode   |
| fazer                  |
+------------------------+
```

Todo item da roleta mexe em uma dessas cinco caixas.
Nenhum item inventa uma caixa nova.
Se alguém propuser um item que não cabe em nenhuma delas, provavelmente o item está errado.

A caixa 1 tem uma regra especial e ela é o assunto da seção 5.
Leia aquela seção antes de inventar item novo.

---

## 2. Os 13 itens

### Buffs (te ajudam)

| Item | O que faz | Quanto dura |
|---|---|---|
| Cogumelo | Você pode mudar de cidade mesmo estando vivo. Normalmente a cidade fica travada. | 1 uso |
| Super Star | O caracol não consegue te escolher. Se já estava vindo, ele desiste. | 2h |
| Flor de Fogo | 3 redirecionamentos de graça. | 3 usos, expira em 2h |
| Flor Bumerangue | Rouba 20% das moedas de alguém e traz para você. | 1 uso, até 24h |
| Bullet Bill | Você é lançado para a cidade mais longe do caracol, automaticamente. | na hora |
| Moeda | Tudo que você compra custa metade. | 6h |
| Casco defensivo | Bloqueia o próximo ataque de outro jogador contra você. | até usar, máx 24h |

### Debuffs (te atrapalham)

| Item | O que faz | Quanto dura |
|---|---|---|
| Casco vermelho | O caracol te marca na hora e ninguém consegue tirar o foco de você. | 2h |
| Bomba | Perde metade das moedas na hora. | na hora |
| Raio | Tudo fica o dobro do preço para o jogo inteiro. Inclusive para você. | 1h |
| Blooper | Tinta na tela: você para de ver onde o caracol está. | 2h |
| Congelamento | Você não pode comprar, acelerar nem redirecionar. | 1h |
| Banana | O caracol anda 50% mais rápido quando está vindo atrás de você. | 4h |

### As regras que você não pode esquecer

Um jogador só gira **uma vez a cada 24 horas**.
São 24 horas corridas desde o último giro, não meia-noite.
Isso evita que todo mundo clique junto às 00:00 e evita código de fuso horário.

A chance é **50% buff e 50% debuff**, sempre.
Você não pode **remover um debuff**.
Só esperar acabar.

**Morrer não limpa nada.**
Isso é importante: se morrer limpasse os debuffs, todo mundo morreria de propósito para escapar da Banana.

O Casco defensivo bloqueia **ataque de outra pessoa**, nunca o que saiu da sua própria roleta.
Se você tirou Bomba, a Bomba explode. O escudo não tem nada a ver com isso.

---

## 3. Os três tipos de item

Parece que são 13 coisas diferentes para programar.
Não são. São três.

```
+---------------------+---------------------+---------------------+
| INSTANTANEO         | COM TEMPO           | COM CARGA           |
|                     |                     |                     |
| acontece e acabou   | vale ate a hora X   | vale N usos         |
|                     |                     |                     |
| Bomba               | Super Star          | Cogumelo            |
| Bullet Bill         | Moeda               | Flor de Fogo        |
|                     | Banana              | Casco defensivo     |
|                     | Blooper             | Bumerangue          |
|                     | Congelamento        |                     |
| nao salva no banco  | Casco vermelho      | salva no banco      |
| so muda a conta     | Raio                | com contador de uso |
|                     |                     |                     |
|                     | salva no banco      |                     |
|                     | com data de fim     |                     |
+---------------------+---------------------+---------------------+
```

E cada efeito pertence a alguém ou ao mundo:

```
+------------------------+       +------------------------+
| escopo: conta          |       | escopo: mundo          |
| afeta 1 jogador        |       | afeta todo mundo       |
| (12 itens)             |       | (so o Raio)            |
+------------------------+       +------------------------+
```

Se você programar bem esses três tipos, adicionar um item novo no futuro é escrever uma linha no catálogo.

---

## 4. O que muda no banco

Uma tabela nova, guardando os efeitos que estão valendo agora:

```
+--------------------------------------------------+
| caracol_effects                                  |
|--------------------------------------------------|
| id                                               |
| scope        'account' ou 'world'                |
| account_id   de quem e (nulo se for do mundo)    |
| item_id      'star', 'banana', ...               |
| expires_at   quando acaba                        |
| charges      quantos usos sobram (nulo se tempo) |
|--------------------------------------------------|
| UNIQUE (scope, account_id, item_id)              |
+--------------------------------------------------+
```

Aquele `UNIQUE` no final não é detalhe.
Ele é o que faz "tirar Banana duas vezes seguidas" renovar o prazo em vez de somar.
Sem ele, dois dias de azar viram 8h de Banana em vez de 4h.

E uma coluna nova na tabela de contas:

```
caracol_accounts + last_roulette_at    (quando girou pela ultima vez)
```

### Cuidado de verdade aqui

O arquivo `server/caracol/store.ts` cria as tabelas com `CREATE TABLE IF NOT EXISTS`.
Leia de novo: **IF NOT EXISTS**.
A tabela `caracol_accounts` já existe em produção.
Então esse comando não faz absolutamente nada nela, e sua coluna nova nunca vai aparecer.

Você precisa adicionar, no mesmo lugar:

```sql
ALTER TABLE caracol_accounts ADD COLUMN IF NOT EXISTS last_roulette_at TIMESTAMPTZ;
```

Isso já aconteceu antes no projeto.
Procure por `redirect_level` no `store.ts`: tem um `?? 0` defensivo na leitura que é a cicatriz exata desse problema.

---

## 5. A regra de ouro: nenhum item mexe na velocidade das moedas

Esta é a seção mais importante do documento.
Ela explica uma regra que parece arbitrária e não é.

**Nenhum item da roleta pode alterar a taxa de ganho de moedas por um período de tempo.**

Ganhar o dobro por 6h, parar de ganhar por 1h, ganhar como se estivesse online enquanto está offline: nada disso.
Já tivemos itens assim no rascunho e foram todos reescritos.

### Por quê

O jogo não soma moedas de segundo em segundo.
Ele é preguiçoso: quando você aparece, ele olha quanto tempo passou e paga tudo de uma vez.

```
voce sai as 10h           voce volta as 22h
     |                          |
     +------- 12 horas ---------+
                                |
                        "passaram 4320 intervalos
                         de 10 segundos, toma 4320 moedas"
```

Agora imagine um item que dobrasse as moedas por 6h, e o jogador ficasse 12h offline:

```
     0h                    6h                        12h
     |---------------------|-------------------------|
     |      2x valendo     |     ja acabou, 1x       |
     |                     |                         |
     +--------------- voce estava offline -----------+

O que o jogo pagaria:  4320 x 2  = 8640 moedas
O que era certo:  2160 x 2 + 2160 x 1  = 6480 moedas
```

O pagamento acontece em um bloco só, e o bloco atravessa o fim do efeito.
Dava para consertar cortando o período em pedaços e pagando cada pedaço com a taxa certa.
Mas repare no tipo de erro que isso é: **não dá exceção, não dá log, não quebra teste nenhum que já existe**.
Só aparece moeda a mais na conta de alguém, meses depois, quando já é tarde.

Uma feature de diversão não vale esse tipo de risco.
Então a regra é: não mexa na taxa.

### O que continua permitido

Mudar o **saldo na hora** é seguro e dois itens fazem isso: a Bomba e o Bumerangue.

```
+------------------------------+    +------------------------------+
| PERIGOSO (proibido)          |    | SEGURO (permitido)           |
|------------------------------|    |------------------------------|
| "ganha 2x por 6 horas"       |    | "perde metade agora"         |
| "para de ganhar por 1 hora"  |    | "rouba 20% de alguem agora"  |
|                              |    |                              |
| o pagamento preguicoso       |    | acontece em um instante,     |
| atravessa o fim do efeito    |    | nao tem periodo para         |
| e paga errado, calado        |    | atravessar                   |
+------------------------------+    +------------------------------+
```

A única precaução: **chame `settleCoins` antes de mexer no saldo**.
Isso paga o que estava pendente na taxa normal, e aí você mexe num número que está atualizado.
O código já faz exatamente isso antes de toda ação que cobra moeda. Procure `settleCoins` no `game.ts` e copie o hábito.

### Para onde os itens antigos foram

| Item | Era (perigoso) | Virou (seguro) |
|---|---|---|
| Moeda | ganha 2x por 6h | tudo custa metade por 6h |
| Bullet Bill | ganha como online mesmo offline, 12h | te joga na cidade mais longe do caracol, na hora |
| Raio | ninguem ganha moeda por 30min | tudo custa o dobro para todos por 1h |
| Bomba | perde metade + 1h sem ganhar | perde metade, e só |

Repare no padrão: a maioria saiu da caixa "moedas" e foi para a caixa "custos".
Continua sendo economia, continua doendo, mas o efeito é lido no momento em que você clica em comprar, não acumulado ao longo do tempo.

### Onde o multiplicador de custo é lido

Existe um desconto pessoal no jogo (`speedDiscountLevel`), aplicado em `discountedCost` no `game.ts`.
Moeda e Raio entram como mais um fator nessa mesma conta:

```
preco final = preco base
              x desconto pessoal
              x 0.5 se voce tem Moeda
              x 2   se o Raio esta ativo
```

Três lugares leem preço e todos precisam do mesmo fator, senão a tela mostra um número e o servidor cobra outro:

```
+---------------------------+
| redirectCost()            |  ja usa desconto
+---------------------------+
| speedCost()               |  ja usa desconto
+---------------------------+
| preco da loja             |  hoje usa o preco cru, precisa passar a usar
+---------------------------+
```

Mantenha os pisos que já existem (o custo de redirect nunca cai abaixo de 4, por exemplo).

---

## 6. Onde encostar no código

São cinco lugares no `server/caracol/game.ts`. Só cinco.

```
+-------------------------------------------------------------+
| speedKmh()                                                  |
| hoje devolve a velocidade global                            |
| passa a receber "contra quem" e multiplicar pela Banana     |
|                                                             |
| ATENCAO: 3 lugares chamam isso. Todos precisam mudar juntos,|
| senao o tempo estimado que aparece na tela vira mentira.    |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| discountedCost()                                            |
| entra o fator da Moeda e do Raio                            |
| a loja, que hoje nao passa por aqui, passa a passar         |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| ensureTarget()                                              |
| escolhe quem o caracol persegue                             |
| pula quem tem Super Star                                    |
| obedece quem tem Casco vermelho                             |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| redirect()                                                  |
| Congelamento bloqueia                                       |
| alvo com Star e recusado                                    |
| alvo com Escudo gasta o escudo e nao acontece nada          |
| quem tem Flor de Fogo paga zero                             |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| selectCity()                                                |
| hoje recusa trocar de cidade se voce esta vivo              |
| passa a aceitar se voce tem Cogumelo                        |
| o Bullet Bill usa esse mesmo caminho, so que escolhendo     |
| a cidade sozinho                                            |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
| tickInternal()   (roda de 1 em 1 segundo)                   |
| limpa efeitos vencidos                                      |
| avisa o jogador que o efeito acabou                         |
+-------------------------------------------------------------+
```

### O Blooper merece um parágrafo

Blooper esconde o caracol da sua tela.
A tentação é esconder no React.

Não faça isso.
Se o servidor mandar a posição e o React só não desenhar, qualquer pessoa abre o DevTools e vê.
Não é esconder, é fingir que escondeu.

O servidor já monta uma resposta diferente para cada jogador (procure `stateFor`).
Então mande `lat`, `lon`, distância e tempo como nulos para quem está com tinta.
O dado nunca sai do servidor.

---

## 7. Eventos novos

```
cliente  ->  servidor

  caracol:roulette      gira a roleta
  caracol:boomerang     usa o bumerangue (precisa dizer em quem)
```

Só dois.
Cogumelo e Flor de Fogo não precisam de evento próprio: eles são gastos pelas ações que já existem (trocar de cidade, redirecionar).

### Dois cliques rápidos

Se alguém clicar duas vezes no botão bem rápido, os dois pedidos chegam antes de qualquer um salvar no banco.
Os dois passam pelo teste de "faz 24h?".
Dois itens de uma vez.

A loja já tinha esse problema e foi resolvida com uma fila (hoje `enqueueMutation` no `game.ts`).
Use a mesma fila para a roleta.

### O sorteio

Sorteie a **categoria primeiro**, depois o item:

```
+---------------------------+
| moeda justa: buff ou      |
| debuff?                   |
+---------------------------+
             |
      +------+------+
      |             |
+-----------+  +-----------+
| 7 buffs   |  | 6 debuffs |
| sorteio   |  | sorteio   |
| igual     |  | igual     |
+-----------+  +-----------+
```

As duas listas não têm o mesmo tamanho: são 7 buffs e 6 debuffs.
Se você sortear direto entre os 13, dá 54% de chance de buff contra 46% de debuff, e a regra dos 50/50 já nasce quebrada.
Sorteando a categoria primeiro, o tamanho das listas deixa de importar, nem hoje nem no dia em que alguém adicionar um item novo.

E deixe o sorteio ser injetável, do mesmo jeito que o relógio já é (`clock` nas opções do manager).
Sem isso não dá para testar.

---

## 8. Na tela

Um cartão novo na coluna da direita, entre a carteira e o cartão do caracol:

```
+----------------------------------+
|  +----------------------------+  |
|  |  Sua carteira              |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |  ROLETA        <- novo     |  |
|  |                            |  |
|  |  [ Girar a roleta ]        |  |
|  |  ou "volta em 7h20"        |  |
|  |                            |  |
|  |  efeitos ativos:           |  |
|  |  [star 1h12] [banana 3h]   |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |  O bicho                   |  |
|  +----------------------------+  |
+----------------------------------+
```

Quatro detalhes que importam:

O resultado vem do servidor, no retorno do evento.
Nunca sorteie no cliente.

O contador regressivo usa o `serverNow` que já vem junto do estado, não o relógio do computador.
Alguém com o relógio adiantado veria "disponível", clicaria e tomaria um erro.

Os preços na tela já vêm calculados do servidor.
Com Moeda ou Raio ativo, o botão precisa mostrar o preço novo, não o antigo com um aviso ao lado.

Todo mundo vê os efeitos de todo mundo na lista de jogadores.
Isso é de propósito: é o que faz alguém olhar a lista, ver quem está sem escudo e mandar o caracol para lá.
Sem isso a roleta vira sorte privada e não gera jogo.

---

## 9. O que testar

O arquivo `tests/caracol.integration.test.ts` já tem tudo que você precisa: relógio controlado e um `tickOnce()` para avançar o jogo na mão.

```
+---------------------------------------------------------+
| ESSENCIAIS                                              |
|---------------------------------------------------------|
| girou duas vezes no mesmo dia -> recusa                 |
| passou 24h -> libera                                    |
| dois giros ao mesmo tempo -> so um item                 |
| reiniciar o servidor -> efeitos continuam la            |
| morrer -> efeitos continuam la                          |
| nenhum item mexe em lastCoinAccruedAt (ver abaixo)      |
| muitos giros -> perto de 50/50 entre buff e debuff      |
+---------------------------------------------------------+

+---------------------------------------------------------+
| CUSTOS                                                  |
|---------------------------------------------------------|
| Moeda: redirect, aceleracao e loja pela metade          |
| Raio: tudo em dobro, para quem tirou e para os outros   |
| Moeda + Raio juntos -> preco normal                     |
| pisos continuam valendo (redirect nunca abaixo de 4)    |
| preco do ack e o mesmo preco da tela                    |
+---------------------------------------------------------+

+---------------------------------------------------------+
| POR ITEM                                                |
|---------------------------------------------------------|
| Bomba: metade do saldo, e o ganho por tempo nao muda    |
| Bumerangue: sai de um, entra no outro, total igual      |
| Star: nao e escolhido, redirect recusado, nao morre     |
| Casco vermelho: redirect de terceiro nao muda o alvo    |
| Escudo: bloqueia o primeiro ataque, nao o segundo       |
| Blooper: sua tela sem posicao, a dos outros normal      |
| Bullet Bill: acaba na cidade mais distante              |
+---------------------------------------------------------+
```

O teste "nenhum item mexe em `lastCoinAccruedAt`" é o guarda-costas da regra da seção 5.
Aplique cada um dos 13 itens, espere um tempo e confira que o ganho por tempo saiu igual ao de um jogador sem item nenhum.
Se alguém no futuro adicionar um item que muda a taxa, esse teste quebra e a pessoa vai ler a seção 5.

---

## 10. Ordem de implementação

```
1. Tipos e catalogo dos 13 itens
          |
2. Tabela nova, ALTER TABLE, carregar no boot
          |
3. Roleta: botao, sorteio, contador de 24h
          |
4. Os efeitos, em grupos:
   custos -> alvo -> velocidade -> cargas -> instantaneos -> informacao
          |
5. Tela
          |
6. README
```

Comece pelos efeitos de **custo** (Moeda e Raio) dentro do passo 4.
Eles obrigam você a unificar o cálculo de preço em um lugar só, e todo o resto fica mais fácil depois disso.
Se deixar por último, vai ter preço calculado em três lugares diferentes e um deles vai discordar dos outros.

---

## 11. Riscos

### O Raio atinge todo mundo

Uma pessoa azarada tira Raio e o jogo inteiro fica 1 hora pagando o dobro em tudo.
Isso é de propósito, é o item que faz as pessoas conversarem sobre o jogo.

Mas se a base de jogadores crescer, a chance de ter sempre um Raio ativo cresce junto.
Se começar a incomodar: coloque um tempo de espera global de 6h para o Raio, e quem tirar durante a espera pega outro debuff.

### Todo mundo invencível ao mesmo tempo

Se todos os jogadores vivos estiverem com Super Star, o caracol não tem quem perseguir.

```
+------------------------------------------+
| [jogador*]  [jogador*]  [jogador*]       |
|     ^-- todos com Star                   |
|                                          |
| [ caracol ]  -> ???                      |
+------------------------------------------+
```

O código não quebra: ele já sabe lidar com alvo nulo.
O problema é a tela, que só tem uma frase para alvo nulo: "Dormindo em Brasília".
Isso seria mentira, porque o caracol não está em Brasília e não está dormindo, está sem alvo.
Precisa de uma frase nova.

### Alguém vai querer um item de moeda por tempo

Mais cedo ou mais tarde alguém vai propor "ganha o dobro de moedas por 6h".
Parece o item mais natural do mundo e foi a primeira ideia deste projeto também.

```
+------------------------------------------------+
| pedido: "multiplicador de moedas por X horas"  |
|                    |                           |
|                    v                           |
|        leia a secao 5 antes de aceitar         |
|                    |                           |
|                    v                           |
|   da para fazer, mas exige reescrever o        |
|   pagamento de moedas em pedacos, e o erro     |
|   nao aparece em nenhum log                    |
+------------------------------------------------+
```

Não é impossível. É caro e silencioso, que é a pior combinação.
Se um dia valer a pena, faça a reescrita do pagamento primeiro, sozinha, com teste próprio, e só depois o item.

---

## 12. Resumindo

```
+----------------------------------------------------+
|  3 tipos de efeito                                 |
|  6 lugares para encostar no game.ts                |
|  1 tabela nova + 1 coluna                          |
|  2 eventos novos                                   |
|                                                    |
|  1 regra que nao se quebra:                        |
|  nenhum item muda a velocidade de ganho de moeda.  |
|  mexer no saldo na hora, pode. por tempo, nao.     |
+----------------------------------------------------+
```

Se você só lembrar de uma coisa deste documento, lembre da seção 5.
Todo o resto, se estiver errado, dá erro e você conserta.
Aquilo ali daria moeda de graça em silêncio, e é por isso que foi proibido em vez de resolvido.
