import { Server, Socket } from 'socket.io';
import { prisma } from '../db';
import { markUserOnline, markUserOffline } from '../services/presence';
import { handleMessageAck, handleReadReceipt } from '../services/delivery';

interface SendMessagePayload {
  caseId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
  tempId?: string;
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  const { userId, role } = socket.data as { userId: string; role: string };

  socket.join(`user:${userId}`);
  markUserOnline(userId, socket.id);

  console.log(`[ws] + ${userId} (${role}) connected`);

  socket.on('join-case', async (caseId: string, callback?: (res: unknown) => void) => {
    try {
      const caseChat = await prisma.caseChat.findUnique({ where: { caseId } });

      if (!caseChat) {
        socket.emit('error', { code: 'CASE_NOT_FOUND', message: 'Case does not exist' });
        callback?.({ error: 'Case not found' });
        return;
      }

      if (caseChat.customerId !== userId && caseChat.caseManagerId !== userId) {
        socket.emit('error', { code: 'ACCESS_DENIED', message: 'You are not a participant in this case' });
        callback?.({ error: 'Access denied' });
        return;
      }

      socket.join(`case:${caseId}`);
      console.log(`[ws]   ${userId} joined case:${caseId}`);
      callback?.({ success: true });
    } catch (err) {
      console.error('[ws] join-case error:', err);
      callback?.({ error: 'Server error' });
    }
  });

  socket.on('leave-case', (caseId: string) => {
    socket.leave(`case:${caseId}`);
  });

  socket.on('send-message', async (payload: SendMessagePayload, callback?: (res: unknown) => void) => {
    try {
      const { caseId, content, type = 'TEXT', tempId } = payload;

      if (!caseId || !content?.trim()) {
        callback?.({ error: 'caseId and content are required' });
        return;
      }

      const caseChat = await prisma.caseChat.findUnique({ where: { caseId } });

      if (!caseChat) {
        callback?.({ error: 'Case not found' });
        return;
      }

      if (caseChat.customerId !== userId && caseChat.caseManagerId !== userId) {
        callback?.({ error: 'Access denied' });
        return;
      }

      const message = await prisma.message.create({
        data: {
          caseChatId: caseChat.id,
          senderId: userId,
          senderRole: role,
          content: content.trim(),
          type,
        },
      });

      // Always attach caseId so clients can route the message without a DB lookup
      const payload = { ...message, caseId };

      // Confirm to sender — client replaces its optimistic temp message
      callback?.({ success: true, message: payload, tempId });

      // Broadcast to all others in the case room (recipient sees it in real-time)
      socket.to(`case:${caseId}`).emit('new-message', payload);

      // Also push to recipient's personal room so notifications land even if they're not in the case view
      const recipientId = caseChat.customerId === userId ? caseChat.caseManagerId : caseChat.customerId;
      socket.to(`user:${recipientId}`).emit('new-message', payload);

      console.log(`[ws]   msg ${message.id} in case:${caseId} from ${userId}`);
    } catch (err) {
      console.error('[ws] send-message error:', err);
      callback?.({ error: 'Failed to send message' });
    }
  });

  socket.on('message-ack', async (messageId: string) => {
    try {
      await handleMessageAck(messageId);
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (message) {
        io.to(`user:${message.senderId}`).emit('message-delivered', {
          messageId,
          deliveredAt: message.deliveredAt,
        });
      }
    } catch (err) {
      console.error('[ws] message-ack error:', err);
    }
  });

  socket.on('message-read', async (messageId: string) => {
    try {
      await handleReadReceipt(messageId);
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (message) {
        io.to(`user:${message.senderId}`).emit('message-read', {
          messageId,
          readAt: message.readAt,
        });
      }
    } catch (err) {
      console.error('[ws] message-read error:', err);
    }
  });

  socket.on('typing', (payload: { caseId: string; isTyping: boolean }) => {
    socket.to(`case:${payload.caseId}`).emit('user-typing', {
      userId,
      caseId: payload.caseId,
      isTyping: payload.isTyping,
    });
  });

  socket.on('disconnect', () => {
    const fullyOffline = markUserOffline(userId, socket.id);
    if (fullyOffline) {
      console.log(`[ws] - ${userId} offline`);
    }
  });
}
