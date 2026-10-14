import mongoose from 'mongoose';
import { Assessment, IAssessment } from './models/Assessment.js';
import { isUsingMemoryStore } from './db.js';

// In-Memory published assessment storage for fallback / test mode
export const memoryPublishedAssessments: Map<string, any> = new Map();

// Seed initial shared published assessments in memory store
const initialPublished = [
  {
    id: 'pub-ctet-2026',
    title: 'CTET 2026: Child Development & Pedagogy (Official Paper)',
    subject: 'Child Development & Pedagogy',
    durationMinutes: 25,
    totalQuestions: 5,
    isPublished: true,
    publishedBy: 'admin',
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    questions: [
      {
        id: 'pub-q1',
        prompt: 'Assertion (A): In a classroom, presenting highly complex new information simultaneously through rapid verbal dictation and dense, uncoordinated visual text heavily impairs the learning process.\n\nReason (R): The human working memory has a limited capacity, and processing uncoordinated dual-channel information leads to extraneous cognitive overload.',
        options: [
          { id: 'A', text: 'Both (A) and (R) are true, and (R) is the correct explanation of (A).' },
          { id: 'B', text: 'Both (A) and (R) are true, but (R) is not the correct explanation of (A).' },
          { id: 'C', text: '(A) is true, but (R) is false.' },
          { id: 'D', text: 'Both (A) and (R) are false.' },
        ],
        correctOptionId: 'A',
        explanation: 'Working memory capacity is strictly bounded. Uncoordinated audio/visual inputs overload cognitive processing.',
        difficulty: 'medium',
      },
      {
        id: 'pub-q2',
        prompt: 'Which of the following pedagogical practices is NOT aligned with the principles of Universal Design for Learning (UDL) in an inclusive classroom?',
        options: [
          { id: 'A', text: 'Providing multiple means of representation, such as audio-books and graphic organizers.' },
          { id: 'B', text: 'Allowing students to express their understanding through varied formats like oral presentations or physical models.' },
          { id: 'C', text: 'Mandating a single, standardized, time-bound written examination for all summative assessments.' },
          { id: 'D', text: 'Fostering multiple means of engagement by offering choices that tap into students’ intrinsic interests.' },
        ],
        correctOptionId: 'C',
        explanation: 'UDL requires flexible options in engagement, representation, and expression. Rigid one-size-fits-all tests contradict UDL.',
        difficulty: 'easy',
      },
      {
        id: 'pub-q3',
        prompt: 'To effectively foster intrinsic motivation and a "mastery-approach orientation" among elementary school students, a teacher should primarily focus on:',
        options: [
          { id: 'A', text: 'Publishing a weekly rank list on the classroom notice board.' },
          { id: 'B', text: 'Praising the innate intelligence and fixed abilities of the students.' },
          { id: 'C', text: 'Providing constructive, task-specific feedback that emphasizes effort, strategy, and personal improvement.' },
          { id: 'D', text: 'Offering tangible physical rewards for every minor task completed.' },
        ],
        correctOptionId: 'C',
        explanation: 'Task-specific feedback highlighting effort and strategy drives growth mindset and mastery goals.',
        difficulty: 'medium',
      },
      {
        id: 'pub-q4',
        prompt: 'Authentic "School-Based Assessment" (SBA) aims to comprehensively evaluate learners. Which features define SBA?\n\n(i) Integrates assessment seamlessly into daily teaching-learning.\n(ii) Relies exclusively on external board examinations.\n(iii) Utilizes diverse tools like portfolios, anecdotal records, and self-assessments.\n(iv) Compares students against a national normative sample.',
        options: [
          { id: 'A', text: '(ii) and (iv)' },
          { id: 'B', text: '(i) and (iii)' },
          { id: 'C', text: '(i), (ii), and (iii)' },
          { id: 'D', text: '(iii) and (iv)' },
        ],
        correctOptionId: 'B',
        explanation: 'SBA is child-centered and formative, using multiple descriptive diagnostic tools rather than high-stakes standardized sorting.',
        difficulty: 'medium',
      },
      {
        id: 'pub-q5',
        prompt: 'A student consistently scores low in mathematics and has started believing that "I do not have the brain for math, and no matter how hard I try, I will never pass." This student is exhibiting:',
        options: [
          { id: 'A', text: 'Mastery-avoidance goals' },
          { id: 'B', text: 'Learned helplessness' },
          { id: 'C', text: 'Internal-controllable attribution' },
          { id: 'D', text: 'Intrinsic motivation' },
        ],
        correctOptionId: 'B',
        explanation: 'Learned helplessness is characterized by passive resignation and belief that failures cannot be changed by effort.',
        difficulty: 'easy',
      },
    ],
  },
  {
    id: 'pub-cs-202',
    title: 'Advanced Computer Science: Distributed Systems & Consensus',
    subject: 'Computer Science',
    durationMinutes: 20,
    totalQuestions: 3,
    isPublished: true,
    publishedBy: 'admin',
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    questions: [
      {
        id: 'pub-cs-q1',
        prompt: 'According to the CAP theorem, which property must a distributed system sacrifice when a network partition (P) occurs?',
        options: [
          { id: 'A', text: 'Either Consistency (C) or Availability (A)' },
          { id: 'B', text: 'Durability (D)' },
          { id: 'C', text: 'Atomicity (A)' },
          { id: 'D', text: 'Network Latency' },
        ],
        correctOptionId: 'A',
        explanation: 'During network partition, a distributed system must choose between returning errors/stale reads or blocking.',
        difficulty: 'easy',
      },
      {
        id: 'pub-cs-q2',
        prompt: 'What role does the "Leader" node play in the Raft consensus algorithm?',
        options: [
          { id: 'A', text: 'Accepts all log entries from clients and replicates them to follower nodes' },
          { id: 'B', text: 'Exclusively votes in election cycles without writing logs' },
          { id: 'C', text: 'Executes garbage collection of old database snapshots' },
          { id: 'D', text: 'Encrypts inter-node TLS handshakes' },
        ],
        correctOptionId: 'A',
        explanation: 'Raft establishes a strong leader that accepts client commands and manages log replication monotonically.',
        difficulty: 'medium',
      },
      {
        id: 'pub-cs-q3',
        prompt: 'What is the Byzantine Fault Tolerance threshold for a system with 3f + 1 nodes?',
        options: [
          { id: 'A', text: 'Tolerates up to f arbitrary/malicious faulty nodes' },
          { id: 'B', text: 'Tolerates up to 2f crash-stop faults only' },
          { id: 'C', text: 'Requires 100% unanimous agreement' },
          { id: 'D', text: 'Only tolerates network delays' },
        ],
        correctOptionId: 'A',
        explanation: 'PBFT requires N >= 3f + 1 to tolerate f arbitrary Byzantine faults.',
        difficulty: 'hard',
      },
    ],
  },
];

