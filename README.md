# NOS Messaging — Case-Centric Real-Time Chat

Standalone, testable messaging plugin. Each case gets its own isolated chat room between a Customer and a Case Manager.

## Quick start

```bash
# 1. Install deps + create SQLite DB
npm run setup

# 2. Run server + test harness together
npm run dev
```

- **Server** → http://localhost:4000
- **Test harness** → http://localhost:5173

## Testing

Open http://localhost:5173. Two panels appear side by side.

**Default values are pre-filled** — just click **Connect** on both sides and start chatting.

### What to verify

| # | Test | Expected |
|---|---|---|
| 1 | Send message from Customer | Appears instantly on Case Manager side |
| 2 | Delivery receipt | Customer sees `✓` → `✓✓` (gray) when Case Manager receives |
| 3 | Read receipt | Click a received message → sender sees `✓✓` turn blue |
| 4 | Typing indicator | Start typing on one side → other side shows "typing…" |
| 5 | History on reconnect | Disconnect one panel, reconnect → full history loads |
| 6 | Isolation | Change caseId to `case_002` on both panels → separate room, no cross-bleed |
| 7 | Access control | Try joining `case_001` with a userId not in that case → connection blocked |

## Socket events

**Client → Server**
| Event | Payload |
|---|---|
| `join-case` | `caseId: string` |
| `leave-case` | `caseId: string` |
| `send-message` | `{ caseId, content, type?, tempId? }` |
| `message-ack` | `messageId: string` |
| `message-read` | `messageId: string` |
| `typing` | `{ caseId, isTyping }` |

**Server → Client**
| Event | Payload |
|---|---|
| `new-message` | `Message` object |
| `message-delivered` | `{ messageId, deliveredAt }` |
| `message-read` | `{ messageId, readAt }` |
| `user-typing` | `{ userId, isTyping }` |
| `error` | `{ code, message }` |

## REST API

```
POST   /auth/token                      ← test-only token issuer
POST   /api/cases                       ← register a case
GET    /api/cases                       ← list my cases
GET    /api/cases/:caseId/messages      ← paginated message history
PUT    /api/cases/:caseId/read          ← mark all as read
```

## NOS integration (when ready)

**3 changes only:**

### 1. Swap auth (server/src/middleware/auth.ts)
```ts
// Replace verifyToken with NOS's real JWT verify
export function verifyToken(token: string): AuthUser | null {
  return nosVerifyJwt(token); // returns { userId, role } or null
}
```

### 2. Swap database (server/.env + server/prisma/schema.prisma)
```env
DATABASE_URL="postgresql://user:pass@host/nos_db"
```
```prisma
datasource db {
  provider = "postgresql"   # was "sqlite"
  url      = env("DATABASE_URL")
}
```
Then run: `npx prisma migrate deploy`

### 3. Mount in NOS_Backend
```ts
import { mountMessaging } from 'nos-messaging-server';
mountMessaging(app, httpServer, { verifyToken: nosVerifyJwt });
```

## Scaling (production)

| Now | Production |
|---|---|
| SQLite | PostgreSQL (Neon) |
| In-memory presence | Redis |
| No rate limiting | Redis sliding window |
| Single server | Socket.IO Redis Adapter (multi-server) |
| Sync delivery | Kafka (durable, exactly-once) |
