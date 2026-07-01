import { Schema, model, Document, Types } from 'mongoose';

export interface IPermission extends Document {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true, collection: 'permissions' },
);

export default model<IPermission>('Permission', PermissionSchema);
