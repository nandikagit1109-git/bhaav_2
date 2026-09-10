/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FBF9F4',
          100: '#F6F2EA',
          200: '#EFE9DD',
          300: '#E4DCCB',
          400: '#D6CCB6',
          500: '#C4B89F',
        },
        ink: {
          950: '#14120E',
          900: '#1E1B16',
          800: '#2C2820',
          700: '#444034',
          600: '#5E5949',
          500: '#77715F',
          400: '#948D79',
          300: '#B5AD99',
          200: '#D6CFC0',
          100: '#E9E4D8',
          50: '#F3EFE6',
        },
        stone: {
          border: '#E2DBCB',
          subtle: '#F0EBDF',
        },
        accent: {
          terracotta: '#B45A3C',
          terracottaLight: '#F5E9E2',
          sage: '#5A7A62',
          sageLight: '#EAF0EA',
          ochre: '#A8842C',
          ochreLight: '#F4ECD8',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      boxShadow: {
        'paper-sm': '0 1px 2px 0 rgba(20, 18, 14, 0.04)',
        'paper-md': '0 6px 24px -8px rgba(20, 18, 14, 0.08), 0 1px 3px 0 rgba(20, 18, 14, 0.03)',
      },
    },
  },
  plugins: [],
}
