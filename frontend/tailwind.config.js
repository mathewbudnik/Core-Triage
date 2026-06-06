/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        script: ['Caveat', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: '#1c2520',
        panel: '#243530',
        panel2: '#1f2924',
        text: '#f0f5ed',
        muted: '#95a698',
        accent: '#14b8a6',
        accent2: '#fb7185',
        accent3: '#fbbf24',
        ct: {
          forest:        '#1c2520',
          'forest-deep': '#243530',
          'forest-soft': '#1f2924',
          cream:         '#f0f5ed',
          'cream-soft':  '#c8d3c4',
          moss:          '#95a698',
          hairline:      'rgba(230,237,228,0.10)',
          rim:           'rgba(230,237,228,0.18)',
          terracotta:    '#d97757',
          'terra-soft':  '#f0a875',
          'terra-tint':  'rgba(217,119,87,0.06)',
        },
        'ct-paper': {
          base: '#e8dcc4',
          mid:  '#ddd0b3',
          deep: '#c9bb9c',
        },
        'ct-ink': '#1a2620',
        'ct-ink-soft': '#2b3a32',
      },
      borderColor: {
        outline: 'rgba(230,237,228,0.12)',
      },
      boxShadow: {
        glow: '0 0 24px rgba(20,184,166,0.25)',
        'glow-coral': '0 0 24px rgba(251,113,133,0.25)',
        'glow-gold': '0 0 24px rgba(251,191,36,0.20)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'ct-foil': 'linear-gradient(135deg, #b88a3a, #c75e3a, #7a4a8e, #2f4ea8, #b88a3a)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'ct-shimmer':  'ctShimmer 1.4s linear infinite',
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
        // Diagnosis skeleton shimmer. Paired with a background-size of 200%
        // so the gradient highlight sweeps across the placeholder bar.
        ctShimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
