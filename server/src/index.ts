import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { verifyToken } from './middleware/auth';
import authRoutes from './routes/auth';
import caseRoutes from './routes/cases';
import { registerSocketHandlers } from './socket/handlers';
import { cleanupPendingAcks } from './services/delivery';
import { connectDb, disconnectDb } from './db';

const PORT = Number(process.env.PORT) || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// NOS may serve more than one frontend origin (customer portal, admin panel, ...) —
// accept a comma-separated allowlist rather than a single hardcoded origin.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGINS, methods: ['GET', 'POST'] },
  // Lets a client that drops for a short window (idle tab, brief network loss) resume
  // its rooms + any events broadcast while it was away, instead of starting cold.
  // Longer gaps fall through to the client's own resync-on-reconnect logic.
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json());
// Exposes the socket server to REST controllers that need to broadcast (e.g. bulk mark-as-read).
app.set('io', io);

// TEST-ONLY: issues a token for any userId/alias with no real auth check. Fine for the
// local test harness, but must never be reachable once a real caller (NOS) can mint its
// own JWTs with the shared secret — otherwise anyone can forge an identity.
if (IS_PRODUCTION) {
  console.log('[startup] /auth/token disabled (NODE_ENV=production) — mint JWTs with the shared JWT_SECRET instead');
} else {
  app.use('/auth', authRoutes);
}
app.use('/api/cases', caseRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error('No token provided'));
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    next(new Error('Invalid or expired token'));
    return;
  }

  socket.data.userId = user.userId;
  socket.data.role = user.role;
  next();
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

async function gracefulShutdown() {
  console.log('\nShutting down...');
  cleanupPendingAcks();
  await disconnectDb();
  httpServer.close(() => process.exit(0));
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function start(): Promise<void> {
  await connectDb();

  httpServer.listen(PORT, () => {
    console.log(`\n  NOS Messaging server  →  http://localhost:${PORT}`);
    console.log(`  Socket.IO ready`);
    console.log(`  Allowed origins      →  ${CLIENT_ORIGINS.join(', ')}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
