# Cameras: experimental, not included in public Pome 3.0

The public Pome 3.0 package disables camera viewing and pairing. The public Organik Apps Pebble Connector does **not** include the HomeKit camera helper. Installing the public apps will not enable cameras.

Private development has demonstrated native-height Time 2 snapshots, wide-image panning, manual capture, nine-image history, individual refresh schedules and persistent capture-time/age captions. These are not public-release capabilities.

The current Mac Catalyst helper's HomeKit development provisioning is device-restricted. It cannot simply be included in the existing Developer ID-distributed Connector. A supported distribution path and clean-user permissions/startup validation remain necessary. No additional installation is recommended to public users until that path exists.

Public source contains no household pairing information. Camera code is opt-in for isolated developer builds only; building Pome normally leaves it disabled. Do not distribute private builds containing bearer tokens.

See [camera privacy and implementation caveats](../CAMERA-PRIVACY.md). The existing private experiment is separate from public releases.
