# Pome 3.1.7 single-camera room test

Room Cameras opens the existing captures/history page immediately when exactly
one camera is returned on the only page. Multi-camera rooms and the global camera
list retain normal selection. Back from auto-opened history returns directly to
the room; Back from an image still returns to its capture history.

Full regression suite and clean Basalt/Emery SDK4.33.1 build passed. Added executable
Back-navigation regression; physical acceptance pending.

Artifact: `dist/Pome-3.1.7-single-room-camera.pbw`

SHA256: `c8a1b719aca8a60fce6d45aec0c13252e08fd8a6b03857f6eb46e55eb9ec87be`

Separate outstanding helper issue: user saw stale-window rendering error. Connector
owner verified nine camera errors from the marker freshness guard on test41, with
no Lounge frame/history available. The watch change does not fix rendering.
Helper owner investigating separate test42; no freshness guard bypass allowed.
Frozen3.1.5 and submittedStore40 untouched; no publication.

Helper experiments concluded without accepted fix: ordered-onscreen42 produced
fresh Lounge/second-camera captures but was not invisible; borderless-offscreen43
and44 (including ignoreGlobalClipSingleWindow) failed capture. Owner restored41,
verified inventory/pairing/settings, and released runtime slot. No guard bypass.
3.1.7 independent watch installation attempt refused before transfer, exit1;
not installed. Camera error remains unresolved.

Subsequent rendering fix45 passed real captures: Lounge4.95s and second camera9.05s,
new snapshot after request and age1 for each, with marker/pixel guards intact.
Render surface is ordered inside display geometry BELOW desktop wallpaper, not
ordered out or fully offscreen. Runtime45 remains running; no rollback authorized.
Health confirms belowDesktop/ordered/Dockhidden/nonmini; whole-desktop/Spaces visual
behavior still requires user confirmation. Token and all10 settings preserved.
Evidence: Connector build/render45-runtime-private/captures.json and
build/RENDER45_VALIDATION.json. 3.1.7 watch install retry refused before transfer;
existing3.1.6 can test fixed camera capture now. New watch shortcut remains pending.
