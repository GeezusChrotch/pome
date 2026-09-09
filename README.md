# Pome

Apple Home on Pebble Time and Pebble Time 2: rooms, scenes, devices, sensors,
and Time 2 camera snapshots, through one Mac app.

## 3.1.5 release preparation

**Not published yet.** This accepted watch candidate replaces the staged 3.0.1
camera-only plan. Publication depends on the compatible HomeKit-default
Organik Apps Pebble Connector becoming publicly available in the Mac App Store.
The tested development build is Connector 1.0 (39), not a verified public download.
Older Itsyhome-backed public packages remain unchanged.

[Release highlights](docs/RELEASE-PUBLIC-3.1.5.md) ·
[Setup instructions](docs/HOMEKIT-SETUP.md) ·
[Connector project](https://github.com/GeezusChrotch/organik-pebble-connector)

## One connection to your home

Pome 3.1.5 uses the native HomeKit helper embedded in Organik Apps Pebble Connector.
**Itsyhome is no longer required.** No separate helper installation is needed.
Allow Home access on the Mac, then pair Pome with the Connector's private HTTPS
address and token. Keep Tailscale connected on Mac and iPhone for private
home-and-away access. Keep the Mac awake and Connector running.

The same pairing handles devices and cameras. Existing camera pairing is reused;
an old Itsyhome-only URL must be replaced. Favorite scenes are chosen in Pome
settings, not imported from Apple Home's favorites. Do not remove Itsyhome if
another app or device still uses it.

## From your wrist

- Browse scenes, rooms, devices and read-only sensors.
- Control individual lights or All Lights in a room from one menu: Toggle,
  25/50/75/100%, six configurable colors, and Custom Color.
- Dial colors live with visual hue/saturation sliders. Time 2 supports dragging;
  Up/Down adjusts, holding accelerates, and Select switches sliders. No Apply step.
  Room changes are sequential; only the newest pending color is retained.
- Fans have toggle/speed controls, switches and plugs have toggles, and blinds
  have open/close plus 1%, 5%, and 10% steps. Accessory support varies.
- Pin scenes, rooms, devices, sensors, and Time 2 cameras. Drag pins and sections
  into your preferred Home Screen order in phone settings.
- Choose ten themes, save your own, set title/subtitle sizes and marquee speed,
  and assign long-press and Double Back shortcuts. Time 2 adds five custom font
  families and five sizes. Theme previews use the watch's 64-color palette.
- Voice supports phrases such as “Set Lounge TV” and “Turn lounge lights green.”
  Clear safe matches run directly; ambiguous requests are rejected and sensitive
  scene names require confirmation. Voice requires a supported watch.
- Time 2 can show fresh camera captures or nine cached images, with timestamp/age,
  aspect-preserving photos and manual/automatic panning. Configure each camera's
  refresh interval, visibility and image processing on the Cameras tab.

Settings and pairing live in the Pebble phone app. On touch menus, tap another row
to highlight it, then tap it again to activate. Physical Select activates the
highlighted row. Device adjustments keep the controls open.

## Requirements and privacy

Pebble Time or Time 2, the Pebble iPhone app with PebbleKit JS, a compatible
HomeKit-default Connector, Apple Home permission, and private Tailscale access.
See [setup](docs/HOMEKIT-SETUP.md) for compatibility details.
Camera viewing requires Time 2; original Time retains home controls.

Pome adds no account, analytics, hosted relay, or cloud image storage. Your token
permits home control and camera access: never share it or expose the service via
Funnel or public port forwarding. Voice uses Pebble's configured transcription
service. [Privacy](PRIVACY.md) · [Camera privacy](CAMERA-PRIVACY.md).

## Development

Use the Pebble SDK, then run:

```sh
for t in tests/*.test.js tests/*.test.cjs; do node "$t" || exit 1; done
bash tests/run-homekit-tests.sh
pebble clean
pebble build
```

Do not replace the frozen accepted artifact with a rebuild without another audit.
See [release evidence](docs/RELEASE-GATES-3.1.5.json).

Issues and contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md),
[SECURITY.md](SECURITY.md), and the [MIT License](LICENSE). Never commit private
addresses, tokens, home inventories, or camera images.

Pome is independent of Apple, Itsyhome, Tailscale, and Pebble. Thanks to their
communities, the font authors, and ChatGPT/Codex and the people at OpenAI who helped
turn this project into reality. [Acknowledgments](ACKNOWLEDGMENTS.md).
