import { Schema, model, Document, Types } from 'mongoose';

export interface IService extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  domain?: string;
  status?: string;
  // Free-form for now — the concrete archetype list will be finalized later.
  archetype?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    status: { type: String, trim: true },
    archetype: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: 'services' },
);

ServiceSchema.index({ archetype: 1 });
ServiceSchema.index({ isActive: 1 });

export default model<IService>('Service', ServiceSchema);
