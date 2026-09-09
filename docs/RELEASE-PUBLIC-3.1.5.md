# Pome 3.1.5 — your Apple Home, directly

Prepared release copy, not publication. Requires the compatible HomeKit-default
Organik Apps Pebble Connector to be publicly available first. This replaces the
staged 3.0.1 camera-only plan, not its frozen files or historical evidence.

## One Mac app

Devices, scenes, sensors and cameras now use the HomeKit helper included in
Organik Apps Pebble Connector. Grant Home access and pair once with its private
HTTPS URL and token. No separate helper or Itsyhome installation is required.
Keep the Mac and iPhone connected through your private Tailscale network.

## Simpler controls

Lights and All Lights share one menu: Toggle, four percentages, six colors and
Custom Color. The live picker has tall hue/saturation sliders and a compact preview.
Drag on Time 2 or use buttons on either watch. Room commands wait 75ms between
completed writes and retain only the newest queued color. Multi-light operations
are sequential, not atomic, and can partially succeed.

Fan speed, switch/plug toggles, blind movement, voice and stay-in-controls behavior
remain. Pin scenes, rooms, devices, sensors and cameras; reorder pins and sections
together. Pinned rows have a small marker, Favorites refresh more promptly, and
marquee speed is adjustable with a faster default. Theme previews now use the
actual 64-color palette; lighting and physical displays still affect appearance.

## Cameras on Time 2

Capture now requests a fresh still; each camera also offers its nine latest saved
images. Photos preserve aspect ratio at full watch height, with panning and a
persistent capture-time/age caption. Pin cameras for direct capture. Configure
refresh intervals, visibility and image processing in the Cameras tab.

Prefer on-demand or infrequent refresh for battery/solar cameras. Scheduled
HomeKit snapshots may contain old pixels despite a recent API timestamp. Failed
manual capture reports an error rather than substituting an old image.
[Camera privacy](../CAMERA-PRIVACY.md).

## Upgrade notes

Replace an old Itsyhome URL with the Connector URL/token in Setup. Existing camera
pairing is reused. Select favorite scenes in Pome settings. Themes, shortcuts,
pins and camera preferences are retained, but an old target that no longer
resolves may need repinning. Itsyhome-only aliases/groups and unbridged devices
are not imported. Keep Itsyhome if another app or device still uses it.

Original Time retains home controls; cameras require Time 2. Keep the Mac awake
and Connector running. Treat its token as a house-control credential.
[Setup](HOMEKIT-SETUP.md) · [Privacy](../PRIVACY.md).
