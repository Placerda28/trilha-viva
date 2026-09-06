/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Preto no branco, corte vermelho" (06/09/2026). Base
        // acromatica: preto no texto e nos paineis, cinza-clarissimo de fundo,
        // branco nos cards. A unica cor do sistema e o vermelho, e ele so
        // aparece em borda, marca de canal, chip e botao — nunca em area
        // grande. `signal` e o vermelho de traco e grafico; `signal-deep` e o
        // de texto e de fundo de botao (branco por cima passa em 6.11);
        // `signal-lite` e o degrau claro, para vermelho dentro de painel preto.
        ink: {
          DEFAULT: '#0D0D0D',
          soft: '#232323', // hover de botao preto
          muted: '#5C5C5C', // texto secundario, 6.02 sobre o fundo
          faint: '#8A8A8A', // numeracao e metadado discreto
        },
        paper: '#F2F3F5', // cinza-clarissimo do fundo
        mist: {
          DEFAULT: '#E7E8EB', // faixas de secao
          deep: '#DADCE0',
        },
        line: '#E0E2E6',
        signal: {
          DEFAULT: '#E5152D', // vermelho de borda, onda e marca de canal
          deep: '#C40F24', // texto e fundo de botao
          lite: '#FF5566', // vermelho dentro de painel preto (6.25)
          wash: '#FDEDEF',
        },
        // Apelido herdado: paginas ainda nao redesenhadas usam `accent`.
        accent: {
          DEFAULT: '#E5152D',
          soft: '#E5152D',
          wash: '#FDEDEF',
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
      boxShadow: {
        // Excecao unica a regra "sem sombra em lugar nenhum": o halo vermelho
        // atras do CTA principal, dentro de secao preta. Nao e sombra de
        // elevacao — e luz, e o efeito do print que o Paulo mandou.
        glow: '0 0 0 1px rgba(229,21,45,.55), 0 0 22px 2px rgba(229,21,45,.42), 0 0 60px 8px rgba(229,21,45,.22)',
        'glow-strong':
          '0 0 0 1px rgba(229,21,45,.8), 0 0 26px 3px rgba(229,21,45,.6), 0 0 76px 12px rgba(229,21,45,.3)',
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
