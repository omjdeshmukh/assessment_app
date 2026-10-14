import { create } from 'zustand';
import { Assessment, TestSession } from '../types/index';

interface TestExecutionState {
  assessment: Assessment | null;
  profileId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> selectedOptionId
  flaggedQuestionIds: string[];
  totalElapsedSeconds: number;
  questionTimesSeconds: Record<string, number>; // questionId -> seconds spent
  isTimerRunning: boolean;
  isPaletteModalOpen: boolean;
  isSubmitModalOpen: boolean;

  // Actions
  initTest: (assessment: Assessment, profileId: string) => void;
  selectOption: (questionId: string, optionId: string) => void;
  toggleFlagCurrentQuestion: () => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  tickTimer: () => void;
  setPaletteModalOpen: (open: boolean) => void;
  setSubmitModalOpen: (open: boolean) => void;
  finalizeSubmission: () => TestSession | null;
  resetTest: () => void;
}

export const useTestExecutionStore = create<TestExecutionState>((set, get) => ({
  assessment: null,
  profileId: '',
  currentQuestionIndex: 0,
  answers: {},
  flaggedQuestionIds: [],
  totalElapsedSeconds: 0,
  questionTimesSeconds: {},
  isTimerRunning: false,
  isPaletteModalOpen: false,
  isSubmitModalOpen: false,

  initTest: (assessment: Assessment, profileId: string) => {
    const initialQuestionTimes: Record<string, number> = {};
    assessment.questions.forEach((q) => {
      initialQuestionTimes[q.id] = 0;
    });

    set({
      assessment,
      profileId,
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestionIds: [],
      totalElapsedSeconds: 0,
      questionTimesSeconds: initialQuestionTimes,
      isTimerRunning: true,
      isPaletteModalOpen: false,
      isSubmitModalOpen: false,
    });
  },

  selectOption: (questionId: string, optionId: string) => {
    set((state) => {
      // Toggle or set selection
      const currentSelection = state.answers[questionId];
      const newAnswers = { ...state.answers };
      if (currentSelection === optionId) {
        delete newAnswers[questionId]; // deselect if tapped again
      } else {
        newAnswers[questionId] = optionId;
      }
      return { answers: newAnswers };
    });
  },

  toggleFlagCurrentQuestion: () => {
    const { assessment, currentQuestionIndex, flaggedQuestionIds } = get();
    if (!assessment) return;
    const currentQ = assessment.questions[currentQuestionIndex];
    if (!currentQ) return;

    if (flaggedQuestionIds.includes(currentQ.id)) {
      set({
        flaggedQuestionIds: flaggedQuestionIds.filter((id) => id !== currentQ.id),
      });
    } else {
      set({
        flaggedQuestionIds: [...flaggedQuestionIds, currentQ.id],
      });
    }
  },

  nextQuestion: () => {
    const { assessment, currentQuestionIndex } = get();
    if (!assessment) return;
    if (currentQuestionIndex < assessment.questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    } else {
      // At the last question: open submission modal
      set({ isSubmitModalOpen: true });
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  goToQuestion: (index: number) => {
    const { assessment } = get();
    if (!assessment) return;
    if (index >= 0 && index < assessment.questions.length) {
      set({ currentQuestionIndex: index, isPaletteModalOpen: false });
    }
  },

  tickTimer: () => {
    const { assessment, currentQuestionIndex, isTimerRunning } = get();
    if (!isTimerRunning || !assessment) return;

    const currentQ = assessment.questions[currentQuestionIndex];
    const currentQId = currentQ?.id;

    set((state) => ({
      totalElapsedSeconds: state.totalElapsedSeconds + 1,
      questionTimesSeconds: {
        ...state.questionTimesSeconds,
        ...(currentQId
          ? {
              [currentQId]: (state.questionTimesSeconds[currentQId] || 0) + 1,
            }
          : {}),
      },
    }));
  },

  setPaletteModalOpen: (open: boolean) => {
    set({ isPaletteModalOpen: open });
  },

  setSubmitModalOpen: (open: boolean) => {
    set({ isSubmitModalOpen: open });
  },

  finalizeSubmission: () => {
    const {
      assessment,
      profileId,
      answers,
      flaggedQuestionIds,
      totalElapsedSeconds,
      questionTimesSeconds,
    } = get();

    if (!assessment) return null;

    set({ isTimerRunning: false, isSubmitModalOpen: false });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    assessment.questions.forEach((q) => {
      const selected = answers[q.id];
      if (!selected) {
        unansweredCount++;
      } else if (selected.toUpperCase() === q.correctOptionId.toUpperCase()) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const totalQuestions = assessment.questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    const session: TestSession = {
      id: `session-${Date.now()}`,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      subject: assessment.subject,
      profileId: profileId,
      startedAt: new Date(Date.now() - totalElapsedSeconds * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationSeconds: totalElapsedSeconds,
      allocatedMinutes: assessment.durationMinutes,
      questionTimesSeconds,
      answers,
      flaggedQuestionIds,
      totalQuestions,
      totalCorrect: correctCount,
      totalIncorrect: incorrectCount,
      totalUnanswered: unansweredCount,
      scorePercentage,
    };

    return session;
  },

  resetTest: () => {
    set({
      assessment: null,
      profileId: '',
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestionIds: [],
      totalElapsedSeconds: 0,
      questionTimesSeconds: {},
      isTimerRunning: false,
      isPaletteModalOpen: false,
      isSubmitModalOpen: false,
    });
  },
}));
