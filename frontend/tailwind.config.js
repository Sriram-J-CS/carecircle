/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12302F',
          light: '#284E4C',
          muted: '#527573',
          dark: '#EAF2EF', // dark mode text
        },
        teal: {
          deep: '#0F5C5A',
          600: '#1E7F7B',
          700: '#156B67',
          800: '#0F5C5A',
          900: '#0A4341',
          mint: '#E6F2EF',
        },
        paper: {
          DEFAULT: '#FBF8F3',
          dark: '#0E1A1A',
        },
        sand: {
          DEFAULT: '#F1EBDF',
          border: '#E4DCCB',
          dark: '#152626',
          'dark-border': '#223838',
        },
        clay: {
          DEFAULT: '#C8553D',
          hover: '#B34630',
          light: '#FCEFEA',
        },
        amber: {
          DEFAULT: '#D9922B',
          light: '#FEF6E9',
        },
        sage: {
          DEFAULT: '#3F8F5B',
          light: '#EAF5EE',
        },
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        inter: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        input: '14px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(15, 92, 90, 0.08)',
        modal: '0 20px 50px rgba(18, 48, 47, 0.18)',
      },
      spacing: {
        14: '3.5rem', // 56px minimum tap target
      },
    },
  },
  plugins: [],
};
