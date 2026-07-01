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
  createdAt: Date;
  updatedAt: Date;
}

const CaseChatSchema = new Schema<ICaseChat>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caseManagerId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: true, collection: 'case_chats' },
);

CaseChatSchema.index({ customerId: 1 });
CaseChatSchema.index({ caseManagerId: 1 });

export default model<ICaseChat>('CaseChat', CaseChatSchema);
