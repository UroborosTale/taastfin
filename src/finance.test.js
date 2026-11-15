import { describe, expect, it } from 'vitest';
import { getCalendarDays, getLimitProgress, getWeekStart, localDate, normalizeLimits, spentBetween, withoutDemoEntries } from './finance.js';

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

  it('removes bundled demo entries but preserves user entries', () => {
    const entries = [{ id: 1, title: 'Демо' }, { id: Date.now(), title: 'Моя запись' }];
    expect(withoutDemoEntries(entries)).toEqual([entries[1]]);
    expect(withoutDemoEntries(null)).toEqual([]);
  });

  it('starts with all limits disabled and migrates old values safely', () => {
    expect(normalizeLimits(null)).toEqual({
      day: { enabled: false, amount: 2500 },
      week: { enabled: false, amount: 15000 },
      month: { enabled: false, amount: 45000 },
    });
    expect(normalizeLimits({ day: 3000, week: { enabled: true, amount: 12000 } })).toEqual({
      day: { enabled: false, amount: 3000 },
      week: { enabled: true, amount: 12000 },
      month: { enabled: false, amount: 45000 },
    });
  });
});
