import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGroupSchema,
  updateGroupSchema,
} from '../src/validation/groupSchemas';

const validGroup = {
  name: 'کلاس ریاضی',
  category: 'ریاضی',
  studentIds: [],
};

test('create group keeps card color optional when the instructor uses the existing default', () => {
  const parsed = createGroupSchema.parse(validGroup);
  assert.equal(parsed.cardColor, undefined);
});

test('create and update group accept each supported muted card color', () => {
  const colors = ['Stone', 'BlueGray', 'Sage', 'Sand', 'Lavender', 'Teal'];

  for (const cardColor of colors) {
    assert.equal(
      createGroupSchema.safeParse({ ...validGroup, cardColor }).success,
      true,
    );
    assert.equal(
      updateGroupSchema.safeParse({ ...validGroup, cardColor }).success,
      true,
    );
  }
});

test('group schemas reject unknown card colors', () => {
  assert.equal(
    createGroupSchema.safeParse({ ...validGroup, cardColor: 'NeonPink' }).success,
    false,
  );
  assert.equal(
    updateGroupSchema.safeParse({ ...validGroup, cardColor: 'unknown' }).success,
    false,
  );
});
