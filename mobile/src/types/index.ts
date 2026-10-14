export interface Option {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  prompt: string;
  options: Option[];
  correctOptionId: string; // 'A', 'B', etc.
  explanation?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  confidenceScore?: number;
}

export type AssessmentScope = 'local' | 'published';

export interface Assessment {
  id: string;
  profileId?: string; // Set for local assessments; null/undefined for shared published
  scope: AssessmentScope; // 'local' (device-only) or 'published' (downloaded from MongoDB)
  title: string;
  subject: string;
  durationMinutes: number;
  totalQuestions: number;
  questions: Question[];
  sourcePdfName?: string;
  createdAt: string;
  updatedAt?: string;
  publishedBy?: string;
  extractionNotes?: string[];
}

export interface ProfileStats {
  testsTaken: number;
  averageScorePercentage: number;
  totalTimeMinutes: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  targetExam?: string;
  createdAt: string;
  stats: ProfileStats;
}

export interface TestSession {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  subject: string;
  profileId: string;
  startedAt: string;
  completedAt: string;
  totalDurationSeconds: number;
  allocatedMinutes: number;
  questionTimesSeconds: Record<string, number>;
  answers: Record<string, string>;
  flaggedQuestionIds: string[];
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnanswered: number;
  scorePercentage: number;
}

export interface ExtractedAssessmentData {
  title: string;
  subject: string;
  suggestedDurationMinutes: number;
  totalQuestions: number;
  questions: Question[];
  extractionNotes?: string[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin';
}
