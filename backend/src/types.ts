export interface ExtractedOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface ExtractedQuestion {
  id: string;
  prompt: string;
  options: ExtractedOption[];
  correctOptionId: string; // 'A', 'B', etc.
  explanation?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  confidenceScore?: number; // 0.0 to 1.0 AI confidence
}

export interface ExtractedAssessment {
  title: string;
  subject: string;
  durationMinutes?: number;
  suggestedDurationMinutes: number;
  totalQuestions: number;
  questions: ExtractedQuestion[];
  extractionNotes?: string[];
  sourcePdfName?: string;
}

export interface ExtractionSuccessResponse {
  success: true;
  sourceFilename: string;
  assessment: ExtractedAssessment;
  metadata: {
    modelUsed: string;
    extractedAt: string;
    isMockFallback?: boolean;
  };
}

export interface ExtractionErrorResponse {
  success: false;
  errorCode:
    | 'NO_FILE_PROVIDED'
    | 'INVALID_FILE_TYPE'
    | 'FILE_TOO_LARGE'
    | 'UNREADABLE_PDF'
    | 'NO_QUESTIONS_FOUND'
    | 'GEMINI_AUTH_ERROR'
    | 'GEMINI_RATE_LIMIT'
    | 'VALIDATION_FAILED'
    | 'INTERNAL_ERROR';
  message: string;
  details?: unknown;
}
