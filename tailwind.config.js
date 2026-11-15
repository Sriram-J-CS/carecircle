/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          850: '#0f5257',
          900: '#0a3d42',
          950: '#062629',
        },
        warm: {
          50: '#FAF8F5',
          100: '#F5F1EB',
          200: '#EAE3D6',
          300: '#DDD2BF',
          800: '#2C2723',
          900: '#1A1816',
        },
        sos: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          light: '#FEE2E2',
        }
      },
      fontSize: {
        'elder-base': ['20px', '28px'],
        'elder-lg': ['24px', '32px'],
        'elder-xl': ['28px', '36px'],
        'elder-2xl': ['34px', '42px'],
        'elder-3xl': ['42px', '50px'],
      },
      minHeight: {
        'touch': '56px',
      },
      minWidth: {
        'touch': '56px',
      }
    },
  },
  plugins: [],
}
