# Pome

Use **Organik Apps Pebble Connector** for the coordinated Mac release: one free MIT app for
Notesy, Beepster, Reminderz and Pome. [Setup and migration](docs/UNIFIED_CONNECTOR.md).
Existing Pome watch pairing is retained. Standalone connector details below describe the older
implementation and remain useful for source builds or rollback.

### Pinned scenes

In phone settings → **Shortcuts**, assign **Pin / unpin** to Up/Select/Down
hold or Double Back. On the watch, highlight a scene in Favorites, Scenes, or a
room's scene list, or an accessory/sensor in a room and use that gesture to toggle its pin. Use the same gesture on
a pinned main-page row to unpin it, including a renamed or deleted scene.
Other rows are unaffected. Pinned scenes appear above Voice; normal Select still
runs the scene. Pins persist on the watch, and phone settings sync preserves them.

Theme and button customization are phone-only. Shortcuts includes Up/Select/Down holds
and Double Back (two quick presses, Off by default). Single Back still returns.
Existing theme shortcuts become Off; other assignments are preserved.

Pome is an open-source Pebble Time and Pebble Time 2 controller for Apple Home
accessories exposed by [Itsyhome for macOS](https://itsyhome.app/macos).

Browse favorites, scenes, rooms, devices, and read-only sensors from your wrist.
Lights include toggle, brightness, and configurable color controls. Each room also
gets an **All Lights** control that safely paces commands across its reachable bulbs.
Blinds include absolute open/close controls and 1%, 5%, and 10% position steps.
On dictation-capable watches, **Voice** turns natural phrases such as "Set Lounge TV"
or "Turn lounge lights green" into confirmed Itsyhome commands.

Pome is an independent community project and is not affiliated with Apple,
Itsyhome, Tailscale, or Pebble.

## Requirements

- Pebble Time (`basalt`) or Pebble Time 2 (`emery`)
- Pebble mobile app with PebbleKit JS support
- [Itsyhome for macOS](https://itsyhome.app/macos) with its Webhooks/CLI server enabled
- A URL the paired phone can reach:
  - a local HTTP URL for LAN-only control, or
  - a private Tailscale Serve HTTPS URL for home-and-away control

Do not expose Itsyhome through Tailscale Funnel or router port forwarding. The
webhook server should remain private.

## Setup with the unified connector

1. Keep Itsyhome installed and enable Settings → Webhooks/CLI.
2. Install Organik Apps Pebble Connector and select **Pome** in its sidebar.
3. Enter the existing Itsyhome host and port (default 8423), then follow **Connect** to check it
   and configure private access. Keep Tailscale connected on the Mac and phone.
4. Paste the provided private address into Pome's phone settings and refresh the watch.

The connector does not replace Itsyhome. Existing direct LAN connections still work.
See [setup and migration](docs/UNIFIED_CONNECTOR.md).

## Manual setup (optional)

1. In Itsyhome, open **Settings → Webhooks/CLI** and enable the server. Its default
   port is `8423`.
2. Verify it from the Mac:

   ```sh
   curl http://127.0.0.1:8423/status
   ```

3. For private remote access, install Tailscale on the Mac and iPhone, sign both
   into the same tailnet, and run:

   ```sh
   tailscale serve --bg --https=10443 localhost:8423
   tailscale serve status
   ```

4. In the Pebble mobile app, open Pome's settings and enter either the local
   Itsyhome URL or the HTTPS URL reported by Tailscale Serve.
5. Choose which main sections and room sensors to show, customize the six light
   colors, and save.

## Features

- Favorites, global scenes, and rooms, each individually configurable
- Direct opening when only one main section is enabled
- Sensors first and room-specific scenes second inside each room
- Devices grouped by type (lights, fans, switches, then outlets) and alphabetized
  within each group, with redundant room-name prefixes hidden for display
- Read-only temperature, humidity, contact, motion, occupancy, and leak values
- Light toggle, brightness presets at 25/50/75/100%, and six configurable colors
- A separate Themes settings tab with a live watch preview, configurable text,
  background and selection colors, five Pebble system font families and their
  supported sizes, optional device icons, five built-in themes, and up to 20 named
  custom themes
- Time 2 enhanced typography with Inter, Roboto, Open Sans, Montserrat, and Poppins,
  each available at 14, 18, 22, 26, and 30 points; Pebble Time keeps its smaller
  system-font build
- Automatic marquee scrolling for selected menu-item names that do not fit the screen
- Configurable main-screen long presses for Up, Select, and Down, targeting Voice,
  Favorites, Scenes, Rooms, or a specific scene refreshed from Itsyhome

The Time 2 font files are distributed under the SIL Open Font License. Source and
license details are in `resources/fonts/README.md`.
- Room-wide All Lights toggle, brightness, and color with pacing and retries
- Blind open/close plus slow (1%), regular (5%), and fast (10%) up/down controls
- Confirmation for scene names suggesting doors, garages, gates, alarms, or disarm
- Full original Itsyhome names retained for every command
- Voice is always first, discovers the current Itsyhome vocabulary automatically, and
  runs unambiguous safe matches immediately
- Voice scenes use "set", "run", "activate", or "start"; explicit power language
  continues to target devices
- Voice covers safe power controls, light color and brightness, fan speed, blind
  movement and position, scenes, and read-only status questions
- Ambiguous phrases are rejected, while scene names suggesting doors, garages, gates,
  alarms, or disarming still require confirmation

## Architecture

The native C watch app sends AppMessages to PebbleKit JS on the paired phone.
PebbleKit JS then calls the user-configured Itsyhome webhook server directly. Pome
has no account, analytics, hosted backend, or cloud relay of its own. Voice audio is
handled by Pebble's native dictation system and the transcription provider selected
in the Pebble mobile app; Pome receives only the accepted transcript.

## Development

Install the current Pebble SDK, then run:

```sh
node tests/group-control.test.js
node tests/voice-control.test.js
node tests/theme-control.test.js
pebble clean
pebble build
```

Install in the emulators:

```sh
pebble install --emulator basalt
pebble install --emulator emery
```

Install on a physical watch while Dev Connection is enabled in the mobile app:

```sh
pebble install --cloudpebble
```

## Contributing

Issues, feature proposals, documentation fixes, and pull requests are welcome.
See [CONTRIBUTING.md](CONTRIBUTING.md). Please preserve Pome's safety boundaries:
sensors remain read-only, public webhook exposure is never recommended, and
security-sensitive controls require deliberate handling.

## Privacy and security

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md). Never commit a real
Itsyhome or Tailscale URL, access token, tailnet name, or home-accessory inventory.

## License

Pome is available under the [MIT License](LICENSE).

## Thank you

Thank you to ChatGPT and Codex, especially ChatGPT 5.6 Sol and ChatGPT 6 Astra, and to the people at OpenAI who build these tools, for allowing a nerd with an idea to make cool stuff.

We also thank the developers and communities behind the apps, libraries, fonts and tools we build
on. [Full acknowledgments](ACKNOWLEDGMENTS.md).

## Consistent phone settings

The Pome-style tabbed settings and theme editor are described in [Phone settings](docs/SETTINGS.md).

## Touch menu selection

On a touch-capable watch, tap a different menu item to highlight it and read its scrolling title. Tap the highlighted item again to open or activate it; there is no need to tap quickly. Physical Select still activates the highlighted item.

Accessory pins appear alongside scenes on the main page, with the room as their subtitle. Selecting one refreshes its room and highlights the accessory (or opens the sensor list); select the accessory normally to operate it. Pinning never switches a device. Service IDs distinguish same-named accessories; devices without an ID and sensors use room, name, and type. Missing or ambiguous matches show a message instead of operating another item. Existing scene pins are preserved.
