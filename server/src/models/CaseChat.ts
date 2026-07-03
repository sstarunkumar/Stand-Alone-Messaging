import { Schema, model, Document, Types } from 'mongoose';

/**
 * Case-centric conversation wrapper. Not part of the original ERD, but required
 * by product: one chat thread per case, tying together the customer and the
 * assigned case manager so Message documents don't need to duplicate caseId.
 */
export interface ICaseChat extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  customerId: Types.ObjectId;
  caseManagerId: Types.ObjectId;
  // Denormalized display label supplied by the owning system at provisioning time
  // (see registerCase) — this service has its own database, so it can't join against
  // NOS's real Case collection for this; NOS passes whatever it wants shown.
  caseNumber: string | null;
  // Denormalized cache of the most recent message's createdAt, so the
  // conversation list can sort by recent activity without fetching messages.
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CaseChatSchema = new Schema<ICaseChat>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caseManagerId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    caseNumber: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'case_chats' },
);

CaseChatSchema.index({ customerId: 1 });
CaseChatSchema.index({ caseManagerId: 1 });
CaseChatSchema.index({ lastMessageAt: -1 });

export default model<ICaseChat>('CaseChat', CaseChatSchema);
