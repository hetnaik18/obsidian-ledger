/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: '#0d0d0f',
          800: '#151518',
          700: '#1e1e22',
          600: '#2a2a30',
        },
        sage: {
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7',
        },
        parchment: {
          100: '#f5f0e6',
          200: '#e8dfd0',
          300: '#d4c4a8',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
