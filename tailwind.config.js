/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14110F',
          soft: '#2C2622',
          muted: '#6B615A',
          faint: '#9A918A',
        },
        paper: '#FBFAF8',
        line: '#E3DED7',
        accent: {
          DEFAULT: '#A8431E',
          soft: '#C4653F',
          wash: '#F4EBE5',
        },
      },
      fontFamily: {
        sans: [ '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        display: ['Georgia', 'Iowan Old Style', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        shell: '1220px',
        text: '38rem',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise .7s cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
}
