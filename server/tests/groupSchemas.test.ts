import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroupSchema, updateGroupSchema } from '../src/validation/groupSchemas';

const group = { name: 'کلاس ریاضی', category: 'ریاضی', studentIds: [] };

test('group color remains optional for backward-compatible default', () => {
  assert.equal(createGroupSchema.safeParse(group).success, true);
  assert.equal(updateGroupSchema.safeParse(group).success, true);
});

test('group create and update accept supported muted palettes', () => {
  for (const cardColor of ['Stone', 'BlueGray', 'Sage', 'Sand', 'Lavender', 'Teal']) {
    assert.equal(createGroupSchema.safeParse({ ...group, cardColor }).success, true);
    assert.equal(updateGroupSchema.safeParse({ ...group, cardColor }).success, true);
  }
});

test('group schemas reject unsupported card colors', () => {
  assert.equal(createGroupSchema.safeParse({ ...group, cardColor: 'NeonPink' }).success, false);
  assert.equal(updateGroupSchema.safeParse({ ...group, cardColor: 'unknown' }).success, false);
});
