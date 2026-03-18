/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1220',
        panel: '#121b2e',
        panel2: '#0f172a',
        text: '#e8eefc',
        muted: '#a9b7d0',
        accent: '#14b8a6',
        accent2: '#fb7185',
        accent3: '#fbbf24',
      },
      borderColor: {
        outline: 'rgba(232,238,252,0.12)',
      },
      boxShadow: {
        glow: '0 0 24px rgba(20,184,166,0.25)',
        'glow-coral': '0 0 24px rgba(251,113,133,0.25)',
        'glow-gold': '0 0 24px rgba(251,191,36,0.20)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
