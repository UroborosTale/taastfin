import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare, WalletCards, CalendarDays, Settings, CircleHelp,
  Plus, Bell, Search, ArrowUpRight, ShieldCheck, SlidersHorizontal,
  ChevronLeft, ChevronRight, ShoppingBag, Coffee, CarFront, House, Utensils,
  HeartPulse, X, Check, Pencil, Trash2, ReceiptText,
  Clock3, Menu, ArrowRight, ListChecks, Shirt, GraduationCap,
} from 'lucide-react';
import { getCalendarDays, getLimitProgress, getMonthStart, getWeekStart, localDate, money, monthName, normalizeLimits, shortDate, spentBetween, withoutDemoEntries } from './finance.js';
import { syncAndroidWidgets } from './widgetSync.js';

const TODAY = localDate();
const categories = [
  { name: 'Продукты', icon: ShoppingBag, color: '#eaf3df', ink: '#648242' },
  { name: 'Кафе', icon: Coffee, color: '#f5eade', ink: '#a77546' },
  { name: 'Транспорт', icon: CarFront, color: '#e5edf5', ink: '#527b9d' },
  { name: 'Дом', icon: House, color: '#eee9f5', ink: '#80689d' },
  { name: 'Рестораны', icon: Utensils, color: '#f7e8e3', ink: '#a86c58' },
  { name: 'Здоровье', icon: HeartPulse, color: '#f7e6e8', ink: '#ae6570' },
  { name: 'Покупки', icon: Shirt, color: '#e8eff0', ink: '#4f7e83' },
  { name: 'Образование', icon: GraduationCap, color: '#eeeedf', ink: '#828342' },
];
const categoryMap = Object.fromEntries(categories.map((category) => [category.name, category]));

function usePersistentState(key, fallback, migrate = (value) => value) {
  const [value, setValue] = useState(() => {
    try { return migrate(JSON.parse(localStorage.getItem(key)) ?? fallback); } catch { return migrate(fallback); }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function Modal({ title, subtitle, children, onClose }) {
  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
      <div className="modal-heading"><span className="eyebrow">ПЛАНЕР</span><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {children}
    </section>
  </div>;
}

function ExpenseForm({ onSave, onClose }) {
  const [form, setForm] = useState({ title: '', amount: '', category: 'Продукты', date: TODAY });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const amount = Number(String(form.amount).replace(',', '.'));
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      setError('Заполните название, корректную сумму и дату'); return;
    }
    onSave({ ...form, title: form.title.trim(), amount, id: Date.now() });
  };
  return <Modal title="Новый расход" subtitle="Запишите трату, чтобы держать бюджет под контролем" onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <label className="amount-field"><span>Сумма</span><div><input autoFocus inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /><b>₽</b></div></label>
      <label>Название<input placeholder="Например, продукты на ужин" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <div className="form-row"><label>Категория<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Дата<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit"><Plus size={18} />Добавить расход</button></div>
    </form>
  </Modal>;
}

function TaskForm({ onSave, onClose, selectedDate }) {
  const [form, setForm] = useState({ title: '', project: 'Личное', date: selectedDate || TODAY, time: '12:00' });
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) { setError('Введите название, дату и время задачи'); return; }
    onSave({ ...form, id: Date.now(), title: form.title.trim(), done: false, priority: 'normal' });
  };
  return <Modal title="Новая задача" subtitle="Добавьте дело и выберите удобное время" onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <label>Что нужно сделать?<input autoFocus placeholder="Название задачи" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <div className="form-row"><label>Дата<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Время<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label></div>
      <label>Раздел<select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}><option>Личное</option><option>Работа</option><option>Дом</option></select></label>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit"><Check size={18} />Создать задачу</button></div>
    </form>
  </Modal>;
}


