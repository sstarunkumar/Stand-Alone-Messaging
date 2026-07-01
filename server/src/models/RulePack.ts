import { Schema, model, Document, Types } from 'mongoose';
import { PROPERTY_STATES, PropertyState } from './enums';

export interface IRulePack extends Document {
  _id: Types.ObjectId;
  serviceId: Types.ObjectId;
  state: PropertyState;
  landType: string;
  version: number;
  active: boolean;
  gates?: unknown;
  scoreWeights?: unknown;
  categoryBands?: unknown;
  pricingConfig?: unknown;
  checklist?: unknown;
  slaConfig?: unknown;
  authority?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RulePackSchema = new Schema<IRulePack>(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    state: { type: String, enum: PROPERTY_STATES, required: true },
    landType: { type: String, required: true, trim: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    active: { type: Boolean, required: true, default: true },
    gates: { type: Schema.Types.Mixed },
    scoreWeights: { type: Schema.Types.Mixed },
    categoryBands: { type: Schema.Types.Mixed },
    pricingConfig: { type: Schema.Types.Mixed },
    checklist: { type: Schema.Types.Mixed },
    slaConfig: { type: Schema.Types.Mixed },
    authority: { type: String, trim: true },
  },
  { timestamps: true, collection: 'rule_packs' },
);

// A service can have one rule pack per (state, landType) at a given version.
RulePackSchema.index({ serviceId: 1, state: 1, landType: 1, version: 1 }, { unique: true });
RulePackSchema.index({ serviceId: 1, active: 1 });

export default model<IRulePack>('RulePack', RulePackSchema);
