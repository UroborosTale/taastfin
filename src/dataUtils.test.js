import { describe, expect, it } from 'vitest';
import { createBackup, expensesToCsv, mergeEntries, parseBackup } from './dataUtils.js';

const expenses = [{ id: 1001, title: 'Кофе; "Зерно"', amount: 350.5, category: 'Кафе', date: '2026-11-15' }];
const tasks = [{ id: 1002, title: 'Моя задача', date: '2026-11-15', time: '10:00', project: 'Личное', done: false }];

describe('data tools', () => {
  it('exports Excel-compatible escaped CSV', () => {
    const csv = expensesToCsv(expenses);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Кофе; ""Зерно"""');
    expect(csv).toContain('"350,5"');
  });

  it('round-trips backup and merges without duplicates', () => {
    const backup = parseBackup(createBackup({ expenses, tasks, limits: null }));
    expect(backup.expenses).toEqual(expenses);
    expect(backup.limits.day.enabled).toBe(false);
    expect(mergeEntries(expenses, expenses)).toHaveLength(1);
  });

  it('rejects invalid backup and skips malformed entries', () => {
    expect(() => parseBackup('{}')).toThrow('INVALID_BACKUP');
    const backup = parseBackup(JSON.stringify({ expenses: [{ title: 'bad' }, ...expenses], tasks: [] }));
    expect(backup.expenses).toHaveLength(1);
  });
});
