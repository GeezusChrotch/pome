# Security

## Safe deployment

Pome 3.1.5's authenticated Connector controls real Apple Home accessories and
provides camera access. Keep its loopback service behind private Tailscale HTTPS.
Treat its bearer token as a house-control credential. Do not expose it with Tailscale Funnel,
router port forwarding, or an unauthenticated public reverse proxy.

Never publish real server URLs, tailnet names, tokens, or accessory inventories in
issues, logs, screenshots, commits, or pull requests.

Voice commands must resolve to one exact, reachable Apple Home target. Ambiguous matches
are rejected, and sensitive scene names require on-watch confirmation. Locks, garage
doors, security systems, and other unsupported sensitive services are deliberately
excluded from direct voice execution.

## Reporting a vulnerability

Please open a GitHub security advisory in this repository rather than a public
issue when a report could enable unauthorized home control or disclose private
home data. Include reproduction steps and the affected Pome version, but redact
all real endpoints and accessory names.
