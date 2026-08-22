import { DomainError } from './errors.ts'
import type { ParticipantId, Team } from './types.ts'

export function partnerOf(team: Team, participantId: ParticipantId): ParticipantId {
  if (participantId === team.participant1Id) return team.participant2Id
  if (participantId === team.participant2Id) return team.participant1Id
  throw new DomainError('NOT_ON_TEAM', 'Participante não pertence à dupla.')
}

export function teamHasParticipant(team: Team, participantId: ParticipantId): boolean {
  return team.participant1Id === participantId || team.participant2Id === participantId
}

export function fakeShuffleDestination(team: Team): ParticipantId {
  return partnerOf(team, team.firstRevealParticipantId)
}

export function fakeShuffleFrames(
  destinationId: ParticipantId,
  pickIntermediate: () => ParticipantId,
  frameCount: number,
): ParticipantId[] {
  const count = Math.max(frameCount, 1)
  const frames: ParticipantId[] = []
  for (let i = 0; i < count - 1; i += 1) {
    frames.push(pickIntermediate())
  }
  frames.push(destinationId)
  return frames
}
