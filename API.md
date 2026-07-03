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

`userId` must be the same id NOS uses internally for that user (see §4, ID format).
`role` must be exactly `CUSTOMER` or `CASE_MANAGER`.

## 2. Provisioning a case chat

Before two people can message about a case, register the pairing once:

```
POST /api/cases
Authorization: Bearer <token>
Content-Type: application/json

{ "caseId": "<Case._id>", "customerId": "<User._id>", "caseManagerId": "<AdminUser._id>" }
```

Idempotent — call it when the case is created, or lazily the first time someone opens
the chat. Returns the existing chat unchanged if one already exists for that `caseId`.

## 3. REST reference

All routes below require `Authorization: Bearer <token>`.

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| `POST` | `/api/cases` | `{ caseId, customerId, caseManagerId }` | `{ data: CaseChat }` |
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

## 4. Socket.IO reference

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

## 5. Environment / deploy checklist for whoever runs this service

| Var | Required | Notes |
|---|---|---|
| `JWT_SECRET` | **Yes in production** | Must match the value NOS signs tokens with. Server refuses to start in production without it. |
| `MONGODB_URL` | Yes | This service's own database — never shared with NOS. |
| `CLIENT_ORIGIN` | Yes | Comma-separated list of allowed frontend origins, e.g. `https://portal.nos.com,https://admin.nos.com`. |
| `PORT` | No | Defaults to `4000`. |
| `NODE_ENV=production` | Yes, in production | Disables the test-only `/auth/token` route and enforces `JWT_SECRET`. |

## 6. Open item for the NOS team to confirm

`caseId` / `customerId` / `caseManagerId` are stored and validated as Mongo
`ObjectId`s. This works as-is if NOS's `Case`, `User`, and `AdminUser` primary keys are
Mongo ObjectIds. If NOS uses a different ID scheme, the `CaseChat` schema
(`server/src/models/CaseChat.ts`) needs those three fields changed from
`Schema.Types.ObjectId` to plain strings before integration.
