import test from 'node:test';
import assert from 'node:assert/strict';
import { noteTarget } from '../src/note-target.mjs';

test('exact path ID cannot be replaced by client query id or another function', () => {
  const a = 'aabbccdd-1234-4567-89ab-123456789abc';
  const b = 'bbccddaa-1234-4567-89ab-123456789abc';
  assert.equal(noteTarget({ url: `/api/notes/${a}`, query: { id: b } }), a);
  assert.equal(noteTarget({ url: `/api/notes/${a}?id=${a}` }), a);
  for (const url of [`/api/notes/${a}?id=${b}`, `/api/notes/${a}?id=${a}&id=${a}`,
    `/api/notes/${a}?action=export`, '/api/notes/export', `/api/notes/${a}/export`]) {
    assert.equal(noteTarget({ url }), null);
  }
});
