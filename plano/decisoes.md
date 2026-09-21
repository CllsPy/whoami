# Roleta do Caracol: todas as decisões

Este documento junta, num lugar só, cada escolha feita durante o planejamento da Roleta.
Para cada uma você encontra **o que** foi decidido, **por que**, e **o que abrimos mão** para ter isso.

Se você for implementar a feature, leia este documento antes da spec.
A spec diz o que fazer; este aqui diz por que é assim, e isso é o que te salva quando aparecer um caso que a spec não previu.

Documentos irmãos nesta pasta:

- [roleta-do-caracol.md](roleta-do-caracol.md) - o design, com diagramas
- [roleta-do-caracol-spec.md](roleta-do-caracol-spec.md) - os 78 requisitos testáveis
- [roleta-ui/](roleta-ui/) - o estudo visual da interface

---

## Como ler o status

Cada decisão tem um selo:

| Selo | Significa |
|---|---|
| **Confirmada** | O dono do projeto escolheu ou aprovou. Não mude sem conversar. |
| **A revisar** | Proposta no planejamento, faz sentido, mas o dono ainda não validou. Pode mudar. |

Se você discordar de uma decisão **Confirmada**, tudo bem: levante a discussão.
Só não mude no código em silêncio.

---

## Índice

| # | Decisão | Status |
|---|---|---|
| 1 | Os itens mexem em 5 coisas que existem no jogo | Confirmada |
| 2 | Nenhum item mexe na velocidade de ganhar moedas | Confirmada |
| 3 | O Obstáculo saiu do jogo | Confirmada |
| 4 | Um giro a cada 24 horas corridas | Confirmada |
| 5 | Morto não gira | Confirmada |
| 6 | Sorteio em dois passos, 50/50 garantido | Confirmada |
| 7 | Itens que precisam de alvo viram carga guardada | Confirmada |
| 8 | Tirar o mesmo item de novo renova, não soma | Confirmada |
| 9 | Todo mundo vê os efeitos de todo mundo | Confirmada |
| 10 | Morrer não limpa efeito nenhum | Confirmada |
| 11 | Debuff não se remove, e o escudo não salva do próprio azar | Confirmada |
| 12 | Super Star ganha do Casco vermelho | Confirmada |
| 13 | O Bumerangue é carga, não instantâneo | A revisar |
| 14 | Como a Bomba arredonda | A revisar |
| 15 | Como o Bumerangue arredonda | A revisar |
| 16 | O escudo cobra o atacante | A revisar |
| 17 | Dois Cascos vermelhos: vale o mais novo | A revisar |
| 18 | Para onde o Bullet Bill te leva | A revisar |
| 19 | Onde a Moeda e o Raio mudam o preço | A revisar |
| 20 | O que o Congelamento bloqueia | A revisar |
| 21 | O que o Blooper esconde | A revisar |
| 22 | Uma tabela nova para os efeitos | Confirmada |
| 23 | A coluna nova precisa de ALTER TABLE | Confirmada |
| 24 | Efeito vence por conta, sem cronômetro | Confirmada |
| 25 | Giro e bumerangue entram na fila da loja | Confirmada |
| 26 | O sorteio pode ser controlado nos testes | Confirmada |
| 27 | O Blooper esconde no servidor, não no React | Confirmada |
| 28 | Só dois eventos novos | Confirmada |
| 29 | Toda hora vem do relógio do servidor | Confirmada |
| 30 | Se a gravação falhar, nada acontece | Confirmada |
| 31 | Testar pelo manager, não pelo socket | A revisar |
| 32 | A revelação ocupa a tela inteira | Confirmada |
| 33 | Símbolos desenhados em SVG, sem emoji | Confirmada |
| 34 | Verde para buff, coral para debuff | Confirmada |
| 35 | O cartão fica entre a carteira e o caracol | Confirmada |
| 36 | O título do cartão muda conforme o estado | Confirmada |
| 37 | O contador de 24h é um anel | Confirmada |
| 38 | "Dormindo em Brasília" só quando está em Brasília | A revisar |
| 39 | Consertar o `--ink-soft` que nunca existiu | Confirmada |
| 40 | Quem pede menos movimento não vê a animação | Confirmada |

---

## Parte 1: o que a roleta pode e não pode fazer

### 1. Os itens mexem em 5 coisas que existem no jogo

**Confirmada**

**O que:** cada item mexe em uma destas cinco coisas: saldo de moedas, custos, alvo do caracol, velocidade do caracol, ou o que você vê e pode fazer.

