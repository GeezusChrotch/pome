# Releasing Pome

## Preflight

1. Confirm `package.json` has the intended version.
2. Confirm no personal endpoint or accessory inventory is tracked:

   ```sh
   rg -n -i 'tailnet|ts\.net|token|password' . --glob '!RELEASING.md'
   ```

   Review every match; documentation may use generic terms, but real values must
   never be present.

3. Run tests and build both targets:

   ```sh
   node tests/group-control.test.js
   pebble clean
   pebble build
   unzip -p build/itsyhome-pebble.pbw appinfo.json | jq
   ```

4. Inspect every file under `appstore-assets/`. Screenshots must use generic demo
   names only.

## GitHub release

Create a tagged release and attach the PBW built from the same commit:

```sh
cp build/itsyhome-pebble.pbw /tmp/Pome-VERSION.pbw
gh release create vVERSION /tmp/Pome-VERSION.pbw \
  --title "Pome VERSION" --notes-file CHANGELOG.md
```

## Pebble appstore

The current Pebble CLI creates a new app listing as visible immediately. Do not run
this command until the listing text, source/support URLs, icons, screenshots, and
release have received final approval.

Use the description under `APPSTORE_LISTING.md`, category `tools`, these icons:

- `appstore-assets/pome-icon-small.png`
- `appstore-assets/pome-icon-large.png`

and the `basalt_*.png` and `emery_*.png` screenshots. The publishing command is:

```sh
pebble publish --non-interactive \
  --name Pome \
  --version VERSION \
  --description "PASTE THE APPROVED DESCRIPTION" \
  --source https://github.com/GeezusChrotch/pome \
  --category tools \
  --icon-small appstore-assets/pome-icon-small.png \
  --icon-large appstore-assets/pome-icon-large.png \
  --screenshots appstore-assets/basalt_home.png \
    appstore-assets/basalt_room.png \
    appstore-assets/basalt_all_lights.png \
    appstore-assets/basalt_brightness.png \
    appstore-assets/basalt_colors.png \
    appstore-assets/emery_home.png \
    appstore-assets/emery_room.png \
    appstore-assets/emery_all_lights.png \
    appstore-assets/emery_brightness.png \
    appstore-assets/emery_colors.png \
  --no-gif-all-platforms \
  --release-notes "Initial public release"
```

After publication, verify the listing in the Pebble mobile app, install it on both
platforms, and confirm that a fresh install requires the user's own server URL.
