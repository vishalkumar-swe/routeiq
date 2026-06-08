/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D49A00', // Dark Yellow
          dark: '#B38200',
        },
        bg:       '#000000', // Pure Black
        surface:  '#111111',
        surface2: '#1A1A1A',
        border:   '#333333',
        accent:   '#E6A800',
        success:  '#10B981',
        error:    '#EF4444',
        muted:    '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
