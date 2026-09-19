# GameGameGame

Plataforma de jogos multiplayer em tempo real: descobrir o personagem da própria testa, desenhar em cadeia para encontrar o impostor ou sobreviver ao Caracol em um mapa global do Brasil.

## Modos de jogo

- **Quem Sou Eu:** cada pessoa recebe um personagem que só as outras conseguem ver e tenta descobrir a própria identidade.
- **Quem é o impostor:** todos menos uma pessoa recebem o mesmo animal ou objeto. Cada jogador desenha por um tempo configurável (10s, 20s, 30s, 1min ou sem limite), a vez passa para o próximo e, depois do último, volta ao primeiro sem encerrar a rodada. Enquanto o mural continua, os desenhistas têm uma acusação e o impostor pode tentar descobrir a palavra.

- **Caracol:** todos compartilham uma única partida persistente. Cada nick escolhe uma cidade brasileira; o caracol parte de Brasília a 0,05 km/h, persegue sobreviventes mesmo quando estão offline, ganha velocidade global por compras e volta ao padrão quando alcança alguém. O desconto pessoal reduz o custo de redirecionar e também de acelerar o caracol. A conta usa senha hasheada, sem recuperação ou troca de senha: a senha não pode ser esquecida.

No novo modo, a palavra é protegida no servidor. Os desenhistas recebem a palavra na própria visão da sala; o impostor recebe apenas o papel secreto. Um traço é validado pelo servidor, sincronizado com todos e só pode ser feito durante a vez correspondente.

## Catálogo de personagens

A wordlist é curada com mais de 500 nomes muito conhecidos de filmes, séries, quadrinhos, animações, anime, videogames, literatura, cultura brasileira, música, esportes e história. A seleção prioriza protagonistas e ícones populares, evitando personagens de nicho.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:5173> em duas janelas ou dispositivos. O Vite serve a interface e encaminha o Socket.IO para o Node em `localhost:3001`.

## Caracol em produção

O Caracol usa PostgreSQL com o volume Docker `caracol-postgres` para guardar contas,
moedas, cidades, upgrades, inscrições Push e o único estado do mundo. Defina
`CARACOL_POSTGRES_PASSWORD` e gere um par VAPID exclusivo para o jogo; nunca
reutilize chaves de outro projeto:

```bash
npx web-push generate-vapid-keys
```

Guarde `CARACOL_VAPID_PRIVATE_KEY` somente no ambiente secreto do servidor. O
service worker do Caracol só usa Push quando não existe uma aba visível; inscrições
que retornam 404/410 são removidas automaticamente.

## Produção

```bash
npm run build
npm start
```

O mesmo processo Node serve `dist/`, o endpoint `/healthz` e os WebSockets. As
salas dos dois jogos tradicionais ficam em memória e são perdidas quando o
processo reinicia; o mundo do Caracol é persistido no PostgreSQL.

## GameGameGame separado no Dokploy

O deploy atual continua compatível com o modo `all`, mas a publicação nova pode
ser dividida em quatro aplicações independentes: lobby, Quem Sou Eu, Quem é o
impostor e Caracol. Cada aplicação recebe `VITE_GAME_SERVICE` no build e
`GAME_SERVICE` no runtime, inicializando somente o motor correspondente.

O lobby é o endereço principal. Os jogos podem usar subdomínios próprios para
manter frontend e Socket.IO na mesma origem. A matriz completa de aplicações,
domínios e variáveis está em
[`deploy/gamegamegame/README.md`](deploy/gamegamegame/README.md).

## Deploy no Render

Deploy canônico: um único processo serve a interface, o `/healthz` e os
WebSockets. Uma URL, um conjunto de salas, nada de CORS entre domínios.

O `render.yaml` já define plano, build (`npm ci && npm run build`), start
(`npm start`) e healthcheck (`/healthz`). Aponte o Render para o repositório
com **New → Blueprint** e preencha a única variável que o arquivo deixa em
branco:

| Variável | Valor |
| --- | --- |
| `PUBLIC_ORIGIN` | a própria URL pública, ex. `https://SEU-APP.onrender.com` |

Não defina `PORT` nem `HOST` (o Render injeta `PORT` e o servidor já escuta em
`0.0.0.0`), e **não defina `VITE_SERVER_URL`** — vazia, o cliente conecta na
própria origem, que é o que se quer aqui.

`PUBLIC_ORIGIN` vazio faz o Socket.IO aceitar qualquer origem. Funciona, mas
deixa qualquer site conectar no seu servidor; preencher com a URL do serviço
fecha isso sem quebrar nada, porque requisição de mesma origem não passa por
CORS.

### O que o plano gratuito custa

