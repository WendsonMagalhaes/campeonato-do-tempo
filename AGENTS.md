# AGENTS.md — Regras obrigatórias para agentes de IA

## 1. Missão
Implementar o Campeonato do Tempo 2026 como aplicação local-first, segura para operação ao vivo, visualmente inspirada em fighting games/arcades dos anos 90 e fiel às regras deste pacote.

## 2. Ordem de autoridade
1. `docs/DOMAIN_RULES.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/SDD.md`
4. `docs/SECURITY_GUARDRAILS.md`
5. demais documentos (mapa em `docs/SPEC_INDEX.md`)

**Fonte única de verdade (SoT):**
- Especificações e manifests: raiz `docs/` (UI Copa em `docs/copa-ui/`, áudio em `docs/audio/`).
- Mídia de runtime (imagens/áudio/fonts/sprites/frames): **`app/public/assets/`** (URLs `/assets/...`).
- Raiz `assets/` = apenas extras de projeto (brand/participants/video), **não** autoridade de runtime.
- Pastas `Copa_Esperanca_Cursor_Pack/` e `audio_addon/` são **arquivo/ponteiro**, não autoridade.

**UI híbrida (regra humana):** Team Formation = PNG estrutural; Opening/Versus/R3/Qualified/Champion/Bracket = layers canônicas.

Em caso de conflito, NÃO inventar solução. Parar e solicitar decisão humana. Novos assets colados no chat → `docs/ASSET_INTAKE.md` (`app/public/assets/...`).

## 3. Invariantes absolutas
- 32 participantes.
- 16 duplas.
- 2 integrantes por dupla.
- Formação das duplas é previamente cadastrada.
- O fake shuffle é somente apresentação e nunca altera uma dupla.
- Sorteio dos confrontos pode ser real.
- Oitavas começam com 8 confrontos.
- Melhor de 3.
- Primeiro a 2 vitórias encerra.
- Rodada 1 usa um integrante de cada dupla.
- Rodada 2 usa obrigatoriamente o integrante que não jogou a rodada 1 de cada dupla.
- Rodada 3 existe somente em 1x1.
- Na rodada 3, cada dupla pode escolher qualquer um de seus 2 integrantes.
- Empate de diferença não altera placar e exige desempate.
- Timer Capture nunca possui autoridade sobre o campeonato.
- Webcam apenas produz candidatos de tempo.
- Operador atribui tempo a participante.
- Cálculo só é habilitado quando os dois lados têm tempos atribuídos.
- Entrada manual sempre disponível.
- Falha de câmera/áudio/foto nunca pode impedir continuidade.
- O Race Timer físico não é controlado pelo software.

## 4. Regras de implementação
- Regra de negócio no domínio, não em componentes React.
- UI envia comandos; domínio valida.
- Estado confirmado deve ser persistido.
- Telão é somente leitura.
- Não introduzir servidor remoto obrigatório.
- Não introduzir CDN obrigatória.
- Não copiar assets proprietários de Street Fighter, Mortal Kombat, KOF ou outras franquias.

## 5. Human gates
Exigir aprovação humana para:
- alteração de regra;
- premiação;
- lógica de fake shuffle;
- lógica de sorteio real;
- estrutura da chave;
- persistência;
- protocolo Timer Capture;
- dependência externa;
- rede externa;
- alteração de dados coletados;
- remoção de fallback manual.

GitHub é autorizado para versionar especificações e código. Não substitui o app local-first e não pode virar requisito de runtime do campeonato.

## 6. Loop obrigatório
PLAN → SPEC → TEST → IMPLEMENT → VERIFY → REVIEW → DOCUMENT → STATUS → VERSION.

## 7. Definition of Done
- testes passam;
- typecheck passa;
- build passa;
- invariantes passam;
- funciona offline;
- fluxo manual funciona sem webcam;
- fluxo com Timer Capture pode ser simulado;
- operador consegue corrigir erro antes de confirmar;
- documentação afetada atualizada;
- `docs/STATUS.md` atualizado;
- `docs/ITERATION_LOG.md` incrementado;
- alteração commitada no git;
- alteração enviada ao GitHub, salvo se o humano pedir para não enviar.

## 8. Versionamento GitHub
Specs e código gerado vivem no mesmo repositório.

- Versionar `AGENTS.md`, `docs/`, `wireframes/`, `assets/` (extras de projeto), **`app/public/assets/` (SoT de mídia de runtime)** e o código da aplicação.
- Não commitar segredos, `.env`, credenciais, fotos reais de participantes sem autorização explícita, `node_modules/`, `dist/`, `.venv/` ou caches.
- Cada iteração concluída deve gerar um commit local.
- O commit deve ir para `origin` ao final da iteração, salvo pedido contrário.
- Não force-push em `main`. Não alterar histórico remoto.

## 9. Status check por iteração
Nenhuma iteração está encerrada sem status.

Antes de terminar o turno:
1. Atualizar o snapshot em `docs/STATUS.md`.
2. Acrescentar uma linha em `docs/ITERATION_LOG.md`.
3. Preencher cada item do Definition of Done com `PASS`, `FAIL` ou `N/A`.
4. Registrar fase, etapa, o que mudou, bloqueios, human gates abertos e próxima ação.
5. Commitar specs, código e status juntos.
6. Enviar ao GitHub quando o remoto existir e o humano não tiver pedido para reter o push.

Se um check for `FAIL` ou `N/A` em item já exigível, declarar isso no STATUS. Não fingir verde.
