/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Tinta: um azul-marinho profundo. É cor, não um preto disfarçado.
        ink: {
          DEFAULT: '#151B34',
          soft: '#232D52',
          muted: '#59627F',
          faint: '#8A92AB',
        },
        paper: '#FFFFFF',
        // Superfície fria — nada de creme.
        mist: {
          DEFAULT: '#EEF1F7',
          deep: '#E1E6F0',
        },
        line: '#DCE2ED',
        // Âmbar de luz de palco. Só como preenchimento, nunca como texto sobre branco.
        signal: {
          DEFAULT: '#F2A93B',
          deep: '#D2871A',
          wash: '#FFF3DF',
        },
        // Apelido herdado: páginas ainda não redesenhadas usam `accent`.
        accent: {
          DEFAULT: '#F2A93B',
          soft: '#F2A93B',
          wash: '#FFF3DF',
        },
      },
      fontFamily: {
        sans: ['Archivo Variable', 'system-ui', 'sans-serif'],
        display: ['Archivo Variable', 'system-ui', 'sans-serif'],
        read: ['Source Serif 4 Variable', 'Georgia', 'serif'],
      },
      fontSize: {
        d1: ['clamp(42px, 7.4vw, 84px)', { lineHeight: '0.94', letterSpacing: '-0.035em', fontWeight: '800' }],
        d2: ['clamp(29px, 4.3vw, 52px)', { lineHeight: '1.04', letterSpacing: '-0.028em', fontWeight: '700' }],
        d3: ['clamp(22px, 2.6vw, 31px)', { lineHeight: '1.14', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      maxWidth: {
        shell: '1280px',
        text: '36rem',
      },
      borderRadius: {
        none: '0',
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px',
      },
      keyframes: {
        tick: {
          '0%, 42%': { opacity: '0.18' },
          '46%, 54%': { opacity: '1' },
          '58%, 100%': { opacity: '0.18' },
        },
      },
      animation: {
        tick: 'tick 1.9s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
}
