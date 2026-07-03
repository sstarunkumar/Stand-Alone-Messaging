import Message, { IMessage } from '../models/Message';
import { ICaseChat } from '../models/CaseChat';

/**
 * Maps Mongoose documents to the wire shape the existing test-harness client
 * expects (id/content/senderRole), decoupling the ERD-aligned storage field
 * names (senderType/body) from the client contract.
 */
export interface ReplySnapshot {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
}

export function toWireMessage(msg: IMessage, caseId: string, replyTo: ReplySnapshot | null = null) {
  return {
    id: msg._id.toString(),
    caseChatId: msg.caseChatId.toString(),
    caseId,
    senderId: msg.senderId.toString(),
    senderRole: msg.senderType,
    content: msg.body,
    type: msg.type,
    deliveredAt: msg.deliveredAt ?? null,
    readAt: msg.readAt ?? null,
    createdAt: msg.createdAt,
    replyTo,
  };
}

export function toReplySnapshot(msg: IMessage): ReplySnapshot {
  return {
    id: msg._id.toString(),
    senderId: msg.senderId.toString(),
    senderRole: msg.senderType,
    content: msg.body,
  };
}

/**
 * Batch-resolves the quoted-message snapshots for a page of messages in one query,
 * keyed by the quoted message's id — avoids an N+1 lookup per reply when listing history.
 */
export async function loadReplySnapshots(messages: IMessage[]): Promise<Map<string, ReplySnapshot>> {
  const ids = [...new Set(messages.filter((m) => m.replyToMessageId).map((m) => m.replyToMessageId!.toString()))];
  if (ids.length === 0) return new Map();
  const targets = await Message.find({ _id: { $in: ids } });
  return new Map(targets.map((t) => [t._id.toString(), toReplySnapshot(t)]));
}

export function toWireCaseChat(chat: ICaseChat, unreadCount?: number) {
  return {
    id: chat._id.toString(),
    caseId: chat.caseId.toString(),
    caseNumber: chat.caseNumber ?? null,
    customerId: chat.customerId.toString(),
    caseManagerId: chat.caseManagerId.toString(),
    lastMessageAt: chat.lastMessageAt,
    unreadCount: unreadCount ?? 0,
    createdAt: chat.createdAt,
  };
}
