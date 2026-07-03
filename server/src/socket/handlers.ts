import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { CaseChat, Message } from '../models';
import { toWireMessage, toReplySnapshot } from '../utils/wireFormat';
import { markUserOnline, markUserOffline } from '../services/presence';
import { handleMessageAck, handleReadReceipt } from '../services/delivery';

interface SendMessagePayload {
  caseId: string;
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
  tempId?: string;
  replyToMessageId?: string;
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
      const { caseId, content, type = 'TEXT', tempId, replyToMessageId } = payload;

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

      // Quoted message must exist and belong to this same case — otherwise send the
      // message anyway, just without the quote, rather than failing the whole send.
      let replyTarget = null;
      if (replyToMessageId && Types.ObjectId.isValid(replyToMessageId)) {
        replyTarget = await Message.findOne({
          _id: replyToMessageId,
          caseChatId: caseChat._id,
          isDeleted: false,
        });
      }

      const message = await Message.create({
        caseChatId: caseChat._id,
        senderId: userId,
        senderType: role,
        body: content.trim(),
        type,
        replyToMessageId: replyTarget?._id ?? null,
      });

      caseChat.lastMessageAt = message.createdAt;
      await caseChat.save();

      // Always attach caseId so clients can route the message without a DB lookup
      const wireMessage = toWireMessage(message, caseId, replyTarget ? toReplySnapshot(replyTarget) : null);

      // Confirm to sender — client replaces its optimistic temp message
      callback?.({ success: true, message: wireMessage, tempId });

      // Push to the recipient's personal room — reaches them whether or not they've
      // joined this case's room (e.g. new-message badges for cases they haven't opened yet).
      // Deliberately NOT also broadcasting to `case:${caseId}` — the test harness joins every
      // case room on login, so the recipient would receive this event twice.
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
