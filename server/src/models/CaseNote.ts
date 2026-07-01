import { Schema, model, Document, Types } from 'mongoose';

export interface ICaseNote extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  // No actor_type given for this field in the ERD, so left unreferenced (could be User or AdminUser).
  authorId: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseNoteSchema = new Schema<ICaseNote>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    authorId: { type: Schema.Types.ObjectId, required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true, collection: 'case_notes' },
);

CaseNoteSchema.index({ caseId: 1, createdAt: -1 });

export default model<ICaseNote>('CaseNote', CaseNoteSchema);
