/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slateDeep: '#0f172a',
        slateDark: '#1e293b',
        accentBlue: '#3b82f6',
        gold: '#f59e0b',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowpulse: {
          '0%, 100%': { boxShadow: '0 0 12px 0 rgba(245,158,11,0.35), 0 0 4px 0 rgba(168,85,247,0.4)' },
          '50%': { boxShadow: '0 0 26px 4px rgba(245,158,11,0.6), 0 0 12px 2px rgba(168,85,247,0.6)' },
        },
        fadeup: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        glowpulse: 'glowpulse 2.4s ease-in-out infinite',
        fadeup: 'fadeup 0.4s ease-out both',
        blink: 'blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
