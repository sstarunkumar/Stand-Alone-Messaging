# NOS Messaging — Integration Guide

Case-centric messaging as a standalone service with its own MongoDB. NOS never touches
that database directly — everything goes through the REST API and Socket.IO contract
below.

## 1. Authentication

There is **no login endpoint for NOS to call**. NOS's backend and this service share a
signing secret (`JWT_SECRET`, same value in both environments) and NOS mints the token
itself:

```js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: nosUser._id.toString(), role: nosUser.isCaseManager ? 'CASE_MANAGER' : 'CUSTOMER' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' },
);
```

Hand that token to the frontend. It authenticates both transports:

| Transport | How |
|---|---|
| REST | `Authorization: Bearer <token>` header |
| Socket.IO | `io(MESSAGING_URL, { auth: { token } })` |

`userId` must be the same id NOS uses internally for that user (see §7, ID format).
`role` must be exactly `CUSTOMER`, `CASE_MANAGER`, or `ADMIN`.

**`ADMIN` is an oversight role, not a third case participant.** It's not tied to any
specific `caseId` — an admin token can list and read *every* case chat in the system
and send into any of them (see §4, Admin). Mint it for whoever in NOS has a
support/oversight permission, not per-case.

## 2. Provisioning a case chat

Before two people can message about a case, register the pairing. **Requires a token
with `role: 'ADMIN'`** — this is a backend/system action, not something a customer's or
manager's own token can do (see "who signs this call" in §3):

```
POST /api/cases
Authorization: Bearer <admin/system token>
Content-Type: application/json

{
  "caseId": "<Case._id>",
  "customerId": "<User._id>",
  "caseManagerId": "<AdminUser._id>",
  "caseNumber": "CASE-1234"        // optional — a display label, stored as-is
}
```

Idempotent, and safe to call again on reassignment: if a `CaseChat` already exists for
that `caseId`, this call **updates** `customerId`, `caseManagerId`, and `caseNumber` (if
provided) on the existing chat rather than leaving them stale — so calling it again
after NOS reassigns a case to a different manager correctly moves the chat over.

## 3. End-to-end lifecycle: signup → case → assignment → chat

This walks through exactly where the messaging service plugs into the flow the other
part of the team owns. Steps 1–2 are entirely inside NOS; the messaging service isn't
called yet.

**Step 1 — Customer signs up / logs in.** Pure NOS. Nothing to call here.

**Step 2 — Customer creates a case.** Pure NOS. `Case` is created with no assigned
manager yet. Still nothing to call — **do not** provision a chat at this point, since
there's no case manager to pair the customer with.

**Step 3 — Case gets assigned a case manager.** This is the trigger. The instant NOS
commits the assignment (`case.assignedManagerId = managerId`) to its own database,
have that same backend code call the messaging service:

```
POST https://messaging.internal/api/cases
Authorization: Bearer <token>          (see "who signs this call" below)
Content-Type: application/json

{
  "caseId": "665f1b2e4a1c9e0012a3b456",
  "customerId": "665f1a004a1c9e0012a3b111",
  "caseManagerId": "665f1a1a4a1c9e0012a3b222",
  "caseNumber": "CASE-2026-0456"
}
```

Response (`201` the first time, `200` on any later call for the same `caseId` —
including a later call with a *different* `caseManagerId`, which updates the pairing):

```json
{
  "data": {
    "id": "665f1b304a1c9e0012a3b789",
    "caseId": "665f1b2e4a1c9e0012a3b456",
    "caseNumber": "CASE-2026-0456",
    "customerId": "665f1a004a1c9e0012a3b111",
    "caseManagerId": "665f1a1a4a1c9e0012a3b222",
    "lastMessageAt": null,
    "unreadCount": 0,
    "createdAt": "2026-07-04T09:12:03.441Z"
  }
}
```

**Who signs this call:** it's backend-to-backend (NOS's server calling the messaging
server directly, no end user involved), so mint it with a fixed system identity rather
than any particular customer's or manager's token, e.g.:

```js
const systemToken = jwt.sign({ userId: 'nos-system', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '5m' });
```

**On `caseNumber`:** this service has its own database, so it has no way to look up a
label for NOS's real `Case` documents — pass whatever you want displayed (case number,
short title, etc.) and it's stored as-is on the chat. Omit it and it stays `null`.
Send it again with an updated value any time the label should change (e.g. NOS renames
or re-numbers the case) — same idempotent `POST /api/cases` call.

**Step 4 — "Continue using the chat application."** From here on it's the same
contract as everything else in this doc, scoped to the one `caseId` NOS already knows
about:

1. Whichever of the customer or case manager opens the case detail page, NOS mints
   *their* personal token (§1) and hands it to the frontend.
2. Frontend loads history: `GET /api/cases/665f1b2e4a1c9e0012a3b456/messages` →
   `{ data: Message[], meta: { nextCursor } }` (empty array on a brand new chat).
3. Frontend opens the socket with that token, emits `join-case` with the same
   `caseId`, then sends/receives via `send-message` / `new-message` as documented in
   §6. Nothing case-assignment-specific from here — it's just "using the chat."

## 4. REST reference

