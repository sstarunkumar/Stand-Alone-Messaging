import { Schema, model, Document, Types } from 'mongoose';
import { PAYMENT_TYPES, PaymentType, PAYMENT_STATUSES, PaymentStatus } from './enums';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  // Loose reference per the ERD (no drawn relationship from quotes to payments).
  quoteId?: Types.ObjectId;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  gatewayRef?: string;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: PAYMENT_TYPES, required: true },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: 'PENDING' },
    gatewayRef: { type: String, trim: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'payments' },
);

PaymentSchema.index({ caseId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ gatewayRef: 1 });

export default model<IPayment>('Payment', PaymentSchema);
