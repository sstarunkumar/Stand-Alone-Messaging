import { Schema, model, Document, Types } from 'mongoose';
import { CASE_STATUSES, CaseStatus, CASE_CATEGORIES, CaseCategory, PROPERTY_STATES, PropertyState } from './enums';

export interface ICase extends Document {
  _id: Types.ObjectId;
  caseNumber: string;
  userId: Types.ObjectId;
  serviceId: Types.ObjectId;
  // Free-form for now, mirrors Service.archetype until the archetype list is finalized.
  kind: string;
  status: CaseStatus;
  category?: CaseCategory;
  state?: PropertyState;
  propertyType?: string;
  valueBand?: string;
  assignedManagerId?: Types.ObjectId;
  priority?: string;
  language?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>(
  {
    caseNumber: { type: String, required: true, trim: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    kind: { type: String, required: true, trim: true },
    status: { type: String, enum: CASE_STATUSES, required: true, default: 'DRAFT' },
    category: { type: String, enum: CASE_CATEGORIES },
    state: { type: String, enum: PROPERTY_STATES },
    propertyType: { type: String, trim: true },
    valueBand: { type: String, trim: true },
    assignedManagerId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    priority: { type: String, trim: true },
    language: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'cases' },
);

CaseSchema.index({ userId: 1 });
CaseSchema.index({ serviceId: 1 });
CaseSchema.index({ assignedManagerId: 1 });
CaseSchema.index({ status: 1 });
CaseSchema.index({ deletedAt: 1 });

export default model<ICase>('Case', CaseSchema);
