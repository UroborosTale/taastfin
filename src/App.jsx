import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, CheckSquare, WalletCards, CalendarDays, Settings, CircleHelp,
  Plus, Bell, Search, ArrowUpRight, ArrowDownLeft, MoreHorizontal, ChevronDown,
  ChevronLeft, ChevronRight, ShoppingBag, Coffee, CarFront, House, Utensils,
  HeartPulse, BriefcaseBusiness, X, Check, Pencil, Trash2, Target, TrendingUp,
  Clock3, Menu, ReceiptText, ArrowRight, ListChecks, Shirt, GraduationCap,
} from 'lucide-react';
import { getCalendarDays, getLimitProgress, getMonthStart, getWeekStart, localDate, money, monthName, shiftDate, shortDate, spentBetween } from './finance.js';
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

const initialExpenses = [
  { id: 1, title: 'Супермаркет «ВкусВилл»', category: 'Продукты', amount: 1250, date: TODAY },
  { id: 2, title: 'Кофе с собой', category: 'Кафе', amount: 350, date: TODAY },
  { id: 3, title: 'Такси до центра', category: 'Транспорт', amount: 1800, date: shiftDate(-1) },
  { id: 4, title: 'Ужин с друзьями', category: 'Рестораны', amount: 2890, date: shiftDate(-1) },
  { id: 5, title: 'Продукты на неделю', category: 'Продукты', amount: 1450, date: shiftDate(-2) },
  { id: 6, title: 'Аптека', category: 'Здоровье', amount: 990, date: shiftDate(-2) },
  { id: 7, title: 'Товары для дома', category: 'Дом', amount: 5400, date: shiftDate(-3) },
  { id: 8, title: 'Фермерский рынок', category: 'Продукты', amount: 2300, date: shiftDate(-4) },
  { id: 9, title: 'Завтрак в кафе', category: 'Кафе', amount: 760, date: shiftDate(-4) },
  { id: 10, title: 'Одежда', category: 'Покупки', amount: 8900, date: shiftDate(-5) },
  { id: 11, title: 'Аренда квартиры', category: 'Дом', amount: 12400, date: shiftDate(-7) },
  { id: 12, title: 'Онлайн-курс', category: 'Образование', amount: 5660, date: shiftDate(-8) },
];
const initialTasks = [
  { id: 1, title: 'Подготовить презентацию', project: 'Работа', date: TODAY, time: '12:00', done: false, priority: 'high' },
  { id: 2, title: 'Оплатить интернет', project: 'Дом', date: TODAY, time: '18:00', done: false, priority: 'normal' },
  { id: 3, title: 'Забрать посылку', project: 'Личное', date: TODAY, time: '19:30', done: true, priority: 'normal' },
  { id: 4, title: 'Позвонить маме', project: 'Личное', date: shiftDate(1), time: '20:00', done: false, priority: 'normal' },
  { id: 5, title: 'Запланировать неделю', project: 'Личное', date: shiftDate(2), time: '10:00', done: false, priority: 'normal' },
];
const defaultLimits = { day: 2500, week: 15000, month: 45000 };

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
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
    const next = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)]));
    if (Object.values(next).some((value) => !value || value < 1)) { setError('Все лимиты должны быть больше нуля'); return; }
    onSave(next);
  };
  return <Modal title="Лимиты расходов" subtitle="Установите комфортную сумму на каждый период" onClose={onClose}>
    <form onSubmit={submit} className="modal-form limits-form">
      {[['day', 'На день', 'Контроль ежедневных трат'], ['week', 'На неделю', 'С понедельника по воскресенье'], ['month', 'На месяц', 'Общий бюджет расходов']].map(([key, label, hint]) => <label key={key}><span>{label}<small>{hint}</small></span><div className="input-money"><input type="number" min="1" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /><b>₽</b></div></label>)}
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit">Сохранить лимиты</button></div>
    </form>
  </Modal>;
}