O Render hiberna um serviço gratuito após 15 minutos sem receber requisição
HTTP nem mensagem WebSocket, e voltar leva cerca de um minuto. Na prática:

- **Durante a partida ele não hiberna.** O Socket.IO troca ping/pong a cada
  ~25s, e desde fevereiro de 2026 mensagem WebSocket conta como atividade.
- **A primeira pessoa do dia espera ~1 min**, vendo a página de carregamento do
  próprio Render enquanto o processo sobe.
- **Sala parada 15+ min é perdida.** O estado é em memória. O TTL padrão de
  salas já é 30 min, então na prática pouco muda.
- São 750 horas de instância por mês, o que cobre um serviço rodando o mês
  inteiro.

Para conferir se ficou de pé:

```bash
curl https://SEU-APP.onrender.com/healthz
# {"ok":true,"rooms":0}
```

## Alternativa: interface na Vercel, servidor no Render

O repositório também traz `vercel.json` e `.vercelignore` para servir a
interface da CDN da Vercel e deixar só o servidor no Render. A vantagem é a
página abrir instantaneamente mesmo com o servidor hibernando: o cliente bate no
`/healthz` para acordá-lo e mostra "acordando servidor" em vez de uma tela de
carregamento.

> **Cuidado com o efeito colateral.** Se a Vercel entrar no ar sem o Render
> parar de servir a interface, você fica com **duas instalações independentes**,
> cada uma com suas próprias salas. Quem abrir pelo link da Vercel não encontra
> a sala de quem abriu pelo link do Render. Ao adotar esta alternativa, troque o
> build do Render para `npm ci && npm run build:server`, para ele voltar ao modo
> api-only e existir uma interface só.

Nesse arranjo as variáveis mudam:

| Onde | Variável | Valor |
| --- | --- | --- |
| Render | `PUBLIC_ORIGIN` | `https://SEU-APP.vercel.app,https://*.vercel.app` |
| Vercel | `VITE_SERVER_URL` | `https://SEU-APP.onrender.com` |

`VITE_SERVER_URL` é lida em **tempo de build**: trocar o valor exige um novo
deploy da interface, não basta salvar a variável. E a ordem tem dependência
circular — suba o Render, depois a Vercel, e volte no Render para ajustar
`PUBLIC_ORIGIN` com o domínio real. O curinga cobre os preview deploys.

O `railway.json` continua no repositório e funciona do mesmo jeito, caso queira
a Railway em vez do Render.

## Docker

Também é possível publicar com Docker:

```bash
docker build -t quem-sou-eu .
docker run --rm -p 3001:3001 quem-sou-eu
```

Para subir o stack completo com Node, Nginx e um Cloudflare Quick Tunnel:

```bash
docker compose up --build -d
docker compose logs -f tunnel
```

O único endereço exposto no computador é `http://localhost:8080`. O log do serviço `tunnel` mostra uma URL `https://*.trycloudflare.com` para compartilhar com os amigos. O túnel é temporário e muda quando o serviço é recriado.

Para encerrar tudo:

```bash
docker compose down
```

Variáveis disponíveis estão em `.env.example`:

- `PORT`: porta HTTP/WebSocket, padrão `3001`.
- `HOST`: endereço de escuta, padrão `0.0.0.0`.
- `PUBLIC_ORIGIN`: origens permitidas pelo Socket.IO. Aceita lista separada por
  vírgula e `*` num rótulo de subdomínio (`https://*.vercel.app`). Vazio reflete
  qualquer origem — use só em desenvolvimento.
- `ROOM_TTL_MINUTES`: tempo de retenção de salas sem conexões.
- `VITE_SERVER_URL`: URL do servidor Socket.IO, lida em tempo de build da
  interface. Vazia quando um processo só serve tudo.

## Privacidade da rodada

O personagem atribuído fica somente na memória do servidor. Durante a rodada, o servidor cria uma visão diferente para cada socket: cada jogador recebe os personagens dos outros e não recebe o próprio. O quadro completo só é enviado no evento `round:finished`, depois que todos acertarem.

No modo `draw-impostor`, o mesmo princípio vale para a wordlist de animais e objetos: o impostor nunca recebe `draw.word` durante a rodada, e o papel de cada pessoa só aparece na revelação final. Acusações erradas só marcam o jogador como fora; o alvo escolhido não é transmitido aos outros participantes. Em “sem limite”, a vez avança manualmente; o anfitrião também pode encerrar e revelar a rodada quando quiser.

O `sessionStorage` do navegador guarda apenas código da sala, apelido, identificador do jogador e token de reconexão — nunca o personagem secreto.

## Verificações

```bash
npm test
npm run build
```
