export type MatchStage = 'oitavas' | 'quartas' | 'semifinais' | 'final'

const STAGE_PRIZE: Record<MatchStage, number> = {
  oitavas: 100,
  quartas: 135,
  semifinais: 180,
  final: 285, // vice-campeã
}

const CHAMPION_PRIZE = 500

const NEXT_STAGE: Partial<Record<MatchStage, MatchStage>> = {
  oitavas: 'quartas',
  quartas: 'semifinais',
  semifinais: 'final',
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatStagePrize(value: number): string {
  return currencyFormatter.format(value)
}

/** Prêmio de quem PERDE o confronto na fase `stage`. */
export function prizeForLoser(stage: MatchStage): string {
  return formatStagePrize(STAGE_PRIZE[stage])
}

/** Prêmio garantido de quem VENCE o confronto na fase `stage` (valor da próxima fase, ou campeã se venceu a final). */
export function prizeForWinner(stage: MatchStage): string {
  const next = NEXT_STAGE[stage]
  return formatStagePrize(next ? STAGE_PRIZE[next] : CHAMPION_PRIZE)
}