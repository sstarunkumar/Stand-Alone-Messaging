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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/auth', authRoutes);
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
    console.log(`  Test harness        →  http://localhost:5173\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
