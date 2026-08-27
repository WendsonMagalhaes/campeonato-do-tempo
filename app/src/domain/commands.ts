import type {
  DetectedValueId,
  FighterVariant,
  MatchId,
  ParticipantId,
  TeamId,
} from './types.ts'

export type Command =
  | {
      type: 'RegisterParticipant'
      name: string
      fighterVariant: FighterVariant
      id?: ParticipantId
      slug?: string
      photoAssetId?: string | null
      avatar?: string | null
      bodyImage?: string | null
      /** Fight-avatar registry fallback, resolved like avatar/bodyImage when omitted. */
      fightAvatar?: string | null
    }
  | { type: 'EditParticipant'; participantId: ParticipantId; name: string; fighterVariant: FighterVariant }
  | { type: 'RemoveParticipant'; participantId: ParticipantId }
  | { type: 'UploadParticipantPhoto'; participantId: ParticipantId; photoAssetId: string | null }
  | { type: 'UploadParticipantFightPhoto'; participantId: ParticipantId; fightPhotoAssetId: string | null }
  | {
      type: 'DefineTeam'
      name: string
      participant1Id: ParticipantId
      participant2Id: ParticipantId
      firstRevealParticipantId: ParticipantId
      revealOrder: number
    }
  | {
      type: 'EditTeam'
      teamId: TeamId
      name: string
      participant1Id: ParticipantId
      participant2Id: ParticipantId
      firstRevealParticipantId: ParticipantId
      revealOrder: number
    }
  | { type: 'RemoveTeam'; teamId: TeamId }
  | { type: 'StartTeamReveal' }
  | { type: 'RevealNextTeam' }
  | { type: 'DrawBracket' }
  | { type: 'ConfirmBracket' }
  | { type: 'StartMatch'; matchId: MatchId }
  | {
      type: 'SelectRound1Players'
      participantAId: ParticipantId
      participantBId: ParticipantId
    }
  | { type: 'StartRound2' }
  | {
      /**
       * Rodada decisiva (3, 4 ou 5 — conforme a fase). O motor calcula o
       * número da rodada sozinho a partir do histórico do confronto; o
       * operador só escolhe os representantes.
       */
      type: 'SelectRepresentatives'
      participantAId: ParticipantId
      participantBId: ParticipantId
    }
  | { type: 'RegisterTargetTime'; seconds: number }
  | {
      type: 'ReceiveTimerCandidate'
      valueSeconds: number
      confidence: number
      frameId: string | null
    }
  | { type: 'AssignTimerValue'; detectedValueId: DetectedValueId; participantId: ParticipantId }
  | { type: 'DiscardTimerCandidate'; detectedValueId: DetectedValueId }
  | { type: 'RegisterManualTime'; participantId: ParticipantId; seconds: number }
  | { type: 'CalculateRound' }
  | { type: 'RevealRound' }
  | { type: 'ConfirmRound' }
  /** Operator one-shot: calculate → reveal on scoreboard → confirm (stops at tie). */
  | { type: 'ResolveRound' }
  | { type: 'StartTiebreaker' }
  /** Optional matchId confirms an awaiting_confirmation match (incl. orphans). */
  | { type: 'ConfirmMatchWinner'; matchId?: MatchId }
  | { type: 'ClearCameraCandidates' }
  /**
   * Operator-only rehearsal shortcut: auto-complete pending matches with
   * deterministic manual times (team A wins the necessary rounds) until the
   * final is ready or the champion is crowned. Does not touch Timer Capture.
   */
  | { type: 'SimulateBracketProgress'; until: 'final' | 'champion' }