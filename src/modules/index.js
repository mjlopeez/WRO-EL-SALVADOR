// Central module registry for WRO El Salvador 2026
// Each module defines its ID, display info, colors, and Firestore collection prefixes.
// To add a new module: add an entry here and create src/modules/{id}/ folder.

export const MODULES = {
  rm: {
    id: 'rm',
    label: 'RoboMission',
    emoji: '🤖',
    description: 'Misiones por rondas con categorías',
    teamsCol: 'rm_teams',
    scoresCol: 'rm_scores',
    // Explicit Tailwind classes (no dynamic interpolation)
    colorText:   'text-orange-500',
    colorBg:     'bg-orange-500/20',
    colorBorder: 'border-orange-500/30',
    colorFrom:   'from-orange-500/10',
    hex: '#f97316',
  },
  rs: {
    id: 'rs',
    label: 'RoboStarter',
    emoji: '🟢',
    description: 'Categoría inicial para principiantes',
    teamsCol: 'rs_teams',
    scoresCol: 'rs_scores',
    colorText:   'text-green-500',
    colorBg:     'bg-green-500/20',
    colorBorder: 'border-green-500/30',
    colorFrom:   'from-green-500/10',
    hex: '#22c55e',
  },
  rsp: {
    id: 'rsp',
    label: 'RoboSports',
    emoji: '⚽',
    description: 'Competencia deportiva con robots',
    teamsCol: 'rsp_teams',
    scoresCol: 'rsp_scores',
    colorText:   'text-sky-500',
    colorBg:     'bg-sky-500/20',
    colorBorder: 'border-sky-500/30',
    colorFrom:   'from-sky-500/10',
    hex: '#0ea5e9',
  },
  fi: {
    id: 'fi',
    label: 'Future Innovators',
    emoji: '💡',
    description: 'Proyectos de innovación con rúbricas',
    teamsCol: 'fi_teams',
    scoresCol: 'fi_scores',
    colorText:   'text-violet-500',
    colorBg:     'bg-violet-500/20',
    colorBorder: 'border-violet-500/30',
    colorFrom:   'from-violet-500/10',
    hex: '#8b5cf6',
  },
  fe: {
    id: 'fe',
    label: 'Future Engineers',
    emoji: '⚙️',
    description: 'Ingeniería y diseño de soluciones',
    teamsCol: 'fe_teams',
    scoresCol: 'fe_scores',
    colorText:   'text-cyan-500',
    colorBg:     'bg-cyan-500/20',
    colorBorder: 'border-cyan-500/30',
    colorFrom:   'from-cyan-500/10',
    hex: '#06b6d4',
  },
}

export const MODULE_LIST = Object.values(MODULES)
export const MODULE_IDS  = Object.keys(MODULES)
