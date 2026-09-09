# Direct HomeKit integration handoff — 3.1.0 candidate

## Ownership and release boundary

Pome owns `experiments/homekit-camera` and watch/phone changes for this candidate.
The Connector task owns native Connector UI, helper packaging/signing, and any
shared runtime installation/restart. Do not rebuild or overwrite the submitted
Store 1.0(37), frozen public cloud source, or accepted Pome 3.0.1 package.

This change does **not** remove Itsyhome from the user's Mac; their glasses or
other integrations may still use it. It only removes Pome's dependency on it.

## Helper changes

- New `HomeControl.swift`, included in the existing Catalyst Xcode target.
- Reuses `CameraCacheController`'s `HMHomeManager` and private loopback listener
  on 7855, camera bearer token, and existing private HTTPS route.
- No new entitlement, App Group, listening port, background service, helper app,
  external account, or installation. Home discovery now runs independently of
  the scheduled camera cache being enabled.
- Existing `/health` camera schema, camera endpoints, and owner-only shutdown
  credential are unchanged.
- `CacheHTTP.homeRoute` handles asynchronous HomeKit responses and JSON arrays.
  Headers have a five-second deadline; request lifetime is capped at 15 seconds.
- HomeKit control writes acknowledge completion, not mere queueing. Per-service
  serialization rejects concurrent writes. A 10-second deadline reports unknown
  outcome; a late callback cannot send another HTTP response. No further writes
  in a color/brightness sequence start after its nine-second execution deadline.
- Read refreshes use up to eight concurrent characteristic reads, with an
  eight-second deadline. Failed readings are unavailable; inventory isn't a
  promise of fresh device state. Scene activity derives from known cached values.

## Authenticated API

All paths below have the `/home` prefix. The same bearer credential used for
cameras is required before dispatch. Responses have `Cache-Control: no-store`.
Split escaped paths before decoding; names can contain slashes.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/status` | `backend: homekit`, `protocol: 1`, device/home counts |
| GET | `/list/rooms` | Sorted room name/UUID records |
| GET | `/list/devices` | Service name/type/UUID, room/home UUID, reachability, cached state |
| GET | `/list/scenes` | Scene name/UUID/kind/state; excludes empty/automation-owned scenes |
| GET | `/info/{room}` | Refreshed room service records |
| GET | `/info/{serviceUUID}` or `/info/{room}/{name}` | One refreshed service |
| GET | `/debug/{name}` | Service type/UUID and room, for existing duplicate-service UI |
| POST | `/scene/{name-or-UUID}` | Execute the unique scene |
| POST | `/toggle/{target}`, `/on/{target}`, `/off/{target}` | Writable safe device power |
| POST | `/brightness/{0–100}/{target}` | Light brightness plus matching power |
| POST | `/color/{0–360}/{0–100}/{target}` | Light hue and saturation |
| POST | `/speed/{0–100}/{target}` | Fan rotation speed |
| POST | `/position/{0–100}/{target}` | Blind target position |

`target` is service UUID or escaped room/name. Missing targets return 404,
ambiguous names/concurrent writes 409, unsupported controls/ranges 422,
HomeKit failures 502, unavailable homes/devices 503, and write timeout 504.
All mutations require POST; GET cannot execute a control.

`/list/favourites` is implemented on the phone by filtering native scenes using
`pomeHomeFavorites`; it is not a helper endpoint. Favorites use scene names to
match the existing watch contract. HomeKit does not expose Apple Home favorites.

## Phone/watch migration

- `homekit.js` replaces every former Itsyhome request. There is no automatic
  Itsyhome fallback, including when an old URL remains in phone storage.
- Reuses `pomeCameraConnection`; pairing fields move to Setup and apply to all
  HomeKit/camera functions. Existing pairing, pins, themes, shortcuts, camera
  settings, UUID, native layouts, and watch storage formats are retained.
- Pairing validates `/home/status` before reporting settings saved. An older
  Connector can accept camera pairing but must fail the native-backend check.
- Native room-wide commands retain pacing and aggregate partial failures but
  disable automatic retries of uncertain writes.
- Favorites are now selectable in Setup. Empty/offline scene catalogs retain
  saved selections rather than clearing them.

## Connector task integration checklist

1. Build/package this helper as a **new** candidate, preserving the accepted
   runtime and its credentials/schedules for rollback.
2. Replace Pome's Itsyhome requirement and old webhook address in Connector UI
   with the built-in HomeKit service. The helper must run for home controls even
   when camera refresh is paused or cameras are hidden.
3. Relabel Camera URL/Token as shared Pome URL/Token. Retain the current private
   address/token; never rotate credentials as an incidental rename.
4. Health-check authenticated `/home/status` independently of camera capture
   support. Distinguish Home permission, Home loading, missing native API, and
   Tailscale reachability. Do not add another required app or public port.
5. Coordinate a reversible shared runtime test/install with the release owner.
   Do not install this watch candidate before its matching helper is running.
6. Verify real inventory/room/service UUID continuity, then authorized physical
   device tests, scenes, fan speed, blind repeat controls, sensors, camera
   capture, lifecycle, and original Time compatibility. Mock/build success
   is not physical acceptance or publication approval.

## Local validation

- Unsigned Catalyst build passed using local Xcode beta, isolated derived data
  `/tmp/pome-direct-homekit-build`. This is compile/link validation, not signed
  HomeKit runtime proof. No running Connector/helper was restarted.
- All existing JS regression files plus `tests/homekit.test.cjs` pass.
- `bash tests/run-homekit-tests.sh` compiles the **actual** HomeControl source
  against a test-only HomeKit module and verifies its routes/control behavior;
  also tests actual HTTP transport on an ephemeral isolated loopback port.
  The fake HomeKit module is not in the Xcode or PBW target.
- Clean Pebble SDK build passed for Basalt and Emery. Free watch heap remains
  7,351 and 85,607 bytes respectively.
- Candidate `dist/Pome-3.1.0-direct-homekit.pbw` SHA-256:
  `851ac0002d927c1e6fcadec1df41aad8db7aff4e84631aff6e1a895641e2b398`.
- Accepted `dist/Pome-3.0.1-camera-ccf176fa95ad.pbw` remains unchanged:
  `ccf176fa95ad06062ea78aae7d1759736aec79454f1b0a52faa0106b9d2a4f53`.
- Not yet integrated into the native Connector UI, installed, live-HomeKit
  tested, watch accepted, or published.

## Known compatibility boundaries

Itsyhome-specific aliases, hidden devices, favorites, Home Assistant-only entries,
and its own virtual groups are not imported. Pome still synthesizes All lights
per room itself. All Apple Home homes are visible, with duplicate-name controls
rejected rather than silently targeting one. A native home selector and migration
for any Itsyhome-specific customizations need separate follow-up if encountered.

Protocol compatibility was checked against the upstream Itsyhome CLI and its
public endpoint/action source; this backend is independently implemented using
Apple's HomeKit API, not vendored Itsyhome server code.
