import { ExtractedAssessmentData } from './index';

export type RootStackParamList = {
  Landing: undefined;
  Profile: undefined;
  Library: undefined;
  CreateChoice: undefined;
  CreateManual: {
    initialDraft?: ExtractedAssessmentData;
    editAssessmentId?: string;
    mode?: 'create' | 'edit';
    scope?: 'local' | 'published';
  } | undefined;
  CreateAssessment: undefined; // PDF Upload screen
  ReviewExtraction: {
    extractedData: ExtractedAssessmentData;
    sourceFilename: string;
  };
  TestRunner: {
    assessmentId: string;
  };
  Results: {
    sessionId: string;
  };
  AdminPortal: undefined;
};
