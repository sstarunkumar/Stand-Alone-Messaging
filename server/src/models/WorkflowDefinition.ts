import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkflowDefinition extends Document {
  _id: Types.ObjectId;
  // Free-form for now, mirrors Service.archetype until the archetype list is finalized.
  archetype: string;
  // Optional override, intentionally NOT a `ref` — the ERD marks this as unenforced.
  serviceId?: Types.ObjectId;
  version: number;
  active: boolean;
  initialState: string;
  states?: unknown;
  transitions?: unknown;
  controls?: unknown;
  terminal?: unknown;
  paused?: unknown;
  resumeStates?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowDefinitionSchema = new Schema<IWorkflowDefinition>(
  {
    archetype: { type: String, required: true, trim: true },
    serviceId: { type: Schema.Types.ObjectId },
    version: { type: Number, required: true, default: 1, min: 1 },
    active: { type: Boolean, required: true, default: true },
    initialState: { type: String, required: true, trim: true },
    states: { type: Schema.Types.Mixed },
    transitions: { type: Schema.Types.Mixed },
    controls: { type: Schema.Types.Mixed },
    terminal: { type: Schema.Types.Mixed },
    paused: { type: Schema.Types.Mixed },
    resumeStates: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'workflow_definitions' },
);

WorkflowDefinitionSchema.index({ archetype: 1, version: 1 }, { unique: true });
WorkflowDefinitionSchema.index({ archetype: 1, active: 1 });

export default model<IWorkflowDefinition>('WorkflowDefinition', WorkflowDefinitionSchema);
