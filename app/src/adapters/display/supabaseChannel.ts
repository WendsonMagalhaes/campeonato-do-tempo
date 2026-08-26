// supabaseChannel.ts
// Substituto de broadcastChannel.ts para funcionar com o app hospedado na
// Vercel: usa o Supabase Realtime (feature "Broadcast" de canais) como
// relay hospedado, em wss:// -- não precisa manter servidor nenhum rodando
// e funciona de qualquer rede, não só na mesma wifi do PC.
//
// Setup (uma vez):
//   1. Crie um projeto grátis em https://supabase.com
//   2. Em Project Settings > API, copie "Project URL" e a chave "anon public"
//   3. npm install @supabase/supabase-js
//   4. Adicione nas env vars (arquivo .env local e nas envs da Vercel):
//        VITE_SUPABASE_URL=...
//        VITE_SUPABASE_ANON_KEY=...
//      (no Vite, variáveis expostas ao navegador precisam do prefixo VITE_
//      -- process.env não existe no navegador, só no build do Next.js)
//
// Mesma interface de publish/subscribe do broadcastChannel.ts -- troca só
// o import nos dois pontos de uso (store.tsx e ScoreboardApp.tsx).

import { createClient } from '@supabase/supabase-js'
import type { CinematicEvent, PublicDisplayPort } from '../../application/ports.ts'

// Nome do canal Supabase. Se algum dia você tiver mais de um evento/torneio
// rodando ao mesmo tempo com o mesmo projeto Supabase, dê um nome diferente
// por torneio pra não misturar os comandos de um telão com o de outro.
const CHANNEL_NAME = 'esperanca-scoreboard'

let clientSingleton: ReturnType<typeof createClient> | null = null
function getClient() {
  if (clientSingleton) return clientSingleton
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas.',
    )
  }
  clientSingleton = createClient(url, key)
  return clientSingleton
}

/** Lado que PUBLICA -- usar no operador (store.tsx), no lugar de createBroadcastDisplay().
 *  `getCurrentProjectionJson` deve devolver o snapshot ATUAL (não um valor
 *  fixo) -- é chamado sob demanda quando um telão novo conecta e pede sync. */
export function createSupabaseDisplay(getCurrentProjectionJson: () => string): PublicDisplayPort {
  let ready = false
  let queue: Array<() => void> = []
  const channel = getClient().channel(CHANNEL_NAME, {
    config: { broadcast: { self: false }, private: false },
  })

  function sendOrQueue(send: () => void) {
    if (ready) send()
    else queue.push(send)
  }

  // Um telão que acabou de entrar (ou reconectou) não tem o estado atual --
  // ele pede via 'request_sync' e a gente responde com o snapshot completo,
  // não só com o próximo evento que vier.
  channel.on('broadcast', { event: 'request_sync' }, () => {
    sendOrQueue(() => {
      void channel.send({
        type: 'broadcast',
        event: 'projection',
        payload: { json: getCurrentProjectionJson() },
      })
    })
  })

  channel.subscribe((status, err) => {
    // eslint-disable-next-line no-console
    console.log('[supabase:operador] status =', status, err ?? '')
    if (status === 'SUBSCRIBED') {
      ready = true
      const pending = queue
      queue = []
      pending.forEach((send) => send())
    }
  })

  return {
    publish(projectionJson: string) {
      sendOrQueue(() => {
        void channel.send({
          type: 'broadcast',
          event: 'projection',
          payload: { json: projectionJson },
        })
      })
    },
    publishCinematic(event: CinematicEvent) {
      sendOrQueue(() => {
        void channel.send({
          type: 'broadcast',
          event: 'cinematic',
          payload: event,
        })
      })
    },
  }
}

/** Lado que ESCUTA -- usar no telão (ScoreboardApp.tsx), no lugar de subscribeScoreboard(). */
export function subscribeScoreboardSupabase(
  onProjection: (json: string) => void,
  onCinematic: (event: CinematicEvent) => void,
): () => void {
  const channel = getClient().channel(CHANNEL_NAME, {
    config: { broadcast: { self: false }, private: false },
  })
  channel.on('broadcast', { event: 'projection' }, ({ payload }) => {
    onProjection(payload.json as string)
  })
  channel.on('broadcast', { event: 'cinematic' }, ({ payload }) => {
    onCinematic(payload as CinematicEvent)
  })
  channel.subscribe((status, err) => {
    // eslint-disable-next-line no-console
    console.log('[supabase:telao] status =', status, err ?? '')
    if (status === 'SUBSCRIBED') {
      // Acabou de entrar (ou voltou de uma queda de conexão) -- pede o
      // snapshot atual em vez de esperar passivamente o próximo evento.
      void channel.send({ type: 'broadcast', event: 'request_sync', payload: {} })
    }
  })
  return () => {
    void getClient().removeChannel(channel)
  }
}