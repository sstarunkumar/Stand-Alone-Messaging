import { Schema, model, Document, Types } from 'mongoose';

export interface IQuoteLineItem extends Document {
  _id: Types.ObjectId;
  quoteId: Types.ObjectId;
  label: string;
  type?: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteLineItemSchema = new Schema<IQuoteLineItem>(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, collection: 'quote_line_items' },
);

QuoteLineItemSchema.index({ quoteId: 1 });

export default model<IQuoteLineItem>('QuoteLineItem', QuoteLineItemSchema);