**Por quê:** o Mario Kart é uma corrida onde todo mundo anda.
No Caracol você fica parado na sua cidade e quem anda é o caracol.
Então "o cogumelo aumenta sua velocidade" não significa nada aqui, porque você não tem velocidade.
Cada item teve que ser traduzido para algo que o jogo já tem.

**O que perdemos:** alguns itens ficaram diferentes do original.
O Cogumelo, por exemplo, virou "troca de cidade", que é a única arrancada possível para quem não anda.

**Regra prática:** se alguém propuser um item que não cabe em nenhuma das cinco, o problema provavelmente é o item.

---

### 2. Nenhum item mexe na velocidade de ganhar moedas

**Confirmada** - esta é a decisão mais importante do documento.

**O que:** nenhum item pode fazer você ganhar mais ou menos moedas **por um período de tempo**.
Mexer no saldo **de uma vez** pode (a Bomba tira metade na hora, e tudo bem).

**Por quê:** o jogo é preguiçoso para pagar moedas.
Ele não soma de segundo em segundo: quando você volta, ele olha quanto tempo passou e paga tudo junto.

Imagine que existisse "ganhe o dobro por 6 horas" e você ficasse 12 horas fora.
O jogo pagaria as 12 horas em dobro, porque não sabe que o efeito acabou no meio do caminho.
Você receberia 8640 moedas em vez de 6480.

O pior é o tipo de erro: não aparece exceção, não aparece log, nenhum teste quebra.
Só surge moeda do nada na conta de alguém, e ninguém percebe por meses.

**O que perdemos:** quatro itens tiveram que ser reescritos.

| Item | Era | Virou |
|---|---|---|
| Moeda | ganha o dobro por 6h | tudo custa metade por 6h |
| Bullet Bill | ganha como se estivesse online, por 12h | te joga na cidade mais longe do caracol |
| Raio | ninguém ganha moeda por 30min | tudo custa o dobro para todos por 1h |
| Bomba | perde metade e fica 1h sem ganhar | só perde metade |

Repare que quase todos foram de "moedas" para "custos".
Continua sendo economia, continua doendo, mas o preço é calculado na hora do clique, então não tem período para dar errado.

**Regra prática:** antes de mexer em saldo, chame `settleCoins`.
Isso paga o que estava pendente, e aí você mexe num número atualizado.

---

### 3. O Obstáculo saiu do jogo

**Confirmada**

**O que:** o Obstáculo (perde o desconto e o caracol acelera de graça) foi removido.
Ficaram 7 buffs e 6 debuffs, 13 itens no total.

**Por quê:** escolha do dono do projeto.

**O que perdemos:** as listas ficaram de tamanhos diferentes.
Isso não quebra a chance de 50/50, por causa da decisão 6.
Um efeito colateral bom: agora nenhum item mexe na velocidade global do caracol.

---

## Parte 2: as regras do giro

### 4. Um giro a cada 24 horas corridas

**Confirmada**

**O que:** depois de girar, você só gira de novo 24 horas depois.
Não é "uma vez por dia do calendário".

**Por quê:** se o dia virasse à meia-noite, todo mundo clicaria às 00:00 ao mesmo tempo.
E teríamos que escolher um fuso horário, o que é fonte clássica de bug.
Com 24 horas corridas, a conta é só `ultimo_giro + 24h`.

**O que perdemos:** o horário do seu giro vai "andando" pelo dia.
Se você girou às 15h hoje e às 18h amanhã, depois de amanhã só pode a partir das 18h.

---

### 5. Morto não gira

**Confirmada**

**O que:** para girar você precisa estar vivo e com cidade escolhida.

**Por quê:** vários itens só fazem sentido com cidade (Cogumelo, Super Star, Bullet Bill).
E girar morto seria uma aposta sem risco nenhum.

**O que perdemos:** quem acabou de morrer precisa escolher cidade antes de girar.

---

### 6. Sorteio em dois passos, 50/50 garantido

**Confirmada**

**O que:** primeiro sorteia buff ou debuff (cara ou coroa).
Depois sorteia um item dentro da lista que saiu.

**Por quê:** se sorteássemos direto entre os 13 itens, a chance de buff seria 7 em 13, ou seja, 54%.
A regra dos 50/50 já nasceria quebrada.
Sorteando o lado primeiro, o tamanho das listas deixa de importar, hoje e no dia em que alguém adicionar um item.

