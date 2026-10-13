import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceId } from '../src/resource-id.mjs';

test('notes and notices have distinct IDs even with the same original UUID', () => {
  const uuid = 'aabbccdd-1234-4567-89ab-123456789abc';
  assert.equal(resourceId('notes'), 'notes:collection');
  assert.equal(resourceId('notices'), 'notices:collection');
  assert.notEqual(resourceId('notes', uuid), resourceId('notices', uuid));
  assert.equal(resourceId('notes', uuid.toUpperCase()), resourceId('notes', uuid));
});

test('arbitrary namespace or ID cannot be promoted into a resource', () => {
  assert.throws(() => resourceId('teacher'), /invalid_resource_namespace/);
  for (const id of ['', '../notices', ['a'], 'collection']) {
    assert.throws(() => resourceId('notes', id), /invalid_resource_id/);
  }
});
