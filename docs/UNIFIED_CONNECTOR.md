# Organik Apps Pebble Connector

Pome 3.1.5 uses the HomeKit-default Connector: one Mac app with an embedded helper
for controls and optional cameras. Itsyhome is no longer required.

**Release pending:** the accepted development setup is build 39. The public Store
build is planned as 1.0 (40 or higher), subject to packaging and Apple review.
Do not substitute the older public Connector just because it has a similar name.
The release owner must add and verify the compatible Store link before publishing.

Follow [Apple Home setup](HOMEKIT-SETUP.md). The Pome page provides
**Connect Apple Home**, **Start private connection**, **Copy Pome URL** and
**Copy Pome token**. Use those shared credentials in Pome's phone Setup tab.
Camera schedules remain optional.

Keep Connector running and the Mac awake. Closing its window keeps services
running; normal Quit stops them. Existing camera pairing, preferences and
accessory identifiers survived the accepted development build's window-close and
Quit/reopen tests; this is not proof of a fresh Store installation.

Do not reset phone storage or Tailscale as a migration step. Replace an old
Itsyhome-only address with the new pairing. Keep Itsyhome if other integrations
still depend on it. Historical 3.0.x documents describe the old architecture.
