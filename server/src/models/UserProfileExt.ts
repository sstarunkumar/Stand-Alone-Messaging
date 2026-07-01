import { Schema, model, Document, Types } from 'mongoose';

export interface IUserProfileExt extends Document {
  _id: Types.ObjectId; // same value as the owning User._id (1-1)
  residency?: string;
  country?: string;
  language?: string;
  timezone?: string;
  kycStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileExtSchema = new Schema<IUserProfileExt>(
  {
    _id: { type: Schema.Types.ObjectId, ref: 'User' },
    residency: { type: String, trim: true },
    country: { type: String, trim: true },
    language: { type: String, trim: true },
    timezone: { type: String, trim: true },
    kycStatus: { type: String, trim: true },
  },
  { timestamps: true, collection: 'user_profile_ext', _id: false },
);

export default model<IUserProfileExt>('UserProfileExt', UserProfileExtSchema);
