/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // taste-skill: blue-black-cornflower ("Night and sky blue")
        taste: {
          bg: '#0a0d14',          // Deep Night obsidian
          surface: '#131824',     // Elevated slate surface
          card: '#181f2f',        // Card & container background
          hover: '#1f273b',       // Surface hover
          border: '#242f45',      // Structural border
          borderLight: '#32405d', // Active/focus border
          ink: '#e9edf3',         // Crisp silver-white text
          muted: '#8891a1',       // Legible slate muted text
          accent: '#5ab9fc',      // Sky blue accent
          accentHover: '#7ecbfd', // Accent hover
          accentInk: '#0a0d14',   // High-contrast dark text on accent
        },
        dark: {
          950: '#0a0d14',
          900: '#131824',
          850: '#181f2f',
          800: '#1c2436',
          700: '#242f45',
          600: '#384666',
        },
        primary: {
          50: '#f0f8ff',
          100: '#e0f2fe',
          400: '#7ecbfd',
          500: '#5ab9fc',
          600: '#32a2f8',
          700: '#1583e0',
        },
        accent: {
          400: '#5ab9fc',
          500: '#32a2f8',
          600: '#1583e0',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.025em',
        normal: '0',
      },
      boxShadow: {
        'taste-card': '0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 0 1px 1px rgba(90, 185, 252, 0.08)',
        'taste-accent': '0 0 24px -4px rgba(90, 185, 252, 0.35)',
        'taste-glow': '0 0 32px -4px rgba(90, 185, 252, 0.22)',
      }
    },
  },
  plugins: [],
}
