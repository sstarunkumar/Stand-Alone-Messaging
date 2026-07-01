import { Schema, model, Document, Types } from 'mongoose';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  phone?: string;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: EMAIL_PATTERN,
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

UserSchema.index({ isActive: 1 });
UserSchema.index({ deletedAt: 1 });

export default model<IUser>('User', UserSchema);
