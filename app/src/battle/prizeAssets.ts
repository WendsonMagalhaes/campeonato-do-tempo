/**
 * Mapa de valor de prêmio -> imagem correspondente. Cada valor precisa
 * ter um PNG em /public/assets/ui/ com esse nome exato (ex: 500 -> 500.png).
 * Adicione novas entradas aqui conforme novos valores/artes forem criados.
 */
export const PRIZE_IMAGE_BY_AMOUNT: Record<number, string> = {
  100: '/assets/ui/100.png',
  135: '/assets/ui/135.png',
  180: '/assets/ui/180.png',
  285: '/assets/ui/285.png',
  500: '/assets/ui/500.png',
}

/** Retorna o caminho da imagem pro valor, ou null se não houver arte pra esse valor. */
export function prizeImageForAmount(amount: number): string | null {
  return PRIZE_IMAGE_BY_AMOUNT[amount] ?? null
}

/**
 * Extrai o valor numérico de um texto formatado (ex: "R$ 500", "R$1.000",
 * "R$ 285,00") -- solução provisória enquanto prizeTable.ts não expõe o
 * valor numérico direto. Se você tiver acesso a esse arquivo, o ideal é
 * fazer prizeForWinner/prizeForLoser devolverem o número puro e não
 * precisar mais dessa função.
 */
export function parsePrizeAmount(label: string | null | undefined): number | null {
  if (!label) return null
  const match = label.match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return null
  const normalized = match[1].replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value) : null
}