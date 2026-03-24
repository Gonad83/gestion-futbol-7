/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['Lexend', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        'soccer-green': '#44f3a9',
        'dark-bg': '#10141a',
        'glass': 'rgba(28, 32, 38, 0.75)',
        'glass-border': 'rgba(255, 255, 255, 0.06)',
        'surface': {
          lowest: '#0a0e14',
          low: '#181c22',
          DEFAULT: '#1c2026',
          high: '#262a31',
          highest: '#31353c',
          bright: '#353940',
        },
        'neon': {
          green: '#44f3a9',
          'green-dim': '#27e199',
          blue: '#9acbff',
          gold: '#ffd08b',
        },
      },
    },
  },
  plugins: [],
}
