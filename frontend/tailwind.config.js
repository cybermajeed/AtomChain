/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          active: 'var(--color-primary-active)',
          disabled: 'var(--color-primary-disabled)',
        },
        ink: 'var(--color-ink)',
        body: {
          DEFAULT: 'var(--color-body)',
          'on-light': 'var(--color-body-on-light)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          strong: 'var(--color-muted-strong)',
        },
        hairline: {
          'on-light': 'var(--color-hairline-on-light)',
          'on-dark': 'var(--color-hairline-on-dark)',
        },
        border: {
          strong: 'var(--color-border-strong)',
        },
        canvas: {
          light: 'var(--color-canvas-light)',
          dark: 'var(--color-canvas-dark)',
        },
        surface: {
          'card-dark': 'var(--color-surface-card-dark)',
          'elevated-dark': 'var(--color-surface-elevated-dark)',
          'soft-light': 'var(--color-surface-soft-light)',
          'strong-light': 'var(--color-surface-strong-light)',
        },
        on: {
          primary: 'var(--color-on-primary)',
          dark: 'var(--color-on-dark)',
        },
        trading: {
          up: 'var(--color-trading-up)',
          down: 'var(--color-trading-down)',
        },
        accent: {
          turquoise: 'var(--color-accent-turquoise)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          ring: 'var(--color-info-ring)',
        }
      },
      fontFamily: {
        sans: ['BinanceNova', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        plex: ['BinancePlex', 'BinanceNova', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        pill: '9999px',
        full: '9999px',
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
        section: '80px',
      },
      fontSize: {
        'hero-display': ['64px', { lineHeight: '1.1', letterSpacing: '-1px', fontWeight: '700' }],
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.5px', fontWeight: '700' }],
        'display-md': ['40px', { lineHeight: '1.15', letterSpacing: '-0.3px', fontWeight: '600' }],
        'display-sm': ['32px', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '600' }],
        'title-lg': ['24px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
        'title-md': ['20px', { lineHeight: '1.35', letterSpacing: '0', fontWeight: '600' }],
        'title-sm': ['16px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'number-display': ['40px', { lineHeight: '1.1', letterSpacing: '-0.3px', fontWeight: '700' }],
        'number-md': ['16px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
        'number-sm': ['14px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
        'body-md': ['14px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
        button: ['14px', { lineHeight: '1', letterSpacing: '0', fontWeight: '600' }],
        'nav-link': ['14px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
      }
    },
  },
  plugins: [],
}
