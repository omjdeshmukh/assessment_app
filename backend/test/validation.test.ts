import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndValidateAssessment } from '../src/validation.js';

test('sanitizeAndValidateAssessment normalizes options and correct option IDs', () => {
  const mockRaw = {
    title: 'Algebra 101',
    subject: 'Mathematics',
    suggestedDurationMinutes: 15,
    questions: [
      {
        id: 'q1',
        prompt: 'Solve for x: 2x + 4 = 10',
        options: [
          { id: '1', text: 'x = 2' },
          { id: '2', text: 'x = 3' },
          { id: '3', text: 'x = 4' },
        ],
        correctOptionId: '2', // pointing to second option
        explanation: '2(3) + 4 = 10, so x = 3.',
        difficulty: 'easy',
      },
    ],
  };

  const result = sanitizeAndValidateAssessment(mockRaw);
  assert.equal(result.title, 'Algebra 101');
  assert.equal(result.totalQuestions, 1);
  assert.equal(result.questions[0].options.length, 3);
  assert.equal(result.questions[0].options[0].id, '1');
  assert.equal(result.questions[0].correctOptionId, '2');
  assert.equal(result.questions[0].difficulty, 'easy');
});

test('sanitizeAndValidateAssessment handles fallback when correct option ID is missing', () => {
  const mockRaw = {
    title: 'Physics Test',
    subject: 'Physics',
    questions: [
      {
        prompt: 'What is the speed of light in vacuum?',
        options: [
          { id: 'A', text: '3 x 10^8 m/s' },
          { id: 'B', text: '1.5 x 10^8 m/s' },
        ],
        correctOptionId: 'UNKNOWN',
      },
    ],
  };

  const result = sanitizeAndValidateAssessment(mockRaw);
  assert.equal(result.questions[0].correctOptionId, 'A'); // defaults safely to first
  assert.equal(result.questions[0].confidenceScore, 0.5); // reduced confidence flagged
});
