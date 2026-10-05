/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // PIAS 设计系统 — "分层智能" Layered Intelligence
        // 浅色/深色模式通过 CSS 变量驱动
        paper: 'var(--color-paper)',
        'paper-light': 'var(--color-paper-light)',
        ink: 'var(--color-ink)',
        teal: {
          50: '#EEF5F5',
          100: '#D5E8E8',
          200: '#ADD1D1',
          300: '#7DB5B6',
          400: '#52999B',
          500: '#3A7B7D',
          600: '#2D6365',
          700: '#244F50',
          800: '#1D3F40',
          900: '#173334',
        },
        copper: {
          50: '#FBF3EE',
          100: '#F5E3D5',
          200: '#EBC7AB',
          300: '#E0A87D',
          400: '#D89A6E',
          500: '#D4956B',
          600: '#B07854',
          700: '#8C5F43',
          800: '#6D4A35',
          900: '#583C2A',
        },
        slate: {
          50: 'var(--color-slate-50)',
          100: 'var(--color-slate-100)',
          200: 'var(--color-slate-200)',
          300: '#A3ACBF',
          400: '#8792A8',
          500: '#6B788F',
          600: 'var(--color-slate-600)',
          700: '#444D60',
          800: '#383F4E',
          900: '#2E3440',
        },
        violet: {
          500: '#7C3AED',
          600: '#6D28D9',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'memory-pulse': 'memoryPulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        memoryPulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
