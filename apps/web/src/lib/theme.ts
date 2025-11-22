export const theme = {
  fonts: {
    display: "Space Grotesk, Inter, sans-serif",
    body: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  colors: {
    backgroundDeep: "#01000b",
    backgroundMid: "#05051f",
    primary: "#6c63ff",
    secondary: "#00c2ff",
    accent: "#ff62d9",
    success: "#2dd4bf",
    warning: "#fcd34d",
    error: "#f87171",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassBackground: "rgba(255, 255, 255, 0.04)",
  },
  shadows: {
    card: "0 20px 60px rgba(5, 15, 35, 0.7)",
    hover: "0 25px 70px rgba(0, 194, 255, 0.35)",
  },
  gradients: {
    button: "linear-gradient(120deg, #6c63ff, #00c2ff)",
    background:
      "radial-gradient(circle at 20% 20%, rgba(108, 99, 255, 0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(0, 194, 255, 0.2), transparent 35%), radial-gradient(circle at 50% 80%, rgba(255, 98, 217, 0.15), transparent 45%), linear-gradient(135deg, #01000b, #05051f)",
  },
  radii: {
    xl: "32px",
    lg: "24px",
    md: "16px",
    pill: "9999px",
  },
  z: {
    background: 0,
    content: 1,
    overlays: 10,
  },
} as const;

export type Theme = typeof theme;

