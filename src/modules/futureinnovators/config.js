// WRO 2026 Future Innovators — Scoring rubrics & resources
// Source: WRO-2026-Future-Innovators-General-Rules.pdf (official)
// All categories max 200 pts. Formula: pts = Math.round(score/10 * maxPts)

export const CATEGORIES = ['elementary', 'junior', 'senior']

export const CATEGORY_META = {
  elementary: { label: 'Elementary', ages: '8–12 años', born: '2014–2018' },
  junior:     { label: 'Junior',     ages: '11–15 años', born: '2011–2015' },
  senior:     { label: 'Senior',     ages: '14–19 años', born: '2007–2012' },
}

// ── ELEMENTARY ────────────────────────────────────────────────────────────────
const ELEMENTARY_RUBRIC = [
  {
    section: 'Proyecto e Innovación',
    sectionKey: 'project',
    sectionMax: 70,
    criteria: [
      {
        id: 'idea_quality',
        label: 'Idea, Calidad y Creatividad',
        maxPts: 30,
        hint: '¿Es la idea original, bien desarrollada y creativa? ¿El proyecto está bien construido?',
      },
      {
        id: 'research_report',
        label: 'Investigación e Informe',
        maxPts: 15,
        hint: '¿El informe está bien estructurado? ¿Hay investigación de fondo sobre el problema?',
      },
      {
        id: 'usage_idea',
        label: 'Aplicación de la Idea',
        maxPts: 15,
        hint: '¿Cómo podría usarse esta idea en el mundo real? ¿Tiene utilidad práctica?',
      },
      {
        id: 'key_innovation',
        label: 'Innovación Clave y Eslogan',
        maxPts: 10,
        hint: '¿El equipo puede resumir en un eslogan claro qué hace diferente su proyecto?',
      },
    ],
  },
  {
    section: 'Solución Robótica',
    sectionKey: 'robot',
    sectionMax: 65,
    criteria: [
      {
        id: 'robotic_solution',
        label: 'Solución Robótica',
        maxPts: 30,
        hint: '¿Es el robot autónomo, bien diseñado y apropiado para el problema que resuelve?',
      },
      {
        id: 'engineering_concepts',
        label: 'Uso Significativo de Ingeniería',
        maxPts: 10,
        hint: '¿Se usan motores, sensores y actuadores de forma significativa y bien pensada?',
      },
      {
        id: 'code_efficiency',
        label: 'Eficiencia de Código y Automatización',
        maxPts: 10,
        hint: '¿El código es eficiente? ¿El robot toma decisiones autónomas con sensores?',
      },
      {
        id: 'demonstration',
        label: 'Demostración de la Solución',
        maxPts: 15,
        hint: '¿El robot funciona durante la demostración? ¿Demuestra claramente lo que hace?',
      },
    ],
  },
  {
    section: 'Presentación y Espíritu',
    sectionKey: 'presentation',
    sectionMax: 65,
    criteria: [
      {
        id: 'booth_presentation',
        label: 'Presentación y Stand del Proyecto',
        maxPts: 30,
        hint: '¿El stand está bien organizado? ¿La presentación de 5 min es clara y bien estructurada?',
      },
      {
        id: 'technical_understanding',
        label: 'Comprensión Técnica y Respuestas',
        maxPts: 15,
        hint: '¿El equipo responde bien las preguntas? ¿Comprenden a fondo lo que construyeron?',
      },
      {
        id: 'team_spirit',
        label: 'Espíritu de Equipo',
        maxPts: 20,
        hint: '¿Todos los miembros participan? ¿Trabajan bien juntos? ¿Muestran entusiasmo?',
      },
    ],
  },
]

