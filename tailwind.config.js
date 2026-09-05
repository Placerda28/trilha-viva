/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Frosted aura. As cores da paleta são signal (#5C7E8F), ink-faint
        // (#A2A2A2), mist (#D4DDE2) e o branco. A paleta não tem um tom escuro,
        // então `ink` e `signal-deep` são degraus mais fechados do próprio
        // #5C7E8F — sem eles, texto e painel escuro não teriam contraste.
        ink: {
          DEFAULT: '#2C3E48',
          soft: '#3D5462',
          muted: '#5A6B75',
          faint: '#A2A2A2', // cinza da paleta
        },
        paper: '#F7F9FB', // off-white frio
        mist: {
          DEFAULT: '#D4DDE2', // azul pálido da paleta
          deep: '#C3CFD6',
        },
        line: '#DDE4E8',
        signal: {
          DEFAULT: '#5C7E8F', // azul-ardósia da paleta
          deep: '#46626F', // fundo de botão, com texto branco
          wash: '#EAF0F3',
        },
        // Apelido herdado: páginas ainda não redesenhadas usam `accent`.
        accent: {
          DEFAULT: '#5C7E8F',
          soft: '#5C7E8F',
          wash: '#EAF0F3',
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
  // Único plugin, e só por causa do dialog: ele traz os utilitários
  // `animate-in` / `fade-in-0` / `zoom-in-95` que o componente do shadcn usa
  // para entrar e sair da tela. Não adiciona cor, não mexe no body, não liga
  // darkMode.
  plugins: [require('tailwindcss-animate')],
}