for (const item of initialPublished) {
  memoryPublishedAssessments.set(item.id, item);
}

/**
 * Fetch published assessments updated since optional timestamp
 */
export interface PublishedSyncResult {
  assessments: any[];
  deletedIds: string[];
}

/**
 * Fetch published assessments updated since optional timestamp
 * Returns active assessments and tombstones (deletedIds) for synchronization.
 */
export async function getPublishedAssessments(updatedSince?: Date): Promise<PublishedSyncResult> {
  if (isUsingMemoryStore() || mongoose.connection.readyState !== 1) {
    const all = Array.from(memoryPublishedAssessments.values());
    const active = all.filter((a) => a.isPublished && !a.isDeleted);
    const tombstones = all.filter((a) => a.isDeleted);

    const filteredActive = updatedSince
      ? active.filter((a) => new Date(a.updatedAt) > updatedSince)
      : active;

    const filteredDeleted = updatedSince
      ? tombstones.filter((a) => new Date(a.updatedAt) > updatedSince).map((a) => a.id)
      : tombstones.map((a) => a.id);

    return {
      assessments: filteredActive,
      deletedIds: filteredDeleted,
    };
  }

  try {
    const activeQuery: any = { isPublished: true, isDeleted: { $ne: true } };
    if (updatedSince) {
      activeQuery.updatedAt = { $gt: updatedSince };
    }

    const tombstoneQuery: any = { isDeleted: true };
    if (updatedSince) {
      tombstoneQuery.updatedAt = { $gt: updatedSince };
    }

    const [activeDocs, tombstoneDocs] = await Promise.all([
      Assessment.find(activeQuery).sort({ updatedAt: -1 }).lean(),
      Assessment.find(tombstoneQuery).select('_id customId').lean(),
    ]);

    return {
      assessments: activeDocs.map((doc: any) => ({
        ...doc,
        id: (doc as any).customId || (doc as any)._id.toString(),
      })),
      deletedIds: tombstoneDocs.map((doc: any) => (doc as any).customId || (doc as any)._id.toString()),
    };
  } catch (err) {
    console.warn('[Database] Falling back to memory store for published assessments:', err);
    const all = Array.from(memoryPublishedAssessments.values());
    return {
      assessments: all.filter((a) => a.isPublished && !a.isDeleted),
      deletedIds: all.filter((a) => a.isDeleted).map((a) => a.id),
    };
  }
}

/**
 * Save new published assessment (Admin authorized)
 */
