import { Request, Response } from 'express';
import { prisma } from '../db';

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

  const existing = await prisma.caseChat.findUnique({ where: { caseId } });
  if (existing) {
    res.json({ data: existing });
    return;
  }

  const caseChat = await prisma.caseChat.create({
    data: { caseId, customerId, caseManagerId },
  });

  res.status(201).json({ data: caseChat });
}

export async function getCases(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const cases = await prisma.caseChat.findMany({
    where: {
      OR: [{ customerId: userId }, { caseManagerId: userId }],
    },
    include: {
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Attach caseId to each message so clients can route without a lookup
  const data = cases.map(c => ({
    ...c,
    messages: c.messages.map(m => ({ ...m, caseId: c.caseId })),
  }));

  res.json({ data });
}

export async function getCaseMessages(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const userId = req.user!.userId;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const caseChat = await prisma.caseChat.findUnique({ where: { caseId } });
  if (!caseChat) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  if (caseChat.customerId !== userId && caseChat.caseManagerId !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: {
      caseChatId: caseChat.id,
      isDeleted: false,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json({
    data: messages.reverse().map(m => ({ ...m, caseId })),
    meta: {
      nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null,
    },
  });
}

export async function markCaseRead(req: Request, res: Response): Promise<void> {
  const { caseId } = req.params;
  const userId = req.user!.userId;

  const caseChat = await prisma.caseChat.findUnique({ where: { caseId } });
  if (!caseChat) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  if (caseChat.customerId !== userId && caseChat.caseManagerId !== userId) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  await prisma.message.updateMany({
    where: {
      caseChatId: caseChat.id,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  res.json({ data: { success: true } });
}
