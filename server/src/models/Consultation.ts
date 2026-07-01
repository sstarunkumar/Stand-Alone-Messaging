import { Schema, model, Document, Types } from 'mongoose';

export interface IConsultation extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  // Assumed AdminUser (subject-matter expert); no actor_type given in the ERD.
  expertId: Types.ObjectId;
  slot: Date;
  brief?: string;
  verdict?: string;
  actionPlan?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSchema = new Schema<IConsultation>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    expertId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    slot: { type: Date, required: true },
    brief: { type: String, trim: true },
    verdict: { type: String, trim: true },
    actionPlan: { type: String, trim: true },
  },
  { timestamps: true, collection: 'consultations' },
);

ConsultationSchema.index({ caseId: 1 });
ConsultationSchema.index({ expertId: 1, slot: 1 });

export default model<IConsultation>('Consultation', ConsultationSchema);
