/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Autumn luxe. As cinco cores da paleta são ink, mist, ink-muted,
        // signal e ink-faint; as variantes -soft e -deep são degraus da mesma
        // família, criados só para hover e para o contraste de texto passar.
        ink: {
          DEFAULT: '#322D27', // marrom escuro da paleta
          soft: '#4A423A',
          muted: '#6C6157', // degrau escuro do taupe #7F7265, legível em texto
          faint: '#AAAAAE', // cinza da paleta
        },
        paper: '#F8F7F3', // off-white, como o Paulo pediu
        mist: {
          DEFAULT: '#E2E1EB', // cinza-lavanda da paleta
          deep: '#D5D3DF',
        },
        line: '#DCDAE0',
        taupe: '#7F7265', // taupe da paleta, para superfícies e marcas
        // Ocre da paleta. Como preenchimento vale o tom da paleta; em bloco com
        // texto por cima usamos o -deep, que passa no contraste.
        signal: {
          DEFAULT: '#BF8440',
          deep: '#A9702F',
          wash: '#F3E9DC',
        },
        // Apelido herdado: páginas ainda não redesenhadas usam `accent`.
        accent: {
          DEFAULT: '#BF8440',
          soft: '#BF8440',
          wash: '#F3E9DC',
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
