import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFD700', // Bright Cartoon Yellow
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#FFD700',
          600: '#d97706',
          700: '#b45309',
        },
        secondary: {
          DEFAULT: '#00FFFF', // Bright Cartoon Cyan
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#00FFFF',
          600: '#059669',
          700: '#047857',
        },
        ink: {
          900: '#ffffff', // White base
          800: '#f8f9fa', // Off white
          700: '#e9ecef', // Light gray bg
          600: '#dee2e6', // Gray border
          500: '#ced4da', // Medium Gray
          400: '#6c757d', // Text secondary
          300: '#495057', // Text normal
          200: '#343a40', // Base Text strong
          100: '#212529', // Ink Black text
          DEFAULT: '#000000', // Pure Black
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        brutal: {
          from: { transform: 'translate(0, 0)', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' },
          to:   { transform: 'translate(4px, 4px)', boxShadow: '0px 0px 0px 0px rgba(0,0,0,1)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #FFD700 0%, #00FFFF 100%)',
        'brutal-dots': 'radial-gradient(#000 1px, transparent 1px)',
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
        'brutal-active': '0px 0px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
};

export default config;
