/** Shared Tailwind preset: colors/radii come from the CSS variables in tokens.css. */
module.exports = {
  theme: {
    extend: {
      colors: { accent: "var(--accent)" },
      borderRadius: { dock: "var(--radius-dock)", item: "var(--radius-item)" },
    },
  },
};
