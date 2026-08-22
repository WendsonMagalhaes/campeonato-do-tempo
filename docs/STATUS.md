# Status - Campeonato do Tempo 2026

**Atualizado:** 2026-08-22  
**Iteracao:** 240  
**Fase:** 8 IA Generator Tuning / QA Cirúrgico  
**Etapa:** Remoção cirúrgica de artefato/glifo no peito em idle_02 do Lailson e sincronização de assets  
**Branch:** cursor/operator-crud-scoreboard-sfx  
**Remoto:** https://github.com/livialucena/campeonato-do-tempo-2026

## Snapshot

| Item | Estado |
| --- | --- |
| **Docs SoT** | Raiz docs/ (docs/copa-ui/, docs/audio/) |
| **Runtime media SoT** | **app/public/assets/** |
| **Participantes SoT** | app/src/domain/participants.ts + app/public/assets/participants/ |
| **LOCKED fighters** | **35 participantes** (incluindo variante lailson2) |
| **Frames dos Lutadores** | 34 lutadores x 8 frames válidos (576x576 RGBA transparentes) com remoção de fundo conectada e QA cirúrgico aprovado |
| **Escala dos Lutadores** | Normalizada via `PARTICIPANT_CONTENT_HEIGHT` e `getParticipantScale` (Target 420px, Crianças 0.85x) |
| **Integração no React** | Completa (Animações customizadas estabilizadas, proporções medidas atualizadas) |

## Checks desta iteracao

| Check | Resultado | Nota |
| --- | --- | --- |
| testes | PASS | 124 testes passando (21 suítes em vitest) |
| typecheck | PASS | Tipagem TypeScript validada com 0 erros (`tsc -b`) |
| build | PASS | App validado com 0 erros de build (`vite build`) |
| docs atualizadas | PASS | STATUS + ITERATION_LOG |
| invariantes | PASS | 34 participantes registrados, integridade de frames e duplas |
| offline | PASS | Áudio e sprites operam 100% local |
| STATUS / ITERATION_LOG | PASS | Iteração: 240 |
| commit git | PASS | (esta iteração) |
| push GitHub | PASS | (esta iteração) |

## Feito nesta iteracao

1. **Inspeção e Localização do Artefato (`idle_02.png` do Lailson):**
   - Localizado artefato/glifo visual indesejado (traço diagonal escuro) no peitoral da camiseta creme em `idle_02.png`.
   - Coordenadas exatas do artefato: `x = [293, 317]`, `y = [265, 289]` (largura: 25px, altura: 25px, centro em torno de x=304, y=277).

2. **Correção e Limpeza Cirúrgica:**
   - Remoção do artefato reconstruindo a área a partir da amostragem e textura/sombreamento de `idle_01.png` ajustada à iluminação de `idle_02.png`.
   - Preservadas dobras e vincos naturais do tecido da camiseta, mantendo dimensões 576x576 RGBA, 100% de opacidade no corpo e transparência limpa no fundo externo.

3. **Sincronização em Todos os Diretórios:**
   - `app/public/assets/participants/lailson/fighter/idle_02.png` (Runtime SoT)
   - `assets/participants/lailson/fighter/idle_02.png`
   - `Copa_Esperanca_Fighter_Generator_Seed_v1/assets/participants/lailson/fighter/idle_02.png`
   - `Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/output/frames/lailson/idle_02.png`
   - Reconstrução e sincronização do contact sheet 4x2 em `Copa_Esperanca_Fighter_Generator_Seed_v1/tools/fighter-generator/review/lailson_frames_contact_sheet.png`, `app/public/assets/...` e diretórios correspondentes.
   - Verificação de hash SHA256 confirmando sincronia 100% entre todas as pastas.

4. **Validação:**
   - `npm --prefix app test -- --run` (PASS - 124 testes)
   - `npm --prefix app run typecheck` (PASS - 0 erros)
   - `npm --prefix app run build` (PASS - build gerado com sucesso)

## Bloqueios

Nenhum.

## Próxima Ação

Apresentar resumo ao usuário.
