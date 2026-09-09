# Privacy — Pome 3.1.5

Pome adds no account, analytics, advertising, hosted backend or developer-run cloud
service. Maintainers do not receive home names, sensor values, tokens, camera
images or control activity through a Pome service.

The paired phone stores the Connector URL/token and Pome preferences locally:
favorites, light colors, themes, shortcuts, section choices and camera settings.
The watch also persists its menu/pin and display preferences. Saved tokens are
not embedded in the settings-page HTML or public PBW.

The phone sends authenticated requests over the user's private Tailscale
connection to Organik Apps Pebble Connector on their Mac. Its bundled helper uses
Apple Home for device control, scenes, sensor reads and optional camera capture.
Itsyhome is not required. Apple Home, accessory vendors, Tailscale, Pebble, the OS
and backups have their own service and privacy behavior.

The shared bearer token permits home control AND camera access. Treat it as a
house-control credential. Never share it or expose the service via Funnel or
public port forwarding.

Voice uses the transcription service configured in the Pebble app. Pome receives
the accepted text, not the audio, and resolves the request against the user's
home. Do not include private transcripts or home details in bug reports.

Camera snapshots pass through the private connection and paired phone to the
watch. The helper keeps a bounded in-memory history; it is not Pome cloud storage.
Read [camera privacy](CAMERA-PRIVACY.md) for capture, cache, freshness and retention
details. Historical releases used an Itsyhome webhook instead of native HomeKit.
