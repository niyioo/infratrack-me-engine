/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    // Add these just in case you ever create folders outside of src!
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"
  ],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {}
  },
  plugins: []
};