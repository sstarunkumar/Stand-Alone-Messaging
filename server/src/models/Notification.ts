import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType } from './enums';

export interface INotification extends Document {
  _id: Types.ObjectId;
  // Polymorphic — the referenced collection depends on recipientType, so no `ref` is set.
  recipientId: Types.ObjectId;
  recipientType: ActorType;
  // Logical link only per the ERD (no enforced FK) — kept optional and unvalidated against Case.
  caseId?: Types.ObjectId;
  event: string;
  title: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientType: { type: String, enum: ACTOR_TYPES, required: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'Case' },
    event: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'notifications' },
);

NotificationSchema.index({ recipientId: 1, recipientType: 1, readAt: 1 });
NotificationSchema.index({ caseId: 1 });
NotificationSchema.index({ createdAt: -1 });

export default model<INotification>('Notification', NotificationSchema);