function LimitsForm({ limits, onSave, onClose }) {
  const [form, setForm] = useState(limits);
  const [error, setError] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, { enabled: value.enabled, amount: Number(value.amount) }]));
    if (Object.values(next).some((value) => value.enabled && (!Number.isFinite(value.amount) || value.amount < 1))) {
      setError('Сумма включённого лимита должна быть больше нуля'); return;
    }
    onSave(next);
  };
  return <Modal title="Лимиты расходов" subtitle="Включите только нужные периоды — по одному или в любом сочетании" onClose={onClose}>
    <form onSubmit={submit} className="modal-form limits-form">
      {[['day', 'На день', 'Контроль ежедневных трат'], ['week', 'На неделю', 'С понедельника по воскресенье'], ['month', 'На месяц', 'Общий бюджет расходов']].map(([key, label, hint]) => <div className={`limit-setting ${form[key].enabled ? 'enabled' : ''}`} key={key}>
        <div className="limit-setting-top"><span>{label}<small>{hint}</small></span><label className="switch"><input type="checkbox" aria-label={`Ограничение ${label.toLowerCase()}`} checked={form[key].enabled} onChange={(e) => setForm({ ...form, [key]: { ...form[key], enabled: e.target.checked } })} /><span /></label></div>
        <div className="input-money"><input type="number" min="1" disabled={!form[key].enabled} aria-label={`Сумма лимита ${label.toLowerCase()}`} value={form[key].amount} onChange={(e) => setForm({ ...form, [key]: { ...form[key], amount: e.target.value } })} /><b>₽</b></div>
      </div>)}
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit">Сохранить настройки</button></div>
    </form>
  </Modal>;
}

function Sidebar({ active, onNavigate, open, onClose, taskCount }) {
  const nav = [
    { id: 'finance', label: 'Финансы', icon: WalletCards },
    { id: 'tasks', label: 'Мои задачи', icon: CheckSquare, badge: taskCount },
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  ];
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <div className="brand"><div className="brand-mark"><Check size={22} strokeWidth={3} /></div><div><strong>планер</strong><span>баланс дел и денег</span></div></div>
    <button className="icon-button mobile-close" onClick={onClose} aria-label="Закрыть меню"><X size={20} /></button>
    <nav><span className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</span>{nav.map(({ id, label, icon: Icon, badge }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onNavigate(id)}><Icon size={20} /><span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav>
    <div className="sidebar-spacer" />
    <div className="goal-card local-data-card"><div className="goal-icon"><ShieldCheck size={19} /></div><span>Ваши данные</span><strong>Только на устройстве</strong><small>Никаких аккаунтов и передачи данных на сервер</small></div>
    <div className="sidebar-bottom"><button onClick={() => onNavigate('settings')}><Settings size={19} />Настройки</button><button onClick={() => onNavigate('help')}><CircleHelp size={19} />Помощь</button></div>
  </aside>;
}


function StatCards({ expenses }) {
  const monthSpent = spentBetween(expenses, getMonthStart());
  const daySpent = spentBetween(expenses, new Date());
  const weekSpent = spentBetween(expenses, getWeekStart());
  const monthCount = expenses.filter((item) => item.date >= localDate(getMonthStart()) && item.date <= TODAY).length;
  return <section className="stat-cards" aria-label="Сводка финансов">
    <article className="stat-card balance-card"><div className="stat-top"><span>Расходы за месяц</span><div className="stat-icon"><WalletCards size={20} /></div></div><strong>{money(monthSpent)}</strong><div className="stat-bottom"><span className="positive"><ReceiptText size={14} />{monthCount}</span><span>операций в этом месяце</span></div><div className="balance-orb orb-one" /><div className="balance-orb orb-two" /></article>
    <article className="stat-card"><div className="stat-top"><span>Расходы за сегодня</span><div className="stat-icon income"><CalendarDays size={20} /></div></div><strong>{money(daySpent)}</strong><div className="stat-bottom"><span>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())}</span></div></article>
    <article className="stat-card"><div className="stat-top"><span>Расходы за неделю</span><div className="stat-icon expense"><ArrowUpRight size={20} /></div></div><strong>{money(weekSpent)}</strong><div className="stat-bottom"><span>С понедельника по воскресенье</span></div></article>
  </section>;
}

