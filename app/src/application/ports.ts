import type { TournamentState } from '../domain/types.ts'

export interface PersistencePort {
  save: (state: TournamentState) => Promise<void>
  load: () => Promise<TournamentState | null>
  savePhoto: (id: string, dataUrl: string) => Promise<void>
  getPhoto: (id: string) => Promise<string | null>
  exportBackup: () => Promise<string>
  importBackup: (json: string) => Promise<TournamentState>
}

export interface TimerCandidate {
  valueSeconds: number
  confidence: number
  frameId: string | null
}

export interface TimerCapturePort {
  start: (onCandidate: (candidate: TimerCandidate) => void) => Promise<void>
  stop: () => Promise<void>
  simulate: (valueSeconds: number) => void
}

export interface AudioPort {
  play: (name: string) => void
}

export type CinematicEvent =
  | {
      type: 'fake_shuffle'
      firstParticipantId: string
      destinationParticipantId: string
      candidateIds: string[]
      teamName: string
    }
  | { type: 'bracket_draw' }
  | { type: 'vs_impact' }
  | {
      type: 'round3_draft'
      participantAId: string | null
      participantBId: string | null
    }

export interface PublicDisplayPort {
  publish: (projectionJson: string) => void
  publishCinematic: (event: CinematicEvent) => void
}
