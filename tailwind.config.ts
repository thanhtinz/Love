import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    fontFamily: { display: ["'Baloo 2'", "cursive"], body: ["Quicksand", "sans-serif"] },
    colors: { blush: { 50:"#fff5f7",100:"#ffe4ec",200:"#fecdd8",300:"#fda4bc",400:"#fb7aa0",500:"#f45383" }, cream: "#fff9f0" },
    animation: {
      float: "float 3s ease-in-out infinite", wiggle: "wiggle 0.6s ease-in-out", bounceSoft: "bounceSoft 1.2s ease-in-out infinite",
      pop: "pop 0.4s ease-out", rise: "rise 1.2s ease-out forwards", fall: "fall 2.2s cubic-bezier(.2,.7,.4,1) forwards",
      sway: "sway 2.6s ease-in-out infinite", glow: "glow 1.6s ease-in-out infinite", confetti: "confetti 2.4s ease-out forwards",
      shakeTree: "shakeTree 0.7s ease-in-out", sparkle: "sparkle 1s ease-in-out infinite", drift: "drift 5s ease-in-out infinite",
    },
    keyframes: {
      float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
      wiggle: { "0%,100%": { transform: "rotate(0deg)" }, "25%": { transform: "rotate(-6deg)" }, "75%": { transform: "rotate(6deg)" } },
      bounceSoft: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      pop: { "0%": { transform: "scale(0.8)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      rise: { "0%": { transform: "translateY(0) scale(1)", opacity: "1" }, "100%": { transform: "translateY(-90px) scale(1.4)", opacity: "0" } },
      fall: { "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "0" }, "12%": { opacity: "1" }, "55%": { transform: "translateY(120px) rotate(24deg)" }, "78%": { transform: "translateY(168px) rotate(-10deg)" }, "100%": { transform: "translateY(178px) rotate(6deg)", opacity: "1" } },
      sway: { "0%,100%": { transform: "rotate(-3deg)" }, "50%": { transform: "rotate(3deg)" } },
      glow: { "0%,100%": { filter: "drop-shadow(0 0 6px rgba(244,83,131,.45))" }, "50%": { filter: "drop-shadow(0 0 22px rgba(244,83,131,.9))" } },
      confetti: { "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" }, "100%": { transform: "translateY(220px) rotate(540deg)", opacity: "0" } },
      shakeTree: { "0%,100%": { transform: "rotate(0deg) scale(1)" }, "20%": { transform: "rotate(-4deg) scale(1.06)" }, "45%": { transform: "rotate(4deg) scale(1.08)" }, "70%": { transform: "rotate(-2deg) scale(1.04)" } },
      sparkle: { "0%,100%": { opacity: "0.3", transform: "scale(.8)" }, "50%": { opacity: "1", transform: "scale(1.2)" } },
      drift: { "0%,100%": { transform: "translate(0,0)" }, "50%": { transform: "translate(8px,-10px)" } },
    },
  } },
  plugins: [],
};
export default config;