function Sidebar({ active, onNavigate, open, onClose, taskCount }) {
  const nav = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { id: 'tasks', label: 'Мои задачи', icon: CheckSquare, badge: taskCount },
    { id: 'finance', label: 'Финансы', icon: WalletCards },
    { id: 'calendar', label: 'Календарь', icon: CalendarDays },
  ];
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <div className="brand"><div className="brand-mark"><Check size={22} strokeWidth={3} /></div><div><strong>планер</strong><span>баланс дел и денег</span></div></div>
    <button className="icon-button mobile-close" onClick={onClose} aria-label="Закрыть меню"><X size={20} /></button>
    <nav><span className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</span>{nav.map(({ id, label, icon: Icon, badge }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onNavigate(id)}><Icon size={20} /><span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav>
    <div className="sidebar-spacer" />
    <div className="goal-card"><div className="goal-icon"><Target size={19} /></div><span>Финансовая цель</span><strong>На путешествие</strong><div className="goal-values"><b>68 400 ₽</b><span>из 120 000 ₽</span></div><div className="goal-track"><i /></div><small>57% уже накоплено</small></div>
    <div className="sidebar-bottom"><button onClick={() => onNavigate('settings')}><Settings size={19} />Настройки</button><button onClick={() => onNavigate('help')}><CircleHelp size={19} />Помощь</button></div>
    <div className="profile"><div className="avatar">АС</div><div><strong>Анна Смирнова</strong><span>Личный аккаунт</span></div><MoreHorizontal size={19} /></div>
  </aside>;
}


function StatCards({ expenses }) {
  const total = spentBetween(expenses, getMonthStart());
  const income = 128400;
  const expenseRatio = (total / income * 100).toFixed(1).replace('.', ',');
  return <section className="stat-cards" aria-label="Сводка финансов">
    <article className="stat-card balance-card"><div className="stat-top"><span>Общий баланс</span><div className="stat-icon"><WalletCards size={20} /></div></div><strong>{money(income - total)}</strong><div className="stat-bottom"><span className="positive"><TrendingUp size={14} />12,5%</span><span>к прошлому месяцу</span></div><div className="balance-orb orb-one" /><div className="balance-orb orb-two" /></article>
    <article className="stat-card"><div className="stat-top"><span>Доходы за месяц</span><div className="stat-icon income"><ArrowDownLeft size={20} /></div></div><strong>{money(income)}</strong><div className="stat-bottom"><span className="positive"><ArrowUpRight size={14} />8,2%</span><span>к прошлому месяцу</span></div></article>
    <article className="stat-card"><div className="stat-top"><span>Расходы за месяц</span><div className="stat-icon expense"><ArrowUpRight size={20} /></div></div><strong>{money(total)}</strong><div className="stat-bottom"><span className="neutral-change">{expenseRatio}%</span><span>от суммы доходов</span></div></article>
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
  ];
  return <article className="card limits-card"><div className="card-header"><div><h2>Мои лимиты</h2><p>Контроль расходов</p></div><button className="icon-button" onClick={onEdit} aria-label="Изменить лимиты"><Pencil size={17} /></button></div>
    <div className="limits-list">{values.map(({ key, title, spent, color }) => {
      const percent = getLimitProgress(spent, limits[key]);
      return <div className="limit-item" key={key}><div className="limit-heading"><span>{title}</span><span><b>{money(spent)}</b> / {money(limits[key])}</span></div><div className="limit-track"><i style={{ width: `${percent}%`, background: percent >= 100 ? '#c46c5e' : color }} /></div><div className="limit-footer"><span>{percent}% использовано</span><span className={spent > limits[key] ? 'over-limit' : ''}>{spent > limits[key] ? `Превышение ${money(spent - limits[key])}` : `Осталось ${money(limits[key] - spent)}`}</span></div></div>;
    })}</div><button className="text-button limits-edit" onClick={onEdit}>Настроить лимиты<ArrowRight size={16} /></button>
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
  const visible = tab === 'today' ? tasks.filter((task) => task.date === TODAY) : tasks.filter((task) => task.date > TODAY);
  return <article className="card tasks-card" id="tasks">
    <div className="card-header"><div><h2>Мои задачи</h2><p>Маленькие шаги — большие результаты</p></div><button className="icon-button small-add" onClick={() => onAdd()} aria-label="Добавить задачу"><Plus size={18} /></button></div>
    <div className="task-tabs"><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Сегодня<span>{tasks.filter((task) => task.date === TODAY).length}</span></button><button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Предстоящие</button></div>
    <div className="task-list">{visible.length ? visible.slice(0, 4).map((task) => <div className={`task-item ${task.done ? 'task-done' : ''}`} key={task.id}><button className="task-check" onClick={() => onToggle(task.id)} aria-label={task.done ? 'Вернуть задачу' : 'Выполнить задачу'}>{task.done && <Check size={14} />}</button><div className="task-info"><strong>{task.title}</strong><span><i className={`project-dot ${task.project.toLowerCase()}`} />{task.project}<b>·</b><Clock3 size={12} />{task.time}</span></div><button className="task-delete" onClick={() => onDelete(task.id)} aria-label={`Удалить ${task.title}`}><Trash2 size={15} /></button></div>) : <div className="empty-state"><ListChecks size={28} /><strong>Задач пока нет</strong><span>Добавьте первое дело</span></div>}</div>
    <button className="text-button all-tasks" onClick={() => onAdd()}><Plus size={16} />Добавить задачу</button>
  </article>;
}

