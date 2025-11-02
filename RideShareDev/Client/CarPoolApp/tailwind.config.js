/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#9333ea',
        'primary-dark': '#7e22ce',
        female: '#e11d48',
        'female-light': '#ec4899',
        male: '#1f2937',
      },
    },
  },
  plugins: [],
};