function SpendingChart({ expenses }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 6 + index);
    const key = localDate(date);
    return { key, label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''), value: expenses.filter((item) => item.date === key).reduce((sum, item) => sum + item.amount, 0) };
  }), [expenses]);
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const max = Math.max(...days.map((day) => day.value), 1000);
  const points = days.map((day, index) => ({ ...day, x: 42 + index * 88, y: 137 - (day.value / max) * 100 }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return <article className="card chart-card" id="finance">
    <div className="card-header"><div><h2>Движение средств</h2><p>Ваши расходы за последние 7 дней</p></div><span className="period-button">Неделя</span></div>
    <div className="chart-summary"><strong>{money(total)}</strong><span><i />Расходы</span></div>
    <div className="chart-wrap"><svg viewBox="0 0 620 165" role="img" aria-label="График расходов за неделю">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#75936b" stopOpacity=".22" /><stop offset="100%" stopColor="#75936b" stopOpacity="0" /></linearGradient></defs>
      {[37, 87, 137].map((y) => <line key={y} x1="20" x2="600" y1={y} y2={y} stroke="#e9ece6" strokeDasharray="4 5" />)}
      <path d={`${path} L 570 145 L 42 145 Z`} fill="url(#area)" /><path d={path} fill="none" stroke="#52775b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => <g key={point.key}><circle cx={point.x} cy={point.y} r={index === 6 ? 6 : 4} fill="#fff" stroke="#52775b" strokeWidth="3" />{index === 6 && <g><rect x={point.x - 32} y={point.y - 35} width="64" height="24" rx="7" fill="#315c48" /><text x={point.x} y={point.y - 19} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{point.value.toLocaleString('ru-RU')} ₽</text></g>}</g>)}
    </svg><div className="chart-labels">{days.map((day) => <span className={day.key === TODAY ? 'today' : ''} key={day.key}>{day.label}</span>)}</div></div>
  </article>;
}

function LimitsPanel({ limits, expenses, onEdit }) {
  const values = [
    { key: 'day', title: 'На сегодня', spent: spentBetween(expenses, new Date()), color: '#708b52' },
    { key: 'week', title: 'На неделю', spent: spentBetween(expenses, getWeekStart()), color: '#527b76' },
    { key: 'month', title: 'На месяц', spent: spentBetween(expenses, getMonthStart()), color: '#b08a58' },
  ].filter(({ key }) => limits[key].enabled);
  return <article className="card limits-card"><div className="card-header"><div><h2>Мои лимиты</h2><p>{values.length ? `Включено: ${values.length}` : 'Ограничения не включены'}</p></div><button className="icon-button" onClick={onEdit} aria-label="Изменить лимиты"><Pencil size={17} /></button></div>
    {values.length ? <div className="limits-list">{values.map(({ key, title, spent, color }) => {
      const limit = limits[key].amount;
      const percent = getLimitProgress(spent, limit);
      return <div className="limit-item" key={key}><div className="limit-heading"><span>{title}</span><span><b>{money(spent)}</b> / {money(limit)}</span></div><div className="limit-track"><i style={{ width: `${percent}%`, background: percent >= 100 ? '#c46c5e' : color }} /></div><div className="limit-footer"><span>{percent}% использовано</span><span className={spent > limit ? 'over-limit' : ''}>{spent > limit ? `Превышение ${money(spent - limit)}` : `Осталось ${money(limit - spent)}`}</span></div></div>;
    })}</div> : <div className="limits-empty"><SlidersHorizontal size={28} /><strong>Настройте ограничения</strong><span>Можно выбрать день, неделю, месяц или любое сочетание</span></div>}
    <button className="text-button limits-edit" onClick={onEdit}>Настроить лимиты<ArrowRight size={16} /></button>
  </article>;
}


function CalendarCard({ tasks, expenses, selectedDate, setSelectedDate, onAddTask }) {
  const [month, setMonth] = useState(new Date());
  const days = useMemo(() => getCalendarDays(month), [month]);
  const changeMonth = (direction) => setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
  const selectedTasks = tasks.filter((task) => task.date === selectedDate);
  const selectedSpent = expenses.filter((item) => item.date === selectedDate).reduce((sum, item) => sum + item.amount, 0);
  return <article className="card calendar-card" id="calendar">
    <div className="card-header calendar-header"><div><h2>Календарь</h2><p>Планы и расходы на месяц</p></div><button className="icon-button small-add" onClick={() => onAddTask(selectedDate)} aria-label="Добавить задачу на выбранную дату"><Plus size={18} /></button></div>
    <div className="calendar-month"><button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц"><ChevronLeft size={18} /></button><strong>{monthName(month)}</strong><button className="icon-button" onClick={() => changeMonth(1)} aria-label="Следующий месяц"><ChevronRight size={18} /></button></div>
    <div className="calendar-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{days.map((day) => {
      const hasTask = tasks.some((task) => task.date === day.key && !task.done);
      const hasExpense = expenses.some((item) => item.date === day.key);
      return <button key={day.key} className={`${!day.inMonth ? 'other-month' : ''} ${day.key === TODAY ? 'calendar-today' : ''} ${day.key === selectedDate ? 'selected' : ''}`} onClick={() => setSelectedDate(day.key)} aria-label={`${day.day} ${monthName(day.date)}`}><span>{day.day}</span><i className={`${hasTask ? 'has-task' : ''} ${hasExpense ? 'has-expense' : ''}`} /></button>;
    })}</div>
    <div className="calendar-selection"><div><span>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</span><small>{selectedTasks.length ? `${selectedTasks.length} ${selectedTasks.length === 1 ? 'задача' : 'задачи'}` : 'Свободный день'}</small></div>{selectedSpent > 0 && <strong>− {money(selectedSpent)}</strong>}</div>
  </article>;
}

