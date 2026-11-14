'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extractMobiles } = require('../src/phone');

test('normalizes the spec examples to 09121234567', () => {
  for (const input of ['+989121234567', '۰۹۱۲ ۱۲۳ ۴۵۶۷', 'موبایل 09121234567', '0912-123-4567', '00989121234567']) {
    assert.deepStrictEqual(extractMobiles(input), ['09121234567'], input);
  }
});

test('ignores landlines and short numbers', () => {
  assert.deepStrictEqual(extractMobiles('02155587458'), []);
  assert.deepStrictEqual(extractMobiles('0912123'), []);
});

test('extracts from free text', () => {
  assert.deepStrictEqual(extractMobiles('تلفن منشی 09344454323'), ['09344454323']);
});

test('keeps order, dedupes, caps at 3', () => {
  const out = extractMobiles(['09121111111', '09122222222', '09121111111', '09123333333', '09124444444']);
  assert.deepStrictEqual(out, ['09121111111', '09122222222', '09123333333']);
});