**O que perdemos:** cada buff individual sai um pouco menos que cada debuff (1 em 14 contra 1 em 12).
Isso é aceito: a promessa é sobre a categoria, não sobre o item.

---

### 7. Itens que precisam de alvo viram carga guardada

**Confirmada**

**O que:** itens como a Flor de Fogo não são usados na hora do giro.
Eles ficam guardados como "cargas" e você gasta depois.

**Por quê:** você não sabe o que vai sair quando aperta o botão.
Não faz sentido pedir "em quem você quer jogar?" antes de saber se saiu um ataque.

**O que perdemos:** um pouco de interface extra para mostrar e usar as cargas.

---

### 8. Tirar o mesmo item de novo renova, não soma

**Confirmada**

**O que:** se você tem Banana (4h) e tira Banana de novo, ela volta a valer 4h a partir de agora.
Não vira 8h.

**Por quê:** somar faria dias de azar virarem punições enormes.
E renovar é mais simples de programar: o banco tem uma regra que impede dois efeitos iguais no mesmo dono (decisão 22).

**O que perdemos:** tirar o mesmo buff duas vezes vale menos do que tirar dois buffs diferentes.

---

### 9. Todo mundo vê os efeitos de todo mundo

**Confirmada**

**O que:** na lista de jogadores aparecem os símbolos dos efeitos ativos de cada pessoa.

**Por quê:** é o que transforma a roleta em jogo social.
Você olha a lista, vê quem está sem escudo, e manda o caracol para lá.
Sem isso, a roleta seria só sorte particular.

**O que perdemos:** ninguém consegue esconder que está vulnerável.
Isso é de propósito.

---

### 10. Morrer não limpa efeito nenhum

**Confirmada**

**O que:** quando o caracol te alcança, você perde as moedas, mas os efeitos continuam.

**Por quê:** se a morte limpasse os debuffs, morrer de propósito viraria o jeito de escapar da Banana.

**O que perdemos:** um jogador morto pode ficar com um buff que não consegue aproveitar.
Aceito.

---

### 11. Debuff não se remove, e o escudo não salva do próprio azar

**Confirmada**

**O que:** não existe botão nem item que remova debuff.
O Casco defensivo só bloqueia **ataque de outro jogador**, nunca o que saiu da sua própria roleta.

**Por quê:** se desse para remover debuff, o azar não teria peso nenhum e a roleta viraria só vantagem.

**O que perdemos:** nada que valesse a pena ter.

---

### 12. Super Star ganha do Casco vermelho

**Confirmada**

**O que:** se a mesma pessoa tiver Star (o caracol não te escolhe) e Casco vermelho (o caracol só te escolhe) ao mesmo tempo, vale a Star.

**Por quê:** as duas regras se contradizem, então uma precisa ganhar.
A invencibilidade é a promessa mais forte, e quebrar ela seria a surpresa mais injusta.

**O que perdemos:** nada; é só uma regra de desempate.

---

## Parte 3: detalhes de cada item

Estas decisões apareceram quando escrevemos a spec e fomos obrigados a dar números exatos.
São todas **A revisar**: fazem sentido, mas o dono ainda não bateu o martelo.

### 13. O Bumerangue é carga, não instantâneo

**A revisar**

**O que:** o Bumerangue vira 1 carga, válida por 24h, gasta quando você escolhe em quem jogar.

**Por quê:** a primeira versão do design dizia "instantâneo", mas ele precisa de um alvo.
Pela decisão 7, item com alvo vira carga.
Isso era uma contradição no design, e a spec resolveu.

**O que perdemos:** nada; o design doc já foi corrigido.

---

### 14. Como a Bomba arredonda

**A revisar**

**O que:** depois da Bomba, seu saldo vira `floor(saldo / 2)`.
`floor` é "arredondar para baixo".
Com 7 moedas, você fica com 3.

**Por quê:** precisávamos de um número exato para poder testar.

**O que perdemos:** com saldo ímpar, a moeda do meio vai embora junto.

---

### 15. Como o Bumerangue arredonda

**A revisar**

**O que:** o Bumerangue rouba `floor(20% do saldo do alvo)`.
Se o alvo tem menos de 5 moedas, você rouba zero, e a carga é gasta mesmo assim.

**Por quê:** número exato e testável, igual à Bomba.

**O que perdemos:** jogar Bumerangue em alguém pobre desperdiça o item.
Como os saldos são públicos no jogo, é um erro evitável.

---

### 16. O escudo cobra o atacante

**A revisar**

