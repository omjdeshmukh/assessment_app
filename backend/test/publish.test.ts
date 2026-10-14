import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAndValidateAssessment } from '../src/validation.js';
import {
  savePublishedAssessment,
  updatePublishedAssessment,
  deletePublishedAssessment,
  getPublishedAssessments,
} from '../src/publishedStore.js';

test('Assessment lifecycle: create, update, tombstone delete', async () => {
  const sample = {
    title: 'CTET Child Pedagogy Assessment',
    subject: 'Pedagogy',
    durationMinutes: 20,
    totalQuestions: 1,
    questions: [
      {
        id: 'q-test-1',
        prompt: 'What is the primary role of scaffolding in Vygotskian learning?',
        options: [
          { id: 'A', text: 'Providing temporary support tailored to learner needs' },
          { id: 'B', text: 'Administering high-stakes national examinations' },
          { id: 'C', text: 'Punishing incorrect answers immediately' },
          { id: 'D', text: 'Isolating students from group interactions' },
        ],
        correctOptionId: 'A',
        explanation: 'Scaffolding offers temporary assistance to help a child master concepts in the ZPD.',
        difficulty: 'medium',
      },
    ],
  };

  // 1. Create / Publish
  const validated = sanitizeAndValidateAssessment(sample);
  const saved = await savePublishedAssessment(validated, 'admin');

  assert.ok(saved);
  assert.ok(saved.id);
  assert.equal(saved.title, 'CTET Child Pedagogy Assessment');
  assert.equal(saved.isPublished, true);
  assert.equal(saved.publishedBy, 'admin');

  // Verify retrievable in active assessments
  let sync = await getPublishedAssessments();
  let found = sync.assessments.find((item) => item.id === saved.id || item._id === saved.id);
  assert.ok(found, 'Newly published assessment must be retrievable from database/store');

  // 2. Edit / Update
  const updatePayload = {
    ...sample,
    title: 'CTET Child Pedagogy Assessment (Updated Edition)',
    durationMinutes: 25,
  };
  const updated = await updatePublishedAssessment(saved.id, updatePayload, 'admin');
  assert.ok(updated);
  assert.equal(updated.title, 'CTET Child Pedagogy Assessment (Updated Edition)');
  assert.equal(updated.durationMinutes, 25);
  assert.equal(updated.version, 2);

  // 3. Tombstone Delete
  const deleted = await deletePublishedAssessment(saved.id, 'admin');
  assert.equal(deleted, true);

  // 4. Verify tombstone sync
  sync = await getPublishedAssessments();
  found = sync.assessments.find((item) => item.id === saved.id || item._id === saved.id);
  assert.equal(found, undefined, 'Deleted assessment must NOT appear in active assessments');

  const isTombstoned = sync.deletedIds.includes(saved.id);
  assert.equal(isTombstoned, true, 'Deleted assessment ID must appear in tombstones (deletedIds)');
});

test('Assessment lifecycle with custom string ID (e.g. pub-1791924082589-a5gw): no CastError', async () => {
  const customId = 'pub-1791924082589-a5gw';
  const sample = {
    id: customId,
    title: 'Custom String ID Assessment',
    subject: 'History',
    durationMinutes: 15,
    totalQuestions: 1,
    questions: [
      {
        id: 'q-custom-1',
        prompt: 'Sample question prompt?',
        options: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ],
        correctOptionId: 'A',
      },
    ],
  };

  // 1. Create with string customId
  const saved = await savePublishedAssessment(sample, 'admin');
  assert.equal(saved.id, customId);

  // 2. Update with string customId
  const updated = await updatePublishedAssessment(customId, { ...sample, title: 'Updated String Title' }, 'admin');
  assert.ok(updated);
  assert.equal(updated.title, 'Updated String Title');

  // 3. Tombstone delete with string customId (must not throw CastError)
  const deleted = await deletePublishedAssessment(customId, 'admin');
  assert.equal(deleted, true);

  // 4. Verify tombstone sync
  const sync = await getPublishedAssessments();
  assert.ok(sync.deletedIds.includes(customId));
});
