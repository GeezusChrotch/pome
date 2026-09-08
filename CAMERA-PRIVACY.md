# Camera test privacy and release checklist

Camera support is an unreleased Pome test using a separate authorized Mac helper.
The integrated test currently enables cameras on Time 2 only. Original Time
retains its existing Pome controls; integrated-camera memory work is not complete.

## What is captured and retained

Only enabled HomeKit cameras are requested. New cameras default to on demand;
users can hide cameras or choose refresh intervals independently. Battery/solar
cameras should normally use on demand or at least15 minutes. Manual Capture now
explicitly wakes the selected camera even when its periodic refresh is disabled.
Manual capture opens a short HomeKit live stream on the Mac, requests muted audio,
renders one still, then stops the stream on success, failure, or a 25-second job
timeout. No audio/video recording or video transfer to the watch is performed.
This uses more battery than reading an existing snapshot. Scheduled captures
still use HomeKit's snapshot API at the saved intervals; some cameras may return
old snapshot pixels despite a new snapshot timestamp. Capture now does not fall
back to those snapshots if its live connection fails.

The helper retains the nine newest successful snapshots per enabled camera in
memory, newest first. Each snapshot has a stable ID and capture timestamp and
cropped source image and watch-ready processing variants. Natural is prepared
first; High contrast and Original are generated from that in-memory source only
when selected, without waking the camera. New success evicts the
oldest entry. Failed captures do not replace good history. Hiding a camera
clears its history. Quitting the helper clears all cache images. There is no
time-based expiry: paused/on-demand images remain until eviction, hiding or quit.
The watch camera menu offers Capture now followed by up to nine saved images.
Selecting history does not request a new camera capture. An evicted selection
reports expiration rather than silently displaying a different image.

The current export implementation captures only the helper's own titled window
through ScreenCaptureKit's current-process API, then crops the camera region.
It does not capture the desktop or other apps. This implementation detail must
be disclosed before public release; HomeKit permission is required. Images may
be visible in the helper preview and on an unlocked paired watch or phone.

## Transport and access

Camera data travels Mac → authenticated private HTTPS/Tailscale → paired iPhone
→ watch only when selected. Pome adds no cloud image storage, image analytics
or third-party image-processing upload. HomeKit, camera manufacturers, OS
memory/caching, device backups and Tailscale have separate privacy policies.
Memory-only retention is not a promise of forensic secure deletion.

The helper listens on loopback only, authenticates every inventory/history/frame
or settings request, and uses no-store responses. Do not use Funnel or expose
this service publicly. Someone with the token and authorized network access can
view enabled cameras and change capture schedules. Protect the Mac, phone and
watch, and revoke/rotate credentials if access is compromised.

The local test PBW embeds a private token. Never publish/share that artifact,
its JavaScript source map, private connection files, or household screenshots.
The repository contains an empty pairing placeholder, not a user's credential.
Pairing/token rotation and user-facing setup must be completed before release.

## Before release

- Explain capture scope, nine-image retention, battery impact, own-window export,
  private network requirements and access risks on the store page and setup guide.
- Verify hide/clear, failed manual capture, eviction, credential rejection,
  locked/sleeping Mac behavior and physical watch navigation/settings.
- Complete general-user pairing without bundled credentials; verify clean public
  artifacts and consent-based camera enablement. No automatic public exposure.
- Keep build, Mac install, watch install, physical acceptance and publication
  separate. This test does not authorize publication.
