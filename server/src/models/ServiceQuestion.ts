import { Schema, model, Document, Types } from 'mongoose';

export interface IServiceQuestion extends Document {
  _id: Types.ObjectId;
  serviceId: Types.ObjectId;
  key: string;
  section?: string;
  label: string;
  type: string;
  order: number;
  required: boolean;
  config?: unknown; // showIf, etc.
  createdAt: Date;
  updatedAt: Date;
}

const ServiceQuestionSchema = new Schema<IServiceQuestion>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    key: { type: String, required: true, trim: true },
    section: { type: String, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    required: { type: Boolean, required: true, default: false },
    config: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'service_questions' },
);

// Mirrors the ERD's "key UK with service" compound constraint.
ServiceQuestionSchema.index({ serviceId: 1, key: 1 }, { unique: true });
ServiceQuestionSchema.index({ serviceId: 1, order: 1 });

export default model<IServiceQuestion>('ServiceQuestion', ServiceQuestionSchema);
