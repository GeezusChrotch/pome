# Pome 3.1.5 watch test

- Reduced the preview to 14px on both watches. Slider bars now occupy 15px on Time and 45px on Time 2 (previously 7px); touch targets share the new layout.
- Removed the watch's dependency on a final HomeKit status message to release the live-color sender. Delivery to the phone now releases it; the phone holds one executing color operation and only the newest pending color. A room completes its sequential writes before the next color starts.
- This repairs an identified lost-status deadlock path, not a confirmed capture of the user's failure. Partial device errors and inventory failures release the phone queue; uncertain writes are not retried.
- Tested 200 live room gestures with dropped status notifications, partial failures, latest-only coalescing, and no concurrent writes. Full regression suite and Basalt/Emery SDK 4.33.1 build passed. Physical reliability acceptance remains pending.

Artifact: `dist/Pome-3.1.5-room-color-queue.pbw`

SHA256: `becfa23fb55c8f3715b89ca229caedf9b2756232172b60c5167882703a5ff48e`

Connector/runtime unchanged. Not published.

User-ready LAN retry installed successfully: session 68391, exit 0, `App install succeeded.` Physical slider and sustained room-color acceptance still pending.

2026-09-09: Connector owner relayed Josh's acceptance: "I think the watch test for pome is a success." Recorded as acceptance of the current Pome direct HomeKit watch test with Connector38, not verification of individual slider, sustained-color, or other specific test cases. No publication authorization or watch reinstall requested. No active watch test here requires Connector38 to remain held.
