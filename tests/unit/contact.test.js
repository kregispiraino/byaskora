import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateField,
  prepareMessage,
  createEmailLink,
} from '../../src/js/contact-message.js';

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
test('message preserves Unicode and encodes URL control characters as data', () => {
  const data = {
    name: 'João & Cia',
    email: 'joao@example.com',
    context: 'Integração? x=1 & y=2\nSegunda linha',
    interest: 'Automação',
  };
  const message = prepareMessage(data);
  assert.ok(!message.includes('Empresa:'));
  assert.ok(message.includes(data.context));
  const link = new URL(
    createEmailLink('contato@askora.com.br', 'João\r\nBcc:foo', message),
  );
  assert.equal(link.searchParams.get('body'), message);
  assert.ok(!link.searchParams.get('subject').includes('\n'));
  assert.equal(link.searchParams.size, 2);
});
