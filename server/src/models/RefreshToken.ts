import { Schema, model, Document, Types } from 'mongoose';
import { ACTOR_TYPES, ActorType } from './enums';

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  tokenHash: string;
  // Polymorphic — the referenced collection depends on actorType, so no `ref` is set.
  actorId: Types.ObjectId;
  actorType: ActorType;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true, trim: true, unique: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ACTOR_TYPES, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'refresh_tokens' },
);

RefreshTokenSchema.index({ actorId: 1, actorType: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });

export default model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
