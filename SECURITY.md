# Security

## Safe deployment

Itsyhome's webhook server controls real home accessories. Keep it on a trusted LAN
or behind a private VPN such as Tailscale. Do not expose it with Tailscale Funnel,
router port forwarding, or an unauthenticated public reverse proxy.

Never publish real server URLs, tailnet names, tokens, or accessory inventories in
issues, logs, screenshots, commits, or pull requests.

Voice commands must resolve to one exact, reachable Itsyhome target and require
on-watch confirmation. Locks, garage doors, security systems, and other unsupported
sensitive services are deliberately excluded from voice execution.

## Reporting a vulnerability

Please open a GitHub security advisory in this repository rather than a public
issue when a report could enable unauthorized home control or disclose private
home data. Include reproduction steps and the affected Pome version, but redact
all real endpoints and accessory names.