function ExpenseList({ expenses, onDelete, onAdd }) {
  const [query, setQuery] = useState('');
  const filtered = expenses.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <article className="card expenses-card"><div className="card-header"><div><h2>Последние расходы</h2><p>История ваших операций</p></div><div className="expense-actions"><label className="list-search"><Search size={16} /><input placeholder="Найти расход" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="text-button" onClick={onAdd}>Добавить<Plus size={16} /></button></div></div>
    <div className="expense-table"><div className="expense-table-head"><span>ОПЕРАЦИЯ</span><span>КАТЕГОРИЯ</span><span>ДАТА</span><span>СУММА</span><span /></div>{filtered.slice(0, 5).map((item) => {
      const category = categoryMap[item.category] || categories[0]; const Icon = category.icon;
      return <div className="expense-row" key={item.id}><div className="expense-name"><span style={{ background: category.color, color: category.ink }}><Icon size={19} /></span><strong>{item.title}</strong></div><span className="category-pill">{item.category}</span><span className="expense-date">{item.date === TODAY ? 'Сегодня' : shortDate(item.date)}</span><strong className="expense-amount">− {money(item.amount)}</strong><button className="icon-button delete-expense" onClick={() => onDelete(item.id)} aria-label={`Удалить ${item.title}`}><Trash2 size={16} /></button></div>;
    })}{!filtered.length && <div className="empty-expenses">Ничего не найдено. Попробуйте изменить запрос.</div>}</div>
  </article>;
}


