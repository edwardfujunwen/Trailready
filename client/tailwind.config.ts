import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#fdf8f0',
          100: '#faebd7',
          500: '#c8a46e',
          600: '#b5893e',
          700: '#8b6914',
          800: '#6b4f10',
          900: '#4a3508',
        },
      },
    },
  },
  plugins: [
    // Safe area insets for iPhone notch / home indicator
    function ({ addUtilities }: any) {
      addUtilities({
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.pt-safe': { paddingTop: 'env(safe-area-inset-top)' },
      });
    },
  ],
} satisfies Config;
