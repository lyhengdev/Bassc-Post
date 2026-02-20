/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ce6',
          600: '#006fc4',
          700: '#01599f',
          800: '#064b83',
          900: '#0b406d',
          950: '#072849',
        },
        accent: {
          500: '#f97316',
          600: '#ea580c',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['var(--font-public)', 'system-ui', 'sans-serif'],
        display: ['var(--font-public)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
      require('@tailwindcss/typography'),  // Add this line
  ],
};
