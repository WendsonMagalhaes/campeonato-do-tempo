# FONT v4 — DEFEITOS CONHECIDOS DE ARTE (HUMAN GATE ABERTO)

Estes dois problemas são de **arte dos glifos** entregues no pacote
*Copa Esperança Font Fix v4 — TRUE TRANSPARENT*, não do renderer. O renderer
apenas desenha o que o spec descreve. Corrigir exige regerar assets, o que é
human gate (alteração de dados coletados / assets aprovados).

Nada foi "consertado" por inferência. Não inventar crop, inset ou métrica.

---

## Tentativa de Font Fix v5 — ABANDONADA (2026-08-15)

Uma tentativa automática de regenerar glifos a partir de `font_source_sheet.png`
(bbox + key-out + escala uniforme) **corrompeu** a fonte em runtime: letras
sobrepostas, caixas cinza/brancas, texto ilegível (ex.: Team Formation
"DUPLA HORMADA").

**Ação tomada:** regeneração parada; **345 PNGs** e `FONT_METRICS_V4.json`
restaurados do pacote original em
`Downloads/Copa_Esperanca_Font_Fix_v4_TRUE_TRANSPARENT_2026-08-15/`;
`FONT_METRICS_V5.json` removido; `font-v4.generated.ts` regenerado a partir do
spec v4 limpo.

**Decisão:** v5 **não** será produzido por inferência no repo. O humano deve
entregar um pacote v5 limpo (glifos + métricas + proof), ou aceitar os defeitos
v4 abaixo. Scripts experimentais em `.tmp_font_v5/` não são autoridade.

---

## Defeito 1 — BLOQUEANTE: acentos superiores foram apagados dos glifos

O passo de limpeza do v4 (`docs/CLEANUP_REPORT_V4.json` do pacote, campo
`removed_alpha_pixels`) removeu a barra do acento junto com os "restos de
divisória" da folha original. Resultado: todo glifo com diacrítico **superior**
perdeu o acento e virou a letra base.

Evidência: no spec, `source.bbox` do glifo tem a altura completa (com acento),
mas o PNG entregue é ~38–41 px mais baixo.

| glifo | altura do bbox (spec) | altura do PNG entregue | perdido |
|---|---|---|---|
| Á À | 128 | 88 | 40 |
| Â | 129 | 89 | 40 |
| Ã | 127 | 88 | 39 |
| É | 128 | 89 | 39 |
| Ê | 125 | 87 | 38 |
| Í | 127 | 89 | 38 |
| Ó | 127 | 88 | 39 |
| Ô | 124 | 86 | 38 |
| Õ | 126 | 88 | 38 |
| Ú | 127 | 89 | 38 |
| á à â ã é ê í ó ô õ ú | 110–115 | 74–76 | 36–41 |

`Ç` e `ç` estão **corretos** (a cedilha fica abaixo e sobreviveu).

Impacto no telão: `CAMPEÃ` sai `CAMPEA`, `CLIQUE PARA INICIAR ÁUDIO` sai
`... AUDIO`, `COPA ESPERANÇA` fica correto (só usa Ç).

**Decisão humana necessária.** Opções:
1. Entregar um **pacote Font Fix v5 limpo** (humano / arte), com acentos
   recortados do bbox completo e `small`/`medium` em escala uniforme — **não**
   regenerar por script ad-hoc no repo (tentativa 2026-08-15 falhou).
2. Aceitar o telão sem acentos e ajustar os textos para evitá-los.

---

## Defeito 2 — Pontuação inflada em `small` e `medium`

Os PNGs de `small` e `medium` foram gerados redimensionando **cada glifo
individualmente** para preencher a altura de linha (64 / 96), em vez de aplicar
um fator único por tamanho. Como cada glifo tem altura natural diferente, cada
um recebeu um fator diferente. Glifos baixos (pontuação) foram ampliados demais.

Fator de inflação = `128 / altura_natural_large`, comparado com o redimensionamento
uniforme (`0.5`) que preservaria as proporções:

| glifo | inflação | largura em `small` |
|---|---|---|
| `_` | 4,00× | 250 |
| `=` | 3,76× | 186 |
| `-` | 3,37× | 140 |
| `.` | 3,28× | 85 |
| `:` | 3,28× | 89 |
| `"` | 3,12× | 72 |
| `'` | 3,05× | 67 |
| `;` | 2,51× | 69 |
| `,` | 2,42× | 74 |

Referência: `A` em `small` tem 79 px de largura. Ou seja, o hífen fica **mais
largo que um A** e o ponto quase igual.

Letras e dígitos variam entre 1,16× (`Q`) e 1,91× (`i`) — perceptível, porém
tolerável. O tamanho `large` está correto (mantém o recorte natural).

O próprio preview do pacote mostra o defeito
(`previews/FONT_FIX_V4_PROOF.png`, linha `3,50 S — R$ 500,00`).

Textos do telão hoje afetados:
- `16 DUPLAS - MELHOR DE 3` (opening, `small`)
- `TEMPO ALVO  3,00` (battle HUD, `medium`)
- mensagens de HUD com `-`, ex. `VENCE A RODADA - <dupla>` (`medium`)
- título Round 3 `RODADA 3 - ESCOLHA O REPRESENTANTE` (`large` — hífen em large OK)

**Decisão humana necessária.** Opções:
1. Regerar `small`/`medium` com fator único por tamanho (0,5 e 0,75 sobre
   `large`), preservando proporções e recalculando `width`/`advance`/`top`.
2. Derivar `small`/`medium` em runtime a partir dos PNGs `large` escalados por
   `lineHeight / 128` — descarta os PNGs por tamanho e as larguras por tamanho
   do spec, portanto contraria a diretiva de honrar `files[size]`.
3. Aceitar como está e evitar pontuação em `small`/`medium`.
