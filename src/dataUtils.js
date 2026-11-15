import { normalizeLimits } from './finance.js';

export function createBackup({ expenses, tasks, limits }) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), expenses, tasks, limits }, null, 2);
}

export function expensesToCsv(expenses) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = expenses.map((item) => [item.date, item.title, item.category, String(item.amount).replace('.', ',')].map(escape).join(';'));
  return `\uFEFF${['Дата', 'Название', 'Категория', 'Сумма'].map(escape).join(';')}\r\n${rows.join('\r\n')}`;
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.expenses) || !Array.isArray(data.tasks)) throw new Error('INVALID_BACKUP');
  const expenses = data.expenses.filter((item) => item && typeof item.title === 'string' && Number(item.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(item.date)).map((item, index) => ({
    id: Number.isInteger(item.id) && item.id > 1000 ? item.id : Date.now() + index,
    title: item.title.slice(0, 200), amount: Number(item.amount), date: item.date,
    category: typeof item.category === 'string' ? item.category : 'Прочее',
  }));
  const tasks = data.tasks.filter((item) => item && typeof item.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)).map((item, index) => ({
    id: Number.isInteger(item.id) && item.id > 1000 ? item.id : Date.now() + index,
    title: item.title.slice(0, 200), date: item.date, done: Boolean(item.done),
    time: /^\d{2}:\d{2}$/.test(item.time) ? item.time : '12:00',
    project: typeof item.project === 'string' ? item.project : 'Личное', priority: 'normal',
  }));
  return { expenses, tasks, limits: normalizeLimits(data.limits) };
}

export function mergeEntries(current, incoming) {
  return [...new Map([...current, ...incoming].map((item) => [item.id, item])).values()];
}
