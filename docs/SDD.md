# Software Design Document

## Stack recomendada
### Aplicação
- React
- TypeScript
- Vite
- IndexedDB
- CSS/animation library leve se necessária

### Timer Capture
- Python
- OpenCV
- pequeno serviço localhost
- WebSocket ou HTTP

Não há necessidade de banco remoto ou backend de negócio.

## Componentes
```text
                       ┌──────────────────┐
                       │ TV / SCOREBOARD  │
                       │ read-only        │
                       └────────▲─────────┘
                                │ projection
┌─────────────┐       ┌─────────┴──────────┐
│ Race Timer  │       │ React Application │
└──────┬──────┘       │ Operator + Public │
       │              └─────────┬──────────┘
       ▼                        │ commands
┌─────────────┐                 ▼
│ Webcam      │       ┌────────────────────┐
└──────┬──────┘       │ Application Layer  │
       ▼              └─────────┬──────────┘
┌─────────────┐                 ▼
│ Python CV   │──────►┌────────────────────┐
│ Adapter     │ event │ Tournament Domain  │
└─────────────┘       └─────────┬──────────┘
                                ▼
                       ┌────────────────────┐
                       │ IndexedDB / Backup │
                       └────────────────────┘
```

## Entidades
Participant(id,name,photoAssetId,fighterVariant)
- `fighterVariant`: `'male' | 'female'` — sprite body type for battle (explicit field; never inferred from name).
- Side color (blue/red) comes from match side A/B, not from `fighterVariant`.
Team(id,participant1Id,participant2Id,revealOrder,status,guaranteedPrize)
Match(id,stage,position,teamAId,teamBId,scoreA,scoreB,status,winnerTeamId)
Round(id,matchId,number,targetTime,participantAId,participantBId,attemptA,attemptB,status,winnerTeamId)
DetectedTimerValue(id,value,confidence,capturedAt,status)
AssignedAttempt(id,detectedValueId?,participantId,value,source)
Tournament(id,status,bracket,...)

## Commands
- RegisterParticipant
- UploadParticipantPhoto
- DefineTeam
- RevealNextTeam
- DrawBracket
- ConfirmBracket
- StartMatch
- SelectRound1Players
- StartRound
- RegisterTargetTime
- ReceiveTimerCandidate
- AssignTimerValue
- RegisterManualTime
- CalculateRound
- ConfirmRound
- SelectRound3Representatives
- ConfirmMatchWinner
- UndoLastOperation
- ExportBackup
- ImportBackup

## Bracket / confronto ativo
Somente um confronto pode estar em andamento (`active` ou `awaiting_confirmation`).
`StartMatch` é rejeitado até `ConfirmMatchWinner` classificar o vencedor na chave.
Persistência (`migrateTournamentState`) repara confrontos órfãos em `awaiting_confirmation` e re-aplica a propagação de vencedores ao carregar.

## Projections
OperatorProjection contém controles e dados técnicos.
ScoreboardProjection contém somente dados públicos/revelados.

## Persistência
Snapshot após comando confirmado.
Event/operation log leve para undo e auditoria.
Schema versionado.
Export/import.

## Offline
React, fontes, fotos, sons, vídeo e backgrounds locais.
Timer service comunica apenas em localhost.

## Telão
Duas janelas/abas com BroadcastChannel ou mecanismo equivalente.
A janela pública nunca envia comandos de domínio.
