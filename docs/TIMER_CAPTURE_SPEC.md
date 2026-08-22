# Timer Capture Specification

## Objetivo
Ler, por webcam, o display digital do Race Timer físico sem integração eletrônica direta.

## Princípio arquitetural
Timer Capture é um periférico. Ele NÃO altera placar, rodada, participante ou chave.

Produz somente candidatos:
```json
{
  "event": "TIMER_VALUE_DETECTED",
  "value": 1.56,
  "confidence": 0.98,
  "capturedAt": "...",
  "frameId": "..."
}
```

## Arquitetura sugerida
```text
Race Timer físico
      ↓ imagem
Webcam USB/integrada
      ↓
Python + OpenCV
      ↓
ROI / correção de perspectiva
      ↓
segmentação / reconhecimento
      ↓
estabilização temporal
      ↓
serviço local
      ↓ WebSocket/HTTP localhost
React Operator UI
```

## Por que Python
OpenCV/Python é apropriado para prototipar leitura de display fixo. Não é necessário backend de negócio remoto.

## Estratégia de reconhecimento
Evitar OCR genérico como primeira estratégia.
Como o display é previsível:
- calibrar região de interesse (ROI);
- corrigir perspectiva;
- melhorar contraste;
- reconhecer dígitos/segmentos ou templates;
- validar formato esperado;
- usar estabilidade temporal.

## Detecção de parada
Não emitir evento a cada frame.
Exemplo:
1.54 → 1.55 → 1.56 → 1.56 → 1.56 → 1.56

Quando o mesmo valor permanecer estável pelo limiar configurado, gerar candidato.

## Máquina de estado sugerida
IDLE → RUNNING → STABILIZING → STOPPED_CANDIDATE → EMITTED → WAIT_RESET.

## Operador
Ao receber `00:01:56` (apresentação canônica `MM:SS:CS`; domínio continua em ms):
- mostrar valor grande;
- mostrar frame/crop opcional para conferência;
- botões para atribuir aos participantes ativos;
- opção descartar;
- opção editar manualmente.

Uso ao vivo (local-first):
1. Subir o periférico em `timer-capture/` (`python server.py` → `127.0.0.1:8765`).
2. Conferir no painel o status **Periférico localhost: online** (GET `/health`).
3. Webcam aponta ao Race Timer físico; o serviço emite candidatos estáveis via GET `/candidate`.
4. Operador atribui A/B ou descarta. Sem periférico: **Simular leitura** ou entrada manual.

Apresentação de tempos no sistema: `formatRaceTime` → `MM:SS:CS` (centesimos no 3º grupo).
Entrada do operador: `parseRaceTime` aceita `MM:SS:CS` e, por compatibilidade, decimais legados (`1.56` / `1,56`).

Depois da atribuição:
`DetectedTime → AssignedAttempt`

## Cálculo
O botão CALCULAR só fica disponível quando:
- targetTime existe;
- participante A possui tentativa atribuída;
- participante B possui tentativa atribuída;
- operador ainda não confirmou resultado.

## Fallback manual
Obrigatório.
Campo manual deve aceitar o mesmo formato e entrar pelo mesmo fluxo de validação.

## Calibração
Tela de calibração:
- selecionar câmera;
- preview;
- desenhar ROI;
- testar leitura;
- ajustar rotação/perspectiva;
- salvar configuração local.

## Riscos
- reflexo;
- flicker;
- baixa exposição;
- ângulo;
- autofocus;
- dígito parcialmente aceso;
- câmera mexida;
- display resetando.

Mitigações:
- tripé/suporte;
- ROI fixa;
- bloquear foco/exposição quando suportado;
- confidence;
- estabilidade temporal;
- confirmação humana;
- fallback manual.

## Protocolo local
Pode ser WebSocket ou HTTP localhost. Deve existir mock adapter para desenvolver o frontend sem câmera.
