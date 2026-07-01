import { Schema, model, Document, Types } from 'mongoose';

/** Junction collection for the roles<->permissions many-to-many relationship. */
export interface IRolePermission extends Document {
  _id: Types.ObjectId;
  roleId: Types.ObjectId;
  permissionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  },
  { timestamps: true, collection: 'role_permissions' },
);

// Mirrors the ERD's composite primary key (role_id, permission_id).
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ permissionId: 1 });

export default model<IRolePermission>('RolePermission', RolePermissionSchema);
