import { describe, test, expect } from 'vitest';

describe('簡単なテスト', () => {
  test('基本的な動作確認', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBe(true);
  });

  test('数値の境界値テスト', () => {
    expect(0).toBe(0);
    expect(-0).toBe(0);
    expect(Object.is(-0, 0)).toBe(false);
    expect(Object.is(-0, -0)).toBe(true);
  });

  test('無効な日付のテスト', () => {
    const invalidDate = new Date('invalid-date');
    expect(isNaN(invalidDate.getTime())).toBe(true);
    expect(invalidDate.toString()).toBe('Invalid Date');
  });

  test('Intl.NumberFormatのテスト', () => {
    const formatter = new Intl.NumberFormat('en-US');
    expect(formatter.format(1234.56)).toBe('1,234.56');
    expect(formatter.format(Infinity)).toBe('∞');
    expect(formatter.format(-Infinity)).toBe('-∞');
    expect(formatter.format(NaN)).toBe('NaN');
  });
});