function TasksCard({ tasks, onToggle, onAdd, onDelete }) {
  const [tab, setTab] = useState('today');
  const visible = (tab === 'today' ? tasks.filter((task) => task.date === TODAY) : tab === 'upcoming' ? tasks.filter((task) => task.date > TODAY) : tasks)
    .slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return <article className="card tasks-card" id="tasks">
    <div className="card-header"><div><h2>Мои задачи</h2><p>Планируйте дела и отмечайте результат</p></div><button className="icon-button small-add" onClick={() => onAdd()} aria-label="Добавить задачу"><Plus size={18} /></button></div>
    <div className="task-tabs"><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Сегодня<span>{tasks.filter((task) => task.date === TODAY).length}</span></button><button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Предстоящие</button><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Все задачи</button></div>
    <div className="task-list">{visible.length ? visible.map((task) => <div className={`task-item ${task.done ? 'task-done' : ''}`} key={task.id}><button className="task-check" onClick={() => onToggle(task.id)} aria-label={task.done ? 'Вернуть задачу' : 'Выполнить задачу'}>{task.done && <Check size={14} />}</button><div className="task-info"><strong>{task.title}</strong><span><i className={`project-dot ${task.project.toLowerCase()}`} />{task.project}<b>·</b><Clock3 size={12} />{shortDate(task.date)}, {task.time}</span></div><button className="task-delete" onClick={() => onDelete(task.id)} aria-label={`Удалить ${task.title}`}><Trash2 size={15} /></button></div>) : <div className="empty-state"><ListChecks size={28} /><strong>Задач пока нет</strong><span>Добавьте первое дело</span></div>}</div>
    <button className="text-button all-tasks" onClick={() => onAdd()}><Plus size={16} />Добавить задачу</button>
  </article>;
}

