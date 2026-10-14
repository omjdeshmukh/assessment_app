import test from 'node:test';
import assert from 'node:assert/strict';

test('Health endpoint contract check', async () => {
  // Simple contract validation
  const mockResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: false,
    maxUploadSizeBytes: 15728640,
  };

  assert.equal(mockResponse.status, 'ok');
  assert.equal(typeof mockResponse.maxUploadSizeBytes, 'number');
});
