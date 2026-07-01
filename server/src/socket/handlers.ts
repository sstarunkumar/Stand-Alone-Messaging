import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { CaseChat, Message } from '../models';
import { toWireMessage } from '../utils/wireFormat';
import { markUserOnline, markUserOffline } from '../services/presence';
import { handleMessageAck, handleReadReceipt } from '../services/delivery';

interface SendMessagePayload {
  caseId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
  tempId?: string;
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  const { userId, role } = socket.data as { userId: string; role: 'CUSTOMER' | 'CASE_MANAGER' };

  socket.join(`user:${userId}`);
  markUserOnline(userId, socket.id);

  console.log(`[ws] + ${userId} (${role}) connected`);

  socket.on('join-case', async (caseId: string, callback?: (res: unknown) => void) => {
    try {
      if (!Types.ObjectId.isValid(caseId)) {
        callback?.({ error: 'Case not found' });
        return;
      }

      const caseChat = await CaseChat.findOne({ caseId });

      if (!caseChat) {
        socket.emit('error', { code: 'CASE_NOT_FOUND', message: 'Case does not exist' });
        callback?.({ error: 'Case not found' });
        return;
      }

      if (caseChat.customerId.toString() !== userId && caseChat.caseManagerId.toString() !== userId) {
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

      if (!caseId || !content?.trim() || !Types.ObjectId.isValid(caseId)) {
        callback?.({ error: 'caseId and content are required' });
        return;
      }

      const caseChat = await CaseChat.findOne({ caseId });

      if (!caseChat) {
        callback?.({ error: 'Case not found' });
        return;
      }

      if (caseChat.customerId.toString() !== userId && caseChat.caseManagerId.toString() !== userId) {
        callback?.({ error: 'Access denied' });
        return;
      }

      const message = await Message.create({
        caseChatId: caseChat._id,
        senderId: userId,
        senderType: role,
        body: content.trim(),
        type,
      });

      // Always attach caseId so clients can route the message without a DB lookup
      const wireMessage = toWireMessage(message, caseId);

      // Confirm to sender — client replaces its optimistic temp message
      callback?.({ success: true, message: wireMessage, tempId });

      // Broadcast to all others in the case room (recipient sees it in real-time)
      socket.to(`case:${caseId}`).emit('new-message', wireMessage);

      // Also push to recipient's personal room so notifications land even if they're not in the case view
      const recipientId =
        caseChat.customerId.toString() === userId ? caseChat.caseManagerId.toString() : caseChat.customerId.toString();
      socket.to(`user:${recipientId}`).emit('new-message', wireMessage);

      console.log(`[ws]   msg ${message._id.toString()} in case:${caseId} from ${userId}`);
    } catch (err) {
      console.error('[ws] send-message error:', err);
      callback?.({ error: 'Failed to send message' });
    }
  });

  socket.on('message-ack', async (messageId: string) => {
    try {
      await handleMessageAck(messageId);
      const message = await Message.findById(messageId);
      if (message) {
        io.to(`user:${message.senderId.toString()}`).emit('message-delivered', {
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
      const message = await Message.findById(messageId);
      if (message) {
        io.to(`user:${message.senderId.toString()}`).emit('message-read', {
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
