/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Un color por fase del marco, para el stepper y las leyendas
        fase: {
          elicitacion: '#2563eb',
          analisis: '#7c3aed',
          especificacion: '#0d9488',
          validacion: '#d97706',
        },
      },
    },
  },
  plugins: [],
};
