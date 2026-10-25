# ROTK v2.7.8 — AI Battle Report & Inbox Fix

- Server-side AI attacks against human-controlled cities now flag the resulting battle as unread, including successful captures (uses the defender owner before battle).
- Client detects unread AI reports when server snapshots arrive and queues defender-facing popup notifications.
- Battle Inbox report rows use delegated click handling, enabling reports to open reliably.
- Popup queue waits for the active dialog to close instead of overwriting it.
- No combat damage or economic formulas changed.

Validation: node --check of browser script and server.js; ZIP integrity. Browser multiplayer end-to-end not run.
