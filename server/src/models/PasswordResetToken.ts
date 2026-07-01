import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType } from './enums';

export interface IPasswordResetToken extends Document {
  _id: Types.ObjectId;
  tokenHash: string;
  // Polymorphic — the referenced collection depends on actorType, so no `ref` is set.
  actorId: Types.ObjectId;
  actorType: ActorType;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    tokenHash: { type: String, required: true, trim: true, unique: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ACTOR_TYPES, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'password_reset_tokens' },
);

PasswordResetTokenSchema.index({ actorId: 1, actorType: 1 });

export default model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
