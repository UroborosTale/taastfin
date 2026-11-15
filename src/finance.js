export const money = (value) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`;

export const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const shiftDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};

export function getWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function spentBetween(expenses, start, end = new Date()) {
  const from = localDate(start);
  const to = localDate(end);
  return expenses.filter((item) => item.date >= from && item.date <= to).reduce((sum, item) => sum + Number(item.amount), 0);
}

export function getLimitProgress(spent, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((spent / limit) * 100));
}

export function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, key: localDate(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

export const monthName = (date) => new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date).replace(' г.', '');
export const shortDate = (dateString) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${dateString}T12:00:00`)).replace('.', '');
