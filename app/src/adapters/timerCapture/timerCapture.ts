import type { TimerCandidate, TimerCapturePort } from '../../application/ports.ts'

export function createMockTimerCapture(): TimerCapturePort {
  let handler: ((candidate: TimerCandidate) => void) | null = null
  return {
    async start(onCandidate) {
      handler = onCandidate
    },
    async stop() {
      handler = null
    },
    simulate(valueSeconds: number) {
      console.log('[TimerCapture] Simulado local:', valueSeconds)
      handler?.({
        valueSeconds,
        confidence: 1,
        frameId: `mock-${Date.now()}`,
      })
    },
  }
}

export function createLocalhostTimerCapture(baseUrl = 'http://127.0.0.1:8765'): TimerCapturePort {
  let timer: ReturnType<typeof setInterval> | null = null
  let handler: ((candidate: TimerCandidate) => void) | null = null
  const seen = new Set<string>()
  return {
    async start(onCandidate) {
      handler = onCandidate
      timer = setInterval(() => {
        void fetch(`${baseUrl}/candidate`, { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : null))
          .then((payload: { id?: string; value?: number; confidence?: number; frameId?: string } | null) => {
            if (!payload?.id || seen.has(payload.id) || typeof payload.value !== 'number') return
            seen.add(payload.id)
            console.log('[TimerCapture] Recebido do server:', payload)
            handler?.({
              valueSeconds: payload.value,
              confidence: payload.confidence ?? 0,
              frameId: payload.frameId ?? payload.id,
            })
          })
          .catch(() => {
            /* câmera/serviço ausente: operador segue no manual */
          })
      }, 400)
    },
    async stop() {
      if (timer) clearInterval(timer)
      timer = null
      handler = null
    },
    simulate(valueSeconds: number) {
      console.log('[TimerCapture] Simulado via interface mock:', valueSeconds)
      handler?.({ valueSeconds, confidence: 1, frameId: 'local-sim' })
    },
  }
}
