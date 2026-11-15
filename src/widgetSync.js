import { Capacitor, registerPlugin } from '@capacitor/core';
import { localDate, spentBetween } from './finance.js';

const PlanerWidget = registerPlugin('PlanerWidget');

export function syncAndroidWidgets({ expenses, tasks, limits }) {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  const today = localDate();
  const daySpent = spentBetween(expenses, new Date());
  const widgetTasks = tasks
    .filter((task) => task.date === today && !task.done)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 8)
    .map(({ title, time, project }) => ({ title, time, project }));

  const dayLimit = limits.day.enabled ? Number(limits.day.amount) : 0;
  return PlanerWidget.updateWidgetData({
    daySpent,
    dayLimit,
    limitEnabled: limits.day.enabled,
    remaining: Math.max(0, dayLimit - daySpent),
    dataDate: today,
    tasks: widgetTasks,
  }).catch((error) => console.warn('Не удалось обновить Android-виджеты', error));
}