export default function App() {
  const [expenses, setExpenses] = usePersistentState('planer-expenses', initialExpenses);
  const [tasks, setTasks] = usePersistentState('planer-tasks', initialTasks);
  const [limits, setLimits] = usePersistentState('planer-limits', defaultLimits);
  const [active, setActive] = useState('overview');
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
    requestAnimationFrame(() => document.getElementById(section === 'overview' ? 'page-top' : section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openTask = (date = TODAY) => { setTaskDate(date); setModal('task'); };
  const saveExpense = (expense) => { setExpenses((items) => [expense, ...items]); setModal(null); setToast('Расход успешно добавлен'); };
  const saveTask = (task) => { setTasks((items) => [...items, task]); setSelectedDate(task.date); setModal(null); setToast('Задача добавлена в планер'); };
  const greeting = new Date().getHours() < 12 ? 'Доброе утро' : new Date().getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const fullDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const undoneToday = tasks.filter((task) => task.date === TODAY && !task.done).length;

  return <div className="app-shell">
    {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    <Sidebar active={active} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} taskCount={undoneToday} />
    <main className="main-content" id="page-top">
      <header className="topbar"><button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Открыть меню"><Menu size={22} /></button><div className="greeting"><span>{fullDate}</span><h1>{greeting}, Анна <span>👋</span></h1><p>Всё важное — в одном месте</p></div><div className="top-actions"><button className="icon-button search-top" onClick={() => navigate('finance')} aria-label="Поиск по расходам"><Search size={20} /></button><div className="notification-wrap"><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Уведомления"><Bell size={20} /><i /></button>{notificationsOpen && <div className="notifications"><strong>Сегодня в плане</strong><p>{undoneToday ? `${undoneToday} ${undoneToday === 1 ? 'задача ждёт' : 'задачи ждут'} выполнения` : 'Все задачи выполнены!'}</p><span>Дневной лимит: {money(Math.max(0, limits.day - spentBetween(expenses, new Date())))} свободно</span></div>}</div><button className="button primary add-expense-top" onClick={() => setModal('expense')}><Plus size={19} />Добавить расход</button></div></header>
      <div className="content-heading"><div><h2>Обзор</h2><p>Следите за бюджетом и выполнением планов</p></div><div className="month-picker"><CalendarDays size={17} />{monthName(new Date())}</div></div>
      <StatCards expenses={expenses} />
      <div className="dashboard-grid"><SpendingChart expenses={expenses} /><LimitsPanel limits={limits} expenses={expenses} onEdit={() => setModal('limits')} /></div>
      <div className="dashboard-grid lower-grid"><CalendarCard tasks={tasks} expenses={expenses} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onAddTask={openTask} /><TasksCard tasks={tasks} onToggle={(id) => setTasks((items) => items.map((task) => task.id === id ? { ...task, done: !task.done } : task))} onAdd={openTask} onDelete={(id) => { setTasks((items) => items.filter((task) => task.id !== id)); setToast('Задача удалена'); }} /></div>
      <ExpenseList expenses={expenses} onDelete={(id) => { setExpenses((items) => items.filter((item) => item.id !== id)); setToast('Расход удалён'); }} onAdd={() => setModal('expense')} />
      <footer><span>планер</span><p>Ваши дела и финансы под контролем</p><span>Данные хранятся на устройстве</span></footer>
    </main>
    <nav className="mobile-nav">{[{ id: 'overview', icon: LayoutDashboard, label: 'Обзор' }, { id: 'tasks', icon: CheckSquare, label: 'Задачи' }, { id: 'add', icon: Plus, label: '' }, { id: 'calendar', icon: CalendarDays, label: 'Календарь' }, { id: 'finance', icon: WalletCards, label: 'Финансы' }].map(({ id, icon: Icon, label }) => id === 'add' ? <button key={id} className="mobile-add" onClick={() => setModal('expense')} aria-label="Добавить расход"><Icon size={25} /></button> : <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={21} /><span>{label}</span></button>)}</nav>
    {modal === 'expense' && <ExpenseForm onSave={saveExpense} onClose={() => setModal(null)} />}
    {modal === 'task' && <TaskForm selectedDate={taskDate} onSave={saveTask} onClose={() => setModal(null)} />}
    {modal === 'limits' && <LimitsForm limits={limits} onSave={(next) => { setLimits(next); setModal(null); setToast('Лимиты обновлены'); }} onClose={() => setModal(null)} />}
    {modal === 'help' && <Modal title="Как пользоваться планером" subtitle="Все основные действия — в одном месте" onClose={() => setModal(null)}><div className="help-content"><p><b>Добавляйте расходы</b>Нажмите «Добавить расход», укажите сумму, категорию и дату.</p><p><b>Планируйте дела</b>Выберите день в календаре и нажмите плюс, чтобы создать задачу.</p><p><b>Следите за лимитами</b>Нажмите карандаш в блоке «Мои лимиты», чтобы изменить бюджет.</p><span>Все данные автоматически сохраняются на этом устройстве.</span></div></Modal>}
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}</div>}
  </div>;
}

