import { Schema, model, Document, Types } from 'mongoose';
import { EXECUTION_SOURCES, ExecutionSource, EXECUTION_STATUSES, ExecutionStatus } from './enums';

export interface ICaseExecutionItem extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  key: string;
  label: string;
  type: string;
  options?: unknown;
  required: boolean;
  source: ExecutionSource;
  answer?: unknown;
  status: ExecutionStatus;
  note?: string;
  // No actor_type given for this field in the ERD, so left unreferenced (could be User or AdminUser).
  createdById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CaseExecutionItemSchema = new Schema<ICaseExecutionItem>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    options: { type: Schema.Types.Mixed },
    required: { type: Boolean, required: true, default: false },
    source: { type: String, enum: EXECUTION_SOURCES, required: true },
    answer: { type: Schema.Types.Mixed },
    status: { type: String, enum: EXECUTION_STATUSES, required: true, default: 'PENDING' },
    note: { type: String, trim: true },
    createdById: { type: Schema.Types.ObjectId },
  },
  { timestamps: true, collection: 'case_execution_items' },
);

CaseExecutionItemSchema.index({ caseId: 1, key: 1 }, { unique: true });
CaseExecutionItemSchema.index({ caseId: 1, status: 1 });

export default model<ICaseExecutionItem>('CaseExecutionItem', CaseExecutionItemSchema);
