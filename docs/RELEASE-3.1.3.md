# Pome 3.1.3 watch test

- Room-light commands wait 75ms instead of 700ms after each response. Writes remain sequential; native uncertain writes are not retried. Partial failures remain visible.
- Lights and All Lights share one menu: Toggle, brightness 25/50/75/100%, six configured colors, Custom Color.
- Fan toggle and four speed levels also share one menu. Switches remain toggle-only; blinds retain their existing controls.
- Custom Color drafts hue (1-degree or 15-degree steps, wrapping 0–359) and saturation (1% or 10% steps, clamped 0–100). Apply Color sends the draft to the selected device/group. Brightness is independently available on the parent menu. Last draft is retained during the app session; it is not a readback from the selected light. Back cancels without applying further edits.
- Actions and acknowledgements leave the device controls open.

Validation: complete JS/C regression suite passed; additional executable custom-range and asynchronous sequential-write tests passed. Clean SDK 4.33.1 Basalt and Emery build passed. Physical UX and faster group reliability still require watch acceptance.

Artifact: `dist/Pome-3.1.3-flat-controls.pbw`

SHA256: `90e28de595ea01e28bb08e62a73b8952107641e04d62202bfd0cd5e141684617`

Connector/helper unchanged. Not published.

Initial LAN installation attempt: connection refused, exit 1. Candidate is built, not installed; awaiting phone foreground for retry.

Subsequent user-requested LAN retry succeeded: session 72400, exit 0, `App install succeeded.` Exact frozen 3.1.3 artifact above installed. Physical menu/custom-color and faster room-light reliability acceptance remains pending. Not published.
