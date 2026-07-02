import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Case, CaseChat, Message } from '../models';
import { toWireCaseChat, toWireMessage } from '../utils/wireFormat';
import { resolveTestId } from '../testAliases';

export async function registerCase(req: Request, res: Response): Promise<void> {
  const { caseId: rawCaseId, customerId: rawCustomerId, caseManagerId: rawCaseManagerId } = req.body as {
    caseId?: string;
    customerId?: string;
    caseManagerId?: string;
  };

  if (!rawCaseId || !rawCustomerId || !rawCaseManagerId) {
    res.status(400).json({ error: 'caseId, customerId, and caseManagerId are required' });
    return;
  }

  // Test aliases (case1, cust1, cm1, ...) resolve to their real seeded ids.
  const caseId = resolveTestId(rawCaseId);
  const customerId = resolveTestId(rawCustomerId);
  const caseManagerId = resolveTestId(rawCaseManagerId);

  if (![caseId, customerId, caseManagerId].every(Types.ObjectId.isValid)) {
    res.status(400).json({ error: 'caseId, customerId, and caseManagerId must be valid ids or known aliases' });
    return;
  }

  const caseDoc = await Case.findById(caseId, 'caseNumber');

  const existing = await CaseChat.findOne({ caseId });
  if (existing) {
    res.json({ data: toWireCaseChat(existing, caseDoc?.caseNumber) });
    return;
  }

  const caseChat = await CaseChat.create({ caseId, customerId, caseManagerId });
  res.status(201).json({ data: toWireCaseChat(caseChat, caseDoc?.caseNumber) });
}

export async function getCases(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const chats = await CaseChat.find({
    $or: [{ customerId: userId }, { caseManagerId: userId }],
  }).sort({ lastMessageAt: -1, createdAt: -1 });

  const casesById = new Map(
    (await Case.find({ _id: { $in: chats.map((c) => c.caseId) } }, 'caseNumber')).map((c) => [
      c._id.toString(),
      c.caseNumber,
    ]),
  );

  const data = await Promise.all(
    chats.map(async (chat) => {
      const lastMessage = await Message.findOne({ caseChatId: chat._id, isDeleted: false }).sort({ createdAt: -1 });
      return {
        ...toWireCaseChat(chat, casesById.get(chat.caseId.toString())),
        messages: lastMessage ? [toWireMessage(lastMessage, chat.caseId.toString())] : [],
      };
    }),
  );

  res.json({ data });
}

export async function getCaseMessages(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const userId = req.user!.userId;
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

  if (caseChat.customerId.toString() !== userId && caseChat.caseManagerId.toString() !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const messages = await Message.find({
    caseChatId: caseChat._id,
    isDeleted: false,
    ...(cursor ? { createdAt: { $lt: new Date(cursor) } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(limit);

  const ordered = messages.slice().reverse();

  res.json({
    data: ordered.map((m) => toWireMessage(m, caseId)),
    meta: {
      nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null,
    },
  });
}

export async function markCaseRead(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const userId = req.user!.userId;

  if (!Types.ObjectId.isValid(caseId)) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const caseChat = await CaseChat.findOne({ caseId });
  if (!caseChat) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  if (caseChat.customerId.toString() !== userId && caseChat.caseManagerId.toString() !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const readAt = new Date();
  await Message.updateMany(
    { caseChatId: caseChat._id, senderId: { $ne: userId }, readAt: null },
    { readAt },
  );

  // Notify whoever sent those messages that they've now been read, so their
  // UI can flip to the "read" checkmark without polling.
  const otherPartyId =
    caseChat.customerId.toString() === userId ? caseChat.caseManagerId.toString() : caseChat.customerId.toString();
  const io = req.app.get('io') as import('socket.io').Server | undefined;
  io?.to(`user:${otherPartyId}`).emit('case-read', { caseId, readBy: userId, readAt: readAt.toISOString() });

  res.json({ data: { success: true } });
}
