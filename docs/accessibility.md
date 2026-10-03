# Accessibility notes

Implemented:

- **Keyboard**: `Ctrl+Alt+Home` (configurable) moves focus into the dock. Arrow keys, Home and
  End move between items; Enter or Space activates; `Shift+F10` or the Menu key opens an
  item's menu (arrow keys move inside it); Escape leaves. The dock window is normally
  non-activating, so it only takes keyboard focus in this mode, in settings, the palette and
  the switcher.
- **Screen readers**: toolbar role with orientation, labelled buttons, menu/menuitem,
  listbox/option in the palette, dialog roles on panels, a polite live region for messages.
- **Reduced motion**: Framer Motion honors `prefers-reduced-motion` (no spring animation) and
  magnification is disabled; CSS transitions shorten to near zero.
- **Reduced transparency / high contrast**: `prefers-reduced-transparency`,
  `prefers-contrast: more`, `forced-colors: active` and an in-app Solid mode.
- **Contrast**: a unit test checks panel text against black, white, gray and saturated
  backdrops (WCAG AA 4,5:1) using the real stylesheet tokens.

Not done / limits:

- The dark scrim on the dock bar is static, not derived from the wallpaper.
- Text drawn directly on the bar (clock, stats) depends on the user's tint and wallpaper;
  Solid mode is the guaranteed-contrast option.
- Not tested with Narrator or NVDA.
