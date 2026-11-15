import { useState } from 'react';
import { DatabaseBackup, Download, FileSpreadsheet, PieChart, Upload } from 'lucide-react';
import { getMonthStart, localDate, money } from './finance.js';
import { createBackup, expensesToCsv, parseBackup } from './dataUtils.js';
import { shareOrDownload } from './dataTransfer.js';

export function CategoryAnalytics({ expenses, categoryMap }) {
  const month = localDate(getMonthStart());
  const monthExpenses = expenses.filter((item) => item.date >= month);
  const total = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totals = Object.values(monthExpenses.reduce((groups, item) => {
    groups[item.category] ??= { name: item.category, amount: 0 };
    groups[item.category].amount += item.amount;
    return groups;
  }, {})).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return <article className="card category-card"><div className="card-header"><div><h2>По категориям</h2><p>Структура расходов за месяц</p></div><PieChart size={19} color="#69835d" /></div>
    {totals.length ? <div className="category-list">{totals.map((item) => {
      const category = categoryMap[item.name]; const percent = Math.round(item.amount / total * 100);
      return <div className="category-item" key={item.name}><div className="category-item-heading"><span><i style={{ background: category?.ink || '#829078' }} />{item.name}</span><strong>{money(item.amount)}<small>{percent}%</small></strong></div><div className="category-track"><i style={{ width: `${percent}%`, background: category?.ink || '#829078' }} /></div></div>;
    })}</div> : <div className="tools-empty"><PieChart size={27} /><span>Добавьте расходы, чтобы увидеть распределение по категориям</span></div>}
  </article>;
}

export function DataTools({ expenses, tasks, limits, onRestore, onNotify }) {
  const [busy, setBusy] = useState('');
  const exportFile = async (type) => {
    setBusy(type);
    try {
      const date = localDate();
      if (type === 'csv') await shareOrDownload(`planer-expenses-${date}.csv`, expensesToCsv(expenses), 'text/csv;charset=utf-8');
      else await shareOrDownload(`planer-backup-${date}.json`, createBackup({ expenses, tasks, limits }), 'application/json');
      onNotify(type === 'csv' ? 'CSV-файл подготовлен' : 'Резервная копия подготовлена');
    } catch (error) {
      if (!/cancel/i.test(error?.message || '')) onNotify('Не удалось подготовить файл');
    } finally { setBusy(''); }
  };
  const restore = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy('restore');
    try {
      onRestore(parseBackup(await file.text()));
      onNotify('Данные из копии добавлены');
    } catch { onNotify('Выберите корректную резервную копию Планера'); }
    finally { setBusy(''); event.target.value = ''; }
  };
  return <article className="card data-card"><div className="card-header"><div><h2>Мои данные</h2><p>Экспорт и резервное копирование</p></div><DatabaseBackup size={19} color="#69835d" /></div>
    <p className="data-description">Сохраните копию локально или отправьте её в облако. Восстановление не удаляет текущие записи.</p>
    <div className="data-buttons"><button className="data-button" disabled={!expenses.length || Boolean(busy)} onClick={() => exportFile('csv')}><FileSpreadsheet size={17} /><span>Экспорт CSV<small>Таблица расходов</small></span></button>
      <button className="data-button" disabled={Boolean(busy)} onClick={() => exportFile('json')}><Download size={17} /><span>Резервная копия<small>Расходы, задачи, лимиты</small></span></button>
      <label className={`data-button ${busy ? 'disabled' : ''}`}><Upload size={17} /><span>Восстановить<small>Импорт JSON-копии</small></span><input type="file" accept=".json,application/json" disabled={Boolean(busy)} onChange={restore} hidden /></label>
    </div>
  </article>;
}
