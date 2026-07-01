import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CaseChat, Message } from '../models';
import { toWireCaseChat, toWireMessage } from '../utils/wireFormat';

export async function registerCase(req: Request, res: Response): Promise<void> {
  const { caseId, customerId, caseManagerId } = req.body as {
    caseId?: string;
    customerId?: string;
    caseManagerId?: string;
  };

  if (!caseId || !customerId || !caseManagerId) {
    res.status(400).json({ error: 'caseId, customerId, and caseManagerId are required' });
    return;
  }

  if (![caseId, customerId, caseManagerId].every(Types.ObjectId.isValid)) {
    res.status(400).json({ error: 'caseId, customerId, and caseManagerId must be valid ids' });
    return;
  }

  const existing = await CaseChat.findOne({ caseId });
  if (existing) {
    res.json({ data: toWireCaseChat(existing) });
    return;
  }

  const caseChat = await CaseChat.create({ caseId, customerId, caseManagerId });
  res.status(201).json({ data: toWireCaseChat(caseChat) });
}

export async function getCases(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const chats = await CaseChat.find({
    $or: [{ customerId: userId }, { caseManagerId: userId }],
  }).sort({ createdAt: -1 });

  const data = await Promise.all(
    chats.map(async (chat) => {
      const lastMessage = await Message.findOne({ caseChatId: chat._id, isDeleted: false }).sort({ createdAt: -1 });
      return {
        ...toWireCaseChat(chat),
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

  await Message.updateMany(
    { caseChatId: caseChat._id, senderId: { $ne: userId }, readAt: null },
    { readAt: new Date() },
  );

  res.json({ data: { success: true } });
}
