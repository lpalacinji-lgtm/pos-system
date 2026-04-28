import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#FF441F',
          dark: '#CC2E0C',
          soft: '#FFF1ED',
        },
      },
    },
  },
  plugins: [],
}
export default config