All routes below require `Authorization: Bearer <token>`.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| `POST` | `/api/cases` | `{ caseId, customerId, caseManagerId, caseNumber? }` — **ADMIN token only** | `{ data: CaseChat }` — creates on first call, updates the pairing on later calls (reassignment) |
| `GET` | `/api/cases` | — | `{ data: CaseChat[] }` — every case chat the caller is a party to, each with its last message + unread count, sorted by recent activity |
| `GET` | `/api/cases/:caseId/messages` | `?cursor=<ISO date>&limit=<n, max 100>` | `{ data: Message[], meta: { nextCursor } }` — page of history, oldest→newest; pass `nextCursor` back as `cursor` to load older messages |
| `PUT` | `/api/cases/:caseId/read` | — | `{ data: { success: true } }` — marks all of the other party's messages read and notifies them over the socket (`case-read`) |

**CaseChat shape:**
```ts
{ id, caseId, caseNumber, customerId, caseManagerId, lastMessageAt, unreadCount, createdAt, messages: Message[] }
```

**Message shape:**
```ts
{
  id, caseChatId, caseId, senderId, senderRole, content, type,
  deliveredAt: string | null,
  readAt: string | null,
  createdAt,
  replyTo: { id, senderId, senderRole, content } | null,
}
```

## 5. Admin (oversight + intervention)

Requires a token with `role: 'ADMIN'`. Any other role gets `403` from these routes.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| `GET` | `/api/admin/cases` | — | `{ data: CaseChat[] }` — **every** case chat in the system, not just ones the admin is a party to. `unreadCount` here is the total outstanding-unread across both parties (an oversight signal), not "unread by the admin". |
| `GET` | `/api/admin/cases/:caseId/messages` | `?cursor&limit` | `{ data: Message[], meta: { nextCursor } }` — full history for any case, no participant check. Never call `message-ack`/`message-read` for messages fetched this way — an admin just observing a thread must not flip the customer's or manager's read receipts. |

**Intervening** (sending as admin) reuses the same `send-message` socket event as
everyone else — no separate endpoint. The server recognizes the sender's role is
`ADMIN` and fans the message out to *both* the customer and the case manager (instead
of "the other of the two", which is what happens for a normal 2-party send). Before
sending, call `join-case` for that `caseId` as usual; admins additionally join a
private `admin-case:<caseId>` room so they receive live `new-message` events for a
case they're only observing (not one they authored into), without that broadcast ever
reaching the two real participants twice.

## 6. Socket.IO reference

Default namespace. Connect with `{ auth: { token } }` as shown above.

**Client → server**

| Event | Payload | Notes |
|---|---|---|
| `join-case` | `caseId, callback?` | Join a case's room to receive `user-typing` for it. Call for every case chat on login. |
| `leave-case` | `caseId` | |
| `send-message` | `{ caseId, content, type?, tempId?, replyToMessageId? }, callback` | `callback` receives `{ success, message, tempId }` or `{ error }` |
| `message-ack` | `messageId` | Call when a `new-message` arrives, to flip it to "delivered" for the sender |
| `message-read` | `messageId` | Call when the recipient actually views that message |
| `typing` | `{ caseId, isTyping }` | |

**Server → client**

| Event | Payload | Fires when |
|---|---|---|
| `new-message` | `Message` | Someone sent a message in a case you're a party to |
| `message-delivered` | `{ messageId, deliveredAt }` | The recipient's client acked your message |
| `message-read` | `{ messageId, readAt }` | The recipient read your message |
| `case-read` | `{ caseId, readBy, readAt }` | The other party bulk-read the case (via `PUT /read`) |
| `user-typing` | `{ userId, caseId, isTyping }` | Someone in the case room is typing |
| `error` | `{ code, message }` | e.g. `CASE_NOT_FOUND`, `ACCESS_DENIED` |

Reconnects are handled for you: the client should just let Socket.IO's built-in
reconnection run and re-emit `join-case` for each case once `connect` fires again. See
[client/src/components/UserPanel.tsx](client/src/components/UserPanel.tsx) for a
reference implementation of resync-on-reconnect.

## 7. Environment / deploy checklist for whoever runs this service

| Var | Required | Notes |
|---|---|---|
| `JWT_SECRET` | **Yes in production** | Must match the value NOS signs tokens with. Server refuses to start in production without it. |
| `MONGODB_URL` | Yes | This service's own database — never shared with NOS. |
| `CLIENT_ORIGIN` | Yes | Comma-separated list of allowed frontend origins, e.g. `https://portal.nos.com,https://admin.nos.com`. |
| `PORT` | No | Defaults to `4000`. |
| `NODE_ENV=production` | Yes, in production | Disables the test-only `/auth/token` route and enforces `JWT_SECRET`. |

## 8. Open item for the NOS team to confirm

**ID format.** `caseId` / `customerId` / `caseManagerId` are stored and validated as
Mongo `ObjectId`s. This works as-is if NOS's `Case`, `User`, and `AdminUser` primary
keys are Mongo ObjectIds. If NOS uses a different ID scheme, the `CaseChat` schema
(`server/src/models/CaseChat.ts`) needs those three fields changed from
`Schema.Types.ObjectId` to plain strings before integration.

*(Previously listed here: reassignment support, restricting provisioning to an
admin/system token, and denormalizing `caseNumber` onto the chat — all three are now
implemented as described in §2 and §3.)*
