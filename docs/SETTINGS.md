# Pome phone settings

The settings page follows the shared Organik layout based on Pome: **Setup, Themes, Shortcuts**.

Setup retains the server address, enabled sections, and six light-color slots. Shortcuts retains all three hold actions and cached scenes.

## Themes

Choose a built-in preset or adjust the available colors, font, and size. Color swatches open the 64-color Pebble palette, with Pome's watch-color approximation. The watch preview updates while editing. Only fonts and sizes supported by this app are offered; preview fonts can fall back to a similar browser font.

The existing saved-theme library and its apply/delete behavior are preserved. Built-in themes cannot be deleted. Use the page’s save/apply action to send the selected theme to the watch.

Switching tabs keeps unsaved edits. Save applies the app's settings together, including connection details and app-specific controls. Closing without saving discards edits. No new pairing is required solely for this layout update.

## Implementation and validation

The dependency-free shared UI is vendored inside the page generator between `BEGIN ORGANIK SETTINGS UI` / `END ORGANIK SETTINGS UI` markers. The app's original controls remain the source of truth and its existing save handler produces the Pebble callback. Coordinate shared UI updates across the other Organik Pebble apps.

Verified with generated-page browser checks on 320px and 390px viewports, Time/Time 2 configuration variants, palette interactions, and before/after save-payload comparisons. New custom theme libraries were checked through phone storage and reopening. Hardware installation and public release are separate from these source changes.

## Basic touch navigation

Tap a different menu row to focus it, then tap the focused row to activate it. Swipe to scroll through menus. Confirmation screens keep their button controls. Touch-capable watches must have touch enabled under Settings → Display → Touch. Wake the watch before using touch navigation. All existing physical-button controls remain available; non-touch watches keep their existing behavior.
