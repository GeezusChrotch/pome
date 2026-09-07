# Pome 2.8.4

## Release notes

Pin scenes, room accessories, and sensors to the main menu. Assign **Pin / unpin**
to an Up/Select/Down hold or Double Back in the phone's Shortcuts tab. Use that
gesture on a highlighted item to pin it, or on a pinned main-menu row to unpin it.
Existing pins stay saved; settings sync does not undo watch pin changes.

Opening an accessory pin refreshes its room and highlights the matching accessory.
Sensor pins open the sensor list. Missing or ambiguous matches show a message;
opening a pin never operates a device using cached metadata. Normal scene
selection continues to run the scene.

Theme and shortcut customization now lives on the phone. Double Back is
configurable and defaults to Off. Old theme shortcuts become Off; other
assignments are preserved. Touch menus start at the top instead of halfway down,
while retaining two-step tap selection and scrolled positions.

## Artifact and validation

- Package: `Pome-2.8.4.pbw`
- Version: `2.8.4`; platforms: Basalt and Emery.
- SHA-256: `b45f4bea78f4b19121aff451eaefd0556f092994c86734d2ef0b59a799cf171d`
- Feature commit: `6004efe`.
- This is the exact previously installed package, not a new release rebuild.
- JavaScript syntax, pin persistence, shortcut dispatch, refreshed accessory
  identity, themes, group controls, voice controls, and startup-position tests pass.
- Both platform builds passed during preparation. The current build and staged
  package match the installed artifact hash exactly.
- CloudPebble confirmed physical installation. Emulator startup checks passed;
  the physical screenshot showed a top-aligned room menu. This is not a claim of
  exhaustive hardware testing of every accessory, sensor, or shortcut combination.
- This publication pass changes documentation only, and performs no installation.
- Appstore publication is owned by the coordinated release task; GitHub publication
  alone does not establish Appstore availability.
