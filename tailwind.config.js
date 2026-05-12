/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#faf9f6",
        surface: "#ffffff",
        ink: "#1a1a1a",
        muted: "#777777",
        soft: "#f5f3ee",
        sand: "#f0eee7",
        hairline: "rgba(0,0,0,0.08)",
        // status
        sInbox: { bg: "#ebebe8", fg: "#555555" },
        sPlanning: { bg: "#fef3d2", fg: "#8a6a00" },
        sReady: { bg: "#d6f0fa", fg: "#0a5778" },
        sProgress: { bg: "#cfe1fc", fg: "#1d4d99" },
        sBlocked: { bg: "#fcd5d5", fg: "#9c1f1f" },
        sReview: { bg: "#e7d8fc", fg: "#5d2db3" },
        sDone: { bg: "#d2efd6", fg: "#1d6e2a" },
        sArchived: { bg: "#ebebe8", fg: "#777777" },
        // priority
        pUrgent: { bg: "#fcd5d5", fg: "#9c1f1f" },
        pHigh: { bg: "#fde2c8", fg: "#8a4a14" },
        pMedium: { bg: "#fef3d2", fg: "#8a6a00" },
        pLow: { bg: "#d2efd6", fg: "#1d6e2a" },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "14px",
        xl: "20px",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
