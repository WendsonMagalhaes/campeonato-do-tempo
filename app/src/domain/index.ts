export { DomainError } from './errors.ts'
export { handleCommand } from './engine.ts'
export { createInitialState, createLiveDeps, createSeededRandom } from './state.ts'
export { projectOperator, projectScoreboard } from './projections.ts'
export { applyDemoSetup, applyOfficialSetup, applyFullReveal, seedOfficialCommands, seedDemoCommands } from './seed.ts'
export {
  OFFICIAL_PARTICIPANTS,
  RESERVE_PARTICIPANTS,
  ALL_REGISTERED_PARTICIPANTS,
  getParticipantById,
  getParticipantBySlug,
  getParticipantByName,
  findParticipant,
  getParticipantAvatar,
  getParticipantBodyImage,
  validateParticipantRegistry,
} from './participants.ts'
export type { ParticipantDefinition } from './participants.ts'
export { fakeShuffleDestination, fakeShuffleFrames, partnerOf } from './teams.ts'
export {
  formatDuoName,
  formatPrize,
  formatRaceTime,
  formatSeconds,
  parseRaceTime,
  randomRaceTargetFormatted,
  randomRaceTargetMs,
  RACE_TIME_PLACEHOLDER,
  RANDOM_TARGET_MAX_MS,
  RANDOM_TARGET_MIN_MS,
  secondsToMs,
} from './time.ts'
export { CHANNEL, PARTICIPANT_COUNT, PRIZE, SCHEMA_VERSION, TEAM_COUNT } from './constants.ts'
export type { Command } from './commands.ts'
export type { EngineDeps, FighterVariant, TournamentState } from './types.ts'
export type { OperatorProjection, ScoreboardProjection } from './projections.ts'
