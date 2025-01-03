/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          100: '#2E3440',
          200: '#3B4252',
          300: '#434C5E',
          400: '#4C566A',
        },
        accent: {
          100: '#88C0D0',
          200: '#81A1C1',
          300: '#5E81AC',
        },
        alert: {
          100: '#BF616A',
          200: '#D08770',
          300: '#EBCB8B',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-jetbrains-mono)'],
      },
      fontSize: {
        'data': '14px',
        'label': '12px',
        'header': '16px',
      },
      aspectRatio: {
        'chart': '16/9',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}; 