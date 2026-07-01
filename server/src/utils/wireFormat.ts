import { IMessage } from '../models/Message';
import { ICaseChat } from '../models/CaseChat';

/**
 * Maps Mongoose documents to the wire shape the existing test-harness client
 * expects (id/content/senderRole), decoupling the ERD-aligned storage field
 * names (senderType/body) from the client contract.
 */
export function toWireMessage(msg: IMessage, caseId: string) {
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
  };
}

export function toWireCaseChat(chat: ICaseChat) {
  return {
    id: chat._id.toString(),
    caseId: chat.caseId.toString(),
    customerId: chat.customerId.toString(),
    caseManagerId: chat.caseManagerId.toString(),
    createdAt: chat.createdAt,
  };
}
