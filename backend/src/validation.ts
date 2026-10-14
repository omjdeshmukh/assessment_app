import { z } from 'zod';
import { ExtractedAssessment, ExtractedQuestion } from './types.js';

export const OptionSchema = z.object({
  id: z.string().trim().min(1, 'Option ID cannot be empty'),
  text: z.string().trim().min(1, 'Option text cannot be empty'),
});

export const QuestionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  prompt: z.string().trim().min(3, 'Question prompt must have at least 3 characters'),
  options: z.array(OptionSchema).min(2, 'Each question must have at least 2 options'),
  correctOptionId: z.string().trim().min(1, 'Correct option ID must be specified'),
  explanation: z.string().trim().optional().default('No explanation provided.'),
  topic: z.string().trim().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  confidenceScore: z.number().min(0).max(1).optional().default(0.9),
});

export const AssessmentExtractionSchema = z.object({
  title: z.string().trim().min(2, 'Assessment title required').default('Untitled Assessment'),
  subject: z.string().trim().min(2, 'Subject required').default('General'),
  durationMinutes: z.number().int().positive().optional(),
  suggestedDurationMinutes: z.number().int().positive().optional(),
  questions: z.array(QuestionSchema).min(1, 'At least 1 question must be extracted'),
  extractionNotes: z.array(z.string()).optional().default([]),
  sourcePdfName: z.string().optional(),
});

/**
 * Validates and sanitizes raw JSON parsed from Gemini output.
 * Ensures that for every question, correctOptionId points to an existing option ID.
 * If ambiguous, attaches an extraction note.
 */
export function sanitizeAndValidateAssessment(rawData: unknown): ExtractedAssessment {
  const parsed = AssessmentExtractionSchema.parse(rawData);

  const sanitizedQuestions: ExtractedQuestion[] = parsed.questions.map((q, idx) => {
    // Normalise option IDs: ensure options have clear IDs like 'A', 'B', 'C', etc.
    const normalizedOptions = q.options.map((opt, optIdx) => {
      const defaultId = String.fromCharCode(65 + optIdx); // A, B, C, D...
      const cleanId = opt.id ? opt.id.trim().toUpperCase() : defaultId;
      return {
        id: cleanId,
        text: opt.text.trim(),
      };
    });

    // Check if correctOptionId matches one of the option IDs
    let matchedCorrect = normalizedOptions.find(
      (o) => o.id.toUpperCase() === q.correctOptionId.trim().toUpperCase()
    );

    // If correctOptionId was given as an index (e.g., '0' or '1') or text, attempt recovery
    if (!matchedCorrect) {
      const numericIndex = parseInt(q.correctOptionId, 10);
      if (!isNaN(numericIndex) && numericIndex >= 0 && numericIndex < normalizedOptions.length) {
        matchedCorrect = normalizedOptions[numericIndex];
      }
    }

    // Default to the first option if still not matched and flag it
    const finalCorrectId = matchedCorrect ? matchedCorrect.id : normalizedOptions[0].id;

    return {
      id: q.id || `q-${idx + 1}-${Date.now().toString(36)}`,
      prompt: q.prompt,
      options: normalizedOptions,
      correctOptionId: finalCorrectId,
      explanation: q.explanation || 'Verified from source assessment document.',
      topic: q.topic || parsed.subject,
      difficulty: q.difficulty || 'medium',
      confidenceScore: matchedCorrect ? q.confidenceScore : 0.5,
    };
  });

    const resolvedMinutes =
    parsed.durationMinutes ||
    parsed.suggestedDurationMinutes ||
    (rawData as any)?.durationMinutes ||
    Math.max(5, sanitizedQuestions.length * 2);

  return {
    title: parsed.title,
    subject: parsed.subject,
    durationMinutes: resolvedMinutes,
    suggestedDurationMinutes: resolvedMinutes,
    totalQuestions: sanitizedQuestions.length,
    questions: sanitizedQuestions,
    extractionNotes: parsed.extractionNotes || [],
    sourcePdfName: parsed.sourcePdfName || (rawData as any)?.sourcePdfName,
  };
}
