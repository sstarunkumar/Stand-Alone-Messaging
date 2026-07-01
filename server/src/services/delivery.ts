/**
 * ACK-based message delivery with exponential-backoff retry.
 * Uses in-memory tracking — no Kafka needed for single-server testing.
 * Add Kafka + Redis-backed dedup when moving to production multi-server.
 */
import { Server } from 'socket.io';
import { Message } from '../models';

const ACK_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

interface PendingAck {
  timer: ReturnType<typeof setTimeout>;
  retries: number;
}

const pendingAcks = new Map<string, PendingAck>();

export function deliverToUser(io: Server, recipientUserId: string, message: { id: string }): void {
  let retries = 0;

  const attempt = () => {
    io.to(`user:${recipientUserId}`).emit('new-message', message);

    const delay = ACK_TIMEOUT_MS * Math.pow(2, retries);
    const timer = setTimeout(() => {
      pendingAcks.delete(message.id);
      if (retries < MAX_RETRIES) {
        retries++;
        attempt();
      }
      // If retries exhausted: message is in DB; client will fetch on reconnect
    }, delay);

    pendingAcks.set(message.id, { timer, retries });
  };

  attempt();
}

export async function handleMessageAck(messageId: string): Promise<void> {
  const pending = pendingAcks.get(messageId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingAcks.delete(messageId);
  }

  await Message.findByIdAndUpdate(messageId, { deliveredAt: new Date() });
}

export async function handleReadReceipt(messageId: string): Promise<void> {
  await Message.findByIdAndUpdate(messageId, { readAt: new Date() });
}

export function cleanupPendingAcks(): void {
  for (const { timer } of pendingAcks.values()) {
    clearTimeout(timer);
  }
  pendingAcks.clear();
}
