# Roleta do Caracol - estudo de interface

Artefato visual da feature descrita em [../roleta-do-caracol.md](../roleta-do-caracol.md).
Nada aqui é código de produção: é a direção visual para aprovar antes de implementar.

Versão online (canvas editável, privado): https://claude.ai/artifact/To8gPeAFA91LkMWUjDP7iM

## Como ver

Abra `index.html` no navegador.
É um arquivo único e estático, sem build e sem servidor.

```bash
xdg-open index.html
```

## O que tem

Seis artboards, na ordem em que aparecem:

| Artboard | O que mostra |
|---|---|
| `Main` | A tela do jogo inteira, com o cartão novo encaixado na coluna de controle |
| `Estados` | Os quatro estados do cartão: disponível, esperando, congelado, sem cidade |
| `Revela-buff` | O takeover da revelação, versão Super Star |
| `Revela-debuff` | O mesmo takeover, versão Banana |
| `Itens` | Os 13 símbolos SVG, com efeito e duração de cada um |
| `Mobile` | A coluna em 390 px, com as rotações removidas |

## Arquivos

```
index.html           pagina standalone, abre no navegador
canvas.json          indice do canvas: posicao e tamanho de cada artboard
artboards/*.dc.html  a fonte de cada artboard
```

Os `.dc.html` são o formato do canvas e **não abrem sozinhos** no navegador: eles esperam o runtime do editor.
O `index.html` extrai a marcação de dentro deles e monta tudo numa página só, que abre em qualquer lugar.
Para regerar o `index.html` depois de mexer em um artboard, a extração é mecânica: pegar o conteúdo entre `<x-dc>` e `</x-dc>`, descartar o bloco `<helmet>` e empilhar.

## Decisões registradas aqui

**Revelação em takeover.** O giro é o único momento do dia, então ele ocupa a tela.
O mapa escurece para 30%, a carta vem torta e a sombra é mais pesada que a dos cartões normais (16 px contra 13 px) para ela flutuar acima do resto.

**Símbolos desenhados, nenhum emoji.** Traço de 1,8 px na mesma grade de 24 px, no mesmo vocabulário do caracol SVG que já está no mapa.
Emoji mudaria de forma entre iPhone e Android e ignoraria a paleta.

**Acid para buff, coral para debuff.** Os dois tokens já existem no jogo e já carregam esse sentido: acid é ação e coral é custo.

**O contador de 24 h é um anel**, no canto onde os outros cartões põem o avatar do caracol.
Mantém o ritmo da coluna de cima a baixo.

**O cabeçalho do cartão troca conforme o estado.**
"A roleta" quando dá para girar, "Volta em 7h20" quando não dá: o tempo vira o título porque é a única coisa que importa naquele momento.

## Pendência para a implementação

O mock usa `#5a5768` como texto suave sobre o papel.
Esse valor precisa entrar no `:root` de `src/styles.css` como `--ink-soft`.
O token é usado em `.caracol-discount-note` mas nunca foi definido, então hoje aquela nota herda a cor cheia em vez de ficar suave.
