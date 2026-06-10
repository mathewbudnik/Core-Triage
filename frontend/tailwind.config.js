/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif:  ['Fraunces', 'Georgia', 'serif'],
        sans:   ['Inter', '-apple-system', 'sans-serif'],
        mono:   ['JetBrains Mono', 'ui-monospace', 'monospace'],
        script: ['Caveat', 'cursive'],
      },
      colors: {
        // Almanac surfaces / ink
        bg:     '#e7ddc6',  paper:  '#e7ddc6',
        side:   '#e0d4b6',
        panel:  '#f4ecdb',  card:   '#f4ecdb',
        panel2: '#efe6d2',
        text:   '#2a2722',  ink:    '#2a2722',
        muted:  '#8d8472',
        cream:  '#fdf6ea',          // text on colored fills
        // accents (legacy names remapped so existing usages flip correctly)
        accent:  '#c58a77',  accent2: '#97a886',  accent3: '#d7ac5b',
        clay:    '#c58a77',  'clay-deep': '#b06a4f',
        ochre:   '#d7ac5b',  sage: '#97a886', 'sage-deep': '#5f7a4e',
        ct: {
          forest:        '#e7ddc6',
          'forest-deep': '#f4ecdb',
          'forest-soft': '#e0d4b6',
          cream:         '#2a2722',   // NB: now ink — see "inverse text" nuance
          'cream-soft':  '#5f594c',
          moss:          '#8d8472',
          hairline:      'rgba(42,39,34,0.13)',
          rim:           '#bcae8a',
          edge:          '#bcae8a',
          terracotta:    '#c58a77',
          'terra-soft':  '#b06a4f',
          'terra-tint':  'rgba(197,138,119,0.10)',
        },
        // semantic skill colors
        skill: {
          power: '#b85c44', crimp: '#c79a3c', dynamic: '#5f87a0',
          technique: '#7f9466', mobility: '#a06f8a',
        },
        // keep tier tokens referenced by lib/tier.js (re-paletted in Task 6)
      },
      borderColor: {
        outline: 'rgba(42,39,34,0.13)',
      },
      boxShadow: {
        glow:        '0 0 24px rgba(197,138,119,0.22)',
        'glow-coral':'0 0 24px rgba(176,106,79,0.22)',
        'glow-gold': '0 0 24px rgba(215,172,91,0.20)',
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
