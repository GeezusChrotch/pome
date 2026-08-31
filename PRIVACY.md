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

Pome's maintainers do not receive accessory names, sensor values, server URLs, or
control activity.
