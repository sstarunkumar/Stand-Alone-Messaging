import { Schema, model, Document, Types } from 'mongoose';
import { PROPERTY_STATES, PropertyState } from './enums';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IAdminUser extends Document {
  _id: Types.ObjectId;
  email: string;
  roleId: Types.ObjectId;
  regions: PropertyState[];
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: EMAIL_PATTERN,
    },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    regions: [{ type: String, enum: PROPERTY_STATES }],
    isActive: { type: Boolean, required: true, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'admin_users' },
);

AdminUserSchema.index({ roleId: 1 });
AdminUserSchema.index({ isActive: 1 });
AdminUserSchema.index({ deletedAt: 1 });

export default model<IAdminUser>('AdminUser', AdminUserSchema);
