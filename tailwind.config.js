/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas conforme especificação exata do usuário
        brand: {
          50: '#fcfaf2',
          100: '#f6f0d4',
          400: '#C9A227', // Accent único (marcador de meta / detalhes)
          500: '#C9A227',
          600: '#C9A227',
          700: '#a3811f',
          800: '#7c6218',
          900: '#564410',
        },
        slate: {
          950: '#0E1113', // Fundo principal
          900: '#14181A', // Painéis
          800: '#23282B', // Bordas finas
          700: '#23282B',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        emerald: {
          400: '#7FA88C', // Verde-sálvia (positivo)
          500: '#7FA88C',
          600: '#668a71',
        },
        red: {
          400: '#B5504B', // Terracota (crítico / negativo)
          500: '#B5504B',
          600: '#913f3b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Sora', 'sans-serif'],
      },
      animation: {},
      keyframes: {}
    },
  },
  plugins: [],
}
