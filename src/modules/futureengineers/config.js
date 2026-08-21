// Future Engineers 2026 — Self-Driving Cars
// Puntuación máxima: 122 pts (mejor Abierto + mejor Obstáculos + Diario)

// ── Rúbrica Diario de Ingeniería (5 criterios × máx 6 pts = 30 pts) ──────────
export const MAX_SCORE = 122
export const MAX_DIARIO = 30
export const MAX_ABIERTO = 30
export const MAX_OBSTACULOS = 62
export const SCORE_OPTIONS = [6, 4, 2, 0]

export const RUBRIC = [
  {
    id: 'mobility',
    label: 'Movilidad y diseño mecánico',
    shortLabel: 'Mecánica',
    description: 'Diseño del chasis, mecanismo de dirección, transmisión, par motor/velocidad, estabilidad.',
    levels: {
      6: 'Razonamientos sobre par/velocidad, compensaciones de diseño, pruebas e iteraciones que afectan al rendimiento.',
      4: 'Explicación clara del chasis, transmisión y dirección; incluye diagramas; reproducible.',
      2: 'Describe el aspecto del robot; sin razonamientos ni diagramas.',
      0: 'No se proporcionó información o el contenido era irrelevante.',
    },
  },
  {
    id: 'power',
    label: 'Arquitectura de potencia y sensores',
    shortLabel: 'Energía/Sensores',
    description: 'Sistema de alimentación, selección y ubicación de sensores, calibración, diagramas de cableado.',
    levels: {
      6: 'Presupuesto energético, compensaciones de sensores, ubicación justificada, método de calibración, puntos de fallo e iteración.',
      4: 'Diagrama de cableado; explicación de selección de sensores; reproducible.',
      2: 'Enumera baterías/sensores; sin diagramas; explicación mínima.',
      0: 'No se proporciona información sobre alimentación ni sensores.',
    },
  },
  {
    id: 'software',
    label: 'Arquitectura de software y estrategia',
    shortLabel: 'Software',
    description: 'Modularidad del código, máquinas de estado, seguimiento de carril, lógica de obstáculos.',
    levels: {
      6: 'Máquina de estados justificada; algoritmo explicado; manejo de casos extremos; métricas de validación.',
      4: 'Diagrama de flujo; explicaciones de módulos; descripción de lógica de obstáculos; reproducible.',
      2: 'Descripción básica del software; detalles limitados sobre la estrategia.',
      0: 'Código pegado sin explicación.',
    },
  },
  {
    id: 'systems',
    label: 'Pensamiento sistémico y decisiones de ingeniería',
    shortLabel: 'Ing. de sistemas',
    description: 'Interacción de subsistemas, restricciones, compensaciones, ciclos de iteración.',
    levels: {
      6: 'Restricciones explícitas, compensaciones, ciclos de iteración, análisis de riesgos, razonamiento basado en datos.',
      4: 'Asignación clara de subsistemas; explicación de interacciones y restricciones.',
      2: 'Algunos razonamientos o descripciones; incompleto.',
      0: 'No se aprecia ningún proceso de toma de decisiones.',
    },
  },
  {
    id: 'github',
    label: 'Reproducibilidad y calidad de GitHub',
    shortLabel: 'GitHub',
    description: 'README, historial de commits (mín. 3), organización de archivos, CAD/cableado/código incluidos.',
    levels: {
      6: 'Totalmente reproducible; estructura clara; commits significativos; flujo de pruebas documentado.',
      4: 'README completo; commits correctos; CAD/código/cableado incluidos; reproducible.',
      2: 'Repositorio existe, pero mal estructurado; archivos parciales.',
      0: 'GitHub falta, está dañado o incompleto.',
    },
  },
]

// ── Lógica de puntuación por ronda ────────────────────────────────────────────

export function computeAbiertoTotal(r = {}) {
  const sections = Math.min(r.sections ?? 0, 24)
  const laps     = Math.min(r.laps ?? 0, 3)
  const stop     = laps >= 3 && r.stopAtFinish ? 3 : 0
  let total = sections + laps + stop
  if (r.repairAction) total = Math.floor(total / 2)
  return total
}

export function computeObstaculosTotal(r = {}) {
  const sections = Math.min(r.sections ?? 0, 24)
  const laps     = Math.min(r.laps ?? 0, 3)
  const stop     = laps >= 3 && r.stopAtFinish ? 3 : 0

  // Señales de tránsito
  let signs = 0
  if (laps >= 1) {
    if (laps >= 3) {
      signs = r.trafficSignsMoved ? 8 : 10
    } else {
      signs = r.trafficSignsMoved ? 2 : 4
    }
  }

  // Estacionamiento: inicio desde cajón (solo si completó ≥1 vuelta)
  const fromParking = (r.startedFromParking && laps >= 1) ? 7 : 0

  // Resultado estacionamiento
  const parking = r.parkingResult === 'full' ? 15
    : r.parkingResult === 'partial' ? 7
    : 0

  let total = sections + laps + stop + signs + fromParking + parking
  if (r.repairAction) total = Math.floor(total / 2)
  return total
}

export function computeDiarioTotal(scores = {}) {
  return RUBRIC.reduce((acc, c) => acc + (scores[c.id] ?? 0), 0)
}

export function computeGrandTotal(data = {}) {
  const a1 = computeAbiertoTotal(data.abierto?.r1)
  const a2 = computeAbiertoTotal(data.abierto?.r2)
  const o1 = computeObstaculosTotal(data.obstaculos?.r1)
  const o2 = computeObstaculosTotal(data.obstaculos?.r2)
  const d  = computeDiarioTotal(data.diario?.scores)
  return Math.max(a1, a2) + Math.max(o1, o2) + d
}

// Backward compat — used by AdminView, ResultsView, ScoreSheet
export const computeTotal = computeDiarioTotal

export const RESOURCES = [
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/ESPA%C3%91OL%20WRO-2026-Future-Engineers-Self-Driving-Cars-General-Rules-Final.pdf',
    label: 'Reglamento General FE 2026',
    icon: '📋',
    description: 'Reglas oficiales de Future Engineers Self-Driving Cars 2026',
  },
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/Espa%C3%B1ol-WRO-2026-Future-Engineers-Documentation-Rubric.pdf',
    label: 'Rúbrica de Documentación',
    icon: '📊',
    description: '5 criterios — máx. 30 pts',
  },
  {
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosIngenieros/WRO-2026_FutureEngineers_Playfield.pdf',
    label: 'Tapete Future Engineers',
    icon: '🗺️',
    description: 'Diseño oficial de la pista 2026',
  },
]