**O que:** quando alguém ataca um jogador com escudo, o atacante paga o custo (ou gasta a carga), o escudo se gasta, e o ataque não faz nada.
O servidor responde "deu certo" para o atacante e avisa os dois.

**Por quê:** é o que dá valor ao escudo, como no Mario Kart: o casco se gasta quando bate no escudo.
Se o atacante não pagasse, atacar escudo seria de graça e o escudo seria fraco.

Responder "deu certo" parece estranho, mas é o correto: a ação aconteceu e foi cobrada.
No código, uma resposta de erro nunca muda o estado do jogo, então não poderíamos cobrar e responder erro ao mesmo tempo.

**O que perdemos:** o atacante pode se sentir enganado.
Por isso ele recebe o aviso `shield`, dizendo que o ataque foi bloqueado.

---

### 17. Dois Cascos vermelhos: vale o mais novo

**A revisar**

**O que:** se duas pessoas estiverem com Casco vermelho ao mesmo tempo, o caracol vai atrás de quem tirou por último.
Quando esse vencer, ele volta para o anterior, se ainda estiver valendo.

**Por quê:** o jogo só tem um alvo, então precisamos de uma regra de desempate.
"O mais novo" é determinístico, ou seja, sempre dá o mesmo resultado e dá para testar.

**O que perdemos:** quem tirou primeiro tem um Casco vermelho que por um tempo não faz nada.

---

### 18. Para onde o Bullet Bill te leva

**A revisar**

**O que:** o Bullet Bill te move para a cidade do Brasil mais distante da posição atual do caracol.
Se duas cidades empatarem, vai a de menor código.

**Por quê:** determinístico e não depende de onde os outros jogadores estão.

**O que perdemos:** você não escolhe o destino.
Pode cair num lugar que não gostaria, mas esse é o espírito do item: você vira um projétil.

---

### 19. Onde a Moeda e o Raio mudam o preço

**A revisar**

**O que:** a Moeda (metade) e o Raio (dobro) valem para redirecionar, acelerar, comprar desconto e comprar na loja.
Todo preço é calculado por uma fórmula só:

```
preço = max(piso, floor(base × 0,75^desconto × fatores))
```

- `piso` é 4 no redirecionamento e 1 no resto
- `desconto` é o seu nível de desconto pessoal, que só vale em redirecionar e acelerar (como já é hoje)
- `fatores` é 0,5 se você tem Moeda, vezes 2 se o Raio está ativo

**Por quê:** "tudo que você compra" precisa significar tudo.
E uma fórmula única evita o bug de a tela mostrar um preço e o servidor cobrar outro.

**O que perdemos:** a loja hoje usa o preço cru e vai precisar passar por essa fórmula.
É o único lugar realmente novo.

---

### 20. O que o Congelamento bloqueia

**A revisar**

**O que:** congelado, você não pode redirecionar, acelerar, comprar desconto, comprar na loja nem jogar Bumerangue.
Pode vestir item que já tem e pode escolher cidade.
As moedas continuam entrando.

**Por quê:** o Congelamento trava o que **gasta** ou **ataca**.
Vestir roupa não muda o jogo, então bloquear seria só irritante.
E as moedas continuam por causa da decisão 2.

**O que perdemos:** nada importante.

---

### 21. O que o Blooper esconde

**A revisar**

**O que:** com Blooper, você não vê onde o caracol está, a que distância, nem quando chega.
O nome do alvo continua visível.

**Por quê:** o alvo já aparece marcado na lista de jogadores.
Esconder só no cartão e deixar na lista seria incoerente.

**O que perdemos:** o histórico global às vezes mostra "chega em X minutos".
Quem está com Blooper consegue ver isso lá.
Aceitamos esse vazamento, porque censurar o histórico por jogador daria muito trabalho para pouco ganho.

---

## Parte 4: decisões técnicas

### 22. Uma tabela nova para os efeitos

**Confirmada**

**O que:** os efeitos ficam numa tabela nova, `caracol_effects`, com uma regra `UNIQUE (scope, account_id, item_id)`.

**Por quê:** a regra `UNIQUE` impede que o mesmo item exista duas vezes para o mesmo dono.
É ela que faz a decisão 8 (renova, não soma) funcionar sozinha, direto no banco.
Uma tabela separada também acomoda o Raio, que pertence ao mundo e não a um jogador.

**O que perdemos:** mais uma tabela para carregar quando o servidor liga.

---

### 23. A coluna nova precisa de ALTER TABLE

**Confirmada**

**O que:** a coluna `last_roulette_at` entra com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

