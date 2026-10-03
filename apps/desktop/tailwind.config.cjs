module.exports = {
  presets: [require("../../packages/ui/tailwind.preset.cjs")],
  content: ["./index.html", "../../packages/ui/src/**/*.{ts,tsx}"],
};
