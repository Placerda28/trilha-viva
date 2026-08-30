/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A0A0B',
          soft: '#1C1C21',
          muted: '#61616B',
          faint: '#8E8E98',
        },
        line: '#E9E9EF',
        surface: '#F7F7FA',
        brand: {
          50: '#EEF3FF',
          100: '#DCE6FF',
          500: '#2B5CE6',
          600: '#1D4ED8',
          700: '#1739A8',
        },
        flame: {
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        shell: '1180px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,10,11,.04), 0 8px 24px -12px rgba(10,10,11,.12)',
        lift: '0 2px 4px rgba(10,10,11,.04), 0 24px 48px -20px rgba(10,10,11,.24)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise .6s cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
}
