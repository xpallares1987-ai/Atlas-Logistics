/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../freight-comparer/src/**/*.{js,ts,jsx,tsx}",
    "../dashboard/src/**/*.{js,ts,jsx,tsx}",
    "../ui/src/**/*.{js,ts,jsx,tsx}",
    "../bpmn-modeler/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6", // Primary Teal
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        navy: {
          50: "#f4f6f8",
          100: "#e2e8f0",
          500: "#334155",
          700: "#1e293b",
          900: "#0f172a", // Deep Navy Background
        },
        accent: {
          orange: "#f97316", // Safety orange
          amber: "#f59e0b", // Warning/Transit
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
