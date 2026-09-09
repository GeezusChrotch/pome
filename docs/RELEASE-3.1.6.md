# Pome 3.1.6 room-camera test candidate

- Time 2 rooms with enabled cameras have a Cameras submenu above Sensors and Scenes.
- Uses the existing camera list/history/manual capture/image/pin controls; filters by
  exact HomeKit room metadata before pagination. Returning from history preserves
  the room filter. Opening the global Cameras section clears it.
- Hidden cameras are excluded. Empty rooms and original Time do not get this row;
  the global camera show/hide preference is respected. Device/pin indices account
  for the optional row.
- Requires the separate new Connector helper candidate: /cameras and /camera-settings
  now include room and roomId from HomeKit. Existing helper endpoints and camera IDs
  are unchanged. Old helpers safely yield no room-camera rows; names are not guessed.
- Full JS/C regressions, room filtering/pagination and row-offset tests passed.
  Clean SDK4.33.1 Basalt/Emery build passed. Physical test pending helper deployment.

PBW: `dist/Pome-3.1.6-room-cameras.pbw`

SHA256: `0b0e36a896311e45cfb34085d7bc909cfb19c295836ff4906e116f29c1258659`

Frozen accepted3.1.5 remains unchanged at SHA256
`becfa23fb55c8f3715b89ca229caedf9b2756232172b60c5167882703a5ff48e`.
No publication approval inferred; archived Connector40 unchanged.
