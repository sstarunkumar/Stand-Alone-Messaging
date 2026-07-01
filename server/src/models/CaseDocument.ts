import { Schema, model, Document, Types } from 'mongoose';
import { DOC_STATUSES, DocStatus } from './enums';

export interface ICaseDocument extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  docType: string;
  status: DocStatus;
  storageKey: string;
  fileName: string;
  // No actor_type given for this field in the ERD, so left unreferenced (could be User or AdminUser).
  verifiedById?: Types.ObjectId;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CaseDocumentSchema = new Schema<ICaseDocument>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    docType: { type: String, required: true, trim: true },
    status: { type: String, enum: DOC_STATUSES, required: true, default: 'PENDING' },
    storageKey: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    verifiedById: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'case_documents' },
);

CaseDocumentSchema.index({ caseId: 1, status: 1 });
CaseDocumentSchema.index({ deletedAt: 1 });

export default model<ICaseDocument>('CaseDocument', CaseDocumentSchema);
