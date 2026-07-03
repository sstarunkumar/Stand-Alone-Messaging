import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CaseChat, Message } from '../models';
import { toWireCaseChat, toWireMessage, loadReplySnapshots } from '../utils/wireFormat';

/**
 * Admin oversight — unlike getCases/getCaseMessages, these are NOT scoped to a
 * participant. Any authenticated ADMIN (see requireAdmin middleware) can list and
 * read every case chat, so they double as the intervention surface: an admin joins
 * the same case room over the socket and sends into it like a third participant.
 */
export async function listAllCaseChats(req: Request, res: Response): Promise<void> {
  const chats = await CaseChat.find({}).sort({ lastMessageAt: -1, createdAt: -1 });

  const data = await Promise.all(
    chats.map(async (chat) => {
      const [lastMessage, unreadCount] = await Promise.all([
        Message.findOne({ caseChatId: chat._id, isDeleted: false }).sort({ createdAt: -1 }),
        // Total outstanding-unread across BOTH parties (not scoped to "not sent by me" —
        // an admin isn't a conversation participant, so this is a pure oversight signal:
        // "how many messages in this thread haven't been read yet by whoever they're for").
        Message.countDocuments({ caseChatId: chat._id, readAt: null, isDeleted: false }),
      ]);
      const replyMap = lastMessage ? await loadReplySnapshots([lastMessage]) : new Map();
      return {
        ...toWireCaseChat(chat, unreadCount),
        messages: lastMessage
          ? [
              toWireMessage(
                lastMessage,
                chat.caseId.toString(),
                lastMessage.replyToMessageId ? (replyMap.get(lastMessage.replyToMessageId.toString()) ?? null) : null,
              ),
            ]
          : [],
      };
    }),
  );

  res.json({ data });
}

export async function getAnyCaseMessages(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  if (!Types.ObjectId.isValid(caseId)) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const caseChat = await CaseChat.findOne({ caseId });
  if (!caseChat) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  // No participant check — that's the point of this endpoint. No read-marking either:
  // an admin observing a thread must never flip the customer's or manager's read receipts.
  const messages = await Message.find({
    caseChatId: caseChat._id,
    isDeleted: false,
    ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  const ordered = messages.slice().reverse();
  const replyMap = await loadReplySnapshots(ordered);

  res.json({
    data: ordered.map((m) =>
      toWireMessage(m, caseId, m.replyToMessageId ? (replyMap.get(m.replyToMessageId.toString()) ?? null) : null),
    ),
    meta: {
      nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null,
    },
  });
}
