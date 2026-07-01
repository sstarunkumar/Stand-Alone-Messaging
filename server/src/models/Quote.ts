import { Schema, model, Document, Types } from 'mongoose';
import { QUOTE_STATUSES, QuoteStatus } from './enums';

export interface IQuote extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  version: number;
  status: QuoteStatus;
  currency: string;
  totalAmount: number;
  // No actor_type given for this field in the ERD, so left unreferenced (could be User or AdminUser).
  approverId?: Types.ObjectId;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    status: { type: String, enum: QUOTE_STATUSES, required: true, default: 'DRAFT' },
    currency: { type: String, required: true, trim: true, uppercase: true },
    totalAmount: { type: Number, required: true, min: 0 },
    approverId: { type: Schema.Types.ObjectId },
    expiresAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'quotes' },
);

QuoteSchema.index({ caseId: 1, version: 1 }, { unique: true });
QuoteSchema.index({ status: 1 });

export default model<IQuote>('Quote', QuoteSchema);
