# Pome 3.1.5 public screenshot candidates

Four unedited, native 200×228 Time 2 screenshots from the exact frozen installed
PBW, SHA256 `becfa23fb55c8f3715b89ca229caedf9b2756232172b60c5167882703a5ff48e`.
No rebuild, code change, watch installation, Connector use, upload or publication.

## Recommended Store order and replacement map

1. `emery_home.png` — replaces old `emery_home.png`.
2. `emery_room.png` — replaces old `emery_room.png` / `emery_all_lights.png`.
3. `emery_controls.png` — replaces old `emery_brightness.png`; shows the flat
   All Lights menu with percentage-only labels.
4. `emery_custom_color.png` — replaces old `emery_colors.png`; shows the new tall
   sliders, small preview and live-color instructions.

Remove old brightness/color submenu captures rather than keeping them alongside
the replacements. The same recommendation applies if Store assets have been
renamed: identify by depicted screen, not only filename.

Omit existing `basalt_*` screenshots for this release. The isolated SDK4.33.1
Basalt emulator did not complete a protocol handshake, so no fresh original-Time
captures are certified here. This is an emulator-capture limitation, not a new
watch regression claim. Do not relabel or resize Time 2 images as original Time.

Existing icon files are unchanged. No camera-photo screenshot is proposed.

## Provenance and privacy

Captured 2026-09-09 with an isolated headless SDK4.33.1 Emery QEMU instance, a fresh
copy of factory flash, explicit loopback ports, and no phone JavaScript runtime.
The frozen PBW was installed directly through `--qemu`, never `--phone`.
Fictional AppMessage fixtures supplied Living Room, Kitchen, Ceiling, Lamp and Fan.
No private URL/token, real home inventory or camera image was loaded. With no
phone runtime, control interactions could not reach the real home.

Screenshots use `pebble screenshot --qemu ... --no-open --no-correction`, without
post-processing. The theme was set through normal AppMessages: black background,
white text, blue selection, Inter 22, icons enabled. Custom Color uses its actual
fixed picker typography and layout. These are real rendered app screens with demo
data, not mockups. Visually reviewed all four images at native resolution.

SHA256:

See `SHA256.json`. Release coordinator owns final Store selection/upload after
Connector public availability; these files do not authorize publication.
