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
          DEFAULT: '#F97316',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#F97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        secondary: {
          DEFAULT: '#22C55E',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22C55E',
          600: '#16a34a',
          700: '#15803d',
        },
        ink: {
          900: '#ffffff',
          800: '#f8f9fa',
          700: '#e9ecef',
          600: '#dee2e6',
          500: '#ced4da',
          400: '#6c757d',
          300: '#495057',
          200: '#343a40',
          100: '#212529',
          DEFAULT: '#000000',
        },
        // Dark meeting theme tokens
        meet: {
          bg: '#0a0a0f',
          'bg-elevated': '#111118',
          'bg-card': '#141418',
          surface: '#141418',
          'surface-hover': '#1e1e24',
          accent: '#8ab4f8',
          'accent-hover': '#aecbfa',
          danger: '#ea4335',
          'danger-hover': '#f44336',
          border: 'rgba(255,255,255,0.06)',
          'text-primary': '#e8eaed',
          'text-secondary': '#9aa0a6',
          'text-muted': '#5f6368',
        },
        // Dove palette for homepage
        'dove-orange': '#E8854A',
        'dove-green': '#5B9E6F',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.25s ease-in',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'speaking-ring': 'speakingRing 1.5s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'slide-up-panel': 'slideUpPanel 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
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
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutRight: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(100%)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        speakingRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(138,180,248,0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(138,180,248,0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        slideUpPanel: {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #F97316 0%, #22C55E 100%)',
        'brutal-dots': 'radial-gradient(#000 1px, transparent 1px)',
        'gradient-meet': 'linear-gradient(135deg, #0a0a0f 0%, #111118 50%, #141418 100%)',
        'gradient-meet-subtle': 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
        'brutal-active': '0px 0px 0px 0px rgba(0,0,0,1)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.4)',
        'glow-accent': '0 0 20px rgba(138,180,248,0.3)',
        'glow-danger': '0 0 20px rgba(234,67,53,0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
