import type { FighterVariant } from './types.ts'

export type IndividualCommand =
  | {
      type: 'RegisterIndividualParticipant'
      name: string
      fighterVariant: FighterVariant
    }
  | {
      type: 'EditIndividualParticipant'
      participantId: string
      name: string
      fighterVariant: FighterVariant
    }
  | {
      type: 'RemoveIndividualParticipant'
      participantId: string
    }
  | {
      type: 'UploadIndividualParticipantPhoto'
      participantId: string
      photoAssetId: string
    }
  | {
      type: 'UploadIndividualParticipantFightPhoto'
      participantId: string
      fightPhotoAssetId: string
    }
  | {
      type: 'DefineIndividualMatch'
      label: string
      participantAId: string
      participantBId: string
      position: number
    }
  | {
      type: 'EditIndividualMatch'
      matchId: string
      label: string
      participantAId: string
      participantBId: string
      position: number
    }
  | {
      type: 'RemoveIndividualMatch'
      matchId: string
    }
  | {
      type: 'StartIndividualReveal'
    }
  | {
      type: 'RevealNextIndividualMatch'
    }
  | {
      type: 'StartIndividualMatch'
      matchId: string
    }
  | {
      type: 'RegisterTargetTime'
      seconds: number
    }
  | {
      type: 'RegisterManualTime'
      participantId: string
      seconds: number
    }
  | {
      type: 'ReceiveTimerCandidate'
      valueSeconds: number
      confidence: number
      frameId: string | null
    }
  | {
      type: 'AssignTimerValue'
      detectedValueId: string
      participantId: string
    }
  | {
      type: 'DiscardTimerCandidate'
      detectedValueId: string
    }
  | {
      type: 'ResolveIndividualRound'
    }
  | {
      type: 'StartIndividualTiebreaker'
    }
  | {
      type: 'ConfirmIndividualMatchWinner'
      matchId?: string
    }
  /**
   * Volta o torneio para a tela de preparação,
   * mas mantém os participantes cadastrados.
   */
  | {
      type: 'ResetIndividualTournament'
    }