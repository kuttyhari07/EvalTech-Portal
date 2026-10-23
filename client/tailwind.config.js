/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#070A12',
          900: '#0F172A',
          850: '#131D33',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        indigo: {
          brand: '#4F46E5',
          light: '#6366F1',
          dark: '#3730A3',
          glow: '#818CF8',
        },
        pearl: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
        },
        electric: {
          blue: '#0EA5E9',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 12px 30px -4px rgba(79, 70, 229, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        glow: '0 0 25px -5px rgba(79, 70, 229, 0.35)',
      },
    },
  },
  plugins: [],
};
