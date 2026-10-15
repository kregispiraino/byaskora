import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateField } from '../../src/js/contact-validation.js';

test('required, optional, whitespace and length boundaries', () => {
  assert.equal(validateField('name', '  ', 100), false);
  assert.equal(validateField('name', 'A', 100), false);
  assert.equal(validateField('name', ' Ana ', 100), true);
  assert.equal(validateField('company', '', 150), true);
  assert.equal(validateField('company', 'x'.repeat(151), 150), false);
  assert.equal(validateField('context', 'x'.repeat(14), 3000), false);
  assert.equal(validateField('context', 'x'.repeat(15), 3000), true);
  assert.equal(validateField('context', 'x'.repeat(3001), 3000), false);
  assert.equal(validateField('email', 'invalid', 200, true), false);
});
test('optional phone accepts formatted numbers and enforces character and digit limits', () => {
  assert.equal(validateField('phone', '', 30), true);
  assert.equal(validateField('phone', '(11) 99999-9999', 30), true);
  assert.equal(validateField('phone', '+55 11 99999-9999', 30), true);
  for (const value of ['123', '1'.repeat(16), '11999999999abc', '1'.repeat(31)])
    assert.equal(validateField('phone', value, 30), false);
});
