import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestionOption extends Document {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  label: string;
  value: string;
  order: number;
  scoreDeltas?: unknown;
  routing?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'ServiceQuestion', required: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    scoreDeltas: { type: Schema.Types.Mixed },
    routing: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'question_options' },
);

QuestionOptionSchema.index({ questionId: 1, order: 1 });

export default model<IQuestionOption>('QuestionOption', QuestionOptionSchema);