export async function savePublishedAssessment(assessmentData: any, adminUsername: string): Promise<any> {
  const durationMinutes =
    assessmentData.durationMinutes ||
    assessmentData.suggestedDurationMinutes ||
    (assessmentData.questions ? Math.max(5, assessmentData.questions.length * 2) : 15);

  const customId =
    assessmentData.id || `pub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const payload = {
    ...assessmentData,
    customId,
    durationMinutes,
    publishedBy: adminUsername,
    isPublished: true,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    publishedAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  if (isUsingMemoryStore() || mongoose.connection.readyState !== 1) {
    const saved = { ...payload, id: customId };
    memoryPublishedAssessments.set(customId, saved);
    return saved;
  }

  try {
    const doc = new Assessment(payload);
    const saved = await doc.save();
    const result = {
      ...saved.toObject(),
      id: saved.customId || saved._id.toString(),
    };
    // Also cache in memory for ultra-fast fallback access
    memoryPublishedAssessments.set(result.id, result);
    return result;
  } catch (err) {
    console.warn('[Database] Mongoose save error, saving to memory store fallback:', err);
    const saved = { ...payload, id: customId };
    memoryPublishedAssessments.set(customId, saved);
    return saved;
  }
}


/**
 * Helper to build an ID query that supports both MongoDB ObjectId and string customId
 * without triggering SchemaObjectId CastErrors.
 */
function buildIdQuery(id: string): any {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(id) },
        { customId: id },
      ],
    };
  }
  return { customId: id };
}

/**
 * Update published assessment in MongoDB (Admin authorized)
 */
export async function updatePublishedAssessment(
  id: string,
  updateData: any,
  adminUsername: string
): Promise<any | null> {
  const durationMinutes =
    updateData.durationMinutes ||
    updateData.suggestedDurationMinutes ||
    (updateData.questions ? Math.max(5, updateData.questions.length * 2) : 15);

  const totalQuestions =
    updateData.totalQuestions ||
    (updateData.questions ? updateData.questions.length : 0);

  const updates = {
    title: updateData.title,
    subject: updateData.subject,
    durationMinutes,
    totalQuestions,
    questions: updateData.questions,
    extractionNotes: updateData.extractionNotes || [],
    sourcePdfName: updateData.sourcePdfName,
    lastEditedBy: adminUsername,
    updatedAt: new Date(),
  };

  if (isUsingMemoryStore() || mongoose.connection.readyState !== 1) {
    const existing = memoryPublishedAssessments.get(id);
    if (!existing || existing.isDeleted) return null;

    const updated = {
      ...existing,
      ...updates,
      version: (existing.version || 1) + 1,
    };
    memoryPublishedAssessments.set(id, updated);
    return updated;
  }

  try {
    const updated = await Assessment.findOneAndUpdate(
      { ...buildIdQuery(id), isDeleted: { $ne: true } },
      {
        $set: updates,
        $inc: { version: 1 },
      },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!updated) {
      // Check memory store if not yet in Mongo
      const existing = memoryPublishedAssessments.get(id);
      if (!existing || existing.isDeleted) return null;
      const memUpdated = {
        ...existing,
        ...updates,
        version: (existing.version || 1) + 1,
      };
      memoryPublishedAssessments.set(id, memUpdated);
      return memUpdated;
    }

    const result = {
      ...updated,
      id: (updated as any).customId || (updated as any)._id.toString(),
    };
    memoryPublishedAssessments.set(id, result);
    return result;
  } catch (err) {
    console.warn('[Database] Mongoose update error, checking memory store fallback:', err);
    const existing = memoryPublishedAssessments.get(id);
    if (!existing || existing.isDeleted) return null;
    const updated = {
      ...existing,
      ...updates,
      version: (existing.version || 1) + 1,
    };
    memoryPublishedAssessments.set(id, updated);
    return updated;
  }
}

/**
 * Delete published assessment by recording a tombstone (Admin authorized)
 * Instead of purging all traces, marks isDeleted: true so clients can sync removal.
 */
export async function deletePublishedAssessment(
  id: string,
  adminUsername: string
): Promise<boolean> {
  const tombstoneData = {
    isDeleted: true,
    isPublished: false,
    deletedAt: new Date(),
    deletedBy: adminUsername,
    updatedAt: new Date(),
  };

  // Always mirror tombstone into memory cache so clients querying memory get instant tombstone
  if (memoryPublishedAssessments.has(id)) {
    memoryPublishedAssessments.set(id, {
      ...memoryPublishedAssessments.get(id),
      ...tombstoneData,
    });
  } else {
    memoryPublishedAssessments.set(id, { id, ...tombstoneData });
  }

  if (isUsingMemoryStore() || mongoose.connection.readyState !== 1) {
    return true;
  }

  try {
    const updated = await Assessment.findOneAndUpdate(
      buildIdQuery(id),
      { $set: tombstoneData },
      { returnDocument: 'after' }
    );
    if (updated) {
      return true;
    }
    // If not found in Mongo, it was an in-memory assessment, already updated above
    return true;
  } catch (err) {
    console.warn('[Database] Mongoose tombstone delete error, fallback to memory:', err);
    return true;
  }
}
