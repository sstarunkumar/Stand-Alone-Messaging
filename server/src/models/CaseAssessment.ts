import { Schema, model, Document, Types } from 'mongoose';
import { CASE_CATEGORIES, CaseCategory } from './enums';

export interface ICaseAssessment extends Document {
  _id: Types.ObjectId; // same value as the owning Case._id (1-1)
  responses?: unknown;
  subScores?: unknown;
  overallScore?: number;
  category?: CaseCategory;
  gateHits?: unknown;
  explanation?: string;
  pricing?: unknown;
  rulePackVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseAssessmentSchema = new Schema<ICaseAssessment>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'Case' },
    responses: { type: Schema.Types.Mixed },
    subScores: { type: Schema.Types.Mixed },
    overallScore: { type: Number },
    category: { type: String, enum: CASE_CATEGORIES },
    gateHits: { type: Schema.Types.Mixed },
    explanation: { type: String, trim: true },
    pricing: { type: Schema.Types.Mixed },
    rulePackVersion: { type: String, trim: true },
  },
  { timestamps: true, collection: 'case_assessments', _id: false },
);

CaseAssessmentSchema.index({ category: 1 });

export default model<ICaseAssessment>('CaseAssessment', CaseAssessmentSchema);
