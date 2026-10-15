import { useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { database, deleteMeal, loadSnapshot, NutritionDatabase, saveGoalsIfUnchanged, saveMeal } from './data/database.ts';
import { dateLabel, isValidDate, localDate } from './domain/dates.ts';
import { dailyTotals, goalForDate } from './domain/nutrition.ts';
import type { Meal, Snapshot } from './domain/types.ts';
import { DailySummary } from './components/DailySummary.tsx';
import { DeleteDialog } from './components/DeleteDialog.tsx';
import { GoalsForm } from './components/GoalsForm.tsx';
import { InstallPrompt } from './components/InstallPrompt.tsx';
import { MealCard } from './components/MealCard.tsx';
import { MealEditor } from './components/MealEditor.tsx';

type Tab = 'today' | 'history' | 'goals';
export default function App({ db = database }: { db?: NutritionDatabase }) {
  const [tab, setTab] = useState<Tab>('today');
  const [today, setToday] = useState(localDate());
  const [historyDate, setHistoryDate] = useState(localDate());
  const [snapshot, setSnapshot] = useState<Snapshot>({ meals: [], goals: [] });
  const [loading, setLoading] = useState(true); const [storageError, setStorageError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editor, setEditor] = useState<{ initial?: Meal } | null>(null);
  const [deleteId, setDeleteId] = useState<string>();
  const [deleting, setDeleting] = useState(false); const deleteLock = useRef(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setLoading(true);
    const subscription = liveQuery(() => loadSnapshot(db)).subscribe({
      next: data => { setSnapshot(data); setStorageError(''); setLoading(false); },
      error: () => { setStorageError('無法讀取本機飲食資料。請確認瀏覽器允許儲存並有足夠空間；資料未被清除。'); setLoading(false); },
    });
    return () => subscription.unsubscribe();
  }, [db, reloadKey]);
  useEffect(() => {
    const tick = () => setToday(localDate()); const timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const date = tab === 'history' ? historyDate : today;
  const validDate = isValidDate(date);
  const meals = snapshot.meals.filter(meal => meal.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const totals = dailyTotals(snapshot.meals, date);
  const goal = goalForDate(snapshot.goals, date);
  const pastDates = [...new Set(snapshot.meals.map(meal => meal.date))].sort().reverse().slice(0, 10);
  async function confirmDelete() {
    if (!deleteId || deleteLock.current) return;
    deleteLock.current = true; setDeleting(true);
    try { await deleteMeal(deleteId, db); setDeleteId(undefined); setNotice('餐點已刪除。'); }
    catch { setNotice('刪除失敗，餐點尚未移除，請稍後重試。'); }
    finally { deleteLock.current = false; setDeleting(false); }
  }
  async function exportData() {
    try {
      const data = await loadSnapshot(db);
      const backup = { formatVersion: 1, exportedAt: new Date().toISOString(), meals: data.meals.map(({ photo: _photo, ...meal }) => meal), goals: data.goals };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `飲食紀錄-${today}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('已產生備份檔案，請確認下載完成。備份不包含照片。');
    } catch { setNotice('備份匯出失敗，請稍後重試。'); }
  }
  const unavailable = loading || Boolean(storageError);
  return <div className="app-shell">
    <a className="skip-link" href="#main">跳到主要內容</a>
    <header className="app-header"><div className="brand-icon" aria-hidden="true">♧</div><div><h1>餐照營養教練</h1><p>好好吃飯，慢慢進步</p></div><span className="prototype-tag">示範版</span></header>
    <main id="main">
      {notice && <div role="status" className="notice mb-4">{notice}<button className="text-button" aria-label="關閉訊息" onClick={() => setNotice('')}>關閉</button></div>}
      {storageError && <div role="alert" className="error-box">{storageError}<button className="text-button" onClick={() => setReloadKey(n => n + 1)}>重新讀取</button></div>}
      {loading && <p role="status" className="muted">正在讀取本機紀錄…</p>}
      {editor ? <MealEditor initial={editor.initial} date={validDate ? date : today} onClose={() => setEditor(null)} onSave={async meal => {
        await saveMeal(meal, db); if (tab === 'history') setHistoryDate(meal.date); setEditor(null); setNotice('餐點已保存在此裝置。');
      }} /> : <>
        {tab === 'goals' ? <GoalsForm goal={goalForDate(snapshot.goals, today)} goals={snapshot.goals} date={today} onSave={async (goal, expected) => { if (unavailable) throw new Error('儲存不可用'); await saveGoalsIfUnchanged(goal, expected, db); setNotice('目標已保存，將從生效日期開始套用。'); }} /> : <>
          <div className="date-heading"><div><p className="eyebrow">{tab === 'today' ? '今天的飲食紀錄' : '回顧每一天'}</p><h2>{validDate ? dateLabel(date) : '請選擇有效日期'}</h2></div><span className="muted text-sm">{meals.length} 餐</span></div>
          {tab === 'history' && <section className="panel compact mb-4"><label>查詢日期<input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} /></label>{pastDates.length > 0 && <div className="date-chips" aria-label="有紀錄的日期">{pastDates.map(day => <button key={day} aria-pressed={day === historyDate} className={day === historyDate ? 'selected' : ''} onClick={() => setHistoryDate(day)}>{day.slice(5)}</button>)}</div>}</section>}
          <DailySummary totals={totals} goal={goal} />
          <button className="button primary w-full my-5" disabled={unavailable || !validDate} onClick={() => { setNotice(''); setEditor({}); }}>記錄餐點</button>
          <div className="section-heading"><h2>{tab === 'today' ? '今天吃了什麼' : '當日餐點'}</h2><span className="muted text-sm">確認後的紀錄</span></div>
          {!loading && meals.length === 0 && <section className="empty-state"><span aria-hidden="true">◌</span><h3>這一天還沒有餐點</h3><p>拍張照片或手動輸入，開始記錄第一餐。</p></section>}
          <div className="space-y-3">{meals.map(meal => <MealCard key={meal.id} meal={meal} onEdit={() => { if (!unavailable) { setNotice(''); setEditor({ initial: meal }); } }} onDelete={() => { if (!unavailable) setDeleteId(meal.id); }} />)}</div>
          <InstallPrompt />
        </>}
        <section className="privacy-note"><p>資料保存在此瀏覽器，清除網站資料可能造成紀錄遺失。請定期備份；照片辨識目前為固定示範結果。</p><button className="text-button" disabled={unavailable} onClick={exportData}>匯出飲食紀錄備份</button><a className="text-button" href={`${import.meta.env.BASE_URL}third-party-notices.txt`} target="_blank" rel="noreferrer">開源授權與來源</a></section>
      </>}
    </main>
    <nav className="bottom-nav" aria-label="主要導覽">{([['today', '今日', '◷'], ['history', '歷史', '▤'], ['goals', '目標', '◎']] as const).map(([key, label, symbol]) => <button key={key} disabled={Boolean(editor)} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setNotice(''); }}><span aria-hidden="true">{symbol}</span>{label}</button>)}</nav>
    {deleteId && <DeleteDialog busy={deleting} onCancel={() => setDeleteId(undefined)} onConfirm={confirmDelete} />}
  </div>;
}
