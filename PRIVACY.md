# Privacy

Pome has no user account, analytics, advertising, hosted backend, or developer-run
cloud service.

The paired phone stores these settings locally for Pome:

- the user-entered Itsyhome server URL
- enabled menu sections
- six selected light colors

When Pome is used, PebbleKit JS sends requests directly from the paired phone to
the configured Itsyhome webhook server. If the user chooses Tailscale, that traffic
travels through the user's private tailnet under Tailscale's own policies. Itsyhome
and Apple Home are separate products with their own privacy practices.

When the user selects Voice, Pebble's native dictation system sends microphone audio
through the transcription service configured in the Pebble mobile app. Pome does not
receive or store that audio; it receives the accepted text transcript, holds the
parsed command only in memory while resolving it, and sends the resulting request only
to the user's configured Itsyhome server.

Pome's maintainers do not receive accessory names, sensor values, server URLs, or
control activity.
