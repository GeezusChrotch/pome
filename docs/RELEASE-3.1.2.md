# Pome 3.1.2 — development test candidate

Includes the pending 3.1.1 pin marker and Favorites redraw fixes.

## Scrolling text

Themes tab → Scrolling text speed offers Off, Slow, Normal, Fast, and Very fast
(0, 25, 50, 75, 100 pixels/sec). Normal is the new default, twice the old 25px/sec.
The setting applies across themes and persists on phone and watch. Off displays
still, ellipsized titles; other speeds retain the existing end/start pauses.

## Preview colors

The old preview/picker transformed RGB222 colors through a simulated LCD lookup
table. For example, transmitted red `#ff0000` was shown as `#e35462`, and green
`#00ff00` as `#8ee391`. Both preview paths now use the same canonical64-color
palette as the transmitted GColor8 values. Selected text contrast uses the same
algorithm as the watch payload. Saved themes/colors are not rewritten.

This fixes a verified code-level mismatch, not a claim of calibrated physical
screen matching. Watch lighting/panel appearance still requires user validation.

## Validation and boundaries

All JS tests pass, including `tests/marquee-settings.test.cjs` checking all64
preview/picker/payload mappings, all five speed choices, persistence and default
timing. Clean Basalt and Emery builds pass. New message key48 and persistence
key2203 do not overlap existing keys. No Connector/helper changes or publication.

Artifact: `dist/Pome-3.1.2-marquee-colors.pbw`

SHA-256: `1ee50ad46c3636c37bb32ae1a23f733ff57f3eb511eabf9c2f6573a0a447b912`

Physical pin appearance, Favorites startup, marquee and selection-color acceptance
remain pending the matching watch install and user check.

Initial LAN install attempt returned `Connection refused` (exit1); not installed.
Shared watch slot released. Awaiting developer connection on the phone.
