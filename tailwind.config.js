/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-110%)', opacity: '0' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.4,0,0.2,1) forwards',
        'slide-out-left': 'slideOutLeft 300ms cubic-bezier(0.4,0,0.2,1) forwards',
        'fade-up': 'fadeUp 400ms ease forwards',
        'pop-in': 'popIn 500ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