// ── JUNIOR ────────────────────────────────────────────────────────────────────
const JUNIOR_RUBRIC = [
  {
    section: 'Proyecto e Innovación',
    sectionKey: 'project',
    sectionMax: 75,
    criteria: [
      {
        id: 'idea_quality',
        label: 'Idea, Calidad y Creatividad',
        maxPts: 30,
        hint: '¿Es la idea original, bien desarrollada y creativa? ¿El proyecto está bien construido?',
      },
      {
        id: 'research_report',
        label: 'Investigación e Informe',
        maxPts: 15,
        hint: '¿El informe está bien estructurado? ¿La investigación es profunda y cita fuentes?',
      },
      {
        id: 'social_impact',
        label: 'Impacto Social y Necesidad',
        maxPts: 10,
        hint: '¿El equipo identifica claramente quién se beneficia y cuál es el impacto en la sociedad?',
      },
      {
        id: 'key_innovation',
        label: 'Innovación Clave y Eslogan',
        maxPts: 10,
        hint: '¿El eslogan resume con claridad la propuesta única del proyecto?',
      },
      {
        id: 'entrepreneurship',
        label: 'Elemento de Emprendimiento',
        maxPts: 10,
        hint: 'Estructura de costos, fuentes de ingreso, recursos clave o socios. ¿Tiene viabilidad como negocio?',
      },
    ],
  },
  {
    section: 'Solución Robótica',
    sectionKey: 'robot',
    sectionMax: 70,
    criteria: [
      {
        id: 'robotic_solution',
        label: 'Solución Robótica',
        maxPts: 30,
        hint: '¿Es el robot autónomo, bien diseñado y apropiado para el problema que resuelve?',
      },
      {
        id: 'engineering_concepts',
        label: 'Uso Significativo de Ingeniería',
        maxPts: 15,
        hint: '¿Se usan componentes técnicos de forma ingeniosa? ¿El diseño mecánico es sólido?',
      },
      {
        id: 'code_efficiency',
        label: 'Eficiencia de Código y Automatización',
        maxPts: 10,
        hint: '¿El código es eficiente, bien estructurado y el robot toma decisiones autónomas?',
      },
      {
        id: 'demonstration',
        label: 'Demostración de la Solución',
        maxPts: 15,
        hint: '¿El robot funciona claramente durante la demostración y cumple lo que promete?',
      },
    ],
  },
  {
    section: 'Presentación y Espíritu',
    sectionKey: 'presentation',
    sectionMax: 55,
    criteria: [
      {
        id: 'booth_presentation',
        label: 'Presentación y Stand del Proyecto',
        maxPts: 25,
        hint: '¿El stand está bien organizado y la presentación de 5 min es clara y profesional?',
      },
      {
        id: 'technical_understanding',
        label: 'Comprensión Técnica y Respuestas',
        maxPts: 15,
        hint: '¿El equipo responde con seguridad las preguntas técnicas y de innovación?',
      },
      {
        id: 'team_spirit',
        label: 'Espíritu de Equipo',
        maxPts: 15,
        hint: '¿Todos los miembros participan activamente? ¿Demuestran buen trabajo en equipo?',
      },
    ],
  },
]

