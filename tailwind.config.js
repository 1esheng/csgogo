/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0B0E13', 800: '#151A23', 700: '#1D2430', 600: '#252E3D' },
        accent: { DEFAULT: '#F5A623', dim: '#B87B12' },
        danger: '#E5484D',
        txt: { DEFAULT: '#F5F6FA', muted: '#9CA3AF' },
      },
      fontFamily: {
        display: ['Rajdhani', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 12px 32px -12px rgba(0,0,0,0.85)', glow: '0 0 24px rgba(245,166,35,0.35)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        'page-in': { '0%': { opacity: '0', transform: 'translateY(10px) scale(0.995)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'level-pop': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.9)' },
          '55%': { opacity: '1', transform: 'translateY(0) scale(1.06)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float-up': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(-26px)' } },
        shine: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up .25s ease-out both',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'page-in': 'page-in .28s cubic-bezier(0.22,1,0.36,1) both',
        'level-pop': 'level-pop .5s cubic-bezier(0.22,1,0.36,1) both',
        'float-up': 'float-up .9s ease-out both',
        shine: 'shine 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};