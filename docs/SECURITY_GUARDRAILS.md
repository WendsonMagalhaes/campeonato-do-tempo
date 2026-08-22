# Security & Operational Guardrails

## Prioridade
Evitar erro humano e corrupção de estado durante evento ao vivo.

## Domínio
- rejeitar estado impossível;
- rejeitar R2 com jogador repetido da R1;
- rejeitar R3 se placar != 1x1;
- rejeitar R3 após 2x0;
- rejeitar cálculo sem 2 tempos atribuídos;
- rejeitar avanço sem vencedor confirmado.

## Fake shuffle
Nunca alterar formação cadastrada.

## Sorteio real
Persistir seed/resultado quando possível.
Após confirmação, proteger contra reroll acidental.

## Timer Capture
É input não confiável.
Nunca pontuar automaticamente.
Nunca associar pessoa automaticamente.
Operador sempre confirma atribuição.

## Mídia
Foto inválida → placeholder.
Áudio inválido → silencioso.
Vídeo inválido → pular.
Nenhuma mídia impede campeonato.

## Persistência
Autosave.
Backup/export.
Import validado.
Snapshot antes de reset.
Undo seguro.

## Rede
Nenhuma função crítica depende da internet.
Serviço CV é localhost.

## Privacidade
Fotos são assets locais do evento. Evitar upload para serviços externos por padrão.

## IA
Mudanças críticas exigem human gate conforme AGENTS.md.
