import mongoose, { Document, Schema } from 'mongoose';

export interface IOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface IQuestion {
  id: string;
  prompt: string;
  options: IOption[];
  correctOptionId: string;
  explanation?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  confidenceScore?: number;
}

export interface IAssessment extends Document {
  customId?: string | null;
  title: string;
  subject: string;
  durationMinutes: number;
  totalQuestions: number;
  questions: IQuestion[];
  sourcePdfName?: string;
  extractionNotes?: string[];
  isPublished: boolean;
  publishedBy: string; // Admin username
  publishedAt: Date;
  updatedAt: Date;
  version: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  lastEditedBy?: string | null;
}

const OptionSchema = new Schema<IOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    id: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [OptionSchema], required: true },
    correctOptionId: { type: String, required: true },
    explanation: { type: String, default: '' },
    topic: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    confidenceScore: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessment>(
  {
    customId: { type: String, index: true, default: null },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    questions: { type: [QuestionSchema], required: true },
    sourcePdfName: { type: String, default: null },
    extractionNotes: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true, index: true },
    publishedBy: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now, index: true },
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: String, default: null },
    lastEditedBy: { type: String, default: null },
  },
  {
    collection: 'assessments',
    timestamps: true,
  }
);

export const Assessment =
  mongoose.models.Assessment ||
  mongoose.model<IAssessment>('Assessment', AssessmentSchema);
