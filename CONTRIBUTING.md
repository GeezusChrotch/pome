# Contributing to Pome

Thanks for helping make Apple Home control on Pebble better.

## Before opening a pull request

1. Create a focused branch from `main`.
2. Keep full Itsyhome device names intact for API commands; shorten names only in
   presentation code.
3. Keep sensors read-only and avoid adding lock, garage, gate, alarm, or security
   controls without explicit confirmation and state-aware behavior.
4. Never include real server URLs, tailnet names, tokens, or accessory inventories.
5. Run:

   ```sh
   node tests/group-control.test.js
   pebble clean
   pebble build
   ```

6. Check both `basalt` and `emery` when changing layout or navigation.

Please describe the behavior change, testing performed, and any compatibility or
security implications in the pull request.