function DayAgenda({ tasks, expenses, selectedDate, onToggle, onAdd, onDelete }) {
  const dayTasks = tasks.filter((task) => task.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const daySpent = expenses.filter((item) => item.date === selectedDate).reduce((sum, item) => sum + item.amount, 0);
  const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`));
  return <article className="card day-agenda"><div className="card-header"><div><h2>{date}</h2><p>{dayTasks.length ? `Задач: ${dayTasks.length}` : 'Планов пока нет'}</p></div><button className="icon-button small-add" onClick={() => onAdd(selectedDate)} aria-label="Добавить задачу на выбранную дату"><Plus size={18} /></button></div>
    {daySpent > 0 && <div className="agenda-spent"><span>Расходы за этот день</span><strong>− {money(daySpent)}</strong></div>}
    <div className="task-list">{dayTasks.length ? dayTasks.map((task) => <div className={`task-item ${task.done ? 'task-done' : ''}`} key={task.id}><button className="task-check" onClick={() => onToggle(task.id)} aria-label={task.done ? 'Вернуть задачу' : 'Выполнить задачу'}>{task.done && <Check size={14} />}</button><div className="task-info"><strong>{task.title}</strong><span>{task.project}<b>·</b><Clock3 size={12} />{task.time}</span></div><button className="task-delete" onClick={() => onDelete(task.id)} aria-label={`Удалить ${task.title}`}><Trash2 size={15} /></button></div>) : <div className="empty-state"><CalendarDays size={28} /><strong>Свободный день</strong><span>Добавьте задачу на эту дату</span></div>}</div>
    <button className="text-button all-tasks" onClick={() => onAdd(selectedDate)}><Plus size={16} />Добавить задачу</button>
  </article>;
}

function ExpenseList({ expenses, onDelete, onAdd }) {
  const [query, setQuery] = useState('');
  const filtered = expenses.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <article className="card expenses-card"><div className="card-header"><div><h2>Последние расходы</h2><p>История ваших операций</p></div><div className="expense-actions"><label className="list-search"><Search size={16} /><input placeholder="Найти расход" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="text-button" onClick={onAdd}>Добавить<Plus size={16} /></button></div></div>
    <div className="expense-table"><div className="expense-table-head"><span>ОПЕРАЦИЯ</span><span>КАТЕГОРИЯ</span><span>ДАТА</span><span>СУММА</span><span /></div>{filtered.slice(0, 5).map((item) => {
      const category = categoryMap[item.category] || categories[0]; const Icon = category.icon;
      return <div className="expense-row" key={item.id}><div className="expense-name"><span style={{ background: category.color, color: category.ink }}><Icon size={19} /></span><strong>{item.title}</strong></div><span className="category-pill">{item.category}</span><span className="expense-date">{item.date === TODAY ? 'Сегодня' : shortDate(item.date)}</span><strong className="expense-amount">− {money(item.amount)}</strong><button className="icon-button delete-expense" onClick={() => onDelete(item.id)} aria-label={`Удалить ${item.title}`}><Trash2 size={16} /></button></div>;
    })}{!filtered.length && <div className="empty-expenses">{query ? 'По вашему запросу ничего не найдено.' : 'Расходов пока нет. Нажмите «Добавить», чтобы внести первую трату.'}</div>}</div>
  </article>;
}


export default function App() {
  const [expenses, setExpenses] = usePersistentState('planer-expenses', [], withoutDemoEntries);
  const [tasks, setTasks] = usePersistentState('planer-tasks', [], withoutDemoEntries);
  const [limits, setLimits] = usePersistentState('planer-limits', null, normalizeLimits);
  const [active, setActive] = useState('finance');
  const [modal, setModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [taskDate, setTaskDate] = useState(TODAY);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => { syncAndroidWidgets({ expenses, tasks, limits }); }, [expenses, tasks, limits]);

  const navigate = (section) => {
    setSidebarOpen(false);
    if (section === 'settings') { setModal('limits'); return; }
    if (section === 'help') { setModal('help'); return; }
    setActive(section);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };
  const openTask = (date = TODAY) => { setTaskDate(date); setModal('task'); };
  const saveExpense = (expense) => { setExpenses((items) => [expense, ...items]); setModal(null); setToast('Расход успешно добавлен'); };
  const saveTask = (task) => { setTasks((items) => [...items, task]); setSelectedDate(task.date); setModal(null); setToast('Задача добавлена в планер'); };
  const greeting = new Date().getHours() < 12 ? 'Доброе утро' : new Date().getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const fullDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const undoneToday = tasks.filter((task) => task.date === TODAY && !task.done).length;
  const section = {
    finance: { title: 'Финансы', subtitle: 'Учёт расходов и контроль бюджета' },
    tasks: { title: 'Задачи', subtitle: 'Все ваши дела в отдельном разделе' },
    calendar: { title: 'Календарь', subtitle: 'Планы и расходы по датам' },
  }[active];
  const taskActions = {
    onToggle: (id) => setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task)),
    onAdd: openTask,
    onDelete: (id) => { setTasks((items) => items.filter((task) => task.id !== id)); setToast('Задача удалена'); },
  };

  return <div className="app-shell">
    {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    <Sidebar active={active} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} taskCount={undoneToday} />
    <main className="main-content" id="page-top">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu size={22} /></button><div className="greeting"><span>{fullDate}</span><h1>{greeting} <span>👋</span></h1><p>Всё важное — в одном месте</p></div><div className="top-actions"><button className="icon-button search-top" onClick={() => navigate('finance')} aria-label="Поиск по расходам"><Search size={20} /></button><div className="notification-wrap"><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Уведомления"><Bell size={20} /><i /></button>{notificationsOpen && <div className="notifications"><strong>Сегодня в плане</strong><p>{undoneToday ? `${undoneToday} ${undoneToday === 1 ? 'задача ждёт' : 'задачи ждут'} выполнения` : 'Все задачи выполнены!'}</p><span>{limits.day.enabled ? `Дневной лимит: ${money(Math.max(0, limits.day.amount - spentBetween(expenses, new Date())))} свободно` : 'Дневной лимит не задан'}</span></div>}</div><button className="button primary add-expense-top" onClick={() => setModal('expense')}><Plus size={19} />Добавить расход</button></div></header>
      <div className="content-heading"><div><h2>{section.title}</h2><p>{section.subtitle}</p></div><div className="month-picker"><CalendarDays size={17} />{monthName(new Date())}</div></div>
      {active === 'finance' && <>
        <StatCards expenses={expenses} />
        <div className="dashboard-grid"><SpendingChart expenses={expenses} /><LimitsPanel limits={limits} expenses={expenses} onEdit={() => setModal('limits')} /></div>
        <ExpenseList expenses={expenses} onDelete={(id) => { setExpenses((items) => items.filter((item) => item.id !== id)); setToast('Расход удалён'); }} onAdd={() => setModal('expense')} />
      </>}
      {active === 'tasks' && <div className="tasks-page"><TasksCard tasks={tasks} {...taskActions} /></div>}
      {active === 'calendar' && <div className="calendar-page"><CalendarCard tasks={tasks} expenses={expenses} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onAddTask={openTask} /><DayAgenda tasks={tasks} expenses={expenses} selectedDate={selectedDate} {...taskActions} /></div>}
      <footer><span>планер</span><p>Ваши дела и финансы под контролем</p><span>Данные хранятся на устройстве</span></footer>
    </main>
    <nav className="mobile-nav">{[{ id: 'finance', icon: WalletCards, label: 'Финансы' }, { id: 'tasks', icon: CheckSquare, label: 'Задачи' }, { id: 'add', icon: Plus, label: '' }, { id: 'calendar', icon: CalendarDays, label: 'Календарь' }, { id: 'settings', icon: SlidersHorizontal, label: 'Лимиты' }].map(({ id, icon: Icon, label }) => id === 'add' ? <button key={id} className="mobile-add" onClick={() => setModal('expense')} aria-label="Добавить расход"><Icon size={25} /></button> : <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>
    {modal === 'expense' && <ExpenseForm onSave={saveExpense} onClose={() => setModal(null)} />}
    {modal === 'task' && <TaskForm selectedDate={taskDate} onSave={saveTask} onClose={() => setModal(null)} />}
    {modal === 'limits' && <LimitsForm limits={limits} onSave={(next) => { setLimits(next); setModal(null); setToast('Лимиты обновлены'); }} onClose={() => setModal(null)} />}
    {modal === 'help' && <Modal title="Как пользоваться планером" subtitle="Все основные действия — в одном месте" onClose={() => setModal(null)}><div className="help-content"><p><b>Добавляйте расходы</b>Нажмите «Добавить расход», укажите сумму, категорию и дату.</p><p><b>Планируйте дела</b>Выберите день в календаре и нажмите плюс, чтобы создать задачу.</p><p><b>Следите за лимитами</b>Нажмите карандаш в блоке «Мои лимиты», чтобы изменить бюджет.</p><span>Все данные автоматически сохраняются на этом устройстве.</span></div></Modal>}
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}</div>}
  </div>;
}

