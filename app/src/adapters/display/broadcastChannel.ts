import { CHANNEL } from '../../domain/constants.ts'
import type { CinematicEvent, PublicDisplayPort } from '../../application/ports.ts'

export function createBroadcastDisplay(): PublicDisplayPort {
  const projection = new BroadcastChannel(CHANNEL.projection)
  const cinematic = new BroadcastChannel(CHANNEL.cinematic)
  return {
    publish(projectionJson: string) {
      projection.postMessage(projectionJson)
    },
    publishCinematic(event: CinematicEvent) {
      cinematic.postMessage(event)
    },
  }
}

export function subscribeScoreboard(
  onProjection: (json: string) => void,
  onCinematic: (event: CinematicEvent) => void,
): () => void {
  const projection = new BroadcastChannel(CHANNEL.projection)
  const cinematic = new BroadcastChannel(CHANNEL.cinematic)
  projection.onmessage = (event: MessageEvent<string>) => onProjection(event.data)
  cinematic.onmessage = (event: MessageEvent<CinematicEvent>) => onCinematic(event.data)
  return () => {
    projection.close()
    cinematic.close()
  }
}
