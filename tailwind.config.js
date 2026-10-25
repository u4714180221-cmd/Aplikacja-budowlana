/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F5F2",
        ink: "#1F1B16",
        muted: "#8A8276",
        line: "#EDE9E2",
        accent: "#E8743B",
        accentsoft: "#FBE4D8",
        status: {
          grayBg: "#F3F4F6", grayFg: "#6B7280",
          blueBg: "#DBEAFE", blueFg: "#1D4ED8",
          greenBg: "#DCFCE7", greenFg: "#15803D",
          redBg: "#FEE2E2", redFg: "#B91C1C",
        },
      },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
};
