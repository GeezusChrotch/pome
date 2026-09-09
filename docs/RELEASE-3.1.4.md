# Pome 3.1.4 watch test

- Light/group brightness labels are simply 25%, 50%, 75%, 100%.
- Custom Color opens a dedicated visual picker, with a color swatch and hue/saturation bars. Up/Down adjusts by one; holding adjusts by five. Select alternates hue/saturation. Time 2 supports touch adjustment on the bars.
- Changes send live, at most one command in flight with a 200ms throttle. While awaiting acknowledgement, only the newest draft is retained. Room commands still finish sequentially before the next draft is sent. There is no Apply step.
- Back exits, discarding unsent changes; an already-sent command may finish. Transport errors clear the pending draft rather than retrying an uncertain write.
- Preview uses the watch palette; light hue remains full 0–359 and saturation 0–100. Last draft is session-local, not a device-state readback.

Full regression suite and additional live-picker C tests passed. Basalt/Emery SDK 4.33.1 build passed. Hardware UX/reliability acceptance pending. Connector unchanged; not published.

Artifact: `dist/Pome-3.1.4-live-color.pbw`

SHA256: `7c6c9192ada618bee88f072923caad39034753f3ddbe90da9a7c643827e49a39`

Initial LAN install refused, exit 1. Not installed; waiting for phone developer connection.

Later user-requested retry succeeded: session 67638, exit 0, `App install succeeded.` Frozen 3.1.4 installed on watch. Physical picker acceptance pending; not published.
