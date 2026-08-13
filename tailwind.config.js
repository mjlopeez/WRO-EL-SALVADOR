/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Module colors — needed because they're used via dynamic strings
    { pattern: /bg-(orange|green|sky|violet|cyan|rose)-(400|500)\/?(10|15|20|30)?/ },
    { pattern: /text-(orange|green|sky|violet|cyan|rose)-(400|500)/ },
    { pattern: /border-(orange|green|sky|violet|cyan|rose)-(400|500)\/?(20|30|40)?/ },
    { pattern: /from-(orange|green|sky|violet|cyan|rose)-(400|500)\/?(10|15|20)?/ },
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050811',
          800: '#0A0E1A',
          700: '#111827',
          600: '#1F2937',
          500: '#374151',
          400: '#4B5563',
        },
        brand: {
          orange: '#FF6B35',
          cyan:   '#00D4FF',
          purple: '#8B5CF6',
        },
        elementary: { DEFAULT: '#F59E0B', dark: '#B45309', light: '#FDE68A' },
        junior:     { DEFAULT: '#3B82F6', dark: '#1D4ED8', light: '#BFDBFE' },
        senior:     { DEFAULT: '#8B5CF6', dark: '#6D28D9', light: '#DDD6FE' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(255,107,53,0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255,107,53,0.8), 0 0 40px rgba(255,107,53,0.3)' },
        },
      },
    },
  },
  plugins: [],
}
