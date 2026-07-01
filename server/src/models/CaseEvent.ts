import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType, CASE_STATUSES, CaseStatus } from './enums';

export interface ICaseEvent extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  fromStatus?: CaseStatus;
  toStatus: CaseStatus;
  // Polymorphic — the referenced collection depends on actorType, so no `ref` is set.
  actorId: Types.ObjectId;
  actorType: ActorType;
  reason?: string;
  slaTarget?: Date;
  breached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaseEventSchema = new Schema<ICaseEvent>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    fromStatus: { type: String, enum: CASE_STATUSES },
    toStatus: { type: String, enum: CASE_STATUSES, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ACTOR_TYPES, required: true },
    reason: { type: String, trim: true },
    slaTarget: { type: Date },
    breached: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: 'case_events' },
);

CaseEventSchema.index({ caseId: 1, createdAt: -1 });
CaseEventSchema.index({ breached: 1 });

export default model<ICaseEvent>('CaseEvent', CaseEventSchema);