// ── SENIOR ────────────────────────────────────────────────────────────────────
const SENIOR_RUBRIC = [
  {
    section: 'Proyecto e Innovación',
    sectionKey: 'project',
    sectionMax: 75,
    criteria: [
      {
        id: 'idea_quality',
        label: 'Idea, Calidad y Creatividad',
        maxPts: 20,
        hint: '¿Es la idea original, innovadora y bien ejecutada? ¿Podría ser un producto real?',
      },
      {
        id: 'research_report',
        label: 'Investigación e Informe',
        maxPts: 15,
        hint: '¿El informe es profesional, bien fundamentado e incluye fuentes confiables?',
      },
      {
        id: 'social_impact',
        label: 'Impacto Social y Necesidad',
        maxPts: 10,
        hint: '¿El equipo demuestra impacto real, menciona posibles efectos negativos y tiene caso de uso concreto?',
      },
      {
        id: 'key_innovation',
        label: 'Innovación Clave y Eslogan',
        maxPts: 10,
        hint: '¿El eslogan es conciso y diferencia claramente el proyecto de soluciones existentes?',
      },
      {
        id: 'entrepreneurship',
        label: 'Elemento de Emprendimiento',
        maxPts: 10,
        hint: 'Estructura de costos, fuentes de ingreso, recursos clave, socios. ¿Tiene modelo de negocio viable?',
      },
      {
        id: 'next_steps',
        label: 'Próximos Pasos y Desarrollo del Prototipo',
        maxPts: 10,
        hint: '¿El equipo tiene un plan claro de cómo escalar o continuar desarrollando el proyecto?',
      },
    ],
  },
  {
    section: 'Solución Robótica',
    sectionKey: 'robot',
    sectionMax: 70,
    criteria: [
      {
        id: 'robotic_solution',
        label: 'Solución Robótica',
        maxPts: 30,
        hint: '¿El diseño robótico es sofisticado, autónomo y resuelve el problema de forma efectiva?',
      },
      {
        id: 'engineering_concepts',
        label: 'Uso Significativo de Ingeniería',
        maxPts: 15,
        hint: '¿El uso de componentes es ingenioso y el diseño mecánico/electrónico es avanzado?',
      },
      {
        id: 'code_efficiency',
        label: 'Eficiencia de Código y Automatización',
        maxPts: 10,
        hint: '¿El código es modular, eficiente y demuestra dominio técnico? ¿El robot toma decisiones complejas?',
      },
      {
        id: 'demonstration',
        label: 'Demostración de la Solución',
        maxPts: 15,
        hint: '¿La demostración muestra claramente todas las funcionalidades del robot en acción?',
      },
    ],
  },
  {
    section: 'Presentación y Espíritu',
    sectionKey: 'presentation',
    sectionMax: 55,
    criteria: [
      {
        id: 'booth_presentation',
        label: 'Presentación y Stand del Proyecto',
        maxPts: 25,
        hint: '¿El stand y la presentación tienen un nivel profesional? ¿El pitch de 5 min es impactante?',
      },
      {
        id: 'technical_understanding',
        label: 'Comprensión Técnica y Respuestas',
        maxPts: 15,
        hint: '¿El equipo domina todos los aspectos técnicos, de innovación y de emprendimiento?',
      },
      {
        id: 'team_spirit',
        label: 'Espíritu de Equipo',
        maxPts: 15,
        hint: '¿Todos los miembros contribuyen de forma balanceada y demuestran cohesión como equipo?',
      },
    ],
  },
]

export const RUBRICS = {
  elementary: ELEMENTARY_RUBRIC,
  junior:     JUNIOR_RUBRIC,
  senior:     SENIOR_RUBRIC,
}

export const MAX_SCORE = 200 // same for all categories

// Compute total from scores map { criterionId: 0-10 }
export function computeTotal(category, scores = {}) {
  const rubric = RUBRICS[category] || ELEMENTARY_RUBRIC
  let total = 0
  for (const section of rubric) {
    for (const criterion of section.criteria) {
      const s = scores[criterion.id] ?? 0
      total += Math.round(s / 10 * criterion.maxPts)
    }
  }
  return total
}

// ── RESOURCES for judge panel ────────────────────────────────────────────────
export const RESOURCES = [
  {
    label: 'Reglamento General 2026',
    description: 'Reglas oficiales WRO Future Innovators, incluyendo hojas de puntuación',
    url: 'https://wro-association.org/wp-content/uploads/WRO-2026-Future-Innovators-General-Rules.pdf',
    icon: '📋',
  },
  {
    label: 'Reto de Temporada',
    description: 'Descripción del desafío temático 2026 para Future Innovators',
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosInnovadores/WRO2026FuturosInnovadoresMisiones.pdf',
    icon: '🎯',
  },
  {
    label: 'Información para Equipos',
    description: 'Guía completa para los equipos participantes',
    url: 'https://fundesteam.nyc3.cdn.digitaloceanspaces.com/WRO2026-Reglas/FuturosInnovadores/InformaciónParaequipos.pdf',
    icon: '📚',
  },
  {
    label: 'Página WRO El Salvador — Future Innovators',
    description: 'Información local y recursos adicionales',
    url: 'https://www.wroelsalvador.org/temporada-2026/categorías/future-innovators',
    icon: '🌐',
  },
]