**Por quê:** o arquivo `server/caracol/store.ts` cria tabelas com `CREATE TABLE IF NOT EXISTS`.
Em produção a tabela de contas já existe, então esse comando não faz nada, e a coluna nova nunca apareceria.
Isso já aconteceu antes no projeto com a coluna `redirect_level`.

**O que perdemos:** nada; é só não cair na armadilha.

---

### 24. Efeito vence por conta, sem cronômetro

**Confirmada**

**O que:** cada efeito guarda `expiresAt` (quando acaba).
Para saber se ainda vale, o código compara com a hora atual.
Não existe `setTimeout` para desligar o efeito.

**Por quê:** cronômetro some quando o servidor reinicia.
Uma data gravada no banco não some.
É o mesmo princípio que a feature `powerup-de-dica` já usa: estado de tempo é calculado, não agendado.

**O que perdemos:** o tick de 1 segundo precisa limpar os efeitos vencidos e avisar o dono.

---

### 25. Giro e bumerangue entram na fila da loja

**Confirmada**

**O que:** o giro e o bumerangue passam pela mesma fila que a loja já usa (`enqueueShopMutation`).

**Por quê:** se alguém clicar duas vezes muito rápido, os dois pedidos chegam antes de qualquer um salvar.
Os dois veem "faz 24h, pode girar" e você ganharia dois itens.
A fila faz um pedido esperar o outro terminar.

**O que perdemos:** ações da loja e da roleta esperam umas pelas outras.
São rápidas, então ninguém vai sentir.

---

### 26. O sorteio pode ser controlado nos testes

**Confirmada**

**O que:** o manager aceita uma função `random` nas opções, igual já aceita `clock`.
Sem ela, usa `Math.random`.

**Por quê:** sem controlar o sorteio, não dá para escrever um teste que diga "quando sai Banana, acontece isso".

**O que perdemos:** nada.

---

### 27. O Blooper esconde no servidor, não no React

**Confirmada**

**O que:** para quem está com Blooper, o servidor manda a posição do caracol como `null`.

**Por quê:** se o servidor mandasse a posição e o React só não desenhasse, qualquer pessoa abriria o DevTools e veria.
Não seria esconder, seria fingir que escondeu.

**O que perdemos:** os campos de posição passam a aceitar `null`, e o mapa precisa lidar com isso.

---

### 28. Só dois eventos novos

**Confirmada**

**O que:** entram só `caracol:roulette` (girar) e `caracol:boomerang` (jogar o bumerangue).
O Cogumelo é gasto quando você troca de cidade, e a Flor de Fogo quando você redireciona, usando eventos que já existem.

**Por quê:** o projeto usa um evento por ação, com nome claro (`buy-speed`, `buy-discount`).
Um evento genérico `use-item` ficaria diferente do resto.

**O que perdemos:** se um dia existirem muitos itens com alvo, talvez valha um evento genérico.
Hoje não vale.

---

### 29. Toda hora vem do relógio do servidor

**Confirmada** - já era regra do projeto (AD-003 em `.specs/STATE.md`).

**O que:** "volta em 7h20" é calculado com a hora do servidor, que vem junto do estado como `serverNow`.

**Por quê:** o relógio do computador do jogador pode estar errado por horas.
Alguém com o relógio adiantado veria "disponível", clicaria, e levaria um erro.

**O que perdemos:** nada.

---

### 30. Se a gravação falhar, nada acontece

**Confirmada**

**O que:** o giro só muda a memória do servidor **depois** que o banco confirmou.
Se o banco falhar, o jogador recebe `ROULETTE_FAILED` e o giro continua disponível.

**Por quê:** se a memória mudasse antes e o banco falhasse, o jogador veria o item até o servidor reiniciar, e aí ele sumiria.
Pior ainda: o giro teria sido gasto.

**O que perdemos:** a ordem das operações no código precisa de cuidado.

---

### 31. Testar pelo manager, não pelo socket

**A revisar**

**O que:** sempre que der, os testes chamam o manager direto (com `clock`, `random` e `tickOnce()`), sem abrir conexão de socket.

**Por quê:** o projeto tem testes de socket que falham às vezes, sem motivo aparente (está registrado em `.specs/STATE.md`).
Teste que falha de vez em quando ensina o time a ignorar teste vermelho, o que é pior do que não ter teste.

**O que perdemos:** o que depende do transporte de verdade ainda precisa de teste com socket.

---

## Parte 5: a interface

### 32. A revelação ocupa a tela inteira

