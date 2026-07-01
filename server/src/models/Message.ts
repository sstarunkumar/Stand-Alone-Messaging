import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType, MESSAGE_VISIBILITIES, MessageVisibility } from './enums';

const DEFAULT_MESSAGE_TYPE = 'TEXT';

/**
 * Merges the ERD's message shape (senderType/senderId, attachments, visibility)
 * with the delivery-tracking fields the existing socket/ack pipeline depends on
 * (deliveredAt, isDeleted). Threaded through CaseChat rather than case_id directly,
 * per product decision to keep CaseChat as the case<->conversation join point.
 */
export interface IMessage extends Document {
  _id: Types.ObjectId;
  caseChatId: Types.ObjectId;
  senderType: ActorType;
  // Polymorphic — the referenced collection depends on senderType, so no `ref` is set.
  senderId: Types.ObjectId;
  body: string;
  type: string;
  attachments?: unknown;
  visibility: MessageVisibility;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    caseChatId: { type: Schema.Types.ObjectId, ref: 'CaseChat', required: true },
    senderType: { type: String, enum: ACTOR_TYPES, required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, trim: true },
    type: { type: String, required: true, default: DEFAULT_MESSAGE_TYPE },
    attachments: { type: Schema.Types.Mixed },
    visibility: { type: String, enum: MESSAGE_VISIBILITIES, required: true, default: 'PUBLIC' },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: 'messages' },
);

MessageSchema.index({ caseChatId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ caseChatId: 1, readAt: 1 });

export default model<IMessage>('Message', MessageSchema);
