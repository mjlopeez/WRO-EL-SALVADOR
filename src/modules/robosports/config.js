// RoboSports 2026 — WRO El Salvador
// Disciplina: WRO RoboSports Double Tennis
// Categoría única: Open (11–19 años)
// Reglamento: sistema de pelotas (naranja +1, morada -2), menor puntaje gana cada partido.
// Un juego = 3 partidos. Gana el juego quien gane más partidos.
// Puntos de juego: Victoria = 3, Empate = 1, Derrota = 0.

export const CATEGORY = 'open'
export const CATEGORY_META = {
  open: { label: 'Open', ages: '11–19 años', born: '2007–2015' }
}

export const SPORT = 'Double Tennis'

export const MATCHES_PER_GAME = 3   // partidos por juego
export const MAX_ORANGE       = 9   // máx pelotas naranjas en un campo
export const MAX_PURPLE       = 2   // máx pelotas moradas en un campo

// Rondas de clasificación
export const ROUNDS = ['Fase 1', 'Fase 2', 'Semifinal', 'Final']

// ── Helpers de cálculo ─────────────────────────────────────────────────────────

/** Puntaje de un equipo según las pelotas en SU mitad: naranja +1, morada -2 */
export function calcScore(orange, purple) {
  return orange * 1 + purple * (-2)
}

/** Ganador de un partido: menor puntaje gana */
export function matchWinner(scoreA, scoreB) {
  if (scoreA < scoreB) return 'A'
  if (scoreB < scoreA) return 'B'
  return 'draw'
}

/**
 * Resultado de un juego completo a partir de sus 3 partidos.
 * Returns { winsA, winsB, draws, gameWinner, pointsA, pointsB }
 */
export function calcGameResult(matchData) {
  let winsA = 0, winsB = 0, draws = 0
  for (const m of matchData) {
    if (m.winner === 'A') winsA++
    else if (m.winner === 'B') winsB++
    else draws++
  }
  const gameWinner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'draw'
  const pointsA = gameWinner === 'A' ? 3 : gameWinner === 'draw' ? 1 : 0
  const pointsB = gameWinner === 'B' ? 3 : gameWinner === 'draw' ? 1 : 0
  return { winsA, winsB, draws, gameWinner, pointsA, pointsB }
}

/** Match vacío para el estado inicial */
export function emptyMatch() {
  return { orangeA: 0, purpleA: 0, scoreA: 0, orangeB: 0, purpleB: 0, scoreB: 0, winner: 'draw', forfeit: null }
}
