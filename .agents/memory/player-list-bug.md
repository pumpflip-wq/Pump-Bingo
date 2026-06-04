---
name: Player list count vs display mismatch
description: The participant count and the visible participants list must use the same tx_signature IS NOT NULL filter or they get out of sync.
---

## Rule
`getRoundParticipantsCount` in `server/storage.ts` must filter `AND tx_signature IS NOT NULL`, matching the SQL query in the `/api/rounds/:id` route that builds the participants list.

**Why:** Without this filter, ghost participants (null tx_signature, e.g. from a failed/incomplete paid join) inflate the count. The game engine uses the count to decide when to start a round, so it could start with fewer visible players than expected — and the frontend player list shows 0 while the counter says 1+.

**How to apply:** Any time you query participant counts for game-state decisions, always add the `tx_signature IS NOT NULL` guard. The join route also now rejects paid-round joins that arrive without a txSignature to prevent null-signature records from being created in the first place.
