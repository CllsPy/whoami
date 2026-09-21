# Novo design do Caracol: retratos no traço Waldo

Troca os avatares de caixas de CSS por um desenho SVG por personagem, no padrão dos retratos do Where's Waldo: busto em círculo, tinta preta, cor chapada, e a peça da loja como identidade.
Cada peça é uma camada do desenho, e cada "splash" (retrato, close da peça, corpo inteiro) é só um `viewBox` diferente.

**Status**: planejado, não implementado. O design está em Draft até o dono aprovar a abordagem A.
As pendências visuais passaram por um polish com render nos tamanhos reais; o resultado está em [design.md](design.md#evidência-do-polish).

## Ordem de leitura

1. [spec.md](spec.md) - o que tem que acontecer: 41 requisitos testáveis (ARTE, LOJA, LISTA, MAPA, SPL).
2. [design.md](design.md) - como: abordagens, componentes, tabela de recortes, ordem das camadas, paleta, riscos.
3. [tasks.md](tasks.md) - 23 tasks atômicas em 6 fases, cada uma com teste e gate.

Onde os documentos divergirem do estudo visual, valem os documentos.

## Estudo visual

- Canvas (privado): https://claude.ai/artifact/RfVXMMf32X9vnRfh4byRKg
  Elenco, "um desenho, seis câmeras", loja interativa com provador, antes e depois, lista do mapa, splash.
- Protótipo da arte: [estudo/arte.mjs](estudo/arte.mjs). É a fonte da geometria que as tasks T5 e T6 portam para JSX.
- Renders do protótipo: [estudo/jogador.png](estudo/jogador.png) e [estudo/caracol.png](estudo/caracol.png).
- Evidência do polish, com as decisões aplicadas: [estudo/polish-desktop.png](estudo/polish-desktop.png) e [estudo/polish-mobile.png](estudo/polish-mobile.png), geradas por [estudo/evidencia.mjs](estudo/evidencia.mjs).
- O canvas ainda mostra "sem saldo" em cinza; a decisão final é em cor com anel tracejado.

Para regerar a folha de testes e a evidência:

```bash
node plano/new-design/estudo/folha.mjs player   # ou: snail
node plano/new-design/estudo/evidencia.mjs
xdg-open plano/new-design/estudo/folha-player.html
```

Os HTML gerados são descartáveis: apague depois de olhar, eles não entram no repositório.
O protótipo usa a pele `#c78261`, a cor do avatar atual (ARTE-15).

## Mapa do código

| O quê | Onde | O que acontece com ele |
| --- | --- | --- |
| Catálogo, slots, `CaracolOutfit` | `shared/caracol.ts:19-49` | Não muda. O teste de paridade (ARTE-05) lê daqui. |
| Preço já com Moeda e Raio | `server/caracol/game.ts:1335` | Não muda. O tom "sem saldo" usa `item.price` como chega. |
| Estado transmitido a cada 1 s, outfits em objetos novos | `server/caracol/game.ts:112`, `:1184`, `:1301-1342` | Não muda. É o motivo do `React.memo` com comparação por valor (ARTE-13). |
| `CosmeticAvatar` | `src/CaracolGame.tsx:663-686` | Apagado (T13). |
| Pontos de uso do avatar | `src/CaracolGame.tsx:599` (legenda), `:602` (bolso), `:607` (cartão do caracol), `:615` (lista) | Trocados por `CaracolMedallion` (T13). |
| Loja | `src/CaracolGame.tsx:688-732` | Movida para `src/CaracolShop.tsx` (T10), depois cards, prévia, abas e provador (T11, T12, T17). |
| Lista de jogadores | `src/CaracolGame.tsx:615` | Movida para `src/CaracolPlayers.tsx` (T15), depois tons (T16). |
| Mapa e glifos do mapa | `src/CaracolGame.tsx:640-661`, `:734-741` | Movidos para `src/CaracolMap.tsx` (T19), depois tokens novos (T20). |
| Socket aberto no import | `src/socket.ts:70`, `src/caracolSocket.ts:6` | Não muda. É por isso que nenhum teste importa `CaracolGame.tsx`. |
| `PlayerEffects` | `src/CaracolRoulette.tsx:102` | Reusado pela lista extraída. |
| Tokens de cor | `src/styles.css:3-26` | Não mudam. A paleta da arte copia e testa (ARTE-12). |
| CSS do avatar antigo | `src/styles.css:911-969`, `:1016-1017` | Apagado (T14). |
| CSS dos glifos do mapa e da lista | `src/styles.css:975-1009`, `:1075-1077`, `:1088`, `:1170` | Apagado (T21). |
| Regras `circle` dos tokens do mapa | `src/styles.css:1067`, `:1071`, `:1073` | Trocadas por classes do anel (T21); sem isso repintam o desenho. |
| Card da loja no celular | `src/styles.css:1367-1371` (media query de 620 px, `:1329`) | Ganha o medalhão de 68 px (T9). |
| Splash | `public/icons/caracol-splash.svg`, `index.html:14` | Passa a ser gerada por `scripts/render-caracol-splash.ts` (T22, T23). |
| Vitest | `vitest.config.ts` | Ganha `esbuild: { jsx: 'automatic' }` (T1). |

## Fatos verificados durante o planejamento

- Sem `esbuild.jsx` no `vitest.config.ts`, um teste que importa `.tsx` falha com "React is not defined". Com `jsx: 'automatic'`, `renderToStaticMarkup` renderiza em node.
- `useId` do React 19.2.8 gera ids como `_R_0_`, válidos dentro de `url(#…)`.
- `renderToStaticMarkup` converte `clipPath` e `strokeWidth` em `clip-path` e `stroke-width`.
- `tsx` só compila o JSX dos componentes com `--tsconfig tsconfig.app.json`.

## O que não foi verificado

- Se o iOS exibe SVG em `apple-touch-startup-image`. Vale hoje e continua valendo. Está como risco no design.
- Como `io()` se comporta em node sem `location` ao importar `CaracolGame.tsx`. O plano evita a questão movendo o que precisa de teste para arquivos próprios.