**Confirmada** - escolha do dono do projeto.

**O que:** quando você gira, o mapa escurece e uma carta aparece no meio da tela com o item.
Você fecha com "Entendi".

**Por quê:** é o único momento especial do dia do jogador, e merece peso.

**Alternativas recusadas:** mostrar dentro do próprio cartão (discreto demais) ou abrir uma gaveta lateral como a loja (burocrático demais).

---

### 33. Símbolos desenhados em SVG, sem emoji

**Confirmada** - escolha do dono do projeto.

**O que:** os 13 itens têm símbolos próprios, desenhados com o mesmo traço, no estilo do caracol que já está no mapa.

**Por quê:** emoji muda de desenho entre iPhone e Android e ignora as cores do jogo.

**O que perdemos:** mais trabalho, e os símbolos já estão prontos em `roleta-ui/`.

---

### 34. Verde para buff, coral para debuff

**Confirmada**

**O que:** buffs usam o verde-limão (`--acid`) e debuffs usam o coral (`--coral`).

**Por quê:** as duas cores já existem no jogo e já têm esse sentido.
O verde aparece nos botões de ação, e o coral nos preços.

**O que perdemos:** nada; não inventamos cor nova.

---

### 35. O cartão fica entre a carteira e o caracol

**Confirmada**

**O que:** o cartão novo entra na coluna da direita, logo abaixo de "Seu bolso" e acima de "O bicho".

**Por quê:** é onde o olho passa entre ver quanto você tem e decidir o que fazer com o caracol.

**O que perdemos:** o cartão do caracol desce um pouco na tela.

---

### 36. O título do cartão muda conforme o estado

**Confirmada**

**O que:** quando dá para girar, o título é "A roleta".
Quando não dá, o título vira o tempo que falta, como "Volta em 7h 20min".

**Por quê:** naquele momento, o tempo que falta é a única coisa que o jogador quer saber.

**O que perdemos:** nada.

---

### 37. O contador de 24h é um anel

**Confirmada**

**O que:** o tempo de espera aparece como um anel que vai se completando, no canto do cartão.

**Por quê:** os outros cartões da coluna têm um desenho nesse mesmo canto.
O anel mantém o ritmo visual de cima a baixo.

**O que perdemos:** nada.

---

### 38. "Dormindo em Brasília" só quando está em Brasília

**A revisar**

**O que:** quando o caracol não tem alvo e não está em Brasília, o cartão diz "Sem alvo no mapa".

**Por quê:** hoje o cartão diz "Dormindo em Brasília" sempre que não há alvo.
Isso já está errado hoje, sem roleta nenhuma: depois de uma morte, o caracol fica onde alcançou a pessoa, não em Brasília.
Com a Super Star o problema ficaria mais comum.

**O que perdemos:** nada; é uma correção.

---

### 39. Consertar o `--ink-soft` que nunca existiu

**Confirmada**

**O que:** criar `--ink-soft: #5a5768` no começo de `src/styles.css`.

**Por quê:** o CSS usa `var(--ink-soft)` na nota do desconto, mas essa variável nunca foi criada.
Hoje a nota aparece com a cor cheia em vez da cor suave.
O valor `#5a5768` foi escolhido porque tem contraste suficiente sobre o papel creme dos cartões.

**O que perdemos:** nada; é um bug antigo que encontramos de passagem.

---

### 40. Quem pede menos movimento não vê a animação

**Confirmada**

**O que:** se o sistema do jogador está configurado para reduzir movimento (`prefers-reduced-motion`), a carta aparece sem a animação de girar.

**Por quê:** para algumas pessoas, animação na tela inteira causa enjoo de verdade.

**O que perdemos:** nada.

---

## Se aparecer um caso que nenhuma decisão cobre

Pergunte, nesta ordem:

1. **Isso muda quanto alguém ganha de moeda por tempo?** Se sim, pare. Leia a decisão 2 e converse antes de seguir.
2. **Isso mexe em qual das cinco coisas da decisão 1?** Se não mexe em nenhuma, desconfie da ideia.
3. **O resultado é determinístico?** Se o mesmo cenário puder dar resultados diferentes, não vai dar para testar.
4. **O dado sai do servidor?** Se é para esconder alguma coisa, esconda no servidor, nunca no React.

Se ainda assim não estiver claro, registre a dúvida e a sua escolha na tabela de premissas da spec, com o motivo.
Uma decisão anotada pode ser revista depois; uma decisão que ninguém anotou vira bug.
