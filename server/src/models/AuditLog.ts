import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType } from './enums';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  // Polymorphic — the referenced collection depends on actorType, so no `ref` is set.
  actorId: Types.ObjectId;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ACTOR_TYPES, required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'audit_logs' },
);

AuditLogSchema.index({ actorId: 1, actorType: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export default model<IAuditLog>('AuditLog', AuditLogSchema);
