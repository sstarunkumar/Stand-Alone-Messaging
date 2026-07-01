import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
  },
  { timestamps: true, collection: 'roles' },
);

export default model<IRole>('Role', RoleSchema);
