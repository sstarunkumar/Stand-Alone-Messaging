import { Schema, model, Document, Types } from 'mongoose';
import { PROPERTY_STATES, PropertyState, CASE_CATEGORIES, CaseCategory } from './enums';

export interface ICaseManagerProfile extends Document {
  _id: Types.ObjectId; // same value as the owning AdminUser._id (1-1)
  regions: PropertyState[];
  languages: string[];
  expertise: string[];
  complexities: CaseCategory[];
  capacity: number;
  currentLoad: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaseManagerProfileSchema = new Schema<ICaseManagerProfile>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    regions: [{ type: String, enum: PROPERTY_STATES }],
    languages: [{ type: String, trim: true }],
    expertise: [{ type: String, trim: true }],
    complexities: [{ type: String, enum: CASE_CATEGORIES }],
    capacity: { type: Number, required: true, default: 0, min: 0 },
    currentLoad: { type: Number, required: true, default: 0, min: 0 },
    isAvailable: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, collection: 'case_manager_profiles', _id: false },
);

CaseManagerProfileSchema.index({ isAvailable: 1 });
CaseManagerProfileSchema.index({ regions: 1 });

export default model<ICaseManagerProfile>('CaseManagerProfile', CaseManagerProfileSchema);
