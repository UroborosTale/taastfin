import { describe, expect, it } from 'vitest';
import { getCalendarDays, getLimitProgress, getWeekStart, localDate, spentBetween } from './finance.js';

describe('finance helpers', () => {
  it('starts weeks on Monday', () => {
    expect(localDate(getWeekStart(new Date('2026-11-15T12:00:00')))).toBe('2026-11-09');
  });

  it('calculates spending inclusively', () => {
    const expenses = [{ date: '2026-11-15', amount: 100 }, { date: '2026-11-16', amount: 50 }];
    expect(spentBetween(expenses, new Date('2026-11-15'), new Date('2026-11-15T23:00:00'))).toBe(100);
  });

  it('caps limit progress and handles zero limits', () => {
    expect(getLimitProgress(200, 100)).toBe(100);
    expect(getLimitProgress(10, 0)).toBe(0);
  });

  it('returns six calendar weeks', () => {
    const days = getCalendarDays(new Date(2026, 10, 1));
    expect(days).toHaveLength(42);
    expect(days[0].key).toBe('2026-10-26');
    expect(days.filter((day) => day.inMonth)).toHaveLength(30);
  });
});
